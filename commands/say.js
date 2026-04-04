const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message in another channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where you want to send the message')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('text')
        .setDescription('The message content')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();

    // Retrieve options
    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');

    try {
      await channel.send(text);
      await interaction.followUp(`Message sent to ${channel.name}: ${text}`);
    } catch (error) {
      console.error('Error sending message:', error);
      await interaction.followUp('Failed to send message.');
    }
  },
};