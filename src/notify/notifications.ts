// Puts reminders, the new-version notice and the Ko-fi notice on the phone.
// Everything is local: the phone schedules, nothing is sent from a server.
// Outside the native apps every function does nothing.

import { LocalNotifications } from '@capacitor/local-notifications';
import { kv, repo } from '../app/store';
import { KOFI_URL } from '../app/kofi';
import { deviceLocale, type Locale } from '../i18n/config';
import { dictionaries, type Dictionary } from '../i18n/dictionaries';
import { fill } from '../i18n/format';
import { appVersion, isNative, onResume, platform } from '../native/platform';
import { availableUpdate, fetchLatestRelease } from '../update/updates';
import { plannedReminders } from './plan';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

const CHANNEL = 'reminders';
const VERSION_NOTICE_ID = 1;
const DONATE_NOTICE_ID = 2;
const IDS_KEY = 'slate:reminder-ids';
const VERSION_CHECK_KEY = 'slate:version-notice-check';
const VERSION_SEEN_KEY = 'slate:version-notified';
const SIX_HOURS = 6 * 60 * 60 * 1000;

function dict(): Dictionary {
  const locale: Locale = repo.getSnapshot().settings.locale ?? deviceLocale();
  return dictionaries[locale];
}

/** "At start", "10 min before", "2 h before" in the app language. */
export function leadLabel(minutes: number, d: Dictionary = dict()): string {
  if (minutes === 0) return d.notify.leadAt;
  if (minutes % 60 === 0) return fill(d.notify.leadHours, { n: minutes / 60 });
  return fill(d.notify.leadMinutes, { n: minutes });
}

export async function permission(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  return (await LocalNotifications.checkPermissions()).display as PermissionState;
}

/** Asks the system once; after a refusal only the phone's own settings can change it. */
export async function requestPermission(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  return (await LocalNotifications.requestPermissions()).display as PermissionState;
}

async function ready(): Promise<boolean> {
  if (!isNative) return false;
  if (platform === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Slate',
      description: 'Reminders before events and shifts, and Slate notices',
      importance: 4,
      visibility: 1,
    }).catch(() => {});
  }
  return (await permission()) === 'granted';
}

/**
 * Replaces every reminder on the phone with the planned set. Cancels the
 * previous set first, so a deleted or moved event leaves no stale reminder.
 * Also runs when the master switch is off, to clear what was scheduled.
 */
export async function syncReminders(): Promise<void> {
  if (!isNative) return;
  const previous = JSON.parse((await kv.get(IDS_KEY)) ?? '[]') as number[];
  if (previous.length) await LocalNotifications.cancel({ notifications: previous.map((id) => ({ id })) }).catch(() => {});
  const planned = plannedReminders(repo.getSnapshot(), Date.now());
  if (planned.length === 0 || !(await ready())) {
    await kv.set(IDS_KEY, '[]');
    return;
  }
  const d = dict();
  await LocalNotifications.schedule({
    notifications: planned.map((p) => ({
      id: p.id,
      channelId: CHANNEL,
      title: p.title,
      body: fill(p.kind === 'event' ? d.notify.startsAt : d.notify.shiftStartsAt, { time: p.time }),
      schedule: { at: new Date(p.at) },
      extra: { kind: p.kind },
    })),
  });
  await kv.set(IDS_KEY, JSON.stringify(planned.map((p) => p.id)));
}

async function notifyNow(id: number, title: string, body: string, kind: string): Promise<boolean> {
  if (!(await ready())) return false;
  await LocalNotifications.schedule({
    notifications: [{ id, channelId: CHANNEL, title, body, schedule: { at: new Date(Date.now() + 1000) }, extra: { kind } }],
  });
  return true;
}

/** The Ko-fi notice, when the support rule says it is time. Tapping it opens the page. */
export async function donateNotice(): Promise<boolean> {
  if (!KOFI_URL) return false;
  const n = repo.getSnapshot().settings.notifications;
  if (!n.enabled || !n.donate) return false;
  const d = dict();
  return notifyNow(DONATE_NOTICE_ID, d.donate.title, d.notify.donateBody, 'donate').catch(() => false);
}

/** Once every six hours on Android: tells the user when a newer release is out, once per version. */
export async function checkNewVersion(): Promise<void> {
  if (!isNative || platform !== 'android') return;
  const n = repo.getSnapshot().settings.notifications;
  if (!n.enabled || !n.newVersion) return;
  const last = Number((await kv.get(VERSION_CHECK_KEY)) ?? 0);
  if (Date.now() - last < SIX_HOURS) return;
  await kv.set(VERSION_CHECK_KEY, String(Date.now()));
  try {
    const update = availableUpdate(await fetchLatestRelease(), await appVersion());
    if (!update || (await kv.get(VERSION_SEEN_KEY)) === update.version) return;
    const d = dict();
    const shown = await notifyNow(VERSION_NOTICE_ID, fill(d.notify.versionTitle, { version: update.version }), d.notify.versionBody, 'version');
    if (shown) await kv.set(VERSION_SEEN_KEY, update.version);
  } catch {
    /* offline or GitHub is down: the next check tries again */
  }
}

/**
 * Starts the notifications for this session: a reschedule after every change
 * and on resume, the new-version check, and taps. `onOpenSettings` runs when
 * the version notice is tapped. Returns a stop function.
 */
export function startNotifications(onOpenSettings: () => void): () => void {
  if (!isNative) return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void syncReminders().catch(() => {});
      void checkNewVersion();
    }, 800);
  };

  void LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const kind = (action.notification.extra as { kind?: string } | undefined)?.kind;
    if (kind === 'donate' && KOFI_URL) window.open(KOFI_URL, '_blank', 'noopener');
    if (kind === 'version') onOpenSettings();
  });

  const off = repo.onChange(run);
  const offResume = onResume(run);
  void (async () => {
    // Ask once, after setup, if reminders are on and the system has not asked yet.
    const s = repo.getSnapshot().settings;
    if (s.onboarded && s.notifications.enabled && (await permission()) === 'prompt') await requestPermission();
    run();
  })();
  return () => {
    clearTimeout(timer);
    off();
    offResume();
  };
}
