const { Events } = require('discord.js');
const manager = require('../pictionary/discord/manager');

// Removing the registration reaction withdraws the player from acting this round.
module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    try {
      await manager.handleReactionRemove(reaction, user);
    } catch (error) {
      console.error('[pictionaryReactionRemove] Failed:', error);
    }
  },
};
