// Deterministic near-miss detection for guesses that aren't correct. Never
// semantic: a flat relation-list match, or edit distance against accepted
// forms. Never reveals the answer text itself; callers only get a distance
// count or the fact that it matched a related word.
const { tokens, compact, containsSequence } = require('./normalize');

/** Classic Levenshtein edit distance between two strings. */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

/** How close a distance has to be to count as "near" for a word of this length. Short words get a tighter band. */
function distanceThreshold(len) {
  return Math.max(1, Math.min(2, Math.ceil(len / 4)));
}

/**
 * @param text the guesser's raw message content
 * @param word vocabulary entry (answer, accepted, related)
 * @returns null | {kind:'relation', matched} | {kind:'distance', distance}
 * `matched`/`distance` are for internal use only (picking the DM template),
 * never surface the target answer text itself.
 */
function checkNearMiss(text, word) {
  const toks = tokens(text);
  if (!toks.length) return null;

  const related = word.related || [];
  for (const rel of related) {
    const relToks = compact(rel) ? tokens(rel) : [];
    if (relToks.length && containsSequence(toks, relToks)) return { kind: 'relation', matched: rel };
  }

  const guessCompact = compact(text);
  if (!guessCompact) return null;
  const forms = [word.answer, ...(word.accepted || [])].map(compact).filter(Boolean);
  let best = Infinity;
  for (const form of forms) {
    // Only compare guesses that are plausibly "one word" attempts at the answer,
    // not an entire sentence that happens to contain the right letters.
    if (Math.abs(guessCompact.length - form.length) > distanceThreshold(form.length) + 1) continue;
    const d = levenshtein(guessCompact, form);
    if (d < best) best = d;
  }
  if (best !== Infinity && best > 0 && forms.some((f) => best <= distanceThreshold(f.length))) {
    return { kind: 'distance', distance: best };
  }
  return null;
}

module.exports = { checkNearMiss, levenshtein, distanceThreshold };
