const { RRule } = require('rrule');
const { parseWhen } = require('./parseReminderTime');
const { wallFieldsToUtc, utcToFieldSpace } = require('./timezoneMath');

const WEEKDAY_CODES = {
  monday: RRule.MO, tuesday: RRule.TU, wednesday: RRule.WE, thursday: RRule.TH,
  friday: RRule.FR, saturday: RRule.SA, sunday: RRule.SU,
};
const WEEKDAY_NAMES = Object.keys(WEEKDAY_CODES).join('|');
// Non-capturing-group-wrapped version for splicing into a larger regex —
// `|` has the lowest precedence of any regex operator, so splicing the bare
// alternation into `(${WEEKDAY_NAMES}(?:...)*)` would silently bind the
// repeating group to only the last alternative ("sunday") instead of the
// whole list.
const WEEKDAY_NAMES_GROUP = `(?:${WEEKDAY_NAMES})`;
const POSITION_TO_SETPOS = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };

// "every" and "each" are interchangeable everywhere a pattern below expects
// a leading frequency word ("each monday at 9am" reads as naturally as
// "every monday at 9am").
const EVERY = '(?:every|each)';

const SUPPORTED_EXAMPLES = [
  '`daily`', '`every 3 days`', '`every other day`', '`weekly`', '`every 2 weeks`', '`biweekly`',
  '`weekdays`', '`every monday`', '`every monday, wednesday, friday`',
  '`every first monday of the month`', '`every last friday of the month`',
  '`monthly`', '`quarterly`', '`every 6 months`', '`yearly`',
].join(', ');

function matchPattern(text) {
  const t = text.trim().toLowerCase();

  let m;

  // --- Daily ---
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(\\d+)\\s+days?\\b`)))) {
    return { freq: RRule.DAILY, interval: Number(m[1]) };
  }
  if (new RegExp(`^${EVERY}\\s+other\\s+day\\b`).test(t)) {
    return { freq: RRule.DAILY, interval: 2 };
  }
  if (new RegExp(`^${EVERY}\\s+day\\b`).test(t) || /^daily\b/.test(t)) {
    return { freq: RRule.DAILY, interval: 1 };
  }

  // --- Weekly / weekday-specific ---
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(\\d+)\\s+weeks?\\b`)))) {
    return { freq: RRule.WEEKLY, interval: Number(m[1]) };
  }
  if (new RegExp(`^${EVERY}\\s+other\\s+week\\b`).test(t) || /^(biweekly|fortnightly)\b/.test(t)) {
    return { freq: RRule.WEEKLY, interval: 2 };
  }
  if (/^weekdays?\b/.test(t) || new RegExp(`^${EVERY}\\s+weekdays?\\b`).test(t)) {
    return { freq: RRule.WEEKLY, interval: 1, byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR] };
  }
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(${WEEKDAY_NAMES_GROUP}(?:\\s*,?\\s*(?:and\\s+)?${WEEKDAY_NAMES_GROUP})*)\\b`)))) {
    const names = m[1].split(/\s*,\s*|\s+and\s+/).filter(Boolean);
    const byweekday = names.map((n) => WEEKDAY_CODES[n]);
    return { freq: RRule.WEEKLY, interval: 1, byweekday };
  }

  // --- Monthly (including "Nth weekday of the month") ---
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(first|second|third|fourth|last)\\s+(${WEEKDAY_NAMES_GROUP})\\s+of\\s+the\\s+month\\b`)))) {
    return {
      freq: RRule.MONTHLY,
      interval: 1,
      byweekday: [WEEKDAY_CODES[m[2]]],
      bysetpos: [POSITION_TO_SETPOS[m[1]]],
    };
  }
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(\\d+)\\s+months?\\b`)))) {
    return { freq: RRule.MONTHLY, interval: Number(m[1]) };
  }
  if (/^quarterly\b/.test(t)) {
    return { freq: RRule.MONTHLY, interval: 3 };
  }
  if (new RegExp(`^${EVERY}\\s+month\\b`).test(t) || /^monthly\b/.test(t)) {
    return { freq: RRule.MONTHLY, interval: 1 };
  }
  if (new RegExp(`^${EVERY}\\s+week\\b`).test(t) || /^weekly\b/.test(t)) {
    return { freq: RRule.WEEKLY, interval: 1 };
  }

  // --- Yearly ---
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(\\d+)\\s+years?\\b`)))) {
    return { freq: RRule.YEARLY, interval: Number(m[1]) };
  }
  if (new RegExp(`^${EVERY}\\s+year\\b`).test(t) || /^(yearly|annually)\b/.test(t)) {
    return { freq: RRule.YEARLY, interval: 1 };
  }

  return null;
}

/**
 * Parses a recurrence phrase like "every monday at 10am" into an rrule.js
 * RRule, plus the concrete first occurrence as a real UTC instant.
 *
 * @param {string} repeatText - e.g. "every monday at 10am", "weekdays at 8am"
 * @param {object} opts
 * @param {string} opts.timezone - IANA tzid to interpret the schedule in
 * @param {Date} [opts.now] - reference instant, defaults to current time
 * @param {{ kind: 'none'|'count'|'until', count?: number, untilText?: string }} [opts.endCondition]
 */
function parseRecurrence(repeatText, { timezone, now = new Date(), endCondition = { kind: 'none' } } = {}) {
  if (typeof repeatText !== 'string' || !repeatText.trim()) {
    throw new Error('Please describe how often this should repeat.');
  }

  const pattern = matchPattern(repeatText);
  if (!pattern) {
    throw new Error(`Couldn't understand that recurrence. Try things like: ${SUPPORTED_EXAMPLES}.`);
  }

  // Time-of-day is required and pulled from an isolated "at <time>" clause,
  // not the whole phrase — handing chrono the full text (e.g. "every monday
  // at 9am") makes it find TWO separate date mentions ("monday" and "at
  // 9am") and refuse as ambiguous, since chrono has no notion that "monday"
  // here is part of a recurrence pattern rather than its own date. Recurring
  // reminders never guess a default time-of-day, since guessing wrong once
  // is bad but guessing wrong on every future occurrence is worse.
  const timeClauseMatch = repeatText.match(/\bat\s+(.+)$/i);
  if (!timeClauseMatch) {
    throw new Error(`Please include a specific time, e.g. "${repeatText.trim()} at 9am".`);
  }
  let timeParse;
  try {
    timeParse = parseWhen(timeClauseMatch[1].trim(), { referenceDate: now, timezone });
  } catch {
    timeParse = null;
  }
  if (!timeParse || !timeParse.hourIsCertain) {
    throw new Error(`Please include a specific time, e.g. "${repeatText.trim()} at 9am".`);
  }

  const timeFields = utcToFieldSpace(timeParse.date, timezone);
  const hour = timeFields.getUTCHours();
  const minute = timeFields.getUTCMinutes();

  const nowFields = utcToFieldSpace(now, timezone);
  const dtstart = new Date(Date.UTC(
    nowFields.getUTCFullYear(), nowFields.getUTCMonth(), nowFields.getUTCDate(),
    hour, minute, 0
  ));

  let until = null;
  if (endCondition.kind === 'until') {
    // Accepts either fresh natural-language text (`untilText`, the normal
    // create-time path) or an already-resolved real instant (`until`, used
    // when re-deriving an RRule from a stored endCondition — e.g. editing a
    // recurring reminder's repeat phrase without re-parsing its unchanged
    // end date through chrono a second time).
    const untilInstant = endCondition.until || parseWhen(endCondition.untilText, { referenceDate: now, timezone }).date;
    const untilFields = utcToFieldSpace(untilInstant, timezone);
    until = new Date(Date.UTC(
      untilFields.getUTCFullYear(), untilFields.getUTCMonth(), untilFields.getUTCDate(),
      untilFields.getUTCHours(), untilFields.getUTCMinutes(), 0
    ));
  }

  const rule = new RRule({
    freq: pattern.freq,
    interval: pattern.interval,
    byweekday: pattern.byweekday,
    bysetpos: pattern.bysetpos,
    dtstart,
    count: endCondition.kind === 'count' ? endCondition.count : undefined,
    until: until || undefined,
  });

  // First real occurrence at/after now — dtstart above is just the pattern's
  // phase anchor (today at the target time), which may already be in the
  // past relative to `now`; ratchet forward to the true next one.
  const nowFieldSpace = utcToFieldSpace(now, timezone);
  const firstFieldSpace = rule.after(nowFieldSpace, true);
  if (!firstFieldSpace) {
    throw new Error('That recurrence has no occurrences after now — check the end date/count.');
  }
  const firstOccurrence = wallFieldsToUtc(
    firstFieldSpace.getUTCFullYear(), firstFieldSpace.getUTCMonth() + 1, firstFieldSpace.getUTCDate(),
    firstFieldSpace.getUTCHours(), firstFieldSpace.getUTCMinutes(), firstFieldSpace.getUTCSeconds(),
    timezone
  );

  return {
    rruleText: rule.toString(),
    firstOccurrence,
    summary: rule.toText(),
    hour,
    minute,
  };
}

// Given a persisted rruleText and the real-instant occurrence that most
// recently fired (or the current nextTrigger), returns the next real UTC
// instant to schedule, or null if the rule is exhausted (COUNT/UNTIL hit).
function nextOccurrence(rruleText, afterRealInstant, timezone) {
  const rule = RRule.fromString(rruleText);
  const afterFieldSpace = utcToFieldSpace(afterRealInstant, timezone);
  const nextFieldSpace = rule.after(afterFieldSpace, false);
  if (!nextFieldSpace) return null;

  return wallFieldsToUtc(
    nextFieldSpace.getUTCFullYear(), nextFieldSpace.getUTCMonth() + 1, nextFieldSpace.getUTCDate(),
    nextFieldSpace.getUTCHours(), nextFieldSpace.getUTCMinutes(), nextFieldSpace.getUTCSeconds(),
    timezone
  );
}

function describeRule(rruleText) {
  return RRule.fromString(rruleText).toText();
}

module.exports = { parseRecurrence, nextOccurrence, describeRule, SUPPORTED_EXAMPLES };
