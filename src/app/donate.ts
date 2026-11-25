// The rule for the Ko-fi prompt, kept free of React and Capacitor so it can be tested.

export const OPENS_KEY = 'slate:opens';
export const LAST_SHOWN_KEY = 'slate:donate-last';
export const HIDDEN_KEY = 'slate:donate-hidden';
const FORTNIGHT = 14 * 24 * 60 * 60 * 1000;

/** Shown on every fifth start, and never more than once a fortnight. Pure, so it can be tested. */
export function shouldShowDonate(opens: number, lastShown: number, hidden: boolean, now: number, url: string): boolean {
  if (!url || hidden) return false;
  if (opens < 5 || opens % 5 !== 0) return false;
  return now - lastShown > FORTNIGHT;
}

