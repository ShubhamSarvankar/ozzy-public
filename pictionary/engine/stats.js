// Deterministic statistics derived from Turn records. No counters are stored, so a
// veto (which only flips `annulled`/`veto.result`) is reflected everywhere automatically.
const { isExposed } = require('./wordPicker');
const { standings, podium } = require('./scoring');

// Difficulty flag thresholds. Flags never fire below MIN_SAMPLE plays.
const THRESHOLDS = {
  MIN_SAMPLE: 5,
  TOO_EASY_SUCCESS: 0.9,
  TOO_EASY_MEDIAN_MS: 15000,
  TOO_HARD_SUCCESS: 0.2,
  UNUSUAL_RATE_MULTIPLIER: 2,
};

const isVetoed = (t) => t.veto?.result === 'vetoed';

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

const mean = (nums) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null);

/** Per-word metrics keyed by wordId. */
function wordMetrics(turns) {
  const groups = new Map();
  for (const t of turns) {
    if (!groups.has(t.wordId)) groups.set(t.wordId, []);
    groups.get(t.wordId).push(t);
  }
  const out = new Map();
  for (const [wordId, ts] of groups) {
    const played = ts.filter(isExposed);
    const guessed = played.filter((t) => t.status === 'guessed');
    const solves = guessed.map((t) => t.solveMs).filter((n) => Number.isFinite(n));
    const lastPlayed = played.reduce((acc, t) => {
      const w = new Date(t.endedAt || t.startedAt).getTime();
      return Number.isFinite(w) && w > acc ? w : acc;
    }, 0);
    out.set(wordId, {
      wordId,
      selected: ts.length,
      played: played.length,
      guessed: guessed.length,
      successRate: played.length ? guessed.length / played.length : null,
      avgSolveMs: mean(solves),
      medianSolveMs: median(solves),
      fastestSolveMs: solves.length ? Math.min(...solves) : null,
      timeouts: played.filter((t) => t.status === 'timeout').length,
      violations: played.filter((t) => t.status === 'violation').length,
      vetoes: played.filter(isVetoed).length,
      notStarted: ts.filter((t) => t.status === 'not_started').length,
      lastPlayed: lastPlayed || null,
    });
  }
  return out;
}

/** Whole-dataset rates used as the baseline for "unusual" flags. */
function aggregate(turns) {
  const played = turns.filter(isExposed);
  const guessed = played.filter((t) => t.status === 'guessed');
  const solves = guessed.map((t) => t.solveMs).filter((n) => Number.isFinite(n));
  const rate = (n) => (played.length ? n / played.length : 0);
  return {
    turnsTotal: turns.length,
    turnsPlayed: played.length,
    guessed: guessed.length,
    timeouts: played.filter((t) => t.status === 'timeout').length,
    violations: played.filter((t) => t.status === 'violation').length,
    vetoes: played.filter(isVetoed).length,
    notStarted: turns.filter((t) => t.status === 'not_started').length,
    successRate: rate(guessed.length),
    timeoutRate: rate(played.filter((t) => t.status === 'timeout').length),
    vetoRate: rate(played.filter(isVetoed).length),
    fastestSolveMs: solves.length ? Math.min(...solves) : null,
    medianSolveMs: median(solves),
  };
}

/** Deterministic flags for one word's metrics against the global baseline. */
function difficultyFlags(m, baseline) {
  const flags = [];
  if (m.played < THRESHOLDS.MIN_SAMPLE) return flags;
  if (m.successRate >= THRESHOLDS.TOO_EASY_SUCCESS && m.medianSolveMs !== null && m.medianSolveMs <= THRESHOLDS.TOO_EASY_MEDIAN_MS) flags.push('too_easy');
  if (m.successRate <= THRESHOLDS.TOO_HARD_SUCCESS) flags.push('too_hard');
  const k = THRESHOLDS.UNUSUAL_RATE_MULTIPLIER;
  if (m.vetoes > 0 && m.vetoes / m.played > k * baseline.vetoRate) flags.push('high_vetoes');
  if (m.timeouts > 0 && m.timeouts / m.played > k * baseline.timeoutRate) flags.push('high_timeouts');
  return flags;
}

/** Per-user stats from all turns involving that user. */
function userStats(turns, userId) {
  const acted = turns.filter((t) => t.actorId === userId);
  const actedStarted = acted.filter(isExposed);
  const actedGuessed = actedStarted.filter((t) => t.status === 'guessed' && !t.annulled);
  const guessedBy = turns.filter((t) => t.guesserId === userId && t.status === 'guessed');
  const validGuesses = guessedBy.filter((t) => !t.annulled);
  const solves = validGuesses.map((t) => t.solveMs).filter((n) => Number.isFinite(n));
  const games = new Set();
  for (const t of turns) {
    if (t.actorId === userId || t.guesserId === userId) games.add(String(t.gameId));
  }
  let points = 0;
  for (const g of standingsByGame(turns)) {
    const row = g.rows.find((r) => r.userId === userId);
    if (row) points += row.points;
  }
  return {
    gamesPlayed: games.size,
    turnsActed: actedStarted.length,
    turnsNotStarted: acted.filter((t) => t.status === 'not_started').length,
    actorSuccessRate: actedStarted.length ? actedGuessed.length / actedStarted.length : null,
    violations: actedStarted.filter((t) => t.status === 'violation').length,
    vetoedTurns: acted.filter(isVetoed).length,
    correctGuesses: validGuesses.length,
    avgSolveMs: mean(solves),
    fastestSolveMs: solves.length ? Math.min(...solves) : null,
    totalPoints: points,
  };
}

function standingsByGame(turns) {
  const byGame = new Map();
  for (const t of turns) {
    const k = String(t.gameId);
    if (!byGame.has(k)) byGame.set(k, []);
    byGame.get(k).push(t);
  }
  return [...byGame].map(([gameId, ts]) => ({ gameId, rows: standings(ts) }));
}

/** Podium finishes for a user across the given games' turns. Pass turns from finished games only. */
function podiumFinishes(turns, userId) {
  const counts = { first: 0, second: 0, third: 0 };
  for (const g of standingsByGame(turns)) {
    const row = podium(g.rows).find((r) => r.userId === userId);
    if (!row) continue;
    if (row.rank === 1) counts.first++;
    else if (row.rank === 2) counts.second++;
    else counts.third++;
  }
  return counts;
}

/**
 * All time leaderboard rows: points, wins (rank 1 with points, ties count) and games.
 * Only games in `finishedGameIds` count. Sorted by points then wins.
 */
function allTimeTotals(turns, finishedGameIds) {
  const totals = new Map();
  const get = (id) => {
    if (!totals.has(id)) totals.set(id, { userId: id, points: 0, wins: 0, games: 0 });
    return totals.get(id);
  };
  for (const g of standingsByGame(turns)) {
    if (!finishedGameIds.has(g.gameId)) continue;
    for (const r of g.rows) {
      const row = get(r.userId);
      row.points += r.points;
      row.games += 1;
      if (r.rank === 1 && r.points > 0) row.wins += 1;
    }
  }
  return [...totals.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
}

module.exports = { allTimeTotals, THRESHOLDS, median, wordMetrics, aggregate, difficultyFlags, userStats, podiumFinishes, standingsByGame };
