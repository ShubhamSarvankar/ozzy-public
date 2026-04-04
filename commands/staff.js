const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Elp's Command"),
  async execute(interaction) {
    const roleMention = "<@&727488490991910933>";
    await interaction.reply(`${roleMention} ATTENTION!`);
  },
  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply('You do not have permission to use this command.');
    }
    const roleMention = "<@&727488490991910933>";
    await interaction.reply(`${roleMention} ATTENTION!`);
  },
};
