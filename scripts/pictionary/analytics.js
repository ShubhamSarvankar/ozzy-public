#!/usr/bin/env node
// Read-only Pictionary analytics CLI, built on the same query layer as the
// Discord `/pictionary analytics` dashboard (pictionary/analytics/queries.js)
// so the two can never disagree. Meant to be run by Claude Code directly:
//
//   node scripts/pictionary/analytics.js overview
//   node scripts/pictionary/analytics.js words --category Nature --json
//   node scripts/pictionary/analytics.js word volcano
//   node scripts/pictionary/analytics.js flags
//   node scripts/pictionary/analytics.js games --since 2026-09-01
//   node scripts/pictionary/analytics.js game PIC-12
//   node scripts/pictionary/analytics.js players --sort points
//   node scripts/pictionary/analytics.js violations
//   node scripts/pictionary/analytics.js cooldown
//   node scripts/pictionary/analytics.js export --out ./out
//
// JSON is the default when stdout is not a TTY; pass --json to force it.
//
// Connects with MONGODB_SRV_READONLY if set, falling back to MONGODB_SRV
// with a loud warning - this script only ever calls .find()/.countDocuments(),
// but a genuinely read-only Atlas user is the real safety boundary and is a
// one-time manual setup step outside what this script can provision itself
// (see CLAUDE.md).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const queries = require('../../pictionary/analytics/queries');

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) { opts[key] = next; i++; } else opts[key] = true;
    } else opts._.push(a);
  }
  return { command, opts };
}

function wantsJson(opts) {
  if (opts.json) return true;
  return !process.stdout.isTTY;
}

function printText(command, data) {
  console.log(`# pictionary ${command}\n`);
  console.log(JSON.stringify(data, null, 2));
}

async function connect() {
  const uri = process.env.MONGODB_SRV_READONLY || process.env.MONGODB_SRV;
  if (!process.env.MONGODB_SRV_READONLY) {
    console.error('[pictionary-analytics] MONGODB_SRV_READONLY is not set; falling back to MONGODB_SRV. '
      + 'Set up a read-only Atlas user for this script - see CLAUDE.md.');
  }
  await mongoose.connect(uri);
}

async function runExport(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const [overview, flags, players, violations, cooldown] = await Promise.all([
    queries.overview(), queries.flags(), queries.players({ limit: 1000 }), queries.violations(), queries.cooldown(),
  ]);
  const games = await queries.games({});
  const files = {
    'overview.json': overview,
    'flags.json': flags,
    'players.json': players,
    'violations.json': violations,
    'cooldown.json': cooldown,
    'games.json': games,
  };
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2));
  }
  return { outDir, files: Object.keys(files) };
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  if (!command) {
    console.error('Usage: node scripts/pictionary/analytics.js <overview|words|word|flags|games|game|players|violations|cooldown|export> [--json] [options]');
    process.exitCode = 1;
    return;
  }

  await connect();
  let data;
  switch (command) {
    case 'overview':
      data = await queries.overview();
      break;
    case 'words':
      data = await queries.words({
        category: opts.category, tier: opts.tier ? Number(opts.tier) : undefined, source: opts.source, sort: opts.sort, limit: opts.limit ? Number(opts.limit) : undefined,
      });
      break;
    case 'word':
      data = await queries.word(opts._[0]);
      if (!data) { console.error(`No such word: ${opts._[0]}`); process.exitCode = 1; }
      break;
    case 'flags':
      data = await queries.flags();
      break;
    case 'games':
      data = await queries.games({ since: opts.since });
      break;
    case 'game':
      data = await queries.game(opts._[0]);
      if (!data) { console.error(`No such game: ${opts._[0]}`); process.exitCode = 1; }
      break;
    case 'players':
      data = await queries.players({ sort: opts.sort, limit: opts.limit ? Number(opts.limit) : undefined });
      break;
    case 'violations':
      data = await queries.violations({ rule: opts.rule });
      break;
    case 'cooldown':
      data = await queries.cooldown();
      break;
    case 'export':
      data = await runExport(opts.out || './pictionary-export');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
      return;
  }

  if (wantsJson(opts)) console.log(JSON.stringify(data, null, 2));
  else printText(command, data);
}

main()
  .catch((err) => { console.error('[pictionary-analytics] failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.connection.close().catch(() => {}));
