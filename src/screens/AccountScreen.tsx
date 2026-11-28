// Account: how the data is kept (on this phone, or on a Slate server still in
// progress, see docs/server-plan.md), and the phone calendar switch.

import { useI18n } from '../i18n/I18n';
import { useSettings, repo } from '../app/store';
import { useBackHandler } from '../ui/Sheet';
import { Group, Row, Switch } from '../ui/controls';
import { Icon } from '../ui/icons';

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const settings = useSettings();
  useBackHandler(true, onBack);

  return (
    <div className="screen page page--grouped">
      <div className="page__bar page__bar--back">
        <button type="button" className="gbtn back" onClick={onBack}>
          <Icon name="chevronLeft" /> <span>{t.settings.title}</span>
        </button>
      </div>
      <header className="page__head">
        <h1 className="h-page">{t.account.title}</h1>
        <p className="lede">{t.mode.title}</p>
      </header>

      <Group label={t.mode.title} footer={t.account.slateFooter}>
        <Row icon="lock" name={t.mode.local} hint={t.mode.localHint} value={<i className="dot dot--full" />} />
        <Row icon="lock" name={t.mode.hosted} hint={t.mode.hostedHint} value={<span className="dim">{t.mode.hostedWip}</span>} />
      </Group>

      <Group label={t.mode.phoneTitle} footer={t.mode.phoneShowHint}>
        <Row icon="calendar" name={t.mode.phoneShow}>
          <Switch
            checked={settings.calendar.showDeviceEvents}
            onChange={(showDeviceEvents) => void repo.updateSettings({ calendar: { ...settings.calendar, showDeviceEvents } })}
            label={t.mode.phoneShow}
          />
        </Row>
      </Group>
    </div>
  );
}
