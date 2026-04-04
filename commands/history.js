const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("Replies with HF History!"),
  async execute(interaction) {
    await interaction.reply("Here's the link to access Help Force's history! https://cphelpforce.com/archive/");
  },
};