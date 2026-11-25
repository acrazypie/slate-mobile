// The Ko-fi support reminder. It is a notification now (notify/notifications.ts),
// not a dialog, and it can be turned off in Settings › Notifications. The rule is
// unchanged: on every fifth start, at most once a fortnight.

import { useEffect } from 'react';
import { kv, repo } from './store';
import { donateNotice } from '../notify/notifications';
import { HIDDEN_KEY, LAST_SHOWN_KEY, OPENS_KEY, shouldShowDonate } from './donate';
import { KOFI_URL } from './kofi';

export function DonatePrompt() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const opens = Number((await kv.get(OPENS_KEY)) ?? 0) + 1;
      await kv.set(OPENS_KEY, String(opens));
      if (!repo.getSnapshot().settings.onboarded) return;
      const lastShown = Number((await kv.get(LAST_SHOWN_KEY)) ?? 0);
      const hidden = (await kv.get(HIDDEN_KEY)) === '1';
      if (cancelled || !shouldShowDonate(opens, lastShown, hidden, Date.now(), KOFI_URL)) return;
      if (await donateNotice()) await kv.set(LAST_SHOWN_KEY, String(Date.now()));
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
