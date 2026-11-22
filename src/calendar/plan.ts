// The push plan: what each Slate item should look like in the device
// calendar. Pure (no Capacitor), so scripts/test-data.ts can check it.
// See push.ts for how the plan is applied.

import type { Block, PlacedShift } from '../lib/types';
import { shiftDurationMinutes } from '../lib/types';
import { dateForWeekOffset, dateFromKey, getSeriesOccurrenceDates, weekOffsetForDate } from '../lib/recurrence';
import { placedShifts } from '../data/repository';
import type { SlateData } from '../data/schema';

const SERIES_CAP = 104;
/** Bump when the mapping changes, so every item is pushed again once. */
const PLAN_VERSION = 2;

export interface NewEvent {
  title: string;
  start: number;
  end: number;
  notes?: string;
  calendarId?: string;
  /** Weekly series: repeat weekly until `until` (ms) or for `count` occurrences. */
  weekly?: { until?: number; count?: number };
}

/** What one Slate item should look like in the calendar. */
export interface Wanted {
  key: string;
  hash: string;
  build: () => NewEvent[] | { recurring: NewEvent; skip: number[] };
  single: boolean;
}

function at(date: Date, hour: number, minute: number): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).getTime();
}

function blockEvent(block: Block, date: Date, calendarId: string): NewEvent {
  const start = at(date, block.start_hour, block.start_minute);
  return {
    title: block.title,
    start,
    end: start + block.duration_minutes * 60_000,
    notes: block.notes ?? undefined,
    calendarId,
  };
}

/** The list of wanted items for the current data. Exported for the tests. */
export function wantedItems(data: SlateData, calendarId: string, pushShifts: boolean): Wanted[] {
  const out: Wanted[] = [];
  for (const b of data.blocks) {
    const hash = JSON.stringify([
      PLAN_VERSION, calendarId, b.title, b.notes, b.day_of_week, b.start_hour, b.start_minute, b.duration_minutes, b.week_offset,
      b.is_recurring, b.recurrence_type, b.recurrence_end_date, b.skipped_weeks,
    ]);
    if (!b.is_recurring) {
      out.push({
        key: `b:${b.id}`,
        hash,
        single: true,
        build: () => [blockEvent(b, dateForWeekOffset(b.week_offset, b.day_of_week), calendarId)],
      });
    } else if (b.recurrence_type === 'weekly' && !(b.skipped_weeks ?? []).some((w) => w > b.week_offset)) {
      // A weekly series with no deleted occurrences is one recurring event.
      // With deleted occurrences it falls through to the expansion below:
      // cancelling an instance of a recurring event (an Android "exception"
      // row) proved unreliable on local calendars, and the plugin has no EXDATE.
      out.push({
        key: `b:${b.id}`,
        hash,
        single: false,
        build: () => {
          const first = blockEvent(b, dateForWeekOffset(b.week_offset, b.day_of_week), calendarId);
          const until = b.recurrence_end_date ? at(dateFromKey(b.recurrence_end_date), 23, 59) : undefined;
          return { recurring: { ...first, weekly: until ? { until } : { count: SERIES_CAP } }, skip: [] as number[] };
        },
      });
    } else {
      out.push({
        key: `b:${b.id}`,
        hash,
        single: false,
        build: () => {
          const skipped = new Set(b.skipped_weeks ?? []);
          return getSeriesOccurrenceDates(b)
            .filter((d) => !skipped.has(weekOffsetForDate(d)))
            .map((d) => blockEvent(b, d, calendarId));
        },
      });
    }
  }
  if (pushShifts) {
    for (const p of placedShifts(data, '0000-00-00', '9999-99-99')) {
      out.push({ key: `s:${p.id}`, hash: shiftHash(p, calendarId), single: true, build: () => [shiftEvent(p, calendarId)] });
    }
  }
  return out;
}

function shiftHash(p: PlacedShift, calendarId: string) {
  const s = p.shift;
  return JSON.stringify([PLAN_VERSION, calendarId, s.title, s.start_hour, s.start_minute, s.end_hour, s.end_minute, p.shift_date]);
}

function shiftEvent(p: PlacedShift, calendarId: string): NewEvent {
  const start = at(dateFromKey(p.shift_date), p.shift.start_hour, p.shift.start_minute);
  return { title: p.shift.title, start, end: start + shiftDurationMinutes(p.shift) * 60_000, calendarId };
}

