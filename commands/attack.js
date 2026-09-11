// commands/attack.js

require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { v2: cloudinary } = require('cloudinary');
const path = require('path');
const { parseUserList } = require('../utils/userListParser');
const { getMemberColor } = require('../utils/getMemberColor');

// configure Cloudinary from single URL var
cloudinary.config({
  url: process.env.CLOUDINARY_URL,
});

// load your manifest of public_ids
const manifest = require(path.resolve(__dirname, '../data/attack-gifs-manifest.json'));

/**
 * pick a random Cloudinary URL for this user (fall back to general)
 */
function pickGifUrlFor(userId) {
  const tagKey = Array.isArray(manifest[userId]) && manifest[userId].length
    ? userId
    : 'general';
  const list = manifest[tagKey];
  const publicId = list[Math.floor(Math.random() * list.length)];
  const url = cloudinary.url(publicId, {
    secure: true,
    resource_type: 'image',
    fetch_format: 'auto',
    quality: 'auto',
    format: "gif"
  });
  return url;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attack')
    .setDescription('Peace was never an option.')
    .addStringOption(opt =>
      opt
        .setName('targets')
        .setDescription('Optional: mention one or more users (comma- or space-separated)')
        .setRequired(false)
    ),

  /**
   * Executes the /attack command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const me = interaction.user;
    const member = interaction.member; // GuildMember, for color lookup
    const input = interaction.options.getString('targets')?.trim() || '';
    let targetIds = [];

    // parse mentions if provided
    if (input) {
      try {
        targetIds = parseUserList(input);
      } catch (err) {
        return interaction.reply({
          content: `⚠️ ${err.message}`,
          ephemeral: true,
        });
      }
    }

    const gifUrl = pickGifUrlFor(me.id);
    // get embed color based on member's highest-role color (falls back to royal blue)
    const embedColor = getMemberColor(member);

    const embed = new EmbedBuilder()
      .setTitle('⚔️ Attack!')
      .setImage(gifUrl)
      .setColor(embedColor)
      .setTimestamp();

    try {
      if (targetIds.length) {
        // fetch usernames for embed description
        const users = await Promise.all(
          targetIds.map(id => interaction.client.users.fetch(id).catch(() => null))
        );
        const validUsers = users.filter(u => u);
        const mentions = validUsers.map(u => `<@${u.id}>`).join(' ');
        const names = validUsers.map(u => `**${u.username}**`).join(', ');

        embed.setDescription(`**${me.username}** attacks ${names}!`);
        await interaction.reply({
          content: mentions,
          embeds: [embed],
        });
      } else {
        // general chat attack
        embed.setDescription(`**${me.username}** attacks the entire general chat!`);
        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[attack] reply failed | gifUrl=${gifUrl} | error=${err.message}`, err);
    }
  },
};
