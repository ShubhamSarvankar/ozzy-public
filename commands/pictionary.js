const {
  SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags,
} = require('discord.js');
const config = require('../config');
const manager = require('../pictionary/discord/manager');
const Game = require('../pictionary/store/game');
const Turn = require('../pictionary/store/turn');
const { userStats, podiumFinishes, allTimeTotals } = require('../pictionary/engine/stats');
const { rulesText, formatSolve } = require('../pictionary/engine/format');
const { renderBoard } = require('../utils/leaderboardCanvas');
const queries = require('../pictionary/analytics/queries');

const COLOR = 0xe67e22;
const ephemeral = { flags: MessageFlags.Ephemeral };
const pct = (n) => (n === null || n === undefined ? 'n/a' : `${Math.round(n * 100)}%`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pictionary')
    .setDescription('Pictionary game')
    .addSubcommand((s) => s.setName('start').setDescription('Host: start a game in general chat')
      .addIntegerOption((o) => o.setName('rounds').setDescription('Number of rounds (1 to 5)').setMinValue(1).setMaxValue(5).setRequired(true))
      .addIntegerOption((o) => o.setName('seconds').setDescription('Turn length in seconds (60 to 120)').setMinValue(60).setMaxValue(120).setRequired(true))
      .addBooleanOption((o) => o.setName('near-miss-hints').setDescription('DM guessers a hint when they are close (default: on)')))
    .addSubcommand((s) => s.setName('pause').setDescription('Host: pause the running game'))
    .addSubcommand((s) => s.setName('resume').setDescription('Host: resume a paused game'))
    .addSubcommand((s) => s.setName('end').setDescription('Host: end the game and publish the rankings'))
    .addSubcommand((s) => s.setName('remove-actor').setDescription('Host: remove an AFK player from acting this round')
      .addUserOption((o) => o.setName('user').setDescription('Player to remove').setRequired(true)))
    .addSubcommand((s) => s.setName('rules').setDescription('Show the actor rules'))
    .addSubcommand((s) => s.setName('stats').setDescription('Show Pictionary stats')
      .addUserOption((o) => o.setName('user').setDescription('Player (defaults to you)')))
    .addSubcommand((s) => s.setName('leaderboard').setDescription('All time Pictionary leaderboard'))
    .addSubcommand((s) => s.setName('analytics').setDescription('Owner only: word and game analytics')
      .addStringOption((o) => o.setName('view').setDescription('What to show').setRequired(true).addChoices(
        { name: 'Overview', value: 'overview' },
        { name: 'Word performance', value: 'words' },
        { name: 'Difficulty flags', value: 'flags' },
        { name: 'Recently used words', value: 'recent' },
      ))
      .addStringOption((o) => o.setName('category').setDescription('Filter by category'))
      .addIntegerOption((o) => o.setName('tier').setDescription('Filter by tier').addChoices({ name: 'Tier 1', value: 1 }, { name: 'Tier 2', value: 2 }))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const hostOnly = ['start', 'pause', 'resume', 'end', 'remove-actor'];
    if (hostOnly.includes(sub) && !manager.isHost(interaction)) {
      return interaction.reply({ content: 'Only the Host role can use this.', ...ephemeral });
    }

    if (sub === 'start') {
      return manager.startGame(interaction, {
        rounds: interaction.options.getInteger('rounds'),
        seconds: interaction.options.getInteger('seconds'),
        nearMissHints: interaction.options.getBoolean('near-miss-hints'),
      });
    }
    if (['pause', 'resume', 'end', 'remove-actor'].includes(sub)) return runHostAction(interaction, sub);
    if (sub === 'rules') {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Pictionary actor rules').setDescription(rulesText({
          maxClues: config.pictionary.maxClues, readySeconds: config.pictionary.readySeconds, turnStartBufferSeconds: config.pictionary.turnStartBufferSeconds,
        }))],
        ...ephemeral,
      });
    }
    if (sub === 'stats') return showUserStats(interaction);
    if (sub === 'leaderboard') return showLeaderboard(interaction);
    if (sub === 'analytics') return showAnalytics(interaction);
  },
};

async function runHostAction(interaction, sub) {
  const game = await manager.currentOpenGame(interaction.guildId);
  if (!game) return interaction.reply({ content: 'There is no running game.', ...ephemeral });
  let err;
  if (sub === 'pause') err = await manager.pauseGame(game._id);
  else if (sub === 'resume') err = await manager.resumeGame(game._id);
  else if (sub === 'end') err = await manager.endGame(game._id);
  else err = await manager.removeActor(game._id, interaction.options.getUser('user').id);
  const done = { pause: 'Game paused.', resume: 'Game resumed.', end: 'Game ended.', 'remove-actor': 'Player removed from acting this round.' }[sub];
  return interaction.reply({ content: err || done, ...ephemeral });
}

async function showUserStats(interaction) {
  await interaction.deferReply();
  const user = interaction.options.getUser('user') || interaction.user;
  const turns = await Turn.find({ $or: [{ actorId: user.id }, { guesserId: user.id }] }).lean();
  if (!turns.length) return interaction.editReply(`${user.username} has not played Pictionary yet.`);

  const gameIds = [...new Set(turns.map((t) => String(t.gameId)))];
  const finished = await Game.find({ _id: { $in: gameIds }, status: 'finished' }).select('_id').lean();
  const finishedIds = finished.map((g) => g._id);
  const gameTurns = finishedIds.length ? await Turn.find({ gameId: { $in: finishedIds } }).lean() : [];
  const s = userStats(turns, user.id);
  const p = podiumFinishes(gameTurns, user.id);

  const e = new EmbedBuilder().setColor(COLOR).setTitle(`Pictionary stats for ${user.username}`)
    .addFields(
      { name: 'Overall', value: [`Games: ${s.gamesPlayed}`, `Total points: ${s.totalPoints}`, `Podiums: 🥇 ${p.first}  🥈 ${p.second}  🥉 ${p.third}`].join('\n'), inline: true },
      { name: 'As guesser', value: [`Correct guesses: ${s.correctGuesses}`, `Average solve: ${formatSolve(s.avgSolveMs)}`, `Fastest solve: ${formatSolve(s.fastestSolveMs)}`].join('\n'), inline: true },
      { name: 'As actor', value: [`Turns acted: ${s.turnsActed}`, `Guessed rate: ${pct(s.actorSuccessRate)}`, `Skipped turns: ${s.turnsNotStarted}`, `Hard violations: ${s.violations}`, `Vetoed turns: ${s.vetoedTurns}`].join('\n'), inline: true },
    );
  return interaction.editReply({ embeds: [e] });
}

async function showLeaderboard(interaction) {
  await interaction.deferReply();
  const finished = await Game.find({ status: 'finished' }).select('_id').lean();
  if (!finished.length) return interaction.editReply('No finished Pictionary games yet.');
  const ids = new Set(finished.map((g) => String(g._id)));
  const turns = await Turn.find({ gameId: { $in: finished.map((g) => g._id) } }).lean();
  const rows = allTimeTotals(turns, ids).slice(0, 15);
  if (!rows.length) return interaction.editReply('No points yet.');

  const boardRows = await Promise.all(rows.map(async (r, i) => {
    let user = null;
    try { user = await interaction.client.users.fetch(r.userId); } catch { /* left the server */ }
    return {
      rank: i + 1,
      name: user ? user.username : r.userId,
      avatarUrl: user ? user.displayAvatarURL({ extension: 'png', size: 64 }) : null,
      badge: { value: r.points, kind: 'points' },
      columns: [{ label: 'Wins', value: r.wins }, { label: 'Games', value: r.games }],
    };
  }));
  const png = await renderBoard({
    title: 'Pictionary leaderboard',
    subtitle: 'All time',
    rows: boardRows,
    spec: { columnCount: 2, badgeKind: 'points', numberFormat: 'full' },
  });
  return interaction.editReply({ files: [new AttachmentBuilder(png, { name: 'pictionary-leaderboard.png' })] });
}

async function showAnalytics(interaction) {
  if (interaction.user.id !== config.pictionary.ownerId) {
    return interaction.reply({ content: 'This dashboard is owner only.', ...ephemeral });
  }
  await interaction.deferReply(ephemeral);
  const view = interaction.options.getString('view');
  const category = interaction.options.getString('category');
  const tier = interaction.options.getInteger('tier');

  const e = new EmbedBuilder().setColor(COLOR).setTitle(`Pictionary analytics: ${view}`);
  const filterNote = [category && `category ${category}`, tier && `tier ${tier}`].filter(Boolean).join(', ');
  if (filterNote) e.setFooter({ text: `Filter: ${filterNote}` });

  // Same query layer the read-only CLI uses (pictionary/analytics/queries.js), so this
  // view and what Claude Code sees from the CLI can never disagree.
  if (view === 'overview') {
    const o = await queries.overview();
    e.setDescription([
      `Games: ${o.games} (${o.finished} finished)`,
      `Words in list: ${o.wordsInList}, ${o.neverPlayed} never played`,
      `By source: ${Object.entries(o.bySource).map(([k, v]) => `${k} ${v}`).join(', ') || 'n/a'}`,
      `Turns selected: ${o.turnsTotal}, played: ${o.turnsPlayed}`,
      `Guess rate: ${pct(o.successRate)}, median solve: ${formatSolve(o.medianSolveMs)}, fastest: ${formatSolve(o.fastestSolveMs)}`,
      `Timeouts: ${o.timeouts} (${pct(o.timeoutRate)}), violations: ${o.violations}, vetoes: ${o.vetoes} (${pct(o.vetoRate)}), not started: ${o.notStarted}`,
    ].join('\n'));
  } else if (view === 'words') {
    const rows = await queries.words({ category, tier, limit: 20 });
    e.setDescription(rows.length
      ? rows.map(({ word: w, metrics: m }) => `**${w.answer}** (${w.category}, T${w.tier}): ${m.guessed}/${m.played} guessed (${pct(m.successRate)}), median ${formatSolve(m.medianSolveMs)}, best ${formatSolve(m.fastestSolveMs)}, TO ${m.timeouts}, viol ${m.violations}, veto ${m.vetoes}, skipped ${m.notStarted}`).join('\n')
      : 'No plays recorded for these words yet.');
  } else if (view === 'flags') {
    const labels = {
      too_easy: 'too easy', too_hard: 'too hard', high_vetoes: 'high vetoes', high_timeouts: 'high timeouts',
    };
    const { rows: allRows, thresholds } = await queries.flags();
    const rows = allRows.filter(({ word: w }) => (!category || w.category.toLowerCase() === category.toLowerCase()) && (!tier || w.tier === tier))
      .map(({ word: w, flags, metrics: m }) => `**${w.answer}**: ${flags.map((f) => labels[f]).join(', ')} (${m.played} plays, ${pct(m.successRate)})`);
    e.setDescription(rows.length ? rows.join('\n') : `No flags. A word needs at least ${thresholds.MIN_SAMPLE} plays to be flagged.`);
  } else if (view === 'recent') {
    const rows = await queries.recentlyUsed({ limit: 25 });
    const filtered = rows.filter(({ word: w }) => (!category || w.category.toLowerCase() === category.toLowerCase()) && (!tier || w.tier === tier))
      .map(({ word: w, lastExposedAt, onCooldown }) => `**${w.answer}**: <t:${Math.floor(new Date(lastExposedAt).getTime() / 1000)}:R>${onCooldown ? ' (on cooldown)' : ''}`);
    e.setDescription(filtered.length ? filtered.join('\n') : 'No words have been used yet.');
  }
  return interaction.editReply({ embeds: [e] });
}
