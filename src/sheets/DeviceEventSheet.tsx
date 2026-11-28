// Details of an event from a calendar on the phone. Events in a writable phone
// calendar can be edited and deleted from here.

import { useEffect, useState } from 'react';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { useI18n } from '../i18n/I18n';
import { capitalize, fill, formatDate, formatDayRange } from '../i18n/format';
import { isNative, haptics } from '../native/platform';
import { dateFromKey } from '../lib/recurrence';
import type { DeviceEvent } from '../lib/types';
import { formatTime } from '../lib/types';
import { Dialog, Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';
import { useDeviceCalendar } from '../calendar/CalendarProvider';
import { deleteDeviceEvent, deviceEventStart, updateDeviceEvent } from '../calendar/device';

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

export function DeviceEventSheet({ event, onClose }: { event: DeviceEvent | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { refresh } = useDeviceCalendar();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!event) return;
    setEditing(false);
    setConfirm(false);
    setError('');
    setTitle(event.title);
    setNotes(event.notes);
    setStart(hhmm(event.start_hour, event.start_minute));
    setEnd(hhmm(event.end_hour, event.end_minute));
  }, [event]);

  if (!event) return null;
  const start0 = dateFromKey(event.startDate);
  const end0 = dateFromKey(event.endDate);
  const when = event.allDay
    ? `${event.startDate === event.endDate ? capitalize(formatDate(locale, start0, 'fullDay')) : formatDayRange(locale, start0, end0)}, ${t.calendar.allDay.toLowerCase()}`
    : `${capitalize(formatDate(locale, start0, 'fullDay'))}, ${formatTime(event.start_hour, event.start_minute)}–${formatTime(event.end_hour, event.end_minute)}`;
  const canEdit = event.writable && !event.allDay;
  const canDelete = event.writable;

  const save = async () => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (!title.trim()) {
      setError(t.blockModal.titleRequired);
      haptics.warning();
      return;
    }
    const day = deviceEventStart(event);
    const d = new Date(day);
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm).getTime();
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em).getTime();
    if (e <= s) {
      setError(t.eventTags.endAfterStart);
      haptics.warning();
      return;
    }
    try {
      await updateDeviceEvent(event, { title: title.trim(), notes, start: s, end: e });
      haptics.success();
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      haptics.warning();
    }
  };

  const remove = async () => {
    try {
      await deleteDeviceEvent(event);
      haptics.warning();
      await refresh();
      setConfirm(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Sheet open onClose={onClose} title={t.calendar.deviceEvent} compact onConfirm={editing ? save : undefined} confirmLabel={editing ? t.common.save : undefined}>
      <div className="pad-x devev" style={{ ['--c' as string]: event.color }}>
        <span className="tag devev__cal">
          <i className="hatch" />
          {event.calendarName}
          <span className="devev__src"> · {t.eventTags.device}</span>
        </span>

        {editing ? (
          <>
            <label className="fld fld--title">
              <span className="fld__l">{t.blockModal.title}</span>
              <input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} maxLength={200} />
            </label>
            <div className="tiles">
              <label className="tile">
                <span className="label">{t.common.startTime}</span>
                <span className="tile__v">{start}</span>
                <input className="fld__overlay" type="time" value={start} step={300} onChange={(e) => { e.target.value && setStart(e.target.value); setError(''); }} />
              </label>
              <Icon name="chevronRight" className="dim" />
              <label className="tile">
                <span className="label">{t.common.endTime}</span>
                <span className="tile__v">{end}</span>
                <input className="fld__overlay" type="time" value={end} step={300} onChange={(e) => { e.target.value && setEnd(e.target.value); setError(''); }} />
              </label>
            </div>
            <label className="fld pad-x" style={{ marginTop: 14 }}>
              <span className="fld__l">{t.deviceEvent.notes}</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </label>
            {error && <p className="fld__err">{error}</p>}
            <p className="note note--warn"><Icon name="info" />{t.eventTags.editSeries}</p>
          </>
        ) : (
          <>
            <h2 className="h-dialog">{event.title || '—'}</h2>
            <div className="rows">
              <div className="row"><Icon name="clock" /><span className="row__main"><span className="row__meta">{t.deviceEvent.when}</span>{when}</span></div>
              {event.location && <div className="row"><Icon name="mapPin" /><span className="row__main"><span className="row__meta">{t.deviceEvent.location}</span>{event.location}</span></div>}
              {event.notes && <div className="row"><Icon name="note" /><span className="row__main"><span className="row__meta">{t.deviceEvent.notes}</span><span className="pre">{event.notes}</span></span></div>}
            </div>
            <p className="note"><Icon name="info" />{canEdit ? t.eventTags.deviceEditable : t.deviceEvent.readOnly}</p>
          </>
        )}

        {!editing && (canEdit || canDelete || isNative) && (
          <div className="sheet__foot stack">
            {canEdit && (
              <button type="button" className="btn btn--wide" onClick={() => setEditing(true)}>
                <Icon name="note" /> {t.eventTags.edit}
              </button>
            )}
            {canDelete && (
              <button type="button" className="btn btn--danger btn--wide" onClick={() => setConfirm(true)}>
                <Icon name="trash" /> {t.eventTags.delete}
              </button>
            )}
            {isNative && (
              <button type="button" className="btn btn--ghost btn--wide" onClick={() => CapacitorCalendar.openCalendar({ date: start0.getTime() }).catch(() => {})}>
                <Icon name="calendar" /> {t.deviceEvent.open}
              </button>
            )}
          </div>
        )}
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t.eventTags.delete}
        message={<>{fill(t.eventTags.deleteOneConfirm, { title: event.title || '—' })}<br /><br />{t.eventTags.deleteOne}</>}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: () => void remove() }]}
      />
    </Sheet>
  );
}
