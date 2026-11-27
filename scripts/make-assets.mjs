// Builds the Slate app icon for every accent in the app, in a standard (dark)
// and an OLED (pure black) version, plus the splash sources.
//
// The mark is the timeline: four events on a hairline, the second one active.
// The active node and bar take the accent colour; everything else is the
// calendar-cell grey. The tile background is the theme background, so it does
// not change with the accent.
//
// ACCENTS must match ACCENT_OPTIONS in src/app/theme.ts (the app picks an icon
// from its accent). Run: npm run assets (this script only; see README).
//
// Writes:
//   assets/icon-only.png, icon-background.png, icon-foreground.png (teal, default)
//   assets/splash.png, splash-dark.png (sources for `capacitor-assets generate`)
//   android/.../mipmap-*/ic_launcher_<key>[_oled].png and ..._foreground.png
//   android/.../mipmap-anydpi-v26/ic_launcher_<key>[_oled].xml
//   ios/.../Assets.xcassets/AppIcon[-<Colour>][-OLED].appiconset (1024px, opaque)
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
await mkdir(out, { recursive: true });

// Accent key -> hex. Keys are the icon names used everywhere else.
const ACCENTS = [
  ['teal', '#6BB6A3'],
  ['lime', '#D4EE5E'],
  ['violet', '#BB86FC'],
  ['apricot', '#E49C69'],
  ['amber', '#E0B84C'],
  ['sage', '#8BC48A'],
  ['pink', '#E58FB4'],
  ['coral', '#F0785A'],
  ['periwinkle', '#8FA8FF'],
  ['chalk', '#F0EEE8'], // near-white
];
const STANDARD_BG = '#0A0A0A';
const OLED_BG = '#000000';
const CELL = '#5C5C66';   // calendar-cell grey
const TRACK = '#2A2A31';  // hairline
const SIZE = 1024;

// Option 02 geometry on a 1024 canvas, centred horizontally.
const YS = [236, 418, 600, 788];
const STATES = ['future', 'active', 'future', 'future'];
const WIDTHS = [240, 320, 280, 180];
const LINE_X = 324;
const ROW_X = 401;

function timeline(accent, { line = TRACK, cell = CELL, hollow = STANDARD_BG } = {}) {
  let s = `<rect x="${LINE_X - 3}" y="${YS[0]}" width="6" height="${YS[YS.length - 1] - YS[0]}" fill="${line}"/>`;
  YS.forEach((y, i) => {
    if (STATES[i] === 'active') {
      s += `<circle cx="${LINE_X}" cy="${y}" r="50" fill="${accent}" fill-opacity="0.18"/>`;
      s += `<circle cx="${LINE_X}" cy="${y}" r="30" fill="${accent}"/>`;
      s += `<rect x="${ROW_X}" y="${y - 26}" width="${WIDTHS[i]}" height="52" rx="26" fill="${accent}"/>`;
    } else {
      s += `<circle cx="${LINE_X}" cy="${y}" r="30" fill="${hollow}" stroke="${cell}" stroke-width="6"/>`;
      s += `<rect x="${ROW_X}" y="${y - 26}" width="${WIDTHS[i]}" height="52" rx="26" fill="${cell}"/>`;
    }
  });
  return s;
}

function svgDoc({ size = SIZE, bg, body, scale = 1 }) {
  const bgRect = bg ? `<rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${SIZE} ${SIZE}">${bgRect}` +
      `<g transform="translate(${SIZE / 2} ${SIZE / 2}) scale(${scale}) translate(${-SIZE / 2} ${-SIZE / 2})">${body}</g></svg>`,
  );
}
const png = (doc, size) => sharp(doc, { density: 72 }).resize(size, size).png();
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Icon key: "lime", or "lime-oled" for the OLED version.
const VARIANTS = (key) => [
  { key, bg: STANDARD_BG, oled: false },
  { key: `${key}-oled`, bg: OLED_BG, oled: true },
];
const ALL_KEYS = ACCENTS.flatMap(([k]) => VARIANTS(k));

// 1. Default (teal, standard) sources for capacitor-assets and the splash.
const teal = ACCENTS[0][1];
await png(svgDoc({ bg: STANDARD_BG, body: timeline(teal) }), SIZE).toFile(join(out, 'icon-only.png'));
await png(svgDoc({ bg: STANDARD_BG, body: '' }), SIZE).toFile(join(out, 'icon-background.png'));
await png(svgDoc({ body: timeline(teal) }), SIZE).toFile(join(out, 'icon-foreground.png'));
await png(svgDoc({ size: 2732, bg: '#FAFAFA', body: timeline('#2E7266', { line: '#D8D8DE', cell: '#8A8A94', hollow: '#FAFAFA' }), scale: 0.3 }), 2732)
  .toFile(join(out, 'splash.png'));
await png(svgDoc({ size: 2732, bg: STANDARD_BG, body: timeline(teal), scale: 0.3 }), 2732).toFile(join(out, 'splash-dark.png'));

// 2. Native icon files for every key.
const DPI = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
const RES = join(root, 'android/app/src/main/res');
const XCASSETS = join(root, 'ios/App/App/Assets.xcassets');
const contentsTemplate = JSON.parse(await readFile(join(XCASSETS, 'AppIcon.appiconset/Contents.json'), 'utf8'));
const adaptiveXml = (name, bgColor) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Adaptive icon. The launcher masks it to a circle, rounded square or squircle, so the
     artwork is inset to the 66% safe zone; otherwise its corners and rings get cut off. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/${bgColor}" />
    <foreground>
        <inset android:drawable="@mipmap/${name}_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;

for (const [accentKey, accent] of ACCENTS) {
  for (const { key, bg, oled } of VARIANTS(accentKey)) {
    const name = `ic_launcher_${key.replace('-', '_')}`;
    const full = svgDoc({ bg, body: timeline(accent, { hollow: bg }) });
    const fg = svgDoc({ body: timeline(accent, { hollow: bg }) });

    for (const [dpi, [legacy, adaptive]] of Object.entries(DPI)) {
      const dir = join(RES, `mipmap-${dpi}`);
      await mkdir(dir, { recursive: true });
      await png(full, legacy).toFile(join(dir, `${name}.png`));
      await png(fg, adaptive).toFile(join(dir, `${name}_foreground.png`));
    }
    await writeFile(join(RES, 'mipmap-anydpi-v26', `${name}.xml`), adaptiveXml(name, oled ? 'launcher_background_oled' : 'launcher_background'));

    // iOS: opaque 1024 master per set; the system applies the corner mask.
    const setName = accentKey === 'teal' ? 'AppIcon' : `AppIcon-${cap(accentKey)}`;
    const dirName = `${setName}${oled ? '-OLED' : ''}`;
    const fileName = dirName === 'AppIcon' ? 'AppIcon-512@2x.png' : `${dirName}-1024.png`;
    const setDir = join(XCASSETS, `${dirName}.appiconset`);
    await mkdir(setDir, { recursive: true });
    await png(full, SIZE).flatten({ background: bg }).toFile(join(setDir, fileName));
    const contents = structuredClone(contentsTemplate);
    contents.images[0].filename = fileName;
    await writeFile(join(setDir, 'Contents.json'), JSON.stringify(contents, null, 2));
  }
}

// 3. The default launcher icon (what the app uses before any alias is chosen).
const teal0 = svgDoc({ bg: STANDARD_BG, body: timeline(teal) });
const teal0fg = svgDoc({ body: timeline(teal) });
for (const [dpi, [legacy, adaptive]] of Object.entries(DPI)) {
  const dir = join(RES, `mipmap-${dpi}`);
  await png(teal0, legacy).toFile(join(dir, 'ic_launcher.png'));
  await png(teal0, legacy).toFile(join(dir, 'ic_launcher_round.png'));
  await png(teal0fg, adaptive).toFile(join(dir, 'ic_launcher_foreground.png'));
  await png(svgDoc({ bg: STANDARD_BG, body: '' }), adaptive).toFile(join(dir, 'ic_launcher_background.png'));
}

await writeFile(join(RES, 'values/launcher_colors.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Behind the adaptive launcher icons: the same near-black as the icon tile, so the tile edge is invisible. -->
    <color name="launcher_background">${STANDARD_BG}</color>
    <!-- OLED icons: the pure black of the OLED theme. -->
    <color name="launcher_background_oled">${OLED_BG}</color>
</resources>
`);

console.log(`icons: ${ALL_KEYS.length} (${ACCENTS.length} accents, standard and OLED); splash: light, dark`);
