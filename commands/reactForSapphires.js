const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const profileModel = require('../models/profileSchema');
const sapphireLogModel = require('../models/sapphireLogSchema');
const { DB, updateWeeklySapphires } = require('../database/weeklySapphires');
const { incSapphires } = require('../utils/weeklyStats');

const activeReactionEvents = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactforsapphires')
    .setDescription('Create a reaction event for users to earn sapphires')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('The number of sapphires to give for reacting')
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option
        .setName('time')
        .setDescription('The time (in seconds) for which reactions will be counted')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message for users to react to')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;

    if (activeReactionEvents.get(guildId)) {
      return interaction.editReply('There is already a reaction event going on.');
    }

    activeReactionEvents.set(guildId, true);

    try {
      const amount = interaction.options.getInteger('amount');
      const time = interaction.options.getInteger('time');
      const messageContent = interaction.options.getString('message');
      const sapphireEmote = '<:Sapphires:792479793756110868>';

      const embed = new EmbedBuilder()
        .setTitle('React for Sapphires!')
        .setDescription(`${messageContent}\n\nReact with ${sapphireEmote} to receive ${amount} sapphires!`)
        .setColor(0x45d6fd)
        .setTimestamp();

      const message = await interaction.channel.send({ embeds: [embed] });
      await message.react(sapphireEmote);

      await interaction.editReply('Reaction event started!');

      const filter = (reaction, user) =>
        !user.bot && reaction.emoji.name === 'Sapphires';

      const collector = message.createReactionCollector({
        filter,
        time: time * 1000,
      });

      const usersWhoReacted = new Set();

      collector.on('collect', async (reaction, user) => {
        if (usersWhoReacted.has(user.id)) return;
        usersWhoReacted.add(user.id);

        try {
          await DB.connect();

          let profile = await profileModel.findOne({ userId: user.id });
          if (!profile) {
            profile = await profileModel.create({
              userId: user.id,
              serverId: interaction.guild.id,
              sapphires: 0,
            });
          }

          profile.sapphires += amount;
          await profile.save();

          await updateWeeklySapphires(user.id, amount);
          await sapphireLogModel.create({
            userId: user.id,
            serverId: interaction.guild.id,
            amount,
            source: 'reaction_event',
            channelId: interaction.channel.id,
            messageId: message.id,
            reason: 'React for sapphires reward',
          });

          console.log(`Added ${amount} sapphires to ${user.username}`);
        } catch (error) {
          console.error(`Error adding sapphires to ${user.username}:`, error);
        }

        // Isolated from the award logic above — a stats failure here must
        // never be mistaken for (or block) the actual sapphire grant.
        try {
          await incSapphires(user.id, amount);
        } catch (error) {
          console.error(`[weeklyStats] sapphire dual write failed for ${user.username}:`, error);
        }
      });

      collector.on('end', async () => {
        activeReactionEvents.delete(guildId);

        try {
          const endedEmbed = EmbedBuilder.from(embed).setDescription(
            'This event has ended. Thank you for attending!'
          );

          await message.edit({ embeds: [endedEmbed] });
          console.log('Reaction event ended');

          if (usersWhoReacted.size > 0) {
            const summaryEmbed = new EmbedBuilder()
              .setTitle('Reaction Event Summary')
              .setColor(0x45d6fd)
              .setDescription(`The following users received ${amount} sapphires:`);

            const userMentions = Array.from(usersWhoReacted)
              .map(userId => `<@${userId}>`)
              .join('\n');

            summaryEmbed.addFields({ name: 'Users', value: userMentions });

            await interaction.followUp({ embeds: [summaryEmbed] });
          } else {
            await interaction.followUp('No users reacted to the event.');
          }
        } catch (error) {
          console.error('Error ending reaction event:', error);
        }
      });
    } catch (error) {
      activeReactionEvents.delete(guildId);
      console.error('Error starting reaction event:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('There was an error starting the reaction event.');
      } else {
        await interaction.reply({
          content: 'There was an error starting the reaction event.',
          ephemeral: true,
        });
      }
    }
  },
};