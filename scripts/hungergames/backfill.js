#!/usr/bin/env node
/**
 * Step 3 of the Hunger Games history backfill: replay every archived game with
 * the labels and write one HungerGamesResult per game (source: 'backfill',
 * keyed by the winner message id, so re-running updates rather than
 * duplicates). Games from after the first live /hg game are skipped, so
 * nothing is counted twice.
 *
 *   node scripts/hungergames/backfill.js            dry run: per-game summary, nothing written
 *   node scripts/hungergames/backfill.js --write    write/update the rows
 */

const { computeGame, templateCounts } = require('../../hungergames/engine/history');
const { killCounts, totals } = require('../../hungergames/engine/stats');
const HungerGamesResult = require('../../models/hungerGamesResultSchema');
const {
  connect, loadGames, known, loadLabels, effectiveLabels, mongoose,
} = require('./lib');

async function main() {
  const write = process.argv.includes('--write');
  await connect();

  const firstLive = await HungerGamesResult.findOne({ source: 'live' }).sort({ endedAt: 1 }).lean();
  let games = await loadGames();
  if (firstLive) games = games.filter((g) => BigInt(g.lobbyId) < BigInt(firstLive.key));

  const templates = templateCounts(games, known).map((r) => r.template);
  const labels = effectiveLabels(templates, loadLabels());

  const results = [];
  const unlabeled = new Map();
  let unexplainedTotal = 0;
  for (const g of games) {
    const r = computeGame(g, labels, known);
    for (const t of r.unlabeled) unlabeled.set(t, (unlabeled.get(t) || 0) + 1);
    unexplainedTotal += r.unexplained.length;
    results.push({
      key: g.winnerMessageId,
      mode: g.mode === 'unknown' ? 'unknown' : g.mode,
      winnerIds: g.winnerIds,
      kills: killCounts(r.kills),
      endedAt: g.endedAt,
      source: 'backfill',
    });
    console.log(`${new Date(g.endedAt).toISOString().slice(0, 10)} ${g.mode.padEnd(7)} winners: ${g.winnerIds.join(', ') || 'none'} | kills: ${r.kills.length} | unexplained deaths: ${r.unexplained.length}`);
  }

  console.log(`\n${games.length} games, ${results.reduce((n, r) => n + r.kills.reduce((m, k) => m + k.count, 0), 0)} kills, ${unexplainedTotal} deaths with no identifiable killer.`);
  if (unlabeled.size) {
    console.log(`\n${unlabeled.size} templates still unlabeled (treated as not combat). Most common:`);
    [...unlabeled].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([t, n]) => console.log(`  ${n} games: ${t}`));
  }
  console.log('\nTop 10 (backfill only):');
  totals(results).slice(0, 10).forEach((r, i) => console.log(`  ${i + 1}. ${r.userId} wins ${r.wins} kills ${r.kills}`));

  if (!write) {
    console.log('\nDry run: nothing written. Re-run with --write to save.');
    return;
  }
  await HungerGamesResult.bulkWrite(results.map((r) => ({
    replaceOne: { filter: { key: r.key }, replacement: r, upsert: true },
  })));
  console.log(`\nWrote ${results.length} backfilled results.`);
}

main()
  .catch((err) => { console.error('[hg-backfill] failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
