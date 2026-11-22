// First launch (mockup 07-permission): what Slate is, and the pre-permission
// explainer for the device calendar. The system prompt is shown only after
// "Connect"; "Not now" goes straight to the (empty) week.

import { useState } from 'react';
import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { useDeviceCalendar } from '../calendar/CalendarProvider';
import { haptics, isNative } from '../native/platform';
import { Icon, Mark } from '../ui/icons';

export function Onboarding({ onDone }: { onDone: (openCalendars: boolean) => void }) {
  const { t } = useI18n();
  const settings = useSettings();
  const cal = useDeviceCalendar();
  const [busy, setBusy] = useState(false);

  const finish = async (connected: boolean) => {
    await repo.updateSettings({ onboarded: true, calendar: { ...settings.calendar, showDeviceEvents: connected } });
    onDone(connected);
  };

  const connect = async () => {
    setBusy(true);
    const access = await cal.request();
    setBusy(false);
    haptics.success();
    await finish(access === 'full');
  };

  return (
    <div className="screen onboarding">
      <Mark big />
      <h1 className="h-display">
        {t.onboarding.titleBefore} <span className="acc">{t.onboarding.titleAccent}</span>
      </h1>
      <div className="illu" aria-hidden="true">
        <i className="ev ev--block" style={{ ['--c' as string]: '#FFD9A0', left: '2%', width: '30%', top: 8, height: 52 }}><b>Analisi 1</b></i>
        <i className="ev ev--device" style={{ ['--c' as string]: '#7AA7D9', left: '2%', width: '30%', top: 68, height: 32 }}><span className="ev__patch"><b>Dentista</b></span></i>
        <i className="ev ev--shift" style={{ ['--c' as string]: '#6BB6A3', left: '35%', width: '30%', top: 4, height: 70 }}><b>{t.common.shift}</b></i>
        <i className="ev ev--block" style={{ ['--c' as string]: '#BB86FC', left: '35%', width: '30%', top: 80, height: 46 }}><b>Fisica</b></i>
        <i className="ev ev--device" style={{ ['--c' as string]: '#6BB66B', left: '68%', width: '30%', top: 14, height: 34 }}><span className="ev__patch"><b>Call</b></span></i>
        <i className="ev ev--block" style={{ ['--c' as string]: '#BB86FC', left: '68%', width: '30%', top: 56, height: 64 }}><b>Progetto</b></i>
      </div>
      <div className="rows">
        {t.onboarding.points.map((p, i) => (
          <div key={i} className="row">
            <span className="row__main"><span className="row__name">{p.name}</span><span className="row__meta">{p.text}</span></span>
          </div>
        ))}
      </div>
      <div className="onboarding__acts">
        {isNative ? (
          <>
            <button type="button" className="btn btn--wide" disabled={busy} onClick={connect}>
              <Icon name="calendar" /> {t.onboarding.connect}
            </button>
            <button type="button" className="btn btn--text btn--wide" onClick={() => void finish(false)}>{t.onboarding.notNow}</button>
          </>
        ) : (
          <button type="button" className="btn btn--wide" onClick={() => void finish(false)}>{t.onboarding.start}</button>
        )}
      </div>
    </div>
  );
}
