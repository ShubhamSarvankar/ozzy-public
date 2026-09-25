const { Events } = require('discord.js');
const manager = require('../pictionary/discord/manager');

// Edited clue messages consume another clue slot and are re-checked against the hard rules.
module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    try {
      await manager.handleMessageEdit(oldMessage, newMessage);
    } catch (error) {
      console.error('[pictionaryMessageEdit] Failed:', error);
    }
  },
};
