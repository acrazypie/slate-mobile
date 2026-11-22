# slate-app

Slate, the time-block weekly planner, as a local-only iOS and Android app built with Capacitor 8.
Ported from the web app in `../slate` (Next.js + Supabase), which is never edited from here:
no account, no server, no network calls. Data stays on the phone; the phone's own calendars
replace Google Calendar.

## Setup

```bash
npm ci
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server in a desktop browser (iOS look; `?platform=android` for the Android one). Native calls are no-ops, storage falls back to localStorage |
| `npm run build` | typecheck + Vite build into `www/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | recurrence math (`scripts/test-recurrence.ts`, ported) + data layer, backup validation and calendar push plan (`scripts/test-data.ts`) |
| `npm run sync` | build + `cap sync` (copies into the native projects) |
| `npm run android` | sync + open Android Studio |
| `npm run ios` | sync + open Xcode (macOS only) |
| `npm run assets` | regenerate all icons and splash screens from the mark in `scripts/make-assets.mjs` |
| `npx tsx scripts/make-sample-backup.ts > sample.json` | a week of sample blocks and shifts, to try the import |

## Layout

- `src/lib/` — `recurrence.ts` (copied unchanged from the web app), `types.ts` (types, palettes, overlap layout), `days.ts` (what each day shows, hour summaries)
- `src/data/` — the repository: `schema.ts` (shapes, `SCHEMA_VERSION`), `migrations.ts` (migration hook), `validate.ts`, `storage.ts` (Preferences / in-memory), `repository.ts` (blocks, series deletes, shifts, settings, backup)
- `src/calendar/` — device calendars: `device.ts` (plugin wrapper), `plan.ts` + `push.ts` (copying blocks into a calendar), `CalendarProvider.tsx` (permission, calendars, events on screen, resync on resume)
- `src/native/platform.ts` — platform detection, status bar, splash, haptics, Android back button, resume
- `src/backup/backup.ts` — export (Filesystem + Share) and file reading for import
- `src/i18n/` — 6 languages (it, en, es, nl, fr, ja); dictionaries ported from the web app, minus auth/legal/Google strings, plus the app's own
- `src/screens/`, `src/sheets/`, `src/ui/` — React UI
- `src/styles/` — `tokens.css` (DESIGN.md + accent "Gesso"), `app.css` (shared), `ios.css` / `android.css` (platform chrome, scoped to `html[data-look]`)
- `android/app/src/main/java/com/egenesio/slate/WindowBackgroundPlugin.java` — paints the window behind the system bars on WebView < 140
- `android/`, `ios/` — generated native projects (committed)
- `docs/calendar-sync.md` — plugin choice, how blocks map to device events, gaps per platform
- `docs/IOS-TODO.md` — what's needed to build and test on iOS
- `docs/mockups/`, `docs/design-notes.md` — design renders and spec the UI follows
- `docs/screenshots/` — Android emulator screenshots

## Storage

Capacitor **Preferences**, one JSON document under `slate:data` (blocks, shifts, shift
placements, settings, `schemaVersion`). The data is small (hundreds of blocks at most), every
view needs all series in memory anyway to expand recurrences, and a single document makes backup
a plain dump and writes atomic. SQLite would add a community plugin, a web shim and SQL
migrations for no gain. Preferences is SharedPreferences on Android and UserDefaults on iOS,
which (unlike WebView localStorage) iOS does not evict.

- Every change is written straight away; the UI reads one immutable snapshot (`useSyncExternalStore`).
- A recurring series is one row expanded on read, like the web app; deleted occurrences are a
  `skipped_weeks` list on the series (the web app's `block_exceptions` table).
  Delete offers *only this* / *this and following* / *all* with the web app's rules.
- Shifts are placed per day (one shift once per day); an overnight shift also shows, clipped,
  on the next morning.
- Bump `SCHEMA_VERSION` and add a step to `MIGRATIONS` to change the shape. Stored data and
  imported backups go through the same migrations and validation. A document that can't be read
  is kept under `slate:data:unreadable:<time>` and the app starts empty (and says so).

## Backup

Settings › Backup › *Export* writes `slate-backup-<date>.json` (`{ app: "slate", format: 1, data }`)
to the cache and opens the share sheet. *Import* opens the file picker, validates every field
(types, ranges, unique ids, shifts that placements point to, schema version), shows what will be
replaced, then replaces everything. Device-specific settings (calendar ids) and the language are
never taken from a file.

## Device calendars

Plugin `@ebarooni/capacitor-calendar` (MIT, Capacitor 8). First launch explains what Slate does
before the system prompt. Settings › Phone calendars: access state, calendars to show (hatched,
read-only events next to blocks), *Copy blocks to a calendar* (a "Slate" calendar the app creates,
or any writable one), copy shifts too, sync now, remove everything copied. Pushes after every
change and on resume. Details and per-platform gaps: [docs/calendar-sync.md](docs/calendar-sync.md).

## App behaviour

- Tabs: Calendar (day / week / month, swipe to move, summary sheet), Shifts, Settings.
- Android back: closes the top sheet or dialog → leaves the calendar sub-page → goes back to the
  Calendar tab → sends the app to background.
- Haptics: selection tick on view/day changes and toggles, light tap on opening the add sheet,
  success on save/import, warning on delete (Settings › Haptics turns them off).
- Status bar and the Android window background follow the theme; the splash hides after the first paint.
- No text selection, callouts or overscroll glow outside inputs.

## Android without Android Studio

```bash
npm run sync
cd android && ./gradlew assembleDebug    # needs ANDROID_HOME or android/local.properties (sdk.dir=…)
~/Android/Sdk/emulator/emulator -avd sudoku_api36 -gpu host   # -gpu host: default GPU mode crashes on Wayland
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Releasing Android

Not set up yet (no signing config, no CI workflow). Mirror sudoku-app: `keystore.properties`
(git-ignored) + `signingConfigs` in `android/app/build.gradle`, and the `build.yml` /
`release.yml` workflows.
