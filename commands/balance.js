const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const profileModel = require('../models/profileSchema');
const { getMemberColor } = require('../utils/getMemberColor');
const { promoteMember } = require('../utils/promotionHelper');

const sph = '<:Sapphires:792479793756110868>';
const PROMO_CHANNEL_ID = '653291552076202036';
let promoChannelPromise;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Shows a user's sapphires.")
    .addUserOption(option => option.setName('user').setDescription('The user to show the balance of')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const profile = await profileModel.findOne({ userId: user.id });

    if (!profile) {
      return interaction.reply(`${user} does not have any sapphires.`);
    }

    // Initialize promotion channel if needed
    if (!promoChannelPromise) {
      promoChannelPromise = interaction.client.channels.fetch(PROMO_CHANNEL_ID).catch(() => null);
    }

    // Determine embed color based on member's highest colored role
    const color = getMemberColor(member);

    const embed = new EmbedBuilder()
      .setTitle(`${member.displayName}'s Sapphires`)
      .setColor(color)
      .setDescription(`${sph} <@${user.id}> has **${profile.sapphires}** sapphires.`);

    await interaction.reply({ embeds: [embed] });

    // Check for promotion eligibility
    const promo = await promoteMember(member, profile.sapphires);
    if (promo) {
      const reportChannel = await promoChannelPromise;
      if (reportChannel?.isTextBased()) {
        await reportChannel.send(
          `Congratulations <@${user.id}>! You have been promoted to **${promo.roleName}**! 🎉`
        );
      }
    }
  }
};
