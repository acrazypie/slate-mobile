// Renders every page listed in screens.json to ../ios/*.png and ../android/*.png.
// Needs playwright-core: PW=/path/to/node_modules/playwright-core node render.mjs [filter]
// CHROME=<path to chrome-headless-shell> overrides the browser binary.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const pw = await import(process.env.PW ? pathToFileURL(join(process.env.PW, 'index.mjs')).href : 'playwright-core');
const chromium = pw.chromium ?? pw.default.chromium;
const exe = process.env.CHROME ?? join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell');
const list = JSON.parse(readFileSync(join(here, 'screens.json'), 'utf8'));
const size = { ios: { width: 390, height: 844 }, android: { width: 412, height: 915 } };
const filter = process.argv[2];

const browser = await chromium.launch({ executablePath: exe });
for (const [plat, names] of Object.entries(list)) {
  const ctx = await browser.newContext({ viewport: size[plat], deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  for (const name of names) {
    if (filter && !`${plat}/${name}`.includes(filter)) continue;
    await page.goto(pathToFileURL(join(here, plat, `${name}.html`)).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(here, '..', plat, `${name}.png`) });
    console.log(`${plat}/${name}.png`);
  }
  await ctx.close();
}
await browser.close();
