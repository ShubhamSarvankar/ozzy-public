// Winner card: the arena backdrop, darkened, with each winner's avatar in a
// softly glowing circle and their Discord username underneath. One winner in
// solo, one or two in squad.

const path = require('path');
const fsp = require('fs').promises;
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadAvatarImage, ensureFontsRegistered, FONT_FAMILY } = require('../../utils/leaderboardCanvas');

const WIDTH = 1280;
const HEIGHT = 607;
const AVATAR = 240;
const GLOW = 'rgba(255, 214, 150, 0.75)';

let backgroundPromise = null;
function loadBackground() {
  if (!backgroundPromise) {
    const p = path.join(__dirname, '..', '..', 'images', 'hungergames', 'winner-bg.jpg');
    backgroundPromise = fsp.readFile(p).then((buf) => loadImage(buf));
  }
  return backgroundPromise;
}

function drawCover(ctx, img) {
  const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
}

function fitText(ctx, text, maxWidth, startSize) {
  let size = startSize;
  do {
    ctx.font = `${size}px ${FONT_FAMILY.semibold}`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 18);
}

function drawWinner(ctx, img, name, cx, cy, maxNameWidth) {
  // Soft glow: a blurred ring behind the avatar.
  ctx.save();
  ctx.shadowColor = GLOW;
  ctx.shadowBlur = 45;
  ctx.fillStyle = 'rgba(255, 214, 150, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, AVATAR / 2 + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, AVATAR / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - AVATAR / 2, cy - AVATAR / 2, AVATAR, AVATAR);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 236, 205, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, AVATAR / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  fitText(ctx, name, maxNameWidth, 46);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = GLOW;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fff7ea';
  ctx.fillText(name, cx, cy + AVATAR / 2 + 28);
  ctx.restore();
}

/**
 * @param winners [{ username, avatarUrl }] (1 or 2)
 * @returns Promise<Buffer> PNG
 */
async function renderWinnerCard(winners) {
  ensureFontsRegistered();
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  drawCover(ctx, await loadBackground());
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.25, WIDTH / 2, HEIGHT / 2, WIDTH * 0.7);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const images = await Promise.all(winners.map((w) => loadAvatarImage(w.avatarUrl)));
  const cy = HEIGHT / 2 - 40;
  const xs = winners.length === 1 ? [WIDTH / 2] : [WIDTH / 2 - 260, WIDTH / 2 + 260];
  const maxNameWidth = winners.length === 1 ? 900 : 460;
  winners.forEach((w, i) => drawWinner(ctx, images[i], w.username, xs[i], cy, maxNameWidth));

  return canvas.encode('png');
}

module.exports = { renderWinnerCard };
