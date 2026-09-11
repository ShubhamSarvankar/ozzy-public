const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const StatsPeriod = require('../models/statsPeriodSchema');
const WeeklyStats = require('../models/weeklyStatsSchema');
const { startNewPeriod, getActivePeriodId, getPeriodVersion } = require('../utils/weeklyStats');
const { paginateLeaderboard } = require('../utils/leaderboardPaginator');

// Cross-invocation PNG cache for the public `view` board — keyed by period
// and page, invalidated by comparing against utils/weeklyStats's per-period
// write version rather than tracking writes here. The board is public and
// its data changes rarely, so repeated /lbweekly view calls between
// increments should not re-render from scratch.
const publicBoardCache = new Map(); // `${periodId}:${page}` -> { version, buffer }
function makePublicBoardCache(periodId) {
    return {
        get(page) {
            const key = `${periodId}:${page}`;
            const entry = publicBoardCache.get(key);
            if (!entry) return undefined;
            if (entry.version !== getPeriodVersion(periodId)) {
                publicBoardCache.delete(key);
                return undefined;
            }
            return entry.buffer;
        },
        set(page, buffer) {
            publicBoardCache.set(`${periodId}:${page}`, { version: getPeriodVersion(periodId), buffer });
        },
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lbweekly')
        .setDescription('Weekly sapphire leaderboard')
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Close the active weekly period and start a new one (messages, sapphires, and stamps all roll over)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the weekly sapphires leaderboard')
                .addIntegerOption(option =>
                    option.setName('period').setDescription('View a past (closed) period instead of the active one').setRequired(false))),

    async execute(interaction) {
        if (!interaction.isCommand()) return;

        const subcommand = interaction.options.getSubcommand();

        // 'view' is the public board — 'reset' stays admin-only.
        if (subcommand !== 'view' && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        await interaction.deferReply();

        try {
            switch (subcommand) {
                case 'reset':
                    await resetWeeklyPeriod(interaction);
                    break;
                case 'view':
                    await viewWeeklyLeaderboard(interaction);
                    break;
                default:
                    await interaction.editReply('Invalid subcommand.');
                    break;
            }
        } catch (error) {
            console.error(error);
            await interaction.followUp('An error occurred while executing the command.');
        }
    },
};

// Reads weeklyStats — old periods stay permanently queryable, so this
// doubles as create/update/backup all at once: it always renders fresh
// (no stored message to keep in sync, unlike the retired legacy embed
// flow), and any past period is viewable forever via the `period` option.
async function viewWeeklyLeaderboard(interaction) {
    const requestedPeriod = interaction.options.getInteger('period');
    let periodId = requestedPeriod;
    let periodDoc = null;

    if (periodId == null) {
        periodId = await getActivePeriodId();
        periodDoc = await StatsPeriod.findOne({ periodId }).lean();
    } else {
        periodDoc = await StatsPeriod.findOne({ periodId }).lean();
        if (!periodDoc) {
            await interaction.editReply({ content: `Period ${periodId} doesn't exist.` });
            return;
        }
    }

    const statsSnapshot = await WeeklyStats.find({ periodId, sapphires: { $gt: 0 } })
        .sort({ sapphires: -1 })
        .select('userId sapphires')
        .lean();

    if (statsSnapshot.length === 0) {
        await interaction.editReply({ content: `No sapphires tracked yet for period ${periodId}.` });
        return;
    }

    const rankedIds = statsSnapshot.map((s) => s.userId);
    const sapphiresByUserId = new Map(statsSnapshot.map((s) => [s.userId, s.sapphires]));
    const isActive = periodDoc && periodDoc.endedAt == null;
    const subtitle = `Period #${periodId}${isActive ? ' · active' : ' · closed'}`;

    async function buildRows(idsForPage) {
        const members = await interaction.guild.members.fetch({ user: idsForPage }).catch(() => new Map());

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

            rows.push({
                rank: rankedIds.indexOf(userId) + 1,
                name,
                avatarUrl,
                badge: { value: sapphiresByUserId.get(userId), kind: 'sapphire' },
                columns: [],
            });
        }
        return rows;
    }

    // No "jump to my rank" button on this board — public, and removed on request.
    await paginateLeaderboard({
        interaction,
        title: 'Weekly Sapphires Leaderboard',
        subtitle,
        spec: { columnCount: 0, badgeKind: 'sapphire', numberFormat: 'full' },
        rankedIds,
        buildRows,
        pageCache: makePublicBoardCache(periodId),
    });
}

// Closes the active period and opens the next one. This is the only period
// create/end mechanism in the system — period 1 itself was bootstrapped by
// scripts/migrateWeeklySapphires.js (or lazily by utils/weeklyStats.js's
// getActivePeriodId() if that hasn't run), every period after it comes from
// here.
async function resetWeeklyPeriod(interaction) {
    const activePeriod = await StatsPeriod.findOne({ endedAt: null }).lean();
    if (!activePeriod) {
        await interaction.editReply('No active period found — has the migration script (scripts/migrateWeeklySapphires.js) been run yet?');
        return;
    }

    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lbweekly_reset_confirm').setLabel('Close period & start new week').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('lbweekly_reset_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Close weekly period?')
        .setColor(0xed4245)
        .setDescription(
            `This closes **period #${activePeriod.periodId}** and starts a new one.\n\n` +
            `**Messages, sapphires, and stamps all roll over** — this is not a sapphires-only reset, ` +
            `despite the command name.`
        );

    const message = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 30000,
        max: 1,
    });

    collector.on('collect', async (i) => {
        if (i.customId === 'lbweekly_reset_cancel') {
            await i.update({ content: 'Reset cancelled.', embeds: [], components: [] });
            return;
        }

        await i.deferUpdate();

        const { closedPeriod, newPeriod } = await startNewPeriod(interaction.user.id);

        const topThree = await WeeklyStats.find({ periodId: closedPeriod.periodId })
            .sort({ messages: -1, sapphires: -1, stamps: -1 })
            .limit(3)
            .lean();

        const topLines = await Promise.all(
            topThree.map(async (stat, idx) => {
                const user = await interaction.client.users.fetch(stat.userId).catch(() => null);
                const name = user ? user.username : stat.userId;
                return `**${idx + 1}.** ${name} — ${stat.messages.toLocaleString('en-US')} messages`;
            })
        );

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`📅 Period #${closedPeriod.periodId} closed`)
            .setColor(0x45d6fd)
            .setDescription(
                topLines.length > 0
                    ? `Top 3 this week:\n${topLines.join('\n')}\n\nPeriod #${newPeriod.periodId} is now active.`
                    : `No messages were tracked this period.\n\nPeriod #${newPeriod.periodId} is now active.`
            );

        await i.editReply({ embeds: [summaryEmbed], components: [] });
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            try {
                await interaction.editReply({ content: 'Reset timed out — no changes made.', embeds: [], components: [] });
            } catch (err) {
                // message may already be gone — non-fatal
            }
        }
    });
}
