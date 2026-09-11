const { Events } = require('discord.js');
const roleReactManager = require('../utils/roleReactManager');

// Unlike commands/reactForSapphires.js's createReactionCollector (an
// in-memory, time-bounded collector tied to the live process and message
// object, with a guard Map that's silently lost on restart), this listens to
// the raw gateway event and checks against roleReactManager's Mongo-backed
// index, so rolereact instances survive restarts.
module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      if (user.bot) return;

      // Cheap early exit before paying any fetch cost — the overwhelming
      // majority of reactions in the guild are on messages we don't track.
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

      const guild = reaction.message.guild;
      if (!guild) return;

      const matched = instances.find((inst) => roleReactManager.emojiMatches(inst, reaction.emoji));

      if (!matched) {
        if (instances.some((inst) => inst.removeUnregisteredReactions)) {
          await reaction.users.remove(user.id).catch(() => {});
        }
        return;
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      await roleReactManager.assignFor(reaction.client, matched, member);
    } catch (error) {
      // Nothing may escape this handler — index.js's unhandledRejection
      // handler calls process.exit(1) unconditionally, and a single bad
      // reaction event must never take the whole bot down.
      console.error('[messageReactionAdd] Failed to process role-react:', error);
    }
  },
};
