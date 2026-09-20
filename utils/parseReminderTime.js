const chrono = require('chrono-node');

// A single parse result is accepted regardless of which fields chrono had
// to imply (e.g. "at 8pm" implying today-vs-tomorrow) — the confirmation
// step shown to the user (a Discord <t:...> timestamp) IS the
// disambiguation UI, not this function. Only two failure modes are treated
// as unrecoverable here: chrono finding nothing at all, or finding more
// than one distinct date/time mention in a single string.
function parseWhen(text, { referenceDate = new Date(), timezone = 'UTC' } = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Please provide a time, e.g. "in 45 minutes", "next friday", or "tonight at 8".');
  }

  const results = chrono.parse(text, referenceDate, { timezone });

  if (results.length === 0) {
    throw new Error(`Couldn't figure out a date/time from "${text}". Try things like "tomorrow at 3pm", "next friday", or "in 2 hours".`);
  }
  if (results.length > 1) {
    throw new Error(`That looks like it mentions more than one date/time ("${results.map(r => r.text).join('", "')}"). Please give just one.`);
  }

  const result = results[0];
  const date = result.start.date();

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Couldn't figure out a date/time from "${text}". Try things like "tomorrow at 3pm", "next friday", or "in 2 hours".`);
  }

  return {
    date,
    matchedText: result.text,
    hourIsCertain: result.start.isCertain('hour'),
  };
}

module.exports = { parseWhen };
