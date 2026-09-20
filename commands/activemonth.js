const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CrawlPage = require('../models/crawlPageSchema');
const MonthlyMessages = require('../models/monthlyMessagesSchema');
const { snowflakeToDate } = require('../utils/snowflake');

function formatMonthKey(monthKey) {
  const date = new Date(`${monthKey}-01T00:00:00Z`);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activemonth')
    .setDescription("Shows a user's most active month in #general")
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to check (defaults to you)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;
    const monthTotals = new Map(); // monthKey -> messages

    // Historical side: every crawl page this user appears on (scope.md Phase
    // 3). Each page's _id is the cursor used to fetch it — the upper bound
    // on that page's ~100 messages — decoded to a month. Off by at most a
    // few hours in the slowest periods, negligible at month granularity.
    // Uses the { 'authors.id': 1 } index (models/crawlPageSchema.js) rather
    // than scanning the full collection.
    const pages = await CrawlPage.find({ 'authors.id': user.id }, { 'authors.$': 1 }).lean();
    for (const page of pages) {
      const date = snowflakeToDate(page._id);
      if (!date) continue;
      const monthKey = date.toISOString().slice(0, 7);
      const n = page.authors[0]?.n || 0;
      monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + n);
    }

    // Live side: permanent monthly buckets recorded since the crawl boundary
    // (utils/monthlyMessages.js) — already bucketed, no decoding needed, and
    // keeps working correctly for any month from here forward, indefinitely.
    const liveMonths = await MonthlyMessages.find({ userId: user.id }).lean();
    for (const doc of liveMonths) {
      monthTotals.set(doc.monthKey, (monthTotals.get(doc.monthKey) || 0) + doc.messages);
    }

    if (monthTotals.size === 0) {
      await interaction.editReply({ content: `No message history found for ${user.tag} in #general.` });
      return;
    }

    const sorted = [...monthTotals.entries()].sort((a, b) => b[1] - a[1]);
    const [bestMonth, bestCount] = sorted[0];
    const totalMessages = sorted.reduce((sum, [, count]) => sum + count, 0);
    const top5 = sorted
      .slice(0, 5)
      .map(([monthKey, count], i) => `**${i + 1}.** ${formatMonthKey(monthKey)} — ${count.toLocaleString('en-US')}`)
      .join('\n');

    // Same 'YYYY-MM', UTC key format as monthTotals itself (see
    // monthlyMessagesSchema.js) — falls back to 0 if nothing's been
    // recorded for the current month yet.
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonthCount = monthTotals.get(currentMonthKey) || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📅 ${user.username}'s Most Active Month`)
      .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }))
      .setColor(0x45d6fd)
      .addFields(
        { name: 'Most active month', value: formatMonthKey(bestMonth), inline: true },
        { name: 'Messages that month', value: bestCount.toLocaleString('en-US'), inline: true },
        { name: 'Messages this month', value: currentMonthCount.toLocaleString('en-US'), inline: true },
        { name: 'All-time messages', value: totalMessages.toLocaleString('en-US'), inline: true },
        { name: 'Top months', value: top5 }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
