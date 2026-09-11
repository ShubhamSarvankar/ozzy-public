const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  // Historical message count from the crawl (scope.md §3.7), written by
  // scripts/mergeCrawlData.js. Kept permanently separate from any future
  // live all-time counter so a bad crawl is deletable/re-runnable without
  // touching live data.
  backfillMessages: { type: Number, default: 0 },
});

const model = mongoose.model('Level', levelSchema);

module.exports = model;
