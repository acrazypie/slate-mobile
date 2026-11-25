# Google setup: everything you need to do

This is the checklist for the Google part, for both the app (Android now, iOS later) and the
website. Nothing here can be done from the code: it needs your Google Cloud and Supabase accounts,
your signing key, and your privacy policy. Items marked **[you]** are yours to do. Items marked
**[code]** are already in the repository.

What is already built:

- **[code]** Slate app: Google sign-in through `@capgo/capacitor-social-login`, the calendar copy
  and the Google overlay, a master switch in Settings › Account. The token stays on the phone.
- **[code]** Website: sign-in through Supabase's Google provider, two-way sync. Tokens are stored
  on the server (in Supabase), which conflicts with the rule that no backend holds Google tokens.
  See part 2, step 9.

## 0. Decide first

- [ ] **Which Google Cloud project?** One project for the app and the site is simplest.
- [ ] **Who may sign in while the app is unverified?** Google lets only *test users* sign in until
      the OAuth consent screen is verified. Add your own account and anyone testing.
- [ ] **Public release or private testing?** Public release of the calendar scopes needs Google's
      verification (step 1.6). Private testing with test users needs none of it.

## Part 1: the Android app

### 1.1 Google Cloud project and API

1. Open https://console.cloud.google.com and create a project (e.g. `slate`).
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.

### 1.2 OAuth consent screen

1. **APIs & Services → OAuth consent screen** → user type **External** → Create.
2. App name `Slate`, user support email, developer contact email.
3. **Scopes → Add or remove scopes**, add exactly these two:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   (Both are **sensitive** scopes. Nothing else is requested.)
4. **Test users** → add the Google accounts that will test the app.
5. **App domain / privacy policy URL / terms URL**: the policy must mention that Slate reads and
   writes calendar data on the device and sends it to Google when the user turns sync on. The
   current `/privacy` page of the website does not say this yet (see part 2, step 10).
6. **Publishing** (only for public release): submit for verification. Google asks for a demo
   video of the consent flow, the privacy policy, and a justification for each scope.

### 1.3 OAuth client IDs

Create these under **APIs & Services → Credentials → Create credentials → OAuth client ID**.

| Client | Application type | Fields | Used for |
|---|---|---|---|
| Web | **Web application** | Name `Slate web client`. No redirect URI needed for the app | `VITE_GOOGLE_WEB_CLIENT_ID` (the app passes it as `webClientId`). Also the ID the Supabase Google provider needs (part 2) |
| Android | **Android** | Package name `com.egenesio.slate`, SHA-1 of the signing key (step 1.4) | Lets Google Play services accept the APK. It has **no secret** and is not put in the app |

Copy the Web client ID (it ends in `.apps.googleusercontent.com`).

### 1.4 SHA-1 fingerprints

- **Release key** (the one in `android/keystore.properties`):
  `a35d5442246a2fbceb3d49630ddc24eff776cfde`
  Check it yourself with `keytool -list -v -keystore <your .jks> -alias <alias>`, or
  `apksigner verify --print-certs slate-app-1.1.0.apk`.
- **Debug key** (for builds run from Android Studio):
  `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
  Register that SHA-1 as a second Android client if you test debug builds.

Add one Android client per signing key. Any mismatch gives a "Developer console is not set up
correctly" error at sign-in.

### 1.5 Put the client ID into the build

1. In `slate-app/.env.local` (git-ignored) add:
   ```
   VITE_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
   ```
2. Rebuild the web bundle and the APK:
   ```bash
   cd /home/elisa/dev/slate-app
   npm run sync
   cd android && ./gradlew assembleRelease
   ```
   The APK is at `android/app/build/outputs/apk/release/app-release.apk`.

Without step 1.5 the build works, but Settings › Account says Google is not set up.

### 1.6 Test on the phone

1. Install the APK. Open Settings › Account, switch **Google features** on.
2. **Connect Google**, choose a test account, grant both permissions.
3. Turn on **Copy blocks to Google**. A calendar named **Slate** should appear in that account.
4. Turn on **Show Google events**. Events of the account's calendars appear hatched.
5. Turn the master switch off: no Google calls should follow (check that the Slate calendar stops
   updating).

### 1.7 Phone calendar permission

The app asks for calendar access the first time it is needed (after its own explainer). Users can
refuse it, and the app keeps working without it. Users can change it later in Android Settings.
If you publish on Google Play, the **Data safety** form must declare calendar data.

### 1.8 iOS (not started)

- **[you]** Create an **iOS** OAuth client with the bundle ID.
- **[you]** Note its client ID; the plugin needs it as `iOSClientId`.
- **[code, later]** Add the reversed client ID as a URL scheme in `ios/App/App/Info.plist`.
- **[you]** Apple Developer account for signing. See `docs/IOS-TODO.md`.

## Part 2: the website

The website uses Supabase Auth for sign-in and Supabase's Google provider. Calendar access is
requested with the same two scopes. Tokens are stored by the website's server.

### 2.1 Supabase Google provider

1. Supabase dashboard → your project → **Authentication → Providers → Google** → enable.
2. Paste the **Web client ID** and its **client secret** (from the Web application client above).
3. Copy the **callback URL** Supabase shows (`https://<project-ref>.supabase.co/auth/v1/callback`).

### 2.2 Google redirect URIs

In the Google Cloud **Web application** client, add under **Authorized redirect URIs**:

- `https://<project-ref>.supabase.co/auth/v1/callback`

Under **Authorized JavaScript origins**, add the site origin(s), e.g. `https://slate.example.com`
and `http://localhost:3000` for local development.

### 2.3 Supabase URL configuration

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://slate.example.com`
- **Redirect URLs**: add `https://slate.example.com/auth/google-calendar/callback` and
  `http://localhost:3000/auth/google-calendar/callback` (and the same for each origin you use).

### 2.4 Website environment variables

On the host that runs the site (e.g. Vercel project settings), set:

```
GOOGLE_OAUTH_CLIENT_ID=<web client id>
GOOGLE_OAUTH_CLIENT_SECRET=<web client secret>
```

Keep `.env.local` out of git (it already is). Never put the secret in a `NEXT_PUBLIC_` variable.

### 2.5 Database

If the Supabase project predates two-way sync, run the migration in `slate/docs/database.md`
(the `google_calendar_tokens` table and the `blocks.google_*` columns). Check the tables exist
before you test.

### 2.6 Test the website

1. Settings → Google Calendar → **Connect Google Calendar**. Grant both scopes.
2. Create an event; it should appear in the Google calendar of that account.
3. Disconnect; the stored token row should be removed.

### 2.7 Decision needed: website tokens on the server

The website keeps the Google refresh token on the server (in `google_calendar_tokens`). The rule
for Slate is that no backend holds Google tokens and no server syncs on the user's behalf. To
follow the rule on the website, the website would switch to the same device-side model as the app
(browser sign-in with short-lived tokens, with the user consenting again when they expire). Tell
me if you want that change; it is a rewrite of the website's Google part.

### 2.8 Privacy policy and terms

Both pages must describe: which Google scopes are requested, what is read and written, that
tokens are not sent to Slate's servers (if you keep the device-side rule), and how to revoke
access (Google account → Security → Third-party access, and the Disconnect button).

## Part 3: things that are not set up by the code

| Item | Who | Status |
|---|---|---|
| Google Cloud project, Calendar API, consent screen | You | Not done |
| Web client ID and secret | You | Not done |
| Android OAuth client (SHA-1 registered) | You | Not done |
| Supabase Google provider and redirect URLs | You | Not done |
| Website env variables on the host | You | Not done |
| Privacy policy text for calendar data (app and site) | You | Not done |
| Google verification for public release | You | Not started |
| iOS OAuth client and URL scheme | You, then code | Not started |
| Website device-side tokens (step 2.7) | Decision, then code | Open |

## Checklist

- [ ] 0: project, test users, public or private
- [ ] 1.1 Calendar API enabled
- [ ] 1.2 consent screen with the two scopes
- [ ] 1.3 Web client and Android client created
- [ ] 1.4 SHA-1 registered (release and debug)
- [ ] 1.5 `VITE_GOOGLE_WEB_CLIENT_ID` in `.env.local`, APK rebuilt
- [ ] 1.6 test sign-in and copy on the phone
- [ ] 2.1–2.4 Supabase provider, redirect URLs, host variables
- [ ] 2.5 database migration checked
- [ ] 2.6 website test
- [ ] 2.7 decision on website tokens
- [ ] 2.8 privacy policy and terms updated
