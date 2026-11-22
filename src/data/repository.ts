// The single entry point to Slate's data. Everything lives in memory as one
// immutable snapshot (UI reads it with useSyncExternalStore) and is written
// to the KeyValueStore after every change, as one JSON document.
//
// Behaviour is the web app's, minus the network: recurring series are one
// row expanded on read, delete offers this / this-and-following / all,
// shifts are placed per day and may run past midnight.

import { addDays } from 'date-fns';
import type { Block, BlockFormData, PlacedShift, Shift, ShiftAssignment, ShiftFormData } from '../lib/types';
import {
  dateForWeekOffset,
  getSeriesOccurrenceWeekOffsets,
  isWeekOffsetInSeries,
  keyFromDate,
} from '../lib/recurrence';
import { emptyData, SCHEMA_VERSION, type Settings, type SlateData } from './schema';
import { migrate, TooNewError } from './migrations';
import { sanitizeSettings, validateCollections, ValidationError } from './validate';
import type { KeyValueStore } from './storage';

export const DATA_KEY = 'slate:data';

export type DeleteScope = 'current' | 'this-and-following' | 'all';

/** What a backup file looks like. `data` has the same shape as the stored document. */
export interface BackupFile {
  app: 'slate';
  format: 1;
  exportedAt: string;
  data: Omit<SlateData, 'settings'> & { settings: Partial<Settings> };
}

export type ImportError =
  | { kind: 'notJson' }
  | { kind: 'notSlate' }
  | { kind: 'tooNew'; version: number }
  | { kind: 'invalid'; detail: string };

export type ImportResult = { ok: true; counts: { blocks: number; shifts: number; assignments: number } } | { ok: false; error: ImportError };

/** Change notification for listeners that mirror data elsewhere (device calendar push). */
export interface ChangeEvent {
  blocks: boolean;
  shifts: boolean;
  settings: boolean;
}

const byTime = (a: Block, b: Block) =>
  a.day_of_week - b.day_of_week || a.start_hour - b.start_hour || a.start_minute - b.start_minute;
const shiftOrder = (a: Shift, b: Shift) =>
  a.start_hour * 60 + a.start_minute - (b.start_hour * 60 + b.start_minute) || a.title.localeCompare(b.title);

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // WebViews without randomUUID (Android System WebView < 92)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class SlateRepository {
  private data: SlateData = emptyData();
  private listeners = new Set<() => void>();
  private changeListeners = new Set<(e: ChangeEvent) => void>();
  private writing: Promise<void> = Promise.resolve();
  /** Set if the stored document could not be read; the app shows it once. */
  loadProblem: string | null = null;

  constructor(private readonly store: KeyValueStore, private readonly now: () => Date = () => new Date()) {}

  // ---------------------------------------------------------------------------
  // Lifecycle

  async load(): Promise<void> {
    const raw = await this.store.get(DATA_KEY);
    if (!raw) {
      this.data = emptyData();
      return;
    }
    try {
      this.data = parseDocument(JSON.parse(raw));
      if (JSON.parse(raw).schemaVersion !== SCHEMA_VERSION) await this.persist(); // write back migrated data
    } catch (err) {
      // Keep the unreadable document instead of overwriting it, so nothing is
      // lost for good; start empty and tell the user.
      const backupKey = `${DATA_KEY}:unreadable:${Date.now()}`;
      await this.store.set(backupKey, raw);
      this.loadProblem = err instanceof Error ? err.message : String(err);
      this.data = emptyData();
    }
  }

  getSnapshot = (): SlateData => this.data;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  onChange(listener: (e: ChangeEvent) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** Resolves once every write so far has reached storage. */
  flush(): Promise<void> {
    return this.writing;
  }

  private commit(next: Partial<SlateData>, what: ChangeEvent) {
    this.data = { ...this.data, ...next };
    this.listeners.forEach((l) => l());
    this.changeListeners.forEach((l) => l(what));
    return this.persist();
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data);
    this.writing = this.writing
      .then(() => this.store.set(DATA_KEY, snapshot))
      .catch((err) => console.error('[slate] could not save', err));
    return this.writing;
  }

  private stamp() {
    return this.now().toISOString();
  }

  // ---------------------------------------------------------------------------
  // Blocks

  getBlock(id: string): Block | undefined {
    return this.data.blocks.find((b) => b.id === id);
  }

  /**
   * Every block shown in one stored week: plain blocks of that week plus one
   * synthesized occurrence per series that falls in it (series id, this week's
   * offset), minus skipped occurrences.
   */
  blocksForWeek(weekOffset: number): Block[] {
    return blocksForWeek(this.data.blocks, weekOffset);
  }

  async createBlock(form: BlockFormData, weekOffset: number): Promise<Block> {
    const id = newId();
    const isRecurring = !!(form.is_recurring && form.recurrence_type);
    const stamp = this.stamp();
    const block: Block = {
      id,
      title: form.title.trim(),
      category: form.category,
      color: form.color,
      day_of_week: form.day_of_week,
      start_hour: form.start_hour,
      start_minute: form.start_minute,
      duration_minutes: form.duration_minutes,
      week_offset: weekOffset,
      notes: form.notes.trim() || null,
      is_recurring: isRecurring,
      created_at: stamp,
      updated_at: stamp,
    };
    if (isRecurring) {
      block.recurrence_type = form.recurrence_type;
      if (form.recurrence_end_date) block.recurrence_end_date = form.recurrence_end_date;
      block.recurrence_group_id = id;
      block.skipped_weeks = [];
    }
    await this.commit({ blocks: [...this.data.blocks, block] }, { blocks: true, shifts: false, settings: false });
    return block;
  }

  /**
   * Edits a block. For a series this edits the template, so the change
   * applies to every occurrence (as in the web app). `weekOffset` moves a
   * plain block to another week (the editor's date field).
   */
  async updateBlock(id: string, form: BlockFormData, weekOffset?: number): Promise<Block | null> {
    const existing = this.getBlock(id);
    if (!existing) return null;
    const isRecurring = !!(form.is_recurring && form.recurrence_type);
    const next: Block = {
      ...existing,
      title: form.title.trim(),
      category: form.category,
      color: form.color,
      day_of_week: form.day_of_week,
      start_hour: form.start_hour,
      start_minute: form.start_minute,
      duration_minutes: form.duration_minutes,
      notes: form.notes.trim() || null,
      is_recurring: isRecurring,
      updated_at: this.stamp(),
    };
    if (weekOffset !== undefined && !existing.is_recurring) next.week_offset = weekOffset;
    if (isRecurring) {
      next.recurrence_type = form.recurrence_type;
      next.recurrence_end_date = form.recurrence_end_date || undefined;
      next.recurrence_group_id = id;
      next.skipped_weeks = existing.skipped_weeks ?? [];
    } else {
      delete next.recurrence_type;
      delete next.recurrence_end_date;
      delete next.recurrence_group_id;
      delete next.skipped_weeks;
    }
    await this.commit(
      { blocks: this.data.blocks.map((b) => (b.id === id ? next : b)) },
      { blocks: true, shifts: false, settings: false },
    );
    return next;
  }

  /** Deletes a plain block, or a whole series. */
  async deleteBlock(id: string): Promise<void> {
    await this.commit(
      { blocks: this.data.blocks.filter((b) => b.id !== id) },
      { blocks: true, shifts: false, settings: false },
    );
  }

  /**
   * The three delete choices for one occurrence of a series, as in the web
   * app's WeekGrid:
   * - current: skip this week; on the first occurrence, move the start to the
   *   next one instead (or delete the series if none remain);
   * - this-and-following: end the series the day before (the whole series if
   *   this is the first occurrence), dropping skipped weeks past the cut;
   * - all: delete the series.
   */
  async deleteOccurrence(seriesId: string, occurrenceWeek: number, scope: DeleteScope): Promise<void> {
    const root = this.getBlock(seriesId);
    if (!root) return;
    if (!root.is_recurring || scope === 'all') return this.deleteBlock(seriesId);

    const skipped = root.skipped_weeks ?? [];
    let next: Block;
    if (scope === 'current') {
      if (root.week_offset === occurrenceWeek) {
        const remaining = getSeriesOccurrenceWeekOffsets(root).filter((w) => w > occurrenceWeek && !skipped.includes(w));
        if (remaining.length === 0) return this.deleteBlock(seriesId);
        next = { ...root, week_offset: remaining[0], skipped_weeks: skipped.filter((w) => w > remaining[0]) };
      } else {
        next = { ...root, skipped_weeks: [...new Set([...skipped, occurrenceWeek])].sort((a, b) => a - b) };
      }
    } else {
      if (root.week_offset === occurrenceWeek) return this.deleteBlock(seriesId);
      const occurrenceDate = dateForWeekOffset(occurrenceWeek, root.day_of_week);
      next = {
        ...root,
        recurrence_end_date: keyFromDate(addDays(occurrenceDate, -1)),
        skipped_weeks: skipped.filter((w) => w < occurrenceWeek),
      };
    }
    next.updated_at = this.stamp();
    await this.commit(
      { blocks: this.data.blocks.map((b) => (b.id === seriesId ? next : b)) },
      { blocks: true, shifts: false, settings: false },
    );
  }

  // ---------------------------------------------------------------------------
  // Shifts

  get shifts(): Shift[] {
    return this.data.shifts;
  }

  async createShift(form: ShiftFormData): Promise<Shift> {
    const stamp = this.stamp();
    const shift: Shift = { id: newId(), ...form, title: form.title.trim(), created_at: stamp, updated_at: stamp };
    await this.commit(
      { shifts: [...this.data.shifts, shift].sort(shiftOrder) },
      { blocks: false, shifts: true, settings: false },
    );
    return shift;
  }

  async updateShift(id: string, form: ShiftFormData): Promise<void> {
    await this.commit(
      {
        shifts: this.data.shifts
          .map((s) => (s.id === id ? { ...s, ...form, title: form.title.trim(), updated_at: this.stamp() } : s))
          .sort(shiftOrder),
      },
      { blocks: false, shifts: true, settings: false },
    );
  }

  /** Deletes the definition and every day it is placed on (the web app's FK cascade). */
  async deleteShift(id: string): Promise<void> {
    await this.commit(
      {
        shifts: this.data.shifts.filter((s) => s.id !== id),
        assignments: this.data.assignments.filter((a) => a.shift_id !== id),
      },
      { blocks: false, shifts: true, settings: false },
    );
  }

  /** Places a shift on a day. Placing the same shift twice on one day is a no-op. */
  async assignShift(shiftId: string, dateKey: string): Promise<void> {
    if (!this.data.shifts.some((s) => s.id === shiftId)) return;
    if (this.data.assignments.some((a) => a.shift_id === shiftId && a.shift_date === dateKey)) return;
    const assignment: ShiftAssignment = { id: newId(), shift_id: shiftId, shift_date: dateKey, created_at: this.stamp() };
    await this.commit(
      { assignments: [...this.data.assignments, assignment] },
      { blocks: false, shifts: true, settings: false },
    );
  }

  async unassignShift(assignmentId: string): Promise<void> {
    await this.commit(
      { assignments: this.data.assignments.filter((a) => a.id !== assignmentId) },
      { blocks: false, shifts: true, settings: false },
    );
  }

  /** Placed shifts with shift_date in [startKey, endKey], joined with their definition. */
  shiftsInRange(startKey: string, endKey: string): PlacedShift[] {
    return placedShifts(this.data, startKey, endKey);
  }

  // ---------------------------------------------------------------------------
  // Settings

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const settings = sanitizeSettings({ ...this.data.settings, ...patch, calendar: { ...this.data.settings.calendar, ...patch.calendar } }, this.data.settings);
    await this.commit({ settings }, { blocks: false, shifts: false, settings: true });
  }

  // ---------------------------------------------------------------------------
  // Backup

  /** Everything except device-specific calendar settings. */
  exportBackup(): BackupFile {
    const { calendar: _calendar, ...portable } = this.data.settings;
    void _calendar;
    return {
      app: 'slate',
      format: 1,
      exportedAt: this.stamp(),
      data: {
        schemaVersion: SCHEMA_VERSION,
        blocks: this.data.blocks,
        shifts: this.data.shifts,
        assignments: this.data.assignments,
        settings: portable,
      },
    };
  }

  /** Checks a backup without changing anything. */
  static parseBackup(text: string, current: Settings): { ok: true; data: SlateData } | { ok: false; error: ImportError } {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: { kind: 'notJson' } };
    }
    if (typeof json !== 'object' || json === null || (json as Record<string, unknown>).app !== 'slate') {
      return { ok: false, error: { kind: 'notSlate' } };
    }
    const file = json as Record<string, unknown>;
    if (typeof file.data !== 'object' || file.data === null) return { ok: false, error: { kind: 'notSlate' } };
    try {
      const data = parseDocument(file.data as Record<string, unknown>, current);
      // Calendar ids belong to this device: keep the current ones, never the
      // file's. The language also stays as it is on this phone.
      data.settings = { ...data.settings, calendar: current.calendar, locale: current.locale, onboarded: true };
      return { ok: true, data };
    } catch (err) {
      if (err instanceof TooNewError) return { ok: false, error: { kind: 'tooNew', version: err.version } };
      return { ok: false, error: { kind: 'invalid', detail: err instanceof Error ? err.message : String(err) } };
    }
  }

  /** Replaces all data with a backup (after validating it). */
  async importBackup(text: string): Promise<ImportResult> {
    const parsed = SlateRepository.parseBackup(text, this.data.settings);
    if (!parsed.ok) return parsed;
    await this.commit(parsed.data, { blocks: true, shifts: true, settings: true });
    return {
      ok: true,
      counts: { blocks: parsed.data.blocks.length, shifts: parsed.data.shifts.length, assignments: parsed.data.assignments.length },
    };
  }

  /** Deletes every block, shift and placement; keeps settings. */
  async eraseAll(): Promise<void> {
    await this.commit({ blocks: [], shifts: [], assignments: [] }, { blocks: true, shifts: true, settings: false });
  }
}

/** Migrates and validates a stored document or a backup's `data`. Throws on invalid data. */
export function parseDocument(raw: unknown, baseSettings?: Settings): SlateData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new ValidationError('data', 'expected an object');
  const migrated = migrate(raw as Record<string, unknown>);
  const { blocks, shifts, assignments } = validateCollections(migrated);
  return {
    schemaVersion: SCHEMA_VERSION,
    blocks,
    shifts: shifts.sort(shiftOrder),
    assignments,
    settings: sanitizeSettings(migrated.settings, baseSettings),
  };
}

export function blocksForWeek(blocks: Block[], weekOffset: number): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (!b.is_recurring) {
      if (b.week_offset === weekOffset) out.push(b);
    } else if (
      b.week_offset <= weekOffset &&
      !(b.skipped_weeks ?? []).includes(weekOffset) &&
      isWeekOffsetInSeries(b, weekOffset)
    ) {
      out.push({ ...b, week_offset: weekOffset });
    }
  }
  return out.sort(byTime);
}

export function placedShifts(data: Pick<SlateData, 'shifts' | 'assignments'>, startKey: string, endKey: string): PlacedShift[] {
  const byId = new Map(data.shifts.map((s) => [s.id, s]));
  const out: PlacedShift[] = [];
  for (const a of data.assignments) {
    if (a.shift_date < startKey || a.shift_date > endKey) continue;
    const shift = byId.get(a.shift_id);
    if (shift) out.push({ ...a, shift });
  }
  return out.sort((a, b) => a.shift_date.localeCompare(b.shift_date) || shiftOrder(a.shift, b.shift));
}
