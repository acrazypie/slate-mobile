// React side of device-calendar access: permission state, the list of
// calendars, events for the range on screen, and the push to the device
// calendar (debounced after every change, and again on app resume).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kv, repo, useSettings } from '../app/store';
import { onResume } from '../native/platform';
import type { DeviceEvent } from '../lib/types';
import * as device from './device';
import { loadPushState, pushedEventIds, PUSH_KEY, removeAllPushed, syncCalendar } from './push';
import { deviceBackend } from './backend';
import { useGoogle } from '../google/GoogleProvider';

interface SyncStatus {
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
  lastChanged: number | null;
}

interface CalendarValue {
  access: device.CalendarAccess;
  calendars: device.DeviceCalendar[];
  /** Bumped when the device data may have changed (resume, sync, settings). */
  version: number;
  request: () => Promise<device.CalendarAccess>;
  refresh: () => Promise<void>;
  sync: () => Promise<number | null>;
  removePushed: () => Promise<void>;
  status: SyncStatus;
  /** Event ids Slate created: hidden from the overlay so nothing shows twice. */
  pushedIds: Set<string>;
  slateCalendarId: string | null;
}

const Ctx = createContext<CalendarValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const cal = settings.calendar;
  const [access, setAccess] = useState<device.CalendarAccess>('unavailable');
  const [calendars, setCalendars] = useState<device.DeviceCalendar[]>([]);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<SyncStatus>({ syncing: false, lastSync: null, error: null, lastChanged: null });
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [slateCalendarId, setSlateCalendarId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const a = await device.checkAccess();
    setAccess(a);
    if (a === 'full') {
      try {
        setCalendars(await device.listCalendars());
      } catch (err) {
        console.warn('[calendar] listCalendars failed', err);
        setCalendars([]);
      }
    } else {
      setCalendars([]);
    }
    const state = await loadPushState(kv);
    setPushedIds(pushedEventIds(state));
    setSlateCalendarId(state.calendarId);
    setStatus((s) => ({ ...s, lastSync: state.lastSync }));
    setVersion((v) => v + 1);
  }, []);

  const request = useCallback(async () => {
    const a = await device.requestAccess();
    await refresh();
    return a;
  }, [refresh]);

  // One sync at a time; a change during a sync schedules one more.
  const running = useRef<Promise<number | null> | null>(null);
  const again = useRef(false);
  const sync = useCallback(async (): Promise<number | null> => {
    const s = repo.getSnapshot().settings.calendar;
    if (!s.push || (await device.checkAccess()) !== 'full') return null;
    if (running.current) {
      again.current = true;
      return running.current;
    }
    const run = (async () => {
      setStatus((st) => ({ ...st, syncing: true, error: null }));
      try {
        const report = await syncCalendar(repo.getSnapshot(), kv, deviceBackend, PUSH_KEY, s.targetCalendarId, s.pushShifts);
        const state = await loadPushState(kv);
        setPushedIds(pushedEventIds(state));
        setSlateCalendarId(state.calendarId);
        setStatus({ syncing: false, lastSync: state.lastSync, error: null, lastChanged: report.changed });
        if (!s.targetCalendarId) setCalendars(await device.listCalendars().catch(() => []));
        return report.changed;
      } catch (err) {
        console.error('[calendar] sync failed', err);
        setStatus((st) => ({ ...st, syncing: false, error: err instanceof Error ? err.message : String(err) }));
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
  }, []);

  const removePushed = useCallback(async () => {
    await removeAllPushed(kv, deviceBackend, PUSH_KEY);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
    return onResume(() => {
      void refresh().then(() => sync());
    });
  }, [refresh, sync]);

  // Push after data changes, debounced so a burst of edits is one sync.
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

  // Turning push on, changing the target or the shifts option: sync now.
  useEffect(() => {
    if (cal.push && access === 'full') void sync();
  }, [cal.push, cal.targetCalendarId, cal.pushShifts, access, sync]);

  const value = useMemo(
    () => ({ access, calendars, version, request, refresh, sync, removePushed, status, pushedIds, slateCalendarId }),
    [access, calendars, version, request, refresh, sync, removePushed, status, pushedIds, slateCalendarId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDeviceCalendar(): CalendarValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDeviceCalendar outside <CalendarProvider>');
  return v;
}

/** The calendars whose events are shown (never Slate's own push target). */
export function useVisibleCalendars(): device.DeviceCalendar[] {
  const { calendars, slateCalendarId } = useDeviceCalendar();
  const { calendar } = useSettings();
  return useMemo(() => {
    if (!calendar.showDeviceEvents) return [];
    return calendars.filter(
      (c) => c.id !== slateCalendarId && (calendar.visibleCalendarIds === null || calendar.visibleCalendarIds.includes(c.id)),
    );
  }, [calendars, slateCalendarId, calendar.showDeviceEvents, calendar.visibleCalendarIds]);
}

/** Device events overlapping [start, end] (calendar days, inclusive). */
export function useDeviceEvents(start: Date, end: Date): DeviceEvent[] {
  const { access, version, pushedIds } = useDeviceCalendar();
  const google = useGoogle();
  const visible = useVisibleCalendars();
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime();
  const ids = visible.map((c) => c.id).join(',');

  useEffect(() => {
    let cancelled = false;
    const onDevice = access === 'full' && visible.length > 0
      ? device
          .listEvents(new Date(from), new Date(to), visible)
          .then((list) => list.filter((e) => !pushedIds.has(device.rawEventId(e.id))))
          .catch((err) => {
            console.warn('[calendar] listEvents failed', err);
            return [] as DeviceEvent[];
          })
      : Promise.resolve([] as DeviceEvent[]);
    const onGoogle = google.events(new Date(from), new Date(to));
    void Promise.all([onDevice, onGoogle]).then(([a, b]) => {
      if (!cancelled) setEvents([...a, ...b]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, from, to, ids, version, pushedIds, google.version, google.events]);

  return events;
}
