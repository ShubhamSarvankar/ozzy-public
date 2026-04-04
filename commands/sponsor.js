const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sponsor")
    .setDescription("GOTW Command"),
  async execute(interaction) {
    await interaction.reply(`And now, a word from our sponsor RAID: Shadow Legends`);
  },
};
