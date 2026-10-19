// Halloween scares: the Discord glue for halloween/engine/. Two independent
// features, each behind its own persisted cooldown (config.halloween.cooldownMinutes):
//
//   tts    more than N countable human messages in general chat inside a
//          rolling window sends one plain (non-TTS) message of spooky emojis
//          that always includes an owl.
//   voice  more than M humans in a single voice channel makes Ozzy join,
//          play a local Ogg Opus track, and leave.
//
// Durable state follows utils/tempRoleManager.js: the cooldown deadline lives
// in Mongo (models/halloweenCooldownSchema.js) and is claimed with an atomic
// conditional write, so a restart or two racing triggers can never double
// fire. There is deliberately no sweep interval: nothing has to happen when a
// cooldown expires, it only gates the next trigger, so initialize() loading
// both docs into the cache is the whole boot story. The rolling message window
// is in memory only; losing it on restart costs at most one window of counts.
//
// index.js exits the process on any unhandled rejection or uncaught exception,
// so every Discord call, Mongo call and voice emitter here is wrapped. Voice
// emitters in particular get 'error' listeners before anything is awaited: an
// 'error' emit with no listener is an uncaughtException.

const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const HalloweenCooldown = require('../../models/halloweenCooldownSchema');
const { isCountableLiveMessage } = require('../../utils/messageFilters');
const { isHalloweenSeason } = require('../engine/season');
const { createRollingWindow } = require('../engine/window');
const { pickPhrase } = require('../engine/phrases');
const { canFire, nextAllowedAfter } = require('../engine/cooldown');

const FEATURES = ['tts', 'voice'];
const JOIN_TIMEOUT_MS = 10 * 1000;

let client = null;
let textWindow = null;
let audioPath = null;
let audioReady = false;
let voice = null; // lazily required @discordjs/voice, null when unavailable
let activeVoiceSession = null; // { channelId, connection, player, timer, done }

// Mirrors Mongo's nextAllowedAt per feature. Only ever set from Mongo results,
// so it can be stale in one direction only (thinking we are allowed when we
// are not), and the atomic claim below catches that case.
const nextAllowedCache = { tts: null, voice: null };

function cfg() {
  return config.halloween || null;
}

function cooldownMs() {
  return (cfg().cooldownMinutes || 30) * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Cooldown persistence
// ---------------------------------------------------------------------------

async function seedAndLoadCooldowns() {
  for (const feature of FEATURES) {
    try {
      await HalloweenCooldown.updateOne(
        { feature },
        { $setOnInsert: { feature, nextAllowedAt: null } },
        { upsert: true },
      );
    } catch (err) {
      // Two instances booting at once can collide on the unique index. Either
      // way the doc exists afterwards, so a duplicate key is not a problem.
      if (err.code !== 11000) throw err;
    }
  }
  const docs = await HalloweenCooldown.find({ feature: { $in: FEATURES } }).lean();
  for (const doc of docs) nextAllowedCache[doc.feature] = doc.nextAllowedAt || null;
  console.log(`[halloween] cooldowns loaded: tts=${fmt(nextAllowedCache.tts)} voice=${fmt(nextAllowedCache.voice)}`);
}

function fmt(date) {
  return date ? new Date(date).toISOString() : 'ready';
}

// Atomically claims a fire for `feature`. Exactly one of any number of
// concurrent callers gets true. Never upserts: the docs are seeded on boot, so
// this can't throw a duplicate key error. If seeding failed (Mongo down at
// boot) the query matches nothing, returns null, and the feature stays silent.
async function claimCooldown(feature, now) {
  if (!canFire(nextAllowedCache[feature], now)) return false;

  const doc = await HalloweenCooldown.findOneAndUpdate(
    { feature, $or: [{ nextAllowedAt: null }, { nextAllowedAt: { $lte: new Date(now) } }] },
    {
      $set: { nextAllowedAt: nextAllowedAfter(now, cooldownMs()), lastFiredAt: new Date(now) },
      $inc: { fireCount: 1 },
    },
    { new: true },
  );

  if (!doc) {
    // Lost the race, or the doc is missing. Refresh the cache so the fast
    // path stops sending us back to Mongo on every event.
    const fresh = await HalloweenCooldown.findOne({ feature }).lean();
    if (fresh) nextAllowedCache[feature] = fresh.nextAllowedAt || null;
    return false;
  }

  nextAllowedCache[feature] = doc.nextAllowedAt;
  return true;
}

// ---------------------------------------------------------------------------
// Text scare
// ---------------------------------------------------------------------------

async function handleMessage(message) {
  const c = cfg();
  if (!c || !c.enabled || !client || !textWindow) return;
  if (!message.channel || message.channel.id !== c.textChannelId) return;
  if (typeof message.channel.isThread === 'function' && message.channel.isThread()) return;
  if (!isCountableLiveMessage(message)) return;

  const now = Date.now();
  if (!isHalloweenSeason(new Date(now))) return;

  const { triggered } = textWindow.record(now);
  if (!triggered) return;
  if (!canFire(nextAllowedCache.tts, now)) return;

  // Whether or not we win the claim, nobody should re-fire off this same
  // burst: without the reset, the first message after the cooldown expires
  // would trigger instantly against a still-full window.
  textWindow.reset();
  if (!(await claimCooldown('tts', now))) return;

  const content = pickPhrase();
  await message.channel.send({ content });
  console.log(`[halloween] tts scare fired in #${message.channel.name || message.channel.id}: "${content}"`);
}

// ---------------------------------------------------------------------------
// Voice scare
// ---------------------------------------------------------------------------

async function handleVoiceStateUpdate(oldState, newState) {
  const c = cfg();
  if (!c || !c.enabled || !client || !audioReady || !voice) return;
  // Only a join or a move into a channel can push its count over the line.
  if (!newState || !newState.channelId || newState.channelId === (oldState && oldState.channelId)) return;
  if (newState.member && newState.member.user && newState.member.user.bot) return;

  const now = Date.now();
  if (!isHalloweenSeason(new Date(now))) return;
  if (activeVoiceSession) return;

  const channel = newState.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) return; // skips stage channels
  if (channel.id === channel.guild.afkChannelId) return;

  const humans = channel.members.filter((m) => !m.user.bot).size;
  if (humans <= c.voiceThreshold) return;

  const me = channel.guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (!perms || !perms.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
    return;
  }

  if (!canFire(nextAllowedCache.voice, now)) return;
  // Claim first and never refund: a failed join burns the cooldown. That is
  // the only design that cannot loop while four people sit in a channel.
  if (!(await claimCooldown('voice', now))) return;

  console.log(`[halloween] voice scare firing in ${channel.name} (${humans} humans)`);
  await playScare(channel);
}

// Joins, plays the track once, leaves. Never rejects.
async function playScare(channel) {
  const c = cfg();
  const {
    joinVoiceChannel, createAudioPlayer, createAudioResource, entersState,
    AudioPlayerStatus, NoSubscriberBehavior, StreamType, VoiceConnectionStatus,
  } = voice;

  // Set synchronously, before any await, so a second voiceStateUpdate can't
  // start a second session.
  const session = { channelId: channel.id, connection: null, player: null, timer: null, done: false };
  activeVoiceSession = session;

  function leave(reason) {
    if (session.done) return;
    session.done = true;
    if (session.timer) clearTimeout(session.timer);
    try {
      if (session.player) session.player.stop(true);
    } catch (err) {
      console.warn('[halloween] player.stop failed:', err && err.message);
    }
    try {
      // destroy() throws if called twice, and Idle, Disconnected and Destroyed
      // can all fire during teardown, so check the status first.
      if (session.connection && session.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        session.connection.destroy();
      }
    } catch (err) {
      console.warn('[halloween] connection.destroy failed:', err && err.message);
    }
    if (activeVoiceSession === session) activeVoiceSession = null;
    console.log(`[halloween] voice scare ended: ${reason}`);
  }

  try {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
      debug: true, // TEMP DIAG: forwards networking/WS/UDP/DAVE debug lines to the 'debug' event
    });
    session.connection = connection;
    connection.on('error', (err) => {
      console.error('[halloween] voice connection error:', err);
      leave('connection-error');
    });
    // TEMP DIAG: remove once the voice scare is confirmed audible.
    connection.on('stateChange', (oldS, newS) => {
      console.log(`[halloween][diag] connection ${oldS.status} -> ${newS.status}`);
    });
    connection.on('debug', (msg) => {
      // The raw WS trace includes the voice session token and the per-session
      // secret_key; redact both before they reach the host log.
      const safe = String(msg).replace(/"(token|secret_key)":\s*("[^"]*"|\[[^\]]*\])/g, '"$1":"<redacted>"');
      console.log(`[halloween][diag] ${safe}`);
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => leave('disconnected'));
    connection.on(VoiceConnectionStatus.Destroyed, () => leave('destroyed'));

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });
    session.player = player;
    player.on('error', (err) => {
      console.error('[halloween] audio player error:', err);
      leave('player-error');
    });
    player.on(AudioPlayerStatus.Idle, () => leave('idle'));
    // TEMP DIAG: remove once the voice scare is confirmed audible.
    player.on('stateChange', (oldS, newS) => {
      console.log(`[halloween][diag] player ${oldS.status} -> ${newS.status}`);
      if (newS.status === AudioPlayerStatus.Idle && oldS.resource) {
        console.log(`[halloween][diag] player idle after playbackDuration=${oldS.resource.playbackDuration}ms, resource.ended=${oldS.resource.ended}`);
      }
    });

    session.timer = setTimeout(() => leave('timeout'), (c.voiceMaxPlaySeconds || 60) * 1000);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, JOIN_TIMEOUT_MS);
    } catch (err) {
      console.error('[halloween] voice join did not become ready:', err && err.message);
      leave('join-failed');
      return;
    }
    if (session.done) return;

    const stream = fs.createReadStream(audioPath);
    stream.on('error', (err) => {
      console.error('[halloween] audio file read error:', err);
      leave('file-error');
    });
    const resource = createAudioResource(stream, { inputType: StreamType.OggOpus });
    // TEMP DIAG: the Ogg demuxer only forwards Opus packets. Count what it saw
    // so a non-Opus file shows up here instead of as a silent instant Idle.
    const demuxer = resource.playStream;
    let opusPackets = 0;
    let droppedSegments = 0;
    if (demuxer && typeof demuxer.on === 'function') {
      demuxer.on('head', () => console.log('[halloween][diag] demuxer: OpusHead found'));
      demuxer.on('unknownSegment', () => { droppedSegments += 1; });
      // Count via push() rather than a 'data' listener: a 'data' listener would
      // switch the stream to flowing mode and starve the player's read() calls.
      const origPush = demuxer.push.bind(demuxer);
      demuxer.push = (chunk, enc) => { if (chunk !== null) opusPackets += 1; return origPush(chunk, enc); };
      demuxer.on('end', () => {
        console.log(`[halloween][diag] demuxer end: opusPackets=${opusPackets} nonOpusSegmentsDropped=${droppedSegments}`);
      });
    }
    stream.on('end', () => console.log('[halloween][diag] audio file fully read'));
    connection.subscribe(player);
    console.log(`[halloween][diag] play() called; connection=${connection.state.status} networking=${connection.state.networking ? connection.state.networking.state.code : 'n/a'}`);
    player.play(resource);
  } catch (err) {
    console.error('[halloween] voice scare failed:', err);
    leave('error');
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function initialize(c) {
  client = c;
  const conf = cfg();
  if (!conf || !conf.enabled) {
    console.log('[halloween] disabled in config');
    return;
  }

  textWindow = createRollingWindow({
    windowMs: (conf.windowSeconds || 60) * 1000,
    threshold: conf.messageThreshold == null ? 10 : conf.messageThreshold,
  });

  audioPath = path.resolve(__dirname, '..', '..', conf.audioPath || 'data/halloween/scare.ogg');
  audioReady = fs.existsSync(audioPath);
  if (!audioReady) {
    console.warn(`[halloween] audio file missing at ${audioPath}; voice scare stays off until it exists and the bot restarts`);
  }

  // Lazy require so a broken native dependency on the host (DAVE prebuilds)
  // logs once and leaves the voice scare inert instead of crashing boot.
  try {
    voice = require('@discordjs/voice');
    if (audioReady) console.log(voice.generateDependencyReport());
  } catch (err) {
    voice = null;
    console.error('[halloween] @discordjs/voice failed to load; voice scare disabled:', err && err.message);
  }

  seedAndLoadCooldowns().catch((err) => {
    console.error('[halloween] cooldown seed/load failed; scares stay silent until Mongo is reachable:', err);
  });
  // No sweep interval on purpose: see the header comment.

  console.log(`[halloween] ready (season now: ${isHalloweenSeason(new Date()) ? 'yes' : 'no'}, voice: ${audioReady && voice ? 'on' : 'off'})`);
}

module.exports = { initialize, handleMessage, handleVoiceStateUpdate };
