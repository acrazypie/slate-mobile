# SuperShift vs Slate: feature comparison

What SuperShift (Android, `app.supershift`, version 2026.25 / versionCode 26254) does, what Slate
does now, and what was done about each gap. This is a feature list written from our own
observations, not a copy of anyone's code, assets or copy. Nothing from the APK ships in Slate.

## How this was learned

- The base APK was pulled from a phone with `adb pull` (not committed; it is outside the repo).
- Read from the APK: `AndroidManifest.xml` (components, permissions), the string tables in
  `resources.arsc`, and the class names in `classes*.dex`. Compose, Room, DataStore, Firebase,
  AppLovin ads, Google Play Billing are the libraries it uses.
- REA (`github.com/morluto/rea`) was cloned, but running its CLI was blocked in this session
  (the `npx rea-agents` call was refused), so no decompiled sources were produced. A full
  decompile with JADX or REA is the next step if you want method-level detail.

## Feature map

Status: **Done** = in this change · **Planned** = designed in `docs/redesign-plan.md`, not built ·
**Not for Slate** = needs a server or account, which Slate's local-only rule excludes.

| SuperShift feature (evidence in the APK) | Slate before | Slate now | Notes |
|---|---|---|---|
| Shifts with start/end, overnight shifts | Yes | Yes | Unchanged |
| Shift placed on days from the calendar | Yes | Yes | Unchanged |
| Rotations / repeating shift cycles (`rotations/` screens, "Add rotation") | No | **Done** | 2–28 day cycle, shift or day off per day, placed from a chosen day for 1–26 weeks. Skips days that already have the shift. Deleting a shift clears its slots. |
| Unpaid breaks in a shift ("Break is work time" setting, break strings) | No | **Done** | `break_minutes` per shift. Paid hours = duration − break. Shown on shift rows and in the summary. |
| Hours and earnings reports (hours worked, earnings, overtime reports) | Hours only | **Done** | Hours now count paid time. Optional hourly rate, currency, weekly overtime limit and multiplier in Settings › Pay. Overtime is per Monday–Sunday week. |
| Extra pay conditions (extra pay requires conditions, e.g. night or weekend premiums) | No | Planned | Needs per-shift premium rules; see redesign plan. |
| Holidays reduce contracted hours; holiday list; weekday filters | No | Planned | Needs a holidays list per country. |
| Count / breakdown report by shift type | Partly (category totals) | Planned | Shift totals per shift type in the summary sheet. |
| Shift alarms and reminders (alarm per shift, "apply alarm in calendar", snooze/dismiss) | No | Planned | Needs a local-notifications plugin (`@capacitor/local-notifications`, not added yet). Native-only; not testable in the browser dev server. |
| Export to device calendars (Apple/Google Calendar) | Yes (device calendars push) | Yes | Unchanged |
| Share a calendar with other people, invitations, shared calendars | No | Not for Slate | Needs accounts and a server. Slate's answer is file export (below). |
| PDF export / print of the schedule ("Printable PDF schedules") | No | Planned | Print-friendly view, then Capacitor Share. |
| Calendar file export (.ics) | No | Planned | Cheap, no account: one ICS file with blocks and shifts. |
| Cloud sync across devices, cloud backup and restore | No | Not for Slate (no project server) | The project runs no central server. Any calendar sync (events and shifts) must go through Google sign-in, with each user authorizing their own Google Calendar on their device. No backend holds tokens or syncs on the user's behalf. Backup file export/import already covers moving to a new phone. |
| Widgets (day widget settings) | No | Not for Slate (for now) | Native widget code per platform; a later project. |
| Week numbers, month and week views | Yes | Yes | Unchanged |
| Search (search query, search a place) | No | Planned | Search blocks and shifts by title, jump to the day. |
| Paywall, subscriptions, lifetime purchase, ads (AppLovin, AdMob) | n/a | Not for Slate | Slate has no paid features: every feature SuperShift charges for is free in Slate from the start. No paywall, subscription, purchase flow, billing plugin or ads, and no payment is ever needed. |
| Community shift templates ("Discover work schedules from the community") | No | Not for Slate | Needs a server. |
| Siri / iOS shortcuts (Siri AI) | No | Not for Slate | Platform-specific and not on Android. |
| Onboarding | Yes | Yes | Unchanged |
| Languages | 6 | 6 | Each new string added to all six dictionaries. |
| Themes and accent colours | Yes | Yes | Unchanged (design tokens in `src/styles/tokens.css`) |
| Haptics | Yes | Yes | Unchanged |

## What changed in the data (schema 2)

- `Shift.break_minutes` (0–240, default 0). Stored shifts from schema 1 are migrated with 0.
- `rotations[]` with `{ id, title, pattern: (shift id | null)[], created_at, updated_at }`.
- `settings.pay` with `hourlyRate`, `currency`, `overtimeAfterHours`, `overtimeMultiplier`.
  Settings are forgiving on load, so older files without it get the defaults.
- Backups export `rotations`. Old backups (schema 1) still import.

Tests: `npm test` now also runs `scripts/test-pay-rotations.ts` (pay rules, breaks, rotations,
migration and validation).
