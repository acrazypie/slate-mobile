// Builds the source images in assets/ that `npx capacitor-assets generate`
// turns into every iOS/Android icon and splash size, and writes the native
// pieces that capacitor-assets does not: the Android 12+ animated splash mark,
// the three picker icons (lime, violet, apricot) and their launcher resources.
// The mark is the Timeline icon, option 1 "Ticks" (design/icons/icon-option-1.dc.html):
// six vertical ticks on an accent tile, with one red now line across them.
// Run: npm run assets
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
await mkdir(out, { recursive: true });

const VIOLET = '#9D8CFF';
const TEAL = '#6BB6A3';
const INK = '#0E1320';
const NOW = '#E0475E';

// Geometry on the 1024 master (design/icons/icon-option-1.dc.html). Inside the
// inner 66% safe zone for adaptive icons (176–848).
const TICK_W = 52;
const TICKS = [
  [230, 362, 300],
  [330, 282, 460],
  [430, 402, 220],
  [530, 252, 520],
  [630, 322, 380],
  [730, 382, 260],
];
const NOW_BAR = { x: 176, y: 505, w: 672, h: 14 };

function mark(ink = INK, now = NOW) {
  const bars = TICKS.map(([x, y, h]) => `<rect x="${x}" y="${y}" width="${TICK_W}" height="${h}" rx="26" fill="${ink}"/>`).join('');
  return bars + `<rect x="${NOW_BAR.x}" y="${NOW_BAR.y}" width="${NOW_BAR.w}" height="${NOW_BAR.h}" rx="7" fill="${now}"/>`;
}
function svgDoc({ size, bg, body = '', scale = 1 }) {
  const bgRect = bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${bgRect}` +
      `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${body}</g></svg>`,
  );
}
const render = (doc, file) => sharp(doc).png().toFile(file);

// Full-bleed, opaque, no text: the OS applies the iOS squircle or the Android mask.
await render(svgDoc({ size: 1024, bg: TEAL, body: mark() }), join(out, 'icon-only.png'));
// Android adaptive layers: a solid violet background and the ticks as foreground.
await render(svgDoc({ size: 1024, bg: TEAL }), join(out, 'icon-background.png'));
await render(svgDoc({ size: 1024, body: mark() }), join(out, 'icon-foreground.png'));
// Splash: the mark small in the middle, light and dark.
await render(svgDoc({ size: 2732, bg: '#F4F6FA', body: mark('#5B4BC4', NOW), scale: 0.3 }), join(out, 'splash.png'));
await render(svgDoc({ size: 2732, bg: INK, body: mark(VIOLET, NOW), scale: 0.3 }), join(out, 'splash-dark.png'));
console.log('assets/: icon-only, icon-foreground, icon-background, splash, splash-dark');

// ---- Native pieces -------------------------------------------------------

const android = join(root, 'android/app/src/main/res');
const ios = join(root, 'ios/App/App/Assets.xcassets');
const pickerDir = join(root, 'src/assets/app-icons');

// Android 12+ splash: the Ticks mark as a vector, scaled into the middle 72dp
// circle of the 108dp icon box. Light and night versions differ in ink colour.
function roundRectPath(x, y, w, h, r) {
  return `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;
}
function splashVector(ink, now, night) {
  const ticks = TICKS.map(([x, y, h]) => roundRectPath(x, y, TICK_W, h, 26)).join('');
  const nowPath = roundRectPath(NOW_BAR.x, NOW_BAR.y, NOW_BAR.w, NOW_BAR.h, 7);
  const s = 0.11;
  const t = (512 * (1 - s)).toFixed(2);
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Android 12+ splash icon: the Slate Ticks mark (scripts/make-assets.mjs), centred
     in the 108dp icon box (only the middle 72dp circle is shown).${night ? ' Night version.' : ''} -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="1024" android:viewportHeight="1024">
    <group android:scaleX="${s}" android:scaleY="${s}" android:translateX="${t}" android:translateY="${t}">
        <path android:fillColor="${ink}" android:pathData="${ticks}" />
        <path android:fillColor="${now}" android:pathData="${nowPath}" />
    </group>
</vector>
`;
}
await writeFile(join(android, 'drawable/splash_mark.xml'), splashVector('#5B4BC4', NOW, false));
await mkdir(join(android, 'drawable-night'), { recursive: true });
await writeFile(join(android, 'drawable-night/splash_mark.xml'), splashVector(VIOLET, NOW, true));
await writeFile(
  join(android, 'values/splash_colors.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">#F4F6FA</color>
</resources>
`,
);
await writeFile(
  join(android, 'values-night/splash_colors.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">#0E1320</color>
</resources>
`,
);

// The three picker icons: the Ticks mark on the accent tile, the same structure
// as the default icon. Lime, violet and apricot are the accent colours of the picker.
const VARIANTS = [
  { key: 'lime', name: 'Lime', accent: '#D4EE5E' },
  { key: 'violet', name: 'Violet', accent: '#BB86FC' },
  { key: 'apricot', name: 'Apricot', accent: '#E49C69' },
  // Black and white: white ticks on black, with the same red now line.
  { key: 'mono', name: 'Mono', accent: '#0A0A0A', ink: '#FFFFFF' },
];
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const v of VARIANTS) {
  const ink = v.ink ?? INK;
  const full = svgDoc({ size: 1024, bg: v.accent, body: mark(ink) });
  const fg = svgDoc({ size: 1024, body: mark(ink) });
  for (const [density, px] of Object.entries(LEGACY)) {
    await sharp(full).resize(px, px).png().toFile(join(android, `mipmap-${density}/ic_launcher_${v.key}.png`));
  }
  for (const [density, px] of Object.entries(FOREGROUND)) {
    await sharp(fg).resize(px, px).png().toFile(join(android, `mipmap-${density}/ic_launcher_${v.key}_foreground.png`));
  }
  const Name = v.name;
  await sharp(full).png().toFile(join(ios, `AppIcon-${Name}.appiconset/AppIcon-${Name}-1024.png`));
  await sharp(full).resize(256, 256).png().toFile(join(pickerDir, `${v.key}.png`));
}
// The Teal option previews the default icon (teal tile, Ticks).
await sharp(svgDoc({ size: 1024, bg: TEAL, body: mark() })).resize(256, 256).png().toFile(join(pickerDir, 'teal.png'));
console.log('native: Android splash mark and splash colours; lime, violet, apricot icons');
