const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toss')
    .setDescription('Toss a coin'),
  async execute(interaction) {
    // Coin toss result
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';

    // Reply with the result
    await interaction.reply(`🪙 The coin landed on: **${result}**`);
  },
};
