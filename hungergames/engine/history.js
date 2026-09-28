// Rebuilding historical wins and kills from archived Hunger Games messages.
//
// 1. Every statement in an archived embed becomes a template: mentions become
//    {P1}, {P2}... in order of first appearance and numbers become {N}, so
//    "<@12> hits <@34> for 14 damage" and "<@56> hits <@78> for 9 damage"
//    share one template.
// 2. A person labels each template (see LABELS). Templates that match the
//    game code we still have get a suggested label automatically.
// 3. computeGame() replays one game's messages with those labels and works
//    out who killed whom.
//
// Pure: no Discord, no Mongo.

const MENTION_RE = /<@!?(\d+)>/g;

/**
 * Labels:
 *   kill:i:j    Pi kills Pj outright
 *   attack:i:j  Pi damages Pj; a kill only if Pj is in the next death list
 *               and nobody hit Pj after (last hit wins)
 *   nokill:i    Pi dies and nobody gets credit (staff event, the ring, ...)
 *   died:i      a death-list entry for Pi (cannons, old crosses)
 *   none        anything else
 */
function parseLabel(label) {
  if (!label || label === 'none') return { type: 'none' };
  const [type, a, b] = label.split(':');
  return { type, a: Number(a), b: Number(b) };
}

// Mentions are masked with letters while numbers become {N}, so the digits
// in a user id are never mistaken for a number.
function normalize(text) {
  const ids = [];
  const masked = text.replace(MENTION_RE, (_, id) => {
    let i = ids.indexOf(id);
    if (i < 0) { ids.push(id); i = ids.length - 1; }
    return `\u0001${String.fromCharCode(97 + i)}\u0001`;
  });
  const template = masked
    .replace(/\d+/g, '{N}')
    .replace(/\u0001([a-z])\u0001/g, (_, c) => `{P${c.charCodeAt(0) - 96}}`)
    .replace(/\s+/g, ' ')
    .trim();
  return { template, mentionIds: ids };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a known template into a matcher over NORMALIZED text (where mentions
 * already look like {P3}). Returns { re, anchor } where anchor is the longest
 * literal chunk, used as a cheap pre-filter.
 */
function compileKnown(template) {
  const parts = template.split(/(\{P\d+\}|\{N\}|\{X\})/);
  const seen = new Map();
  let group = 0;
  let src = '';
  let anchor = '';
  for (const part of parts) {
    if (!part) continue;
    const p = /^\{P(\d+)\}$/.exec(part);
    if (p) {
      if (seen.has(p[1])) src += `\\{P\\k<g${seen.get(p[1])}>\\}`;
      else { group++; seen.set(p[1], group); src += `\\{P(?<g${group}>\\d+)\\}`; }
    } else if (part === '{N}') src += '\\{N\\}';
    else if (part === '{X}') src += '.+?';
    else {
      src += escapeRe(part).replace(/\s+/g, '\\s+');
      if (part.trim().length > anchor.length) anchor = part.trim();
    }
  }
  return { re: new RegExp(`^${src}`), anchor };
}

// Renumber a slice of a normalized line so its placeholders start at {P1},
// and pick out the matching mention ids from the whole line.
function sliceStatement(normalizedSlice, lineIds) {
  const order = [];
  const template = normalizedSlice.replace(/\{P(\d+)\}/g, (_, n) => {
    let i = order.indexOf(n);
    if (i < 0) { order.push(n); i = order.length - 1; }
    return `{P${i + 1}}`;
  }).trim();
  return { template, mentionIds: order.map((n) => lineIds[Number(n) - 1]) };
}

/**
 * Split one embed line into statements. Solo day lines glue a duel/single-day
 * line and a discovery line together, so: if the line starts with a known
 * template, peel it off and continue; if a known template starts after a
 * sentence break, split there. Anything left over stays whole, so an unknown
 * kill line is never cut in half.
 */
function segmentLine(line, known) {
  const { template: norm, mentionIds } = normalize(line);
  const out = [];
  let rest = norm;

  const matchAt = (text) => {
    let best = null;
    for (const k of known) {
      if (k.anchor && !text.includes(k.anchor)) continue;
      const m = k.re.exec(text);
      if (!m) continue;
      const end = m[0].length;
      const boundary = end === text.length || /^[\s]/.test(text.slice(end));
      if (boundary && (!best || end > best)) best = end;
    }
    return best;
  };

  while (rest.length > 0) {
    const end = matchAt(rest);
    if (end) {
      out.push(sliceStatement(rest.slice(0, end), mentionIds));
      rest = rest.slice(end).trim();
      continue;
    }
    // No known template at the start: look for one after a sentence break.
    let split = null;
    const breaks = /[.!?*)"~]\s+/g;
    let m;
    while ((m = breaks.exec(rest)) !== null) {
      const at = m.index + m[0].length;
      if (matchAt(rest.slice(at))) { split = at; break; }
    }
    if (split) {
      out.push(sliceStatement(rest.slice(0, split), mentionIds));
      rest = rest.slice(split).trim();
    } else {
      out.push(sliceStatement(rest, mentionIds));
      rest = '';
    }
  }
  return out.filter((s) => s.template.length > 0);
}

// ---------------------------------------------------------------------------
// Messages and games
// ---------------------------------------------------------------------------

function embedText(embed) {
  return [embed.title || '', embed.description || '', ...(embed.fields || []).flatMap((f) => [f.name || '', f.value || ''])].join('\n');
}

/**
 * Classify one archived bot message:
 *   lobby | winner | ozzywin | end (timeout/crash) | stats | events
 */
function classify(message) {
  const embed = (message.embeds || [])[0];
  if (!embed) return 'other';
  const title = embed.title || '';
  const desc = embed.description || '';
  if (/React with/i.test(desc) || /Lobby/i.test(title)) return 'lobby';
  if (/Winner/.test(title) || /Champion/.test(title)) return 'winner';
  if (/Hunger Games have ended/i.test(title)) return /Ozzy won by default/i.test(desc) ? 'ozzywin' : 'winner';
  if (/Battle Royale Ended/i.test(title)) return 'ozzywin';
  if (/Timeout|Crashed/i.test(title)) return 'end';
  if (/^\*{0,2}Results\*{0,2}$/.test(title.trim()) || /Stats/.test(title)) return 'stats';
  if (HG_EVENT_TITLE.test(title)) return 'events';
  return 'other'; // RPS results, attack GIFs, profiles... posted during a game
}

// Titles of every HG events/death-list message seen across versions.
const HG_EVENT_TITLE = /Hunger Games|Cannons|Cornucopia|Day \d+|Night \d+|FEAST|BLOODBATH|Final Showdown|Battle Royale|Battle Results|Ring \d+|Peaceful Round|Arena/i;

function modeOfLobby(message) {
  const title = message.embeds?.[0]?.title || '';
  if (/Battle Royale/i.test(title)) return 'squad';
  if (/🏹/.test(title)) return 'classic';
  if (/Hunger Games|Lobby/i.test(title)) return 'solo';
  return 'unknown';
}

function winnerIdsOf(message) {
  const embed = message.embeds[0];
  const text = `${embed.description || ''}\n${(embed.fields || []).map((f) => f.value).join('\n')}`;
  // Squad descriptions list survivors as "• <@id> - weapons"; solo/classic
  // name one winner. Either way the winners are the mentions in the text.
  return [...new Set([...text.matchAll(MENTION_RE)].map((m) => m[1]))];
}

/**
 * Group messages (oldest first) into games: a lobby, then everything until a
 * winner. A new lobby before a winner, or a timeout/crash, abandons the game.
 */
function groupGames(messages) {
  const games = [];
  let game = null;
  for (const msg of messages) {
    const kind = classify(msg);
    if (kind === 'lobby') {
      game = { lobbyId: msg.id, mode: modeOfLobby(msg), messages: [], skippedTitles: [] };
    } else if (!game) {
      continue;
    } else if (kind === 'end') {
      game = null;
    } else if (kind === 'winner' || kind === 'ozzywin') {
      games.push({
        ...game, winnerMessageId: msg.id, endedAt: msg.createdAt, winnerIds: kind === 'winner' ? winnerIdsOf(msg) : [],
      });
      game = null;
    } else if (kind === 'events') {
      game.messages.push(msg);
    } else if (kind === 'other') {
      game.skippedTitles.push(msg.embeds?.[0]?.title || '(no embed)');
    }
  }
  return games;
}

// Statements of every events message in a game, in order.
function gameStatements(game, known) {
  return game.messages.map((msg) => ({
    messageId: msg.id,
    statements: (msg.embeds || []).flatMap((e) => embedText(e).split('\n'))
      .map((l) => l.trim())
      .filter((l) => l && /<@!?\d+>/.test(l))
      .flatMap((l) => segmentLine(l, known)),
  }));
}

/**
 * Replay one game with labels (template -> label string).
 * @returns { kills: [{ killerId, victimId }], unexplained: [victimId], unlabeled: Set<template> }
 */
function computeGame(game, labels, known) {
  const kills = [];
  const unexplained = [];
  const unlabeled = new Set();
  const credited = new Set();
  const dead = new Set();
  let lastHit = new Map();
  let noKiller = new Set();

  const settle = (victims) => {
    for (const v of victims) {
      if (dead.has(v)) continue;
      dead.add(v);
      if (credited.has(v) || noKiller.has(v)) continue;
      if (lastHit.has(v)) {
        kills.push({ killerId: lastHit.get(v), victimId: v });
        credited.add(v);
      } else {
        unexplained.push(v);
      }
    }
    lastHit = new Map();
    noKiller = new Set();
  };

  for (const msg of gameStatements(game, known)) {
    const deaths = [];
    let hadAttack = false; // any attack or no-killer cause that the next death list may resolve
    for (const st of msg.statements) {
      if (!(st.template in labels)) unlabeled.add(st.template);
      const l = parseLabel(labels[st.template]);
      const id = (n) => st.mentionIds[n - 1];
      if (l.type === 'kill' && id(l.a) && id(l.b)) {
        const victim = id(l.b);
        if (!credited.has(victim) && !dead.has(victim)) {
          kills.push({ killerId: id(l.a), victimId: victim });
          credited.add(victim);
        }
      } else if (l.type === 'attack' && id(l.a) && id(l.b)) {
        lastHit.set(id(l.b), id(l.a));
        hadAttack = true;
      } else if (l.type === 'nokill' && id(l.a)) {
        noKiller.add(id(l.a));
        hadAttack = true;
      } else if (l.type === 'died' && id(l.a)) {
        deaths.push(id(l.a));
      }
    }
    // Hits and no-killer causes only carry into the very next message (the
    // death list that follows the events). A message with no deaths and no
    // causes, like an empty Cannons list, means the earlier hits weren't lethal.
    if (deaths.length) settle(deaths);
    else if (!hadAttack) settle([]);
  }

  // Final duel losers never get a death list: whoever was last hit and is not
  // a winner died at the very end.
  const winners = new Set(game.winnerIds);
  settle([...lastHit.keys()].filter((v) => !winners.has(v) && !dead.has(v)));
  return { kills, unexplained, unlabeled };
}

/**
 * Count every template across games, for labeling.
 * @returns [{ template, count }] most frequent first
 */
function templateCounts(games, known) {
  const counts = new Map();
  for (const g of games) {
    for (const msg of gameStatements(g, known)) {
      for (const st of msg.statements) counts.set(st.template, (counts.get(st.template) || 0) + 1);
    }
  }
  return [...counts].map(([template, count]) => ({ template, count })).sort((a, b) => b.count - a.count);
}

/**
 * Suggest a label: known code wins; otherwise single-mention death-list
 * entries become died:1 and other single-mention lines none.
 */
function suggestLabel(template, knownLabels) {
  if (knownLabels[template]) return knownLabels[template];
  // Squad battles prefixed each attack line with "⚔️ ".
  const bare = template.replace(/^[^\p{L}\p{N}{]+/u, '');
  if (knownLabels[bare]) return knownLabels[bare];
  if (/^\W*\{P1\}\W*$/u.test(template)) return 'died:1';
  if (!/\{P2\}/.test(template)) return 'none';
  return null;
}

module.exports = {
  parseLabel, normalize, compileKnown, segmentLine, classify, groupGames, gameStatements,
  computeGame, templateCounts, suggestLabel, winnerIdsOf,
};
