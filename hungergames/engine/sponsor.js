// Sponsorship: people who aren't alive in the game (fallen tributes and
// spectators) each back one living tribute per round. The most-backed tribute
// gets a gift at the start of the next phase.

const { pick, chance } = require('./rng');
const { WEAPONS } = require('./weapons');
const { SQUAD_LOOT } = require('./squad');
const { weaponLabel } = require('./format');

const GIFT_HEAL = 25;

function canSponsor(game, userId) {
  return !game.players.some((p) => p.id === userId && p.alive);
}

/**
 * @param votes Map of voterId -> tributeId
 * @returns the winning tribute id, or null if nobody living was backed.
 *          Ties are broken at random.
 */
function tallySponsor(game, votes) {
  const alive = new Set(game.players.filter((p) => p.alive).map((p) => p.id));
  const counts = new Map();
  for (const target of votes.values()) {
    if (alive.has(target)) counts.set(target, (counts.get(target) || 0) + 1);
  }
  if (counts.size === 0) return null;
  const top = Math.max(...counts.values());
  return pick([...counts].filter(([, n]) => n === top).map(([id]) => id));
}

// Half the time a heal, otherwise a new weapon from the mode's pool.
function applySponsorGift(game, tributeId) {
  const player = game.players.find((p) => p.id === tributeId && p.alive);
  if (!player) return null;
  if (chance(0.5)) {
    player.heal(GIFT_HEAL);
    return `🪂 A parachute drifts down to <@${player.id}>: medicine from the sponsors! (+${GIFT_HEAL} HP)`;
  }
  const pool = game.mode === 'squad' ? SQUAD_LOOT : WEAPONS;
  const key = pick(Object.keys(pool));
  player.addWeapon(key);
  return `🪂 A parachute drifts down to <@${player.id}>. Inside: ${weaponLabel(pool[key].name)}!`;
}

module.exports = { canSponsor, tallySponsor, applySponsorGift, GIFT_HEAL };
