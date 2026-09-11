/**
 * Dev iteration harness for utils/leaderboardCanvas.js.
 *
 * Renders a handful of mock boards straight to disk with hardcoded rows —
 * no Mongo, no Discord client, no live period. Run after every visual tweak:
 *
 *   node scripts/renderBoardMock.js
 *
 * Output lands in scripts/output/*.png.
 */

const fs = require('fs');
const path = require('path');
const { renderBoard } = require('../utils/leaderboardCanvas');

const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const LONG_NAMES = [
  'xXx_CPArmyGeneralissimo_xXx',
  'Ferdinand von Habsburg-Lothringen III',
  'sapphire.collector.supreme',
  '大将軍アーミー',
  'the_absolute_unit_of_hf',
];

// A couple of real, small, publicly loadable avatar URLs plus a deliberately
// broken one to exercise the fallback path.
const AVATARS = [
  'https://cdn.discordapp.com/embed/avatars/0.png',
  'https://cdn.discordapp.com/embed/avatars/1.png',
  'https://cdn.discordapp.com/embed/avatars/2.png',
  'https://cdn.discordapp.com/embed/avatars/3.png',
  'https://cdn.discordapp.com/embed/avatars/4.png',
  'https://this-domain-does-not-resolve.invalid/avatar.png', // forces fallback
];

function nameFor(i) {
  if (i === 2) return LONG_NAMES[0];
  if (i === 5) return LONG_NAMES[1];
  if (i === 7) return LONG_NAMES[2];
  return `Member${i + 1}`;
}

function avatarFor(i) {
  if (i === 4) return AVATARS[5]; // broken URL row
  return AVATARS[i % 5];
}

// Badge values chosen to hit 1, 2, 3, and 4-character formatted output,
// including the abbreviation boundary (400k, 900k from scope.md's examples).
const SAPPHIRE_BADGE_VALUES = [9, 87, 500, 1200, 42, 15000, 87000, 400000, 900000, 3];

function buildRows({ columnCount, badgeKind }) {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const rank = i + 1;
    const badgeValue = SAPPHIRE_BADGE_VALUES[i];
    const badge =
      badgeKind === 'level'
        ? { value: Math.max(1, 60 - i * 5), kind: 'level', progress: (i * 0.11) % 1 }
        : { value: badgeValue, kind: 'sapphire' };

    const columns = [];
    if (columnCount >= 1) columns.push({ label: 'Messages', value: Math.round(5000 / rank) * 10 + i });
    if (columnCount >= 2) columns.push({ label: 'Stamps', value: Math.max(0, 12 - i) });
    if (columnCount >= 3) columns.push({ label: 'Sapphires', value: badgeValue });

    rows.push({
      rank,
      name: nameFor(i),
      avatarUrl: avatarFor(i),
      badge,
      columns,
    });
  }
  return rows;
}

// commands/leaderboard.js's shape: Level/XP/Stamps columns, sapphire badge
// with realistic "balance"-scale values — including the exact truncation
// examples given (119223 -> "119k", 54513 -> "54k", never rounded up).
const LEADERBOARD_SAPPHIRE_VALUES = [119223, 54513, 9999, 1200, 300, 62000, 8700, 500, 9080000, 42];
function buildLeaderboardRows() {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push({
      rank: i + 1,
      name: nameFor(i),
      avatarUrl: avatarFor(i),
      badge: { value: LEADERBOARD_SAPPHIRE_VALUES[i], kind: 'sapphire' },
      columns: [
        { label: 'Level', value: Math.max(1, 60 - i * 5) },
        { label: 'XP', value: Math.round(9270900 / (i + 1)) },
        { label: 'Stamps', value: Math.max(0, 15 - i) },
      ],
    });
  }
  return rows;
}

async function run() {
  const boards = [
    {
      file: 'lbweekly-sapphires.png',
      title: 'Weekly Sapphires Leaderboard',
      subtitle: 'Period #12 · active',
      spec: { columnCount: 0, badgeKind: 'sapphire', numberFormat: 'full' },
    },
    {
      file: 'levels.png',
      title: 'Levels Leaderboard',
      subtitle: 'All-time XP',
      spec: { columnCount: 0, badgeKind: 'level', numberFormat: 'full' },
    },
    {
      file: 'lbmessages.png',
      title: 'Weekly Messages Leaderboard',
      subtitle: 'Period #12 · active · admin view',
      spec: { columnCount: 2, badgeKind: 'sapphire', numberFormat: 'full' },
    },
    {
      file: 'leaderboard.png',
      title: 'Sapphires Leaderboard',
      subtitle: 'All-time',
      spec: { columnCount: 3, badgeKind: 'sapphire', numberFormat: 'abbreviated' },
      customRows: buildLeaderboardRows(),
    },
  ];

  for (const board of boards) {
    const rows = board.customRows || buildRows(board.spec);
    const png = await renderBoard({
      title: board.title,
      subtitle: board.subtitle,
      rows,
      spec: board.spec,
      page: 1,
      totalPages: 3,
    });
    const outPath = path.join(OUT_DIR, board.file);
    fs.writeFileSync(outPath, png);
    console.log(`wrote ${outPath} (${png.length} bytes)`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
