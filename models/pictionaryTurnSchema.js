const mongoose = require('mongoose');

// One document per Turn, kept forever (including not started, failed and vetoed
// turns). Scores, word stats and user stats are all aggregated from these.
const pictionaryTurnSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, required: true },
  round: { type: Number, required: true },
  turnIndex: { type: Number, required: true },

  actorId: { type: String, required: true },
  wordId: { type: String, required: true },
  tier: { type: Number, default: 1 },
  // Snapshot of the word's banned/accepted/category/related at selection time,
  // so a later edit to words.json never rewrites what an old turn/analytics
  // entry shows. Not used for matching (matching always uses the live word).
  wordVersion: {
    answer: String, category: String, tier: Number,
    accepted: { type: [String], default: [] },
    banned: { type: [String], default: [] },
    related: { type: [String], default: [] },
  },

  // pending = word not yet revealed, waiting on the Show-word/Ready click.
  // Never persists past a resolved turn.
  status: {
    type: String,
    required: true,
    enum: ['pending', 'active', 'guessed', 'timeout', 'violation', 'terminated', 'not_started'],
    default: 'pending',
  },
  notStartedReason: { type: String, default: null }, // no_ready | removed | recovery

  selectedAt: { type: Date, default: Date.now },
  revealedAt: { type: Date, default: null }, // Show-word/Ready button clicked
  startedAt: { type: Date, default: null }, // set once the reading buffer elapses and the turn goes live
  endedAt: { type: Date, default: null },

  clueCount: { type: Number, default: 0 },
  clueMessageIds: { type: [String], default: [] },
  // Clue content, kept even if the Discord message is later deleted or edited,
  // so a deleted clue is still reviewable for a veto.
  clueSnapshots: {
    type: [{
      messageId: String, content: String, postedAt: Date, editedAt: Date, deletedAt: { type: Date, default: null }, _id: false,
    }],
    default: [],
  },

  guesserId: { type: String, default: null },
  guessMessageId: { type: String, default: null },
  solveMs: { type: Number, default: null },

  pointsActor: { type: Number, default: 0 },
  pointsGuesser: { type: Number, default: 0 },

  // Annulled turns score nothing but stay in history. Vetoing only sets these.
  annulled: { type: Boolean, default: false },
  annulReason: { type: String, enum: [null, 'violation', 'veto', 'host'], default: null },

  violation: {
    type: { type: String, default: null },
    detail: { type: String, default: null },
    messageId: { type: String, default: null },
  },

  veto: {
    startedAt: { type: Date, default: null },
    deadlineAt: { type: Date, default: null },
    eligible: { type: [String], default: [] },
    yes: { type: [String], default: [] },
    no: { type: [String], default: [] },
    result: { type: String, enum: [null, 'vetoed', 'upheld'], default: null },
    resolvedAt: { type: Date, default: null },
    dms: { type: [{ userId: String, channelId: String, messageId: String, _id: false }], default: [] },
  },
}, { timestamps: true });

pictionaryTurnSchema.index({ gameId: 1, round: 1, turnIndex: 1 });
pictionaryTurnSchema.index({ actorId: 1 });
pictionaryTurnSchema.index({ guesserId: 1 });
pictionaryTurnSchema.index({ wordId: 1, startedAt: -1 });
pictionaryTurnSchema.index({ startedAt: -1 });
pictionaryTurnSchema.index({ 'veto.result': 1, 'veto.startedAt': 1 });

module.exports = mongoose.model('PictionaryTurn', pictionaryTurnSchema);
