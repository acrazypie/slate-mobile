// Account: every Google feature in one place, behind one master switch, and a
// placeholder for Slate's own sign-in (in progress, see docs/server-plan.md).

import { useI18n } from '../i18n/I18n';
import { fill } from '../i18n/format';
import { useSettings, repo } from '../app/store';
import { removeGoogleCopies, useGoogle } from '../google/GoogleProvider';
import { haptics } from '../native/platform';
import { Dialog, useBackHandler } from '../ui/Sheet';
import { Group, Row, Switch, useToast } from '../ui/controls';
import { Icon } from '../ui/icons';
import { useState } from 'react';

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const toast = useToast();
  const google = useGoogle();
  const [confirmGoogleRemove, setConfirmGoogleRemove] = useState(false);
  useBackHandler(true, onBack);
  const gs = settings.google;
  const setG = (patch: Partial<typeof gs>) => void repo.updateSettings({ google: { ...gs, ...patch } });
  const master = gs.enabled;
  const on = master && google.connected;

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

      <Group label={t.account.googleSection} footer={google.configured ? t.account.googleFooter : t.googleSync.footerNotConfigured}>
        <Row icon="lock" name={t.account.googleFeatures} hint={t.account.googleFeaturesHint}>
          <Switch
            checked={master}
            onChange={(enabled) => {
              haptics.tick();
              setG({ enabled });
            }}
            label={t.account.googleFeatures}
          />
        </Row>
      </Group>

      {master && (
        <Group label={t.account.googleSignIn} footer={t.googleSync.footer}>
          <Row icon="lock" name={google.connected && google.email ? fill(t.googleSync.signedInAs, { email: google.email }) : t.googleSync.notConnected} value={<i className={`dot dot--${google.connected ? 'full' : 'prompt'}`} />}>
            {google.configured && (
              google.connected ? (
                <button type="button" className="btn btn--ghost" onClick={() => void google.disconnect()}>{t.googleSync.disconnect}</button>
              ) : (
                <button type="button" className="btn" onClick={async () => { if (!(await google.connect())) toast(t.googleSync.connectFailed, 'warn'); }}>{t.googleSync.connect}</button>
              )
            )}
          </Row>
          {!google.configured && <Row icon="info" name={t.googleSync.notConfigured} />}
        </Group>
      )}

      {on && (
        <Group label={t.account.googleSync}>
          <Row icon="calendar" name={t.googleSync.push}>
            <Switch checked={gs.push} onChange={(push) => setG({ push })} label={t.googleSync.push} />
          </Row>
          {gs.push && (
            <Row icon="calendar" name={t.googleSync.pushShifts}>
              <Switch checked={gs.pushShifts} onChange={(pushShifts) => setG({ pushShifts })} label={t.googleSync.pushShifts} />
            </Row>
          )}
          <Row icon="calendar" name={t.googleSync.showEvents}>
            <Switch checked={gs.showEvents} onChange={(showEvents) => setG({ showEvents })} label={t.googleSync.showEvents} />
          </Row>
          <Row
            icon="refresh"
            name={google.status.lastSync ? fill(t.googleSync.lastSync, { when: new Date(google.status.lastSync).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }) }) : t.googleSync.neverSynced}
            hint={google.status.error ?? undefined}
            onClick={gs.push && !google.status.syncing ? () => void google.sync() : undefined}
          />
          {gs.push && (
            <Row icon="trash" name={t.googleSync.removeCopies} danger onClick={() => setConfirmGoogleRemove(true)} />
          )}
        </Group>
      )}

      <Dialog
        open={confirmGoogleRemove}
        onClose={() => setConfirmGoogleRemove(false)}
        title={t.googleSync.removeCopies}
        message={t.googleSync.removeConfirm}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: async () => {
          setConfirmGoogleRemove(false);
          try {
            await removeGoogleCopies();
            toast(t.googleSync.removed);
            setG({ push: false });
          } catch {
            toast(t.googleSync.needsSignIn, 'warn');
          }
        } }]}
      />
    </div>
  );
}
