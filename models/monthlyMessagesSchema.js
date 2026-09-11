const mongoose = require('mongoose');

// Permanent, never-reset per-user-per-month message counts — distinct from
// weeklyStats (which resets on /lbweekly reset) and from the crawl's
// backfillMessages snapshot (frozen at the crawl boundary). This is the only
// piece of state that can answer "which month was this user most active in"
// for messages sent after the crawl boundary, indefinitely into the future —
// a flat running total can't be sliced by month after the fact, so this has
// to be bucketed from the start. See commands/activeweek.js.
const monthlyMessagesSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  monthKey: { type: String, required: true }, // 'YYYY-MM', UTC
  messages: { type: Number, default: 0 },
});

monthlyMessagesSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyMessages', monthlyMessagesSchema);
