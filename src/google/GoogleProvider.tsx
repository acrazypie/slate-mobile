// React side of Google Calendar: the signed-in state, the Google calendars,
// the push of Slate's items into a "Slate" calendar, and Google events for the
// overlay. Everything runs on the device: the token never leaves it except
// in requests to Google.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kv, repo, useSettings } from '../app/store';
import { onResume } from '../native/platform';
import type { DeviceCalendar } from '../calendar/device';
import type { DeviceEvent } from '../lib/types';
import { GOOGLE_PUSH_KEY, loadPushState, removeAllPushed, syncCalendar } from '../calendar/push';
import { createGoogleApi, GoogleAuthError } from './api';
import { calendarOf } from './mapping';
import { createGoogleBackend, listGoogleOverlay } from './backend';
import { readSession, signIn, signOut } from './auth';
import { isGoogleConfigured } from './config';

export interface GoogleStatus {
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
  lastChanged: number | null;
}

interface GoogleValue {
  configured: boolean;
  connected: boolean;
  email: string | null;
  calendars: DeviceCalendar[];
  status: GoogleStatus;
  /** Bumped when Google data may have changed. */
  version: number;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sync: () => Promise<number | null>;
  /** Google events overlapping [from, to), for the calendar views. */
  events: (from: Date, to: Date) => Promise<DeviceEvent[]>;
}

const Ctx = createContext<GoogleValue | null>(null);

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function GoogleProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const g = settings.google;
  const configured = isGoogleConfigured();
  const [email, setEmail] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<GoogleStatus>({ syncing: false, lastSync: null, error: null, lastChanged: null });

  const getToken = useCallback(async () => {
    const s = await readSession(kv);
    if (!s) throw new GoogleAuthError();
    return s.accessToken;
  }, []);
  const api = useMemo(() => createGoogleApi(getToken), [getToken]);
  const backend = useMemo(() => createGoogleBackend(api, tz()), [api]);

  const lost = (err: unknown, fallback: string) => {
    if (err instanceof GoogleAuthError) {
      setConnected(false);
      setCalendars([]);
      setStatus((s) => ({ ...s, syncing: false, error: 'Sign in to Google again.' }));
      return;
    }
    console.error('[google]', err);
    setStatus((s) => ({ ...s, syncing: false, error: err instanceof Error ? err.message : fallback }));
  };

  const loadCalendars = useCallback(async () => {
    try {
      const list = await api.calendarList();
      setCalendars(list.map(calendarOf));
    } catch (err) {
      lost(err, 'Could not load your Google calendars');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const refresh = useCallback(async () => {
    const s = configured ? await readSession(kv) : null;
    setEmail(s?.email ?? null);
    setConnected(!!s);
    if (s) await loadCalendars();
    else setCalendars([]);
    const state = await loadPushState(kv, GOOGLE_PUSH_KEY);
    setStatus((st) => ({ ...st, lastSync: state.lastSync }));
    setVersion((v) => v + 1);
  }, [configured, loadCalendars]);

  const connect = useCallback(async () => {
    if (!configured || !repo.getSnapshot().settings.google.enabled) return false;
    try {
      const s = await signIn(kv);
      setEmail(s.email);
      setConnected(true);
      setStatus((st) => ({ ...st, error: null }));
      await loadCalendars();
      setVersion((v) => v + 1);
      return true;
    } catch (err) {
      setStatus((st) => ({ ...st, error: err instanceof Error ? err.message : 'Google sign-in failed' }));
      return false;
    }
  }, [configured, loadCalendars]);

  const disconnect = useCallback(async () => {
    await signOut(kv);
    setEmail(null);
    setConnected(false);
    setCalendars([]);
    setStatus((st) => ({ ...st, error: null }));
    setVersion((v) => v + 1);
  }, []);

  // One sync at a time; a change during a sync schedules one more.
  const running = useRef<Promise<number | null> | null>(null);
  const again = useRef(false);
  const sync = useCallback(async (): Promise<number | null> => {
    const s = repo.getSnapshot().settings.google;
    if (!s.enabled || !s.push || !(await readSession(kv))) return null;
    if (running.current) {
      again.current = true;
      return running.current;
    }
    const run = (async () => {
      setStatus((st) => ({ ...st, syncing: true, error: null }));
      try {
        const report = await syncCalendar(repo.getSnapshot(), kv, backend, GOOGLE_PUSH_KEY, null, s.pushShifts);
        const state = await loadPushState(kv, GOOGLE_PUSH_KEY);
        setStatus({ syncing: false, lastSync: state.lastSync, error: null, lastChanged: report.changed });
        return report.changed;
      } catch (err) {
        lost(err, 'Google sync failed');
        return null;
      } finally {
        running.current = null;
        setVersion((v) => v + 1);
        if (again.current) {
          again.current = false;
          void sync();
        }
      }
    })();
    running.current = run;
    return run;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  const events = useCallback(
    async (from: Date, to: Date): Promise<DeviceEvent[]> => {
      if (!connected || !g.enabled || !g.showEvents) return [];
      const state = await loadPushState(kv, GOOGLE_PUSH_KEY);
      const visible = calendars.filter((c) => c.id !== state.calendarId);
      try {
        return await listGoogleOverlay(api, from, to, visible);
      } catch (err) {
        lost(err, 'Could not read Google events');
        return [];
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, calendars, connected, g.enabled, g.showEvents],
  );

  useEffect(() => {
    void refresh();
    return onResume(() => {
      void refresh().then(() => sync());
    });
  }, [refresh, sync]);

  // Push after data changes, debounced like the device push.
  useEffect(() => {
    let timer: number | undefined;
    const off = repo.onChange((e) => {
      if (!e.blocks && !e.shifts) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sync(), 800);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [sync]);

  // Google events are read live: the calendar reloads them every 30 seconds
  // while the app is visible, and when it comes back to the foreground.
  useEffect(() => {
    if (!connected || !g.enabled || !g.showEvents) return;
    const tick = () => {
      if (document.visibilityState === 'visible') setVersion((v) => v + 1);
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [connected, g.enabled, g.showEvents]);

  useEffect(() => {
    if (g.enabled && g.push && connected) void sync();
  }, [g.enabled, g.push, g.pushShifts, connected, sync]);

  const value = useMemo<GoogleValue>(
    () => ({ configured, connected, email, calendars, status, version, connect, disconnect, sync, events }),
    [configured, connected, email, calendars, status, version, connect, disconnect, sync, events],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGoogle(): GoogleValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGoogle outside <GoogleProvider>');
  return v;
}

/** Removes every Google copy Slate made and forgets them. */
export async function removeGoogleCopies(): Promise<void> {
  const session = await readSession(kv);
  if (!session) throw new GoogleAuthError();
  const api = createGoogleApi(async () => session.accessToken);
  await removeAllPushed(kv, createGoogleBackend(api, tz()), GOOGLE_PUSH_KEY);
}
