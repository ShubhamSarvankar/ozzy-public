const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

const MIN_MS = 60 * 1000; // 1 minute
const MAX_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const SEGMENT_RE = /(\d+)\s*(w|d|h|m|s)/gi;

/**
 * Parses compound duration strings like "2h", "1d12h", "1w" into milliseconds.
 * Throws with a user-facing message on invalid or out-of-range input.
 */
function parseDuration(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Please provide a duration, e.g. `10m`, `2h`, `1d12h`, `1w`.');
  }

  const trimmed = input.trim();
  let match;
  let totalMs = 0;
  let matchedLength = 0;
  SEGMENT_RE.lastIndex = 0;

  while ((match = SEGMENT_RE.exec(trimmed)) !== null) {
    const [full, amount, unit] = match;
    totalMs += Number(amount) * UNIT_MS[unit.toLowerCase()];
    matchedLength += full.length;
  }

  if (totalMs === 0 || matchedLength !== trimmed.replace(/\s+/g, '').length) {
    throw new Error(`Couldn't parse duration \`${input}\`. Use a format like \`10m\`, \`2h\`, \`1d12h\`, or \`1w\`.`);
  }

  if (totalMs < MIN_MS) {
    throw new Error('Duration must be at least 1 minute.');
  }

  if (totalMs > MAX_MS) {
    throw new Error('Duration must be at most 90 days.');
  }

  return totalMs;
}

module.exports = { parseDuration, MIN_MS, MAX_MS };
