/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  /** Google OAuth web client ID for Google Calendar sign-in (see README). */
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
}
