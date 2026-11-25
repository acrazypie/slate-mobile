// What each calendar day shows, computed from the data snapshot: block
// occurrences, placed shifts (an overnight shift also appears, clipped, on
// the next day) and the hours that count towards the summaries.

import { addDays, startOfWeek } from 'date-fns';
import type { Block, BlockCategory, PlacedShift } from './types';
import { paidShiftMinutes, shiftDurationMinutes } from './types';
import { keyFromDate, weekOffsetForDate } from './recurrence';
import { blocksForWeek, placedShifts } from '../data/repository';
import type { SlateData } from '../data/schema';

export interface ShiftSegment {
  placed: PlacedShift;
  start: number;
  end: number;
  /** The tail of an overnight shift that started the day before. */
  continued: boolean;
}

export interface DayContent {
  date: Date;
  key: string;
  blocks: Block[];
  shifts: ShiftSegment[];
  /** Minutes planned on this day (blocks + shifts that start on it). */
  minutes: number;
}

export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const daysFrom = (start: Date, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

export function dayContents(data: SlateData, days: Date[]): DayContent[] {
  if (days.length === 0) return [];
  const byWeek = new Map<number, Block[]>();
  const blocksOf = (d: Date) => {
    const w = weekOffsetForDate(d);
    if (!byWeek.has(w)) byWeek.set(w, blocksForWeek(data.blocks, w));
    const dow = (d.getDay() + 6) % 7;
    return byWeek.get(w)!.filter((b) => b.day_of_week === dow);
  };
  const firstKey = keyFromDate(addDays(days[0], -1));
  const lastKey = keyFromDate(days[days.length - 1]);
  const placed = placedShifts(data, firstKey, lastKey);

  return days.map((date) => {
    const key = keyFromDate(date);
    const prevKey = keyFromDate(addDays(date, -1));
    const blocks = blocksOf(date);
    const shifts: ShiftSegment[] = [];
    for (const p of placed) {
      const s = p.shift;
      const start = s.start_hour * 60 + s.start_minute;
      const len = shiftDurationMinutes(s);
      if (p.shift_date === key) shifts.push({ placed: p, start, end: Math.min(start + len, 1440), continued: false });
      else if (p.shift_date === prevKey && start + len > 1440) shifts.push({ placed: p, start: 0, end: start + len - 1440, continued: true });
    }
    const minutes =
      blocks.reduce((m, b) => m + b.duration_minutes, 0) +
      shifts.filter((s) => !s.continued).reduce((m, s) => m + shiftDurationMinutes(s.placed.shift), 0);
    return { date, key, blocks, shifts, minutes };
  });
}

export interface Summary {
  /** Hours counted: blocks plus shifts without their unpaid breaks. */
  total: number;
  byCategory: Record<BlockCategory, number>;
  /** Paid shift minutes (duration minus breaks). */
  shifts: number;
  /** Unpaid break minutes across the shifts in the period. */
  breaks: number;
  /** Paid shift minutes per Monday-to-Sunday week, keyed by that Monday ('yyyy-MM-dd'). */
  shiftsByWeek: Record<string, number>;
}

export function summarize(contents: DayContent[]): Summary {
  const byCategory: Record<BlockCategory, number> = { studio: 0, lavoro: 0, lezione: 0, altro: 0 };
  let shifts = 0;
  let breaks = 0;
  const shiftsByWeek: Record<string, number> = {};
  for (const d of contents) {
    for (const b of d.blocks) byCategory[b.category] += b.duration_minutes;
    for (const s of d.shifts) {
      if (s.continued) continue;
      const paid = paidShiftMinutes(s.placed.shift);
      shifts += paid;
      breaks += Math.min(s.placed.shift.break_minutes, shiftDurationMinutes(s.placed.shift));
      const week = keyFromDate(weekStart(d.date));
      shiftsByWeek[week] = (shiftsByWeek[week] ?? 0) + paid;
    }
  }
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0) + shifts;
  return { total, byCategory, shifts, breaks, shiftsByWeek };
}

/** "4h", "4h30", "45m" — compact, for day headers. */
export function compactHours(minutes: number): string {
  if (minutes === 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

/** ISO week number, for the "Week 48" tag. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
