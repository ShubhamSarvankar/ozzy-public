/**
 * Aggregates crawlPage docs into per-user totals and writes them to
 * levelSchema.backfillMessages (scope.md §3.7). Separate from the crawl
 * loop itself and safe to re-run any time — the crawlPage collection is a
 * permanent, replayable audit trail, so if a filtering rule in
 * utils/messageFilters.js ever turns out wrong, fix it and re-run this
 * script; no need to re-crawl.
 *
 * Usage:
 *   node scripts/mergeCrawlData.js --dry-run   # preview only, no writes
 *   node scripts/mergeCrawlData.js              # write backfillMessages
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CrawlPage = require('../models/crawlPageSchema');
const CrawlState = require('../models/crawlStateSchema');
const levelModel = require('../models/levelSchema');
const config = require('../config');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  const uri = process.env.MONGODB_SRV;
  if (!uri) throw new Error('MONGODB_SRV is not set (check .env)');

  await mongoose.connect(uri);
  console.log(`Connected${DRY_RUN ? ' (dry run — no writes will happen)' : ''}.`);

  const state = await CrawlState.findOne({ _id: 'general' }).lean();
  if (!state) {
    console.log('No crawl state found — nothing has been crawled yet.');
    await mongoose.disconnect();
    return;
  }
  if (!state.done) {
    console.log(
      `Warning: crawl is not marked done yet (${state.pagesFetched.toLocaleString('en-US')} pages fetched so far). ` +
        `Merging now will only reflect progress up to that point — safe to do, and safe to re-run later once complete.`
    );
  }

  console.log('Running aggregation over crawlPage ($unwind authors, $group by id, $sum n)...');
  const results = await CrawlPage.aggregate(
    [{ $unwind: '$authors' }, { $group: { _id: '$authors.id', total: { $sum: '$authors.n' } } }],
    { allowDiskUse: true }
  );
  console.log(`Aggregation produced totals for ${results.length} distinct author(s).`);

  let written = 0;
  let totalMessages = 0;
  for (const r of results) {
    totalMessages += r.total;
    if (DRY_RUN) {
      written++;
      continue;
    }
    await levelModel.updateOne(
      { userId: r._id, guildId: config.crawl.guildId },
      { $set: { backfillMessages: r.total }, $setOnInsert: { xp: 0, level: 0 } },
      { upsert: true }
    );
    written++;
  }

  console.log(
    `${DRY_RUN ? 'Would write' : 'Wrote'} backfillMessages for ${written} user(s), ${totalMessages.toLocaleString('en-US')} total messages.`
  );

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Merge failed:', err);
  process.exit(1);
});
