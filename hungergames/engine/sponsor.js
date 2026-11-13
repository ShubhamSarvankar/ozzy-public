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
  game.giftCounts = game.giftCounts || {};
  game.giftCounts[tributeId] = (game.giftCounts[tributeId] || 0) + 1;
  if (chance(0.5)) {
    player.heal(GIFT_HEAL);
    return `🪂 A parachute drifts down to <@${player.id}>: medicine from the sponsors! (+${GIFT_HEAL} HP)`;
  }
  const pool = game.mode === 'squad' ? SQUAD_LOOT : WEAPONS;
  const key = pick(Object.keys(pool));
  player.addWeapon(key);
  return `🪂 A parachute drifts down to <@${player.id}>. Inside: ${weaponLabel(pool[key].name)}!`;
}

// How many sponsor gifts a tribute has received this game.
function giftCount(game, tributeId) {
  return game.giftCounts?.[tributeId] || 0;
}

/**
 * Lines for the public "Sponsors this round" message: who backs whom, then
 * the current standings of the vote. Picks for tributes who have since died
 * are left out, since they can't win the gift.
 * @param votes Map of voterId -> tributeId
 */
function sponsorBoardLines(game, votes) {
  const alive = new Set(game.players.filter((p) => p.alive).map((p) => p.id));
  const picks = [...votes].filter(([, target]) => alive.has(target));
  if (picks.length === 0) return ['Nobody has backed a tribute yet.'];
  const counts = new Map();
  for (const [, target] of picks) counts.set(target, (counts.get(target) || 0) + 1);
  const standings = [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `<@${id}>: ${n} backer${n === 1 ? '' : 's'}`);
  return [
    ...picks.map(([voter, target]) => `<@${voter}> backs <@${target}>`),
    '',
    '**Standings**',
    ...standings,
  ];
}

module.exports = {
  canSponsor, tallySponsor, applySponsorGift, giftCount, sponsorBoardLines, GIFT_HEAL,
};
