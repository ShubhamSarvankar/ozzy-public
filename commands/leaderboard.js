// commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const profileModel = require('../models/profileSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows Top 10 Sapphire Hoarders'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Fetch top 10 members based on sapphires
      const members = await profileModel.find().sort({ sapphires: -1 }).limit(10);

      // Ensure members contain valid userIds
      const validMembers = members.filter(member => member.userId);

      const calendarEmote = "<:calendar_spiral:a92891f6b531c3e720e1>";
      const sapphireEmote = "<:Sapphires:1253576129017811055>";

      // Create a new EmbedBuilder
      const embed = new EmbedBuilder()
        .setTitle('🗓️ **Sapphires Leaderboard** 🗓️\n\n\n')
        .setColor(0x45d6fd);

      // Prepare arrays for helpers and sapphires earned
      const helpers = [];
      const sapphiresEarned = [];

      // Iterate through valid members and populate arrays
      for (let i = 0; i < validMembers.length; i++) {
        try {
          const user = await interaction.client.users.fetch(validMembers[i].userId);

          if (user) {
            const username = `${user.username}`;
            const sapphires = `${sapphireEmote} ${validMembers[i].sapphires}`;

            // Push formatted strings to respective arrays
            helpers.push(username);
            sapphiresEarned.push(sapphires);
          }
        } catch (fetchError) {
          console.error(`Error fetching user ${validMembers[i].userId}:`, fetchError);
        }
      }

      // Determine the maximum length of usernames for consistent spacing
      const maxUsernameLength = helpers.reduce((max, username) => Math.max(max, username.length), 0);

      // Format the helpers field with consistent spacing
      const helpersField = helpers.map((username, index) => `**${index + 1}.** ${username.padEnd(maxUsernameLength)}`).join('\n');

      // Format the sapphires earned field
      const sapphiresField = sapphiresEarned.join('\n');

      // Add fields to the embed
      embed.addFields(
        { name: 'Helpers', value: helpersField, inline: true },
        { name: 'Sapphires Earned', value: sapphiresField, inline: true }
      );

      // Send the embed as a reply
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing leaderboard', error);
      await interaction.editReply("An error occurred while fetching the leaderboard.");
    }
  },
};
