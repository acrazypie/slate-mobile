// Export: the backup JSON is written to the app cache and handed to the
// share sheet (Save to Files, Drive, mail...). A WebView cannot "download".
// In a desktop browser it falls back to a normal download.
// Import: a plain <input type="file"> works in both WebViews; the text is
// validated by SlateRepository.parseBackup before anything is replaced.

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { kv, repo } from '../app/store';
import { isNative, platform } from '../native/platform';
import { keyFromDate } from '../lib/recurrence';

export const LAST_EXPORT_KEY = 'slate:last-export';

export async function exportBackup(): Promise<'shared' | 'cancelled'> {
  await repo.flush();
  const name = `slate-backup-${keyFromDate(new Date())}.json`;
  const text = JSON.stringify(repo.exportBackup(), null, 2);
  if (!isNative) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
    await kv.set(LAST_EXPORT_KEY, new Date().toISOString());
    return 'shared';
  }
  // iPhone: the Filesystem plugin is left out of the iOS build (see ios-build.yml),
  // so the backup is shared as text instead of as a file.
  if (platform === 'ios') {
    try {
      await Share.share({ title: name, text });
    } catch (err) {
      if (/cancel/i.test(String((err as Error)?.message ?? err))) return 'cancelled';
      throw err;
    }
    await kv.set(LAST_EXPORT_KEY, new Date().toISOString());
    return 'shared';
  }
  const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: name, files: [res.uri], dialogTitle: name });
  } catch (err) {
    // closing the share sheet without choosing counts as an error on iOS
    if (/cancel/i.test(String((err as Error)?.message ?? err))) return 'cancelled';
    throw err;
  }
  await kv.set(LAST_EXPORT_KEY, new Date().toISOString());
  return 'shared';
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 20 * 1024 * 1024) return reject(new Error('file too large'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
