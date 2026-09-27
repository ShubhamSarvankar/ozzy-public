// Wins and kills from stored game results (live and backfilled alike),
// combined across solo, squad and the original /hg.

const { OZZY_IDS } = require('./constants');

// Collapse one game's kill events into [{ userId, count }] for storage.
function killCounts(kills) {
  const counts = new Map();
  for (const k of kills) counts.set(k.killerId, (counts.get(k.killerId) || 0) + 1);
  return [...counts].map(([userId, count]) => ({ userId, count }));
}

/**
 * @param results [{ winnerIds: [String], kills: [{ userId, count }] }]
 * @returns [{ userId, wins, kills }] best first: most wins, then most kills.
 */
function totals(results, exclude = OZZY_IDS) {
  const skip = new Set(exclude);
  const byUser = new Map();
  const row = (id) => {
    if (!byUser.has(id)) byUser.set(id, { userId: id, wins: 0, kills: 0 });
    return byUser.get(id);
  };
  for (const r of results) {
    for (const id of r.winnerIds || []) if (!skip.has(id)) row(id).wins++;
    for (const k of r.kills || []) if (!skip.has(k.userId)) row(k.userId).kills += k.count;
  }
  return [...byUser.values()].sort((a, b) => b.wins - a.wins || b.kills - a.kills || a.userId.localeCompare(b.userId));
}

function userTotals(results, userId) {
  return totals(results, []).find((r) => r.userId === userId) || { userId, wins: 0, kills: 0 };
}

module.exports = { killCounts, totals, userTotals };
