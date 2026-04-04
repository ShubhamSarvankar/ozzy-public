const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hof")
    .setDescription("Replies with HF's Hall of Fame!"),
  async execute(interaction) {
    await interaction.reply("Here's the link to access Help Force's Hall of Fame! https://cphelpforce.com/hall-of-fame/");
  },
};