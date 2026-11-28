/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  /** Ko-fi page for the support prompt (see DonatePrompt.tsx). */
  readonly VITE_KOFI_URL?: string;
}
