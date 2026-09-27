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

/** Smallest edit distance from `guessCompact` to any of `forms`, or null if none of
 * them are close enough to bother with (either too different in length to plausibly
 * be a "one word" attempt, or too far apart once compared). */
function bestDistanceAmong(guessCompact, forms) {
  let best = Infinity;
  for (const form of forms) {
    if (Math.abs(guessCompact.length - form.length) > distanceThreshold(form.length) + 1) continue;
    const d = levenshtein(guessCompact, form);
    if (d < best) best = d;
  }
  if (best === Infinity || !forms.some((f) => best <= distanceThreshold(f.length))) return null;
  return best;
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

  const answerForms = [word.answer, ...(word.accepted || [])];
  const wholeForms = answerForms.map(compact).filter(Boolean);
  // Also compare against each individual word of a multi-word answer (e.g. "Einstein"
  // against "Albert Einstein"'s "einstein"), not just the whole compacted string - the
  // length gate in bestDistanceAmong otherwise always rejects a short guess against a
  // long name. Only forms with more than one token contribute here (a single-word
  // answer's "token" would just be itself, and unlike a whole-form match, an exact
  // token match is allowed through below - fine for a genuine partial name, wrong for
  // a single-word answer where it would just be re-admitting an exact whole match).
  // Length >= 4 skips filler words ("the", "of", "van") that would near-miss on almost
  // anything.
  const tokenForms = [...new Set(answerForms.flatMap((f) => {
    const t = tokens(f);
    return t.length > 1 ? t.filter((tok) => tok.length >= 4) : [];
  }))];

  const wholeDistance = bestDistanceAmong(guessCompact, wholeForms);
  const tokenDistance = bestDistanceAmong(guessCompact, tokenForms);
  const candidates = [];
  if (wholeDistance !== null && wholeDistance > 0) candidates.push(wholeDistance);
  if (tokenDistance !== null) candidates.push(tokenDistance);
  if (!candidates.length) return null;
  return { kind: 'distance', distance: Math.min(...candidates) };
}

module.exports = { checkNearMiss, levenshtein, distanceThreshold };
