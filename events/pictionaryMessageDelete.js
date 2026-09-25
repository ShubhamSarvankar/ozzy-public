const { Events } = require('discord.js');
const manager = require('../pictionary/discord/manager');

// A deleted clue still counts toward the 3-clue cap (already consumed when it
// was posted); its content is preserved in the Turn record for veto review.
module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      await manager.handleMessageDelete(message);
    } catch (error) {
      console.error('[pictionaryMessageDelete] Failed:', error);
    }
  },
};
