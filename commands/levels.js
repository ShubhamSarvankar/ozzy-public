const { SlashCommandBuilder } = require('discord.js');
const levelModel = require('../models/levelSchema');
const profileModel = require('../models/profileSchema');
const { getLevelProgress } = require('../utils/levels');
const { sumMonthlyMessages } = require('../utils/monthlyMessages');
const { paginateLeaderboard } = require('../utils/leaderboardPaginator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Shows the level leaderboard'),

  async execute(interaction) {
    await interaction.deferReply();

    // Sort by xp, not the stored level field — commands/addxp.js can add XP
    // without recomputing level, so a stored level can lag behind actual XP.
    // Level shown on the badge is always derived from xp via utils/levels.js.
    const statsSnapshot = await levelModel
      .find({ guildId: interaction.guild.id })
      .sort({ xp: -1 })
      .select('userId xp backfillMessages')
      .lean();

    if (statsSnapshot.length === 0) {
      await interaction.editReply({ content: 'No level data yet.' });
      return;
    }

    const rankedIds = statsSnapshot.map((s) => s.userId);
    const xpByUserId = new Map(statsSnapshot.map((s) => [s.userId, s.xp]));
    const backfillMessagesByUserId = new Map(statsSnapshot.map((s) => [s.userId, s.backfillMessages || 0]));

    async function buildRows(idsForPage) {
      // Two batched lookups for the page's 10 rows — never per row.
      const [members, sapphireDocs, monthlyMessagesByUserId] = await Promise.all([
        interaction.guild.members.fetch({ user: idsForPage }).catch(() => new Map()),
        profileModel.find({ userId: { $in: idsForPage } }).select('userId sapphires').lean(),
        sumMonthlyMessages(idsForPage),
      ]);
      const sapphiresByUserId = new Map(sapphireDocs.map((d) => [d.userId, d.sapphires]));

      const rows = [];
      for (const userId of idsForPage) {
        const xp = xpByUserId.get(userId) || 0;
        const { level, progress } = getLevelProgress(xp);
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

        // All-time messages = the frozen historical crawl snapshot
        // (backfillMessages, scope.md Phase 3) + everything counted live
        // since the crawl boundary (monthlyMessages, permanent/never reset).
        const messages = (backfillMessagesByUserId.get(userId) || 0) + (monthlyMessagesByUserId.get(userId) || 0);

        rows.push({
          rank: rankedIds.indexOf(userId) + 1,
          name,
          avatarUrl,
          badge: { value: level, kind: 'level', progress },
          columns: [
            { label: 'Messages', value: messages },
            { label: 'XP', value: xp },
            { label: 'Sapphires', value: sapphiresByUserId.get(userId) || 0 },
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
      title: 'Levels Leaderboard',
      subtitle: 'All-time XP',
      spec: { columnCount: 3, badgeKind: 'level', numberFormat: 'abbreviated' },
      rankedIds,
      buildRows,
      getUserRank,
    });
  },
};
