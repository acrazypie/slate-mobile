/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  /** Google OAuth web client ID for Google Calendar sign-in (see README). */
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
  /** Ko-fi page for the support prompt (see DonatePrompt.tsx). */
  readonly VITE_KOFI_URL?: string;
  /** iOS OAuth client ID for Google sign-in on iPhone. */
  readonly VITE_GOOGLE_IOS_CLIENT_ID?: string;
}
