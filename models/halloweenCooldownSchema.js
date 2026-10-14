const mongoose = require('mongoose');

// One doc per Halloween scare feature ('tts' and 'voice'). nextAllowedAt is
// the persisted 30 minute cooldown: null means the feature has never fired.
// halloween/discord/manager.js seeds both docs on boot and claims a fire with
// an atomic conditional findOneAndUpdate, so the doc never needs an upsert at
// claim time. lastFiredAt and fireCount are diagnostics only.
const halloweenCooldownSchema = new mongoose.Schema({
  feature: { type: String, required: true, unique: true, enum: ['tts', 'voice'] },
  nextAllowedAt: { type: Date, default: null },
  lastFiredAt: { type: Date, default: null },
  fireCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('HalloweenCooldown', halloweenCooldownSchema);
