// Checks data that comes from outside the app's own code paths: a backup file
// being imported, or whatever is in storage at launch. Every entity is checked
// field by field; nothing is trusted because it parsed as JSON.

import type { Block, BlockCategory, Rotation, Shift, ShiftAssignment, ViewMode } from '../lib/types';
import { BREAK_MAX_MINUTES, CATEGORIES, HEX_COLOR, ROTATION_MAX_DAYS, ROTATION_MIN_DAYS, shiftDurationMinutes } from '../lib/types';
import { isLocale } from '../i18n/config';
import { REPORT_KINDS, type Report, type ReportKind } from '../lib/reportTypes';
import type { RangeKind, SummaryRange } from '../lib/summaryRange';
import { DEFAULT_SETTINGS, type CalendarSettings, type NotificationSettings, type PaySettings, type Settings } from './schema';

export class ValidationError extends Error {
  constructor(public readonly path: string, message: string) {
    super(`${path}: ${message}`);
  }
}

type Obj = Record<string, unknown>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(o: Obj, k: string, path: string, opts: { max?: number; allowEmpty?: boolean } = {}): string {
  const v = o[k];
  if (typeof v !== 'string') throw new ValidationError(`${path}.${k}`, 'expected a string');
  if (!opts.allowEmpty && v.trim() === '') throw new ValidationError(`${path}.${k}`, 'must not be empty');
  if (v.length > (opts.max ?? 2000)) throw new ValidationError(`${path}.${k}`, 'too long');
  return v;
}
function int(o: Obj, k: string, path: string, min: number, max: number): number {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new ValidationError(`${path}.${k}`, `expected an integer between ${min} and ${max}`);
  }
  return v;
}
function color(o: Obj, k: string, path: string): string {
  const v = str(o, k, path);
  if (!HEX_COLOR.test(v)) throw new ValidationError(`${path}.${k}`, 'expected a #rrggbb colour');
  return v.toUpperCase();
}
function dateKey(o: Obj, k: string, path: string): string {
  const v = str(o, k, path);
  if (!DATE_KEY.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
    throw new ValidationError(`${path}.${k}`, 'expected a yyyy-MM-dd date');
  }
  return v;
}
function stamp(o: Obj, k: string): string {
  const v = o[k];
  return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString();
}
function id(o: Obj, path: string): string {
  return str(o, 'id', path, { max: 100 });
}

/** A reminder: absent = default (undefined), null = off, else minutes before the start. */
function reminder(o: Obj, path: string): number | null | undefined {
  if (o.reminder_minutes === undefined) return undefined;
  if (o.reminder_minutes === null) return null;
  return int(o, 'reminder_minutes', path, 0, 10080);
}

export function validateBlock(raw: unknown, path: string): Block {
  if (!isObj(raw)) throw new ValidationError(path, 'expected an object');
  const blockId = id(raw, path);
  const category = raw.category;
  if (typeof category !== 'string' || !CATEGORIES.includes(category as BlockCategory)) {
    throw new ValidationError(`${path}.category`, `expected one of ${CATEGORIES.join(', ')}`);
  }
  const isRecurring = raw.is_recurring === true;
  const block: Block = {
    id: blockId,
    title: str(raw, 'title', path, { max: 200 }),
    category: category as BlockCategory,
    color: color(raw, 'color', path),
    day_of_week: int(raw, 'day_of_week', path, 0, 6),
    start_hour: int(raw, 'start_hour', path, 0, 23),
    start_minute: int(raw, 'start_minute', path, 0, 59),
    duration_minutes: int(raw, 'duration_minutes', path, 5, 24 * 60),
    week_offset: int(raw, 'week_offset', path, -5000, 5000),
    notes: raw.notes == null || raw.notes === '' ? null : str(raw, 'notes', path, { max: 5000, allowEmpty: true }),
    is_recurring: isRecurring,
    created_at: stamp(raw, 'created_at'),
    updated_at: stamp(raw, 'updated_at'),
  };
  const blockReminder = reminder(raw, path);
  if (blockReminder !== undefined) block.reminder_minutes = blockReminder;
  if (isRecurring) {
    if (raw.recurrence_type !== 'weekly' && raw.recurrence_type !== 'monthly') {
      throw new ValidationError(`${path}.recurrence_type`, 'expected weekly or monthly');
    }
    block.recurrence_type = raw.recurrence_type;
    if (raw.recurrence_end_date != null) block.recurrence_end_date = dateKey(raw, 'recurrence_end_date', path);
    block.recurrence_group_id = blockId;
    const skipped = raw.skipped_weeks;
    if (skipped != null) {
      if (!Array.isArray(skipped) || skipped.some((w) => typeof w !== 'number' || !Number.isInteger(w))) {
        throw new ValidationError(`${path}.skipped_weeks`, 'expected a list of week numbers');
      }
      block.skipped_weeks = [...new Set(skipped as number[])].sort((a, b) => a - b);
    }
  }
  return block;
}

export function validateShift(raw: unknown, path: string): Shift {
  if (!isObj(raw)) throw new ValidationError(path, 'expected an object');
  const shift: Shift = {
    id: id(raw, path),
    title: str(raw, 'title', path, { max: 100 }),
    start_hour: int(raw, 'start_hour', path, 0, 23),
    start_minute: int(raw, 'start_minute', path, 0, 59),
    end_hour: int(raw, 'end_hour', path, 0, 23),
    end_minute: int(raw, 'end_minute', path, 0, 59),
    // Shifts stored before schema 2 have no break.
    break_minutes: raw.break_minutes === undefined ? 0 : int(raw, 'break_minutes', path, 0, BREAK_MAX_MINUTES),
    color: color(raw, 'color', path),
    created_at: stamp(raw, 'created_at'),
    updated_at: stamp(raw, 'updated_at'),
  };
  const shiftReminder = reminder(raw, path);
  if (shiftReminder !== undefined) shift.reminder_minutes = shiftReminder;
  if (shift.start_hour === shift.end_hour && shift.start_minute === shift.end_minute) {
    throw new ValidationError(path, 'a shift cannot start and end at the same time');
  }
  if (shift.break_minutes > 0 && shift.break_minutes >= shiftDurationMinutes(shift)) {
    throw new ValidationError(`${path}.break_minutes`, 'the break must be shorter than the shift');
  }
  return shift;
}

export function validateRotation(raw: unknown, path: string): Rotation {
  if (!isObj(raw)) throw new ValidationError(path, 'expected an object');
  const pattern = raw.pattern;
  if (!Array.isArray(pattern) || pattern.length < ROTATION_MIN_DAYS || pattern.length > ROTATION_MAX_DAYS) {
    throw new ValidationError(`${path}.pattern`, `expected ${ROTATION_MIN_DAYS} to ${ROTATION_MAX_DAYS} days`);
  }
  return {
    id: id(raw, path),
    title: str(raw, 'title', path, { max: 100 }),
    pattern: pattern.map((entry, i) => {
      if (entry === null) return null;
      if (typeof entry !== 'string' || entry.length === 0 || entry.length > 100) {
        throw new ValidationError(`${path}.pattern[${i}]`, 'expected a shift id or null');
      }
      return entry;
    }),
    created_at: stamp(raw, 'created_at'),
    updated_at: stamp(raw, 'updated_at'),
  };
}

export function validateAssignment(raw: unknown, path: string): ShiftAssignment {
  if (!isObj(raw)) throw new ValidationError(path, 'expected an object');
  return {
    id: id(raw, path),
    shift_id: str(raw, 'shift_id', path, { max: 100 }),
    shift_date: dateKey(raw, 'shift_date', path),
    created_at: stamp(raw, 'created_at'),
  };
}

/** Settings are forgiving: anything unknown or invalid falls back to the default. */
export function sanitizeSettings(raw: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const s = isObj(raw) ? raw : {};
  const cal = isObj(s.calendar) ? s.calendar : {};
  const baseCal = base.calendar;
  const calendar: CalendarSettings = {
    showDeviceEvents: typeof cal.showDeviceEvents === 'boolean' ? cal.showDeviceEvents : baseCal.showDeviceEvents,
    visibleCalendarIds:
      cal.visibleCalendarIds === null
        ? null
        : Array.isArray(cal.visibleCalendarIds)
          ? cal.visibleCalendarIds.filter((x): x is string => typeof x === 'string')
          : baseCal.visibleCalendarIds,
    push: typeof cal.push === 'boolean' ? cal.push : baseCal.push,
    pushShifts: typeof cal.pushShifts === 'boolean' ? cal.pushShifts : baseCal.pushShifts,
    targetCalendarId:
      typeof cal.targetCalendarId === 'string' || cal.targetCalendarId === null
        ? (cal.targetCalendarId as string | null)
        : baseCal.targetCalendarId,
  };
  const pay = isObj(s.pay) ? s.pay : {};
  const basePay = base.pay;
  const payOut: PaySettings = {
    hourlyRate: pay.hourlyRate === null ? null : typeof pay.hourlyRate === 'number' && pay.hourlyRate >= 0 && pay.hourlyRate < 1e6 ? pay.hourlyRate : basePay.hourlyRate,
    currency: typeof pay.currency === 'string' ? pay.currency.slice(0, 4) : basePay.currency,
    overtimeAfterHours:
      pay.overtimeAfterHours === null
        ? null
        : typeof pay.overtimeAfterHours === 'number' && pay.overtimeAfterHours >= 1 && pay.overtimeAfterHours <= 168
          ? pay.overtimeAfterHours
          : basePay.overtimeAfterHours,
    overtimeMultiplier:
      typeof pay.overtimeMultiplier === 'number' && pay.overtimeMultiplier >= 1 && pay.overtimeMultiplier <= 3
        ? pay.overtimeMultiplier
        : basePay.overtimeMultiplier,
  };
  const n = isObj(s.notifications) ? s.notifications : {};
  const baseN = base.notifications;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const notifications: NotificationSettings = {
    enabled: bool(n.enabled, baseN.enabled),
    leadMinutes: typeof n.leadMinutes === 'number' && Number.isInteger(n.leadMinutes) && n.leadMinutes >= 0 && n.leadMinutes <= 10080 ? n.leadMinutes : baseN.leadMinutes,
    events: bool(n.events, baseN.events),
    shifts: bool(n.shifts, baseN.shifts),
    newVersion: bool(n.newVersion, baseN.newVersion),
    donate: bool(n.donate, baseN.donate),
  };
  const sr = isObj(s.summaryRange) ? s.summaryRange : {};
  const baseR = base.summaryRange;
  const RANGE_KINDS: RangeKind[] = ['week', 'month', 'custom'];
  const whole = (v: unknown, lo: number, hi: number, fallback: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
  const day = (v: unknown, fallback: string | null) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback);
  const summaryRange: SummaryRange = {
    kind: RANGE_KINDS.includes(sr.kind as RangeKind) ? (sr.kind as RangeKind) : baseR.kind,
    weekday: whole(sr.weekday, 0, 6, baseR.weekday),
    fortnightWeek: sr.fortnightWeek === 2 ? 2 : sr.fortnightWeek === 1 ? 1 : baseR.fortnightWeek,
    monthDay: whole(sr.monthDay, 1, 31, baseR.monthDay),
    yearMonth: whole(sr.yearMonth, 1, 12, baseR.yearMonth),
    yearDay: whole(sr.yearDay, 1, 31, baseR.yearDay),
    customStart: day(sr.customStart, baseR.customStart),
    customEnd: day(sr.customEnd, baseR.customEnd),
  };
  return {
    theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : base.theme,
    oled: typeof s.oled === 'boolean' ? s.oled : base.oled,
    summaryRange,
    mode: s.mode === 'local' || s.mode === 'hosted' ? s.mode : base.mode,
    pay: payOut,
    notifications,
    accent: typeof s.accent === 'string' && HEX_COLOR.test(s.accent) ? s.accent.toUpperCase() : base.accent,
    locale: s.locale === null ? null : isLocale(s.locale) ? s.locale : base.locale,
    defaultView: (['day', 'week', 'month', 'agenda'] as unknown[]).includes(s.defaultView) ? (s.defaultView as ViewMode) : base.defaultView,
    monthStyle: s.monthStyle === 'compact' || s.monthStyle === 'detailed' ? s.monthStyle : base.monthStyle,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : base.haptics,
    hideEmptyTips: typeof s.hideEmptyTips === 'boolean' ? s.hideEmptyTips : base.hideEmptyTips,
    onboarded: typeof s.onboarded === 'boolean' ? s.onboarded : base.onboarded,
    calendar,
  };
}

/**
 * Validates the three collections together: ids must be unique, every
 * assignment must point at an existing shift, and a shift can be placed on a
 * day only once. Throws on the first problem.
 */
export function validateReport(raw: unknown, path: string): Report {
  if (!isObj(raw)) throw new ValidationError(path, 'expected an object');
  if (typeof raw.kind !== 'string' || !REPORT_KINDS.includes(raw.kind as ReportKind)) {
    throw new ValidationError(`${path}.kind`, 'expected hours, counts, overtime or pay');
  }
  return { id: id(raw, path), kind: raw.kind as ReportKind, created_at: stamp(raw, 'created_at') };
}

export function validateCollections(raw: Obj): {
  blocks: Block[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  rotations: Rotation[];
  reports: Report[];
} {
  for (const key of ['blocks', 'shifts', 'assignments']) {
    if (!Array.isArray(raw[key])) throw new ValidationError(key, 'expected a list');
  }
  if (raw.rotations !== undefined && !Array.isArray(raw.rotations)) throw new ValidationError('rotations', 'expected a list');
  const blocks = (raw.blocks as unknown[]).map((b, i) => validateBlock(b, `blocks[${i}]`));
  const shifts = (raw.shifts as unknown[]).map((s, i) => validateShift(s, `shifts[${i}]`));
  const assignments = (raw.assignments as unknown[]).map((a, i) => validateAssignment(a, `assignments[${i}]`));
  const rotations = ((raw.rotations as unknown[] | undefined) ?? []).map((r, i) => validateRotation(r, `rotations[${i}]`));

  const unique = (items: { id: string }[], name: string) => {
    const seen = new Set<string>();
    items.forEach((item, i) => {
      if (seen.has(item.id)) throw new ValidationError(`${name}[${i}].id`, 'duplicate id');
      seen.add(item.id);
    });
  };
  unique(blocks, 'blocks');
  unique(shifts, 'shifts');
  unique(assignments, 'assignments');
  if (raw.reports !== undefined && !Array.isArray(raw.reports)) throw new ValidationError('reports', 'expected a list');
  const reports = ((raw.reports as unknown[] | undefined) ?? []).map((r, i) => validateReport(r, `reports[${i}]`));
  unique(reports, 'reports');
  unique(rotations, 'rotations');

  const shiftIds = new Set(shifts.map((s) => s.id));
  rotations.forEach((r, i) => {
    r.pattern.forEach((shiftId, j) => {
      if (shiftId !== null && !shiftIds.has(shiftId)) {
        throw new ValidationError(`rotations[${i}].pattern[${j}]`, 'refers to a shift that does not exist');
      }
    });
  });
  const placed = new Set<string>();
  assignments.forEach((a, i) => {
    if (!shiftIds.has(a.shift_id)) throw new ValidationError(`assignments[${i}].shift_id`, 'refers to a shift that does not exist');
    const key = `${a.shift_id}@${a.shift_date}`;
    if (placed.has(key)) throw new ValidationError(`assignments[${i}]`, 'the same shift is placed twice on one day');
    placed.add(key);
  });
  return { blocks, shifts, assignments, rotations, reports };
}
