/**const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelModel = require('../models/levelSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Shows Top 10 Users by Level'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Fetch top 10 members based on level and XP
      const members = await levelModel.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).limit(10);

      // Ensure members contain valid userIds
      const validMembers = members.filter(member => member.userId);

      // Create a new EmbedBuilder
      const embed = new EmbedBuilder()
        .setTitle('🏆 **Level Leaderboard** 🏆\n\n\n')
        .setColor(0xFFD700);

      // Prepare arrays for usernames and levels
      const userMentions = [];
      const levels = [];

      // Iterate through valid members and populate arrays
      for (let i = 0; i < validMembers.length; i++) {
        try {
          const user = await interaction.client.users.fetch(validMembers[i].userId);

          if (user) {
            const userMention = `<@${user.id}>`;
            const level = `${validMembers[i].level}`;

            // Push formatted strings to respective arrays
            userMentions.push(userMention);
            levels.push(level);
          }
        } catch (fetchError) {
          console.error(`Error fetching user ${validMembers[i].userId}:`, fetchError);
        }
      }

      // Determine the maximum length of user mentions for consistent spacing
      const maxUserMentionLength = userMentions.reduce((max, mention) => Math.max(max, mention.length), 0);

      // Format the user mentions field with consistent spacing
      const userMentionsField = userMentions.map((mention, index) => `**${index + 1}.** ${mention.padEnd(maxUserMentionLength)}`).join('\n');

      // Format the levels field
      const levelsField = levels.join('\n');

      // Add fields to the embed
      embed.addFields(
        { name: 'Users', value: userMentionsField, inline: true },
        { name: 'Levels', value: levelsField, inline: true }
      );

      // Send the embed as a reply
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing leaderboard', error);
      await interaction.editReply("An error occurred while fetching the leaderboard.");
    }
  },
};**/
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelModel = require('../models/levelSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Shows the level leaderboard'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Fetch top 10 members based on level and XP
      const members = await levelModel.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).limit(10);

      // Ensure members contain valid userIds
      const validMembers = members.filter(member => member.userId);

      // Create a new EmbedBuilder
      const embed = new EmbedBuilder()
        .setTitle('🏆 **Level Leaderboard** 🏆\n\n\n')
        .setColor(0xFFD700);

      // Prepare arrays for usernames and levels
      const userMentions = [];
      const levels = [];

      // Iterate through valid members and populate arrays
      for (let i = 0; i < validMembers.length; i++) {
        try {
          const user = await interaction.client.users.fetch(validMembers[i].userId);

          if (user) {
            const userMention = `<@${user.id}>`;
            const level = `${validMembers[i].level}`;

            // Push formatted strings to respective arrays
            userMentions.push(userMention);
            levels.push(level);
          }
        } catch (fetchError) {
          console.error(`Error fetching user ${validMembers[i].userId}:`, fetchError);
        }
      }

      // Determine the maximum length of user mentions for consistent spacing
      const maxUserMentionLength = userMentions.reduce((max, mention) => Math.max(max, mention.length), 0);

      // Format the user mentions field with consistent spacing
      const userMentionsField = userMentions.map((mention, index) => `**${index + 1}.** ${mention.padEnd(maxUserMentionLength)}`).join('\n');

      // Format the levels field
      const levelsField = levels.join('\n');

      // Add fields to the embed
      embed.addFields(
        { name: 'Users', value: userMentionsField, inline: true },
        { name: 'Levels', value: levelsField, inline: true }
      );

      // Send the embed as a reply
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing leaderboard', error);
      await interaction.editReply("An error occurred while fetching the leaderboard.");
    }
  },
};
