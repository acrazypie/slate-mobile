/**
 * Writes a sample backup (a week of blocks, shifts and a monthly series
 * around the current date) for trying the app and the import flow:
 *
 *   npx tsx scripts/make-sample-backup.ts > sample-backup.json
 */
import { addDays } from 'date-fns';
import { SlateRepository } from '../src/data/repository';
import { memoryStore } from '../src/data/storage';
import { keyFromDate, weekOffsetForDate } from '../src/lib/recurrence';
import { CATEGORY_COLORS, type BlockCategory } from '../src/lib/types';
import { weekStart } from '../src/lib/days';

const repo = new SlateRepository(memoryStore());
await repo.load();
const monday = weekStart(new Date());
const week = weekOffsetForDate(monday);
const block = (title: string, category: BlockCategory, day: number, h: number, m: number, dur: number, extra: object = {}) =>
  repo.createBlock({ title, category, color: CATEGORY_COLORS[category], day_of_week: day, start_hour: h, start_minute: m, duration_minutes: dur, notes: '', ...extra }, week);

await block('Analisi 1', 'lezione', 0, 9, 0, 120, { is_recurring: true, recurrence_type: 'weekly' });
await block('Analisi 1', 'lezione', 4, 9, 0, 120, { is_recurring: true, recurrence_type: 'weekly' });
await block('Fisica', 'lezione', 2, 10, 0, 120, { is_recurring: true, recurrence_type: 'weekly', notes: 'Aula 3' });
await block('Ripasso', 'studio', 0, 14, 0, 120);
await block('Fisica', 'studio', 1, 15, 0, 120);
await block('Progetto', 'studio', 2, 14, 30, 150);
await block('Tutorato', 'lavoro', 3, 9, 0, 90);
await block('Ripasso', 'studio', 6, 10, 0, 120);
await block('Palestra', 'altro', 1, 18, 30, 60, { is_recurring: true, recurrence_type: 'weekly' });
await block('Ricevimento', 'altro', 2, 17, 30, 60, { is_recurring: true, recurrence_type: 'monthly' });
const morning = await repo.createShift({ break_minutes: 30, title: 'Mattina', start_hour: 9, start_minute: 0, end_hour: 13, end_minute: 0, color: '#6BB6A3' });
const afternoon = await repo.createShift({ break_minutes: 30, title: 'Pomeriggio', start_hour: 14, start_minute: 0, end_hour: 19, end_minute: 0, color: '#E49C69' });
const night = await repo.createShift({ break_minutes: 30, title: 'Notte', start_hour: 22, start_minute: 0, end_hour: 6, end_minute: 0, color: '#BB86FC' });
await repo.assignShift(morning.id, keyFromDate(addDays(monday, 1)));
await repo.assignShift(morning.id, keyFromDate(addDays(monday, 5)));
await repo.assignShift(afternoon.id, keyFromDate(addDays(monday, 3)));
await repo.assignShift(night.id, keyFromDate(addDays(monday, 4)));
process.stdout.write(JSON.stringify(repo.exportBackup(), null, 2));
