// Points and standings. Everything is derived from Turn records, so a veto only
// needs to flip `annulled` on the turn. Nothing has to be reversed elsewhere.

/** Tier 1 = normal points. Tier 2 = double points (reserved, unused at launch). */
function tierMultiplier(tier) {
  return tier === 2 ? 2 : 1;
}

/** Points a turn would award. 1 to the guesser and 1 to the actor on a correct guess. */
function pointsForTurn(turn) {
  if (turn.status !== 'guessed') return { actor: 0, guesser: 0 };
  const m = tierMultiplier(turn.tier);
  return { actor: m, guesser: m };
}

/** Points for a turn after annulment: annulled turns count for nothing. */
function effectivePoints(turn) {
  if (turn.annulled) return { actor: 0, guesser: 0 };
  return {
    actor: typeof turn.pointsActor === 'number' ? turn.pointsActor : pointsForTurn(turn).actor,
    guesser: typeof turn.pointsGuesser === 'number' ? turn.pointsGuesser : pointsForTurn(turn).guesser,
  };
}

/**
 * Ranked standings. Ties share a rank (1, 1, 3), no tiebreakers.
 * @param turns turn records for one game
 * @param participantIds users to include even at zero points
 */
function standings(turns, participantIds = []) {
  const totals = new Map();
  for (const id of participantIds) totals.set(id, 0);
  for (const t of turns) {
    const p = effectivePoints(t);
    if (p.actor && t.actorId) totals.set(t.actorId, (totals.get(t.actorId) || 0) + p.actor);
    if (p.guesser && t.guesserId) totals.set(t.guesserId, (totals.get(t.guesserId) || 0) + p.guesser);
  }
  const rows = [...totals].map(([userId, points]) => ({ userId, points }));
  rows.sort((a, b) => b.points - a.points);
  let lastPoints = null;
  let lastRank = 0;
  rows.forEach((row, i) => {
    if (row.points !== lastPoints) { lastRank = i + 1; lastPoints = row.points; }
    row.rank = lastRank;
  });
  return rows;
}

/** Top three ranks, tied players together. Users with zero points never place. */
function podium(rows) {
  return rows.filter((r) => r.rank <= 3 && r.points > 0);
}

module.exports = { tierMultiplier, pointsForTurn, effectivePoints, standings, podium };
