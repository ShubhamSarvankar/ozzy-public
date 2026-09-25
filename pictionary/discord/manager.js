const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');
const { nextSeq } = require('../../models/counterSchema');
const Game = require('../store/game');
const Turn = require('../store/turn');
const { loadWords, getWord, snapshotWord } = require('../engine/vocabulary');
const { isCorrectGuess } = require('../engine/guess');
const { checkClue } = require('../engine/clueRules');
const { checkNearMiss } = require('../engine/nearMiss');
const { pointsForTurn, standings, podium } = require('../engine/scoring');
const { pickWord, exposureTimes, rotateCategory, DAY_MS } = require('../engine/wordPicker');
const { tally, finalResult } = require('../engine/veto');
const { aggregate } = require('../engine/stats');
const {
  rulesText, wordRevealText, resultText, standingsLines, formatSolve, clueMirrorText, nearMissText,
} = require('../engine/format');
const {
  isLiveStatus, msFromNow, remainingMs, resumeDeadline, isLastTurn, wordFromTurn,
} = require('../engine/state');

// Single owner of Pictionary game state. Every transition writes Mongo first and rebuilds
// timers from the stored deadline, so a restart resumes cleanly. Transitions for one game
// are serialized through withLock, and nothing may throw out of a handler (index.js exits
// the process on an unhandled rejection).

const cfg = () => config.pictionary;
const REG_EMOJI = '🎨';
const COLOR = 0xe67e22;
const LAST_TURN_GRACE_MS = 30 * 1000; // window for a final veto or End Game before results auto publish
const SWEEP_MS = 2 * 60 * 1000;

let client = null;
const locks = new Map();          // gameId -> promise tail
const phaseTimers = new Map();    // gameId -> Timeout for the game's single live deadline
const vetoTimers = new Map();     // turnId -> Timeout
const activeTurns = new Map();    // gameId -> live turn state (in memory, rebuilt from Mongo)
const activeByChannel = new Map();// channelId -> same state, for the hot message path
const registrationMsgs = new Map();// messageId -> gameId

// ---------- helpers ----------

function withLock(key, fn) {
  const k = String(key);
  const prev = locks.get(k) || Promise.resolve();
  const run = prev.then(fn);
  const tail = run.catch(() => {});
  locks.set(k, tail);
  tail.then(() => { if (locks.get(k) === tail) locks.delete(k); });
  return run;
}

const oid = (v) => (v ? String(v) : null);
const embed = () => new EmbedBuilder().setColor(COLOR);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function isHost(interaction) {
  const roles = interaction.member?.roles;
  if (!roles) return false;
  if (roles.cache) return roles.cache.has(cfg().hostRoleId);
  return Array.isArray(roles) && roles.includes(cfg().hostRoleId);
}

async function getChannel(id) {
  try { return await client.channels.fetch(id); } catch { return null; }
}

async function say(channel, payload) {
  try { return await channel.send(payload); } catch (err) {
    console.error('[pictionary] send failed:', err.message);
    return null;
  }
}

async function editMessage(channelId, messageId, payload) {
  if (!messageId) return;
  try {
    const ch = await getChannel(channelId);
    const msg = await ch?.messages.fetch(messageId);
    await msg?.edit(payload);
  } catch { /* message gone, nothing to do */ }
}

function setPhaseTimer(game) {
  clearPhaseTimer(game._id);
  if (!game.deadlineAt || !isLiveStatus(game.status)) return;
  const delay = Math.max(0, new Date(game.deadlineAt).getTime() - Date.now());
  const id = String(game._id);
  phaseTimers.set(id, setTimeout(() => onPhaseDeadline(id), delay));
}

function clearPhaseTimer(gameId) {
  const id = String(gameId);
  if (phaseTimers.has(id)) { clearTimeout(phaseTimers.get(id)); phaseTimers.delete(id); }
}

async function onPhaseDeadline(gameId) {
  phaseTimers.delete(gameId);
  try {
    const game = await Game.findById(gameId);
    if (!game || !game.open) return;
    if (game.deadlineAt && new Date(game.deadlineAt).getTime() > Date.now() + 100) return setPhaseTimer(game);
    if (game.status === 'registering') await withLock(gameId, () => closeRegistration(gameId));
    else if (game.status === 'ready_check') await withLock(gameId, () => readyTimeout(gameId));
    else if (game.status === 'starting') await withLock(gameId, () => startTurnLive(gameId));
    else if (game.status === 'active') await endTurn(gameId, { status: 'timeout' });
    else if (game.status === 'between') await withLock(gameId, () => advance(gameId));
  } catch (err) {
    console.error('[pictionary] phase deadline failed:', err);
  }
}

// ---------- muting ----------

async function muteUser(channelId, userId) {
  const ch = await getChannel(channelId);
  if (!ch?.permissionOverwrites) return false;
  try {
    await ch.permissionOverwrites.edit(userId, { SendMessages: false }, { reason: 'Pictionary: actor used all clue messages' });
    return true;
  } catch (err) {
    console.error('[pictionary] mute failed (does the bot have Manage Permissions?):', err.message);
    return false;
  }
}

/** Removes the mute. Returns true when the user is definitely unmuted. */
async function unmuteUser(channelId, userId) {
  const ch = await getChannel(channelId);
  if (!ch?.permissionOverwrites) return true; // channel gone, nothing to unmute
  try {
    const existing = ch.permissionOverwrites.cache.get(userId);
    if (!existing) return true;
    await ch.permissionOverwrites.edit(userId, { SendMessages: null }, { reason: 'Pictionary: turn ended' });
    const after = ch.permissionOverwrites.cache.get(userId);
    if (after && after.allow.bitfield === 0n && after.deny.bitfield === 0n) await after.delete('Pictionary: cleanup');
    return true;
  } catch (err) {
    console.error('[pictionary] unmute failed, will retry in sweep:', err.message);
    return false;
  }
}

async function clearMute(game) {
  if (!game.mutedUserId) return;
  const ok = await unmuteUser(game.channelId, game.mutedUserId);
  if (ok) {
    await Game.updateOne({ _id: game._id }, { $set: { mutedUserId: null } });
    game.mutedUserId = null;
  }
}

// ---------- start and registration ----------

async function startGame(interaction, { rounds, seconds, nearMissHints }) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = await getChannel(cfg().channelId);
  if (!channel?.isTextBased()) return interaction.editReply('I could not find the game channel.');

  const me = channel.guild.members.me;
  const perms = channel.permissionsFor(me);
  const need = [
    ['ViewChannel', PermissionFlagsBits.ViewChannel], ['SendMessages', PermissionFlagsBits.SendMessages],
    ['EmbedLinks', PermissionFlagsBits.EmbedLinks], ['AddReactions', PermissionFlagsBits.AddReactions],
    ['ReadMessageHistory', PermissionFlagsBits.ReadMessageHistory],
  ].filter(([, flag]) => !perms.has(flag)).map(([n]) => n);
  if (need.length) return interaction.editReply(`I am missing permissions in <#${channel.id}>: ${need.join(', ')}.`);
  if (!loadWords().length) return interaction.editReply('The word list is empty, so there is nothing to play.');

  let game;
  try {
    const seq = await nextSeq('pictionary');
    game = await Game.create({
      guildId: channel.guild.id, channelId: channel.id, hostId: interaction.user.id,
      shortId: `PIC-${seq}`, totalRounds: rounds, turnSeconds: seconds,
      nearMissHints: nearMissHints !== false,
    });
  } catch (err) {
    if (err?.code === 11000) return interaction.editReply('A Pictionary game is already running.');
    throw err;
  }

  const warn = perms.has(PermissionFlagsBits.ManageRoles)
    ? ''
    : '\nWarning: I lack Manage Permissions in the channel, so I cannot mute Actors after their last clue. Extra messages will be deleted if I can.';
  await interaction.editReply(`Game ${game.shortId} created in <#${channel.id}>: ${rounds} round${rounds > 1 ? 's' : ''}, ${seconds}s turns, near-miss hints ${game.nearMissHints ? 'on' : 'off'}.${warn}`);
  await withLock(game._id, () => openRegistration(game._id, 1));
}

async function openRegistration(gameId, round) {
  const game = await Game.findById(gameId);
  if (!game || !game.open) return;
  const deadline = new Date(msFromNow(Date.now(), cfg().registrationSeconds));
  await Game.updateOne({ _id: gameId }, {
    $set: {
      status: 'registering', currentRound: round, currentTurnIndex: 0, deadlineAt: deadline,
      registrants: [], roundOrder: [], roundRegistrants: [], registrationMessageId: null, currentTurnId: null,
      roundCommunityWordUsed: false,
    },
  });
  const channel = await getChannel(game.channelId);
  if (!channel) return cancelGame(game, 'The game channel is gone.');

  const e = embed()
    .setTitle(`Pictionary, Round ${round} of ${game.totalRounds}`)
    .setDescription([
      `React with ${REG_EMOJI} to **act** this round. You get a DM with the rules right away.`,
      'Anyone can guess, registered or not. You must re-register every round.',
      '',
      `Turn length: **${game.turnSeconds}s**. Registration closes <t:${Math.floor(deadline.getTime() / 1000)}:R>.`,
    ].join('\n'));
  if (round > 1) {
    const turns = await Turn.find({ gameId }).lean();
    const rows = standings(turns, game.participants);
    if (rows.length) e.addFields({ name: 'Standings so far', value: standingsLines(rows).slice(0, 1024) });
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pict:start:${gameId}`).setLabel('Start now (Host)').setStyle(ButtonStyle.Primary),
  );
  const msg = await say(channel, { embeds: [e], components: [row] });
  if (!msg) return cancelGame(game, 'I could not post in the game channel.');
  await msg.react(REG_EMOJI).catch(() => {});
  registrationMsgs.set(msg.id, String(gameId));
  const fresh = await Game.findByIdAndUpdate(gameId, { $set: { registrationMessageId: msg.id } }, { new: true });
  setPhaseTimer(fresh);
}

async function handleReactionAdd(reaction, user) {
  const gameId = registrationMsgs.get(reaction.message.id);
  if (!gameId || reaction.emoji.name !== REG_EMOJI || user.bot) return;
  const game = await Game.findById(gameId);
  if (!game || game.status !== 'registering') return;
  if (game.afkRemoved.some((r) => r.round === game.currentRound && r.userId === user.id)) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }
  const res = await Game.updateOne(
    { _id: gameId, status: 'registering', registrants: { $ne: user.id } },
    { $addToSet: { registrants: user.id, participants: user.id } },
  );
  if (!res.modifiedCount) return;
  try {
    await user.send({ embeds: [embed().setTitle('Pictionary actor rules').setDescription(rulesText({ maxClues: cfg().maxClues, readySeconds: cfg().readySeconds, turnStartBufferSeconds: cfg().turnStartBufferSeconds }))] });
  } catch {
    const ch = await getChannel(game.channelId);
    if (ch) {
      const note = await say(ch, { content: `<@${user.id}> I could not DM you. Open your DMs for this server so you can receive rules reminders.`, allowedMentions: { users: [user.id] } });
      setTimeout(() => note?.delete().catch(() => {}), 15000);
    }
  }
}

async function handleReactionRemove(reaction, user) {
  const gameId = registrationMsgs.get(reaction.message.id);
  if (!gameId || reaction.emoji.name !== REG_EMOJI || user.bot) return;
  // Withdrawing removes the turn but keeps them as a participant if they had already reacted.
  await Game.updateOne({ _id: gameId, status: 'registering' }, { $pull: { registrants: user.id } });
}

async function closeRegistration(gameId) {
  const game = await Game.findById(gameId);
  if (!game || !game.open || game.status !== 'registering') return;
  clearPhaseTimer(gameId);
  if (game.registrationMessageId) registrationMsgs.delete(game.registrationMessageId);
  await editMessage(game.channelId, game.registrationMessageId, { components: [] });

  const removed = new Set(game.afkRemoved.filter((r) => r.round === game.currentRound).map((r) => r.userId));
  const eligible = game.registrants.filter((id) => !removed.has(id));
  const channel = await getChannel(game.channelId);
  if (!eligible.length) {
    if (channel) await say(channel, { embeds: [embed().setDescription(`Nobody registered for round ${game.currentRound}.`)] });
    await Game.updateOne({ _id: gameId }, { $set: { status: 'between', deadlineAt: null, roundOrder: [], roundRegistrants: [] } });
    return advance(gameId);
  }
  const order = shuffle(eligible);
  await Game.updateOne({ _id: gameId }, {
    $set: {
      status: 'between', deadlineAt: null, roundOrder: order, roundRegistrants: eligible, currentTurnIndex: 0, roundCommunityWordUsed: false,
    },
  });
  if (channel) {
    await say(channel, {
      embeds: [embed().setTitle(`Round ${game.currentRound} begins`).setDescription(`Turn order:\n${order.map((id, i) => `${i + 1}. <@${id}>`).join('\n')}`)],
    });
  }
  return advance(gameId);
}

// ---------- turn flow ----------

/** Lock held. Starts the next Actor's prompt, or moves on to the next round or the end. */
async function advance(gameId) {
  let game = await Game.findById(gameId);
  if (!game || !game.open || game.status !== 'between' || game.vetoPendingTurnId) return;
  clearPhaseTimer(gameId);
  await editMessage(game.channelId, game.panelMessageId, { components: [] });
  await Game.updateOne({ _id: gameId }, { $set: { panelMessageId: null, deadlineAt: null } });

  let idx = game.currentTurnIndex;
  while (idx < game.roundOrder.length) {
    const result = await startTurnPrompt(game, game.roundOrder[idx], idx);
    if (result === 'prompted' || result === 'abort') return;
    idx += 1; // skipped, the turn never started
    await Game.updateOne({ _id: gameId }, { $set: { currentTurnIndex: idx } });
    game = await Game.findById(gameId);
  }
  if (game.currentRound >= game.totalRounds) return finishGame(gameId);
  return openRegistration(gameId, game.currentRound + 1);
}

/** `idx` is the turn's position within the current round's roundOrder, passed explicitly
 * by the caller rather than read back off game.currentTurnIndex, so the category-rotation
 * seed can't silently desync from the actual turn position if a future caller updates
 * roundOrder/currentTurnIndex differently. */
async function pickTurnWord(game, idx) {
  const cooldownDays = cfg().wordCooldownDays;
  const history = await Turn.find({ startedAt: { $gte: new Date(Date.now() - cooldownDays * DAY_MS) } })
    .select('wordId startedAt endedAt').lean();
  const exposure = exposureTimes(history);
  const words = loadWords();
  const categories = [...new Set(words.map((w) => w.category))];

  const wantCommunity = !game.roundCommunityWordUsed;
  const category = wantCommunity ? null : rotateCategory(categories, game.currentRound * 97 + idx);
  let word = pickWord(words, {
    exposure, cooldownDays, excludeIds: game.usedWordIds, preferSource: wantCommunity ? 'community' : null, category,
  });
  if (!word) word = pickWord(words, { exposure, cooldownDays, excludeIds: game.usedWordIds });
  return word;
}

async function startTurnPrompt(game, actorId, idx) {
  const channel = await getChannel(game.channelId);
  if (!channel) { await cancelGame(game, 'The game channel is gone.'); return 'abort'; }

  const word = await pickTurnWord(game, idx);
  if (!word) { await cancelGame(game, 'The word list is empty.'); return 'abort'; }

  const turn = await Turn.create({
    gameId: game._id, round: game.currentRound, turnIndex: idx, actorId, wordId: word.id, tier: word.tier,
    wordVersion: snapshotWord(word),
  });
  await Game.updateOne({ _id: game._id }, { $addToSet: { usedWordIds: word.id }, $set: { currentTurnIndex: idx } });

  const deadline = new Date(msFromNow(Date.now(), cfg().readySeconds));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pict:show:${turn._id}`).setLabel('Show my word & Ready').setStyle(ButtonStyle.Success),
  );
  const msg = await say(channel, {
    content: `<@${actorId}>`,
    allowedMentions: { users: [actorId] },
    embeds: [embed().setTitle('Your turn to act').setDescription(`Press **Show my word & Ready** <t:${Math.floor(deadline.getTime() / 1000)}:R> to see your word (only you will see it) and start your turn.`)],
    components: [row],
  });
  if (!msg) {
    await Turn.updateOne({ _id: turn._id }, { $set: { status: 'not_started', notStartedReason: 'recovery', endedAt: new Date() } });
    return 'skipped';
  }
  // Only claim the round's guaranteed community-word slot once the Actor was actually
  // shown a chance to play it - a send failure here must not silently forfeit the round's
  // community word (the next turn should still get a shot at it).
  const set = {
    status: 'ready_check', currentTurnId: turn._id, readyMessageId: msg.id, deadlineAt: deadline,
  };
  if (word.source === 'community') set.roundCommunityWordUsed = true;
  const fresh = await Game.findByIdAndUpdate(game._id, { $set: set }, { new: true });
  setPhaseTimer(fresh);
  return 'prompted';
}

async function readyTimeout(gameId) {
  const game = await Game.findById(gameId);
  if (!game || !game.open || game.status !== 'ready_check') return;
  const turn = await Turn.findOneAndUpdate(
    { _id: game.currentTurnId, status: 'pending' },
    { $set: { status: 'not_started', notStartedReason: 'no_ready', endedAt: new Date() } },
    { new: true },
  );
  if (!turn) return;
  await editMessage(game.channelId, game.readyMessageId, {
    content: '',
    embeds: [embed().setDescription(`<@${turn.actorId}> did not press Show my word & Ready in time. Their turn is skipped.`)],
    components: [],
  });
  await Game.updateOne({ _id: gameId }, { $set: { status: 'between', currentTurnIndex: turn.turnIndex + 1, currentTurnId: null, deadlineAt: null } });
  return advance(gameId);
}

function buildState(game, turn, word) {
  return {
    gameId: String(game._id),
    turnId: String(turn._id),
    channelId: game.channelId,
    actorId: turn.actorId,
    turnIndex: turn.turnIndex,
    word,
    clueCount: turn.clueCount,
    clueIds: new Set(turn.clueMessageIds),
    clueSnapshots: [...(turn.clueSnapshots || [])],
    clueEmbedMessageId: game.clueEmbedMessageId || null,
    nearMissHints: game.nearMissHints !== false,
    editStamps: new Map(),
    muted: turn.clueCount >= cfg().maxClues,
    ending: false,
    chain: Promise.resolve(),
  };
}

function registerState(st) {
  activeTurns.set(st.gameId, st);
  activeByChannel.set(st.channelId, st);
}

function claimTurn(gameId) {
  const st = activeTurns.get(String(gameId));
  if (!st || st.ending) return null;
  st.ending = true;
  activeTurns.delete(st.gameId);
  activeByChannel.delete(st.channelId);
  return st;
}

/** The Actor presses "Show my word & Ready": ephemeral reveal, starts the fixed reading buffer. */
async function handleShowWordAndReady(interaction) {
  const turnId = interaction.customId.split(':')[2];
  const turnDoc = await Turn.findById(turnId).select('gameId').lean();
  if (!turnDoc) return interaction.reply({ content: 'That turn no longer exists.', flags: MessageFlags.Ephemeral });
  return withLock(turnDoc.gameId, async () => {
    const game = await Game.findById(turnDoc.gameId);
    const turn = await Turn.findById(turnId);
    if (!game || !turn) return interaction.reply({ content: 'That turn no longer exists.', flags: MessageFlags.Ephemeral });
    if (interaction.user.id !== turn.actorId) return interaction.reply({ content: 'Only the Actor can press this.', flags: MessageFlags.Ephemeral });
    if (game.status === 'paused') return interaction.reply({ content: 'The game is paused.', flags: MessageFlags.Ephemeral });
    if (game.status !== 'ready_check' || oid(game.currentTurnId) !== turnId || turn.status !== 'pending') {
      return interaction.reply({ content: 'This turn is no longer waiting for Ready.', flags: MessageFlags.Ephemeral });
    }
    const word = getWord(turn.wordId) || wordFromTurn(turn);
    if (!word) return interaction.reply({ content: 'That word is no longer in the word list. Ask the Host to skip.', flags: MessageFlags.Ephemeral });

    const now = new Date();
    const claimed = await Turn.updateOne({ _id: turnId, status: 'pending' }, { $set: { status: 'active', revealedAt: now } });
    if (!claimed.modifiedCount) return interaction.reply({ content: 'This turn is no longer waiting for Ready.', flags: MessageFlags.Ephemeral });

    const deadline = new Date(msFromNow(now.getTime(), cfg().turnStartBufferSeconds));
    const fresh = await Game.findByIdAndUpdate(game._id, { $set: { status: 'starting', deadlineAt: deadline } }, { new: true });
    setPhaseTimer(fresh);

    await interaction.reply({ content: wordRevealText(word, { turnStartBufferSeconds: cfg().turnStartBufferSeconds }), flags: MessageFlags.Ephemeral });
    await editMessage(game.channelId, game.readyMessageId, {
      content: '',
      embeds: [embed().setTitle('Reading their word...').setDescription(`<@${turn.actorId}> is reading their word. The turn starts <t:${Math.floor(deadline.getTime() / 1000)}:R>.`)],
      components: [],
    });
  });
}

/** Lock held. The fixed reading buffer elapsed: the turn actually goes live. */
async function startTurnLive(gameId) {
  const game = await Game.findById(gameId);
  if (!game || !game.open || game.status !== 'starting') return;
  const turn = await Turn.findById(game.currentTurnId);
  const word = turn && (getWord(turn.wordId) || wordFromTurn(turn));
  if (!turn || !word) {
    if (turn) await Turn.updateOne({ _id: turn._id }, { $set: { status: 'terminated', annulled: true, annulReason: 'host', endedAt: new Date() } });
    await Game.updateOne({ _id: gameId }, { $set: { status: 'between', currentTurnIndex: (turn?.turnIndex ?? game.currentTurnIndex) + 1, currentTurnId: null, deadlineAt: new Date() } });
    return onPhaseDeadline(String(gameId));
  }

  const now = new Date();
  const deadline = new Date(msFromNow(now.getTime(), game.turnSeconds));
  await Turn.updateOne({ _id: turn._id }, { $set: { startedAt: now } });
  turn.startedAt = now;

  const channel = await getChannel(game.channelId);
  const msg = channel ? await say(channel, {
    embeds: [embed().setTitle('Turn started').setDescription([
      `<@${turn.actorId}> is describing a word. You have **${cfg().maxClues} messages**.`,
      `Everyone else, guess in chat. Time is up <t:${Math.floor(deadline.getTime() / 1000)}:R>.`,
    ].join('\n'))],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pict:ctl:${gameId}:pause`).setLabel('Pause (Host)').setStyle(ButtonStyle.Secondary),
    )],
  }) : null;
  const clueMsg = channel ? await say(channel, { embeds: [embed().setTitle('Clues so far').setDescription(clueMirrorText([]))] }) : null;

  const fresh = await Game.findByIdAndUpdate(gameId, {
    $set: {
      status: 'active', deadlineAt: deadline, readyMessageId: msg?.id || null, clueEmbedMessageId: clueMsg?.id || null,
    },
  }, { new: true });
  registerState(buildState(fresh, turn, word));
  setPhaseTimer(fresh);
}

// ---------- live chat handling ----------

function persistClues(st) {
  const payload = { clueCount: st.clueCount, clueMessageIds: [...st.clueIds], clueSnapshots: st.clueSnapshots };
  st.chain = st.chain.then(() => Turn.updateOne({ _id: st.turnId }, { $set: payload })).catch((err) => console.error('[pictionary] persist clues failed:', err));
}

function refreshClueEmbed(st) {
  if (!st.clueEmbedMessageId) return;
  editMessage(st.channelId, st.clueEmbedMessageId, { embeds: [embed().setTitle('Clues so far').setDescription(clueMirrorText(st.clueSnapshots))] }).catch(() => {});
}

async function announceMute(st, message) {
  const notice = 'You used all your clue messages. You are muted in the channel until this turn ends.';
  try {
    const user = await client.users.fetch(st.actorId);
    await user.send(notice).catch(() => {});
  } catch { /* DM closed */ }
  if (message) {
    const reply = await message.reply({ content: `<@${st.actorId}> ${notice}`, allowedMentions: { repliedUser: false, users: [] } }).catch(() => null);
    setTimeout(() => reply?.delete().catch(() => {}), 10000);
  }
}

async function applyMute(st, message) {
  if (st.muted) return;
  st.muted = true;
  // finishTurn awaits this promise so an unmute can never run before an in-flight mute lands.
  st.mutePromise = (async () => {
    await Game.updateOne({ _id: st.gameId }, { $set: { mutedUserId: st.actorId } });
    await muteUser(st.channelId, st.actorId);
  })().catch((err) => console.error('[pictionary] mute failed:', err));
  await st.mutePromise;
  await announceMute(st, message);
}

/** DMs a deterministic, answer-preserving near-miss hint. Never awaited by the caller's critical path. */
async function sendNearMissHint(userId, guessRaw, result) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(nearMissText(guessRaw, result));
  } catch { /* DM closed, nothing to do */ }
}

async function handleMessage(message) {
  if (message.author?.bot || message.system) return;
  const st = activeByChannel.get(message.channelId);
  if (!st || st.ending) return;

  if (message.author.id !== st.actorId) {
    if (isCorrectGuess(message.content, st.word)) {
      await endTurn(st.gameId, { status: 'guessed', guesserId: message.author.id, messageId: message.id });
      return;
    }
    if (st.nearMissHints) {
      const near = checkNearMiss(message.content, st.word);
      if (near) sendNearMissHint(message.author.id, message.content, near).catch(() => {});
    }
    return;
  }

  if (st.clueCount >= cfg().maxClues) {
    // Mute failed or is lagging: extra clues are simply removed.
    await message.delete().catch(() => {});
    return;
  }
  st.clueCount += 1;
  st.clueIds.add(message.id);
  st.clueSnapshots.push({
    messageId: message.id, content: message.content || '', postedAt: new Date(), editedAt: null, deletedAt: null,
  });
  persistClues(st);
  refreshClueEmbed(st);
  const violation = checkClue(message, st.word);
  if (violation) return endTurn(st.gameId, { status: 'violation', violation: { ...violation, messageId: message.id } });
  if (st.clueCount >= cfg().maxClues) await applyMute(st, message);
}

async function handleMessageEdit(oldMessage, newMessage) {
  const st = activeByChannel.get(newMessage.channelId);
  if (!st || st.ending) return;
  let msg = newMessage;
  if (msg.partial) msg = await msg.fetch().catch(() => null);
  if (!msg || msg.author?.id !== st.actorId || !st.clueIds.has(msg.id)) return;

  // Embed unfurls also fire messageUpdate. A real edit changes editedTimestamp.
  const stamp = msg.editedTimestamp;
  if (!stamp || st.editStamps.get(msg.id) === stamp) return;
  st.editStamps.set(msg.id, stamp);

  const snap = st.clueSnapshots.find((c) => c.messageId === msg.id);
  if (snap) { snap.content = msg.content || ''; snap.editedAt = new Date(); }

  // An edit consumes another clue slot (up to the cap) and is always re-checked.
  if (st.clueCount < cfg().maxClues) st.clueCount += 1;
  persistClues(st);
  refreshClueEmbed(st);
  const violation = checkClue(msg, st.word);
  if (violation) return endTurn(st.gameId, { status: 'violation', violation: { ...violation, messageId: msg.id } });
  if (st.clueCount >= cfg().maxClues) await applyMute(st, null);
}

/** A deleted clue still counts toward the cap; its content is preserved for veto review. */
async function handleMessageDelete(message) {
  const st = activeByChannel.get(message.channelId);
  if (!st || st.ending) return;
  if (!st.clueIds.has(message.id)) return;
  const snap = st.clueSnapshots.find((c) => c.messageId === message.id);
  if (snap && !snap.deletedAt) snap.deletedAt = new Date();
  persistClues(st);
  refreshClueEmbed(st);
}

/** Public entry: resolves the live turn exactly once, whichever trigger gets here first. */
async function endTurn(gameId, outcome) {
  const st = claimTurn(gameId);
  if (!st) return false;
  clearPhaseTimer(gameId);
  await withLock(gameId, () => finishTurn(st, outcome));
  return true;
}

function controlRow(gameId, turn, { last }) {
  const vetoable = turn.status === 'guessed' || turn.status === 'timeout';
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pict:ctl:${gameId}:next`).setLabel(last ? 'Publish results' : 'Next turn').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`pict:ctl:${gameId}:pause`).setLabel('Pause').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`pict:ctl:${gameId}:end`).setLabel('End game').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`pict:ctl:${gameId}:veto`).setLabel('Veto').setStyle(ButtonStyle.Secondary).setDisabled(!vetoable),
  );
}

/** Lock held, state already claimed. */
async function finishTurn(st, outcome) {
  const game = await Game.findById(st.gameId);
  const now = new Date();
  await st.chain.catch(() => {});
  const set = {
    status: outcome.status, endedAt: now, clueCount: st.clueCount, clueMessageIds: [...st.clueIds], clueSnapshots: st.clueSnapshots,
  };
  const startedAt = (await Turn.findById(st.turnId).select('startedAt').lean())?.startedAt;
  const guesserId = outcome.status === 'guessed' ? outcome.guesserId : null;
  if (outcome.status === 'guessed') {
    const pts = pointsForTurn({ status: 'guessed', tier: st.word.tier });
    Object.assign(set, {
      guesserId, guessMessageId: outcome.messageId || null, solveMs: startedAt ? now - startedAt : null,
      pointsActor: pts.actor, pointsGuesser: pts.guesser,
    });
  } else if (outcome.status === 'violation') {
    Object.assign(set, {
      annulled: true, annulReason: 'violation',
      violation: { type: outcome.violation.type, detail: outcome.violation.detail, messageId: outcome.violation.messageId },
    });
  } else if (outcome.status === 'terminated') {
    Object.assign(set, { annulled: true, annulReason: 'host' });
  }
  const turn = await Turn.findByIdAndUpdate(st.turnId, { $set: set }, { new: true }).lean();

  await st.mutePromise;
  const latest = await Game.findById(st.gameId);
  if (latest) await clearMute(latest);
  if (!game || !game.open) return;

  const nextIndex = st.turnIndex + 1;
  const lastTurn = isLastTurn(game, st.turnIndex);
  const update = {
    $set: { status: 'between', currentTurnIndex: nextIndex, currentTurnId: null, lastTurnId: turn._id },
  };
  if (guesserId) update.$addToSet = { participants: guesserId };
  if (!outcome.noAdvance) update.$set.deadlineAt = new Date(msFromNow(Date.now(), lastTurn ? LAST_TURN_GRACE_MS / 1000 : cfg().autoAdvanceSeconds));
  else update.$set.deadlineAt = null;
  const fresh = await Game.findByIdAndUpdate(st.gameId, update, { new: true });

  // Strips the Pause button off the "Turn started" message now that the turn is over.
  await editMessage(game.channelId, game.readyMessageId, { components: [] });
  if (outcome.silent) return;

  const channel = await getChannel(game.channelId);
  if (!channel) return;
  const footer = lastTurn
    ? 'That was the final turn. Results publish shortly, and the Host can still veto.'
    : `Next turn in ${cfg().autoAdvanceSeconds}s.`;
  const msg = await say(channel, {
    embeds: [embed().setTitle('Turn over').setDescription(resultText(turn, st.word)).setFooter({ text: footer })],
    components: [controlRow(st.gameId, turn, { last: lastTurn })],
  });
  if (msg) await Game.updateOne({ _id: st.gameId }, { $set: { panelMessageId: msg.id } });
  if (!outcome.noAdvance) setPhaseTimer(fresh);
}

// ---------- Host controls ----------

async function handleControl(interaction) {
  const [, , gameId, action] = interaction.customId.split(':');
  if (!isHost(interaction)) return interaction.reply({ content: 'Only the Host can use these controls.', flags: MessageFlags.Ephemeral });
  if (action === 'veto') return startVeto(interaction, gameId);
  if (action === 'next') {
    await interaction.deferUpdate();
    return withLock(gameId, async () => {
      const game = await Game.findById(gameId);
      if (!game || game.status !== 'between') return;
      await advance(gameId);
    });
  }
  const message = action === 'pause' ? await pauseGame(gameId) : action === 'end' ? await endGame(gameId) : 'Unknown control.';
  if (message) return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
  return interaction.deferUpdate().catch(() => {});
}

async function handleStartNow(interaction) {
  if (!isHost(interaction)) return interaction.reply({ content: 'Only the Host can start the round early.', flags: MessageFlags.Ephemeral });
  await interaction.deferUpdate();
  const gameId = interaction.customId.split(':')[2];
  return withLock(gameId, () => closeRegistration(gameId));
}

async function currentOpenGame(guildId) {
  return Game.findOne({ guildId, open: true });
}

/** Returns an error string, or null on success. */
async function pauseGame(gameId) {
  return withLock(gameId, async () => {
    const game = await Game.findById(gameId);
    if (!game || !game.open) return 'There is no running game.';
    if (game.status === 'paused') return 'The game is already paused.';
    if (!isLiveStatus(game.status)) return 'The game cannot be paused right now.';
    const remaining = remainingMs(game.deadlineAt, Date.now());
    if (game.status === 'active') {
      const st = activeTurns.get(String(gameId));
      if (st) {
        await st.chain.catch(() => {});
        activeTurns.delete(String(gameId));
        activeByChannel.delete(st.channelId);
      }
    }
    clearPhaseTimer(gameId);
    await Game.updateOne({ _id: gameId }, { $set: { status: 'paused', deadlineAt: null, pausedFrom: { status: game.status, remainingMs: remaining } } });
    const channel = await getChannel(game.channelId);
    if (channel) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pict:resume:${gameId}`).setLabel('Resume (Host)').setStyle(ButtonStyle.Success),
      );
      await say(channel, { embeds: [embed().setTitle('Game paused').setDescription('The Host paused the game. Timers and guessing are frozen.')], components: [row] });
    }
    return null;
  });
}

async function resumeGame(gameId) {
  return withLock(gameId, async () => {
    const game = await Game.findById(gameId);
    if (!game || !game.open || game.status !== 'paused') return 'The game is not paused.';
    const from = game.pausedFrom.status;
    const deadline = resumeDeadline(Date.now(), game.pausedFrom.remainingMs);
    const fresh = await Game.findByIdAndUpdate(gameId, {
      $set: { status: from, deadlineAt: deadline ? new Date(deadline) : null, pausedFrom: { status: null, remainingMs: null } },
    }, { new: true });
    if (from === 'active') {
      const turn = await Turn.findById(fresh.currentTurnId);
      const word = turn && (getWord(turn.wordId) || wordFromTurn(turn));
      if (turn && word) registerState(buildState(fresh, turn, word));
    }
    setPhaseTimer(fresh);
    const channel = await getChannel(game.channelId);
    if (channel) await say(channel, { embeds: [embed().setTitle('Game resumed')] });
    return null;
  });
}

async function handleResume(interaction) {
  if (!isHost(interaction)) return interaction.reply({ content: 'Only the Host can resume the game.', flags: MessageFlags.Ephemeral });
  const gameId = interaction.customId.split(':')[2];
  const err = await resumeGame(gameId);
  if (err) return interaction.reply({ content: err, flags: MessageFlags.Ephemeral });
  return interaction.update({ components: [] });
}

/** Current round only. Returns an error string, or null on success. */
async function removeActor(gameId, userId) {
  return withLock(gameId, async () => {
    const game = await Game.findById(gameId);
    if (!game || !game.open) return 'There is no running game.';
    if (game.status === 'paused') return 'Resume the game first.';
    const record = { round: game.currentRound, userId };

    if (game.status === 'registering') {
      if (!game.registrants.includes(userId)) return 'That user is not registered this round.';
      await Game.updateOne({ _id: gameId }, { $pull: { registrants: userId }, $push: { afkRemoved: record } });
      return null;
    }

    const turn = game.currentTurnId ? await Turn.findById(game.currentTurnId) : null;
    if (turn && turn.actorId === userId && (game.status === 'ready_check' || game.status === 'starting')) {
      await Turn.updateOne({ _id: turn._id, status: { $in: ['pending', 'active'] } }, { $set: { status: 'not_started', notStartedReason: 'removed', endedAt: new Date() } });
      await editMessage(game.channelId, game.readyMessageId, { content: '', embeds: [embed().setDescription(`<@${userId}> was removed from acting this round by the Host.`)], components: [] });
      await Game.updateOne({ _id: gameId }, { $set: { status: 'between', currentTurnIndex: turn.turnIndex + 1, currentTurnId: null, deadlineAt: null }, $push: { afkRemoved: record } });
      clearPhaseTimer(gameId);
      await advance(gameId);
      return null;
    }
    if (turn && turn.actorId === userId && game.status === 'active') {
      const st = claimTurn(gameId);
      if (!st) return 'That turn is already over.';
      clearPhaseTimer(gameId);
      await Game.updateOne({ _id: gameId }, { $push: { afkRemoved: record } });
      await finishTurn(st, { status: 'terminated' });
      return null;
    }

    const pos = game.roundOrder.indexOf(userId);
    const firstUpcoming = game.status === 'between' ? game.currentTurnIndex : game.currentTurnIndex + 1;
    if (pos === -1 || pos < firstUpcoming) return 'That user has no upcoming turn this round.';
    await Game.updateOne({ _id: gameId }, { $pull: { roundOrder: userId }, $push: { afkRemoved: record } });
    return null;
  });
}

async function endGame(gameId) {
  return withLock(gameId, async () => {
    const game = await Game.findById(gameId);
    if (!game || !game.open) return 'There is no running game.';
    if (game.vetoPendingTurnId) return 'A veto vote on the last turn is still running. Wait for it to resolve (or its timeout) before ending the game, so final standings reflect the result.';
    if (game.status === 'active') {
      const st = claimTurn(gameId);
      if (st) { clearPhaseTimer(gameId); await finishTurn(st, { status: 'terminated', silent: true, noAdvance: true }); }
    } else if ((game.status === 'ready_check' || game.status === 'starting') && game.currentTurnId) {
      await Turn.updateOne({ _id: game.currentTurnId, status: { $in: ['pending', 'active'] } }, { $set: { status: 'not_started', notStartedReason: 'removed', endedAt: new Date() } });
    }
    await finishGame(gameId);
    return null;
  });
}

// ---------- veto ----------

async function startVeto(interaction, gameId) {
  return withLock(gameId, async () => {
    const game = await Game.findById(gameId);
    if (!game || !game.open || game.status !== 'between' || !game.lastTurnId) {
      return interaction.reply({ content: 'There is no completed turn to veto right now.', flags: MessageFlags.Ephemeral });
    }
    if (game.vetoPendingTurnId) return interaction.reply({ content: 'A veto vote is already running.', flags: MessageFlags.Ephemeral });
    const turn = await Turn.findById(game.lastTurnId);
    if (!turn || !['guessed', 'timeout'].includes(turn.status) || turn.veto.startedAt) {
      return interaction.reply({ content: 'This turn cannot be vetoed.', flags: MessageFlags.Ephemeral });
    }
    const word = getWord(turn.wordId) || wordFromTurn(turn);
    const candidates = game.roundRegistrants.filter((id) => id !== turn.actorId);
    if (!candidates.length) return interaction.reply({ content: 'There are no other registered actors to vote.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const dms = [];
    for (const userId of candidates) {
      try {
        const user = await client.users.fetch(userId);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`pict:vote:${turn._id}:y`).setLabel('Yes, veto').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`pict:vote:${turn._id}:n`).setLabel('No, keep it').setStyle(ButtonStyle.Success),
        );
        const sent = await user.send({
          embeds: [embed().setTitle('Pictionary veto vote').setDescription([
            `The Host challenged <@${turn.actorId}>'s turn. The word was **${word?.answer || turn.wordId}**.`,
            'Did the Actor break a rule that the bot cannot detect? Vote Yes to annul the turn, or No to keep it.',
            `You have ${cfg().vetoSeconds} seconds. A majority decides right away. A tie or no majority annuls the turn.`,
          ].join('\n'))],
          components: [row],
        });
        dms.push({ userId, channelId: sent.channelId, messageId: sent.id });
      } catch { /* DMs closed: this person cannot vote */ }
    }
    if (!dms.length) return interaction.editReply('I could not DM any voters, so the vote was not started.');

    const deadline = new Date(msFromNow(Date.now(), cfg().vetoSeconds));
    await Turn.updateOne({ _id: turn._id }, { $set: { 'veto.startedAt': new Date(), 'veto.deadlineAt': deadline, 'veto.eligible': dms.map((d) => d.userId), 'veto.dms': dms } });
    clearPhaseTimer(gameId);
    await Game.updateOne({ _id: gameId }, { $set: { vetoPendingTurnId: turn._id, deadlineAt: null } });
    scheduleVetoTimer(gameId, turn._id, deadline);
    const channel = await getChannel(game.channelId);
    if (channel) {
      await say(channel, { embeds: [embed().setTitle('Veto vote started').setDescription(`Voters were DMed about <@${turn.actorId}>'s turn. Results in ${cfg().vetoSeconds} seconds or as soon as a majority is reached.`)] });
    }
    return interaction.editReply(`Vote started with ${dms.length} voter${dms.length > 1 ? 's' : ''}.`);
  });
}

function scheduleVetoTimer(gameId, turnId, deadline) {
  const key = String(turnId);
  if (vetoTimers.has(key)) clearTimeout(vetoTimers.get(key));
  const delay = Math.max(0, new Date(deadline).getTime() - Date.now());
  vetoTimers.set(key, setTimeout(async () => {
    vetoTimers.delete(key);
    try { await withLock(gameId, () => resolveVeto(gameId, turnId)); } catch (err) { console.error('[pictionary] veto timeout failed:', err); }
  }, delay));
}

async function handleVote(interaction) {
  const [, , turnId, choice] = interaction.customId.split(':');
  const turnDoc = await Turn.findById(turnId).select('gameId').lean();
  if (!turnDoc) return interaction.reply({ content: 'This vote no longer exists.', flags: MessageFlags.Ephemeral });
  return withLock(turnDoc.gameId, async () => {
    const turn = await Turn.findById(turnId);
    if (!turn || !turn.veto.startedAt || turn.veto.result) return interaction.update({ content: 'This vote is closed.', embeds: [], components: [] });
    const uid = interaction.user.id;
    if (!turn.veto.eligible.includes(uid)) return interaction.reply({ content: 'You cannot vote on this turn.', flags: MessageFlags.Ephemeral });
    if (turn.veto.yes.includes(uid) || turn.veto.no.includes(uid)) return interaction.reply({ content: 'You already voted.', flags: MessageFlags.Ephemeral });
    const field = choice === 'y' ? 'veto.yes' : 'veto.no';
    const updated = await Turn.findByIdAndUpdate(turnId, { $addToSet: { [field]: uid } }, { new: true });
    await interaction.update({ embeds: [embed().setDescription(`Vote recorded: **${choice === 'y' ? 'Yes, veto' : 'No, keep it'}**.`)], components: [] });
    const t = tally(updated.veto.yes, updated.veto.no, updated.veto.eligible);
    if (t.result || t.allVoted) await resolveVeto(turnDoc.gameId, turnId);
  });
}

/** Lock held. Idempotent: only the first call for a turn changes anything. */
async function resolveVeto(gameId, turnId) {
  const turn = await Turn.findById(turnId);
  if (!turn || !turn.veto.startedAt || turn.veto.result) return;
  const result = finalResult(tally(turn.veto.yes, turn.veto.no, turn.veto.eligible));
  const set = { 'veto.result': result, 'veto.resolvedAt': new Date() };
  if (result === 'vetoed') Object.assign(set, { annulled: true, annulReason: 'veto' });
  const claimed = await Turn.updateOne({ _id: turnId, 'veto.result': null }, { $set: set });
  if (!claimed.modifiedCount) return;
  const key = String(turnId);
  if (vetoTimers.has(key)) { clearTimeout(vetoTimers.get(key)); vetoTimers.delete(key); }

  for (const dm of turn.veto.dms) {
    try {
      const ch = await client.channels.fetch(dm.channelId);
      const msg = await ch.messages.fetch(dm.messageId);
      await msg.edit({ embeds: [embed().setTitle('Veto vote closed').setDescription(`Result: **${result === 'vetoed' ? 'turn vetoed' : 'turn kept'}**.`)], components: [] });
    } catch { /* DM gone */ }
  }

  const game = await Game.findById(gameId);
  if (!game) return;
  const channel = await getChannel(game.channelId);
  if (channel) {
    const yes = new Set(turn.veto.yes).size;
    const no = new Set(turn.veto.no).size;
    await say(channel, {
      embeds: [embed().setTitle(result === 'vetoed' ? 'Turn vetoed' : 'Turn upheld').setDescription(
        result === 'vetoed'
          ? `The vote (${yes} yes, ${no} no) annulled <@${turn.actorId}>'s turn. Its points are removed.`
          : `The vote (${yes} yes, ${no} no) kept <@${turn.actorId}>'s turn.`,
      )],
    });
  }

  await Game.updateOne({ _id: gameId }, { $set: { vetoPendingTurnId: null } });
  if (game.status === 'between') {
    const fresh = await Game.findByIdAndUpdate(gameId, { $set: { deadlineAt: new Date(msFromNow(Date.now(), cfg().autoAdvanceSeconds)) } }, { new: true });
    setPhaseTimer(fresh);
  } else if (game.status === 'paused' && game.pausedFrom.status === 'between') {
    await Game.updateOne({ _id: gameId }, { $set: { 'pausedFrom.remainingMs': cfg().autoAdvanceSeconds * 1000 } });
  }
}

// ---------- finishing ----------

async function cancelGame(game, reason) {
  clearPhaseTimer(game._id);
  await Game.updateOne({ _id: game._id }, { $set: { open: false, status: 'cancelled', finishedAt: new Date(), deadlineAt: null } });
  await clearMute(game);
  const channel = await getChannel(game.channelId);
  if (channel) await say(channel, { embeds: [embed().setTitle('Pictionary cancelled').setDescription(reason)] });
}

/** Lock held. */
async function finishGame(gameId) {
  const game = await Game.findById(gameId);
  if (!game || !game.open) return;
  clearPhaseTimer(gameId);
  if (game.registrationMessageId) registrationMsgs.delete(game.registrationMessageId);
  const st = claimTurn(gameId);
  if (st) await finishTurn(st, { status: 'terminated', silent: true, noAdvance: true });
  await editMessage(game.channelId, game.panelMessageId, { components: [] });
  await editMessage(game.channelId, game.registrationMessageId, { components: [] });

  const turns = await Turn.find({ gameId }).lean();
  const played = turns.filter((t) => t.startedAt);
  if (!played.length) {
    return cancelGame(game, 'The game ended before any turn was played.');
  }

  const rows = standings(turns, game.participants);
  const top = podium(rows);
  const agg = aggregate(played);
  const fastest = played
    .filter((t) => t.status === 'guessed' && !t.annulled && Number.isFinite(t.solveMs))
    .sort((a, b) => a.solveMs - b.solveMs)[0];
  const rounds = new Set(played.map((t) => t.round)).size;

  const e = embed().setTitle(`Pictionary results${game.shortId ? ` (${game.shortId})` : ''}`);
  e.addFields(
    { name: 'Podium', value: top.length ? standingsLines(top).slice(0, 1024) : 'Nobody scored this game.' },
    { name: 'Standings', value: standingsLines(rows).slice(0, 1024) },
    { name: 'Participants', value: game.participants.map((id) => `<@${id}>`).join(', ').slice(0, 1024) || 'None' },
    {
      name: 'Game stats',
      value: [
        `Rounds played: ${rounds}`,
        `Turns played: ${agg.turnsPlayed}`,
        `Words guessed: ${agg.guessed}`,
        `Fastest guess: ${fastest ? `${formatSolve(fastest.solveMs)} by <@${fastest.guesserId}>` : 'n/a'}`,
        `Hard violations: ${agg.violations}`,
        `Vetoed turns: ${agg.vetoes}`,
      ].join('\n'),
    },
  );
  if (game.participants.length) {
    e.addFields({ name: 'Participant IDs (for /admin add)', value: `\`\`\`\n${game.participants.join(' ')}\n\`\`\``.slice(0, 1024) });
  }
  const channel = await getChannel(game.channelId);
  if (channel) await say(channel, { embeds: [e] });
  await Game.updateOne({ _id: gameId }, { $set: { open: false, status: 'finished', finishedAt: new Date(), deadlineAt: null } });
  await clearMute(game);
}

// ---------- recovery and sweeps ----------

async function rebuildActive(game) {
  const turn = await Turn.findById(game.currentTurnId);
  const word = turn && (getWord(turn.wordId) || wordFromTurn(turn));
  if (!turn || turn.status !== 'active' || !turn.startedAt) return null;
  if (!word) {
    await Turn.updateOne({ _id: turn._id }, { $set: { status: 'terminated', annulled: true, annulReason: 'host', endedAt: new Date() } });
    return null;
  }
  const st = buildState(game, turn, word);
  registerState(st);
  return st;
}

async function recoverGame(game) {
  if (game.registrationMessageId && game.status === 'registering') registrationMsgs.set(game.registrationMessageId, String(game._id));
  if (game.status === 'active') {
    const st = await rebuildActive(game);
    if (!st) {
      await Game.updateOne({ _id: game._id }, { $set: { status: 'between', currentTurnIndex: game.currentTurnIndex + 1, currentTurnId: null, deadlineAt: new Date() } });
      return onPhaseDeadline(String(game._id));
    }
    // Canonical mute state: muted exactly when the Actor has used every clue.
    if (st.muted) { await Game.updateOne({ _id: game._id }, { $set: { mutedUserId: st.actorId } }); await muteUser(game.channelId, st.actorId); } else await clearMute(game);
    if (new Date(game.deadlineAt).getTime() <= Date.now()) return endTurn(String(game._id), { status: 'timeout' });
    return setPhaseTimer(game);
  }
  if (game.status !== 'paused') await clearMute(game);
  if (game.status === 'ready_check' || game.status === 'starting' || game.status === 'between' || game.status === 'registering') setPhaseTimer(game);
}

async function recoverVetoes() {
  const pending = await Turn.find({ 'veto.startedAt': { $ne: null }, 'veto.result': null });
  for (const t of pending) scheduleVetoTimer(String(t.gameId), t._id, t.veto.deadlineAt || new Date());
}

async function sweep() {
  try {
    const games = await Game.find({ open: true });
    for (const game of games) {
      const id = String(game._id);
      if (isLiveStatus(game.status) && game.deadlineAt
        && new Date(game.deadlineAt).getTime() < Date.now() - 3000 && !phaseTimers.has(id)) {
        if (game.status === 'active' && !activeTurns.has(id)) await recoverGame(game);
        else await onPhaseDeadline(id);
      }
    }
    const stuck = await Game.find({ open: false, mutedUserId: { $ne: null } });
    for (const game of stuck) await clearMute(game);
    const pending = await Turn.find({ 'veto.startedAt': { $ne: null }, 'veto.result': null });
    for (const t of pending) {
      if (!vetoTimers.has(String(t._id))) scheduleVetoTimer(String(t.gameId), t._id, t.veto.deadlineAt || new Date());
    }
  } catch (err) {
    console.error('[pictionary] sweep failed:', err);
  }
}

async function initialize(c) {
  client = c;
  try {
    const games = await Game.find({ open: true });
    for (const game of games) {
      try { await recoverGame(game); } catch (err) { console.error('[pictionary] recovery failed for game', String(game._id), err); }
    }
    const stuck = await Game.find({ open: false, mutedUserId: { $ne: null } });
    for (const game of stuck) await clearMute(game);
    await recoverVetoes();
    if (games.length) console.log(`[pictionary] recovered ${games.length} open game(s)`);
  } catch (err) {
    console.error('[pictionary] initialize failed:', err);
  }
  setInterval(sweep, SWEEP_MS);
}

module.exports = {
  initialize, startGame, pauseGame, resumeGame, removeActor, endGame, currentOpenGame,
  handleReactionAdd, handleReactionRemove, handleMessage, handleMessageEdit, handleMessageDelete,
  handleShowWordAndReady, handleControl, handleStartNow, handleResume, handleVote,
  isHost,
};
