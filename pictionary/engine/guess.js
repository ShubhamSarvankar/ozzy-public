// Deterministic guess matching. No semantic or fuzzy logic: only the answer,
// its plurals, and curated `accepted` aliases count.
const { tokens, compact, pluralForms, containsSequence } = require('./normalize');

/** Every accepted form of a word as normalized strings (answer + aliases, with plurals). */
function acceptedForms(word) {
  const raw = [word.answer, ...(word.accepted || [])];
  const forms = new Set();
  for (const r of raw) for (const f of pluralForms(r)) forms.add(f);
  return [...forms];
}

/**
 * A guess is correct if any accepted form appears in the message as a whole-token
 * sequence (so "is it a volcano?" counts, "volcanology" does not). A multi-word
 * answer also matches when typed as one word ("icecream").
 */
function isCorrectGuess(text, word) {
  const toks = tokens(text);
  if (!toks.length) return false;
  for (const form of acceptedForms(word)) {
    const seq = form.split(' ');
    if (containsSequence(toks, seq)) return true;
    if (seq.length > 1 && toks.includes(compact(form))) return true;
  }
  return false;
}

module.exports = { acceptedForms, isCorrectGuess };
