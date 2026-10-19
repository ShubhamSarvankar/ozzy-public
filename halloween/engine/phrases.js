// What Ozzy sends as a plain message when the text scare fires: a burst of
// spooky emojis. Every burst contains at least one owl, mixed with a random
// handful of other spooky emojis in a random order. Keep bursts short.

const OWL = '\u{1F989}';

// The pool the owl is mixed with. Plain emoji only (no variation selectors),
// so every entry is exactly one code point and renders cleanly everywhere.
const SPOOKY_EMOJIS = [
  '\u{1F383}', // jack-o-lantern
  '\u{1F47B}', // ghost
  '\u{1F480}', // skull
  '\u{1F987}', // bat
  '\u{1F578}', // spider web
  '\u{1F577}', // spider
  '\u{1F9D9}', // mage
  '\u{1F9DB}', // vampire
  '\u{1F9DF}', // zombie
  '\u{1F56F}', // candle
  '\u{1F311}', // new moon
  '\u{1F319}', // crescent moon
  '\u{1F52E}', // crystal ball
  '\u{1F5DD}', // old key
  '\u{1F3DA}', // derelict house
  '\u{26B0}', // coffin
  '\u{1F36C}', // candy
  '\u{1F36D}', // lollipop
  '\u{1F43A}', // wolf
  '\u{1F408}', // cat
];

const MIN_EXTRAS = 4;
const MAX_EXTRAS = 8;
const MAX_OWLS = 2;

function randomInt(rng, maxExclusive) {
  const raw = Math.floor(rng() * maxExclusive);
  return Math.min(maxExclusive - 1, Math.max(0, raw));
}

// Builds one emoji burst: 1-2 owls plus MIN_EXTRAS..MAX_EXTRAS distinct other
// spooky emojis, shuffled together. Emojis are separated by spaces so they
// read as a burst instead of one run-on token.
function pickPhrase(rng = Math.random) {
  const pool = SPOOKY_EMOJIS.slice();
  const extraCount = MIN_EXTRAS + randomInt(rng, MAX_EXTRAS - MIN_EXTRAS + 1);
  const picked = [];
  for (let i = 0; i < extraCount && pool.length > 0; i++) {
    const idx = randomInt(rng, pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  const owlCount = 1 + randomInt(rng, MAX_OWLS);
  for (let i = 0; i < owlCount; i++) picked.push(OWL);

  // Fisher-Yates shuffle so the owl lands anywhere in the burst.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.join(' ');
}

module.exports = { OWL, SPOOKY_EMOJIS, pickPhrase };
