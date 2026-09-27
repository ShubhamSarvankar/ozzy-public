const mongoose = require('mongoose');

// Ozzy's own messages from general chat, archived once by
// scripts/hungergames/archive.js so historical Hunger Games wins and kills can
// be rebuilt (and rebuilt again after label changes) without re-reading
// Discord. Only Ozzy's messages are kept; nobody else's are stored.
const hgArchiveMessageSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Discord message id
  channelId: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: Date, required: true },
  content: { type: String, default: '' },
  embeds: {
    type: [{
      _id: false,
      title: String,
      description: String,
      fields: { type: [{ _id: false, name: String, value: String }], default: [] },
    }],
    default: [],
  },
});

// Progress for the sequential walk over messages newer than the old crawl
// (singleton per channel), so a crashed or stopped run resumes.
const hgArchiveStateSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // channel id
  boundaryMessageId: { type: String, required: true }, // newest message when the run began
  cursor: { type: String, required: true }, // oldest message id read so far
  stopAt: { type: String, required: true }, // walk ends once past this id (the old crawl's boundary)
  pagesFetched: { type: Number, default: 0 },
  done: { type: Boolean, default: false },
});

// One doc per old-crawl page cursor already re-fetched. Written only after the
// page's messages are saved, so a crash at any point just re-fetches a page.
const hgArchivePageSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // the `before` cursor
});

module.exports = {
  HgArchiveMessage: mongoose.model('HgArchiveMessage', hgArchiveMessageSchema),
  HgArchiveState: mongoose.model('HgArchiveState', hgArchiveStateSchema),
  HgArchivePage: mongoose.model('HgArchivePage', hgArchivePageSchema),
};
