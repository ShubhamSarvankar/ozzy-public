const { Events, MessageFlags } = require('discord.js');
const runner = require('../hungergames/discord/runner');

// Component router for Hunger Games buttons and menus (customIds start with
// "hg:"). See hungergames/discord/runner.js for the customId shapes.
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (!(interaction.isButton() || interaction.isStringSelectMenu()) || !interaction.customId.startsWith('hg:')) return;
      await runner.handleComponent(interaction);
    } catch (error) {
      console.error('[hg] component failed', { customId: interaction.customId }, error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Something went wrong with that button.', flags: MessageFlags.Ephemeral });
        }
      } catch { /* interaction expired */ }
    }
  },
};
