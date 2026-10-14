// One switch for everything that depends on the Message Content gateway intent.
//
// Discord revoked Message Content for this application on 2026-10-14: the
// server crossed Discord's 10,000-user privileged-intent threshold and the
// review window lapsed (see the note in index.js). Requesting the intent now
// gets the gateway connection rejected ("Used disallowed intents"), so it is
// off, and every user-facing feature that needs message text is switched off
// with it rather than left half-working.
//
// To restore: once the application has Message Content enabled again, set
// MESSAGE_CONTENT_ENABLED to true, redeploy, and restart. That single change
// re-adds the intent in index.js, loads and registers /pictionary again, and
// re-arms the Pictionary manager on boot.
const MESSAGE_CONTENT_ENABLED = false;

// Slash commands that are useless without message text. Hidden from Discord
// entirely (not loaded, not registered by deploy-commands.js) while off.
const MESSAGE_CONTENT_COMMANDS = new Set(['pictionary']);

// Event listeners that only serve Pictionary and are skipped while off.
// pictionaryInteractions.js stays loaded so stale game buttons get a clear
// "temporarily unavailable" reply instead of Discord's "interaction failed".
const MESSAGE_CONTENT_EVENTS = new Set([
  'pictionaryMessages.js',
  'pictionaryMessageEdit.js',
  'pictionaryMessageDelete.js',
  'pictionaryReactionAdd.js',
  'pictionaryReactionRemove.js',
]);

const UNAVAILABLE_NOTICE = 'Pictionary is temporarily unavailable while the bot is waiting on Discord to restore message access. It will be back as soon as that is sorted.';

function isCommandDisabled(name) {
  return !MESSAGE_CONTENT_ENABLED && MESSAGE_CONTENT_COMMANDS.has(name);
}

function isEventDisabled(fileName) {
  return !MESSAGE_CONTENT_ENABLED && MESSAGE_CONTENT_EVENTS.has(fileName);
}

module.exports = {
  MESSAGE_CONTENT_ENABLED,
  MESSAGE_CONTENT_COMMANDS,
  MESSAGE_CONTENT_EVENTS,
  UNAVAILABLE_NOTICE,
  isCommandDisabled,
  isEventDisabled,
};
