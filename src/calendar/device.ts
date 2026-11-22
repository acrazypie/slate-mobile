// Thin, typed wrapper around @ebarooni/capacitor-calendar: permission state,
// calendars, reading events, and the few write calls the push needs.
// Everything returns plain Slate types so the rest of the app never sees the
// plugin's shapes. On the web every call reports "unavailable".

import { CapacitorCalendar, CalendarPermissionScope, EventSpan } from '@ebarooni/capacitor-calendar';
import type { CalendarEvent } from '@ebarooni/capacitor-calendar';
import { isNative, platform } from '../native/platform';
import type { DeviceEvent } from '../lib/types';
import { keyFromDate } from '../lib/recurrence';

/**
 * - full: can read and write (Android READ+WRITE_CALENDAR, iOS 17 full access)
 * - writeOnly: iOS 17+ "Add events only" (or Android WRITE without READ)
 * - prompt: not asked yet (or asked and dismissed, Android can ask again)
 * - denied: refused; only the system Settings can change it
 * - unavailable: web / plugin missing
 */
export type CalendarAccess = 'full' | 'writeOnly' | 'prompt' | 'denied' | 'unavailable';

export interface DeviceCalendar {
  id: string;
  name: string;
  color: string;
  writable: boolean;
  account: string | null;
}

export const SLATE_CALENDAR_TITLE = 'Slate';

function stateOf(s: string | undefined): 'granted' | 'denied' | 'prompt' {
  if (s === 'granted') return 'granted';
  if (s === 'denied') return 'denied';
  return 'prompt'; // 'prompt' | 'prompt-with-rationale'
}

export async function checkAccess(): Promise<CalendarAccess> {
  if (!isNative) return 'unavailable';
  try {
    const { result } = await CapacitorCalendar.checkAllPermissions();
    const read = stateOf(result[CalendarPermissionScope.READ_CALENDAR]);
    const write = stateOf(result[CalendarPermissionScope.WRITE_CALENDAR]);
    if (read === 'granted' && write === 'granted') return 'full';
    if (write === 'granted') return 'writeOnly';
    if (read === 'denied' || write === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.warn('[calendar] checkAllPermissions failed', err);
    return 'unavailable';
  }
}

/** Shows the system prompt (after our own explainer) and returns the new state. */
export async function requestAccess(): Promise<CalendarAccess> {
  if (!isNative) return 'unavailable';
  try {
    await CapacitorCalendar.requestFullCalendarAccess();
  } catch (err) {
    console.warn('[calendar] requestFullCalendarAccess failed', err);
  }
  return checkAccess();
}

export async function listCalendars(): Promise<DeviceCalendar[]> {
  const { result } = await CapacitorCalendar.listCalendars();
  return result
    .map((c) => ({
      id: c.id,
      name: c.title || c.internalTitle || '—',
      color: normalizeColor(c.color),
      writable: c.allowsContentModifications !== false && c.isImmutable !== true,
      account: c.accountName ?? c.source?.title ?? null,
    }))
    .sort((a, b) => (a.account ?? '').localeCompare(b.account ?? '') || a.name.localeCompare(b.name));
}

function normalizeColor(color: string | null | undefined): string {
  if (!color) return '#8D8D96';
  const hex = color.startsWith('#') ? color : `#${color}`;
  // Android returns #AARRGGBB from intToHexColor
  if (/^#[0-9a-fA-F]{8}$/.test(hex)) return `#${hex.slice(3)}`.toUpperCase();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : '#8D8D96';
}

/**
 * Events overlapping [from, to) in the given calendars, as wall-clock
 * DeviceEvents. All-day events are stored at UTC midnight on Android and at
 * local midnight on iOS, with an exclusive end; both become inclusive dates.
 */
export async function listEvents(from: Date, to: Date, calendars: DeviceCalendar[]): Promise<DeviceEvent[]> {
  if (calendars.length === 0) return [];
  const byId = new Map(calendars.map((c) => [c.id, c]));
  const { result } = await CapacitorCalendar.listEventsInRange({
    from: from.getTime(),
    to: to.getTime(),
    calendarIds: calendars.map((c) => c.id),
  });
  return result
    .filter((e) => e.calendarId && byId.has(e.calendarId))
    .map((e) => toDeviceEvent(e, byId.get(e.calendarId!)!));
}

function toDeviceEvent(e: CalendarEvent, cal: DeviceCalendar): DeviceEvent {
  const base = {
    // occurrences of one series share the event id; the start keeps keys unique
    id: `${e.id}@${e.startDate}`,
    calendarId: cal.id,
    calendarName: cal.name,
    title: e.title || '',
    notes: e.description ?? '',
    location: e.location ?? null,
    // Android reports 0 (#00000000) when an event has no colour of its own
    color: e.color && !/^#?00[0-9a-f]{6}$/i.test(e.color) ? normalizeColor(e.color) : cal.color,
  };
  if (e.isAllDay) {
    const day = (ms: number) => {
      const d = new Date(ms);
      return platform === 'android'
        ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const start = day(e.startDate);
    const endExclusive = day(Math.max(e.endDate, e.startDate + 1));
    const last = new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate() - 1);
    const end = last < start ? start : last;
    return { ...base, allDay: true, startDate: keyFromDate(start), endDate: keyFromDate(end), start_hour: 0, start_minute: 0, end_hour: 0, end_minute: 0 };
  }
  const s = new Date(e.startDate);
  const en = new Date(Math.max(e.endDate, e.startDate));
  return {
    ...base,
    allDay: false,
    startDate: keyFromDate(s),
    endDate: keyFromDate(en),
    start_hour: s.getHours(),
    start_minute: s.getMinutes(),
    end_hour: en.getHours(),
    end_minute: en.getMinutes(),
  };
}

/** The raw event id behind a DeviceEvent id ("<id>@<start>"). */
export function rawEventId(deviceEventId: string): string {
  return deviceEventId.slice(0, deviceEventId.lastIndexOf('@'));
}

// ---------------------------------------------------------------------------
// Writing (used by push.ts)

export type { NewEvent } from './plan';
import type { NewEvent } from './plan';

export async function createEvent(ev: NewEvent): Promise<string> {
  const { id } = await CapacitorCalendar.createEvent({
    title: ev.title,
    startDate: ev.start,
    endDate: ev.end,
    description: ev.notes || undefined,
    calendarId: ev.calendarId,
    isAllDay: false,
    recurrence: ev.weekly
      ? { frequency: 'weekly', interval: 1, ...(ev.weekly.count ? { count: ev.weekly.count } : { end: ev.weekly.until }) }
      : undefined,
  });
  if (!id) throw new Error('the calendar did not return an event id');
  return id;
}

export async function modifyEvent(id: string, ev: NewEvent): Promise<void> {
  await CapacitorCalendar.modifyEvent({
    id,
    title: ev.title,
    startDate: ev.start,
    endDate: ev.end,
    description: ev.notes ?? '',
    calendarId: ev.calendarId,
  });
}

/** Cancels one occurrence of a recurring event. */
export async function skipOccurrence(id: string, instanceStart: number): Promise<void> {
  await CapacitorCalendar.deleteEvent({ id, instanceDate: instanceStart, span: EventSpan.THIS_EVENT });
}

/** Deletes events; ids that no longer exist are ignored. */
export async function deleteEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await CapacitorCalendar.deleteEventsById({ ids, span: EventSpan.THIS_AND_FUTURE_EVENTS });
  } catch {
    // one bad id can fail the batch on some platforms: retry one by one
    for (const id of ids) {
      try {
        await CapacitorCalendar.deleteEvent({ id, span: EventSpan.THIS_AND_FUTURE_EVENTS });
      } catch {
        /* already gone */
      }
    }
  }
}

/** Slate's own calendar, created if missing. Returns its id. */
export async function ensureSlateCalendar(accent: string): Promise<string> {
  const existing = (await listCalendars()).find((c) => c.name === SLATE_CALENDAR_TITLE && c.writable);
  if (existing) return existing.id;
  const { id } = await CapacitorCalendar.createCalendar({
    title: SLATE_CALENDAR_TITLE,
    color: accent as `#${string}`,
    // Android: a local (non-synced) calendar needs an account name/owner
    accountName: SLATE_CALENDAR_TITLE,
    ownerAccount: SLATE_CALENDAR_TITLE,
  });
  if (!id) throw new Error('could not create the Slate calendar');
  return id;
}
