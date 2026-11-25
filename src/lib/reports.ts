// The reports the summary can show, calculated for one period. Pure (no UI),
// so scripts/test-summary.ts can check the numbers. Hours count shifts without
// their unpaid breaks, the same as the summary's totals.

import type { SlateData, PaySettings } from '../data/schema';
import { placedShifts } from '../data/repository';
import { keyFromDate } from './recurrence';
import { computePay } from './pay';
import { paidShiftMinutes, type Shift } from './types';
import type { Period } from './summaryRange';
import { weekStart } from './days';

export { REPORT_KINDS, type Report, type ReportKind } from './reportTypes';
import type { ReportKind } from './reportTypes';

export interface ShiftLine {
  shiftId: string;
  title: string;
  color: string;
  /** Paid minutes (hours report) or days (counts report). */
  value: number;
}

export type ReportResult =
  | { kind: 'hours'; lines: ShiftLine[]; totalMinutes: number }
  | { kind: 'counts'; lines: ShiftLine[]; totalDays: number }
  | { kind: 'overtime'; regularMinutes: number; overtimeMinutes: number; overtimeAmount: number | null }
  | { kind: 'pay'; amount: number | null; regularMinutes: number; overtimeMinutes: number };

/** Shifts placed in the period, one entry per day they are placed on. */
function periodShifts(data: SlateData, p: Period) {
  return placedShifts(data, keyFromDate(p.start), keyFromDate(p.end));
}

function byShift(shifts: { shift: Shift }[], value: (s: { shift: Shift }) => number): ShiftLine[] {
  const lines = new Map<string, ShiftLine>();
  for (const s of shifts) {
    const id = s.shift.id;
    const line = lines.get(id) ?? { shiftId: id, title: s.shift.title, color: s.shift.color, value: 0 };
    line.value += value(s);
    lines.set(id, line);
  }
  return [...lines.values()].sort((a, b) => b.value - a.value || a.title.localeCompare(b.title));
}

function weeklyMinutes(shifts: { shift: Shift; shift_date: string }[]) {
  const weeks: Record<string, number> = {};
  for (const s of shifts) {
    const key = keyFromDate(weekStart(new Date(s.shift_date.replace(/-/g, '/'))));
    weeks[key] = (weeks[key] ?? 0) + paidShiftMinutes(s.shift);
  }
  return Object.entries(weeks).map(([weekStart, minutes]) => ({ weekStart, minutes }));
}

export function reportFor(kind: ReportKind, data: SlateData, p: Period): ReportResult {
  const shifts = periodShifts(data, p);
  const pay: PaySettings = data.settings.pay;
  switch (kind) {
    case 'hours': {
      const lines = byShift(shifts, (s) => paidShiftMinutes(s.shift));
      return { kind, lines, totalMinutes: lines.reduce((m, l) => m + l.value, 0) };
    }
    case 'counts': {
      const lines = byShift(shifts, () => 1);
      return { kind, lines, totalDays: lines.reduce((d, l) => d + l.value, 0) };
    }
    case 'overtime': {
      const totals = computePay(weeklyMinutes(shifts), pay);
      const overtimeAmount =
        pay.hourlyRate === null ? null : Math.round((totals.overtimeMinutes / 60) * pay.hourlyRate * pay.overtimeMultiplier * 100) / 100;
      return { kind, regularMinutes: totals.regularMinutes, overtimeMinutes: totals.overtimeMinutes, overtimeAmount };
    }
    case 'pay': {
      const totals = computePay(weeklyMinutes(shifts), pay);
      return { kind, amount: totals.amount, regularMinutes: totals.regularMinutes, overtimeMinutes: totals.overtimeMinutes };
    }
  }
}
