// Text normalization shared by guess matching and clue rules. Pure, no Discord imports.

// Zero-width and other invisible/format characters people use to slip a word past filters.
const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠎​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g;

// Common leetspeak digit/symbol substitutions and Cyrillic lookalikes (lowercase,
// applied after .toLowerCase()) people use to slip a banned word or the answer
// past matching, e.g. "v0lcano", "v@lcano", Cyrillic "а" for Latin "a".
const LOOKALIKE_FOLD = new Map(Object.entries({
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g',
  '@': 'a', $: 's', '+': 't',
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ѕ: 's', ј: 'j',
}));

const HAS_LETTER_RE = /\p{L}/u;

// Fold only within a run that already contains a real letter, so a bare
// number ("7 letters", letter-count clues) is left alone, while a
// leetspeak-obfuscated word ("v0lcano", "v@lcano") still gets folded because
// it mixes real letters with the substituted digit/symbol.
function foldLookalikes(text) {
  return text.replace(/[\p{L}\p{N}@$+]+/gu, (run) => {
    if (!HAS_LETTER_RE.test(run)) return run;
    return [...run].map((ch) => LOOKALIKE_FOLD.get(ch) || ch).join('');
  });
}

/**
 * Lowercase, strip accents and invisible characters, fold leetspeak/homoglyph
 * lookalikes, drop apostrophes, turn every other non letter/digit into a
 * single space.
 */
function normalize(text) {
  return foldLookalikes(
    String(text ?? '')
      .normalize('NFKC')
      .replace(INVISIBLE, '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase(),
  )
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokens(text) {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Letters and digits only, no spaces. */
function compact(text) {
  return normalize(text).replace(/ /g, '');
}

/** All plausible plural forms of the last word. Over-generating is harmless for matching. */
function pluralForms(term) {
  const n = normalize(term);
  if (!n) return [];
  const out = new Set([n, `${n}s`, `${n}es`]);
  if (/[^aeiou]y$/.test(n)) out.add(`${n.slice(0, -1)}ies`);
  if (/(?:f|fe)$/.test(n)) out.add(n.replace(/fe?$/, 'ves'));
  return [...out];
}

/** True if `needle` (array of tokens) appears as a contiguous run inside `haystack`. */
function containsSequence(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

module.exports = { normalize, tokens, compact, pluralForms, containsSequence };
