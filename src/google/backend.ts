// Google Calendar as a push target (the CalendarBackend that push.ts uses),
// plus reading events for the overlay. Event ids are "<calendarId>|<eventId>"
// so one string says where an event lives, which the push needs when it
// deletes or edits.

import type { CalendarBackend } from '../calendar/backend';
import type { DeviceCalendar } from '../calendar/device';
import type { NewEvent } from '../calendar/plan';
import type { DeviceEvent } from '../lib/types';
import type { GoogleApi } from './api';
import { calendarOf, overlayEvent, toGoogleBody } from './mapping';

export const GOOGLE_SLATE_TITLE = 'Slate';

const SEP = '|';

function splitId(id: string): { calendarId: string; eventId: string } {
  const i = id.indexOf(SEP);
  if (i < 0) throw new Error(`not a Google event id: ${id}`);
  return { calendarId: id.slice(0, i), eventId: id.slice(i + 1) };
}

export function createGoogleBackend(api: GoogleApi, timeZone: string): CalendarBackend {
  return {
    async listCalendars(): Promise<DeviceCalendar[]> {
      return (await api.calendarList()).map(calendarOf);
    },
    async ensureSlateCalendar(): Promise<string> {
      const existing = (await api.calendarList()).find((c) => c.summary === GOOGLE_SLATE_TITLE && calendarOf(c).writable);
      if (existing) return existing.id;
      return (await api.createCalendar(GOOGLE_SLATE_TITLE, timeZone)).id;
    },
    async createEvent(ev: NewEvent): Promise<string> {
      if (!ev.calendarId) throw new Error('an event needs a calendar');
      const id = await api.insertEvent(ev.calendarId, toGoogleBody(ev, timeZone));
      return `${ev.calendarId}${SEP}${id}`;
    },
    async modifyEvent(id: string, ev: NewEvent): Promise<void> {
      const { calendarId, eventId } = splitId(id);
      await api.patchEvent(calendarId, eventId, toGoogleBody(ev, timeZone));
    },
    // Recurring events are expanded by the plan, so there is never an
    // occurrence to cancel on Google's side.
    async skipOccurrence(): Promise<void> {},
    async deleteEvents(ids: string[]): Promise<void> {
      for (const id of ids) {
        const { calendarId, eventId } = splitId(id);
        await api.deleteEvent(calendarId, eventId);
      }
    },
  };
}

/** Events in the given calendars overlapping [from, to), as the overlay draws them. */
export async function listGoogleOverlay(
  api: GoogleApi,
  from: Date,
  to: Date,
  calendars: DeviceCalendar[],
): Promise<DeviceEvent[]> {
  const out: DeviceEvent[] = [];
  for (const cal of calendars) {
    const events = await api.listEvents(cal.id, from, to);
    for (const ev of events) {
      const mapped = overlayEvent(ev, cal);
      if (mapped) out.push(mapped);
    }
  }
  return out;
}
