const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const WeeklyStats = require('../models/weeklyStatsSchema');
const StatsPeriod = require('../models/statsPeriodSchema');
const { getActivePeriodId } = require('../utils/weeklyStats');
const { paginateLeaderboard } = require('../utils/leaderboardPaginator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lbmessages')
    .setDescription('Weekly messages leaderboard (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((option) =>
      option.setName('period').setDescription('View a past (closed) period instead of the active one').setRequired(false)
    ),

  async execute(interaction) {
    // Picker-level restriction (setDefaultMemberPermissions above) can be
    // overridden by server admins for their own roles, so also check at
    // runtime — same pattern as commands/temprole.js.
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
    }

    await interaction.deferReply();

    const requestedPeriod = interaction.options.getInteger('period');
    let periodId = requestedPeriod;
    let periodDoc = null;

    if (periodId == null) {
      periodId = await getActivePeriodId();
      periodDoc = await StatsPeriod.findOne({ periodId }).lean();
    } else {
      periodDoc = await StatsPeriod.findOne({ periodId }).lean();
      if (!periodDoc) {
        return interaction.editReply({ content: `Period ${periodId} doesn't exist.` });
      }
    }

    // Filter messages > 0 by default (confirmed decision) so sapphire/stamp-only
    // rows don't pile up at the bottom of a messages-focused board.
    const statsSnapshot = await WeeklyStats.find({ periodId, messages: { $gt: 0 } })
      .sort({ messages: -1, sapphires: -1, stamps: -1 })
      .select('userId messages sapphires stamps')
      .lean();

    if (statsSnapshot.length === 0) {
      return interaction.editReply({ content: `No messages tracked yet for period ${periodId}.` });
    }

    const rankedIds = statsSnapshot.map((s) => s.userId);
    const statsByUserId = new Map(statsSnapshot.map((s) => [s.userId, s]));

    const isActive = periodDoc && periodDoc.endedAt == null;
    const subtitle = `Period #${periodId}${isActive ? ' · active' : ' · closed'}`;

    async function buildRows(idsForPage) {
      // One batched fetch for the page's 10 rows — never per row.
      const members = await interaction.guild.members.fetch({ user: idsForPage }).catch(() => new Map());

      const rows = [];
      for (const userId of idsForPage) {
        const stats = statsByUserId.get(userId);
        const member = members.get(userId);
        // Real Discord username, not the server nickname / global display
        // name — those can be set to anything (including stylized fonts the
        // bundled font can't render, or names that look like other users'),
        // so the username is the only reliably readable, unambiguous label.
        let name = member ? member.user.username : null;
        let avatarUrl = member ? member.displayAvatarURL({ extension: 'png', size: 64 }) : null;

        if (!member) {
          // Rare: user left the guild between tracking and viewing. Fall back
          // to the client-wide user object rather than dropping the row.
          try {
            const user = await interaction.client.users.fetch(userId);
            name = user.username;
            avatarUrl = user.displayAvatarURL({ extension: 'png', size: 64 });
          } catch {
            name = 'Unknown user';
            avatarUrl = null;
          }
        }

        rows.push({
          rank: rankedIds.indexOf(userId) + 1,
          name,
          avatarUrl,
          badge: { value: stats.sapphires, kind: 'sapphire' },
          columns: [
            { label: 'Messages', value: stats.messages },
            { label: 'Stamps', value: stats.stamps },
          ],
        });
      }
      return rows;
    }

    // The full ranked snapshot is already held in memory (bounded by guild
    // size), so rank lookup for "jump to my rank" is an index lookup rather
    // than a second query — equivalent to scope.md's countDocuments approach,
    // just cheaper given we already loaded the whole sorted list once.
    async function getUserRank(userId) {
      const idx = rankedIds.indexOf(userId);
      return idx === -1 ? null : idx + 1;
    }

    await paginateLeaderboard({
      interaction,
      title: 'Weekly Messages Leaderboard',
      subtitle,
      spec: { columnCount: 2, badgeKind: 'sapphire', numberFormat: 'full' },
      rankedIds,
      buildRows,
      getUserRank,
    });
  },
};
