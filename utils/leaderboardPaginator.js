/**
 * Shared pagination for every canvas-rendered leaderboard. Attaches its own
 * button collector directly to the reply message (the events/interactionCreate.js
 * pattern this deliberately avoids — see below), so paging never touches that
 * file's per-interaction upserts or its `!isChatInputCommand()` early return.
 *
 * Caller contract:
 *   - `rankedIds` must be a full, already-sorted snapshot taken ONCE before
 *     calling this (one query). This module never re-queries per page — that
 *     keeps ranks stable while someone pages and avoids deep `skip` offsets.
 *   - `buildRows(idsForPage, startIndex)` must batch its own lookups (e.g. one
 *     guild.members.fetch({ user: ids }) call) — never fetch per row.
 *   - `interaction` must already be deferred (interaction.deferReply()) before
 *     calling this, since it replies via interaction.editReply().
 *
 * Image swapping on button press edits the SAME message in place via
 * `i.update({ attachments: [], files: [...], ... })` — the explicit
 * `attachments: []` is required or the previous image persists alongside the
 * new one. Do not replicate commands/stampbook.js's paging pattern, which
 * never updates the original interaction at all and instead calls
 * `interaction.followUp(...)` on every page turn, spawning a new ephemeral
 * message each time while the original message's buttons stay stale.
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { renderBoard } = require('./leaderboardCanvas');

const PAGE_SIZE = 10;
const COLLECTOR_TIME_MS = 120000;

function buildComponents(page, totalPages, includeJump) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lb_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('lb_next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages)
  );
  if (includeJump) {
    row.addComponents(
      new ButtonBuilder().setCustomId('lb_jump').setLabel('Jump to my rank').setStyle(ButtonStyle.Primary)
    );
  }
  return [row];
}

/**
 * @param {Object} opts
 * @param {import('discord.js').ChatInputCommandInteraction} opts.interaction
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {Object} opts.spec - passed through to renderBoard
 * @param {string[]} opts.rankedIds - full ranked id snapshot, already sorted
 * @param {(idsForPage: string[], startIndex: number) => Promise<object[]>} opts.buildRows
 * @param {((userId: string) => Promise<number|null>)} [opts.getUserRank] - powers
 *   "jump to my rank"; implemented by the caller as one countDocuments against
 *   the board's sort field (the user may not be in `rankedIds` at all, e.g.
 *   filtered out by a messages > 0 clause).
 * @param {boolean} [opts.ephemeral]
 * @param {{get(page:number):(Buffer|undefined), set(page:number, buf:Buffer):void}} [opts.pageCache] -
 *   optional externally-owned cache (e.g. a cross-invocation, version-keyed
 *   cache for a public board whose data changes rarely). Defaults to a
 *   plain per-invocation Map scoped to this collector's lifetime.
 */
async function paginateLeaderboard({ interaction, title, subtitle, spec, rankedIds, buildRows, getUserRank, pageCache }) {
  const totalPages = Math.max(1, Math.ceil(rankedIds.length / PAGE_SIZE));
  const localCache = new Map(); // page (1-indexed) -> PNG Buffer, lives for the collector's lifetime
  const cache = pageCache || { get: (page) => localCache.get(page), set: (page, buf) => localCache.set(page, buf) };

  async function renderPage(page) {
    const cached = cache.get(page);
    if (cached) return cached;
    const startIndex = (page - 1) * PAGE_SIZE;
    const idsForPage = rankedIds.slice(startIndex, startIndex + PAGE_SIZE);
    const rows = await buildRows(idsForPage, startIndex);
    const png = await renderBoard({ title, subtitle, rows, spec, page, totalPages });
    cache.set(page, png);
    return png;
  }

  let currentPage = 1;
  const firstPng = await renderPage(1); // page 1 rendered eagerly; later pages only on first visit

  const message = await interaction.editReply({
    files: [new AttachmentBuilder(firstPng, { name: 'leaderboard.png' })],
    embeds: [],
    components: buildComponents(1, totalPages, Boolean(getUserRank)),
  });

  if (totalPages <= 1 && !getUserRank) return message;

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: COLLECTOR_TIME_MS,
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'These buttons aren’t for you!', ephemeral: true });
    }

    try {
      if (i.customId === 'lb_prev') {
        currentPage = Math.max(1, currentPage - 1);
      } else if (i.customId === 'lb_next') {
        currentPage = Math.min(totalPages, currentPage + 1);
      } else if (i.customId === 'lb_jump') {
        const rank = await getUserRank(i.user.id);
        if (!rank) {
          await i.reply({ content: "You don't have a rank on this board yet.", ephemeral: true });
          return;
        }
        currentPage = Math.min(totalPages, Math.ceil(rank / PAGE_SIZE));
      }

      const png = await renderPage(currentPage);
      await i.update({
        attachments: [],
        files: [new AttachmentBuilder(png, { name: 'leaderboard.png' })],
        components: buildComponents(currentPage, totalPages, Boolean(getUserRank)),
      });
    } catch (err) {
      console.error('[leaderboardPaginator] button handling failed:', err);
    }
  });

  collector.on('end', async () => {
    try {
      await interaction.editReply({ components: [] });
    } catch (err) {
      // Message may already be gone (deleted, DM closed, etc) — non-fatal.
    }
  });

  return message;
}

module.exports = { paginateLeaderboard, PAGE_SIZE };
