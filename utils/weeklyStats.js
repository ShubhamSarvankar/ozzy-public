/**
 * The only module allowed to write to the statsPeriod / weeklyStats
 * collections. Everything here runs over the shared mongoose connection
 * opened once in index.js — no dedicated MongoClient, no connect/destroy
 * cycle like database/weeklySapphires.js.
 */

const StatsPeriod = require('../models/statsPeriodSchema');
const WeeklyStats = require('../models/weeklyStatsSchema');

// messageCreate fires on every single message — this must never query Mongo
// per call, hence the lazy module-level cache.
let cachedPeriodId = null;

// Bumped on every write to a period, so a caller-side render cache (e.g. the
// public /lbweekly board, per scope.md §Phase 2) can invalidate itself by
// including this in its cache key instead of tracking writes itself.
const periodVersions = new Map(); // periodId -> version
function bumpPeriodVersion(periodId) {
  periodVersions.set(periodId, (periodVersions.get(periodId) || 0) + 1);
}
function getPeriodVersion(periodId) {
  return periodVersions.get(periodId) || 0;
}

async function getActivePeriodId() {
  if (cachedPeriodId !== null) return cachedPeriodId;

  let active = await StatsPeriod.findOne({ endedAt: null }).lean();

  if (!active) {
    // Should only happen if the migration (scope.md §1.5) hasn't run yet.
    // Bootstrap period 1 rather than throwing, so the hook never crashes
    // message handling — but this really should be a one-time occurrence.
    try {
      active = await StatsPeriod.create({ periodId: 1, startedAt: new Date(), endedAt: null });
    } catch (err) {
      // Lost a race with another concurrent bootstrap attempt — re-read.
      active = await StatsPeriod.findOne({ endedAt: null }).lean();
      if (!active) throw err;
    }
  }

  cachedPeriodId = active.periodId;
  return cachedPeriodId;
}

async function startNewPeriod(closedByUserId) {
  const active = await StatsPeriod.findOne({ endedAt: null });
  if (!active) {
    throw new Error('startNewPeriod: no active period found to close');
  }

  active.endedAt = new Date();
  active.closedBy = closedByUserId;
  await active.save();

  const next = await StatsPeriod.create({
    periodId: active.periodId + 1,
    startedAt: new Date(),
    endedAt: null,
  });

  cachedPeriodId = next.periodId;
  return { closedPeriod: active, newPeriod: next };
}

// Plain $inc, no clamping needed — message counts only go up.
async function incMessages(userId) {
  const periodId = await getActivePeriodId();
  const result = await upsertIncWithRetry({ userId, periodId }, { $inc: { messages: 1 } });
  bumpPeriodVersion(periodId);
  return result;
}

// Sapphires and stamps can go negative (admin corrections, stamp removal) and
// are clamped at zero per the confirmed decision. $inc alone can't clamp
// atomically, so this uses an aggregation-pipeline update ($max) instead —
// note pipeline-style updates do NOT auto-populate the filter fields into a
// new document on upsert, so userId/periodId must be $set explicitly.
async function incSapphires(userId, amount) {
  const periodId = await getActivePeriodId();
  const result = await clampedIncWithRetry({ userId, periodId }, 'sapphires', amount);
  bumpPeriodVersion(periodId);
  return result;
}

async function incStamps(userId, delta) {
  const periodId = await getActivePeriodId();
  const result = await clampedIncWithRetry({ userId, periodId }, 'stamps', delta);
  bumpPeriodVersion(periodId);
  return result;
}

async function upsertIncWithRetry(filter, update, attempted = false) {
  try {
    return await WeeklyStats.findOneAndUpdate(filter, update, { upsert: true, new: true });
  } catch (err) {
    // Two concurrent first-writes for the same user can collide on the
    // { periodId, userId } unique index and throw E11000 — retry once.
    if (err.code === 11000 && !attempted) {
      return upsertIncWithRetry(filter, update, true);
    }
    throw err;
  }
}

async function clampedIncWithRetry(filter, field, amount, attempted = false) {
  const pipeline = [
    {
      $set: {
        userId: filter.userId,
        periodId: filter.periodId,
        messages: { $ifNull: ['$messages', 0] },
        sapphires: { $ifNull: ['$sapphires', 0] },
        stamps: { $ifNull: ['$stamps', 0] },
        [field]: {
          $max: [{ $add: [{ $ifNull: [`$${field}`, 0] }, amount] }, 0],
        },
      },
    },
  ];
  try {
    return await WeeklyStats.findOneAndUpdate(filter, pipeline, { upsert: true, new: true });
  } catch (err) {
    if (err.code === 11000 && !attempted) {
      return clampedIncWithRetry(filter, field, amount, true);
    }
    throw err;
  }
}

module.exports = {
  getActivePeriodId,
  startNewPeriod,
  incMessages,
  incSapphires,
  incStamps,
  getPeriodVersion,
};
