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
 * @param opts.category optional category filter. Hard: no match in this category
 *   means no word at all (used by nothing today, kept for a future category mode).
 * @param opts.preferSource optional source ('community') to prefer when available; falls back
 *   to the full pool (still honoring cooldown/exclude/category) when nothing matches.
 *   Applied before excludeCategory, so it wins when the two conflict: a Round guaranteed
 *   its one community word matters more than that word's category not repeating.
 * @param opts.excludeCategory optional category to avoid, e.g. the previous turn's,
 *   so consecutive turns don't repeat a category. Soft: only applied when doing so
 *   leaves at least one candidate, so a small or lopsided word list (or a `category`
 *   filter that only matches one category, or a `preferSource` match that's only in
 *   this category) never goes empty just to satisfy this.
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
    excludeCategory = null,
    rng = Math.random,
  } = opts;
  const excluded = new Set(excludeIds);
  let pool = words.filter((w) => !excluded.has(w.id) && (!category || w.category === category));
  if (!pool.length) return null;

  if (preferSource) {
    const preferred = pool.filter((w) => w.source === preferSource);
    if (preferred.length) pool = preferred;
  }
  if (excludeCategory) {
    const withoutCategory = pool.filter((w) => w.category !== excludeCategory);
    if (withoutCategory.length) pool = withoutCategory;
  }

  const cutoff = now - cooldownDays * DAY_MS;
  const fresh = pool.filter((w) => !(exposure.get(w.id) > cutoff));
  if (fresh.length) return fresh[Math.floor(rng() * fresh.length)];

  pool = [...pool].sort((a, b) => (exposure.get(a.id) || 0) - (exposure.get(b.id) || 0));
  return pool[0];
}

module.exports = {
  isExposed, exposureTimes, pickWord, DAY_MS,
};
