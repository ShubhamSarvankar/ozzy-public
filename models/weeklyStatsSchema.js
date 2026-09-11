const mongoose = require('mongoose');

// Single-guild bot — intentionally no guildId field (see scope.md repo context).
const weeklyStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  periodId: { type: Number, required: true },
  messages: { type: Number, default: 0 },
  sapphires: { type: Number, default: 0 },
  stamps: { type: Number, default: 0 },
});

weeklyStatsSchema.index({ periodId: 1, userId: 1 }, { unique: true });
weeklyStatsSchema.index({ periodId: 1, messages: -1 });
weeklyStatsSchema.index({ periodId: 1, sapphires: -1 });

module.exports = mongoose.model('WeeklyStats', weeklyStatsSchema);
