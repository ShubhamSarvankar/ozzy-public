// Vocabulary loading and validation. Entries live in data/pictionary/words.json.
const fs = require('fs');
const path = require('path');

const WORDS_PATH = path.join(__dirname, '..', '..', 'data', 'pictionary', 'words.json');
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SOURCES = new Set(['authored', 'community']);

const strArray = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : []);

/**
 * Validate raw entries. Bad entries are skipped and reported, never thrown, so one typo
 * in the word list cannot take the game down.
 * Shape: { id, answer, category, tier, accepted, banned, related, source }.
 * @returns {{words: object[], errors: string[]}}
 */
function validateWords(raw) {
  const words = [];
  const errors = [];
  const seen = new Set();
  if (!Array.isArray(raw)) return { words, errors: ['words.json must contain an array'] };
  raw.forEach((entry, i) => {
    const label = `entry ${i}${entry && entry.id ? ` (${entry.id})` : ''}`;
    if (!entry || typeof entry !== 'object') { errors.push(`${label}: not an object`); return; }
    if (typeof entry.id !== 'string' || !SLUG_RE.test(entry.id)) { errors.push(`${label}: id must be a lowercase slug`); return; }
    if (seen.has(entry.id)) { errors.push(`${label}: duplicate id`); return; }
    if (typeof entry.answer !== 'string' || !entry.answer.trim()) { errors.push(`${label}: missing answer`); return; }
    if (typeof entry.category !== 'string' || !entry.category.trim()) { errors.push(`${label}: missing category`); return; }
    const tier = entry.tier === undefined ? 1 : entry.tier;
    if (tier !== 1 && tier !== 2) { errors.push(`${label}: tier must be 1 or 2`); return; }
    const source = entry.source === undefined ? 'authored' : entry.source;
    if (!SOURCES.has(source)) { errors.push(`${label}: source must be 'authored' or 'community'`); return; }
    seen.add(entry.id);
    words.push({
      id: entry.id,
      answer: entry.answer.trim(),
      category: entry.category.trim(),
      tier,
      accepted: strArray(entry.accepted),
      banned: strArray(entry.banned),
      related: strArray(entry.related),
      source,
    });
  });
  return { words, errors };
}

let cache = null;

/** Load once and cache. Call `reload()` after editing the file at runtime. */
function loadWords() {
  if (cache) return cache;
  return reload();
}

function reload() {
  try {
    const raw = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
    const { words, errors } = validateWords(raw);
    for (const e of errors) console.error('[pictionary] vocabulary:', e);
    cache = words;
  } catch (err) {
    console.error('[pictionary] could not load words.json:', err);
    cache = [];
  }
  return cache;
}

function getWord(id) {
  return loadWords().find((w) => w.id === id) || null;
}

/** Snapshot of the fields that matter for history/analytics stability (see pictionaryTurnSchema.wordVersion). */
function snapshotWord(word) {
  return {
    answer: word.answer, category: word.category, tier: word.tier,
    accepted: [...word.accepted], banned: [...word.banned], related: [...word.related],
  };
}

module.exports = {
  validateWords, loadWords, reload, getWord, snapshotWord, WORDS_PATH, SOURCES,
};
