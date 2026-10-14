// Pure season gate for the Halloween scares. Active from Oct 1 00:00 UTC
// through the end of Nov 1 UTC, every year. UTC getters keep the boundary
// deterministic in tests on any machine; the host container runs on UTC too.

function isHalloweenSeason(date) {
  const d = date instanceof Date ? date : new Date(date);
  const month = d.getUTCMonth(); // 0-based: 9 = October, 10 = November
  if (month === 9) return true;
  if (month === 10 && d.getUTCDate() === 1) return true;
  return false;
}

module.exports = { isHalloweenSeason };
