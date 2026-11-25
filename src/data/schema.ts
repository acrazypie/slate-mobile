// The shape of everything Slate keeps on the device, and its version.
//
// Bump SCHEMA_VERSION whenever a persisted shape changes, and add a step to
// MIGRATIONS in migrations.ts that turns version N-1 into N. Stored data and
// imported backups both go through the same migrations.

import type { Block, Rotation, Shift, ShiftAssignment, ViewMode } from '../lib/types';
import type { Locale } from '../i18n/config';

export const SCHEMA_VERSION = 2;

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

export interface Settings {
  theme: ThemeSetting;
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

// "Gesso" (chalk citron), the accent chosen in docs/design-notes.md / the mockups.
export const DEFAULT_ACCENT = '#D4EE5E';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  mode: 'local',
  pay: { hourlyRate: null, currency: '', overtimeAfterHours: null, overtimeMultiplier: 1.5 },
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
