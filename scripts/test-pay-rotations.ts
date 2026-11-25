/**
 * Checks breaks, pay and rotations: the pay rules (src/lib/pay.ts), the
 * unpaid break in shifts, rotations placed on the calendar, and the schema 2
 * migration and validation that come with them. No device needed.
 *
 *   npx tsx scripts/test-pay-rotations.ts
 */
import { SlateRepository, DATA_KEY } from '../src/data/repository';
import { memoryStore } from '../src/data/storage';
import { SCHEMA_VERSION, DEFAULT_SETTINGS } from '../src/data/schema';
import { migrate } from '../src/data/migrations';
import { computePay, formatMoney } from '../src/lib/pay';
import { paidShiftMinutes, shiftDurationMinutes } from '../src/lib/types';
import { summarize, dayContents, daysFrom } from '../src/lib/days';
import { dateFromKey } from '../src/lib/recurrence';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

const pay = { ...DEFAULT_SETTINGS.pay, hourlyRate: 10, overtimeAfterHours: 40, overtimeMultiplier: 1.5 };

console.log('\n=== Pay rules ===');
check('schema is version 3', SCHEMA_VERSION, 3);
check('no overtime limit: every hour is regular', computePay([{ weekStart: '2026-11-23', minutes: 60 * 50 }], { ...pay, overtimeAfterHours: null }), { regularMinutes: 3000, overtimeMinutes: 0, amount: 500 });
check('40h week at 10/h, no overtime', computePay([{ weekStart: '2026-11-23', minutes: 40 * 60 }], pay), { regularMinutes: 2400, overtimeMinutes: 0, amount: 400 });
check('45h week: 5h overtime at 1.5x', computePay([{ weekStart: '2026-11-23', minutes: 45 * 60 }], pay), { regularMinutes: 2400, overtimeMinutes: 300, amount: 475 });
check('overtime is per week, not per month', computePay([{ weekStart: 'a', minutes: 42 * 60 }, { weekStart: 'b', minutes: 42 * 60 }], pay).overtimeMinutes, 240);
check('no rate: no amount', computePay([{ weekStart: 'a', minutes: 600 }], { ...pay, hourlyRate: null }).amount, null);
check('rounds to cents', computePay([{ weekStart: 'a', minutes: 20 }], { ...pay, hourlyRate: 10 }).amount, 3.33);
check('money format with currency', formatMoney(1234.5, '€', 'en-GB'), '1,234.50 €');
check('money format without currency', formatMoney(7, '', 'en-GB'), '7.00');

console.log('\n=== Breaks ===');
const shift = { start_hour: 9, start_minute: 0, end_hour: 17, end_minute: 0, break_minutes: 30 };
check('8h shift with a 30 min break pays 7h30', paidShiftMinutes(shift), 450);
check('a break is never longer than the shift', paidShiftMinutes({ ...shift, break_minutes: 999 }), 0);
check('duration itself is unchanged', shiftDurationMinutes(shift), 480);

const store = memoryStore();
const repo = new SlateRepository(store, () => new Date('2026-11-15T12:00:00'));
await repo.load();
const morning = await repo.createShift({ title: 'Mattina', start_hour: 9, start_minute: 0, end_hour: 17, end_minute: 0, break_minutes: 30, color: '#6BB6A3' });
const night = await repo.createShift({ title: 'Notte', start_hour: 22, start_minute: 0, end_hour: 6, end_minute: 0, break_minutes: 0, color: '#7AA7D9' });
await repo.updateSettings({ pay: { ...pay } });

console.log('\n=== Summary with breaks and pay ===');
await repo.assignShift(morning.id, '2026-11-23');
await repo.assignShift(morning.id, '2026-11-24');
await repo.assignShift(morning.id, '2026-11-25');
await repo.assignShift(morning.id, '2026-11-26');
await repo.assignShift(morning.id, '2026-11-27');
await repo.assignShift(night.id, '2026-11-28');
const s1 = summarize(dayContents(repo.getSnapshot(), daysFrom(dateFromKey('2026-11-23'), 7)));
check('week: paid shifts exclude breaks', s1.shifts, 5 * 450 + 480);
check('week: breaks reported', s1.breaks, 5 * 30);
check('week is one Monday key', Object.keys(s1.shiftsByWeek), ['2026-11-23']);
check('week pay: 45h30 at 10/h, 5h30 of it overtime', computePay(Object.entries(s1.shiftsByWeek).map(([w, m]) => ({ weekStart: w, minutes: m })), pay), { regularMinutes: 2400, overtimeMinutes: 330, amount: 482.5 });

console.log('\n=== Rotations ===');
const rot = await repo.createRotation({ title: '2-2-3', pattern: [morning.id, morning.id, null, night.id, night.id, null, null] });
check('rotation stored', repo.rotations.map((r) => r.title), ['2-2-3']);
const placedNew = await repo.applyRotation(rot.id, '2026-12-07', 14);
check('two cycles placed, shifts only on pattern days', placedNew, 8);
check('cycle starts on the chosen day', repo.shiftsInRange('2026-12-07', '2026-12-07').map((p) => p.shift.title), ['Mattina']);
check('night shifts land on pattern days 4-5 only', repo.shiftsInRange('2026-12-09', '2026-12-11').map((p) => [p.shift_date, p.shift.title]), [['2026-12-10', 'Notte'], ['2026-12-11', 'Notte']]);
check('applying again adds nothing (days already hold the shifts)', await repo.applyRotation(rot.id, '2026-12-07', 14), 0);
check('unknown rotation places nothing', await repo.applyRotation('nope', '2026-12-07', 14), 0);
await repo.updateRotation(rot.id, { title: '2-2-3 nights', pattern: [null, null, null, null, null, null, null] });
check('rotation edited', [repo.rotations[0].title, repo.rotations[0].pattern.length], ['2-2-3 nights', 7]);
await repo.deleteRotation(rot.id);
check('deleting a rotation keeps placed shifts', repo.shiftsInRange('2026-12-07', '2026-12-31').length, 8);

await repo.createRotation({ title: 'Solo', pattern: [night.id, null] });
await repo.deleteShift(night.id);
check('deleting a shift clears its slots in rotations', repo.rotations[0].pattern, [null, null]);

console.log('\n=== Migration and validation ===');
const v1 = { schemaVersion: 1, blocks: [], shifts: [{ id: 's1', title: 'A', start_hour: 8, start_minute: 0, end_hour: 12, end_minute: 0, color: '#6BB6A3', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], assignments: [], settings: {} };
const migrated = migrate(JSON.parse(JSON.stringify(v1))) as any;
check('v1 shifts get no break and rotations is empty', [migrated.schemaVersion, migrated.shifts[0].break_minutes, migrated.rotations], [3, 0, []]);

const fresh = new SlateRepository(memoryStore());
await fresh.load();
const bad = (mutate: (d: any) => void) => {
  const doc = JSON.parse(JSON.stringify(repo.exportBackup().data));
  mutate(doc);
  return SlateRepository.parseBackup(JSON.stringify({ app: 'slate', format: 1, data: doc }), DEFAULT_SETTINGS).ok;
};
check('valid backup with rotations and breaks imports', bad(() => {}), true);
check('a break as long as the shift is refused', bad((d) => (d.shifts[0].break_minutes = 600)), false);
check('a rotation slot pointing at a missing shift is refused', bad((d) => d.rotations.push({ id: 'r9', title: 'x', pattern: ['missing', null], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })), false);
check('a rotation of one day is refused', bad((d) => (d.rotations[0].pattern = [null])), false);
check('old backups without rotations still import', bad((d) => delete d.rotations), true);
check('pay settings survive an export and import', (() => {
  const doc = repo.exportBackup();
  const parsed = SlateRepository.parseBackup(JSON.stringify(doc), DEFAULT_SETTINGS);
  return parsed.ok ? parsed.data.settings.pay : null;
})(), pay);
check('data key unchanged', DATA_KEY, 'slate:data');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
