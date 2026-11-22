// Builds the source images in assets/ that `npx capacitor-assets generate`
// turns into every iOS/Android icon and splash size: the Slate mark (3×3
// quadratini, three in the Gesso accent) from public/favicon.svg's drawing.
// Run: npm run assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
await mkdir(out, { recursive: true });

// cells of the mark on a 32-unit canvas; accent at top-left, centre, bottom-left
const ACCENT_CELLS = [0, 4, 6];
function mark({ cells, accent }) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 6 + (i % 3) * 7.25;
    const y = 6 + Math.floor(i / 3) * 7.25;
    s += `<rect x="${x}" y="${y}" width="5.5" height="5.5" rx="1.2" fill="${ACCENT_CELLS.includes(i) ? accent : cells}"/>`;
  }
  return s;
}
function svgDoc({ size, bg, body = '', scale = 1 }) {
  const bgRect = bg ? `<rect width="32" height="32" fill="${bg}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${bgRect}` +
      `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${body}</g></svg>`,
  );
}
const render = (doc, file) => sharp(doc).png().toFile(join(out, file));

const DARK = { bg: '#0a0a0a', cells: '#5c5c66', accent: '#d4ee5e' };
const LIGHT = { bg: '#fafafa', cells: '#8a8a94', accent: '#5a7000' };

await render(svgDoc({ size: 1024, bg: DARK.bg, body: mark(DARK), scale: 0.9 }), 'icon-only.png');
await render(svgDoc({ size: 1024, bg: DARK.bg }), 'icon-background.png');
await render(svgDoc({ size: 1024, body: mark(DARK), scale: 0.9 }), 'icon-foreground.png');
await render(svgDoc({ size: 2732, bg: LIGHT.bg, body: mark(LIGHT), scale: 0.3 }), 'splash.png');
await render(svgDoc({ size: 2732, bg: DARK.bg, body: mark(DARK), scale: 0.3 }), 'splash-dark.png');
console.log('assets/: icon-only, icon-foreground, icon-background, splash, splash-dark');
