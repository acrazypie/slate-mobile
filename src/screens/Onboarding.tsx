// First launch (Timeline design, screens 01–03): welcome, notifications and
// calendars, each with Skip. System prompts come only after the Allow button.

import { useState } from 'react';
import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { useDeviceCalendar } from '../calendar/CalendarProvider';
import { haptics, isNative } from '../native/platform';
import { Icon, type IconName } from '../ui/icons';
import { requestPermission } from '../notify/notifications';

type OnboardingProps = { onDone: (openCalendars: boolean) => void };

const STEP_ICON: IconName[] = ['calendar', 'bell', 'calendar'];

/** Timeline design, screens 01–03: welcome, notifications, calendars. Skip on every step. */
export function Onboarding({ onDone }: OnboardingProps) {
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
