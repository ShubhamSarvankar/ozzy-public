const mongoose = require('mongoose');

// One document per Pictionary Game. Turn history lives in PictionaryTurn, and
// every score and stat is derived from those turns, never stored here.
const pictionaryGameSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  hostId: { type: String, required: true },

  // Human-friendly reference, e.g. "PIC-12", via Counter.nextSeq('pictionary').
  shortId: { type: String, default: null },

  totalRounds: { type: Number, required: true, min: 1, max: 5 },
  turnSeconds: { type: Number, required: true, min: 60, max: 120 },

  // Per-game Host toggle for near-miss DM hints. Defaults on.
  nearMissHints: { type: Boolean, default: true },

  // Flipped to false when the game ends. The partial unique index below uses it
  // to allow only one open game per guild.
  open: { type: Boolean, default: true },
  status: {
    type: String,
    required: true,
    // 'starting': the Actor clicked "Show my word & Ready" and is in the fixed
    // reading buffer (turnStartBufferSeconds) before the real turn timer and
    // clue/guess counting go live.
    enum: ['registering', 'ready_check', 'starting', 'active', 'between', 'paused', 'finished', 'cancelled'],
    default: 'registering',
  },

  currentRound: { type: Number, default: 1 },
  currentTurnIndex: { type: Number, default: 0 },

  registrants: { type: [String], default: [] },       // reacted for the round being registered
  roundOrder: { type: [String], default: [] },        // actors still to act, in order, this round
  roundRegistrants: { type: [String], default: [] },  // everyone registered this round (veto voters)
  participants: { type: [String], default: [] },      // every actor who ever reacted, plus correct guessers
  afkRemoved: { type: [{ round: Number, userId: String, _id: false }], default: [] },
  usedWordIds: { type: [String], default: [] },
  // Reset false at the start of each Round; flipped true once a `source: 'community'`
  // word has been picked for a turn this Round, guaranteeing at least one per Round.
  roundCommunityWordUsed: { type: Boolean, default: false },

  registrationMessageId: { type: String, default: null },
  readyMessageId: { type: String, default: null },
  clueEmbedMessageId: { type: String, default: null }, // live-updating "clues so far" embed for the current turn
  panelMessageId: { type: String, default: null },
  currentTurnId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lastTurnId: { type: mongoose.Schema.Types.ObjectId, default: null },
  vetoPendingTurnId: { type: mongoose.Schema.Types.ObjectId, default: null },

  // The one live deadline for the current status (registration close, ready
  // check, turn timer, or auto advance). Timers are rebuilt from this on boot.
  deadlineAt: { type: Date, default: null },
  pausedFrom: {
    status: { type: String, default: null },
    remainingMs: { type: Number, default: null },
  },

  // Written before a mute is applied so recovery can always undo it.
  mutedUserId: { type: String, default: null },

  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
}, { timestamps: true });

pictionaryGameSchema.index({ guildId: 1 }, { unique: true, partialFilterExpression: { open: true } });
pictionaryGameSchema.index({ open: 1, status: 1 });
pictionaryGameSchema.index({ registrationMessageId: 1 });

module.exports = mongoose.model('PictionaryGame', pictionaryGameSchema);
