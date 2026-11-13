// Discord side of Hunger Games: lobby, posting each step, the Next/Sponsor
// buttons, auto-advance, and the winner card. All game rules live in
// hungergames/engine/; this file only turns results into messages.
//
// State is in memory on purpose: games are short and host-driven, so a bot
// restart simply ends the game (buttons then answer "no longer running").
// Every listener, timer and fire-and-forget call is wrapped: index.js exits
// the process on any unhandled rejection.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder, MessageFlags,
} = require('discord.js');
const { createSoloGame, playSoloPhase } = require('../engine/solo');
const { createSquadGame, playSquadPhase, addToSquads } = require('../engine/squad');
const { phaseSpecs, chunkLines } = require('../engine/format');
const {
  canSponsor, tallySponsor, applySponsorGift, giftCount, sponsorBoardLines,
} = require('../engine/sponsor');
const { killCounts } = require('../engine/stats');
const {
  HOST_ROLE_IDS, OZZY_ID, MIN_PLAYERS, LOBBY_TIMEOUT_MS, STEP_TIMEOUT_MS,
} = require('../engine/constants');
const { renderWinnerCard } = require('./winnerCard');
const HungerGamesResult = require('../../models/hungerGamesResultSchema');

const JOIN = '🏹';
const START = '⚔️';
const ADD_OZZY = '🗡';
const COLOR = 0x953d59;
const ephemeral = { flags: MessageFlags.Ephemeral };

let current = null; // one game at a time, solo or squad

function logFail(context, err) {
  const g = current;
  console.error(`[hg] ${context}`, g ? { mode: g.mode, phase: g.lastPhase, round: g.round, step: g.step } : {}, err);
}

// Wrap a listener so neither a throw nor a rejection can escape.
function safe(context, fn) {
  return (...args) => {
    Promise.resolve().then(() => fn(...args)).catch((err) => logFail(context, err));
  };
}

function isHost(member) {
  return Boolean(member) && HOST_ROLE_IDS.some((id) => member.roles.cache.has(id));
}

const nameOf = (g, id) => g.info.get(id)?.name || 'Unknown';

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

function lobbyEmbed(g) {
  const count = g.entries.length;
  const need = Math.max(0, MIN_PLAYERS - count);
  const lines = [
    '**The Reaping**',
    `Hosted by: <@${g.hostId}>`,
    '',
    `React with ${JOIN} to **Participate**`,
    `React with ${ADD_OZZY} to **Add Ozzy** (host)`,
    `React with ${START} to **Begin** (host)`,
    '',
  ];
  if (g.mode === 'solo') {
    const shown = g.entries.slice(0, 100).map((id) => `<@${id}>`);
    if (count > 100) shown.push(`...and ${count - 100} more`);
    lines.push(`**Tributes (${count})**`, shown.join('\n') || 'None yet');
  } else {
    lines.push(`**Squads (${g.squads.length})**`);
    g.squads.slice(0, 50).forEach((s, i) => lines.push(`Squad ${i + 1}: ${s.map((id) => `<@${id}>`).join(' & ')}`));
    if (g.squads.length === 0) lines.push('None yet');
  }
  lines.push('', need > 0 ? `Need ${need} more to start.` : 'Ready to begin!');
  if (g.autoAdvance) lines.push(`Auto-advance: every ${g.autoAdvance}s (the host can still press Next).`);

  return new EmbedBuilder()
    .setTitle(g.mode === 'solo' ? 'Hunger Games' : 'HG Battle Royale 🔮')
    .setDescription(lines.join('\n').slice(0, 4096))
    .setColor(COLOR);
}

function addEntry(g, user, member) {
  if (g.info.has(user.id)) return false;
  g.info.set(user.id, {
    avatar: user.displayAvatarURL({ extension: 'png', size: 256 }),
    username: user.username,
    name: member?.displayName || user.username,
  });
  g.entries.push(user.id);
  if (g.mode === 'squad') addToSquads(g.squads, user.id);
  return true;
}

async function startLobby(interaction, { mode, autoAdvance }) {
  if (!isHost(interaction.member)) {
    return interaction.reply({ content: 'Only hosts can start the Hunger Games.', ...ephemeral });
  }
  if (current) {
    return interaction.reply({ content: 'Another game is already going on!', ...ephemeral });
  }

  const g = {
    id: null,
    mode,
    autoAdvance: autoAdvance || null,
    hostId: interaction.user.id,
    channel: interaction.channel,
    client: interaction.client,
    entries: [],
    squads: [],
    info: new Map(),
    phase: 'lobby',
    step: 0,
    queue: [],
    lastMessage: null,
    timers: [],
    board: null, // the open sponsor window, see openBoard()
    sponsorOpen: false,
    kills: [],
    collectors: [],
    ended: false,
  };
  current = g;

  try {
    await interaction.deferReply();
    const message = await interaction.editReply({ embeds: [lobbyEmbed(g)] });
    g.id = message.id;
    await message.react(JOIN);
    await message.react(ADD_OZZY);
    await message.react(START);

    const collector = message.createReactionCollector({
      filter: (reaction, user) => !user.bot && [JOIN, ADD_OZZY, START].includes(reaction.emoji.name),
      time: LOBBY_TIMEOUT_MS,
    });
    g.collectors.push(collector);

    collector.on('collect', safe('lobby reaction failed', async (reaction, user) => {
      if (g.phase !== 'lobby' || current !== g) return;
      const emoji = reaction.emoji.name;
      if (emoji === JOIN) {
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (addEntry(g, user, member)) await message.edit({ embeds: [lobbyEmbed(g)] }).catch((err) => logFail('lobby edit failed', err));
      } else if (emoji === ADD_OZZY && user.id === g.hostId) {
        if (!g.info.has(OZZY_ID)) {
          g.info.set(OZZY_ID, { avatar: g.client.user.displayAvatarURL({ extension: 'png', size: 256 }), username: 'Ozzy', name: 'Ozzy' });
          g.entries.push(OZZY_ID);
          if (g.mode === 'squad') addToSquads(g.squads, OZZY_ID);
          await message.edit({ embeds: [lobbyEmbed(g)] }).catch((err) => logFail('lobby edit failed', err));
        }
      } else if (emoji === START && user.id === g.hostId && g.entries.length >= MIN_PLAYERS) {
        await begin(g).catch((err) => crash(g, 'game failed to start', err));
      }
    }));

    collector.on('end', safe('lobby end failed', async () => {
      if (g.phase !== 'lobby' || current !== g) return;
      endGame(g);
      await g.channel.send({ embeds: [notice('** ⚠️ Timeout**', 'Hunger Games timed out due to inactivity!')] });
    }));
  } catch (err) {
    logFail('lobby failed to open', err);
    endGame(g);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Game steps
// ---------------------------------------------------------------------------

async function begin(g) {
  g.phase = 'playing';
  g.collectors.forEach((c) => c.stop('started'));
  const entry = (id) => ({ id, avatar: g.info.get(id).avatar });
  g.engine = g.mode === 'solo'
    ? createSoloGame(g.entries.map(entry))
    : createSquadGame(g.squads.map((s) => s.map(entry)));
  await postNext(g);
}

function controls(g, spec, { disabled = false } = {}) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hg:next:${g.id}:${g.step}`)
      .setLabel('Next')
      .setStyle(disabled ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(disabled),
  );
  if (spec.sponsor && !disabled) {
    row.addComponents(new ButtonBuilder()
      .setCustomId(`hg:sponsor:${g.id}:${g.step}`)
      .setLabel('Sponsor a tribute')
      .setEmoji('🪂')
      .setStyle(ButtonStyle.Secondary));
  }
  return row;
}

// ---------------------------------------------------------------------------
// Sponsor board: one public "Sponsors this round" message per sponsor window,
// posted on the first pick and edited in place after that. Every send/edit
// goes through board.chain so two quick picks can never post two boards. The
// embed is built when the update is queued, not when it runs: the next phase
// is played right after the window closes, and the board must show the votes
// as they stood, not who survived the next phase.
// ---------------------------------------------------------------------------

function openBoard() {
  return {
    votes: new Map(), message: null, chain: Promise.resolve(), closed: false, winnerId: null,
  };
}

function boardEmbed(g, board) {
  const lines = sponsorBoardLines(g.engine, board.votes);
  if (board.closed) {
    lines.push('', board.winnerId
      ? `**Sponsoring closed.** 🪂 <@${board.winnerId}> gets the gift!`
      : '**Sponsoring closed.** No gift this round.');
  }
  return new EmbedBuilder()
    .setTitle('🪂 Sponsors this round')
    .setDescription(lines.join('\n').slice(0, 4096))
    .setColor(COLOR);
}

function refreshBoard(g, board) {
  // Nothing to close out if nobody ever picked.
  if (board.closed && board.votes.size === 0) return board.chain;
  const payload = { embeds: [boardEmbed(g, board)] };
  board.chain = board.chain.then(async () => {
    if (board.message) await board.message.edit(payload);
    else board.message = await g.channel.send(payload);
  }).catch((err) => logFail('sponsor board update failed', err));
  return board.chain;
}

function notice(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0xff5733);
}

function clearTimers(g) {
  g.timers.forEach((t) => clearTimeout(t));
  g.timers = [];
}

function armTimers(g) {
  const step = g.step;
  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    t.unref?.(); // never keep a process (or a test run) alive on its own
    g.timers.push(t);
  };
  later(safe('step timeout failed', () => timeoutGame(g, step)), STEP_TIMEOUT_MS);
  if (g.autoAdvance) later(safe('auto-advance failed', () => advance(g, step)), g.autoAdvance * 1000);
}

/**
 * Move past step `expected`. Called by both the Next button and the
 * auto-advance timer; whichever arrives second finds the step already moved
 * on and does nothing. The check-and-increment runs before any await, so the
 * two can never both pass it.
 */
function advance(g, expected) {
  if (current !== g || g.ended || g.phase !== 'playing' || g.step !== expected) return false;
  g.step++;
  clearTimers(g);
  postNext(g).catch((err) => crash(g, 'advance failed', err));
  return true;
}

async function postNext(g) {
  if (g.lastMessage) {
    const { message, spec } = g.lastMessage;
    message.edit({ components: [controls(g, spec, { disabled: true })] }).catch((err) => logFail('disable buttons failed', err));
  }

  // Leaving the sponsor window: the most-backed tribute gets a gift, shown at
  // the top of the next phase.
  const giftLines = [];
  if (g.sponsorOpen) {
    g.sponsorOpen = false;
    const board = g.board;
    g.board = null;
    const tributeId = tallySponsor(g.engine, board.votes);
    const line = tributeId && applySponsorGift(g.engine, tributeId);
    if (line) giftLines.push(line);
    board.closed = true;
    board.winnerId = line ? tributeId : null;
    refreshBoard(g, board);
  }

  if (g.queue.length === 0) {
    if (g.engine.winnerIds) return finish(g);
    const result = g.mode === 'solo' ? playSoloPhase(g.engine) : playSquadPhase(g.engine);
    g.lastPhase = result.phase;
    g.round = result.round;
    g.kills.push(...result.kills);
    g.queue.push(...phaseSpecs(g.engine, result, giftLines));
  }

  const spec = g.queue.shift();
  const bodies = chunkLines(spec.lines, spec.separator);
  let message = null;
  for (let i = 0; i < bodies.length; i++) {
    const embed = new EmbedBuilder().setColor(spec.color || COLOR).setDescription(bodies[i] || '​');
    if (i === 0) embed.setTitle(spec.title);
    if (spec.footer && i === bodies.length - 1) embed.setFooter({ text: spec.footer });
    const last = i === bodies.length - 1;
    message = await g.channel.send({ embeds: [embed], components: last ? [controls(g, spec)] : [] });
  }
  g.lastMessage = { message, spec };
  if (spec.sponsor) {
    g.board = openBoard();
    g.sponsorOpen = true;
  }
  armTimers(g);
  return null;
}

async function finish(g) {
  const winners = g.engine.winnerIds;
  endGame(g);

  if (winners.length > 0) {
    const png = await renderWinnerCard(winners.map((id) => ({
      username: g.info.get(id)?.username || 'Unknown',
      avatarUrl: g.info.get(id)?.avatar || null,
    })));
    await g.channel.send({
      embeds: [new EmbedBuilder().setColor(COLOR).setImage('attachment://hg-winner.png')],
      files: [new AttachmentBuilder(png, { name: 'hg-winner.png' })],
    });
  } else {
    // The engine's no-wipe rule should make this unreachable.
    await g.channel.send({ embeds: [notice('**Hunger Games have ended!**', 'All tributes fell. Ozzy wins by default.')] });
  }

  try {
    await HungerGamesResult.create({
      key: g.id,
      mode: g.mode,
      winnerIds: winners,
      kills: killCounts(g.kills),
      endedAt: new Date(),
      source: 'live',
    });
  } catch (err) {
    logFail('saving result failed', err);
  }
}

function endGame(g) {
  g.ended = true;
  g.phase = 'ended';
  clearTimers(g);
  g.collectors.forEach((c) => { if (!c.ended) c.stop('ended'); });
  if (current === g) current = null;
}

async function timeoutGame(g, step) {
  if (current !== g || g.ended || g.step !== step) return;
  endGame(g);
  if (g.lastMessage) {
    g.lastMessage.message.edit({ components: [controls(g, g.lastMessage.spec, { disabled: true })] }).catch((err) => logFail('disable buttons failed', err));
  }
  await g.channel.send({ embeds: [notice('** ⚠️ Timeout**', 'Hunger Games timed out due to inactivity!')] });
}

function crash(g, context, err) {
  logFail(context, err);
  if (g.ended) return;
  endGame(g);
  g.channel.send({ embeds: [notice('**Hunger Games Crashed**', 'Please report it to <@532991839238750243> or <@699314950270877758>.')] })
    .catch((sendErr) => logFail('crash notice failed', sendErr));
}

// ---------------------------------------------------------------------------
// Buttons and menus (routed from events/hgInteractions.js)
// customIds: hg:next:<gameId>:<step>, hg:sponsor:<gameId>:<step>,
//            hg:vote:<gameId>:<step>:<page>
// ---------------------------------------------------------------------------

async function handleComponent(interaction) {
  const [, kind, gameId, stepRaw] = interaction.customId.split(':');
  const step = Number(stepRaw);
  const g = current;
  if (!g || g.id !== gameId || g.ended) {
    return interaction.reply({ content: 'This game is no longer running.', ...ephemeral });
  }

  if (kind === 'next') {
    if (interaction.user.id !== g.hostId) {
      return interaction.reply({ content: 'Only the host can advance the game.', ...ephemeral });
    }
    await interaction.deferUpdate();
    advance(g, step);
    return null;
  }

  const windowOpen = g.sponsorOpen && step === g.step;

  if (kind === 'sponsor') {
    if (!windowOpen) return interaction.reply({ content: 'Sponsoring for this round is closed.', ...ephemeral });
    if (!canSponsor(g.engine, interaction.user.id)) {
      return interaction.reply({ content: "Living tributes can't sponsor. Once you fall, you can back someone.", ...ephemeral });
    }
    const alive = g.engine.players.filter((p) => p.alive);
    const mine = g.board.votes.get(interaction.user.id);
    const rows = [];
    for (let page = 0; page * 25 < alive.length && page < 5; page++) {
      const slice = alive.slice(page * 25, page * 25 + 25);
      rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId(`hg:vote:${g.id}:${g.step}:${page}`)
        .setPlaceholder(alive.length > 25 ? `Tributes ${page * 25 + 1} to ${page * 25 + slice.length}` : 'Pick a tribute to sponsor')
        .addOptions(slice.map((p) => ({
          label: nameOf(g, p.id).slice(0, 100),
          description: giftCount(g.engine, p.id) > 0
            ? `${p.health} HP, ${giftCount(g.engine, p.id)} gift${giftCount(g.engine, p.id) === 1 ? '' : 's'}`
            : `${p.health} HP`,
          value: p.id,
          default: p.id === mine,
        })))));
    }
    return interaction.reply({
      content: 'Back one tribute. Your pick shows up publicly on the Sponsors message, and the most-backed tribute gets a gift when the game moves on. You can change your pick until then.',
      components: rows,
      ...ephemeral,
    });
  }

  if (kind === 'vote') {
    if (!windowOpen) return interaction.update({ content: 'Sponsoring for this round is closed.', components: [] });
    if (!canSponsor(g.engine, interaction.user.id)) return interaction.update({ content: "Living tributes can't sponsor.", components: [] });
    const board = g.board;
    board.votes.set(interaction.user.id, interaction.values[0]);
    const posted = refreshBoard(g, board);
    // The pick is shown on the public board; the private dropdown just goes away.
    try {
      await interaction.deferUpdate();
      await interaction.deleteReply();
    } catch (err) {
      logFail('closing sponsor menu failed', err);
      await interaction.editReply({ content: '🪂 Saved, see the Sponsors message. Press Sponsor again to change your pick.', components: [] })
        .catch((editErr) => logFail('sponsor menu fallback failed', editErr));
    }
    await posted;
    return null;
  }
  return null;
}

module.exports = { startLobby, handleComponent, isHost };
