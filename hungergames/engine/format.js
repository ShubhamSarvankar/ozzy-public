// Turns engine phase results into plain message specs ({ title, color, body,
// footer, sponsor }) that the Discord adapter renders as embeds. Kept pure so
// the wording and chunking are testable without discord.js.

const { zoneName, SQUAD_LOOT } = require('./squad');

const EMBED_BODY_LIMIT = 3900; // Discord's description cap is 4096

const COLORS = {
  cornucopia: 0xffa500,
  day: 0xffff00,
  night: 0x2c3e82,
  feast: 0x2ecc71,
  bloodbath: 0xff0000,
  finalDuel: 0x953d59,
  ring: 0x0099ff,
  battle: 0xff0000,
  cannons: 0xff0000,
  stats: 0x00ff00,
};

// Core solo weapons are named by their lowercase key ('pinklightsaber'), the
// classic and squad ones by a proper name; either way show a capitalised name.
function weaponLabel(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Split lines into bodies that each fit one embed description.
function chunkLines(lines, separator = '\n', limit = EMBED_BODY_LIMIT) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const piece = line.length > limit ? `${line.slice(0, limit - 3)}...` : line;
    const next = current ? `${current}${separator}${piece}` : piece;
    if (next.length > limit) {
      chunks.push(current);
      current = piece;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

function soloTitle(phase, round) {
  switch (phase) {
    case 'cornucopia': return '**Cornucopia**';
    case 'day': return `**Day ${round} Events**`;
    case 'night': return `**Night ${round} Events**`;
    case 'feast': return '**THE GREAT FEAST**';
    case 'bloodbath': return '**THE BLOODBATH**';
    case 'finalDuel': return `**Final Showdown - Day ${round}**`;
    default: return `**${phase}**`;
  }
}

function eventsSpec(game, result, extraLines = []) {
  if (game.mode === 'solo') {
    return {
      title: soloTitle(result.phase, result.round),
      color: COLORS[result.phase],
      lines: [...extraLines, ...result.lines],
      separator: '\n\n',
    };
  }

  if (result.phase === 'ring') {
    return {
      title: `**Ring ${result.round}: Discovery Phase** 🛤`,
      color: COLORS.ring,
      lines: [...extraLines, ...result.sections.map((s) => `__**${s.title}**__\n${s.lines.join('\n')}`)],
      separator: '\n\n',
      footer: `Safe Zones: ${result.safeZones.join(', ') || 'none'}`,
    };
  }

  if (result.sections.length === 0) {
    return {
      title: '**🌿 Peaceful Round**',
      color: COLORS.stats,
      lines: [...extraLines, 'All squads avoided each other...'],
      separator: '\n\n',
      footer: `Safe Zones: ${result.safeZones.join(', ') || 'none'}`,
    };
  }
  return {
    title: `**Ring ${result.round} Battle Results**`,
    color: COLORS.battle,
    lines: [...extraLines, ...result.sections.map((s) => `__**${s.title}**__\n${s.lines.join('\n')}`)],
    separator: '\n\n',
    footer: `Safe Zones: ${result.safeZones.join(', ') || 'none'}`,
  };
}

function cannonsSpec(result) {
  const killerOf = new Map(result.kills.map((k) => [k.victimId, k.killerId]));
  const lines = result.deaths.length
    ? result.deaths.map((id) => (killerOf.has(id) ? `⚰️ <@${id}> (killed by <@${killerOf.get(id)}>)` : `⚰️ <@${id}>`))
    : ['✨ No tributes died today.'];
  return {
    title: '💥 **Cannons** 💥', color: COLORS.cannons, lines, separator: '\n',
  };
}

function statsSpec(game, result) {
  if (game.mode === 'solo') {
    const alive = game.players.filter((p) => p.alive).sort((a, b) => b.health - a.health);
    return {
      title: '**Results**',
      color: COLORS.stats,
      lines: alive.map((p) => `• <@${p.id}> - ${p.health}% HP`),
      separator: '\n',
      footer: `Total alive: ${alive.length}`,
    };
  }
  const lines = [];
  for (const s of game.squads) {
    const alive = s.playerIds.map((id) => game.players.find((p) => p.id === id)).filter((p) => p.alive);
    if (alive.length === 0) continue;
    const members = alive.map((p) => {
      const gear = p.weapons.length ? ` | ${p.weapons.map((k) => weaponLabel(SQUAD_LOOT[k].name)).join(', ')}` : '';
      return `• <@${p.id}>: ${p.health} HP${gear}`;
    });
    lines.push(`**${s.name}** (${alive.length} alive, ${zoneName(s.zone)})\n${members.join('\n')}`);
  }
  return {
    title: '**HG Battle Royale Stats** ⏳',
    color: COLORS.stats,
    lines,
    separator: '\n\n',
    footer: `Safe Zones: ${result.safeZones.join(', ') || 'none'}`,
  };
}

/**
 * The messages to post for one resolved phase, in order: events, cannons, and
 * (unless the game just ended, or it's a squad ring which goes straight on to
 * its battle) the standings. `sponsor` marks where the Sponsor button goes:
 * the end of each solo day and each squad battle.
 */
function phaseSpecs(game, result, extraLines = []) {
  const specs = [eventsSpec(game, result, extraLines), cannonsSpec(result)];
  if (!result.winnerIds && !(game.mode === 'squad' && result.phase === 'ring')) {
    const stats = statsSpec(game, result);
    stats.sponsor = (game.mode === 'solo' && result.phase === 'day') || (game.mode === 'squad' && result.phase === 'battle');
    specs.push(stats);
  }
  return specs;
}

module.exports = {
  weaponLabel, chunkLines, phaseSpecs, soloTitle, EMBED_BODY_LIMIT,
};
