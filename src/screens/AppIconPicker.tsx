// The app icon choice in Settings › Appearance. Picking another icon asks first,
// because the change is immediate and some launchers or iOS react to it.

import { useState } from 'react';
import { repo } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { APP_ICON_KEYS, type AppIconKey } from '../data/schema';
import { setAppIcon } from '../native/appIcon';
import { haptics } from '../native/platform';
import { Dialog } from '../ui/Sheet';
import { useToast } from '../ui/controls';
import tealIcon from '../assets/app-icons/teal.png';
import limeIcon from '../assets/app-icons/lime.png';
import violetIcon from '../assets/app-icons/violet.png';
import apricotIcon from '../assets/app-icons/apricot.png';
import monoIcon from '../assets/app-icons/mono.png';

const PREVIEW: Record<AppIconKey, string> = { teal: tealIcon, lime: limeIcon, violet: violetIcon, apricot: apricotIcon, mono: monoIcon };

export function AppIconPicker({ value }: { value: AppIconKey }) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, setPending] = useState<AppIconKey | null>(null);

  const change = async (icon: AppIconKey) => {
    try {
      await setAppIcon(icon);
    } catch {
      toast(t.appIcon.failed, 'warn');
      return;
    }
    await repo.updateSettings({ appIcon: icon });
    haptics.success();
  };

  return (
    <>
      <div className="icon-picker" role="radiogroup" aria-label={t.appIcon.label}>
        {APP_ICON_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={key === value}
            className={`icon-pick${key === value ? ' sel' : ''}`}
            onClick={() => key !== value && setPending(key)}
          >
            <img src={PREVIEW[key]} alt="" />
            <span>{t.appIcon[key]}</span>
          </button>
        ))}
      </div>
      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t.appIcon.warnTitle}
        message={t.appIcon.warnBody}
        actions={[
          { label: t.appIcon.change, kind: 'primary', onClick: () => { const k = pending; setPending(null); if (k) void change(k); } },
          { label: t.appIcon.keep, kind: 'plain', onClick: () => setPending(null) },
        ]}
      />
    </>
  );
}
