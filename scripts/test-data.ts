/**
 * Checks the local data layer (src/data) and the device-calendar push plan
 * (src/calendar/push.ts wantedItems) without a device: storage is a Map.
 *
 *   npx tsx scripts/test-data.ts
 */
import { SlateRepository, DATA_KEY, blocksForWeek } from '../src/data/repository';
import { memoryStore } from '../src/data/storage';
import { SCHEMA_VERSION } from '../src/data/schema';
import { MIGRATIONS } from '../src/data/migrations';
import { dateFromKey, keyFromDate, weekOffsetForDate, dateForWeekOffset } from '../src/lib/recurrence';
import { isOvernightShift, shiftDurationMinutes, type BlockFormData } from '../src/lib/types';
import { wantedItems } from '../src/calendar/plan';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

const week = (key: string) => weekOffsetForDate(dateFromKey(key));
const form = (over: Partial<BlockFormData> = {}): BlockFormData => ({
  title: 'Lezione',
  category: 'lezione',
  color: '#FFD9A0',
  day_of_week: 2,
  start_hour: 9,
  start_minute: 0,
  duration_minutes: 90,
  notes: '',
  ...over,
});
/** Dates on which a series shows up, as the views would see them, over `weeks` weeks. */
function shownDates(repo: SlateRepository, seriesId: string, fromWeek: number, weeks = 12) {
  const out: string[] = [];
  for (let w = fromWeek; w < fromWeek + weeks; w++) {
    for (const b of repo.blocksForWeek(w)) if (b.id === seriesId) out.push(keyFromDate(dateForWeekOffset(b.week_offset, b.day_of_week)));
  }
  return out;
}

const store = memoryStore();
const repo = new SlateRepository(store, () => new Date('2026-11-15T12:00:00'));
await repo.load();
check('empty start', repo.getSnapshot().blocks.length, 0);

console.log('\n=== Plain events ===');
const w149 = week('2026-11-11');
const plain = await repo.createBlock(form({ title: 'Analisi 1', notes: '  ripasso  ' }), w149);
check('stored in week 149', [plain.week_offset, plain.day_of_week], [149, 2]);
check('notes trimmed', plain.notes, 'ripasso');
check('shown in its week only', [repo.blocksForWeek(149).length, repo.blocksForWeek(150).length], [1, 0]);
await repo.updateBlock(plain.id, form({ title: 'Analisi 2', day_of_week: 4 }), 150);
check('edit moves it to another day/week', [repo.getBlock(plain.id)?.title, repo.getBlock(plain.id)?.week_offset, repo.getBlock(plain.id)?.day_of_week], ['Analisi 2', 150, 4]);
await repo.flush();
check('persisted to storage', JSON.parse(store.dump()[DATA_KEY]).blocks.length, 1);
await repo.deleteBlock(plain.id);
check('deleted', repo.getSnapshot().blocks.length, 0);

console.log('\n=== Weekly series: delete this / this and following / all ===');
const s1 = await repo.createBlock(form({ is_recurring: true, recurrence_type: 'weekly', recurrence_end_date: '2026-12-30' }), w149);
check('series marker', s1.recurrence_group_id, s1.id);
check('all occurrences', shownDates(repo, s1.id, 149), ['2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09', '2026-12-16', '2026-12-23', '2026-12-30']);
check('an occurrence carries the series id and the shown week', repo.blocksForWeek(151).map((b) => [b.id === s1.id, b.week_offset]), [[true, 151]]);

await repo.deleteOccurrence(s1.id, week('2026-11-25'), 'current');
check('only 25 Nov removed', shownDates(repo, s1.id, 149), ['2026-11-11', '2026-11-18', '2026-12-02', '2026-12-09', '2026-12-16', '2026-12-23', '2026-12-30']);

await repo.deleteOccurrence(s1.id, week('2026-11-11'), 'current');
check('deleting the first occurrence moves the start', [repo.getBlock(s1.id)?.week_offset, shownDates(repo, s1.id, 149)[0]], [150, '2026-11-18']);

await repo.deleteOccurrence(s1.id, week('2026-12-16'), 'this-and-following');
check('this and following ends the day before', repo.getBlock(s1.id)?.recurrence_end_date, '2026-12-15');
check('series after truncation', shownDates(repo, s1.id, 149), ['2026-11-18', '2026-12-02', '2026-12-09']);

await repo.deleteOccurrence(s1.id, week('2026-11-18'), 'this-and-following');
check('this and following on the first occurrence deletes the series', repo.getBlock(s1.id), undefined);

const s2 = await repo.createBlock(form({ is_recurring: true, recurrence_type: 'weekly' }), w149);
check('open-ended series is capped at 104 occurrences', shownDates(repo, s2.id, 149, 120).length, 104);
await repo.deleteOccurrence(s2.id, week('2027-01-06'), 'all');
check('all deletes the series', repo.getBlock(s2.id), undefined);

const s3 = await repo.createBlock(form({ is_recurring: true, recurrence_type: 'weekly', recurrence_end_date: '2026-11-18' }), w149);
await repo.deleteOccurrence(s3.id, w149, 'current');
await repo.deleteOccurrence(s3.id, w149 + 1, 'current');
check('removing the last remaining occurrence deletes the series', repo.getBlock(s3.id), undefined);

console.log('\n=== Monthly series ===');
const m = await repo.createBlock(form({ is_recurring: true, recurrence_type: 'monthly', recurrence_end_date: '2027-03-31' }), w149);
check('2nd Wednesday of each month', shownDates(repo, m.id, 149, 30), ['2026-11-11', '2026-12-09', '2027-01-13', '2027-02-10', '2027-03-10']);
await repo.deleteOccurrence(m.id, week('2027-01-13'), 'current');
check('one month skipped', shownDates(repo, m.id, 149, 30), ['2026-11-11', '2026-12-09', '2027-02-10', '2027-03-10']);
await repo.updateBlock(m.id, form({ title: 'Ricevimento', is_recurring: true, recurrence_type: 'monthly', recurrence_end_date: '2027-03-31' }));
check('editing a series keeps its start and skipped weeks', [repo.getBlock(m.id)?.week_offset, repo.getBlock(m.id)?.skipped_weeks?.length, shownDates(repo, m.id, 149, 30).length], [149, 1, 4]);
await repo.updateBlock(m.id, form({ title: 'Una volta' }));
check('turning a series into a plain event', [repo.getBlock(m.id)?.is_recurring, repo.getBlock(m.id)?.recurrence_type, repo.getBlock(m.id)?.skipped_weeks], [false, undefined, undefined]);
await repo.deleteBlock(m.id);

console.log('\n=== Shifts ===');
const night = await repo.createShift({ break_minutes: 0, title: 'Notte', start_hour: 22, start_minute: 0, end_hour: 6, end_minute: 0, color: '#7AA7D9' });
const morning = await repo.createShift({ break_minutes: 0, title: 'Mattina', start_hour: 9, start_minute: 0, end_hour: 13, end_minute: 0, color: '#6BB6A3' });
check('sorted by start time', repo.shifts.map((s) => s.title), ['Mattina', 'Notte']);
check('overnight', [isOvernightShift(night), shiftDurationMinutes(night)], [true, 480]);
await repo.assignShift(night.id, '2026-11-20');
await repo.assignShift(night.id, '2026-11-20');
await repo.assignShift(morning.id, '2026-11-20');
await repo.assignShift(morning.id, '2026-11-27');
check('placing the same shift twice on a day is a no-op', repo.shiftsInRange('2026-11-20', '2026-11-20').map((p) => p.shift.title), ['Mattina', 'Notte']);
await repo.unassignShift(repo.shiftsInRange('2026-11-27', '2026-11-27')[0].id);
check('removed from one day', repo.shiftsInRange('2026-11-01', '2026-11-30').length, 2);
await repo.deleteShift(night.id);
check('deleting a shift removes its placements', repo.getSnapshot().assignments.map((a) => a.shift_id === morning.id), [true]);

console.log('\n=== Backup ===');
await repo.createBlock(form({ title: 'Serie', is_recurring: true, recurrence_type: 'weekly' }), w149);
await repo.updateSettings({ theme: 'light', accent: '#7aa7d9', calendar: { ...repo.getSnapshot().settings.calendar, push: true, targetCalendarId: 'device-42' } });
const backup = repo.exportBackup();
check('backup header', [backup.app, backup.format, backup.data.schemaVersion], ['slate', 1, SCHEMA_VERSION]);
check('device calendar settings are not exported', 'calendar' in backup.data.settings, false);
const text = JSON.stringify(backup);

const other = new SlateRepository(memoryStore());
await other.load();
await other.updateSettings({ calendar: { ...other.getSnapshot().settings.calendar, targetCalendarId: 'other-device' } });
const res = await other.importBackup(text);
check('import counts', res, { ok: true, counts: { blocks: 1, shifts: 1, assignments: 1 } });
check('import keeps this device’s calendar settings', other.getSnapshot().settings.calendar.targetCalendarId, 'other-device');
check('import brings theme and accent', [other.getSnapshot().settings.theme, other.getSnapshot().settings.accent], ['light', '#7AA7D9']);
check('round trip is identical', JSON.stringify(other.getSnapshot().blocks), JSON.stringify(repo.getSnapshot().blocks));

const bad = (mutate: (b: any) => void) => {
  const copy = JSON.parse(text);
  mutate(copy);
  return SlateRepository.parseBackup(JSON.stringify(copy), repo.getSnapshot().settings);
};
check('not JSON', SlateRepository.parseBackup('{oops', repo.getSnapshot().settings), { ok: false, error: { kind: 'notJson' } });
check('not a Slate file', bad((b) => (b.app = 'sudoku')), { ok: false, error: { kind: 'notSlate' } });
check('from a newer app', bad((b) => (b.data.schemaVersion = SCHEMA_VERSION + 1)), { ok: false, error: { kind: 'tooNew', version: SCHEMA_VERSION + 1 } });
check('bad hour', bad((b) => (b.data.blocks[0].start_hour = 25)).ok, false);
check('bad category', bad((b) => (b.data.blocks[0].category = 'party')).ok, false);
check('dangling assignment', bad((b) => (b.data.assignments[0].shift_id = 'nope')).ok, false);
check('duplicate ids', bad((b) => b.data.blocks.push(b.data.blocks[0])).ok, false);
check('a rejected import changes nothing', other.getSnapshot().blocks.length, 1);
const noVersion = bad((b) => delete b.data.schemaVersion);
check('a file without schemaVersion is migrated from 0', noVersion.ok, true);

console.log('\n=== Stored data: migration hook and unreadable data ===');
check('a migration exists for every version', Array.from({ length: SCHEMA_VERSION }, (_, i) => typeof MIGRATIONS[i + 1]), Array(SCHEMA_VERSION).fill('function'));
const broken = memoryStore({ [DATA_KEY]: '{"blocks": "not a list"}' });
const r2 = new SlateRepository(broken);
await r2.load();
check('unreadable data: start empty, keep a copy, report it', [r2.getSnapshot().blocks.length, Object.keys(broken.dump()).some((k) => k.startsWith(`${DATA_KEY}:unreadable:`)), !!r2.loadProblem], [0, true, true]);

console.log('\n=== Device calendar push plan ===');
const data = other.getSnapshot();
const plan = wantedItems(data, 'cal-1', true);
check('one item per block and per placed shift', plan.map((p) => p.key[0]).sort(), ['b', 's']);
const weekly = plan.find((p) => p.key.startsWith('b:'))!.build() as any;
check('weekly series -> one recurring event capped at 104', [weekly.recurring.weekly, weekly.skip.length], [{ count: 104 }, 0]);
const shiftPlan = plan.find((p) => p.key.startsWith('s:'))!.build() as any[];
check('shift event lasts its duration', (shiftPlan[0].end - shiftPlan[0].start) / 60000, 240);
check('no shifts when pushShifts is off', wantedItems(data, 'cal-1', false).length, 1);
const skippedWeekly = { ...data, blocks: [{ ...data.blocks[0], recurrence_end_date: '2026-12-09', skipped_weeks: [week('2026-11-25')] }] };
const skippedEvents = wantedItems(skippedWeekly, 'cal-1', false)[0].build() as any[];
check('weekly series with a deleted occurrence -> single events without it', Array.isArray(skippedEvents) && skippedEvents.map((e) => keyFromDate(new Date(e.start))), ['2026-11-11', '2026-11-18', '2026-12-02', '2026-12-09']);
const monthlyData = { ...data, blocks: [{ ...data.blocks[0], recurrence_type: 'monthly' as const, recurrence_end_date: '2027-02-28', skipped_weeks: [week('2026-12-09')] }] };
const monthlyEvents = wantedItems(monthlyData, 'cal-1', false)[0].build() as any[];
check('monthly series -> one event per occurrence, skipped ones left out', monthlyEvents.map((e) => keyFromDate(new Date(e.start))), ['2026-11-11', '2027-01-13', '2027-02-10']);
const h1 = wantedItems(data, 'cal-1', false)[0].hash;
check('hash changes with the title', h1 === wantedItems({ ...data, blocks: [{ ...data.blocks[0], title: 'x' }] }, 'cal-1', false)[0].hash, false);
check('hash ignores the colour (not pushed)', h1 === wantedItems({ ...data, blocks: [{ ...data.blocks[0], color: '#000000' }] }, 'cal-1', false)[0].hash, true);
check('week helper', blocksForWeek(data.blocks, w149).length, 1);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
