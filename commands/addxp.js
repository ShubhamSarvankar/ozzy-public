const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('Manually add XP to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to give XP to')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('XP amount to add')
        .setRequired(true)),

  async execute(interaction) {
    const OWNER_ID = '699314950270877758';

    // Restrict usage
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: 'You are not authorized to use this command.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
      return interaction.reply({
        content: 'XP amount must be positive.',
        ephemeral: true
      });
    }

    const levelModel = require('../models/levelSchema');

    try {
      let levelData = await levelModel.findOne({
        userId: user.id,
        guildId: interaction.guild.id
      });

      if (!levelData) {
        levelData = await levelModel.create({
          userId: user.id,
          guildId: interaction.guild.id,
          xp: 0,
          level: 0
        });
      }

      // Add XP
      levelData.xp += amount;

      await levelData.save();

      await interaction.reply({
        content: `Added **${amount} XP** to ${user}. New XP: ${levelData.xp}`
      });

    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: 'Error updating XP.',
        ephemeral: true
      });
    }
  }
};