// What the push needs from a calendar service. Two implementations: the
// phone's own calendars (device.ts) and Google Calendar (google/backend.ts).
// push.ts only talks to this interface, so both targets share one sync.

import * as device from './device';
import type { NewEvent } from './plan';
import type { DeviceCalendar } from './device';

export interface CalendarBackend {
  listCalendars(): Promise<DeviceCalendar[]>;
  /** Id of Slate's own calendar, created when missing. */
  ensureSlateCalendar(accent: string): Promise<string>;
  createEvent(ev: NewEvent): Promise<string>;
  modifyEvent(id: string, ev: NewEvent): Promise<void>;
  skipOccurrence(id: string, instanceStart: number): Promise<void>;
  deleteEvents(ids: string[]): Promise<void>;
}

export const deviceBackend: CalendarBackend = {
  listCalendars: () => device.listCalendars(),
  ensureSlateCalendar: (accent) => device.ensureSlateCalendar(accent),
  createEvent: (ev) => device.createEvent(ev),
  modifyEvent: (id, ev) => device.modifyEvent(id, ev),
  skipOccurrence: (id, start) => device.skipOccurrence(id, start),
  deleteEvents: (ids) => device.deleteEvents(ids),
};
