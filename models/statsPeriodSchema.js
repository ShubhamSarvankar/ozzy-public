const mongoose = require('mongoose');

// Single-guild bot — intentionally no guildId field (see scope.md repo context).
const statsPeriodSchema = new mongoose.Schema({
  periodId: { type: Number, required: true, unique: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }, // null = this is the active period
  closedBy: { type: String, default: null }, // userId of whoever reset it
  boardChannelId: { type: String, default: null },
  boardMessageId: { type: String, default: null },
});

// Enforce at most one active (endedAt: null) period at a time. Mongo partial
// unique indexes only apply the uniqueness constraint to docs matching the
// filter, so closed periods (endedAt set) never collide with each other.
statsPeriodSchema.index(
  { endedAt: 1 },
  { unique: true, partialFilterExpression: { endedAt: null } }
);

module.exports = mongoose.model('StatsPeriod', statsPeriodSchema);
