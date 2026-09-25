const { Events, MessageFlags } = require('discord.js');
const manager = require('../pictionary/discord/manager');

// Durable component router for Pictionary. All state lives in Mongo, addressed
// through the customId, so buttons keep working across restarts.
// customIds: pict:show:<turnId>, pict:ctl:<gameId>:<action>, pict:start:<gameId>,
// pict:resume:<gameId>, pict:vote:<turnId>:<y|n>
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('pict:')) return;
      const kind = interaction.customId.split(':')[1];
      if (kind === 'show') return await manager.handleShowWordAndReady(interaction);
      if (kind === 'ctl') return await manager.handleControl(interaction);
      if (kind === 'start') return await manager.handleStartNow(interaction);
      if (kind === 'resume') return await manager.handleResume(interaction);
      if (kind === 'vote') return await manager.handleVote(interaction);
    } catch (error) {
      console.error('[pictionaryInteractions] Failed:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Something went wrong with that button.', flags: MessageFlags.Ephemeral });
        }
      } catch { /* interaction expired */ }
    }
  },
};
