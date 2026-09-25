// Hard-violation detection for Actor clue messages. Only mechanically certain
// cases are flagged; anything ambiguous returns null and is left to the Host/veto.
const { tokens, compact, pluralForms, containsSequence } = require('./normalize');

const NUMBER_WORDS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty';
const LETTER_COUNT_RE = new RegExp(`\\b(?:\\d+|${NUMBER_WORDS})\\s+(?:letters?|characters?|chars?)\\b|\\b(?:letter|character)\\s+count\\b|\\bnumber\\s+of\\s+(?:letters|characters)\\b`);
const POSITION_LETTER_RE = /\b(?:first|last|final|1st|second to last)\s+(?:letter|character|char)\b/;
const STARTS_WITH_LETTER_RE = /\b(?:starts?|begins?|starting|beginning|ends?|ending)\s+(?:with|in)\s+(?:the\s+|a\s+|an\s+)?(?:letter|sound)\b/;
// "starts with b": single character that is not the article a/i, at the end of the message or before more text is ignored
const STARTS_WITH_CHAR_RE = /\b(?:starts?|begins?|starting|beginning|ends?|ending)\s+(?:with|in)\s+(?:the\s+)?[b-hj-z0-9](?:\s*$)/;
const IMAGE_URL_RE = /https?:\/\/\S+\.(?:png|jpe?g|gif|gifv|webp|mp4|webm|mov)\b|https?:\/\/(?:[\w-]+\.)?(?:tenor|giphy|imgur)\.com\S*|https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\S*/i;

/** Normalized forms an Actor may never say: answer, accepted aliases, banned list, each with plurals. */
function bannedForms(word) {
  const raw = [word.answer, ...(word.accepted || []), ...(word.banned || [])];
  const forms = new Set();
  for (const r of raw) for (const f of pluralForms(r)) forms.add(f);
  return [...forms];
}

function findBannedTerm(toks, forms) {
  for (const form of forms) {
    if (containsSequence(toks, form.split(' '))) return form;
  }
  return null;
}

/** Spelling via separators: "v o l c a n o", "v.o.l.c.a.n.o". Needs a run of 3+ single characters. */
function findSpelledOut(toks, compactForms) {
  let run = [];
  const flush = () => {
    if (run.length >= 3) {
      const joined = run.join('');
      for (const c of compactForms) if (c.length >= 3 && joined.includes(c)) return c;
    }
    run = [];
    return null;
  };
  for (const t of toks) {
    if (t.length === 1) { run.push(t); continue; }
    const hit = flush();
    if (hit) return hit;
  }
  return flush();
}

/** Word split with separators: "vol-cano", "vol cano". Joins 2 to 4 adjacent tokens. */
function findSplitWord(toks, compactForms) {
  for (let i = 0; i < toks.length; i++) {
    let joined = '';
    for (let len = 1; len <= 4 && i + len <= toks.length; len++) {
      joined += toks[i + len - 1];
      if (len >= 2 && compactForms.has(joined)) return joined;
    }
  }
  return null;
}

function sortLetters(s) {
  return [...s].sort().join('');
}

function findAnagram(toks, word) {
  const target = compact(word.answer);
  if (target.length < 4) return null;
  const sorted = sortLetters(target);
  const known = new Set([target, ...pluralForms(word.answer).map(compact)]);
  for (const t of toks) {
    if (t.length === target.length && !known.has(t) && sortLetters(t) === sorted) return t;
  }
  return null;
}

function hasBlankTemplate(raw) {
  // "v______", "_ _ _ _". Runs of 3+ underscores or spaced pairs. Plain "__markdown__" is left alone.
  return /_{3,}/.test(raw) || /_\s+_/.test(raw);
}

function hasMedia(message) {
  const attachments = message.attachments;
  if (attachments && (attachments.size ?? attachments.length ?? 0) > 0) return true;
  const stickers = message.stickers;
  if (stickers && (stickers.size ?? stickers.length ?? 0) > 0) return true;
  const embeds = message.embeds || [];
  for (const e of embeds) {
    if (e && (e.image || e.video || e.thumbnail || e.type === 'gifv' || e.type === 'image')) return true;
  }
  return IMAGE_URL_RE.test(message.content || '');
}

/**
 * @param message {{content?:string, attachments?, stickers?, embeds?}}
 * @param word vocabulary entry
 * @returns null or {type, detail}
 */
function checkClue(message, word) {
  if (hasMedia(message)) return { type: 'media', detail: 'image, GIF, sticker or attachment' };

  const raw = message.content || '';
  const toks = tokens(raw);
  const forms = bannedForms(word);

  const term = findBannedTerm(toks, forms);
  if (term) return { type: 'banned_word', detail: term };

  const compactForms = new Set(forms.map(compact));
  const spelled = findSpelledOut(toks, compactForms);
  if (spelled) return { type: 'spelled_out', detail: spelled };

  const split = findSplitWord(toks, compactForms);
  if (split) return { type: 'spelled_out', detail: split };

  const normalized = toks.join(' ');
  if (LETTER_COUNT_RE.test(normalized)) return { type: 'letter_count', detail: 'letter count' };
  if (POSITION_LETTER_RE.test(normalized) || STARTS_WITH_LETTER_RE.test(normalized) || STARTS_WITH_CHAR_RE.test(normalized)) {
    return { type: 'letter_hint', detail: 'first or last letter' };
  }
  if (hasBlankTemplate(raw)) return { type: 'blank_template', detail: 'blank template' };

  const anagram = findAnagram(toks, word);
  if (anagram) return { type: 'anagram', detail: anagram };

  return null;
}

/** Player facing label for a violation type. */
const VIOLATION_LABELS = {
  media: 'Sent an image, GIF, sticker or attachment',
  banned_word: 'Used the answer or a banned word',
  spelled_out: 'Spelled out the answer',
  letter_count: 'Gave the letter count',
  letter_hint: 'Gave the first or last letter',
  blank_template: 'Used a blank template',
  anagram: 'Used an anagram of the answer',
};

module.exports = { checkClue, bannedForms, VIOLATION_LABELS };
