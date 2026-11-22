// Checks data that comes from outside the app's own code paths: a backup file
// being imported, or whatever is in storage at launch. Every entity is checked
// field by field; nothing is trusted because it parsed as JSON.

import type { Block, BlockCategory, Shift, ShiftAssignment } from '../lib/types';
import { CATEGORIES, HEX_COLOR } from '../lib/types';
import { isLocale } from '../i18n/config';
import { DEFAULT_SETTINGS, type CalendarSettings, type Settings } from './schema';

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
    color: color(raw, 'color', path),
    created_at: stamp(raw, 'created_at'),
    updated_at: stamp(raw, 'updated_at'),
  };
  if (shift.start_hour === shift.end_hour && shift.start_minute === shift.end_minute) {
    throw new ValidationError(path, 'a shift cannot start and end at the same time');
  }
  return shift;
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
  return {
    theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : base.theme,
    accent: typeof s.accent === 'string' && HEX_COLOR.test(s.accent) ? s.accent.toUpperCase() : base.accent,
    locale: s.locale === null ? null : isLocale(s.locale) ? s.locale : base.locale,
    defaultView: s.defaultView === 'day' || s.defaultView === 'week' || s.defaultView === 'month' ? s.defaultView : base.defaultView,
    monthStyle: s.monthStyle === 'compact' || s.monthStyle === 'detailed' ? s.monthStyle : base.monthStyle,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : base.haptics,
    onboarded: typeof s.onboarded === 'boolean' ? s.onboarded : base.onboarded,
    calendar,
  };
}

/**
 * Validates the three collections together: ids must be unique, every
 * assignment must point at an existing shift, and a shift can be placed on a
 * day only once. Throws on the first problem.
 */
export function validateCollections(raw: Obj): { blocks: Block[]; shifts: Shift[]; assignments: ShiftAssignment[] } {
  for (const key of ['blocks', 'shifts', 'assignments']) {
    if (!Array.isArray(raw[key])) throw new ValidationError(key, 'expected a list');
  }
  const blocks = (raw.blocks as unknown[]).map((b, i) => validateBlock(b, `blocks[${i}]`));
  const shifts = (raw.shifts as unknown[]).map((s, i) => validateShift(s, `shifts[${i}]`));
  const assignments = (raw.assignments as unknown[]).map((a, i) => validateAssignment(a, `assignments[${i}]`));

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

  const shiftIds = new Set(shifts.map((s) => s.id));
  const placed = new Set<string>();
  assignments.forEach((a, i) => {
    if (!shiftIds.has(a.shift_id)) throw new ValidationError(`assignments[${i}].shift_id`, 'refers to a shift that does not exist');
    const key = `${a.shift_id}@${a.shift_date}`;
    if (placed.has(key)) throw new ValidationError(`assignments[${i}]`, 'the same shift is placed twice on one day');
    placed.add(key);
  });
  return { blocks, shifts, assignments };
}
