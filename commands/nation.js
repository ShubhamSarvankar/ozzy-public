const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nation")
    .setDescription("GOTW Command"),
  async execute(interaction) {
    const websiteLink = "https://cphelpforce.com/nation/";
    
    await interaction.reply(websiteLink);
  },
};
