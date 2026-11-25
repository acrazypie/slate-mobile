/**
 * Checks Google Calendar sync without a network or a Google account:
 * the mapping (src/google/mapping.ts), the REST calls (src/google/api.ts,
 * with a fake fetch), and a full push through the shared sync against an
 * in-memory Google account (src/google/backend.ts).
 *
 *   npx tsx scripts/test-google.ts
 */
import { SlateRepository } from '../src/data/repository';
import { memoryStore } from '../src/data/storage';
import { syncCalendar, loadPushState, GOOGLE_PUSH_KEY } from '../src/calendar/push';
import { toGoogleBody, localDateTime, utcCompact, overlayEvent } from '../src/google/mapping';
import { createGoogleApi, GoogleAuthError, type GEvent, type GEventBody, type GoogleApi, type GCalendar } from '../src/google/api';
import { createGoogleBackend, listGoogleOverlay } from '../src/google/backend';
import { dateFromKey, weekOffsetForDate } from '../src/lib/recurrence';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

const at = (key: string, h: number, m = 0) => {
  const d = dateFromKey(key);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
};

console.log('\n=== Mapping to Google events ===');
check('local wall-clock time, no zone suffix', localDateTime(at('2026-11-18', 9, 5)), '2026-11-18T09:05:00');
check('UNTIL is UTC, compact', utcCompact(Date.UTC(2026, 11, 30, 22, 59, 0)), '20261230T225900Z');
const single = toGoogleBody({ title: 'Lezione', start: at('2026-11-18', 9), end: at('2026-11-18', 10, 30), notes: 'aula 3', calendarId: 'c' }, 'Europe/Rome');
check('single event body', single, {
  summary: 'Lezione',
  start: { dateTime: '2026-11-18T09:00:00', timeZone: 'Europe/Rome' },
  end: { dateTime: '2026-11-18T10:30:00', timeZone: 'Europe/Rome' },
  description: 'aula 3',
});
const weekly = toGoogleBody({ title: 'Turno', start: at('2026-11-18', 9), end: at('2026-11-18', 17), calendarId: 'c', weekly: { until: at('2026-12-30', 23, 59) } }, 'Europe/Rome');
check('weekly series with an end date -> RRULE UNTIL', weekly.recurrence, [`RRULE:FREQ=WEEKLY;UNTIL=${utcCompact(at('2026-12-30', 23, 59))}`]);
const counted = toGoogleBody({ title: 'Turno', start: at('2026-11-18', 9), end: at('2026-11-18', 17), calendarId: 'c', weekly: { count: 104 } }, 'Europe/Rome');
check('open-ended series -> RRULE COUNT', counted.recurrence, ['RRULE:FREQ=WEEKLY;COUNT=104']);

const cal = { id: 'work', name: 'Lavoro', color: '#3366ff' };
const timed: GEvent = { id: 'e1', summary: 'Riunione', start: { dateTime: '2026-11-18T14:00:00+01:00' }, end: { dateTime: '2026-11-18T15:30:00+01:00' } };
const mappedTimed = overlayEvent(timed, cal)!;
check('timed Google event in the overlay', [mappedTimed.startDate, mappedTimed.start_hour, mappedTimed.start_minute, mappedTimed.end_hour, mappedTimed.end_minute, mappedTimed.allDay, mappedTimed.calendarName], ['2026-11-18', 14, 0, 15, 30, false, 'Lavoro']);
const allDay: GEvent = { id: 'e2', summary: 'Ferie', start: { date: '2026-11-20' }, end: { date: '2026-11-23' } };
check('all-day end is exclusive: three days', [overlayEvent(allDay, cal)!.startDate, overlayEvent(allDay, cal)!.endDate, overlayEvent(allDay, cal)!.allDay], ['2026-11-20', '2026-11-22', true]);
check('Google events are tagged google and read-only', [mappedTimed.source, mappedTimed.writable], ['google', false]);
check('cancelled event is left out', overlayEvent({ ...timed, status: 'cancelled' }, cal), null);
check('event declined by the user is left out', overlayEvent({ ...timed, attendees: [{ self: true, responseStatus: 'declined' }] }, cal), null);
check('working location is left out', overlayEvent({ ...timed, eventType: 'workingLocation' }, cal), null);

console.log('\n=== REST calls ===');
const calls: { url: string; method: string; auth: string | null; body: unknown }[] = [];
const fakeFetch = async (url: string, init?: RequestInit) => {
  const headers = init?.headers as Record<string, string>;
  calls.push({ url, method: init?.method ?? 'GET', auth: headers.Authorization, body: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (url.includes('/events/gone')) return new Response(null, { status: 410 });
  if (url.includes('/calendarList')) return Response.json({ items: [{ id: 'primary', summary: 'Me', accessRole: 'owner' }], nextPageToken: undefined });
  if (url.includes('/events') && init?.method === 'POST') return Response.json({ id: 'new1' });
  if (url.includes('/expired')) return new Response('', { status: 401 });
  return new Response(null, { status: 204 });
};
const api = createGoogleApi(async () => 'tok-123', fakeFetch as unknown as typeof fetch);
const list = await api.calendarList();
check('calendar list: bearer token, the right path', [calls[0].url.replace(/\?.*/, ''), calls[0].auth], ['https://www.googleapis.com/calendar/v3/users/me/calendarList', 'Bearer tok-123']);
check('calendar list parsed', list.map((c) => c.id), ['primary']);
check('insert returns the new id', await api.insertEvent('primary', single as GEventBody), 'new1');
check('deleting an event already gone is not an error', await api.deleteEvent('primary', 'gone').then(() => 'ok'), 'ok');
let authErr = false;
try {
  await createGoogleApi(async () => 'x', (async () => new Response('', { status: 401 })) as unknown as typeof fetch).calendarList();
} catch (err) {
  authErr = err instanceof GoogleAuthError;
}
check('401 means sign in again', authErr, true);

console.log('\n=== Push against an in-memory Google account ===');
type Stored = { calendarId: string; body: GEventBody };
const account = { events: new Map<string, Stored>(), calendars: [{ id: 'primary', summary: 'Me', accessRole: 'owner' as const }] as GCalendar[], n: 0 };
const fakeApi: GoogleApi = {
  async calendarList() {
    return [...account.calendars];
  },
  async createCalendar(summary) {
    const c: GCalendar = { id: `cal-${summary}`, summary, accessRole: 'owner' };
    account.calendars.push(c);
    return c;
  },
  async listEvents(calendarId) {
    return [...account.events.entries()]
      .filter(([, v]) => v.calendarId === calendarId)
      .map(([id, v]) => ({ id, summary: v.body.summary, start: { dateTime: v.body.start.dateTime }, end: { dateTime: v.body.end.dateTime } }));
  },
  async insertEvent(calendarId, body) {
    const id = `ev${++account.n}`;
    account.events.set(id, { calendarId, body });
    return id;
  },
  async patchEvent(calendarId, eventId, body) {
    account.events.set(eventId, { calendarId, body });
  },
  async deleteEvent(_c, eventId) {
    account.events.delete(eventId);
  },
};

const repo = new SlateRepository(memoryStore(), () => new Date('2026-11-15T12:00:00'));
await repo.load();
const store = memoryStore();
const backend = createGoogleBackend(fakeApi, 'Europe/Rome');
const w = weekOffsetForDate(dateFromKey('2026-11-18'));
const form = { title: 'Lezione', category: 'lezione' as const, color: '#6BB6A3', day_of_week: 2, start_hour: 9, start_minute: 0, duration_minutes: 90, notes: '', is_recurring: false };
const b = await repo.createBlock(form, w);
const sh = await repo.createShift({ break_minutes: 0, title: 'Mattina', start_hour: 6, start_minute: 0, end_hour: 12, end_minute: 0, color: '#6BB6A3' });
await repo.assignShift(sh.id, '2026-11-20');

const first = await syncCalendar(repo.getSnapshot(), store, backend, GOOGLE_PUSH_KEY, null, true);
const st = await loadPushState(store, GOOGLE_PUSH_KEY);
check('first sync creates the Slate calendar and two events', [first.changed, first.calendarId, account.events.size, [...account.events.values()].map((v) => v.calendarId)], [2, 'cal-Slate', 2, ['cal-Slate', 'cal-Slate']]);
check('the state remembers the Google ids', Object.values(st.items).every((i) => i.events[0].startsWith('cal-Slate|')), true);
const second = await syncCalendar(repo.getSnapshot(), store, backend, GOOGLE_PUSH_KEY, null, true);
check('a second sync with no change does nothing', second.changed, 0);

await repo.updateBlock(b.id, { ...form, title: 'Lezione 2' }, w);
const third = await syncCalendar(repo.getSnapshot(), store, backend, GOOGLE_PUSH_KEY, null, true);
const edited = [...account.events.values()].map((v) => v.body.summary).sort();
check('an edited block patches its Google event in place', [third.changed, edited], [1, ['Lezione 2', 'Mattina']]);

await repo.deleteBlock(b.id);
const fourth = await syncCalendar(repo.getSnapshot(), store, backend, GOOGLE_PUSH_KEY, null, true);
check('a deleted block deletes its Google event', [fourth.changed, [...account.events.values()].map((v) => v.body.summary)], [1, ['Mattina']]);

const overlay = await listGoogleOverlay(fakeApi, new Date('2026-11-01T00:00:00'), new Date('2026-12-01T00:00:00'), [
  { id: 'cal-Slate', name: 'Slate', color: '#000', writable: true, account: null },
]);
check('overlay lists events of a calendar in the given range', overlay.map((e) => [e.title, e.startDate]), [['Mattina', '2026-11-20']]);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
