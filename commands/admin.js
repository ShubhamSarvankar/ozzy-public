const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const profileModel = require("../models/profileSchema");
const sapphireLogModel = require('../models/sapphireLogSchema');
const { DB, updateWeeklySapphires } = require('../database/weeklySapphires');
const { incSapphires } = require('../utils/weeklyStats');
const { createNationalDebtSession } = require('../payments/createNationalDebtSession');

const sph = '<:Sapphires:792479793756110868>';
const ayh = `<:ayanketopi:653369964472041476>`;

const { promoteMember } = require('../utils/promotionHelper');
const { parseUserList } = require('../utils/userListParser');
const { getMemberColor } = require('../utils/getMemberColor');

let promoChannelPromise;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Access all sapphire commands')
    .setDefaultPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add sapphires to a user's balance")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user you want to add sapphires to")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The number of sapphires you want to add.")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("subtract")
        .setDescription("Subtract sapphires from a user's balance")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user you want to subtract sapphires from")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The number of sapphires you want to subtract")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("weeklybalupdate")
        .setDescription("Add sapphires only to a user's weekly balance")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user you want to update the weekly balance for")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The number of sapphires you want to add to the weekly balance")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("weeklybalsubtract")
        .setDescription("Subtract sapphires from a user's weekly balance")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user you want to update the weekly balance for")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The number of sapphires you want to subtract from the weekly balance")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('role-add')
        .setDescription('Add sapphires to all members with a specific role')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to add sapphires to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('The number of sapphires to add to each member with the role')
            .setRequired(true)
            .setMinValue(1)
        )
    )    
    .addSubcommand((subcommand) =>
      subcommand
        .setName('massadd')
        .setDescription('Add sapphires to multiple users')
        .addStringOption(option =>
          option
            .setName('users')
            .setDescription('Comma-separated list of user IDs or mentions')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('The number of sapphires to add')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('logs')
        .setDescription('View recent sapphire logs')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('View logs for a specific user')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of logs to fetch')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('nationaldebt')
        .setDescription('See the national debt of the Motherland, owed to Scorp and Ayan')
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
	    return interaction.reply({ content: "You don't look like one of those starving staff members. <@640003973834866693> EAT THIS INTRUDER!", ephemeral: false });
    }
    if (!promoChannelPromise) {
      promoChannelPromise = interaction.client.channels
        .fetch('653291552076202036')
        .catch(err => {
          console.error('Failed to fetch promotion channel:', err);
          return null;
        });
    }

    await interaction.deferReply();

    const adminSubcommand = interaction.options.getSubcommand();

    // Handle existing 'add' and 'subtract' subcommands
    if (adminSubcommand === "add" || adminSubcommand === "subtract") {
      const user = interaction.options.getUser("user");
      const userId = user.id;
      const amount = interaction.options.getInteger("amount");
      const member = await interaction.guild.members.fetch(userId);
      const color  = getMemberColor(member);

      try {
        await DB.connect();  // Ensure the database is connected

        let profile = await profileModel.findOne({ userId: user.id });

        if (!profile) {
          profile = new profileModel({
            userId: user.id,
            serverId: interaction.guild.id,
            sapphires: 0,
          });
        }

        if (adminSubcommand === "add") {
          profile.sapphires += amount;
          await profile.save();
          await updateWeeklySapphires(user.id, amount); // Update weekly sapphires
          await incSapphires(user.id, amount); // dual write — new period-based weekly stats
          await sapphireLogModel.create({
            userId: user.id,
            serverId: interaction.guild.id,
            amount,
            source: 'admin_command',
            adminId: interaction.user.id,
            channelId: interaction.channel.id,
            reason: 'Manual sapphire grant',
          });

          const embed = new EmbedBuilder()
            .setTitle('Sapphires Added')
            .setColor(color)
            .setDescription(`Added ${sph} ${amount} to <@${profile.userId}>'s balance (total: ${profile.sapphires})`);

          await interaction.editReply({ embeds: [embed] });

          // Check for promotion eligibility
          const promo = await promoteMember(member, profile.sapphires);

          if (promo) {
            const reportChannel = await promoChannelPromise;
            await reportChannel.send(
              `Congratulations <@${profile.userId}>! You have been promoted to **${promo.roleName}**! 🎉`
            );
          }
        }

        if (adminSubcommand === "subtract") {
          profile.sapphires -= amount;
          if (profile.sapphires < 0) profile.sapphires = 0; // Ensure balance does not go negative
          await profile.save();
          await updateWeeklySapphires(user.id, -amount); // Update weekly sapphires
          await incSapphires(user.id, -amount); // dual write — clamped at zero internally

          const embed = new EmbedBuilder()
            .setTitle('Sapphires Subtracted')
            .setColor(color)
            .setDescription(`Subtracted ${sph} ${amount} from <@${profile.userId}>'s balance`);

          await interaction.editReply({ embeds: [embed] });
        }

      } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while executing this command.');
      }
    }

    if (adminSubcommand === "weeklybalupdate") {
      const user = interaction.options.getUser("user");
      const userId = user.id;
      const amount = interaction.options.getInteger("amount");
    
      try {
        await DB.connect();  // Ensure the database is connected
    
        let profile = await profileModel.findOne({ userId: user.id });
    
        if (!profile) {
          profile = new profileModel({
            userId: user.id,
            serverId: interaction.guild.id,
            sapphires: 0,
          });
        }
    
        await updateWeeklySapphires(user.id, amount); // Update weekly sapphires
        await incSapphires(user.id, amount); // dual write — new period-based weekly stats

        const embed = new EmbedBuilder()
          .setTitle('Weekly Sapphires Updated')
          .setColor('#00FF00')
          .setDescription(`Added ${sph} ${amount} to <@${user.id}>'s weekly balance`);
    
        await interaction.editReply({ embeds: [embed] });
    
      } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while executing this command.');
      }
    }
      
    if (adminSubcommand === "weeklybalsubtract") {
      const user = interaction.options.getUser("user");
      const userId = user.id;
      const amount = interaction.options.getInteger("amount");
    
      try {
        await DB.connect();  // Ensure the database is connected
    
        let profile = await profileModel.findOne({ userId: user.id });
    
        if (!profile) {
          profile = new profileModel({
            userId: user.id,
            serverId: interaction.guild.id,
            sapphires: 0,
          });
        }
    
        await updateWeeklySapphires(user.id, -amount); // Subtract from weekly sapphires
        await incSapphires(user.id, -amount); // dual write — clamped at zero internally

        const embed = new EmbedBuilder()
          .setTitle('Weekly Sapphires Updated')
          .setColor('#FF0000')
          .setDescription(`Subtracted ${sph} ${amount} from <@${user.id}>'s weekly balance`);
    
        await interaction.editReply({ embeds: [embed] });
    
      } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while executing this command.');
      }
    }
    // Handle the 'role-add' subcommand
    if (adminSubcommand === 'role-add') {
      const targetRole = interaction.options.getRole('role');
      const amount     = interaction.options.getInteger('amount');
      let counter      = 0;
      const failed     = [];

      await DB.connect();
      const allProfiles = await profileModel.find({});

      // ensure we have the promo channel ready
      if (!promoChannelPromise) {
        promoChannelPromise = interaction.client.channels
          .fetch('653291552076202036')
          .catch(() => null);
      }

      for (const profile of allProfiles) {
        // 1️⃣ Try to fetch the GuildMember; if missing, skip
        const member = await interaction.guild.members
          .fetch(profile.userId)
          .catch(() => null);
        if (!member) continue;

        // 2️⃣ Guard against any undefined roles object
        if (!member.roles || !member.roles.cache) continue;

        // 3️⃣ Skip users who don’t actually have the target role
        if (!member.roles.cache.has(targetRole.id)) continue;

        // 4️⃣ Safe to update sapphires & save
        try {
          profile.sapphires += amount;
          await profile.save();
          await sapphireLogModel.create({
            userId: profile.userId,
            serverId: interaction.guild.id,
            amount,
            source: 'admin_command',
            adminId: interaction.user.id,
            channelId: interaction.channel.id,
            reason: `Role add for role ${targetRole.id}`,
          });
          counter++;

          // 5️⃣ Promotion check
          const promo = await promoteMember(member, profile.sapphires);
          if (promo) {
            const reportCh = await promoChannelPromise;
            if (reportCh?.isTextBased()) {
              await reportCh.send(
                `<@${member.id}>, you have been promoted to **${promo.roleName}**! 🎉`
              );
            }
          }
        } catch (err) {
          console.error(`Error on user ${profile.userId}:`, err);
          failed.push(profile.userId);
        }
      }

      // 6️⃣ Reply back with a summary
      let reply = `Added ${amount} sapphires to ${counter} users with that role.`;
      if (failed.length) reply += ` Failed for: ${failed.join(', ')}`;
      await interaction.editReply(reply);
    }

    // Handle the 'massadd' subcommand
    if (adminSubcommand === 'massadd') {
      const usersString = interaction.options.getString('users');
      const amount      = interaction.options.getInteger('amount');
      let userIds;

      try {
        userIds = parseUserList(usersString);
      } catch (err) {
        return interaction.editReply({
          content: `❌ Error parsing user list: ${err.message}`,
          ephemeral: true
        });
      }

      const embeds = [];

      if (!promoChannelPromise) {
        promoChannelPromise = interaction.client.channels
          .fetch('653291552076202036')
          .catch(() => null);
      }

      for (const userId of userIds) {
        try {
          let profile = await profileModel.findOne({ userId });
          if (!profile) {
            profile = new profileModel({
              userId,
              serverId: interaction.guild.id,
              sapphires: 0
            });
          }

          profile.sapphires += amount;
          await profile.save();
          await updateWeeklySapphires(userId, amount);
          await incSapphires(userId, amount); // dual write — new period-based weekly stats
          await sapphireLogModel.create({
            userId,
            serverId: interaction.guild.id,
            amount,
            source: 'admin_command',
            adminId: interaction.user.id,
            channelId: interaction.channel.id,
            reason: 'Mass sapphire grant',
          });

          const member = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

          let color = '#3498DB';
          if (member) {
            const promo = await promoteMember(member, profile.sapphires);
            if (promo) {
              const reportChannel = await promoChannelPromise;
              if (reportChannel?.isTextBased()) {
                await reportChannel.send(
                  `Congratulations <@${userId}>! You have been promoted to **${promo.roleName}**! 🎉`
                );
              }
            }
            const memberColor = getMemberColor(member);
            if (memberColor) color = memberColor;
          }

          embeds.push(
            new EmbedBuilder()
              .setTitle('Sapphires Added')
              .setColor(color)
              .setDescription(`Added ${sph} ${amount} to <@${userId}>'s balance (total: ${profile.sapphires})`)
          );
        } catch (err) {
          console.error(`massadd failed for ${userId}:`, err);
          embeds.push(
            new EmbedBuilder()
              .setTitle('Error')
              .setColor('#FF0000')
              .setDescription(`❌ Failed to add sapphires to <@${userId}>`)
          );
        }
      }

      // Send embeds in chunks of 10
      const chunkSize = 10;
      for (let i = 0; i < embeds.length; i += chunkSize) {
        const chunk = embeds.slice(i, i + chunkSize);
        if (i === 0) {
          await interaction.editReply({ embeds: chunk });
        } else {
          await interaction.followUp({ embeds: chunk });
        }
      }
    }

    if (adminSubcommand === 'logs') {
      try {
        await DB.connect();

        const targetUser = interaction.options.getUser('user');
        const limit = interaction.options.getInteger('limit') ?? 10;

        const query = {
          serverId: interaction.guild.id,
        };

        if (targetUser) {
          query.userId = targetUser.id;
        }

        const logs = await sapphireLogModel
          .find(query)
          .sort({ createdAt: -1 })
          .limit(limit);

        if (!logs.length) {
          return await interaction.editReply('No sapphire logs found.');
        }

        const description = logs.map((log) => {
          const timestamp = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:f>`;
          const adminText = log.adminId ? ` | admin: <@${log.adminId}>` : '';
          const messageText = log.messageId ? ` | msg: \`${log.messageId}\`` : '';
          const reasonText = log.reason ? ` | ${log.reason}` : '';
          return `${timestamp}\n<@${log.userId}> | +${log.amount} | ${log.source}${adminText}${messageText}${reasonText}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
          .setTitle(targetUser ? `Sapphire Logs for ${targetUser.tag}` : 'Recent Sapphire Logs')
          .setColor('#0099FF')
          .setDescription(description);

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('An error occurred while fetching sapphire logs:', error);
        await interaction.editReply('An error occurred while executing this command.');
      }
    }

    // handle the national debt command
    if (adminSubcommand === 'nationaldebt') {
      try {
        await DB.connect();

        const profiles = await profileModel.find({});
        const totalSapphires = profiles.reduce(
          (sum, profile) => sum + (profile.sapphires || 0),
          0
        );

        const ahfs = totalSapphires * 170.05;
        const usdfs = totalSapphires / 84000;

        const session = await createNationalDebtSession({
          discordUserId: interaction.user.id,
          discordTag: interaction.user.tag,
          guildId: interaction.guild?.id ?? null,
          guildName: interaction.guild?.name ?? null,
          totalSapphires,
          usdAmount: usdfs,
        });

        const embed = new EmbedBuilder()
          .setTitle(`HF's National Debt`)
          .setColor('#0099FF')
          .setDescription(
            `${sph} **${totalSapphires}** Sapphires \n\n` +
            `At the rate of ${ayh} 170.05/${sph} 1, HF owes Scorp and Ayan ${ayh} ${ahfs.toFixed(2)}.\n` +
            `At the rate of $1/${sph} 84,000, HF owes Scorp and Ayan $${usdfs.toFixed(2)}.\n\n`
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Pay the Debt')
            .setStyle(ButtonStyle.Link)
            .setURL(session.url)
        );

        await interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      } catch (error) {
        console.error('An error occurred while fetching the total circulation:', error);
        await interaction.editReply('An error occurred while executing this command.');
      }
    }
  }
};