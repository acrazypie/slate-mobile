// Which reminders should be on the phone, and when. Pure (no Capacitor), so
// scripts/test-notify.ts can check it. notifications.ts schedules the result.
//
// Only the next REMINDER_WINDOW_DAYS are planned, and at most MAX_PENDING
// notifications: iOS keeps 64 pending local notifications per app.

import type { SlateData } from '../data/schema';
import { placedShifts } from '../data/repository';
import { dateForWeekOffset, dateFromKey, getSeriesOccurrenceDates, keyFromDate, weekOffsetForDate } from '../lib/recurrence';
import type { Block } from '../lib/types';
import { formatTime } from '../lib/types';

export const REMINDER_WINDOW_DAYS = 14;
export const MAX_PENDING = 60;

/** The lead times offered in the pickers, in minutes before the start. */
export const LEAD_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440];

export interface PlannedReminder {
  /** Stable for one occurrence, so a reschedule replaces rather than duplicates it. */
  id: number;
  kind: 'event' | 'shift';
  title: string;
  /** Start time, 'HH:MM'. */
  time: string;
  /** When to show it, in ms since the epoch. */
  at: number;
}

/**
 * The lead for one item: its own reminder if set (null = off), else the
 * default. Returns null when the item should have no reminder.
 */
export function leadFor(own: number | null | undefined, defaultLead: number): number | null {
  if (own === null) return null;
  return own === undefined ? defaultLead : own;
}

/** A small, stable 32-bit hash of a key, mapped into the range used for reminders. */
export function reminderId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 1..2 are used for the version and Ko-fi notices.
  return 1000 + ((h >>> 0) % 2_000_000_000);
}

function at(date: Date, hour: number, minute: number): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).getTime();
}

/** The days a block falls on, skipping deleted occurrences. */
function blockDates(b: Block): Date[] {
  if (!b.is_recurring) return [dateForWeekOffset(b.week_offset, b.day_of_week)];
  const skipped = new Set(b.skipped_weeks ?? []);
  return getSeriesOccurrenceDates(b).filter((d) => !skipped.has(weekOffsetForDate(d)));
}

export function plannedReminders(data: SlateData, now: number, windowDays = REMINDER_WINDOW_DAYS): PlannedReminder[] {
  const n = data.settings.notifications;
  if (!n.enabled) return [];
  const today = dateFromKey(keyFromDate(new Date(now)));
  const last = new Date(today);
  last.setDate(last.getDate() + windowDays);
  const from = keyFromDate(today);
  const to = keyFromDate(last);
  const out: PlannedReminder[] = [];

  const add = (kind: PlannedReminder['kind'], key: string, title: string, startHour: number, startMinute: number, date: Date, lead: number) => {
    const start = at(date, startHour, startMinute);
    const fireAt = start - lead * 60_000;
    if (fireAt <= now) return;
    out.push({ id: reminderId(key), kind, title, time: formatTime(startHour, startMinute), at: fireAt });
  };

  if (n.events) {
    for (const b of data.blocks) {
      const lead = leadFor(b.reminder_minutes, n.leadMinutes);
      if (lead === null) continue;
      for (const date of blockDates(b)) {
        const key = keyFromDate(date);
        if (key < from || key > to) continue;
        add('event', `e:${b.id}:${key}`, b.title, b.start_hour, b.start_minute, date, lead);
      }
    }
  }

  if (n.shifts) {
    for (const p of placedShifts(data, from, to)) {
      const lead = leadFor(p.shift.reminder_minutes, n.leadMinutes);
      if (lead === null) continue;
      add('shift', `s:${p.id}`, p.shift.title, p.shift.start_hour, p.shift.start_minute, dateFromKey(p.shift_date), lead);
    }
  }

  return out.sort((a, b) => a.at - b.at || a.id - b.id).slice(0, MAX_PENDING);
}
