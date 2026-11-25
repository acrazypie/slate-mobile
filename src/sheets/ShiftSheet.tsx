// Create / edit a shift definition (the web app's ShiftModal). Opened from a
// placed shift it can also remove it from that day; opened from a day it
// places the new shift there once saved.

import { useEffect, useState } from 'react';
import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { fill, formatDate } from '../i18n/format';
import { haptics } from '../native/platform';
import { dateFromKey } from '../lib/recurrence';
import type { PlacedShift, Shift } from '../lib/types';
import { BREAK_MAX_MINUTES, COLOR_PALETTE, SHIFT_DEFAULT_COLOR, colorKey, formatDuration, formatTime, isOvernightShift, paidShiftMinutes, shiftDurationMinutes } from '../lib/types';
import { Dialog, Sheet } from '../ui/Sheet';
import { Swatches } from '../ui/controls';
import { Icon } from '../ui/icons';
import { ReminderField } from './ReminderField';

export function ShiftSheet({ open, shift, placed, placeOn, onClose }: {
  open: boolean;
  shift: Shift | null;
  placed: PlacedShift | null;
  placeOn: string | null;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const [color, setColor] = useState(SHIFT_DEFAULT_COLOR);
  const [breakMin, setBreakMin] = useState('0');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [reminder, setReminder] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirm(false);
    setTitle(shift?.title ?? '');
    setStart(shift ? formatTime(shift.start_hour, shift.start_minute) : '09:00');
    setEnd(shift ? formatTime(shift.end_hour, shift.end_minute) : '13:00');
    setColor(shift?.color ?? SHIFT_DEFAULT_COLOR);
    setBreakMin(String(shift?.break_minutes ?? 0));
    setReminder(shift?.reminder_minutes);
  }, [open, shift]);

  if (!open) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const times = { start_hour: sh || 0, start_minute: sm || 0, end_hour: eh || 0, end_minute: em || 0 };
  const same = times.start_hour === times.end_hour && times.start_minute === times.end_minute;
  const brk = Math.min(BREAK_MAX_MINUTES, Math.max(0, Math.round(Number(breakMin) || 0)));
  const duration = same ? 0 : shiftDurationMinutes(times);
  const breakTooLong = brk > 0 && brk >= duration;

  const save = async () => {
    if (!title.trim()) {
      setError(t.blockModal.titleRequired);
      haptics.warning();
      return;
    }
    if (same) {
      setError(t.shiftModal.sameTimeError);
      haptics.warning();
      return;
    }
    if (breakTooLong) {
      setError(t.breaks.tooLong);
      haptics.warning();
      return;
    }
    const form = { title, color, break_minutes: brk, reminder_minutes: reminder, ...times };
    if (shift) await repo.updateShift(shift.id, form);
    else {
      const created = await repo.createShift(form);
      if (placeOn) await repo.assignShift(created.id, placeOn);
    }
    haptics.success();
    onClose();
  };

  const dayLabel = placed ? formatDate(locale, dateFromKey(placed.shift_date), 'fullDay') : '';

  return (
    <Sheet open onClose={onClose} title={shift ? t.shiftModal.editTitle : t.shiftModal.newTitle} onConfirm={save}>
      <label className="fld fld--title">
        <span className="fld__l">{t.shiftModal.name}</span>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder={t.shiftModal.namePlaceholder} maxLength={100} autoFocus={!shift} />
      </label>
      {error && <p className="fld__err">{error}</p>}

      <div className="tiles pad-x">
        <label className="tile">
          <span className="label">{t.common.startTime}</span>
          <span className="tile__v">{start}</span>
          <input className="fld__overlay" type="time" value={start} step={300} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
        <Icon name="chevronRight" className="dim" />
        <label className="tile">
          <span className="label">{t.common.endTime}</span>
          <span className="tile__v">{end}</span>
          <input className="fld__overlay" type="time" value={end} step={300} onChange={(e) => e.target.value && setEnd(e.target.value)} />
        </label>
      </div>
      <p className="note pad-x">
        <Icon name="clock" />
        {same ? t.shiftModal.sameTimeError : `${formatDuration(duration)}${isOvernightShift(times) ? `. ${t.shiftModal.overnight}` : ''}`}
      </p>

      <div className="form-grp">
        <label className="fld">
          <span className="fld__l">{t.breaks.label}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={BREAK_MAX_MINUTES}
            step={5}
            value={breakMin}
            onChange={(e) => { setBreakMin(e.target.value); setError(''); }}
            aria-describedby="break-hint"
          />
        </label>
      </div>
      <p className={breakTooLong ? 'fld__err pad-x' : 'note pad-x'} id="break-hint">
        {breakTooLong ? t.breaks.tooLong : t.breaks.hint}
        {!breakTooLong && brk > 0 && <> {fill(t.breaks.withBreak, { minutes: brk })}: {formatDuration(paidShiftMinutes({ ...times, break_minutes: brk }))}</>}
      </p>

      <div className="form-grp">
        <ReminderField value={reminder} onChange={setReminder} defaultLead={settings.notifications.leadMinutes} />
      </div>

      <span className="flabel label">{t.common.color}</span>
      <div className="pad-x">
        <Swatches colors={COLOR_PALETTE} value={color} onChange={setColor} names={(c) => { const k = colorKey(c); return k ? t.colors[k] : c; }} />
      </div>

      {shift && <p className="note pad-x"><Icon name="info" />{t.shiftModal.appliesEverywhere}</p>}

      {shift && (
        <div className="pad-x sheet__foot stack">
          {placed && (
            <button type="button" className="btn btn--ghost btn--wide" onClick={async () => { await repo.unassignShift(placed.id); haptics.warning(); onClose(); }}>
              {fill(t.shiftModal.removeFrom, { day: dayLabel || t.shiftModal.thisDay })}
            </button>
          )}
          <button type="button" className="btn btn--danger btn--wide" onClick={() => setConfirm(true)}>
            <Icon name="trash" /> {t.shiftModal.deleteShift}
          </button>
        </div>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t.shiftModal.deleteShift}
        message={fill(t.shiftModal.confirmDelete, { title: shift?.title ?? '' })}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: async () => { if (shift) await repo.deleteShift(shift.id); haptics.warning(); setConfirm(false); onClose(); } }]}
      />
    </Sheet>
  );
}
