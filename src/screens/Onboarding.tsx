// First launch (mockup 07-permission): what Slate is, and the pre-permission
// explainer for the device calendar. The system prompt is shown only after
// "Connect"; "Not now" goes straight to the (empty) week.

import { useState } from 'react';
import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { useDeviceCalendar } from '../calendar/CalendarProvider';
import { haptics, isNative, platform } from '../native/platform';
import { Icon, Mark, type IconName } from '../ui/icons';
import { requestPermission } from '../notify/notifications';

type OnboardingProps = { onDone: (openCalendars: boolean) => void };

/** Android gets the three-step flow from the Timeline design; iOS keeps the screen below. */
export function Onboarding(props: OnboardingProps) {
  return platform === 'android' ? <OnboardingAndroid {...props} /> : <OnboardingClassic {...props} />;
}

function OnboardingClassic({ onDone }: OnboardingProps) {
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

const STEP_ICON: IconName[] = ['calendar', 'bell', 'calendar'];

/** Timeline design, screens 01–03: welcome, notifications, calendars. Skip on every step. */
function OnboardingAndroid({ onDone }: OnboardingProps) {
  const { t } = useI18n();
  const settings = useSettings();
  const cal = useDeviceCalendar();
  const f = t.onboarding.flow;
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const finish = async (connected: boolean) => {
    await repo.updateSettings({ onboarded: true, calendar: { ...settings.calendar, showDeviceEvents: connected } });
    onDone(connected);
  };

  const allowNotifications = async () => {
    setBusy(true);
    try {
      if (isNative) await requestPermission();
    } catch {
      /* the system prompt failed; the step still moves on */
    }
    setBusy(false);
    haptics.success();
    setStep(2);
  };

  const allowCalendar = async () => {
    if (!isNative) return finish(false);
    setBusy(true);
    const access = await cal.request();
    setBusy(false);
    haptics.success();
    await finish(access === 'full');
  };

  const title = [
    { before: f.w1Title, accent: f.w1Accent, lede: f.w1Lede },
    { before: f.n1Title, accent: f.n1Accent, lede: f.n1Lede },
    { before: f.c1Title, accent: f.c1Accent, lede: f.c1Lede },
  ][step];

  return (
    <div className="screen onboarding onboarding--android">
      <div className="onboarding__top">
        <div className="onboarding__dots" aria-label={`${step + 1} / 3`}>
          {[0, 1, 2].map((i) => <i key={i} className={i === step ? 'on' : ''} />)}
        </div>
        <button type="button" className="btn btn--text" onClick={() => void finish(false)}>{f.skip}</button>
      </div>
      <div className="onboarding__icon" aria-hidden="true">
        <Icon name={STEP_ICON[step]} />
      </div>
      <h1 className="h-display">
        {title.before} <span className="acc">{title.accent}</span>
      </h1>
      <p className="lede">{title.lede}</p>
      {step === 0 && (
        <div className="rows">
          {[{ ic: 'calendar', text: f.w1a }, { ic: 'bell', text: f.w1b }, { ic: 'lock', text: f.w1c }].map((p) => (
            <div key={p.text} className="row">
              <Icon name={p.ic as IconName} className="row__arrow" />
              <span className="row__main"><span className="row__name">{p.text}</span></span>
            </div>
          ))}
        </div>
      )}
      <div className="onboarding__acts">
        {step === 0 && <button type="button" className="btn btn--wide" onClick={() => setStep(1)}>{f.continue}</button>}
        {step === 1 && (
          <>
            <button type="button" className="btn btn--wide" disabled={busy} onClick={() => void allowNotifications()}>{f.allowNotif}</button>
            <button type="button" className="btn btn--text btn--wide" onClick={() => setStep(2)}>{t.onboarding.notNow}</button>
          </>
        )}
        {step === 2 && (
          <>
            <button type="button" className="btn btn--wide" disabled={busy} onClick={() => void allowCalendar()}>{f.allowCal}</button>
            <button type="button" className="btn btn--text btn--wide" onClick={() => void finish(false)}>{t.onboarding.notNow}</button>
          </>
        )}
      </div>
    </div>
  );
}
