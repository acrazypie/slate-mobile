# slate-app

Slate, the time-block weekly planner, as an iOS and Android app built with Capacitor 8.
Ported from the web app in `../slate` (Next.js + Supabase), which is never edited from here.

Data stays on the phone. There is no Slate server: no account, no backend holding tokens, nothing
syncs on your behalf. Calendar sync works in two ways, both directly between your phone and the
calendar service:

- **The phone's own calendars** (no sign-in needed), see [Device calendars](#device-calendars).
- **Google Calendar**, after you sign in with Google on the phone, see [Google Calendar](#google-calendar).
  The access token lives in this device's preferences and is sent only to Google.

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
| `npm test` | recurrence math (`scripts/test-recurrence.ts`, ported) + data layer, backup validation and calendar push plan (`scripts/test-data.ts`) + breaks, pay and cycles (`scripts/test-pay-rotations.ts`) + Google Calendar mapping, REST calls and push (`scripts/test-google.ts`) |
| `npm run sync` | build + `cap sync` (copies into the native projects) |
| `npm run android` | sync + open Android Studio |
| `npm run ios` | sync + open Xcode (macOS only) |
| `npm run assets` | regenerate all icons and splash screens from the mark in `scripts/make-assets.mjs` |
| `npx tsx scripts/make-sample-backup.ts > sample.json` | a week of sample blocks and shifts, to try the import |

## Layout

- `src/lib/` — `recurrence.ts` (copied unchanged from the web app), `types.ts` (types, palettes, overlap layout, paid minutes), `days.ts` (what each day shows, hour summaries), `pay.ts` (earnings and weekly overtime)
- `src/data/` — the repository: `schema.ts` (shapes, `SCHEMA_VERSION`), `migrations.ts` (migration hook), `validate.ts`, `storage.ts` (Preferences / in-memory), `repository.ts` (blocks, series deletes, shifts, settings, backup)
- `src/calendar/` — device calendars: `device.ts` (plugin wrapper), `plan.ts` + `push.ts` (copying blocks into a calendar, shared with Google), `backend.ts` (the calendar interface the push uses), `CalendarProvider.tsx` (permission, calendars, events on screen, resync on resume)
- `src/google/` — Google Calendar: `auth.ts` (sign-in and the device token), `api.ts` (REST calls), `mapping.ts` (Slate events ↔ Google events), `backend.ts` (push target and overlay), `GoogleProvider.tsx` (state, sync, events on screen)
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

## Plans and comparisons

- [docs/supershift-comparison.md](docs/supershift-comparison.md): which SuperShift features Slate has, is adding, or leaves out.
- [docs/redesign-plan.md](docs/redesign-plan.md): redesign direction that keeps DESIGN.md and adds cycles, breaks and the pay ledger.
- [docs/google-setup.md](docs/google-setup.md): every step you need to do for Google (Cloud, phone, website).
- [docs/phone-calendar-plan.md](docs/phone-calendar-plan.md): reading and writing phone calendar events from Slate.
- [docs/server-plan.md](docs/server-plan.md): a self-hosted, multi-user Slate server with Docker (plan; second sign-in, in progress).

## Storage

Capacitor **Preferences**, one JSON document under `slate:data` (blocks, shifts, shift
placements, cycles, settings, `schemaVersion`). The data is small (hundreds of blocks at most), every
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

## Google Calendar

Blocks and shifts can be copied to a calendar named **Slate** in your Google account, and events
from your Google calendars can be shown next to Slate's blocks (read-only, hatched, like device
events). Settings › Google Calendar has the switches.

How it works, and why nothing goes through a server:

- Sign-in uses `@capgo/capacitor-social-login` (Google Credential Manager on Android). The app asks
  for two scopes: `calendar.events` (read and write events) and `calendar.calendarlist.readonly`
  (list calendars). Nothing else.
- The access token is kept in this device's preferences under `slate:google-session`, with an
  expiry of 55 minutes. There is no refresh token: when it runs out, Settings asks you to sign in
  again. The token is never written to a backup file.
- Requests go from the phone straight to `https://www.googleapis.com/calendar/v3`.
- Copies are tracked in `slate:google-push` on the device, like the device-calendar copies.
  Turning copies off, or **Remove copies from Google**, deletes only events Slate created.
  Signing out keeps the copies in Google.
- Google events shown in the calendar are fetched for the range on screen and never stored.

### Set up Google sign-in (once, by the project owner)

Google's OAuth clients belong to a Google Cloud project you own. You need:

1. A Google Cloud project with the **Google Calendar API** enabled.
2. An OAuth consent screen with the two scopes above. `calendar.events` is a sensitive scope: while
   the app is in testing only listed test users can sign in; publishing needs Google's verification.
3. A **Web application** OAuth client. Its ID goes in `.env.local` as
   `VITE_GOOGLE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com`. Without it the Google group in
   Settings says sign-in is not set up, and nothing is sent to Google.
4. An **Android** OAuth client with the package name `com.egenesio.slate` and the SHA-1 of the
   signing key (`keytool -list -v -keystore <file>`). It has no secret and is not put in the app.
5. Build the APK after `npm run sync`. The native side is `android/app/src/main/java/com/egenesio/slate/MainActivity.java`:
   it implements the plugin's `ModifiedMainActivityForSocialLoginPlugin` and forwards the consent
   result, because the calendar scopes need a Google consent screen.
6. iOS: the plugin needs an iOS OAuth client ID and a URL scheme in `Info.plist`; not set up yet.

The privacy policy must say that calendar data is read and written on the device. Google checks it
during verification.

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
- Shifts can have an unpaid break (paid hours = duration − break). Cycles (rotations) are repeating patterns of shifts and days off, placed on the calendar from a chosen day.
- Settings › Pay: hourly rate, currency, weekly overtime limit and multiplier. Earnings appear in the summary once a rate is set.
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

`android/keystore.properties` (git-ignored) holds the signing key, and `android/app/build.gradle`
reads it for release builds. Bump `versionCode` and `versionName` there first.

```bash
npm run sync
cd android && ./gradlew assembleRelease     # android/app/build/outputs/apk/release/app-release.apk
```

Check the signature with `apksigner verify --print-certs` from the build-tools folder.

Every release must also include the APK as `slate.apk` (same file, second asset). The website's
download link points at `releases/latest/download/slate.apk`, so it always gets the newest release. The SHA-1
of the signing certificate is the one to register on the Android OAuth client for Google sign-in.
