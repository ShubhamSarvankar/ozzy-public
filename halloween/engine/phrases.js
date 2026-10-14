// Lines Ozzy reads aloud through Discord TTS when the text scare fires.
// Clients announce them as "Ozzy said: <line>", so keep each one short.

const PHRASES = [
  'Boo!',
  'Did you hear that?',
  'Behind you...',
  'Who turned off the lights?',
  'Something is scratching at the door.',
  'Don\'t look under the table.',
  'I can see you.',
];

function pickPhrase(rng = Math.random) {
  const raw = Math.floor(rng() * PHRASES.length);
  const index = Math.min(PHRASES.length - 1, Math.max(0, raw));
  return PHRASES[index];
}

module.exports = { PHRASES, pickPhrase };
