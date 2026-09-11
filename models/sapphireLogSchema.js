const mongoose = require('mongoose');

const sapphireLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  serverId: { type: String, required: true, index: true },

  amount: { type: Number, required: true },

  source: {
    type: String,
    enum: ['admin_command', 'reaction_event'],
    required: true,
    index: true,
  },

  adminId: { type: String, default: null },
  channelId: { type: String, default: null },
  messageId: { type: String, default: null },

  reason: { type: String, default: null },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7,
  },
});

module.exports = mongoose.model('sapphireLog', sapphireLogSchema);