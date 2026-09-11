/**
 * The only module allowed to write to the monthlyMessages collection —
 * permanent, never-reset per-user-per-month message counts. See
 * models/monthlyMessagesSchema.js for why this exists as a separate,
 * bucketed collection rather than a flat counter.
 */

const MonthlyMessages = require('../models/monthlyMessagesSchema');

function monthKeyFor(when) {
  return when.toISOString().slice(0, 7); // 'YYYY-MM', UTC
}

// Plain $inc, no clamping needed — message counts only go up.
async function incMonthlyMessages(userId, when = new Date(), attempted = false) {
  const monthKey = monthKeyFor(when);
  try {
    return await MonthlyMessages.findOneAndUpdate(
      { userId, monthKey },
      { $inc: { messages: 1 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Two concurrent first-writes for the same user+month can collide on the
    // unique index and throw E11000 — retry once, same pattern as
    // utils/weeklyStats.js.
    if (err.code === 11000 && !attempted) {
      return incMonthlyMessages(userId, when, true);
    }
    throw err;
  }
}

// Batched all-time live-message total per user, for rendering leaderboard
// pages without maintaining a denormalized flat field. Returns a Map keyed
// by userId; users with no rows simply aren't present in the map.
async function sumMonthlyMessages(userIds) {
  const results = await MonthlyMessages.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', total: { $sum: '$messages' } } },
  ]);
  return new Map(results.map((r) => [r._id, r.total]));
}

module.exports = { incMonthlyMessages, sumMonthlyMessages, monthKeyFor };
