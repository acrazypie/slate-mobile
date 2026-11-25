/**
 * Checks the in-app update rules (src/update/updates.ts): version order, which
 * release offers an APK, and that a release without a checksum is not offered.
 *
 *   npx tsx scripts/test-update.ts
 */
import { availableUpdate, isNewer, updateFromRelease, type GitHubRelease } from '../src/update/updates';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

const SHA = 'a'.repeat(64);
const release = (over: Partial<GitHubRelease> = {}): GitHubRelease => ({
  tag_name: 'v1.3.0',
  html_url: 'https://github.com/acrazypie/slate-mobile/releases/tag/v1.3.0',
  body: 'Notes',
  draft: false,
  prerelease: false,
  assets: [{ name: 'slate-1.3.0.apk', browser_download_url: 'https://github.com/acrazypie/slate-mobile/releases/download/v1.3.0/slate-1.3.0.apk', digest: `sha256:${SHA}`, size: 6_000_000 }],
  ...over,
});

console.log('\n=== Version order ===');
check('1.3.0 is newer than 1.2.0', isNewer('1.3.0', '1.2.0'), true);
check('v-prefix is ignored', isNewer('v1.10.0', '1.9.9'), true);
check('same version is not newer', isNewer('1.2.0', '1.2.0'), false);
check('older is not newer', isNewer('1.1.0', '1.2.0'), false);
check('patch counts', isNewer('1.2.1', '1.2.0'), true);
check('unknown strings are never newer', isNewer('dev', '1.2.0') || isNewer('1.2.0', 'dev'), false);

console.log('\n=== Which release offers an APK ===');
check('a release with an APK and checksum is offered', updateFromRelease(release())?.sha256, SHA);
check('the version comes from the tag', updateFromRelease(release())?.version, '1.3.0');
check('no checksum: not offered', updateFromRelease(release({ assets: [{ name: 'slate-1.3.0.apk', browser_download_url: 'https://x/slate.apk', digest: null }] })), null);
check('no APK: not offered', updateFromRelease(release({ assets: [{ name: 'notes.txt', browser_download_url: 'https://x/n.txt', digest: `sha256:${SHA}` }] })), null);
check('draft: not offered', updateFromRelease(release({ draft: true })), null);
check('pre-release: not offered', updateFromRelease(release({ prerelease: true })), null);
check('non-https download: not offered', updateFromRelease(release({ assets: [{ name: 'slate-1.3.0.apk', browser_download_url: 'http://x/slate.apk', digest: `sha256:${SHA}` }] })), null);

console.log('\n=== Offered to this installed version ===');
check('1.3.0 offered to 1.2.0', availableUpdate(release(), '1.2.0')?.version, '1.3.0');
check('nothing offered to 1.3.0', availableUpdate(release(), '1.3.0'), null);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
