// Calls to the Google Calendar REST API, made from the phone with the user's
// own access token. Nothing goes through a Slate server. The fetch function is
// injectable so the tests can check requests without a network.

export const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/** The token is missing, expired or revoked: the user has to sign in again. */
export class GoogleAuthError extends Error {
  constructor(message = 'Google sign-in has expired') {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export interface GCalendar {
  id: string;
  summary: string;
  backgroundColor?: string;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
}

export interface GEvent {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  description?: string;
  location?: string;
  eventType?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

export interface GEventBody {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  recurrence?: string[];
}

export interface GoogleApi {
  calendarList(): Promise<GCalendar[]>;
  createCalendar(summary: string, timeZone: string): Promise<GCalendar>;
  listEvents(calendarId: string, timeMin: Date, timeMax: Date): Promise<GEvent[]>;
  insertEvent(calendarId: string, body: GEventBody): Promise<string>;
  patchEvent(calendarId: string, eventId: string, body: GEventBody): Promise<void>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export function createGoogleApi(getToken: () => Promise<string>, fetchFn: Fetch = (u, i) => fetch(u, i)): GoogleApi {
  async function request<T>(path: string, init: RequestInit = {}, allow: number[] = []): Promise<T | null> {
    const token = await getToken();
    const res = await fetchFn(`${CALENDAR_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (res.status === 401) throw new GoogleAuthError();
    if (allow.includes(res.status)) return null;
    if (!res.ok) {
      const err = new Error(`Google Calendar answered ${res.status}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : ((await res.json()) as T);
  }

  // Walks every page of a list endpoint.
  async function all<T>(path: string, key: 'items', params: Record<string, string>): Promise<T[]> {
    const out: T[] = [];
    let pageToken: string | undefined;
    do {
      const qs = new URLSearchParams({ ...params, ...(pageToken ? { pageToken } : {}) });
      const page = await request<{ items?: T[]; nextPageToken?: string }>(`${path}?${qs}`);
      out.push(...(page?.[key] ?? []));
      pageToken = page?.nextPageToken;
    } while (pageToken);
    return out;
  }

  const enc = encodeURIComponent;
  return {
    calendarList: () => all<GCalendar>('/users/me/calendarList', 'items', { maxResults: '250' }),
    async createCalendar(summary, timeZone) {
      const cal = await request<GCalendar>('/calendars', { method: 'POST', body: JSON.stringify({ summary, timeZone }) });
      if (!cal) throw new Error('Google did not create the calendar');
      return cal;
    },
    listEvents: (calendarId, timeMin, timeMax) =>
      all<GEvent>(`/calendars/${enc(calendarId)}/events`, 'items', {
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: '2500',
      }),
    async insertEvent(calendarId, body) {
      const ev = await request<{ id: string }>(`/calendars/${enc(calendarId)}/events`, { method: 'POST', body: JSON.stringify(body) });
      if (!ev) throw new Error('Google did not create the event');
      return ev.id;
    },
    async patchEvent(calendarId, eventId, body) {
      await request(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'PATCH', body: JSON.stringify(body) }, [404, 410]);
    },
    async deleteEvent(calendarId, eventId) {
      await request(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'DELETE' }, [404, 410]);
    },
  };
}
