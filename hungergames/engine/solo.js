// Solo mode as a pure state machine. createSoloGame() builds the state;
// playSoloPhase() resolves the next phase and returns what happened. The
// Discord adapter only formats the result.
//
// Phase order: cornucopia, then per round: day, night, and on even rounds
// either a feast or a bloodbath. When exactly two are left at the start of a
// day, that day is the final duel.

const { Player } = require('./player');
const { PhaseLog, preventWipe } = require('./phase');
const { WEAPONS } = require('./weapons');
const { CHARACTERS } = require('./characters');
const { ENVIRONMENT, NIGHT_SOLO, NIGHT_PAIR, applyHp } = require('./events');
const { random, pick, chance, shuffle } = require('./rng');

const BLOODBATH_DEATH_CHANCE = 0.25;
const BLOODBATH_MAX_DEATHS = 2;
const FINAL_DUEL_MAX_EXCHANGES = 100;

const weaponKeys = Object.keys(WEAPONS);

function createSoloGame(entries) {
  return {
    mode: 'solo',
    players: entries.map((e) => new Player(e.id, e.avatar)),
    round: 0,
    nextPhase: 'cornucopia',
    winnerIds: null,
  };
}

const alivePlayers = (game) => game.players.filter((p) => p.alive);

function randomWeaponKey(player) {
  return player.weapons.length > 0 ? pick(player.weapons) : null;
}

function discover(player) {
  const key = pick(weaponKeys);
  player.addWeapon(key);
  return WEAPONS[key].discovery(player);
}

function environment(log, player, round) {
  const ev = pick(ENVIRONMENT);
  return log.expose(player, () => {
    applyHp(player, ev.hp, round);
    return ev.text(player);
  });
}

const PHASES = {
  cornucopia(game, log) {
    for (const p of alivePlayers(game)) log.line(discover(p));
  },

  day(game, log) {
    const quiet = chance(0.5);
    for (const p of shuffle(alivePlayers(game))) {
      if (!p.alive) continue; // died earlier this phase
      const key = randomWeaponKey(p);

      if (quiet || !key) {
        if (!key || chance(0.3)) {
          log.line(environment(log, p, game.round));
        } else {
          const text = log.expose(p, () => WEAPONS[key].singleDay(p, game.round));
          log.line(p.alive ? `${text} ${discover(p)}` : text);
        }
        continue;
      }

      const opponents = alivePlayers(game).filter((o) => o.id !== p.id);
      if (opponents.length === 0) continue;
      const target = pick(opponents);
      const text = log.strike(p, target, () => WEAPONS[key].duelDay(p, target, game.round));
      log.line(p.alive ? `${text} ${discover(p)}` : text);
    }
  },

  night(game, log) {
    for (const p of shuffle(alivePlayers(game))) {
      if (!p.alive) continue;
      const others = alivePlayers(game).filter((o) => o.id !== p.id);
      const key = randomWeaponKey(p);
      const kind = pickNightKind(key, others.length > 0);
      if (kind === 'weapon') {
        log.line(log.expose(p, () => WEAPONS[key].night(p, game.round)));
      } else if (kind === 'solo') {
        const ev = pick(NIGHT_SOLO);
        log.line(log.expose(p, () => {
          applyHp(p, ev.hp, game.round);
          return ev.text(p);
        }));
      } else {
        const partner = pick(others);
        const ev = pick(NIGHT_PAIR);
        if (ev.betrayal) {
          log.line(log.strike(p, partner, () => {
            partner.takeDamage(ev.damage(game.round));
            return ev.text(p, partner);
          }));
        } else {
          applyHp(p, ev.hp[0], game.round);
          applyHp(partner, ev.hp[1], game.round);
          log.line(ev.text(p, partner));
        }
      }
    }
  },

  feast(game, log) {
    for (const p of alivePlayers(game)) {
      const key = randomWeaponKey(p);
      if (key) log.line(WEAPONS[key].feast(p, game.round));
    }
  },

  bloodbath(game, log) {
    const lethal = alivePlayers(game).length > 2;
    let deaths = 0;
    const characterKeys = Object.keys(CHARACTERS);
    for (const p of alivePlayers(game)) {
      const dies = lethal && deaths < BLOODBATH_MAX_DEATHS && chance(BLOODBATH_DEATH_CHANCE);
      if (dies) deaths++;
      const character = CHARACTERS[pick(characterKeys)];
      log.line(log.expose(p, () => character(p, dies)));
    }
  },

  finalDuel(game, log) {
    let [attacker, defender] = shuffle(alivePlayers(game));
    for (let i = 0; i < FINAL_DUEL_MAX_EXCHANGES && attacker.alive && defender.alive; i++) {
      const key = randomWeaponKey(attacker);
      if (key) {
        log.line(log.strike(attacker, defender, () => WEAPONS[key].finalDuel(attacker, defender, game.round)));
      } else {
        log.line(log.strike(attacker, defender, () => {
          defender.takeDamage(20 * game.round);
          return `<@${attacker.id}> sucker punches <@${defender.id}>`;
        }));
      }
      [attacker, defender] = [defender, attacker];
    }
    // Safety net: never leave the duel undecided.
    if (attacker.alive && defender.alive) {
      const [winner, loser] = attacker.health >= defender.health ? [attacker, defender] : [defender, attacker];
      log.line(log.strike(winner, loser, () => {
        loser.takeDamage(loser.health);
        return `<@${winner.id}> outlasts <@${loser.id}>, who finally collapses.`;
      }));
    }
  },
};

// 45% a weapon's night line, 30% a solo night event, 25% a two-player event.
function pickNightKind(weaponKey, hasPartner) {
  const r = random();
  if (weaponKey && r < 0.45) return 'weapon';
  if (!hasPartner || r < 0.75) return 'solo';
  return 'pair';
}

function nextPhaseAfter(game, phase) {
  if (phase === 'cornucopia' || phase === 'feast' || phase === 'bloodbath') return 'day';
  if (phase === 'day') return 'night';
  if (phase === 'night') {
    if (game.round % 2 === 0) return chance(0.5) ? 'feast' : 'bloodbath';
    return 'day';
  }
  return null; // finalDuel ends the game
}

/**
 * Resolve the next phase. Returns
 *   { phase, round, lines, deaths, kills, winnerIds }
 * where winnerIds is set once the game is over.
 */
function playSoloPhase(game) {
  if (game.winnerIds) throw new Error('game is already over');

  let phase = game.nextPhase;
  if (phase === 'day') {
    game.round++;
    if (alivePlayers(game).length === 2) phase = 'finalDuel';
  }

  const log = new PhaseLog(game.players);
  PHASES[phase](game, log);
  preventWipe(log);

  const alive = alivePlayers(game);
  if (alive.length <= 1) game.winnerIds = alive.map((p) => p.id);
  game.nextPhase = game.winnerIds ? null : nextPhaseAfter(game, phase);

  return { phase, round: game.round, ...log.result(), winnerIds: game.winnerIds };
}

module.exports = { createSoloGame, playSoloPhase, BLOODBATH_MAX_DEATHS };
