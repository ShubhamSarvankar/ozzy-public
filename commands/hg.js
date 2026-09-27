const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const runner = require('../hungergames/discord/runner');
const HungerGamesResult = require('../models/hungerGamesResultSchema');
const { totals, userTotals } = require('../hungergames/engine/stats');
const { AUTO_ADVANCE_MIN_SECONDS, AUTO_ADVANCE_MAX_SECONDS } = require('../hungergames/engine/constants');
const { renderBoard } = require('../utils/leaderboardCanvas');

const COLOR = 0x953d59;

const autoAdvanceOption = (o) => o
  .setName('auto-advance')
  .setDescription(`Seconds between steps (${AUTO_ADVANCE_MIN_SECONDS} to ${AUTO_ADVANCE_MAX_SECONDS}). Next still works.`)
  .setMinValue(AUTO_ADVANCE_MIN_SECONDS)
  .setMaxValue(AUTO_ADVANCE_MAX_SECONDS);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hg')
    .setDescription('Hunger Games')
    .addSubcommand((s) => s.setName('solo').setDescription('Host: start a solo Hunger Games')
      .addIntegerOption(autoAdvanceOption))
    .addSubcommand((s) => s.setName('squad').setDescription('Host: start a squad Battle Royale (teams of 2)')
      .addIntegerOption(autoAdvanceOption))
    .addSubcommand((s) => s.setName('stats').setDescription('Hunger Games wins and kills')
      .addUserOption((o) => o.setName('user').setDescription('Player (defaults to you)')))
    .addSubcommand((s) => s.setName('leaderboard').setDescription('All time Hunger Games leaderboard')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'solo' || sub === 'squad') {
      return runner.startLobby(interaction, { mode: sub, autoAdvance: interaction.options.getInteger('auto-advance') });
    }
    if (sub === 'stats') return showStats(interaction);
    if (sub === 'leaderboard') return showLeaderboard(interaction);
    return null;
  },
};

async function allResults() {
  return HungerGamesResult.find().select('winnerIds kills').lean();
}

async function showStats(interaction) {
  await interaction.deferReply();
  const user = interaction.options.getUser('user') || interaction.user;
  const s = userTotals(await allResults(), user.id);
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`Hunger Games stats for ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }))
    .addFields(
      { name: 'Wins', value: String(s.wins), inline: true },
      { name: 'Kills', value: String(s.kills), inline: true },
    );
  return interaction.editReply({ embeds: [embed] });
}

async function showLeaderboard(interaction) {
  await interaction.deferReply();
  const rows = totals(await allResults()).slice(0, 15);
  if (!rows.length) return interaction.editReply('No Hunger Games have been recorded yet.');

  const boardRows = await Promise.all(rows.map(async (r, i) => {
    let user = null;
    try { user = await interaction.client.users.fetch(r.userId); } catch { /* left Discord */ }
    return {
      rank: i + 1,
      name: user ? user.username : r.userId,
      avatarUrl: user ? user.displayAvatarURL({ extension: 'png', size: 64 }) : null,
      badge: { value: r.wins, kind: 'points' },
      columns: [
        { label: 'Wins', value: r.wins },
        { label: 'Kills', value: r.kills },
      ],
    };
  }));
  const png = await renderBoard({
    title: 'Hunger Games leaderboard',
    subtitle: 'All time wins and kills',
    rows: boardRows,
    spec: { columnCount: 2, badgeKind: 'points', numberFormat: 'full' },
  });
  return interaction.editReply({ files: [new AttachmentBuilder(png, { name: 'hg-leaderboard.png' })] });
}
