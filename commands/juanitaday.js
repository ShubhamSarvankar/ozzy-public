const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("juanitaday")
    .setDescription("GOTW Command"),
  async execute(interaction) {
    await interaction.reply(`HAPYP JUSNITA DYA!!`);
  },
};
