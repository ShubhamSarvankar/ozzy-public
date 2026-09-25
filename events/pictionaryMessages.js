const { Events } = require('discord.js');
const manager = require('../pictionary/discord/manager');

// Separate MessageCreate listener so game handling stays out of messageCreate.js
// (XP and message counters there are unaffected). The manager exits immediately
// unless a turn is live in this channel.
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      await manager.handleMessage(message);
    } catch (error) {
      console.error('[pictionaryMessages] Failed:', error);
    }
  },
};
