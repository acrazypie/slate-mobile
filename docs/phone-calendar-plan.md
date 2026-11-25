# Phone calendar: read and write Slate's items directly

Goal: with the user's consent, the app reads and writes events on the phone's calendars, and shifts
and events can be created, edited and deleted from inside Slate.

## What already exists

| Capability | Status |
|---|---|
| Ask for calendar permission after an explainer | Done (`CalendarProvider`, `device.ts`) |
| Read events of the chosen phone calendars into the views (hatched, read-only) | Done |
| Copy blocks and shifts into a phone calendar named Slate (one-way, Slate is the source) | Done (`push.ts`) |
| Edit or delete a phone-calendar event from Slate | **Not done** |
| Create a phone-calendar event from Slate in a chosen calendar | Partly: only the Slate calendar |
| Import phone-calendar events into Slate as blocks or shifts | **Not done** |

## What to add

### 1. Choose the target calendar per item (small)

In the block and shift sheets add a *Calendar* row: Slate (default), or any writable phone
calendar. The item stores `device_calendar_id` (per device, never in backups, like the push
state). The push writes it to that calendar. Only Slate's own items are touched; no change to the
existing copy logic.

### 2. Edit and delete events on the phone from Slate (medium)

Tapping a device event opens its sheet with *Edit* and *Delete*. The change is written with the
plugin's `modifyEvent` / `deleteEvents`. Rules:

- Only events in calendars the user marked as writable.
- Recurring device events: ask *only this* or *all*, like Slate's own series.
- After a write, the overlay reloads for the range on screen.

### 3. Import from the phone (medium)

*Settings › Phone calendars › Import events…* lists events in a date range, with checkboxes. Each
imported event becomes a Slate block (or a shift, if the user says so), with a link
`imported_from = <device event id>`. Decisions:

- **Copy or link?** Recommended: copy, then the item is Slate's. Linking two-way is a larger
  project with conflicts.
- Imports are idempotent: an event already imported is shown as such and not duplicated.

### 4. Conflicts (later)

If the same event changes in both places, Slate keeps the newest by time stamp and shows a note.
This is the same rule as the Google pull.

## Platform notes

- **Android:** `READ_CALENDAR` and `WRITE_CALENDAR`, already requested. Recurring events need the
  instance expansion the plugin already does for reads.
- **iOS:** EventKit *full access*. "Add events only" (write-only) cannot read, so the overlay and
  import would be disabled and the Settings screen would say so.

## Privacy

Calendar data is read and written on the phone only. Nothing is sent to a Slate server. If the
user also turns on Google, Google sync is separate and stays on the device.

## Decisions needed from you

1. Is import one-off copy (recommended) or a live link?
2. Should new Slate items go to the Slate calendar by default, or to the calendar the user picked
   last?
3. Is delete from Slate allowed for device events, or read and edit only?
