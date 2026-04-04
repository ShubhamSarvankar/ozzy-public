const { SlashCommandBuilder } = require('discord.js');
const reminderModel = require('../models/reminderSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder message.')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The reminder message (use \\n for new lines)')
        .setRequired(true)
        .setMaxLength(2048))
    .addIntegerOption(option => 
      option.setName('interval')
        .setDescription('Interval time in minutes')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('channelid')
        .setDescription('The channel ID to send the reminder')
        .setRequired(true)),
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const interval = interaction.options.getInteger('interval');
    const channelId = interaction.options.getString('channelid');

    if (!channelId.match(/^\d+$/)) {
      await interaction.reply('Invalid channel ID. Please provide a valid channel ID.');
      return;
    }

    // Use dynamic import for nanoid
    const { nanoid } = await import('nanoid');
    const reminderId = nanoid();

    try {
      const newReminder = await reminderModel.create({
        message,
        interval,
        channelId,
        reminderId
      });

      await interaction.reply(`Reminder set with ID: ${reminderId}. It will repeat every ${interval} minutes.`);

      setInterval(async () => {
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
          // Replace '\n' with actual new lines
          const formattedMessage = message.replace(/\\n/g, '\n');
          channel.send(formattedMessage);
        }
      }, interval * 60 * 1000);
    } catch (error) {
      console.error(error);
      await interaction.reply('There was an error setting the reminder.');
    }
  }
};
