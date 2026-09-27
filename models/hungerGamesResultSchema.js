const mongoose = require('mongoose');

// One finished Hunger Games. Live games write one row when they end; the
// historical backfill (scripts/hungergames/) writes source: 'backfill' rows.
// `key` is the lobby message id for live games and the winner message id for
// backfilled ones, so neither path can double count a game.
const hungerGamesResultSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  mode: { type: String, enum: ['solo', 'squad', 'classic', 'unknown'], required: true },
  winnerIds: { type: [String], default: [] },
  kills: { type: [{ _id: false, userId: String, count: Number }], default: [] },
  endedAt: { type: Date, required: true },
  source: { type: String, enum: ['live', 'backfill'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('HungerGamesResult', hungerGamesResultSchema);
