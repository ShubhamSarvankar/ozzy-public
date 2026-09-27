// Bookkeeping shared by every phase resolver: the lines to show, who died, and
// who killed whom. Kill rule: whoever's hit takes a living player to 0 HP gets
// the kill. Deaths from staff events, the ring, the environment, or your own
// weapon credit nobody.

class PhaseLog {
  constructor(players) {
    this.players = players;
    this.startHealth = new Map(players.map((p) => [p.id, p.health]));
    this.startAlive = new Set(players.filter((p) => p.alive).map((p) => p.id));
    this.lines = [];
    this.deaths = [];
    this.kills = [];
  }

  line(text) {
    if (text) this.lines.push(text);
  }

  // Run fn (which may damage attacker and/or target) and attribute the outcome.
  strike(attacker, target, fn) {
    const targetWasAlive = target.alive;
    const attackerWasAlive = attacker.alive;
    const text = fn();
    if (targetWasAlive && !target.alive) {
      this.deaths.push(target.id);
      if (attacker.id !== target.id) this.kills.push({ killerId: attacker.id, victimId: target.id });
    }
    if (attacker.id !== target.id && attackerWasAlive && !attacker.alive) this.deaths.push(attacker.id);
    return text;
  }

  // Run fn that can only hurt the player themselves (no killer).
  expose(player, fn) {
    const wasAlive = player.alive;
    const text = fn();
    if (wasAlive && !player.alive) this.deaths.push(player.id);
    return text;
  }

  result() {
    return { lines: this.lines, deaths: this.deaths, kills: this.kills };
  }
}

/**
 * The no-wipe rule. A phase may never kill every tribute who was alive when it
 * started: if it would, the victim who started the phase healthiest survives
 * at 1 HP (ties go to whoever died last), and any kill credited for that death
 * is withdrawn. Returns the rescued player or null.
 */
function preventWipe(log) {
  const alive = log.players.filter((p) => p.alive);
  if (alive.length > 0 || log.startAlive.size === 0) return null;

  let best = null;
  let bestIdx = -1;
  for (const p of log.players) {
    if (!log.startAlive.has(p.id)) continue;
    const idx = log.deaths.lastIndexOf(p.id);
    const hp = log.startHealth.get(p.id);
    if (!best || hp > log.startHealth.get(best.id) || (hp === log.startHealth.get(best.id) && idx > bestIdx)) {
      best = p;
      bestIdx = idx;
    }
  }

  best.alive = true;
  best.health = 1;
  log.deaths = log.deaths.filter((id) => id !== best.id);
  log.kills = log.kills.filter((k) => k.victimId !== best.id);
  log.line(`🍀 Against all odds, <@${best.id}> barely escapes death, clinging on with 1 HP!`);
  return best;
}

module.exports = { PhaseLog, preventWipe };
