// Builds the source images in assets/ that `npx capacitor-assets generate`
// turns into every iOS/Android icon and splash size. The mark is the Timeline
// icon, option 1 "Ticks" (design/icons/icon-option-1.dc.html): six vertical
// ticks on a violet tile, with one red now line across them.
// Run: npm run assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
await mkdir(out, { recursive: true });

const VIOLET = '#9D8CFF';
const INK = '#0E1320';
const NOW = '#E0475E';

// Geometry on the 1024 master (design/icons/icon-option-1.dc.html). Inside the
// inner 66% safe zone for adaptive icons (176–848).
const TICKS = [
  [230, 362, 300],
  [330, 282, 460],
  [430, 402, 220],
  [530, 252, 520],
  [630, 322, 380],
  [730, 382, 260],
];
function mark(ink = INK, now = NOW) {
  const bars = TICKS.map(([x, y, h]) => `<rect x="${x}" y="${y}" width="52" height="${h}" rx="26" fill="${ink}"/>`).join('');
  return bars + `<rect x="176" y="505" width="672" height="14" rx="7" fill="${now}"/>`;
}
function svgDoc({ size, bg, body = '', scale = 1 }) {
  const bgRect = bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${bgRect}` +
      `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${body}</g></svg>`,
  );
}
const render = (doc, file) => sharp(doc).png().toFile(join(out, file));

// Full-bleed, opaque, no text: the OS applies the iOS squircle or the Android mask.
await render(svgDoc({ size: 1024, bg: VIOLET, body: mark() }), 'icon-only.png');
// Android adaptive layers: a solid violet background and the ticks as foreground.
await render(svgDoc({ size: 1024, bg: VIOLET }), 'icon-background.png');
await render(svgDoc({ size: 1024, body: mark() }), 'icon-foreground.png');
// Splash: the mark small in the middle, light and dark.
await render(svgDoc({ size: 2732, bg: '#F4F6FA', body: mark('#5B4BC4', NOW), scale: 0.3 }), 'splash.png');
await render(svgDoc({ size: 2732, bg: INK, body: mark(VIOLET, NOW), scale: 0.3 }), 'splash-dark.png');
console.log('assets/: icon-only, icon-foreground, icon-background, splash, splash-dark');
