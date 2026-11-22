# Device calendar sync

Slate has no server, so the web app's Google Calendar sync is replaced by the
calendars that already live on the phone (EventKit on iOS, CalendarContract on
Android). Anything the user has synced to the phone (iCloud, Google, Exchange,
local) shows up through them.

## Plugin: `@ebarooni/capacitor-calendar` 8.11

Checked on npm in November 2026:

| Package | Capacitor 8 | Last release | Licence | Read events | Write / modify / delete | List + create calendars | Notes |
|---|---|---|---|---|---|---|---|
| **`@ebarooni/capacitor-calendar`** | yes (`>=8.0.0`, 8.x line) | 8.11.0, 2026-11-15, monthly releases | MIT | `listEventsInRange` (expanded occurrences) | `createEvent`, `modifyEvent`, `deleteEvent(s)` with span + instance date | `listCalendars`, `createCalendar`, `deleteCalendar` | iOS 17 full / write-only access, Android READ/WRITE split; ~290k downloads/month |
| `@capgo/capacitor-calendar` | yes | 8.0.17, 2026-11-12 | MPL-2.0 | yes | yes | yes | A fork of the above (its THIRD_PARTY_NOTICES says so); copyleft licence, smaller user base |
| `capacitor-calendar` (Fir3st) | yes (2.x) | 2.0.2, 2026-11-09 | MIT | `findEvent` only | create / update / delete | list only | Revived after 4 years; no range listing, no calendar creation |

Chosen: **`@ebarooni/capacitor-calendar`**. It is the original of the most
complete API, MIT, released for Capacitor 8, actively maintained, and the
only one with range listing of expanded occurrences plus calendar creation on
both platforms.

## What works

| | Android | iOS |
|---|---|---|
| Pre-permission explainer, then the system prompt | yes (verified on API 36 emulator) | yes (not run) |
| Permission states | full / denied (Android may ask once more after a first refusal; the button stays) | full / write-only ("Add events only", iOS 17) / denied |
| Pick calendars to show, grouped by account | yes | yes |
| Show their events (hatched, read-only) in day / week / month, all-day strip, details sheet, "Open in Calendar" | yes | yes |
| Copy blocks (and optionally placed shifts) into a calendar | yes, into a local "Slate" calendar the app creates, or any writable calendar | same; full access required |
| Edits / deletes in Slate update the device event | yes (verified: plain events modified in place, series rebuilt) | yes (not run) |
| Resync on app resume and after every change (debounced 0.8 s) | yes | yes |
| Remove everything Slate pushed | yes | yes |

Usage strings: `NSCalendarsFullAccessUsageDescription`,
`NSCalendarsWriteOnlyAccessUsageDescription` and the pre-17
`NSCalendarsUsageDescription` are in `ios/App/App/Info.plist`;
`READ_CALENDAR` / `WRITE_CALENDAR` are in `android/app/src/main/AndroidManifest.xml`.

## How items map to device events (`src/calendar/plan.ts`, `push.ts`)

| Slate item | Device event(s) |
|---|---|
| Plain block | one event, modified in place when edited |
| Weekly series, no deleted occurrences | one recurring event, `RRULE FREQ=WEEKLY` with `UNTIL` (end date) or `COUNT=104` (Slate's own cap) |
| Weekly series with deleted occurrences | one event per remaining occurrence |
| Monthly series ("2nd Wednesday") | one event per occurrence (max 104) |
| Placed shift | one event; an overnight shift ends the next morning |

A map in Preferences (`slate:calendar-push`, never exported) keeps, per Slate
item, a hash of what was pushed and the device event ids. A sync deletes
events of items that no longer exist, leaves unchanged hashes alone, modifies
single events in place and recreates the rest. The map is saved after every
item, so an interrupted sync never forgets an event it created. If the target
calendar disappears or the user picks another one, the map starts over.

Events Slate pushed are hidden from the overlay (by id, and the Slate calendar
is never offered as a calendar to show), so blocks never appear twice.

## Gaps (documented, not bugs)

- **One-way.** Changes made in the calendar app do not come back to Slate;
  the next sync overwrites them. (The web app's two-way Google pull needed
  Google's `updated` stamps; device calendars have no equivalent that is
  reliable on both platforms.) Device events are read-only inside Slate.
- **Monthly series are expanded**: the plugin's recurrence rule takes weekdays
  without a position (`BYDAY=WE`, not `BYDAY=2WE`), and EventKit's
  `EKRecurrenceDayOfWeek(weekNumber:)` is not exposed either.
- **Deleted occurrences of a weekly series expand it**: cancelling one instance
  (an Android "exception" row via `deleteEvent(span: THIS_EVENT)`) failed on a
  local calendar on the emulator ("Failed to delete"), and the plugin cannot
  write `EXDATE`.
- **iOS write-only access** can add events but cannot read them back, list
  calendars or delete them, so pushing requires full access; Settings explains
  this. Showing events also requires full access.
- Event colours are not pushed (Android supports per-event colours only for
  some account types; EventKit not at all).
- Recurring device events show only their occurrences in the visible range; a
  very long range (month view) is one query per range change.
