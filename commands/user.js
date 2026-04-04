/**const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getProfile, setProfile } = require('../userProfile');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('User-related commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get user information')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('aboutme')
        .setDescription('Set your "About Me" information')
        .addStringOption(option =>
          option.setName('info')
            .setDescription('Your "About Me" information')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('quote')
        .setDescription('Set your quote')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Your quote')
            .setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const profile = getProfile(userId) || {};

    if (subcommand === 'info') {
      const user = interaction.user;
      const member = await interaction.guild.members.fetch(user.id);

      // Use the user's set quote
      const userQuote = profile.quote || 'N/A';
      const aboutMe = profile.about || 'N/A';

      // Load the user's avatar
      const avatarURL = user.displayAvatarURL({ format: 'png', size: 512 });

      // Download the avatar image
      const response = await axios({
        url: avatarURL,
        responseType: 'arraybuffer',
      });
      const avatarBuffer = await sharp(response.data)
        .resize(512, 512, {
          fit: sharp.fit.cover,
          position: sharp.strategy.entropy,
        })
        .toFormat('png') // Convert to PNG
        .toBuffer();

      // Create a circular mask and apply it to the avatar
      const circleSvg = Buffer.from(
        `<svg width="512" height="512"><circle cx="256" cy="256" r="256"/></svg>`
      );
      const avatar = await sharp(avatarBuffer)
        .composite([{ input: circleSvg, blend: 'dest-in' }])
        .toBuffer();

      // Increase the border width
      const borderThickness = 25;
      const borderedAvatar = await sharp({
        create: {
          width: 512 + borderThickness * 2,
          height: 512 + borderThickness * 2,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        },
      })
        .composite([
          {
            input: avatar,
            top: borderThickness,
            left: borderThickness,
          },
          {
            input: Buffer.from(
              `<svg width="${512 + borderThickness * 2}" height="${512 + borderThickness * 2}">
                <circle cx="${256 + borderThickness}" cy="${256 + borderThickness}" r="${256 + borderThickness}" fill="none" stroke="white" stroke-width="${borderThickness}"/>
              </svg>`
            ),
            blend: 'over',
          },
        ])
        .png()
        .toBuffer();

      // Save the circular avatar with border to a file
      const avatarPath = path.join(__dirname, '..', 'data', 'avatars', `${user.id}.png`);
      await sharp(borderedAvatar).toFile(avatarPath);

      // Create an attachment for the circular avatar
      const attachment = new AttachmentBuilder(avatarPath);

      // Get the highest role of the user
      const highestRole = member.roles.highest;

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#3e96e5')
        .setTitle(`${member.displayName}'s Profile`)
        .setThumbnail(`attachment://${user.id}.png`)
        .addFields(
          { name: 'Joined Server', value: member.joinedAt.toDateString() || 'N/A', inline: false },
          { name: 'About Me', value: aboutMe || 'N/A', inline: false },
          { name: 'Rank', value: `<@&${highestRole.id}>` || 'N/A', inline: false },
          { name: 'Quote', value: userQuote || 'N/A', inline: false }
        )
        .setDescription(`<@${user.id}>`)
        .setTimestamp()
        .setFooter({ text: 'User Info', iconURL: interaction.client.user.displayAvatarURL() });

      // Send embed with attachment
      await interaction.reply({ embeds: [embed], files: [attachment] });
    } else if (subcommand === 'aboutme') {
      const about = interaction.options.getString('info');
      profile.about = about;
      setProfile(userId, profile);

      await interaction.reply('Your "About Me" information has been updated.');
    } else if (subcommand === 'quote') {
      const quote = interaction.options.getString('text');
      profile.quote = quote;
      setProfile(userId, profile);

      await interaction.reply('Your quote has been updated.');
    }
  },
};**/

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getProfile, setProfile } = require('../userProfile');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const levelModel = require('../models/levelSchema');
const Canvas = require('@napi-rs/canvas');
const { GlobalFonts } = require('@napi-rs/canvas');

// Register the font
GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/arial.ttf'), 'arial');

// Copy the totalXpRequired array directly from messageCreate.js
const totalXpRequired = [
  0, 100, 255, 475, 770, 1150, 1625, 2205, 2900, 3720, 4675, 5775, 7030, 8450, 10045, 11825, 13800, 15980, 18375, 20995,
  23850, 26950, 30305, 33925, 37820, 42000, 46475, 51255, 56350, 61770, 67525, 73625, 80080, 86890, 94075, 101635, 109580,
  117920, 126665, 135825, 145410, 155430, 165895, 176815, 188200, 200060, 212405, 225245, 238590, 252450, 266835, 281755,
  297220, 313240, 329825, 346985, 364730, 383070, 402015, 421575, 441760, 462580, 484045, 506165, 528950, 552410, 576555,
  601395, 626940, 653200, 680185, 707905, 736370, 765590, 795575, 826335, 857880, 890220, 923365, 957325, 992110, 1027720,
  1064075, 1101265, 1139290, 1178150, 1217845, 1258375, 1299740, 1341940, 1384975, 1428845, 1473550, 1519090, 1565465,
  1612675, 1660720, 1709600, 1759315, 1809865, 1861250, 1913470, 1966525, 2020415, 2075140, 2130700, 2187095, 2244325,
  2302390, 2361290, 2421025, 2481595, 2543000, 2605240, 2668315, 2732225, 2796970, 2862550, 2928965, 2996215, 3064300,
  3133220, 3202975, 3273565, 3344990, 3417250, 3490345, 3564275, 3639040, 3714640, 3791075, 3868345, 3946450, 4025390,
  4105165, 4185775, 4267220, 4349500, 4432615, 4516565, 4601350, 4686970, 4773425, 4860715, 4948840, 5037800, 5127595,
  5218225, 5309690, 5401990, 5495125, 5589095, 5683900, 5779540, 5876015, 5973325, 6071470, 6170450, 6260265, 6360915,
  6462400, 6564720, 6667875, 6771865, 6876690, 6982350, 7088845, 7196175, 7304340, 7413340, 7523175, 7633845, 7745350,
  7857690, 7970865, 8084875, 8199720, 8315400, 8431915, 8549265, 8667450, 8786470, 8906325, 9027015, 9148540, 9270900
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('user profile related commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get user information')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('aboutme')
        .setDescription('Set your "About Me" information')
        .addStringOption(option =>
          option.setName('info')
            .setDescription('Your "About Me" information')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('quote')
        .setDescription('Set your quote')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Your quote')
            .setRequired(true))
    ),
  async execute(interaction) {
    await interaction.deferReply(); // Acknowledge the interaction

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const profile = getProfile(userId) || {};

    if (subcommand === 'info') {
      const user = interaction.user;
      const member = await interaction.guild.members.fetch(user.id);

      // Use the user's set quote
      const userQuote = profile.quote || 'N/A';
      const aboutMe = profile.about || 'N/A';

      // Load the user's avatar
      const avatarURL = user.displayAvatarURL({ format: 'png', size: 512 });

      // Download the avatar image
      const response = await axios({
        url: avatarURL,
        responseType: 'arraybuffer',
      });
      const avatarBuffer = await sharp(response.data)
        .resize(140, 140, { // Slightly increase the avatar size
          fit: sharp.fit.cover,
          position: sharp.strategy.entropy,
        })
        .toFormat('png') // Convert to PNG
        .toBuffer();

      // Create a circular mask and apply it to the avatar
      const circleSvg = Buffer.from(
        `<svg width="140" height="140"><circle cx="70" cy="70" r="70" fill="white"/></svg>`
      );
      const avatar = await sharp(avatarBuffer)
        .composite([{ input: circleSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

      // Save the circular avatar to a file
      const avatarPath = path.join(__dirname, '..', 'data', 'avatars', `${user.id}.png`);
      await sharp(avatar).toFile(avatarPath);

      // Create a border image
      const borderThickness = 10;
      const borderSvg = Buffer.from(
        `<svg width="${140 + borderThickness * 2}" height="${140 + borderThickness * 2}">
          <circle cx="${70 + borderThickness}" cy="${70 + borderThickness}" r="${70 + borderThickness}" fill="none" stroke="#2B2D31" stroke-width="${borderThickness}"/>
        </svg>`
      );
      const border = await sharp({
        create: {
          width: 140 + borderThickness * 2,
          height: 140 + borderThickness * 2,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          { input: avatar, top: borderThickness, left: borderThickness },
          { input: borderSvg, blend: 'over' },
        ])
        .png()
        .toBuffer();

      // Save the avatar with border to a file
      const finalAvatarPath = path.join(__dirname, '..', 'data', 'avatars', `${user.id}_border.png`);
      await sharp(border).toFile(finalAvatarPath);

      // Create an attachment for the avatar with border
      const attachment = new AttachmentBuilder(finalAvatarPath);

      // Get the highest role of the user
      const highestRole = member.roles.highest;

      // Fetch level data
      const levelData = await levelModel.findOne({ userId: user.id, guildId: interaction.guild.id });
      let progressBarImage;
      let xpText = '';

      if (levelData) {
        const currentLevel = levelData.level;
        const xpForCurrentLevel = totalXpRequired[currentLevel];
        const xpForNextLevel = totalXpRequired[currentLevel + 1];
        const xpToNextLevel = xpForNextLevel - levelData.xp;
        const progress = (levelData.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
        xpText = `Level: ${currentLevel} | ${levelData.xp}/${xpForNextLevel} XP`;

        // Generate progress bar
        progressBarImage = await generateProgressBar(progress, xpText);
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#3e96e5')
        .setTitle(`${member.displayName}'s Profile`)
        .setThumbnail(`attachment://${user.id}_border.png`)
        .addFields(
          { name: 'Joined Server', value: member.joinedAt.toDateString() || 'N/A', inline: false },
          { name: 'About Me', value: aboutMe || 'N/A', inline: false },
          { name: 'Rank', value: `<@&${highestRole.id}>` || 'N/A', inline: false },
          { name: 'Quote', value: userQuote || 'N/A', inline: false }
        )
        .setDescription(`<@${user.id}>`)
        .setTimestamp()
        .setFooter({ text: 'User Info', iconURL: interaction.client.user.displayAvatarURL() });

      if (progressBarImage) {
        const progressBarAttachment = new AttachmentBuilder(progressBarImage, { name: 'progress-bar.png' });
        embed.setImage('attachment://progress-bar.png');
        await interaction.editReply({ embeds: [embed], files: [attachment, progressBarAttachment] });
      } else {
        await interaction.editReply({ embeds: [embed], files: [attachment] });
      }
    } else if (subcommand === 'aboutme') {
      const about = interaction.options.getString('info');
      profile.about = about;
      setProfile(userId, profile);

      await interaction.editReply('Your "About Me" information has been updated.');
    } else if (subcommand === 'quote') {
      const quote = interaction.options.getString('text');
      profile.quote = quote;
      setProfile(userId, profile);

      await interaction.editReply('Your quote has been updated.');
    }
  },
};

async function generateProgressBar(progress, xpText) {
  const canvas = Canvas.createCanvas(400, 40); // Decrease height to make it thinner
  const context = canvas.getContext('2d');
  const cornerRadius = 10; // Define the corner radius

  // Split xpText to get level and XP separately
  const [levelText, xpDisplay] = xpText.split(' | ');

  // Ensure progress is a valid number and within the range 0-1
  progress = Math.min(Math.max(progress, 0), 1);

  // Draw background with rounded corners
  context.fillStyle = '#575757';
  context.beginPath();
  context.moveTo(cornerRadius, 20);
  context.arcTo(canvas.width, 20, canvas.width, 40, cornerRadius);
  context.arcTo(canvas.width, 40, 0, 40, cornerRadius);
  context.arcTo(0, 40, 0, 20, cornerRadius);
  context.arcTo(0, 20, canvas.width, 20, cornerRadius);
  context.closePath();
  context.fill();

  // Draw progress bar with rounded corners
  context.fillStyle = '#3e96e5';
  context.beginPath();
  context.moveTo(cornerRadius, 20);
  context.arcTo(canvas.width * progress, 20, canvas.width * progress, 40, cornerRadius);
  context.arcTo(canvas.width * progress, 40, 0, 40, cornerRadius);
  context.arcTo(0, 40, 0, 20, cornerRadius);
  context.arcTo(0, 20, canvas.width * progress, 20, cornerRadius);
  context.closePath();
  context.fill();

  // Draw border with rounded corners
  context.strokeStyle = '#2B2D31';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(cornerRadius, 20);
  context.arcTo(canvas.width, 20, canvas.width, 40, cornerRadius);
  context.arcTo(canvas.width, 40, 0, 40, cornerRadius);
  context.arcTo(0, 40, 0, 20, cornerRadius);
  context.arcTo(0, 20, canvas.width, 20, cornerRadius);
  context.closePath();
  context.stroke();

  // Draw Level text left-aligned above the progress bar
  context.fillStyle = '#B1B4B7';
  context.font = '14px arial'; // Use a default sans-serif font
  context.textAlign = 'left';
  context.fillText(levelText, 10, 15); // Position above progress bar

  // Draw XP text right-aligned above the progress bar
  context.textAlign = 'right';
  context.fillText(xpDisplay, canvas.width - 10, 15); // Position above progress bar

  return canvas.encode('png'); // Ensure to encode as PNG
}

