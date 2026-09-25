/**
 * Shared canvas renderer for every leaderboard board (weekly messages, weekly
 * sapphires, levels, and eventually the all-time board). One function drives
 * all of them — callers normalize their own data into the row/spec shape
 * documented below and know nothing about how it gets drawn.
 *
 * Row shape (per row):
 *   {
 *     rank: Number,
 *     name: String,
 *     avatarUrl: String,               // displayAvatarURL({ extension: 'png', size: 64 })
 *     badge: {
 *       value: Number,
 *       kind: 'sapphire' | 'level' | 'points',
 *       progress: Number (0-1)         // level badges only — XP progress into the next level.
 *                                      // Not part of the original scope.md row shape, but the
 *                                      // renderer can't draw a progress arc without it and the
 *                                      // renderer must stay ignorant of XP/level math, so callers
 *                                      // compute the fraction and pass it through here.
 *     },
 *     columns: [{ label: String, value: Number }]   // 0-3 entries, per spec.columnCount
 *   }
 *
 * Spec shape:
 *   {
 *     columnCount: 0-3,
 *     badgeKind: 'sapphire' | 'level' | 'points',
 *     accentColor: '#rrggbb',          // optional, defaults per badgeKind
 *     numberFormat: 'full' | 'abbreviated',   // applies to column values only —
 *                                              // the badge always uses its own 4-char cap format
 *   }
 *
 * renderBoard({ title, subtitle, rows, spec, page, totalPages }) -> Promise<Buffer> (PNG)
 */

const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const axios = require('axios');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

// ---------------------------------------------------------------------------
// Fonts — registered here rather than relying on another command file having
// already called GlobalFonts.registerFromPath. commands/user.js registers a
// fonts/arial.ttf that does not exist on disk (silently falls back to a
// default font) — do not repeat that mistake. Poppins is a real rounded
// geometric sans bundled specifically for this renderer.
// ---------------------------------------------------------------------------
const FONT_FAMILY = {
  regular: 'LBPoppins-Regular',
  medium: 'LBPoppins-Medium',
  semibold: 'LBPoppins-SemiBold',
  bold: 'LBPoppins-Bold',
};

let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  const fontsDir = path.join(__dirname, '..', 'fonts');
  const files = [
    ['Poppins-Regular.ttf', FONT_FAMILY.regular],
    ['Poppins-Medium.ttf', FONT_FAMILY.medium],
    ['Poppins-SemiBold.ttf', FONT_FAMILY.semibold],
    ['Poppins-Bold.ttf', FONT_FAMILY.bold],
  ];
  for (const [file, alias] of files) {
    const p = path.join(fontsDir, file);
    if (fs.existsSync(p)) {
      GlobalFonts.registerFromPath(p, alias);
    } else {
      console.error(`[leaderboardCanvas] missing font file: ${p}`);
    }
  }
  fontsRegistered = true;
}

// ---------------------------------------------------------------------------
// Avatar loading + caching. Everything stays in memory — no disk writes like
// commands/user.js's sharp-based pipeline. Cache key is the avatar's hash
// segment pulled out of the Discord CDN URL when present, falling back to the
// full URL for anything else (default avatars, the bundled fallback).
// ---------------------------------------------------------------------------
const avatarCache = new Map(); // key -> loaded Image
const AVATAR_HASH_RE = /\/avatars\/\d+\/([a-zA-Z0-9_]+)\.[a-z]+/;

let defaultAvatarPromise = null;
function loadDefaultAvatar() {
  if (!defaultAvatarPromise) {
    const p = path.join(__dirname, '..', 'assets', 'default-avatar.png');
    defaultAvatarPromise = fsp.readFile(p).then((buf) => loadImage(buf));
  }
  return defaultAvatarPromise;
}

function avatarCacheKey(url) {
  const m = AVATAR_HASH_RE.exec(url || '');
  return m ? m[1] : url;
}

async function loadAvatarImage(avatarUrl) {
  if (!avatarUrl) return loadDefaultAvatar();
  const key = avatarCacheKey(avatarUrl);
  if (avatarCache.has(key)) return avatarCache.get(key);
  try {
    const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
    const img = await loadImage(Buffer.from(res.data));
    avatarCache.set(key, img);
    return img;
  } catch (err) {
    // One 404/timeout must not kill the render — fall back to the bundled
    // default and don't bother caching the failure (the URL may recover).
    return loadDefaultAvatar();
  }
}

// ---------------------------------------------------------------------------
// Number formatting.
// ---------------------------------------------------------------------------

// Column values respect spec.numberFormat. 'full' = plain digits with
// thousands separators. 'abbreviated' = compact with one decimal
// (4.5k, 90.2k, 1.2m) — used by the Phase 4 all-time board, not Phase 1/2.
function formatColumnNumber(value, mode) {
  const n = Math.round(Number(value) || 0);
  if (mode === 'abbreviated') return formatAbbreviated(n);
  return n.toLocaleString('en-US');
}

function formatAbbreviated(value) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const units = [
    [1e9, 'b'],
    [1e6, 'm'],
    [1e3, 'k'],
  ];
  for (const [div, suffix] of units) {
    if (abs >= div) {
      const scaled = abs / div;
      const rounded = Math.round(scaled * 10) / 10;
      const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
      return sign + str + suffix;
    }
  }
  return sign + String(abs);
}

// Badge values always cap at 4 characters regardless of spec.numberFormat —
// it's a small capsule/circle, not a table column. Examples from scope.md:
// 500, 1200, 400k, 900k. Abbreviation TRUNCATES rather than rounds (119223 ->
// "119k", 54513 -> "54k", never "55k") — a balance display should never
// visually overstate what someone actually has.
function formatBadgeValue(value) {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs < 10000) return sign + String(abs);

  const units = [
    ['t', 1e12],
    ['b', 1e9],
    ['m', 1e6],
    ['k', 1e3],
  ];
  for (let i = 0; i < units.length; i++) {
    const [suffix, div] = units[i];
    if (abs >= div) {
      let n2 = Math.floor(abs / div);
      if (n2 >= 1000 && i > 0) {
        const [nextSuffix, nextDiv] = units[i - 1];
        n2 = Math.floor(abs / nextDiv);
        return sign + n2 + nextSuffix;
      }
      return sign + n2 + suffix;
    }
  }
  return sign + String(abs);
}

// ---------------------------------------------------------------------------
// Palette — dark theme matching Discord's own dark UI (same tone as the
// #2B2D31 border already used in commands/user.js's progress bar).
// ---------------------------------------------------------------------------
const PALETTE = {
  boardBg: '#1e1f22',
  rowBgA: '#2b2d31',
  rowBgB: '#313338',
  rowBorder: '#3f4147',
  nameText: '#f2f3f5',
  rankText: '#949ba4',
  columnLabel: '#8b8e94',
  columnValue: '#e3e5e8',
  subtitleText: '#a3a6ab',
  footerText: '#72767d',
  badgeText: '#ffffff',
  progressTrack: 'rgba(255,255,255,0.12)',
};

const MEDAL_COLORS = {
  1: '#f5c542', // gold
  2: '#e2e8f0', // silver
  3: '#d68a4c', // bronze
};

const DEFAULT_ACCENT = {
  sapphire: '#0253F0',
  level: '#5865f2',
  points: '#e67e22',
};

// Sapphire badge gradient — exact hex values specified by design review,
// not derived from DEFAULT_ACCENT.
const SAPPHIRE_GRADIENT = ['#0253F0', '#0246EE'];

// ---------------------------------------------------------------------------
// Layout constants (logical px, pre 2x scale).
// ---------------------------------------------------------------------------
const SCALE = 2;
const BOARD_WIDTH = 700;
const PADDING_X = 22;
const BASE_ROW_HEIGHT = 68; // grown to fit larger name text (no more footer to budget for)
const ROW_GAP = 7;
const ROW_RADIUS = 13;
const AVATAR_SIZE = 46;
const RANK_WIDTH = 36;
const BADGE_HEIGHT = 46; // level badge circle diameter — sapphire hex height is computed per render, see below
const COLUMN_MIN_WIDTH = 64;
const GAP = 14;
const BOTTOM_MARGIN = 14; // page numbers removed — paging is already shown by the Discord buttons

// A regular hexagon's width and height aren't independent — every side must
// be the same length, so making it wider (for a longer badge value) also
// makes it taller. width = height * (√3/2), i.e. height = width * 2/√3.
const HEX_WIDTH_TO_HEIGHT = 2 / Math.sqrt(3);
const ROW_VERTICAL_PAD = 16; // breathing room above/below the hex within its row

function headerHeight(subtitle) {
  return subtitle ? 78 : 58;
}

// ---------------------------------------------------------------------------
// Layout computation — widths derived from the widest formatted value on the
// *page*, not per row, so rank 1 and rank 9 line up and the right edge stays
// aligned. This runs once per render call.
// ---------------------------------------------------------------------------
function computeLayout(rows, spec) {
  ensureFontsRegistered();
  // Use an offscreen context purely for measurement.
  const measureCanvas = createCanvas(10, 10);
  const mctx = measureCanvas.getContext('2d');

  // Column widths.
  const columnWidths = [];
  for (let c = 0; c < spec.columnCount; c++) {
    mctx.font = `700 15px ${FONT_FAMILY.semibold}`;
    let widest = 0;
    for (const row of rows) {
      const col = row.columns && row.columns[c];
      if (!col) continue;
      const text = formatColumnNumber(col.value, spec.numberFormat);
      widest = Math.max(widest, mctx.measureText(text).width);
    }
    mctx.font = `600 10px ${FONT_FAMILY.medium}`;
    let labelWidest = 0;
    for (const row of rows) {
      const col = row.columns && row.columns[c];
      if (!col) continue;
      labelWidest = Math.max(labelWidest, mctx.measureText(col.label.toUpperCase()).width);
    }
    columnWidths.push(Math.max(COLUMN_MIN_WIDTH, widest, labelWidest) + 4);
  }

  // Badge width. Sapphire: a point-up REGULAR hexagon (every side equal
  // length) sized to the widest formatted value on the page — its flat
  // left/right edges sit at the full badge width regardless of the
  // top/bottom corner cut (see hexPath), so text just needs flat side
  // padding, no corner compensation. Because it must stay regular, height
  // is derived from width (see HEX_WIDTH_TO_HEIGHT), not fixed — a page
  // with 4-character values gets a taller hex (and taller rows) than one
  // with only 1-2 character values. Level: a fixed-diameter circle,
  // independent of the level number's width.
  let badgeWidth = BADGE_HEIGHT;
  let badgeHeight = BADGE_HEIGHT;
  let rowHeight = BASE_ROW_HEIGHT;
  if (spec.badgeKind === 'sapphire') {
    mctx.font = `700 16px ${FONT_FAMILY.bold}`;
    let widest = 0;
    for (const row of rows) {
      const text = formatBadgeValue(row.badge ? row.badge.value : 0);
      widest = Math.max(widest, mctx.measureText(text).width);
    }
    const minWidth = 52; // keeps a visible flat left/right edge even for 1-digit values
    badgeWidth = Math.max(minWidth, widest + 28);
    badgeHeight = badgeWidth * HEX_WIDTH_TO_HEIGHT;
    rowHeight = Math.max(BASE_ROW_HEIGHT, badgeHeight + ROW_VERTICAL_PAD);
  }

  const nameX = PADDING_X + RANK_WIDTH + GAP + AVATAR_SIZE + GAP;
  const columnsTotalWidth = columnWidths.reduce((a, w) => a + w + GAP, 0);
  const nameWidth = BOARD_WIDTH - PADDING_X - nameX - columnsTotalWidth - badgeWidth - GAP;

  return {
    width: BOARD_WIDTH,
    rowHeight,
    badgeHeight,
    columnWidths,
    badgeWidth,
    nameX,
    nameWidth: Math.max(80, nameWidth),
  };
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo > 0 ? text.slice(0, lo) + ellipsis : ellipsis;
}

// Point-up REGULAR hexagon: every side the same length. For that to hold,
// the vertical flat edges must span exactly half the height (= one side
// length, since circumradius = side length for a regular hexagon, and the
// flat edge spans from -side/2 to +side/2 around vertical center) — so the
// corner sits a quarter of the way down from the top edge, always, not a
// tunable ratio. Width and height themselves are linked by
// HEX_WIDTH_TO_HEIGHT wherever badgeHeight is computed from badgeWidth.
function hexCorner(height) {
  return height / 4;
}

function hexPath(ctx, x, y, width, height) {
  const cx = x + width / 2;
  const cut = hexCorner(height);
  ctx.beginPath();
  ctx.moveTo(cx, y); // top point
  ctx.lineTo(x + width, y + cut); // upper-right
  ctx.lineTo(x + width, y + height - cut); // lower-right
  ctx.lineTo(cx, y + height); // bottom point
  ctx.lineTo(x, y + height - cut); // lower-left
  ctx.lineTo(x, y + cut); // upper-left
  ctx.closePath();
}

function drawSapphireBadge(ctx, x, y, width, height, value) {
  // Hollow hexagon — a faint fill for text contrast, a gradient stroke for
  // the actual "sapphire" color, sized to fit up to 4 characters. Isolated
  // in this one function so swapping in a final illustrated asset later is
  // a single change.
  hexPath(ctx, x, y, width, height);
  ctx.fillStyle = 'rgba(2, 83, 240, 0.14)';
  ctx.fill();

  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, SAPPHIRE_GRADIENT[0]);
  gradient.addColorStop(1, SAPPHIRE_GRADIENT[1]);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = PALETTE.badgeText;
  ctx.font = `700 16px ${FONT_FAMILY.bold}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatBadgeValue(value), x + width / 2, y + height / 2 + 1);
}

/** A fixed-diameter circle showing a plain point total, no progress arc (points have no "next tier"). */
function drawPointsBadge(ctx, x, y, diameter, value, accentColor) {
  const cx = x + diameter / 2;
  const cy = y + diameter / 2;
  const radius = diameter / 2;
  const color = accentColor || DEFAULT_ACCENT.points;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.badgeText;
  ctx.font = `700 13px ${FONT_FAMILY.bold}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatBadgeValue(value), cx, cy + 1);
}

function drawLevelBadge(ctx, x, y, diameter, value, progress, accentColor) {
  const cx = x + diameter / 2;
  const cy = y + diameter / 2;
  const radius = diameter / 2;
  const ringWidth = 3.5;
  const color = accentColor || DEFAULT_ACCENT.level;

  // Track
  ctx.strokeStyle = PALETTE.progressTrack;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - ringWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Progress arc, starting at 12 o'clock, clockwise.
  const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
  if (clamped > 0) {
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * clamped;
    ctx.strokeStyle = color;
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - ringWidth / 2, start, end);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Fill disc
  ctx.fillStyle = PALETTE.rowBgB;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - ringWidth - 2, 0, Math.PI * 2);
  ctx.fill();

  // Level number — fixed size regardless of digit count (levels realistically
  // top out at 3 digits given the totalXpRequired table length).
  ctx.fillStyle = PALETTE.badgeText;
  ctx.font = `700 13px ${FONT_FAMILY.bold}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(value)), cx, cy + 1);
}

function drawAvatar(ctx, image, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();

  // Subtle ring so the avatar reads as a distinct disc against the row card,
  // regardless of what color sits at its edge.
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 0.75, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRankBadge(ctx, x, y, width, height, rank) {
  const medal = MEDAL_COLORS[rank];
  ctx.fillStyle = medal || PALETTE.rankText;
  ctx.font = `700 15px ${FONT_FAMILY.bold}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(rank), x + width / 2, y + height / 2 + 1);
}

function drawColumn(ctx, x, width, y, height, label, formattedValue) {
  // Both label and value are centered on the column's own midpoint, not
  // right-aligned to a shared edge — right-aligning a short label ("XP")
  // against a longer value ("9.3m") of different width looks visually
  // off-center relative to each other even though they'd share a literal
  // right edge, since the empty column slack ends up entirely on the left.
  const cx = x + width / 2;
  const centerY = y + height / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = PALETTE.columnLabel;
  ctx.font = `600 10px ${FONT_FAMILY.medium}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label.toUpperCase(), cx, centerY - 12);

  // Value uses the same 'middle' baseline at the same row-center Y as the
  // badge (drawSapphireBadge/drawLevelBadge both center their text at
  // y + rowHeight/2 too), so column numbers and the badge number always
  // sit at identical height regardless of how tall the badge/row is.
  ctx.fillStyle = PALETTE.columnValue;
  ctx.font = `700 16px ${FONT_FAMILY.semibold}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(formattedValue, cx, centerY + 1);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
// page/totalPages are accepted for interface stability (callers already pass
// them for pagination bookkeeping) but no longer drawn on the image itself —
// the page-number footer was removed in favor of larger row text; paging is
// already visible via the Discord message's own buttons.
async function renderBoard({ title, subtitle, rows, spec, page = 1, totalPages = 1 }) {
  ensureFontsRegistered();
  const resolvedBadgeKind = spec.badgeKind === 'level' || spec.badgeKind === 'points' ? spec.badgeKind : 'sapphire';
  const normSpec = {
    columnCount: Math.max(0, Math.min(3, spec.columnCount || 0)),
    badgeKind: resolvedBadgeKind,
    accentColor: spec.accentColor || DEFAULT_ACCENT[resolvedBadgeKind],
    numberFormat: spec.numberFormat === 'abbreviated' ? 'abbreviated' : 'full',
  };

  const layout = computeLayout(rows, normSpec);
  const rowHeight = layout.rowHeight;
  const hHeight = headerHeight(subtitle);
  const bodyHeight = rows.length * rowHeight + Math.max(0, rows.length - 1) * ROW_GAP;
  const totalHeight = hHeight + bodyHeight + BOTTOM_MARGIN;

  const canvas = createCanvas(layout.width * SCALE, totalHeight * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Board background
  ctx.fillStyle = PALETTE.boardBg;
  ctx.fillRect(0, 0, layout.width, totalHeight);

  // Header
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.nameText;
  ctx.font = `700 22px ${FONT_FAMILY.bold}`;
  ctx.fillText(title || '', PADDING_X, 34);
  if (subtitle) {
    ctx.fillStyle = PALETTE.subtitleText;
    ctx.font = `500 13px ${FONT_FAMILY.medium}`;
    ctx.fillText(subtitle, PADDING_X, 54);
  }

  // Preload avatars for this page in parallel.
  const avatarImages = await Promise.all(rows.map((r) => loadAvatarImage(r.avatarUrl)));

  let y = hHeight;
  rows.forEach((row, i) => {
    const rowBg = i % 2 === 0 ? PALETTE.rowBgA : PALETTE.rowBgB;
    ctx.fillStyle = rowBg;
    drawRoundedRect(ctx, PADDING_X - 10, y, layout.width - (PADDING_X - 10) * 2, rowHeight, ROW_RADIUS);
    ctx.fill();

    const rankX = PADDING_X;
    const avatarX = rankX + RANK_WIDTH + GAP;
    drawRankBadge(ctx, rankX, y, RANK_WIDTH, rowHeight, row.rank);

    drawAvatar(ctx, avatarImages[i], avatarX, y + (rowHeight - AVATAR_SIZE) / 2, AVATAR_SIZE);

    // Name — grown now that there's no footer competing for vertical space.
    ctx.fillStyle = PALETTE.nameText;
    ctx.font = `700 19px ${FONT_FAMILY.bold}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const truncated = truncateToWidth(ctx, row.name || 'Unknown', layout.nameWidth);
    ctx.fillText(truncated, layout.nameX, y + rowHeight / 2);

    // Columns
    let colX = layout.nameX + layout.nameWidth + GAP;
    for (let c = 0; c < normSpec.columnCount; c++) {
      const col = row.columns && row.columns[c];
      const width = layout.columnWidths[c];
      if (col) {
        drawColumn(ctx, colX, width, y, rowHeight, col.label, formatColumnNumber(col.value, normSpec.numberFormat));
      }
      colX += width + GAP;
    }

    // Badge — sapphire hex height varies per render (see computeLayout), level/points circles stay fixed.
    const thisBadgeHeight = normSpec.badgeKind === 'level' || normSpec.badgeKind === 'points' ? BADGE_HEIGHT : layout.badgeHeight;
    const badgeY = y + (rowHeight - thisBadgeHeight) / 2;
    const badgeX = layout.width - PADDING_X - layout.badgeWidth;
    const badge = row.badge || { value: 0, kind: normSpec.badgeKind };
    if (normSpec.badgeKind === 'level') {
      drawLevelBadge(ctx, badgeX, badgeY, BADGE_HEIGHT, badge.value, badge.progress, normSpec.accentColor);
    } else if (normSpec.badgeKind === 'points') {
      drawPointsBadge(ctx, badgeX, badgeY, BADGE_HEIGHT, badge.value, normSpec.accentColor);
    } else {
      drawSapphireBadge(ctx, badgeX, badgeY, layout.badgeWidth, thisBadgeHeight, badge.value);
    }

    y += rowHeight + ROW_GAP;
  });

  return canvas.encode('png');
}

module.exports = {
  renderBoard,
  formatBadgeValue,
  formatColumnNumber,
  FONT_FAMILY,
};
