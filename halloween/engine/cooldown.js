// Pure cooldown math. nextAllowedAt is a Date (or null when the feature has
// never fired). The inclusive comparison matches the $lte in the manager's
// atomic Mongo claim so the in-memory fast path and the database agree.

function canFire(nextAllowedAt, now) {
  if (!nextAllowedAt) return true;
  const at = nextAllowedAt instanceof Date ? nextAllowedAt.getTime() : new Date(nextAllowedAt).getTime();
  if (Number.isNaN(at)) return true;
  return now >= at;
}

function nextAllowedAfter(now, cooldownMs) {
  return new Date(now + cooldownMs);
}

module.exports = { canFire, nextAllowedAfter };
