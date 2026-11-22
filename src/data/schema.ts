// The shape of everything Slate keeps on the device, and its version.
//
// Bump SCHEMA_VERSION whenever a persisted shape changes, and add a step to
// MIGRATIONS in migrations.ts that turns version N-1 into N. Stored data and
// imported backups both go through the same migrations.

import type { Block, Shift, ShiftAssignment, ViewMode } from '../lib/types';
import type { Locale } from '../i18n/config';

export const SCHEMA_VERSION = 1;

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

export interface Settings {
  theme: ThemeSetting;
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
  settings: Settings;
}

// "Gesso" (chalk citron), the accent chosen in docs/design-notes.md / the mockups.
export const DEFAULT_ACCENT = '#D4EE5E';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
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
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
