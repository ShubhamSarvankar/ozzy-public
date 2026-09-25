const { Events } = require('discord.js');
const manager = require('../pictionary/discord/manager');

// Actor registration by reaction. Coexists with the role-react listener of the same event.
module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      await manager.handleReactionAdd(reaction, user);
    } catch (error) {
      console.error('[pictionaryReactionAdd] Failed:', error);
    }
  },
};
