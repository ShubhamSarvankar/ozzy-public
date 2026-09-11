// commands/leaderboard.js
const { SlashCommandBuilder } = require('discord.js');
const profileModel = require('../models/profileSchema');
const levelModel = require('../models/levelSchema');
const StampModel = require('../models/stampSchema');
const { levelForXp } = require('../utils/levels');
const { sumMonthlyMessages } = require('../utils/monthlyMessages');
const { paginateLeaderboard } = require('../utils/leaderboardPaginator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('All-time sapphires leaderboard'),

  async execute(interaction) {
    await interaction.deferReply();

    // Sorted by sapphires — scoped to this guild, same fix as before
    // (profileModel has no guildId scoping enforced elsewhere).
    const statsSnapshot = await profileModel
      .find({ serverId: interaction.guild.id })
      .sort({ sapphires: -1 })
      .select('userId sapphires')
      .lean();

    if (statsSnapshot.length === 0) {
      await interaction.editReply({ content: 'No sapphire data yet.' });
      return;
    }

    const rankedIds = statsSnapshot.map((s) => s.userId);
    const sapphiresByUserId = new Map(statsSnapshot.map((s) => [s.userId, s.sapphires]));

    async function buildRows(idsForPage) {
      // Four batched lookups for the page's 10 rows — never per row.
      const [members, levelDocs, stampDocs, monthlyMessagesByUserId] = await Promise.all([
        interaction.guild.members.fetch({ user: idsForPage }).catch(() => new Map()),
        levelModel
          .find({ userId: { $in: idsForPage }, guildId: interaction.guild.id })
          .select('userId xp backfillMessages')
          .lean(),
        StampModel.find({ userId: { $in: idsForPage } }).select('userId stamps').lean(),
        sumMonthlyMessages(idsForPage),
      ]);

      const xpByUserId = new Map(levelDocs.map((d) => [d.userId, d.xp]));
      const backfillMessagesByUserId = new Map(levelDocs.map((d) => [d.userId, d.backfillMessages || 0]));
      const stampsByUserId = new Map(stampDocs.map((d) => [d.userId, d.stamps.length]));

      const rows = [];
      for (const userId of idsForPage) {
        const member = members.get(userId);
        // Real username, not nickname/global display name — see commands/lbmessages.js for why.
        let name = member ? member.user.username : null;
        let avatarUrl = member ? member.displayAvatarURL({ extension: 'png', size: 64 }) : null;

        if (!member) {
          try {
            const user = await interaction.client.users.fetch(userId);
            name = user.username;
            avatarUrl = user.displayAvatarURL({ extension: 'png', size: 64 });
          } catch {
            name = 'Unknown user';
            avatarUrl = null;
          }
        }

        const xp = xpByUserId.get(userId) || 0;
        // Level is derived from XP, not trusted from the stored field —
        // commands/addxp.js can add XP without recomputing level (same
        // reasoning as /levels).
        const level = levelForXp(xp);
        // All-time messages = the frozen historical crawl snapshot
        // (backfillMessages, scope.md Phase 3) + everything counted live
        // since the crawl boundary (monthlyMessages, permanent/never reset).
        const messages = (backfillMessagesByUserId.get(userId) || 0) + (monthlyMessagesByUserId.get(userId) || 0);

        rows.push({
          rank: rankedIds.indexOf(userId) + 1,
          name,
          avatarUrl,
          badge: { value: sapphiresByUserId.get(userId), kind: 'sapphire' },
          columns: [
            { label: 'Level', value: level },
            { label: 'Messages', value: messages },
            { label: 'Stamps', value: stampsByUserId.get(userId) || 0 },
          ],
        });
      }
      return rows;
    }

    async function getUserRank(userId) {
      const idx = rankedIds.indexOf(userId);
      return idx === -1 ? null : idx + 1;
    }

    await paginateLeaderboard({
      interaction,
      title: 'Sapphires Leaderboard',
      subtitle: 'All-time',
      spec: { columnCount: 3, badgeKind: 'sapphire', numberFormat: 'abbreviated' },
      rankedIds,
      buildRows,
      getUserRank,
    });
  },
};
