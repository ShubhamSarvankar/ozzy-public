#!/usr/bin/env node
/**
 * Builds hungergames/engine/knownTemplates.json from the Hunger Games source
 * files as they were before the /hg rewrite (read from git, so this still
 * works after the files were deleted).
 *
 * Every string that mentions a player becomes a template (same normalization
 * as the archive, see hungergames/engine/history.js) with a suggested label
 * worked out from the code around it:
 *   - solo duelDay/finalDuel and squad attack lines: attack:<attacker>:<target>
 *   - original /hg fight lines followed by 100+ damage to the target: kill,
 *     under 100: attack; 100+ damage to the attacker themselves: nokill
 *   - original /hg fight lines that only hurt the attacker: nokill (if they die,
 *     nobody gets credit)
 *   - staff "🪦" lines: nokill
 *   - night events and squad stand-offs: none
 *   - everything else: no suggestion (single-mention lines default to none)
 *
 * Usage: node scripts/hungergames/extractKnownTemplates.js [--rev <git rev>]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { normalize } = require('../../hungergames/engine/history');

const SOURCES = ['commands/HungerGames.js', 'commands/hungergamesnew.js', 'commands/hungerbr.js'];
const DEFAULT_REV = '215991a'; // last commit with all three original files

const ATTACKER = /^(attacker\.id|players\[a\]|player\.id)$/;
const VICTIM = /^(target\.id|defender\.id|players\[(p2|b|b2|b3)\])$/;

function enclosingFunction(src, index) {
  const before = src.slice(Math.max(0, index - 3000), index);
  const matches = [...before.matchAll(/(\w+)\s*:\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

function extract(file, src) {
  const out = [];
  const literal = /`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = literal.exec(src)) !== null) {
    const body = m[1];
    if (!body.includes('<@')) continue;

    const exprIds = new Map();
    const fakeId = (expr) => {
      if (!exprIds.has(expr)) exprIds.set(expr, String(1000000000000000000n + BigInt(exprIds.size + 1)));
      return exprIds.get(expr);
    };
    let text = body
      .replace(/<@\$\{([^}]+)\}>/g, (_, expr) => `<@${fakeId(expr.trim())}>`)
      .replace(/\$\{([^}]+)\}/g, (_, expr) => (/damage|heal|round|\d/.test(expr) ? '7' : '\u0002'))
      .replace(/\\n/g, '\n');

    const fn = enclosingFunction(src, m.index);
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const lead = src.slice(lineStart, m.index);
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 400);

    for (const piece of text.split('\n')) {
      if (!piece.includes('<@')) continue;
      const { template: raw, mentionIds } = normalize(piece);
      const template = raw.replace(/\u0002/g, '{X}');
      const exprOf = (id) => [...exprIds].find(([, v]) => v === id)?.[0];
      const slot = (re) => {
        const i = mentionIds.findIndex((id) => re.test(exprOf(id) || ''));
        return i < 0 ? null : i + 1;
      };
      const att = slot(ATTACKER);
      const vic = slot(VICTIM);

      let label = null;
      if (/🪦/.test(template)) {
        label = 'nokill:1';
      } else if (['duelDay', 'finalDuel', 'attack'].includes(fn) && att && vic) {
        label = `attack:${att}:${vic}`;
      } else if (file === 'commands/HungerGames.js' && att) {
        const hit = /health\[(\w+)\]\s*-=\s*(\d+)/.exec(after);
        if (hit && vic && `players[${hit[1]}]` === exprOf(mentionIds[vic - 1])) {
          label = Number(hit[2]) >= 100 ? `kill:${att}:${vic}` : `attack:${att}:${vic}`;
        } else if (hit && hit[1] === 'a') {
          label = `nokill:${att}`;
        } else if (/nightFight/.test(lead)) {
          label = 'none';
        }
      } else if (/nightFight/.test(lead) || (file === 'commands/hungerbr.js' && !(att && vic))) {
        label = 'none';
      }
      out.push({ template, label, source: file });
    }
  }
  return out;
}

function main() {
  const i = process.argv.indexOf('--rev');
  const rev = i >= 0 ? process.argv[i + 1] : DEFAULT_REV;
  const byTemplate = new Map();
  for (const file of SOURCES) {
    const src = execSync(`git show ${rev}:${file}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    for (const t of extract(file, src)) {
      const prev = byTemplate.get(t.template);
      // A labelled occurrence beats an unlabelled one.
      if (!prev || (!prev.label && t.label)) byTemplate.set(t.template, t);
    }
  }
  // Death-list entries in every version.
  for (const marker of ['✝️ {P1}', '⚰️ {P1}', '☠️ {P1}']) {
    byTemplate.set(marker, { template: marker, label: 'died:1', source: 'death list' });
  }

  const rows = [...byTemplate.values()].sort((a, b) => a.template.localeCompare(b.template));
  const outPath = path.join(__dirname, '../../hungergames/engine/knownTemplates.json');
  fs.writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`);
  const labelled = rows.filter((r) => r.label).length;
  console.log(`Wrote ${rows.length} known templates (${labelled} with a suggested label) to ${outPath}`);
}

main();
