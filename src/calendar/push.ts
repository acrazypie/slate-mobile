// Copies Slate's blocks (and placed shifts) into a device calendar and keeps
// them in step. One-way: Slate is the source of truth, changes made in the
// calendar app are overwritten at the next sync.
//
// A map (stored under PUSH_KEY, device-only, never in backups) remembers, for
// every Slate item, a hash of what was pushed and the device event id(s):
//
//   plain block            -> one event
//   weekly series          -> one recurring event (RRULE WEEKLY, UNTIL or COUNT=104);
//                             once an occurrence is deleted, one event per remaining
//                             occurrence instead (cancelling a single instance via an
//                             Android exception row failed on local calendars, and the
//                             plugin cannot write EXDATE)
//   monthly series         -> one event per occurrence: the plugin's rule has no
//                             "2nd Wednesday" (BYDAY with a position), so the
//                             series is expanded, capped like Slate's (104)
//   placed shift           -> one event, ending the next day if overnight
//
// A sync compares the wanted items with the map: unchanged hashes are left
// alone, changed plain items are modified in place (same event id),
// everything else is deleted and created again, and items that no longer
// exist are deleted. It runs after every change (debounced), on resume, and
// from Settings.

import type { SlateData } from '../data/schema';
import type { KeyValueStore } from '../data/storage';
import type { CalendarBackend } from './backend';
import { wantedItems } from './plan';

export const PUSH_KEY = 'slate:calendar-push';
export const GOOGLE_PUSH_KEY = 'slate:google-push';

interface PushedItem {
  hash: string;
  /** Device event ids; the first is the main one. */
  events: string[];
  /** True for one event per item, so it can be modified in place. */
  single: boolean;
}

export interface PushState {
  /** Calendar the items were pushed to. */
  calendarId: string | null;
  items: Record<string, PushedItem>;
  lastSync: string | null;
}

export async function loadPushState(store: KeyValueStore, key: string = PUSH_KEY): Promise<PushState> {
  try {
    const raw = await store.get(key);
    if (raw) {
      const parsed = JSON.parse(raw) as PushState;
      if (parsed && typeof parsed.items === 'object') return parsed;
    }
  } catch {
    /* start over */
  }
  return { calendarId: null, items: {}, lastSync: null };
}

export function pushedEventIds(state: PushState): Set<string> {
  const ids = new Set<string>();
  for (const item of Object.values(state.items)) item.events.forEach((id) => ids.add(id));
  return ids;
}

export interface SyncReport {
  changed: number;
  calendarId: string;
}

/**
 * Brings the calendar in line with `data`. `targetCalendarId` null means
 * Slate's own calendar (created when missing). Saves the map after each item
 * so an interrupted sync never forgets an event it created.
 */
export async function syncCalendar(
  data: SlateData,
  store: KeyValueStore,
  backend: CalendarBackend,
  key: string,
  targetCalendarId: string | null,
  pushShifts: boolean,
): Promise<SyncReport> {
  const state = await loadPushState(store, key);
  const calendars = await backend.listCalendars();
  let calendarId = targetCalendarId;
  if (!calendarId || !calendars.some((c) => c.id === calendarId && c.writable)) {
    calendarId = await backend.ensureSlateCalendar(data.settings.accent);
  }

  // Target changed, or the calendar we pushed to is gone (deleted by the user,
  // account removed): what we pushed there is moot, start a fresh map.
  if (state.calendarId && state.calendarId !== calendarId) {
    if (calendars.some((c) => c.id === state.calendarId)) {
      await backend.deleteEvents(Object.values(state.items).flatMap((i) => i.events));
    }
    state.items = {};
  }
  state.calendarId = calendarId;

  const save = () => store.set(key, JSON.stringify(state));
  const wanted = wantedItems(data, calendarId, pushShifts);
  const wantedKeys = new Set(wanted.map((w) => w.key));
  let changed = 0;

  for (const [key, item] of Object.entries(state.items)) {
    if (wantedKeys.has(key)) continue;
    await backend.deleteEvents(item.events);
    delete state.items[key];
    changed++;
    await save();
  }

  for (const w of wanted) {
    const prev = state.items[w.key];
    if (prev && prev.hash === w.hash) continue;
    const built = w.build();

    if (prev && prev.single && w.single && Array.isArray(built) && built.length === 1) {
      try {
        await backend.modifyEvent(prev.events[0], built[0]);
        state.items[w.key] = { ...prev, hash: w.hash };
        changed++;
        await save();
        continue;
      } catch {
        // deleted in the calendar app: create it again below
      }
    }
    if (prev) await backend.deleteEvents(prev.events);

    const events: string[] = [];
    if (Array.isArray(built)) {
      for (const ev of built) events.push(await backend.createEvent(ev));
    } else {
      const id = await backend.createEvent(built.recurring);
      events.push(id);
      for (const instance of built.skip) {
        try {
          await backend.skipOccurrence(id, instance);
        } catch (err) {
          console.warn('[push] could not cancel occurrence', err);
        }
      }
    }
    state.items[w.key] = { hash: w.hash, events: events.filter(Boolean), single: w.single };
    changed++;
    await save();
  }

  state.lastSync = new Date().toISOString();
  await save();
  return { changed, calendarId };
}

/** Deletes every event Slate pushed and forgets them. */
export async function removeAllPushed(store: KeyValueStore, backend: CalendarBackend, key: string): Promise<void> {
  const state = await loadPushState(store, key);
  await backend.deleteEvents(Object.values(state.items).flatMap((i) => i.events));
  await store.set(key, JSON.stringify({ calendarId: state.calendarId, items: {}, lastSync: state.lastSync }));
}

