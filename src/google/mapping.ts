// Pure mapping between Slate's planned events and Google Calendar events.
// No network, no Capacitor: tested by scripts/test-google.ts.

import type { NewEvent } from '../calendar/plan';
import type { DeviceEvent } from '../lib/types';
import { keyFromDate } from '../lib/recurrence';
import type { GCalendar, GEvent, GEventBody } from './api';

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall-clock time in the device's zone, as Google wants it with a timeZone field. */
export function localDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** 20261230T225900Z, the UTC form RRULE's UNTIL takes. */
export function utcCompact(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function toGoogleBody(ev: NewEvent, timeZone: string): GEventBody {
  const body: GEventBody = {
    summary: ev.title,
    start: { dateTime: localDateTime(ev.start), timeZone },
    end: { dateTime: localDateTime(ev.end), timeZone },
  };
  if (ev.notes) body.description = ev.notes;
  if (ev.weekly?.until !== undefined) body.recurrence = [`RRULE:FREQ=WEEKLY;UNTIL=${utcCompact(ev.weekly.until)}`];
  else if (ev.weekly?.count !== undefined) body.recurrence = [`RRULE:FREQ=WEEKLY;COUNT=${ev.weekly.count}`];
  return body;
}

/** Google's `calendarList` entry: writable when the user owns or writes to it. */
export function calendarOf(c: GCalendar) {
  return {
    id: c.id,
    name: c.summary,
    color: c.backgroundColor ?? '#8d8d96',
    writable: c.accessRole === 'owner' || c.accessRole === 'writer',
    account: null,
  };
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return keyFromDate(new Date(y, m - 1, d + n));
}

/**
 * A Google event as the calendar overlay draws it, or null for events that
 * should not show: cancelled, declined by the user, or working-location marks.
 * Times are read in the device's zone.
 */
export function overlayEvent(ev: GEvent, cal: { id: string; name: string; color: string }): DeviceEvent | null {
  if (ev.status === 'cancelled' || ev.eventType === 'workingLocation') return null;
  if (ev.attendees?.some((a) => a.self && a.responseStatus === 'declined')) return null;
  const base = {
    source: 'google' as const,
    // Google events are read-only in Slate; editing them stays on Google's side.
    writable: false,
    calendarId: cal.id,
    calendarName: cal.name,
    title: ev.summary?.trim() || '',
    notes: ev.description ?? '',
    location: ev.location?.trim() ? ev.location.trim() : null,
    color: cal.color,
  };
  if (ev.start?.date) {
    // All-day end dates are exclusive in Google.
    const startDate = ev.start.date;
    const endDate = ev.end?.date ? addDays(ev.end.date, -1) : startDate;
    if (endDate < startDate) return null;
    return {
      ...base,
      id: `${ev.id}@${new Date(`${startDate}T00:00:00`).getTime()}`,
      allDay: true,
      startDate,
      endDate,
      start_hour: 0,
      start_minute: 0,
      end_hour: 0,
      end_minute: 0,
    };
  }
  if (!ev.start?.dateTime || !ev.end?.dateTime) return null;
  const s = new Date(ev.start.dateTime);
  const e = new Date(ev.end.dateTime);
  if (e.getTime() <= s.getTime()) return null;
  return {
    ...base,
    id: `${ev.id}@${s.getTime()}`,
    allDay: false,
    startDate: keyFromDate(s),
    endDate: keyFromDate(e),
    start_hour: s.getHours(),
    start_minute: s.getMinutes(),
    end_hour: e.getHours(),
    end_minute: e.getMinutes(),
  };
}
