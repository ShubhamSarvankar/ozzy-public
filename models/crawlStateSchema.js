const mongoose = require('mongoose');

// Singleton doc (_id: 'general') tracking crawl progress/resumability, per
// scope.md §3.3. Extended with three operational-control fields beyond
// scope's literal list — paused/requestsPerSecond/progressMessageId — so the
// kill switch, live-adjustable pacing, and progress-message editing all have
// somewhere to live without a fourth collection:
//   - paused: the kill switch, polled every page (scope.md §3.5).
//   - requestsPerSecond: pacing as config, adjustable without a redeploy
//     (scope.md §3.5) — changed via /crawl pace, not a code constant.
//   - progressMessageId: so the ~10-minute progress post edits the same
//     message instead of spamming a new one each time.
const crawlStateSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // 'general'
  boundaryMessageId: { type: String, required: true },
  cursor: { type: String, required: true }, // oldest id processed so far
  pagesFetched: { type: Number, default: 0 },
  done: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  leaseExpiresAt: { type: Date, default: null },
  paused: { type: Boolean, default: false },
  requestsPerSecond: { type: Number, default: 2 },
  progressMessageId: { type: String, default: null },
});

module.exports = mongoose.model('CrawlState', crawlStateSchema);
