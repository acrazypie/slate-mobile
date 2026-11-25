/**
 * Checks when the Ko-fi prompt is shown (src/app/donate.ts).
 *
 *   npx tsx scripts/test-donate.ts
 */
import { shouldShowDonate } from '../src/app/donate';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-12-01T10:00:00Z');
const url = 'https://ko-fi.com/example';
const longAgo = now - 30 * DAY;

check('no link built in: never shown', shouldShowDonate(5, longAgo, false, now, ''), false);
check('dismissed with the checkbox: never shown', shouldShowDonate(5, longAgo, true, now, url), false);
check('shown on every fifth start', shouldShowDonate(5, longAgo, false, now, url), true);
check('not on other starts', shouldShowDonate(6, longAgo, false, now, url), false);
check('at most once a fortnight', shouldShowDonate(10, now - 3 * DAY, false, now, url), false);
check('again after a fortnight', shouldShowDonate(10, now - 15 * DAY, false, now, url), true);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
