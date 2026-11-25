/**
 * Checks the summary's periods (src/lib/summaryRange.ts) and the reports
 * (src/lib/reports.ts): week, fortnight, month and year starts, custom ranges,
 * and the hours, counts, overtime and pay numbers.
 *
 *   npx tsx scripts/test-summary.ts
 */
import { emptyData, type SlateData } from '../src/data/schema';
import { DEFAULT_SUMMARY_RANGE, periodFor, type SummaryRange } from '../src/lib/summaryRange';
import { reportFor } from '../src/lib/reports';
import type { Shift, ShiftAssignment } from '../src/lib/types';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const range = (patch: Partial<SummaryRange>): SummaryRange => ({ ...DEFAULT_SUMMARY_RANGE, ...patch });
const span = (r: SummaryRange, now: Date) => {
  const p = periodFor(r, now);
  return [ymd(p.start), ymd(p.end), p.days];
};

// Thursday 26 November 2026.
const now = new Date(2026, 10, 26, 10, 0);

// Week starting on a chosen weekday (0 = Monday).
check('week, Monday start', span(range({ kind: 'week', weekday: 0 }), now), ['2026-11-23', '2026-11-29', 7]);
check('week, Wednesday start', span(range({ kind: 'week', weekday: 2 }), now), ['2026-11-25', '2026-12-01', 7]);
check('week, Sunday start', span(range({ kind: 'week', weekday: 6 }), now), ['2026-11-22', '2026-11-28', 7]);

// Two weeks: always 14 days; the two choices start a week apart.
const fortnightA = span(range({ kind: 'twoWeeks', weekday: 0, fortnightWeek: 1 }), now);
const fortnightB = span(range({ kind: 'twoWeeks', weekday: 0, fortnightWeek: 2 }), now);
check('fortnight is 14 days', fortnightA[2], 14);
check('the two choices differ by a week', [fortnightA[0] !== fortnightB[0], Math.abs(new Date(String(fortnightA[0])).getTime() - new Date(String(fortnightB[0])).getTime()) / 86400000 === 7], [true, true]);
const fortnightStart = new Date(String(fortnightA[0]) + 'T12:00:00');
check('fortnight starts on a Monday', fortnightStart.getDay(), 1);
check('today is inside the fortnight', periodFor(range({ kind: 'twoWeeks', weekday: 0, fortnightWeek: 1 }), now).start <= now, true);

// Month: default starts on the 1st; a later day starts the period earlier in the month.
check('month, default: 1 Nov to 30 Nov', span(DEFAULT_SUMMARY_RANGE, now), ['2026-11-01', '2026-11-30', 30]);
check('month starting the 15th, today after it', span(range({ kind: 'month', monthDay: 15 }), now), ['2026-11-15', '2026-12-14', 30]);
check('month starting the 15th, today before it', span(range({ kind: 'month', monthDay: 15 }), new Date(2026, 10, 10)), ['2026-10-15', '2026-11-14', 31]);
// Day 31 in February uses the last day of the month.
check('month starting the 31st, in February', span(range({ kind: 'month', monthDay: 31 }), new Date(2027, 1, 10)), ['2027-01-31', '2027-02-27', 28]);

// Year: from a month and day, to the day before the next year's start.
check('year starting 15 April, after it', span(range({ kind: 'year', yearMonth: 4, yearDay: 15 }), now), ['2026-04-15', '2027-04-14', 365]);
check('year starting 15 April, before it', span(range({ kind: 'year', yearMonth: 4, yearDay: 15 }), new Date(2026, 2, 1)), ['2025-04-15', '2026-04-14', 365]);

// Custom: the chosen days, inclusive; swapped dates are put in order.
check('custom range, inclusive', span(range({ kind: 'custom', customStart: '2026-11-03', customEnd: '2026-11-07' }), now), ['2026-11-03', '2026-11-07', 5]);
check('custom range, swapped', span(range({ kind: 'custom', customStart: '2026-11-07', customEnd: '2026-11-03' }), now), ['2026-11-03', '2026-11-07', 5]);

// Reports. Two 6-hour shifts with 30 minutes unpaid break in one week = 11 paid hours.
// Weekly limit 10 hours at 10 per hour, overtime 1.5x: 1 hour of overtime.
const data: SlateData = emptyData();
const shift: Shift = {
  id: 's1', title: 'Mattina', start_hour: 6, start_minute: 0, end_hour: 12, end_minute: 0,
  break_minutes: 30, color: '#6BB6A3', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
};
const vacation: Shift = {
  id: 's2', title: 'Ferie', start_hour: 9, start_minute: 0, end_hour: 13, end_minute: 0,
  break_minutes: 0, color: '#CF6679', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
};
const placed = (id: string, shiftId: string, date: string): ShiftAssignment => ({ id, shift_id: shiftId, shift_date: date, created_at: '2026-11-01T00:00:00Z' });
data.shifts = [shift, vacation];
data.assignments = [placed('a1', 's1', '2026-11-26'), placed('a2', 's1', '2026-11-27'), placed('a3', 's2', '2026-11-30')];
data.settings.pay = { hourlyRate: 10, currency: '€', overtimeAfterHours: 10, overtimeMultiplier: 1.5 };
const november = periodFor(DEFAULT_SUMMARY_RANGE, now);

const hours = reportFor('hours', data, november);
check('hours: total paid minutes', hours.kind === 'hours' ? hours.totalMinutes : null, 330 * 2 + 240);
check('hours: lines by shift', hours.kind === 'hours' ? hours.lines.map((l) => [l.title, l.value]) : null, [['Mattina', 660], ['Ferie', 240]]);
const counts = reportFor('counts', data, november);
check('counts: days per shift', counts.kind === 'counts' ? counts.lines.map((l) => [l.title, l.value]) : null, [['Mattina', 2], ['Ferie', 1]]);
check('counts: total days', counts.kind === 'counts' ? counts.totalDays : null, 3);
const overtime = reportFor('overtime', data, november);
check('overtime: minutes', overtime.kind === 'overtime' ? overtime.overtimeMinutes : null, 60);
check('overtime: amount', overtime.kind === 'overtime' ? overtime.overtimeAmount : null, 15);
const pay = reportFor('pay', data, november);
// Week of 23 Nov: 11h = 10h at 10 + 1h overtime at 15 = 115. Week of 30 Nov: 4h = 40.
check('pay: earnings', pay.kind === 'pay' ? pay.amount : null, 155);
check('pay: no rate, no amount', (() => {
  const d = structuredClone(data);
  d.settings.pay = { ...d.settings.pay, hourlyRate: null };
  const r = reportFor('pay', d, november);
  return r.kind === 'pay' ? r.amount : 'x';
})(), null);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
