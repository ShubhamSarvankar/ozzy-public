const { SlashCommandBuilder } = require('discord.js');
const reminderModel = require('../models/reminderSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-reminder')
    .setDescription('Remove a reminder message.')
    .addStringOption(option => 
      option.setName('reminderid')
        .setDescription('The ID of the reminder to remove')
        .setRequired(true)),
  async execute(interaction) {
    const reminderId = interaction.options.getString('reminderid');

    try {
      const result = await reminderModel.deleteOne({ reminderId });
      if (result.deletedCount > 0) {
        await interaction.reply(`Reminder with ID: ${reminderId} has been removed.`);
      } else {
        await interaction.reply(`No reminder found with ID: ${reminderId}.`);
      }
    } catch (error) {
      console.error(error);
      await interaction.reply('There was an error removing the reminder.');
    }
  }
};
