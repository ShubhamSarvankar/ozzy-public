#!/usr/bin/env node
/**
 * Step 2 of the Hunger Games history backfill: turn the archive into the list
 * of unique statement templates to label, with suggestions from the old code.
 * Writes data/hungergames/templates.json (never published: data/ is excluded
 * from the public mirror).
 *
 *   node scripts/hungergames/templates.js
 */

const fs = require('fs');
const { templateCounts, suggestLabel } = require('../../hungergames/engine/history');
const {
  DATA_DIR, TEMPLATES_PATH, connect, loadGames, known, knownLabels, loadLabels, mongoose,
} = require('./lib');

async function main() {
  await connect();
  const games = await loadGames();
  const human = loadLabels();
  const rows = templateCounts(games, known).map((r) => ({
    ...r,
    suggestion: suggestLabel(r.template, knownLabels),
    label: human[r.template] ?? null,
  }));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TEMPLATES_PATH, `${JSON.stringify(rows, null, 2)}\n`);

  const byMode = {};
  for (const g of games) byMode[g.mode] = (byMode[g.mode] || 0) + 1;
  const needsHuman = rows.filter((r) => !r.label && !r.suggestion).length;
  console.log(`Games found: ${games.length}`, byMode);
  console.log(`Unique templates: ${rows.length} (${rows.filter((r) => r.suggestion).length} with a suggestion, ${needsHuman} need a human label)`);
  const skipped = new Map();
  for (const g of games) for (const t of g.skippedTitles) skipped.set(t, (skipped.get(t) || 0) + 1);
  if (skipped.size) {
    console.log('Non-HG Ozzy embeds skipped inside game windows (check nothing real is here):');
    [...skipped].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([t, n]) => console.log(`  ${n}  ${t}`));
  }
  console.log(`Wrote ${TEMPLATES_PATH}`);
}

main()
  .catch((err) => { console.error('[hg-templates] failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
