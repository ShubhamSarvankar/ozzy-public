const { Events } = require('discord.js');
const roleReactManager = require('../utils/roleReactManager');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    try {
      if (user.bot) return;

      const instances = roleReactManager.getForMessage(reaction.message.id);
      if (!instances.length) return;

      if (reaction.partial) {
        reaction = await reaction.fetch().catch(() => null);
        if (!reaction) return;
      }
      if (user.partial) {
        user = await user.fetch().catch(() => null);
        if (!user) return;
      }

      if (!reaction.message.guild) return;

      const matched = instances.find((inst) => roleReactManager.emojiMatches(inst, reaction.emoji));
      if (!matched) return;

      await roleReactManager.removeAssignment(reaction.client, matched, user.id);
    } catch (error) {
      console.error('[messageReactionRemove] Failed to process role-react removal:', error);
    }
  },
};
