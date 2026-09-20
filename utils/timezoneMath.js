// rrule (v2.8.1) computes occurrences by adding fixed elapsed time, even
// when `tzid` is set on the RRule — a "daily at 9am America/New_York" rule
// silently drifts to 10am the day after a DST transition if you feed it
// real UTC instants and let it add calendar intervals in UTC. Verified via
// direct testing (`rule.all()` on a range crossing 2026-03-08 spring-forward
// returns evenly-spaced UTC instants, not wall-clock-preserving ones).
//
// The fix used throughout reminderManager/parseRecurrence: rrule is only
// ever given, and only ever asked for, "field-space" dates — Date objects
// whose UTC getters hold the intended LOCAL wall-clock numbers (so DTSTART
// "20260306T090000" is represented as Date.UTC(2026,2,6,9,0,0), not the
// real UTC instant 9am America/New_York actually falls on). rrule's own
// elapsed-time arithmetic then correctly preserves "9:00" in every
// occurrence's field values regardless of DST, because it's just doing
// calendar-day math on those numbers. Every real-world instant (Mongo
// storage, setTimeout scheduling, Discord timestamps) is produced by
// converting field-space <-> real UTC through the two functions below,
// which redo the DST lookup from scratch for the specific date involved.

// Wall-clock fields (as a human would read a clock in `timeZone`) -> the
// real UTC instant they represent on that specific date.
function wallFieldsToUtc(year, month, day, hour, minute, second, timeZone) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second || 0);

  // Converges in at most 2 iterations for any real-world DST offset step;
  // 3 is cheap headroom.
  for (let i = 0; i < 3; i++) {
    const guessedFields = readFieldsAt(new Date(guess), timeZone);
    const asUtcFromGuess = Date.UTC(
      guessedFields.year, guessedFields.month - 1, guessedFields.day,
      guessedFields.hour, guessedFields.minute, guessedFields.second
    );
    const target = Date.UTC(year, month - 1, day, hour, minute, second || 0);
    const diff = asUtcFromGuess - target;
    if (diff === 0) break;
    guess -= diff;
  }

  return new Date(guess);
}

// Real UTC instant -> a "field-space" Date whose UTC getters read back the
// wall-clock time that instant represents in `timeZone`.
function utcToFieldSpace(date, timeZone) {
  const f = readFieldsAt(date, timeZone);
  return new Date(Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second));
}

// The inverse: a field-space Date -> the real UTC instant its field values
// represent as wall-clock time in `timeZone`.
function fieldSpaceToUtc(fieldDate, timeZone) {
  return wallFieldsToUtc(
    fieldDate.getUTCFullYear(), fieldDate.getUTCMonth() + 1, fieldDate.getUTCDate(),
    fieldDate.getUTCHours(), fieldDate.getUTCMinutes(), fieldDate.getUTCSeconds(),
    timeZone
  );
}

function readFieldsAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;

  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // some locales render midnight as "24"

  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    hour, minute: Number(map.minute), second: Number(map.second),
  };
}

function isValidTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

module.exports = { wallFieldsToUtc, utcToFieldSpace, fieldSpaceToUtc, isValidTimeZone };
