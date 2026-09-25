// Word selection with recent-exposure avoidance. Pure: the caller supplies turn history and an rng.

const DAY_MS = 24 * 60 * 60 * 1000;

/** A word is exposed once its Turn actually started (guessed, timeout, violation, or later vetoed). */
function isExposed(turn) {
  return Boolean(turn.startedAt);
}

/** Map wordId -> most recent exposure time (ms) from turn history. */
function exposureTimes(turns) {
  const map = new Map();
  for (const t of turns) {
    if (!isExposed(t)) continue;
    const when = new Date(t.endedAt || t.startedAt).getTime();
    if (!Number.isFinite(when)) continue;
    if (!map.has(t.wordId) || map.get(t.wordId) < when) map.set(t.wordId, when);
  }
  return map;
}

/**
 * @param words vocabulary entries
 * @param opts.exposure Map wordId -> last exposure ms (see exposureTimes)
 * @param opts.now ms timestamp
 * @param opts.cooldownDays default 7
 * @param opts.excludeIds ids never to pick (e.g. already used in this game)
 * @param opts.category optional category filter
 * @param opts.preferSource optional source ('community') to prefer when available; falls back
 *   to the full pool (still honoring cooldown/exclude/category) when nothing matches.
 * @param opts.rng () => [0,1)
 * Falls back to the least recently exposed word when every candidate is on cooldown.
 */
function pickWord(words, opts = {}) {
  const {
    exposure = new Map(),
    now = Date.now(),
    cooldownDays = 7,
    excludeIds = [],
    category = null,
    preferSource = null,
    rng = Math.random,
  } = opts;
  const excluded = new Set(excludeIds);
  const base = words.filter((w) => !excluded.has(w.id) && (!category || w.category === category));
  let pool = base;
  if (preferSource) {
    const preferred = base.filter((w) => w.source === preferSource);
    if (preferred.length) pool = preferred;
  }
  if (!pool.length) return null;

  const cutoff = now - cooldownDays * DAY_MS;
  const fresh = pool.filter((w) => !(exposure.get(w.id) > cutoff));
  if (fresh.length) return fresh[Math.floor(rng() * fresh.length)];

  pool = [...pool].sort((a, b) => (exposure.get(a.id) || 0) - (exposure.get(b.id) || 0));
  return pool[0];
}

/**
 * Picks the category for a Round's Nth turn so consecutive Rounds don't repeat
 * the same category back to back. Deterministic given `seed` (e.g. the round
 * number) so it's testable without an rng.
 */
function rotateCategory(categories, seed) {
  if (!categories.length) return null;
  return categories[((seed % categories.length) + categories.length) % categories.length];
}

module.exports = {
  isExposed, exposureTimes, pickWord, rotateCategory, DAY_MS,
};
