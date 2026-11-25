/**
 * Checks which reminders are planned (src/notify/plan.ts): lead times, the
 * per-item override, deleted occurrences, the master switch and the window.
 *
 *   npx tsx scripts/test-notify.ts
 */
import { emptyData, type SlateData } from '../src/data/schema';
import { plannedReminders, leadFor, reminderId, MAX_PENDING } from '../src/notify/plan';
import { weekOffsetForDate } from '../src/lib/recurrence';
import type { Block, Shift, ShiftAssignment } from '../src/lib/types';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

// Wednesday 25 Nov 2026, 08:00 local time.
const now = new Date(2026, 10, 25, 8, 0).getTime();
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min).getTime();
const STAMP = '2026-11-01T00:00:00.000Z';

function block(over: Partial<Block>): Block {
  const date = new Date(2026, 10, 26); // Thursday, 26 Nov
  return {
    id: 'b1', title: 'Lezione', category: 'studio', color: '#BB86FC',
    day_of_week: (date.getDay() + 6) % 7, start_hour: 9, start_minute: 0, duration_minutes: 60,
    week_offset: weekOffsetForDate(date), notes: null, is_recurring: false,
    created_at: STAMP, updated_at: STAMP, ...over,
  };
}

const shift: Shift = {
  id: 's1', title: 'Mattina', start_hour: 6, start_minute: 0, end_hour: 12, end_minute: 0,
  break_minutes: 0, color: '#6BB6A3', created_at: STAMP, updated_at: STAMP,
};

function withData(patch: Partial<SlateData>, notif: Partial<SlateData['settings']['notifications']> = {}): SlateData {
  const data = emptyData();
  data.settings.notifications = { ...data.settings.notifications, ...notif };
  return { ...data, ...patch };
}

// Lead defaults to 10 minutes.
const one = withData({ blocks: [block({})] });
const p1 = plannedReminders(one, now);
check('one event: one reminder', p1.length, 1);
check('default lead: 10 minutes before 09:00', p1[0]?.at, at(2026, 10, 26, 8, 50));
check('reminder shows the start time', p1[0]?.time, '09:00');
check('reminder title is the event title', p1[0]?.title, 'Lezione');

// Own lead overrides the default; null turns it off; 0 is at the start.
check('own lead 30 min', plannedReminders(withData({ blocks: [block({ reminder_minutes: 30 })] }), now)[0]?.at, at(2026, 10, 26, 8, 30));
check('own lead off: no reminder', plannedReminders(withData({ blocks: [block({ reminder_minutes: null })] }), now), []);
check('own lead 0: at the start', plannedReminders(withData({ blocks: [block({ reminder_minutes: 0 })] }), now)[0]?.at, at(2026, 10, 26, 9, 0));

// Master switch and the two kinds.
check('master off: nothing', plannedReminders(withData({ blocks: [block({})] }, { enabled: false }), now), []);
check('events off: no event reminders', plannedReminders(withData({ blocks: [block({})] }, { events: false }), now), []);

// Shifts: placed on a day, with their own lead.
const assignment: ShiftAssignment = { id: 'a1', shift_id: 's1', shift_date: '2026-11-27', created_at: STAMP };
const withShift = withData({ shifts: [{ ...shift, reminder_minutes: 60 }], assignments: [assignment] });
const ps = plannedReminders(withShift, now);
check('shift: one reminder with its own lead', ps.map((p) => [p.kind, p.at]), [['shift', at(2026, 10, 27, 5, 0)]]);
check('shifts off: none', plannedReminders(withData({ shifts: [shift], assignments: [assignment] }, { shifts: false }), now), []);
check('shift reminder off is respected', plannedReminders(withData({ shifts: [{ ...shift, reminder_minutes: null }], assignments: [assignment] }), now), []);

// Past starts and days outside the window are not planned.
check('a start already passed: not planned', plannedReminders(withData({ blocks: [block({ reminder_minutes: 0 })] }), at(2026, 10, 26, 9, 30)), []);
const far = block({ id: 'far', week_offset: weekOffsetForDate(new Date(2027, 0, 20)), day_of_week: 2 });
check('beyond the 14-day window: not planned', plannedReminders(withData({ blocks: [far] }), now), []);

// A weekly series: one reminder per occurrence, deleted occurrences skipped.
const series = block({
  id: 'ser', is_recurring: true, recurrence_type: 'weekly', recurrence_group_id: 'ser',
  skipped_weeks: [weekOffsetForDate(new Date(2026, 11, 3))],
});
const sr = plannedReminders(withData({ blocks: [series] }), now).map((p) => p.at);
check('series: skipped occurrence has no reminder', sr.includes(at(2026, 11, 3, 8, 50)), false);
check('series: next occurrence has one', sr.includes(at(2026, 10, 26, 8, 50)), true);

// Ids are stable, distinct per occurrence, and never collide with 1 or 2.
check('same key, same id', reminderId('e:b1:2026-11-26') === reminderId('e:b1:2026-11-26'), true);
check('different key, different id', reminderId('e:b1:2026-11-26') !== reminderId('e:b1:2026-11-27'), true);
check('ids avoid the fixed notice ids', reminderId('anything') > 2, true);

// Lead resolution.
check('leadFor: undefined uses default', leadFor(undefined, 10), 10);
check('leadFor: null is off', leadFor(null, 10), null);
check('leadFor: own value wins', leadFor(5, 10), 5);

// The iOS cap: never more than MAX_PENDING.
const many: Block[] = Array.from({ length: 80 }, (_, i) => block({ id: `m${i}`, start_hour: 6 + (i % 12), start_minute: (i * 7) % 60 }));
check('capped at the pending limit', plannedReminders(withData({ blocks: many }), now).length <= MAX_PENDING, true);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
