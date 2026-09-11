const { Events } = require('discord.js');
const levelModel = require('../models/levelSchema');
const profileModel = require('../models/profileSchema'); // Import profile schema
const { incMessages } = require('../utils/weeklyStats');
const { incMonthlyMessages } = require('../utils/monthlyMessages');
const { trackedChannels } = require('../config');
const { totalXpRequired } = require('../utils/levels');
const { isCountableLiveMessage } = require('../utils/messageFilters');

const excludedChannels = ['1003344528251568148']; // Replace with actual channel IDs

const cooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (message.webhookId) return;

    const msg = message.content.trim().toLowerCase();

    // Weekly + permanent monthly message counters — must run before every
    // other early return below (army commands, excludedChannels, the XP
    // cooldown). The XP cooldown especially would otherwise cap counted
    // messages at 1/minute, exactly the useless number MEE6 produces. A
    // stats failure here must never break the message handling that follows.
    // Filtering (bots, webhooks, system messages, prefix commands) lives in
    // utils/messageFilters.js, shared with the historical crawl so the two
    // can never silently diverge (scope.md §3.6).
    //
    // incMonthlyMessages writes to a permanent, never-reset collection
    // (unlike weeklyStats, which /lbweekly reset wipes) — it's the only
    // source of post-crawl-boundary data for commands/activeweek.js, and has
    // to be bucketed by month from the start so it stays queryable that way
    // indefinitely into the future.
    try {
      const isThread = message.channel.isThread();
      const isTracked = !isThread && trackedChannels.includes(message.channel.id);
      if (isTracked && isCountableLiveMessage(message)) {
        await Promise.all([incMessages(message.author.id), incMonthlyMessages(message.author.id)]);
      }
    } catch (err) {
      console.error('[weeklyStats] message counter failed:', err);
    }

    // Army HF/HFS GIF commands
    if (msg === '!army hfs') {
      return message.channel.send(
        'https://cdn.discordapp.com/attachments/769576548457644092/1380917424400109698/ArmyHFS.gif?ex=68459f12&is=68444d92&hm=eba07e54e986aef352ad81862b2b5b6d6b33c3eb93aed650d8edc5ac3741e11a&'
      );
    }
    if (msg === '!army hf') {
      return message.channel.send(
        'https://cdn.discordapp.com/attachments/769576548457644092/1380917424102051900/ArmyHF.gif?ex=68459f12&is=68444d92&hm=c976e88e59d3d10cc687297a18209bf6c4b27510129b8629919a2ef4dd5c95f0&'
      );
    }

    // Check if the message was sent in an excluded channel
    if (excludedChannels.includes(message.channel.id)) {
      return;
    }

    const now = Date.now();
    const cooldownAmount = 60 * 1000; // 1 minute in milliseconds
    const userCooldown = cooldowns.get(message.author.id);

    if (userCooldown && now < userCooldown) {
      return;
    }

    cooldowns.set(message.author.id, now + cooldownAmount);

    try {
      let levelData = await levelModel.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!levelData) {
        levelData = await levelModel.create({
          userId: message.author.id,
          guildId: message.guild.id,
          xp: 0,
          level: 0
        });
      }

      const xpGained = Math.floor(Math.random() * (26 - 18 + 1)) + 18;
      levelData.xp += xpGained;

      // Calculate total XP required for the next level
      let totalXPForNextLevel = totalXpRequired[levelData.level + 1];

      // Calculate the XP needed to reach the next level from current XP
      let xpToNextLevel = totalXPForNextLevel - levelData.xp;

      if (levelData.xp >= totalXPForNextLevel) {
        levelData.level += 1;
        console.log(`Level up! ${message.author.tag}'s new level is ${levelData.level}.`);
        message.channel.send(`Congratulations ${message.author}, your HF syndrome has reached level ${levelData.level}! Elp is the greatest <:elpisthegreatest:828247385552846848>`);
      }

      await levelData.save();
    } catch (err) {
      console.log(err);
    }
  },
};
