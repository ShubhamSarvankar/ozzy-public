const { Events } = require('discord.js');
const manager = require('../halloween/discord/manager');

// Separate MessageCreate listener so the Halloween text scare stays out of
// messageCreate.js (XP and message counters there are unaffected). The manager
// exits immediately outside the season or outside general chat.
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      await manager.handleMessage(message);
    } catch (error) {
      console.error('[halloweenMessages] Failed:', error);
    }
  },
};
