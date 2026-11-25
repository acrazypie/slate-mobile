// Checks GitHub for a newer release and runs the install. Checks at most every
// six hours unless the user asks; the Settings screen shows the result.

import { useCallback, useEffect, useState } from 'react';
import { kv } from '../app/store';
import { appVersion, isNative, onResume, platform } from '../native/platform';
import { availableUpdate, fetchLatestRelease, type AvailableUpdate } from './updates';
import { ApkInstaller } from './installer';

export const LAST_CHECK_KEY = 'slate:update-check';
const SIX_HOURS = 6 * 60 * 60 * 1000;

export type UpdateStatus =
  | { kind: 'unsupported' }
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'upToDate'; version: string }
  | { kind: 'available'; update: AvailableUpdate }
  | { kind: 'installing'; update: AvailableUpdate; received: number; total: number }
  | { kind: 'needsPermission'; update: AvailableUpdate }
  | { kind: 'error'; message: string };

export function useUpdate(): { status: UpdateStatus; check: () => Promise<void>; install: () => Promise<void> } {
  const [status, setStatus] = useState<UpdateStatus>({ kind: isNative && platform === 'android' ? 'idle' : 'unsupported' });
  const [current, setCurrent] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!isNative || platform !== 'android') return;
    setStatus({ kind: 'checking' });
    try {
      const installed = current ?? (await appVersion());
      setCurrent(installed);
      const release = await fetchLatestRelease();
      await kv.set(LAST_CHECK_KEY, String(Date.now()));
      const update = availableUpdate(release, installed);
      setStatus(update ? { kind: 'available', update } : { kind: 'upToDate', version: installed });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'could not check for updates' });
    }
  }, [current]);

  // On open and when the app comes back, unless it checked recently.
  useEffect(() => {
    if (status.kind === 'unsupported') return;
    const maybe = async () => {
      const last = Number((await kv.get(LAST_CHECK_KEY)) ?? 0);
      if (Date.now() - last > SIX_HOURS) void check();
    };
    void maybe();
    return onResume(() => void maybe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = useCallback(async () => {
    if (status.kind !== 'available' && status.kind !== 'needsPermission') return;
    const { update } = status;
    try {
      const { allowed } = await ApkInstaller.canInstall();
      if (!allowed) {
        setStatus({ kind: 'needsPermission', update });
        await ApkInstaller.openInstallSettings();
        return;
      }
      setStatus({ kind: 'installing', update, received: 0, total: update.size ?? 0 });
      const listener = await ApkInstaller.addListener('progress', (p) =>
        setStatus((s) => (s.kind === 'installing' ? { ...s, received: p.received, total: p.total || s.total } : s)),
      );
      try {
        await ApkInstaller.install({ url: update.apkUrl, sha256: update.sha256, fileName: update.apkName });
      } finally {
        await listener.remove();
      }
      setStatus({ kind: 'available', update });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'the update failed' });
    }
  }, [status]);

  return { status, check, install };
}

