// The shape of everything Slate keeps on the device, and its version.
//
// Bump SCHEMA_VERSION whenever a persisted shape changes, and add a step to
// MIGRATIONS in migrations.ts that turns version N-1 into N. Stored data and
// imported backups both go through the same migrations.

import type { Block, Rotation, Shift, ShiftAssignment, ViewMode } from '../lib/types';
import type { Locale } from '../i18n/config';

export const SCHEMA_VERSION = 3;

export type ThemeSetting = 'system' | 'light' | 'dark';

/** Month view: small squares + the selected day's list, or the web app's cells with titles. */
export type MonthStyle = 'compact' | 'detailed';

/** Device-calendar options. Calendar ids are device-specific, so they are never exported. */
export interface CalendarSettings {
  /** Show events from the device's calendars next to Slate's blocks. */
  showDeviceEvents: boolean;
  /** Calendars whose events are shown; null = every readable calendar. */
  visibleCalendarIds: string[] | null;
  /** Copy Slate's blocks into a device calendar. */
  push: boolean;
  /** Also copy placed shifts. */
  pushShifts: boolean;
  /** Where pushed events go; null = Slate's own calendar (created on first push). */
  targetCalendarId: string | null;
}

/**
 * Pay rules for the earnings line in the summary. Earnings come from shifts
 * only, minus their unpaid breaks. Overtime is hours above `overtimeAfterHours`
 * in one Monday-to-Sunday week, paid at `overtimeMultiplier` times the rate.
 */
export interface PaySettings {
  /** null = no earnings shown. */
  hourlyRate: number | null;
  /** Symbol or code shown next to the amount, e.g. "€". */
  currency: string;
  /** null = no overtime. */
  overtimeAfterHours: number | null;
  overtimeMultiplier: number;
}

/** Google Calendar options. Like the device options, never exported: the account is per device. */
export interface GoogleSettings {
  /** Master switch: when off, Slate makes no Google calls at all (the sign-in is kept). */
  enabled: boolean;
  /** Copy blocks into a "Slate" calendar in the signed-in Google account. */
  push: boolean;
  /** Also copy placed shifts. */
  pushShifts: boolean;
  /** Show events from the user's Google calendars next to Slate's blocks. */
  showEvents: boolean;
}

/**
 * How the app stores data. `local`: everything on the phone, optionally with
 * the phone's calendars and Google. `hosted`: connected to a Slate server the
 * user runs (not built yet; see docs/server-plan.md).
 */
export type AppMode = 'local' | 'hosted';

/**
 * Notifications. Reminders are scheduled on the phone (no server). Each event
 * and shift can override the default lead time or turn its own reminder off.
 */
export interface NotificationSettings {
  /** Master switch: off removes every scheduled reminder and sends nothing. */
  enabled: boolean;
  /** Minutes before the start, unless an item says otherwise. 0 = at the start. */
  leadMinutes: number;
  /** Reminders for events (Slate blocks). */
  events: boolean;
  /** Reminders for placed shifts. */
  shifts: boolean;
  /** A notice when a newer version is on GitHub (Android). */
  newVersion: boolean;
  /** An occasional Ko-fi reminder, the same schedule as the support prompt used to have. */
  donate: boolean;
}

/** The home-screen icon colour. Teal is the default; it matches the default accent. */
export type AppIconKey = 'teal' | 'lime' | 'violet' | 'apricot';
export const APP_ICON_KEYS: AppIconKey[] = ['teal', 'lime', 'violet', 'apricot'];

export interface Settings {
  theme: ThemeSetting;
  appIcon: AppIconKey;
  notifications: NotificationSettings;
  mode: AppMode;
  pay: PaySettings;
  google: GoogleSettings;
  /** Accent colour (dark-theme hex); the light theme derives a deeper shade. */
  accent: string;
  /** null = follow the device language. */
  locale: Locale | null;
  defaultView: ViewMode;
  monthStyle: MonthStyle;
  haptics: boolean;
  /** The first-launch flow has been completed or skipped. */
  onboarded: boolean;
  calendar: CalendarSettings;
}

export interface SlateData {
  schemaVersion: number;
  blocks: Block[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  rotations: Rotation[];
  settings: Settings;
}

// The default accent is teal (#6BB6A3), the same colour as the default app icon.
// The earlier default, "Gesso" (#D4EE5E), is still one of the choices in Appearance.
export const DEFAULT_ACCENT = '#6BB6A3';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  appIcon: 'teal',
  mode: 'local',
  pay: { hourlyRate: null, currency: '', overtimeAfterHours: null, overtimeMultiplier: 1.5 },
  notifications: { enabled: true, leadMinutes: 10, events: true, shifts: true, newVersion: true, donate: true },
  google: { enabled: false, push: false, pushShifts: true, showEvents: false },
  accent: DEFAULT_ACCENT,
  locale: null,
  defaultView: 'week',
  monthStyle: 'compact',
  haptics: true,
  onboarded: false,
  calendar: {
    showDeviceEvents: false,
    visibleCalendarIds: null,
    push: false,
    pushShifts: true,
    targetCalendarId: null,
  },
};

export function emptyData(): SlateData {
  return {
    schemaVersion: SCHEMA_VERSION,
    blocks: [],
    shifts: [],
    assignments: [],
    rotations: [],
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
