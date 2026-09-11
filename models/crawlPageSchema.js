const mongoose = require('mongoose');

// One document per fetched page (Design B, scope.md §3.3). _id is the
// `before` cursor used for the request, so replaying a page upserts an
// identical document — a crash at any instant is harmless, no atomicity
// reasoning needed, and the whole thing is a replayable audit trail (if a
// filtering rule turns out wrong, recompute via scripts/mergeCrawlData.js
// without re-crawling).
const crawlPageSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // the `before` cursor for this request
  authors: [
    {
      _id: false,
      id: { type: String, required: true },
      n: { type: Number, required: true },
    },
  ],
  fetchedAt: { type: Date, default: Date.now },
});

// Lets commands/activeweek.js find "every page a given user appears on" via
// an index scan instead of a COLLSCAN over the full (178k+ doc) collection.
crawlPageSchema.index({ 'authors.id': 1 });

module.exports = mongoose.model('CrawlPage', crawlPageSchema);
