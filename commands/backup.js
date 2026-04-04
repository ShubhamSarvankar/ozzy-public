const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const profileModel = require('../models/profileSchema');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Generates a backup file of the main leaderboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const profiles = await profileModel.find();
      const backupData = profiles.map(profile => ({
        userId: profile.userId,
        serverId: profile.serverId,
        sapphires: profile.sapphires
      }));

      const filePath = path.join(__dirname, 'leaderboard_backup.json');
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

      await interaction.editReply({ content: 'Backup file generated.', files: [filePath] });

      // Clean up the file after sending
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply('An error occurred while generating the backup file.');
      } else {
        await interaction.editReply('An error occurred while generating the backup file.');
      }
    }
  },
};
