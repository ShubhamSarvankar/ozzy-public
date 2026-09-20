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

// The "joint pool": every unit word this parser understands, all mapped
// into the same table, so "every N <unit>", "every other <unit>" and bare
// "<unit>ly"-style synonyms are ONE piece of logic applied uniformly across
// seconds/minutes/hours/days/weeks/months/years, instead of a pile of
// separately hand-written regexes per granularity (which is exactly how
// "every 2 hours" and "every 30 minutes" ended up silently unsupported
// before — new units had to be added one at a time, by hand, per pattern).
// Adding a new unit word (an abbreviation, a typo people commonly make,
// etc.) only ever means adding one entry here.
const UNIT_TO_FREQ = {
  second: RRule.SECONDLY, seconds: RRule.SECONDLY, sec: RRule.SECONDLY, secs: RRule.SECONDLY,
  minute: RRule.MINUTELY, minutes: RRule.MINUTELY, min: RRule.MINUTELY, mins: RRule.MINUTELY,
  hour: RRule.HOURLY, hours: RRule.HOURLY, hr: RRule.HOURLY, hrs: RRule.HOURLY,
  day: RRule.DAILY, days: RRule.DAILY,
  week: RRule.WEEKLY, weeks: RRule.WEEKLY,
  month: RRule.MONTHLY, months: RRule.MONTHLY,
  year: RRule.YEARLY, years: RRule.YEARLY,
};
const UNIT_NAMES_GROUP = `(?:${Object.keys(UNIT_TO_FREQ).join('|')})`;

// One-word idioms that name a frequency outright, with no "every" needed.
const BARE_FREQUENCY_WORDS = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  quarterly: { freq: RRule.MONTHLY, interval: 3 },
  yearly: RRule.YEARLY,
  annually: RRule.YEARLY,
  hourly: RRule.HOURLY,
  biweekly: { freq: RRule.WEEKLY, interval: 2 },
  fortnightly: { freq: RRule.WEEKLY, interval: 2 },
};

const MIN_INTERVAL_MS = 60 * 1000; // spam guard — see the check in parseRecurrence

const UNIT_MS = {
  [RRule.SECONDLY]: 1000,
  [RRule.MINUTELY]: 60 * 1000,
  [RRule.HOURLY]: 60 * 60 * 1000,
};

const SUPPORTED_EXAMPLES = [
  '`every 30 minutes`', '`every 2 hours`', '`daily`', '`every 3 days`', '`every other day`',
  '`weekly`', '`every 2 weeks`', '`biweekly`', '`weekdays`', '`every monday`',
  '`every monday, wednesday, friday`', '`every first monday of the month`', '`every last friday of the month`',
  '`monthly`', '`quarterly`', '`every 6 months`', '`yearly`',
].join(', ');

// Frequencies finer than daily (hourly/minutely/secondly) describe a
// literal elapsed-time interval ("remind me every 2 hours" means real
// clock hours, full stop) rather than a recurring point on the calendar —
// unlike "every day at 9am", nobody expects "every 2 hours" to skip or
// repeat an hour across a DST transition. These are scheduled with plain
// real-instant arithmetic elsewhere in this module and never need (or
// accept) an explicit time-of-day.
function isSubDaily(freq) {
  return freq > RRule.DAILY;
}

function matchPattern(text) {
  const t = text.trim().toLowerCase();

  let m;

  // --- Weekday-structural patterns first (need BYDAY/BYSETPOS, which the
  // generic unit table below can't express) ---
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(first|second|third|fourth|last)\\s+(${WEEKDAY_NAMES_GROUP})\\s+of\\s+the\\s+month\\b`)))) {
    return {
      freq: RRule.MONTHLY,
      interval: 1,
      byweekday: [WEEKDAY_CODES[m[2]]],
      bysetpos: [POSITION_TO_SETPOS[m[1]]],
    };
  }
  if (/^weekdays?\b/.test(t) || new RegExp(`^${EVERY}\\s+weekdays?\\b`).test(t)) {
    return { freq: RRule.WEEKLY, interval: 1, byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR] };
  }
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(${WEEKDAY_NAMES_GROUP}(?:\\s*,?\\s*(?:and\\s+)?${WEEKDAY_NAMES_GROUP})*)\\b`)))) {
    const names = m[1].split(/\s*,\s*|\s+and\s+/).filter(Boolean);
    const byweekday = names.map((n) => WEEKDAY_CODES[n]);
    return { freq: RRule.WEEKLY, interval: 1, byweekday };
  }

  // --- Named idioms with a fixed, non-derivable meaning ---
  if ((m = t.match(new RegExp(`^(${Object.keys(BARE_FREQUENCY_WORDS).join('|')})\\b`)))) {
    const value = BARE_FREQUENCY_WORDS[m[1]];
    return typeof value === 'object' ? { ...value } : { freq: value, interval: 1 };
  }

  // --- The joint pool: "every/each [other|N] <unit>", any unit ---
  if ((m = t.match(new RegExp(`^${EVERY}\\s+other\\s+(${UNIT_NAMES_GROUP})\\b`)))) {
    return { freq: UNIT_TO_FREQ[m[1]], interval: 2 };
  }
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(\\d+)\\s+(${UNIT_NAMES_GROUP})\\b`)))) {
    return { freq: UNIT_TO_FREQ[m[2]], interval: Number(m[1]) };
  }
  if ((m = t.match(new RegExp(`^${EVERY}\\s+(${UNIT_NAMES_GROUP})\\b`)))) {
    return { freq: UNIT_TO_FREQ[m[1]], interval: 1 };
  }

  return null;
}

/**
 * Parses a recurrence phrase like "every monday at 10am" or "every 2 hours"
 * into an rrule.js RRule, plus the concrete first occurrence as a real UTC
 * instant.
 *
 * @param {string} repeatText - e.g. "every monday at 10am", "every 2 hours"
 * @param {object} opts
 * @param {string} opts.timezone - IANA tzid to interpret the schedule in
 * @param {Date} [opts.now] - reference instant, defaults to current time
 * @param {{ kind: 'none'|'count'|'until', count?: number, untilText?: string, until?: Date }} [opts.endCondition]
 */
function parseRecurrence(repeatText, { timezone, now = new Date(), endCondition = { kind: 'none' } } = {}) {
  if (typeof repeatText !== 'string' || !repeatText.trim()) {
    throw new Error('Please describe how often this should repeat.');
  }

  const pattern = matchPattern(repeatText);
  if (!pattern) {
    throw new Error(`Couldn't understand that recurrence. Try things like: ${SUPPORTED_EXAMPLES}.`);
  }

  if (isSubDaily(pattern.freq)) {
    return buildSubDailyRule(pattern, { timezone, now, endCondition });
  }
  return buildCalendarRule(pattern, repeatText, { timezone, now, endCondition });
}

// Hourly/minutely/secondly: plain elapsed-time arithmetic on real instants —
// no field-space conversion, no "at <time>" clause (there's no single daily
// anchor time to ask for), just "starting now, every N units". `timezone`
// only matters here for interpreting an "until <date>" end condition, which
// is still a real calendar date the user means in their own zone even
// though the recurrence itself has no daily anchor time.
function buildSubDailyRule(pattern, { timezone, now, endCondition }) {
  const intervalMs = pattern.interval * UNIT_MS[pattern.freq];
  if (intervalMs < MIN_INTERVAL_MS) {
    throw new Error('The shortest recurrence interval allowed is 1 minute, to keep reminders from turning into spam.');
  }

  let until = null;
  if (endCondition.kind === 'until') {
    until = endCondition.until || parseWhen(endCondition.untilText, { referenceDate: now, timezone }).date;
  }

  // `count` is deliberately never passed to RRule here — see the note above
  // buildCalendarRule's equivalent construction for why.
  const rule = new RRule({
    freq: pattern.freq,
    interval: pattern.interval,
    dtstart: now,
    until: until || undefined,
  });

  // dtstart is `now` itself, which iCal treats as occurrence #1 — exclusive
  // `after` skips it so creating "every 2 hours" fires 2 hours from now,
  // not immediately.
  const firstOccurrence = rule.after(now, false);
  if (!firstOccurrence) {
    throw new Error('That recurrence has no occurrences after now — check the end date/count.');
  }

  return {
    rruleText: rule.toString(),
    firstOccurrence,
    summary: rule.toText(),
  };
}

// Daily-and-larger: wall-clock-preserving arithmetic via the field-space
// convention in utils/timezoneMath.js, requiring an explicit "at <time>".
function buildCalendarRule(pattern, repeatText, { timezone, now, endCondition }) {
  // Time-of-day is pulled from an isolated "at <time>" clause, not the
  // whole phrase — handing chrono the full text (e.g. "every monday at
  // 9am") makes it find TWO separate date mentions ("monday" and "at 9am")
  // and refuse as ambiguous, since chrono has no notion that "monday" here
  // is part of a recurrence pattern rather than its own date. Calendar
  // recurrences never guess a default time-of-day, since guessing wrong
  // once is bad but guessing wrong on every future occurrence is worse.
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

  // `count` is deliberately never passed to RRule: iCal's COUNT numbers
  // occurrences starting from DTSTART itself, but DTSTART here is only a
  // phase anchor ("today at the target time") that may already be in the
  // past relative to `now` and is then never actually delivered — a native
  // RRULE COUNT would silently spend a slot on that undelivered occurrence,
  // so "repeat-count: 3" could end up firing only 2 times. Instead, a
  // `count` end condition is enforced purely against the reminder's own
  // `occurrencesFired` counter in utils/reminderManager.js, counting only
  // real deliveries. `until` doesn't have this problem (it's a date cutoff,
  // not a slot count) and stays baked into the RRULE as normal.
  const rule = new RRule({
    freq: pattern.freq,
    interval: pattern.interval,
    byweekday: pattern.byweekday,
    bysetpos: pattern.bysetpos,
    dtstart,
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

  if (isSubDaily(rule.options.freq)) {
    return rule.after(afterRealInstant, false);
  }

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
