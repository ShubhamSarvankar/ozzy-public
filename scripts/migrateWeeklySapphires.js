/**
 * One-time migration (scope.md §1.5): copy every doc in the legacy
 * `weekly_sapphires` collection into the new `weeklyStats` collection for
 * the active period, so the in-progress week's sapphire totals survive the
 * cutover to the new period model.
 *
 * MUST run before the first real `/lbweekly reset` — otherwise the
 * in-progress week's sapphire totals vanish at cutover (scope.md's second
 * hard ordering constraint).
 *
 * Two separate connections are used deliberately, matching how the app
 * itself is actually wired (confirmed via a live diagnostic, not assumed):
 *   - mongoose's default connection (MONGODB_SRV has no db path in it)
 *     resolves to the "test" database — the same database every other
 *     mongoose model in this app already uses (levels, sapphirebalances,
 *     stamps, ...), and where statsPeriod/weeklyStats live too. Writes go
 *     here, via the WeeklyStats model and utils/weeklyStats.js.
 *   - the legacy weekly_sapphires collection lives in the explicitly-named
 *     "SapphireBot" database (Auth.DB_NAME in config.js), reached only via
 *     the raw MongoClient the same way database/weeklySapphires.js does.
 *     Read-only here — this script never writes to that database.
 *
 * Usage:
 *   node scripts/migrateWeeklySapphires.js --dry-run   # preview only, no writes
 *   node scripts/migrateWeeklySapphires.js              # actually migrate
 *
 * Idempotent: safe to re-run. $set only ever touches the `sapphires` field,
 * so it never clobbers `messages`/`stamps` already accrued live for the
 * period, and re-running with the same legacy data just re-sets the same
 * sapphire totals rather than double-adding them.
 */

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');

const { Auth } = require(path.join(__dirname, '..', 'config.js'));
const WeeklyStats = require(path.join(__dirname, '..', 'models', 'weeklyStatsSchema'));
const { getActivePeriodId } = require(path.join(__dirname, '..', 'utils', 'weeklyStats'));

const LEGACY_COLLECTION = 'weekly_sapphires';
const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  const uri = process.env.MONGODB_SRV;
  if (!uri) {
    throw new Error('MONGODB_SRV is not set (check .env)');
  }

  await mongoose.connect(uri);
  console.log(
    `Connected via mongoose${DRY_RUN ? ' (dry run — no writes will happen)' : ''} ` +
      `— writes target the "${mongoose.connection.db.databaseName}" database.`
  );

  const rawClient = new MongoClient(Auth.CLUSTER_AUTH_URL, { serverApi: ServerApiVersion.v1 });
  await rawClient.connect();
  const legacyDb = rawClient.db(Auth.DB_NAME);
  console.log(`Reading legacy data from the "${Auth.DB_NAME}" database.`);

  const legacyDocs = await legacyDb.collection(LEGACY_COLLECTION).find({}).toArray();
  console.log(`Found ${legacyDocs.length} doc(s) in legacy '${LEGACY_COLLECTION}'.`);

  const periodId = await getActivePeriodId(); // bootstraps period 1 if none exists yet
  console.log(`Migrating into active period #${periodId}.`);

  let migrated = 0;
  let totalSapphires = 0;
  let skipped = 0;

  for (const doc of legacyDocs) {
    const userId = doc._id;
    const rawSapphires = Number(doc.weeklySapphires) || 0;

    if (!userId || typeof userId !== 'string') {
      console.warn(`  skipping doc with non-string _id:`, doc._id);
      skipped++;
      continue;
    }

    // The legacy collection has no floor on weeklySapphires (admin.js's
    // weeklybalsubtract path is unclamped) — clamp at zero here too, same
    // policy as the new system, rather than carry a historical negative
    // (one known case: a single doc at -10,000,000,000) into production.
    const sapphires = Math.max(0, rawSapphires);
    if (rawSapphires < 0) {
      console.warn(`  clamping negative legacy value for ${userId}: ${rawSapphires} -> 0`);
    }

    totalSapphires += sapphires;
    migrated++;

    if (DRY_RUN) {
      continue;
    }

    await WeeklyStats.findOneAndUpdate(
      { userId, periodId },
      { $set: { sapphires }, $setOnInsert: { messages: 0, stamps: 0 } },
      { upsert: true }
    );
  }

  console.log(
    `${DRY_RUN ? 'Would migrate' : 'Migrated'} ${migrated} user(s), ${skipped} skipped, ` +
      `total sapphires: ${totalSapphires}, into period #${periodId}.`
  );

  await mongoose.disconnect();
  await rawClient.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
