// Tapping an empty slot asks "event or shift?" (the web app's CreateChoiceSheet).
import { useEffect, useState } from 'react';
import { repo, useData } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { formatDate } from '../i18n/format';
import { haptics } from '../native/platform';
import { keyFromDate } from '../lib/recurrence';
import { formatTime, formatDuration, shiftDurationMinutes } from '../lib/types';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';

export function CreateSheet({ context, onClose, onEvent, onNewShift, onManageShifts }: {
  context: { date: Date; hour: number } | null;
  onClose: () => void;
  onEvent: () => void;
  onNewShift: (dateKey: string) => void;
  onManageShifts: () => void;
}) {
  const { t, locale } = useI18n();
  const { shifts, assignments } = useData();
  const [step, setStep] = useState<'choice' | 'shift'>('choice');
  useEffect(() => setStep('choice'), [context]);
  if (!context) return null;
  const dateKey = keyFromDate(context.date);
  const placedHere = new Set(assignments.filter((a) => a.shift_date === dateKey).map((a) => a.shift_id));

  return (
    <Sheet open onClose={step === 'shift' ? () => setStep('choice') : onClose} title={step === 'choice' ? t.create.whatToAdd : t.create.addShift} compact>
      <p className="sheet__sub label">{formatDate(locale, context.date, 'fullDay')}{step === 'choice' ? `, ${formatTime(context.hour, 0)}` : ''}</p>
      {step === 'choice' ? (
        <div className="rows pad-x">
          <button type="button" className="row" onClick={onEvent}>
            <span className="row__main"><span className="row__name">{t.common.event}</span><span className="row__meta">{t.create.eventHint}</span></span>
            <Icon name="chevronRight" className="row__arrow" />
          </button>
          <button type="button" className="row" onClick={() => setStep('shift')}>
            <span className="row__main"><span className="row__name">{t.common.shift}</span><span className="row__meta">{t.create.shiftHint}</span></span>
            <Icon name="chevronRight" className="row__arrow" />
          </button>
        </div>
      ) : (
        <div className="pad-x">
          {shifts.length === 0 && <p className="lede">{t.create.noShifts}</p>}
          <div className="rows">
            {shifts.map((s) => (
              <button
                key={s.id}
                type="button"
                className="row"
                disabled={placedHere.has(s.id)}
                onClick={async () => {
                  await repo.assignShift(s.id, dateKey);
                  haptics.success();
                  onClose();
                }}
              >
                <span className="glyph" style={{ ['--c' as string]: s.color }} />
                <span className="row__main">
                  <span className="row__name">{s.title}</span>
                  <span className="row__meta">{formatTime(s.start_hour, s.start_minute)}–{formatTime(s.end_hour, s.end_minute)} , {formatDuration(shiftDurationMinutes(s))}</span>
                </span>
                {placedHere.has(s.id) ? <Icon name="check" className="row__arrow" /> : <Icon name="plus" className="row__arrow" />}
              </button>
            ))}
          </div>
          <div className="sheet__foot stack">
            <button type="button" className="btn btn--wide" onClick={() => onNewShift(dateKey)}>
              <Icon name="plus" /> {t.create.newShift}
            </button>
            {shifts.length > 0 && (
              <button type="button" className="btn btn--ghost btn--wide" onClick={() => { onClose(); onManageShifts(); }}>
                {t.nav.shifts}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
