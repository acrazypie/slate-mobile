// An occasional, dismissible invitation to support the project on Ko-fi. It is
// shown on some app starts, at most once a fortnight, and never after the user
// ticks "Don't show this again". It is off when no Ko-fi link is built in.

import { useEffect, useState } from 'react';
import { kv, repo } from './store';
import { useI18n } from '../i18n/I18n';
import { Dialog } from '../ui/Sheet';
import { HIDDEN_KEY, LAST_SHOWN_KEY, OPENS_KEY, shouldShowDonate } from './donate';

/** The Ko-fi page, from the build (VITE_KOFI_URL). Empty turns the prompt off. */
export const KOFI_URL: string = (import.meta.env.VITE_KOFI_URL ?? '').trim();

export function DonatePrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const opens = Number((await kv.get(OPENS_KEY)) ?? 0) + 1;
      await kv.set(OPENS_KEY, String(opens));
      if (!repo.getSnapshot().settings.onboarded) return;
      const lastShown = Number((await kv.get(LAST_SHOWN_KEY)) ?? 0);
      const hidden = (await kv.get(HIDDEN_KEY)) === '1';
      if (!cancelled && shouldShowDonate(opens, lastShown, hidden, Date.now(), KOFI_URL)) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = async (support: boolean) => {
    setOpen(false);
    await kv.set(LAST_SHOWN_KEY, String(Date.now()));
    if (dontShow) await kv.set(HIDDEN_KEY, '1');
    if (support) window.open(KOFI_URL, '_blank', 'noopener');
  };

  return (
    <Dialog
      open={open}
      onClose={() => void close(false)}
      title={t.donate.title}
      message={
        <>
          {t.donate.message}
          <label className="donate__check">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} /> {t.donate.dontShow}
          </label>
        </>
      }
      actions={[
        { label: t.donate.support, kind: 'primary', onClick: () => void close(true) },
        { label: t.donate.later, kind: 'plain', onClick: () => void close(false) },
      ]}
    />
  );
}
