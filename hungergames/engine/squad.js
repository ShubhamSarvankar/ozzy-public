// Squad battle royale as a pure state machine, same contract as solo.js.
//
// Each ring: some safe zones turn dangerous, every squad moves (usually to a
// safe zone, sometimes a risky danger zone with better loot), everyone
// searches, then squads sharing a zone fight. When at most one safe zone is
// left, every squad is sent to a single showdown zone and battles repeat
// until one squad remains.

const { Player } = require('./player');
const { PhaseLog, preventWipe } = require('./phase');
const { SPECIALS, HEALS, ZONES } = require('./zones');
const { pick, chance, shuffle } = require('./rng');

const SQUAD_SIZE = 2;
const STARTING_SAFE_ZONES = ['plaza', 'forest', 'stadium', 'cove', 'town', 'snowforts', 'skihill', 'dojo', 'coffeeshop', 'pizzaparlor', 'lighthouse', 'boxdimension'];
const DANGER_DAMAGE = 30;
const RISKY_MOVE_CHANCE = 0.15;
const SPECIAL_FIND_CHANCE = 0.5;
const HEAL_FIND_CHANCE = 0.2;

// Every squad weapon by key, so a Player can hold plain keys like in solo.
const SQUAD_LOOT = {
  ...SPECIALS,
  ...Object.assign({}, ...Object.values(ZONES).map((z) => z.loot)),
};

const zoneName = (key) => ZONES[key]?.name || key;

// Lobby helper: fill the first squad with a free slot, else open a new one.
function addToSquads(squads, id) {
  const open = squads.find((s) => s.length < SQUAD_SIZE);
  if (open) open.push(id);
  else squads.push([id]);
  return squads;
}

/**
 * @param squadEntries array of squads, each an array of { id, avatar }
 */
function createSquadGame(squadEntries) {
  const players = [];
  const squads = squadEntries.map((members, i) => {
    const ps = members.map((e) => new Player(e.id, e.avatar));
    players.push(...ps);
    return { name: `Squad ${i + 1}`, playerIds: ps.map((p) => p.id), zone: null, inDanger: false };
  });
  return {
    mode: 'squad',
    players,
    squads,
    safeZones: [...STARTING_SAFE_ZONES],
    dangerZones: [],
    ring: 0,
    finalShowdown: null,
    nextPhase: 'ring',
    winnerIds: null,
  };
}

const byId = (game, id) => game.players.find((p) => p.id === id);
const members = (game, squad) => squad.playerIds.map((id) => byId(game, id));
const aliveMembers = (game, squad) => members(game, squad).filter((p) => p.alive);
const aliveSquads = (game) => game.squads.filter((s) => aliveMembers(game, s).length > 0);

function advanceRing(game) {
  const count = Math.min(chance(0.2) ? 2 : 3, game.safeZones.length);
  if (count === 0) return;
  const infected = shuffle(game.safeZones).slice(0, count);
  game.safeZones = game.safeZones.filter((z) => !infected.includes(z));
  game.dangerZones.push(...infected);
}

function allocateSquads(game) {
  if (game.safeZones.length <= 1) {
    if (!game.finalShowdown) {
      game.finalShowdown = game.safeZones.length === 1 ? game.safeZones[0] : pick(game.dangerZones);
    }
    for (const s of game.squads) {
      s.zone = game.finalShowdown;
      s.inDanger = true;
    }
    return;
  }
  for (const s of game.squads) {
    const risky = chance(RISKY_MOVE_CHANCE) && game.dangerZones.length > 0;
    s.zone = risky ? pick(game.dangerZones) : pick(game.safeZones);
    s.inDanger = risky;
  }
}

function search(game, log, player, zone) {
  const inDanger = game.dangerZones.includes(zone) && game.safeZones.length > 1;
  if (inDanger) {
    return log.expose(player, () => {
      player.takeDamage(DANGER_DAMAGE);
      let text = `The ring closes in on <@${player.id}>, dealing ${DANGER_DAMAGE} damage!`;
      if (!player.alive) return `${text} They don't make it out.`;
      if (chance(SPECIAL_FIND_CHANCE)) {
        const key = pick(Object.keys(SPECIALS));
        player.addWeapon(key);
        text += ` But in the chaos, they found ${SPECIALS[key].discovery(player)}!`;
      } else {
        text += ' They searched but found nothing of value.';
      }
      return text;
    });
  }
  if (chance(HEAL_FIND_CHANCE)) return HEALS[pick(Object.keys(HEALS))].discovery(player);
  const loot = ZONES[zone]?.loot;
  if (!loot || Object.keys(loot).length === 0) return `<@${player.id}> found nothing!`;
  const key = pick(Object.keys(loot));
  player.addWeapon(key);
  return loot[key].discovery(player);
}

const PHASES = {
  ring(game, log, sections) {
    advanceRing(game);
    allocateSquads(game);
    game.ring++;
    for (const s of aliveSquads(game)) {
      const lines = aliveMembers(game, s).map((p) => search(game, log, p, s.zone));
      lines.forEach((l) => log.line(l));
      sections.push({ title: `${s.name} (${zoneName(s.zone)})${s.inDanger ? ' 🔴' : ''}`, lines });
    }
  },

  battle(game, log, sections) {
    if (game.finalShowdown) game.ring++;
    const round = game.ring;

    const byZone = new Map();
    for (const s of aliveSquads(game)) {
      if (!byZone.has(s.zone)) byZone.set(s.zone, []);
      byZone.get(s.zone).push(s);
    }

    for (const [zone, squads] of byZone) {
      if (squads.length < 2) continue;
      const queue = shuffle(squads);
      const lines = [];
      if (queue.length % 2 !== 0) lines.push(`• ${queue.pop().name} hid and avoided combat!`);

      while (queue.length > 0) {
        const f1 = shuffle(aliveMembers(game, queue.shift()));
        const f2 = shuffle(aliveMembers(game, queue.shift()));
        for (let i = 0; i < Math.min(f1.length, f2.length); i++) {
          lines.push(...duel(log, f1[i], f2[i], round));
        }
      }
      lines.forEach((l) => log.line(l));
      sections.push({ title: zoneName(zone).toUpperCase(), lines });
    }
  },
};

// A random fighter strikes first and the other swings back only if they're
// still standing, so a duel can never kill both. (The old version swung both
// at once, which is how whole lobbies used to die and hand Ozzy the win.)
// Unarmed pairs brawl so a showdown can never stall forever.
function duel(log, a, b, round) {
  const [first, second] = chance(0.5) ? [a, b] : [b, a];
  const lines = [];
  const turn = (atk, def) => {
    if (!atk.alive || !def.alive) return;
    if (atk.weapons.length > 0) {
      const key = pick(atk.weapons);
      lines.push(`⚔️ ${log.strike(atk, def, () => SQUAD_LOOT[key].attack(atk, def, round))}`);
    } else if (def.weapons.length > 0) {
      lines.push(`Unarmed <@${atk.id}> couldn't fight back!`);
    } else {
      log.strike(atk, def, () => def.takeDamage(10 * round));
      lines.push(`🥊 <@${atk.id}> has no weapon and throws punches at <@${def.id}>!`);
    }
  };
  turn(first, second);
  turn(second, first);
  return lines;
}

/**
 * Resolve the next phase. Returns
 *   { phase, round, sections: [{ title, lines }], lines, deaths, kills, winnerIds, safeZones }
 */
function playSquadPhase(game) {
  if (game.winnerIds) throw new Error('game is already over');

  const phase = game.nextPhase;
  const log = new PhaseLog(game.players);
  const sections = [];
  PHASES[phase](game, log, sections);
  if (preventWipe(log)) sections.push({ title: 'A MIRACLE', lines: [log.lines[log.lines.length - 1]] });

  const standing = aliveSquads(game);
  if (standing.length <= 1) {
    game.winnerIds = standing.length === 1 ? aliveMembers(game, standing[0]).map((p) => p.id) : [];
  }
  game.nextPhase = game.winnerIds ? null : (phase === 'ring' || game.finalShowdown ? 'battle' : 'ring');

  return {
    phase,
    round: game.ring,
    sections,
    ...log.result(),
    winnerIds: game.winnerIds,
    safeZones: game.safeZones.map(zoneName),
  };
}

module.exports = { createSquadGame, playSquadPhase, addToSquads, SQUAD_LOOT, zoneName };
