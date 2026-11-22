// Shared types, palettes and small formatters. Ported from the web app's
// lib/types.ts without the Supabase/Google fields: there is no user_id (the
// data never leaves the device) and Google events are replaced by device
// calendar events (DeviceEvent).

export type BlockCategory = 'studio' | 'lavoro' | 'lezione' | 'altro';
export type RecurrenceType = 'weekly' | 'monthly';
export type ViewMode = 'day' | 'week' | 'month';

/**
 * An event, or a whole recurring series. For a series, `week_offset` +
 * `day_of_week` give the first occurrence, and `skipped_weeks` replaces the
 * web app's block_exceptions table (one entry per deleted occurrence).
 */
export interface Block {
  id: string;
  title: string;
  category: BlockCategory;
  color: string;
  day_of_week: number;
  start_hour: number;
  start_minute: number;
  duration_minutes: number;
  /** Weeks since Monday 2024-01-01 (EPOCH_WEEK_START in recurrence.ts). */
  week_offset: number;
  notes: string | null;
  is_recurring: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
  /** Equals `id` for a series; kept as the "is a series" marker, like the web app. */
  recurrence_group_id?: string;
  /** Week offsets of deleted occurrences ("only this one"). */
  skipped_weeks?: number[];
  created_at: string;
  updated_at: string;
}

/** A reusable shift definition (e.g. "Mattina 09:00-13:00"). Never recurring. */
export interface Shift {
  id: string;
  title: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftFormData {
  title: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  color: string;
}

/** A shift placed on one calendar day. Unique on (shift_id, shift_date). */
export interface ShiftAssignment {
  id: string;
  shift_id: string;
  shift_date: string; // 'yyyy-MM-dd'
  created_at: string;
}

/** An assignment joined with its shift, as the views use it. */
export interface PlacedShift extends ShiftAssignment {
  shift: Shift;
}

export interface BlockFormData {
  title: string;
  category: BlockCategory;
  color: string;
  day_of_week: number;
  start_hour: number;
  start_minute: number;
  duration_minutes: number;
  notes: string;
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
}

/** An occurrence as the views draw it: the series id, the week being shown. */
export type BlockOccurrence = Block;

/**
 * An event read from a calendar on the device (EventKit / CalendarContract),
 * shown read-only next to Slate's blocks. Dates and times are wall-clock
 * values in the device's zone. Recurring events arrive already expanded.
 */
export interface DeviceEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  notes: string;
  location: string | null;
  color: string;
  allDay: boolean;
  /** First day, 'yyyy-MM-dd'. */
  startDate: string;
  /** Last day, inclusive. */
  endDate: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
}

/** The part of a device event that falls on one day, in minutes from midnight. */
export interface DeviceEventSegment {
  event: DeviceEvent;
  start: number;
  end: number;
}

/**
 * Splits events into what one day shows: all-day events as a list, timed
 * events as the slice of them that falls on that day.
 */
export function deviceEventsForDay(
  events: DeviceEvent[],
  dateKey: string,
): { allDay: DeviceEvent[]; timed: DeviceEventSegment[] } {
  const allDay: DeviceEvent[] = [];
  const timed: DeviceEventSegment[] = [];
  for (const event of events) {
    if (dateKey < event.startDate || dateKey > event.endDate) continue;
    if (event.allDay) {
      allDay.push(event);
      continue;
    }
    const start = dateKey === event.startDate ? event.start_hour * 60 + event.start_minute : 0;
    const end = dateKey === event.endDate ? event.end_hour * 60 + event.end_minute : 24 * 60;
    if (end > start) timed.push({ event, start, end });
  }
  timed.sort((a, b) => a.start - b.start || a.end - b.end);
  return { allDay, timed };
}

/** Where a card sits when several overlap: column `col` of `cols` side by side. */
export interface OverlapSlot {
  col: number;
  cols: number;
}

/**
 * Lays overlapping items out side by side. Items that overlap, directly or
 * through a chain of others, share a cluster and split the width evenly.
 */
export function layoutOverlaps<K>(items: { key: K; start: number; end: number }[]): Map<K, OverlapSlot> {
  const result = new Map<K, OverlapSlot>();
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: { key: K; col: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const entry of cluster) result.set(entry.key, { col: entry.col, cols: columnEnds.length });
    cluster = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    let col = columnEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[col] = item.end;
    }
    cluster.push({ key: item.key, col });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return result;
}

/**
 * Inline `left`/`right` for a card that shares its hour with others. Events sit
 * in the right half of the column when the day also has shifts (`half`).
 */
export function overlapPosition(slot: OverlapSlot | undefined, half?: boolean): { left: string; right: string } | undefined {
  const areaStart = half ? 50 : 0;
  const areaWidth = half ? 50 : 100;
  if (!slot || slot.cols <= 1) {
    return half ? { left: 'calc(50% + 1px)', right: '2px' } : undefined;
  }
  const left = areaStart + (slot.col / slot.cols) * areaWidth;
  const right = 100 - (areaStart + ((slot.col + 1) / slot.cols) * areaWidth);
  return { left: `calc(${left}% + 1px)`, right: `calc(${right}% + 1px)` };
}

export const SHIFT_DEFAULT_COLOR = '#6BB6A3';

export function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/** Short form for tight spaces: "9–13", "9:30–13". */
export function formatCompactRange(sh: number, sm: number, eh: number, em: number): string {
  const part = (h: number, m: number) => (m === 0 ? `${h}` : `${h}:${m.toString().padStart(2, '0')}`);
  return `${part(sh, sm)}–${part(eh, em)}`;
}

/** "1h 30", "45 min", "8h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, '0')}`;
}

export function blockEndTime(block: Pick<Block, 'start_hour' | 'start_minute' | 'duration_minutes'>) {
  const total = block.start_hour * 60 + block.start_minute + block.duration_minutes;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
}

type ShiftTimes = Pick<Shift, 'start_hour' | 'start_minute' | 'end_hour' | 'end_minute'>;

/** A shift whose end is at or before its start runs past midnight. */
export function isOvernightShift(shift: ShiftTimes): boolean {
  return shift.end_hour * 60 + shift.end_minute <= shift.start_hour * 60 + shift.start_minute;
}

export function shiftDurationMinutes(shift: ShiftTimes): number {
  const start = shift.start_hour * 60 + shift.start_minute;
  const end = shift.end_hour * 60 + shift.end_minute;
  return end > start ? end - start : end + 24 * 60 - start;
}

/** Dark or light text, whichever reads better on the colour. */
export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#141414' : '#ffffff';
}

export const CATEGORY_COLORS: Record<BlockCategory, string> = {
  studio: '#BB86FC',
  lavoro: '#E49C69',
  lezione: '#FFD9A0',
  altro: '#CF6679',
};

/** Category keys are stored data and stay Italian; their labels are in `t.categories`. */
export const CATEGORIES: BlockCategory[] = ['studio', 'lavoro', 'lezione', 'altro'];

export const COLOR_PALETTE = [
  '#E49C69', // apricot dust
  '#FFD9A0', // sand nougat
  '#F2C299', // dune beach
  '#5C3B2E', // cacao husk
  '#BB86FC', // violet
  '#CF6679', // rose
  '#6BB6A3', // teal
  '#7AA7D9', // sky blue
];

export type ColorKey =
  | 'apricot' | 'sand' | 'dune' | 'cacao' | 'violet' | 'raspberry' | 'teal' | 'skyBlue' | 'amber' | 'sage' | 'pink';

export const COLOR_KEYS: Record<string, ColorKey> = {
  '#E49C69': 'apricot',
  '#FFD9A0': 'sand',
  '#F2C299': 'dune',
  '#5C3B2E': 'cacao',
  '#BB86FC': 'violet',
  '#CF6679': 'raspberry',
  '#6BB6A3': 'teal',
  '#7AA7D9': 'skyBlue',
};

export function colorKey(hex: string): ColorKey | undefined {
  return COLOR_KEYS[hex.toUpperCase()] ?? COLOR_KEYS[hex];
}

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
