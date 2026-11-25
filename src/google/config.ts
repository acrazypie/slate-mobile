// Google sign-in settings. The web client ID is public (it is in every OAuth
// redirect), but it is still per project, so it comes from the build:
// VITE_GOOGLE_WEB_CLIENT_ID in .env.local (see README). Without it, Google
// Calendar sync is shown as unavailable and nothing is sent to Google.

import { platform } from '../native/platform';

export const GOOGLE_WEB_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? '').trim();

/** iOS OAuth client (VITE_GOOGLE_IOS_CLIENT_ID). Needed on iPhone, plus a URL scheme in Info.plist. */
export const GOOGLE_IOS_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID ?? '').trim();

/** Google sign-in is not in the iPhone build yet (see ios-build.yml): it is off there. */
export const isGoogleConfigured = () => GOOGLE_WEB_CLIENT_ID.length > 0 && platform !== 'ios';

/** Read and write events on the user's calendars; list the calendars. Nothing else. */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];
