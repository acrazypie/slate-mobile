// In-app updates. The app asks GitHub for the latest release of the Slate repository,
// compares its version with the installed one, and offers the APK. Pure functions
// here (no Capacitor), so scripts/test-update.ts can check them.

export const UPDATE_REPO = 'acrazypie/slate-mobile';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;

/** The release as GitHub's REST API returns it (only the fields used here). */
export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets: { name: string; browser_download_url: string; digest?: string | null; size?: number }[];
}

export interface AvailableUpdate {
  version: string;
  notes: string;
  pageUrl: string;
  apkUrl: string;
  apkName: string;
  sha256: string;
  size: number | null;
}

/** "v1.2.0" and "1.2.0" are the same version; pre-release suffixes are ignored. */
export function parseVersion(text: string): number[] | null {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(text.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

/** True when `candidate` is a higher version than `installed`. Unknown strings are never newer. */
export function isNewer(candidate: string, installed: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

/**
 * The update offered by a release: its Android APK, with the SHA-256 GitHub
 * published for it. A release without a checksum is not offered, because the
 * app would have nothing to check the download against.
 */
export function updateFromRelease(release: GitHubRelease): AvailableUpdate | null {
  if (release.draft || release.prerelease) return null;
  const apk = release.assets.find((a) => /^slate-[\w.-]*\.apk$/.test(a.name));
  if (!apk || !apk.browser_download_url.startsWith('https://')) return null;
  const digest = /^sha256:([0-9a-f]{64})$/i.exec(apk.digest ?? '');
  if (!digest) return null;
  return {
    version: release.tag_name.replace(/^v/, ''),
    notes: release.body ?? '',
    pageUrl: release.html_url,
    apkUrl: apk.browser_download_url,
    apkName: apk.name,
    sha256: digest[1].toLowerCase(),
    size: apk.size ?? null,
  };
}

/** The update to show for the installed version, or null when there is none. */
export function availableUpdate(release: GitHubRelease, installed: string): AvailableUpdate | null {
  const update = updateFromRelease(release);
  if (!update || !isNewer(update.version, installed)) return null;
  return update;
}

/** Gives up after 15 seconds, so a dead connection shows an error instead of "checking" forever. */
const CHECK_TIMEOUT_MS = 15_000;

export async function fetchLatestRelease(fetchFn: typeof fetch = fetch): Promise<GitHubRelease> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetchFn(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    return (await res.json()) as GitHubRelease;
  } catch (err) {
    if (controller.signal.aborted) throw new Error('GitHub did not answer in time');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
