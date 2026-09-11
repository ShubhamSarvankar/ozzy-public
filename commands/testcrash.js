const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testcrash')
    .setDescription('Deliberately crashes the bot to test auto-restart')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ content: 'Crashing bot now. It should restart in ~5 seconds.', ephemeral: true });
    process.nextTick(() => { throw new Error('Manual test crash triggered by ' + interaction.user.tag); });
  },
};
