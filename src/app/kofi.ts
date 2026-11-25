// The Ko-fi page from the build (VITE_KOFI_URL). Empty turns donate reminders off.
// Kept apart from the React prompt so the notification code can use it too.
export const KOFI_URL: string = (import.meta.env.VITE_KOFI_URL ?? '').trim();
