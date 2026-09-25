// Shared analytics query layer. This is the only place analytics logic lives
// - the owner-only Discord dashboard (commands/pictionary.js showAnalytics)
// and the read-only CLI (scripts/pictionary/analytics.js) both call these
// same functions, so what Claude Code sees here can never disagree with what
// shows up in Discord. Every function here only ever reads from Mongo.
const Game = require('../store/game');
const Turn = require('../store/turn');
const { loadWords } = require('../engine/vocabulary');
const {
  wordMetrics, aggregate, difficultyFlags, userStats, THRESHOLDS,
} = require('../engine/stats');
const { exposureTimes, DAY_MS } = require('../engine/wordPicker');
const config = require('../../config');

function emptyMetrics(wordId) {
  return {
    wordId,
    selected: 0,
    played: 0,
    guessed: 0,
    successRate: null,
    avgSolveMs: null,
    medianSolveMs: null,
    fastestSolveMs: null,
    timeouts: 0,
    violations: 0,
    vetoes: 0,
    notStarted: 0,
    lastPlayed: null,
  };
}

async function overview() {
  const vocab = loadWords();
  const allTurns = await Turn.find({}).lean();
  const metrics = wordMetrics(allTurns);
  const baseline = aggregate(allTurns);
  const games = await Game.countDocuments({});
  const finished = await Game.countDocuments({ status: 'finished' });
  const neverPlayed = vocab.filter((w) => !(metrics.get(w.id)?.played)).length;
  const bySource = vocab.reduce((acc, w) => { acc[w.source] = (acc[w.source] || 0) + 1; return acc; }, {});
  return {
    games, finished, wordsInList: vocab.length, neverPlayed, bySource, ...baseline,
  };
}

async function words({
  category, tier, source, sort = 'played', limit = 50,
} = {}) {
  const vocab = loadWords().filter((w) => (!category || w.category.toLowerCase() === category.toLowerCase())
    && (!tier || w.tier === tier) && (!source || w.source === source));
  const allTurns = vocab.length ? await Turn.find({ wordId: { $in: vocab.map((w) => w.id) } }).lean() : [];
  const metrics = wordMetrics(allTurns);
  const rows = vocab.map((w) => ({ word: w, metrics: metrics.get(w.id) || emptyMetrics(w.id) }));
  const sorters = {
    played: (a, b) => b.metrics.played - a.metrics.played,
    successRate: (a, b) => (b.metrics.successRate || 0) - (a.metrics.successRate || 0),
    recent: (a, b) => (b.metrics.lastPlayed || 0) - (a.metrics.lastPlayed || 0),
  };
  rows.sort(sorters[sort] || sorters.played);
  return rows.slice(0, limit);
}

/**
 * Full history for one word. Clue text (needed for veto/violation review) is
 * only included for turns that actually needed human review - a hard
 * violation, or a vetoed turn - never for an ordinary guessed/timeout turn,
 * and raw guess content is never returned at all (counts and the winning
 * guess only), matching the crawl's "store counts only" principle.
 */
async function word(wordId) {
  const w = loadWords().find((x) => x.id === wordId);
  if (!w) return null;
  const turns = await Turn.find({ wordId }).sort({ createdAt: 1 }).lean();
  const metrics = wordMetrics(turns).get(wordId) || emptyMetrics(wordId);
  const history = turns.map((t) => ({
    gameId: String(t.gameId),
    round: t.round,
    turnIndex: t.turnIndex,
    actorId: t.actorId,
    status: t.status,
    solveMs: t.solveMs,
    annulled: t.annulled,
    annulReason: t.annulReason,
    vetoResult: t.veto?.result || null,
    clues: (t.status === 'violation' || t.veto?.result === 'vetoed')
      ? (t.clueSnapshots || []).map((c) => ({ content: c.content, deleted: Boolean(c.deletedAt) }))
      : undefined,
  }));
  return { word: w, metrics, history };
}

async function flags() {
  const vocab = loadWords();
  const allTurns = await Turn.find({}).lean();
  const metrics = wordMetrics(allTurns);
  const baseline = aggregate(allTurns);
  const rows = [];
  for (const w of vocab) {
    const m = metrics.get(w.id);
    if (!m) continue;
    const f = difficultyFlags(m, baseline);
    if (f.length) rows.push({ word: w, flags: f, metrics: m });
  }
  return { rows, thresholds: THRESHOLDS };
}

async function games({ since } = {}) {
  const q = {};
  if (since) q.createdAt = { $gte: new Date(since) };
  return Game.find(q).sort({ createdAt: -1 }).lean();
}

async function game(shortId) {
  const g = await Game.findOne({ shortId }).lean();
  if (!g) return null;
  const turns = await Turn.find({ gameId: g._id }).sort({ round: 1, turnIndex: 1 }).lean();
  return { game: g, turns };
}

async function players({ sort = 'points', limit = 50 } = {}) {
  const allTurns = await Turn.find({}).lean();
  const ids = new Set();
  for (const t of allTurns) {
    if (t.actorId) ids.add(t.actorId);
    if (t.guesserId) ids.add(t.guesserId);
  }
  const rows = [...ids].map((userId) => ({ userId, ...userStats(allTurns, userId) }));
  const sorters = {
    points: (a, b) => b.totalPoints - a.totalPoints,
    guesses: (a, b) => b.correctGuesses - a.correctGuesses,
  };
  rows.sort(sorters[sort] || sorters.points);
  return rows.slice(0, limit);
}

/** Hard-violation breakdown: which rules fire, on which words - helps spot a bad banned-list entry. */
async function violations({ rule } = {}) {
  const q = { status: 'violation' };
  if (rule) q['violation.type'] = rule;
  const turns = await Turn.find(q).lean();
  const byRuleAndWord = new Map();
  for (const t of turns) {
    const key = `${t.violation?.type || 'unknown'}::${t.wordId}`;
    byRuleAndWord.set(key, (byRuleAndWord.get(key) || 0) + 1);
  }
  return [...byRuleAndWord].map(([key, count]) => {
    const [ruleName, wordId] = key.split('::');
    return { rule: ruleName, wordId, count };
  }).sort((a, b) => b.count - a.count);
}

/** Every exposed word, most recently used first, flagged if still on cooldown. Powers the Discord "recent" view. */
async function recentlyUsed({ limit = 25 } = {}) {
  const cooldownDays = config.pictionary.wordCooldownDays;
  const vocab = loadWords();
  const byId = new Map(vocab.map((w) => [w.id, w]));
  const history = await Turn.find({ startedAt: { $ne: null } }).select('wordId startedAt endedAt').lean();
  const exposure = exposureTimes(history);
  const cutoff = Date.now() - cooldownDays * DAY_MS;
  return [...exposure]
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([wordId, ms]) => ({
      word: byId.get(wordId), lastExposedAt: new Date(ms).toISOString(), onCooldown: ms > cutoff,
    }));
}

async function cooldown() {
  const cooldownDays = config.pictionary.wordCooldownDays;
  const history = await Turn.find({ startedAt: { $gte: new Date(Date.now() - cooldownDays * DAY_MS) } })
    .select('wordId startedAt endedAt').lean();
  const exposure = exposureTimes(history);
  const cutoff = Date.now() - cooldownDays * DAY_MS;
  return [...exposure]
    .filter(([, ms]) => ms > cutoff)
    .map(([wordId, ms]) => ({ wordId, lastExposedAt: new Date(ms).toISOString() }));
}

module.exports = {
  overview, words, word, flags, games, game, players, violations, cooldown, recentlyUsed,
};
