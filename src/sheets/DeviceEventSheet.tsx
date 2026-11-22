// Read-only details of an event from a device calendar.
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { useI18n } from '../i18n/I18n';
import { capitalize, formatDate, formatDayRange } from '../i18n/format';
import { isNative } from '../native/platform';
import { dateFromKey } from '../lib/recurrence';
import type { DeviceEvent } from '../lib/types';
import { formatTime } from '../lib/types';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';

export function DeviceEventSheet({ event, onClose }: { event: DeviceEvent | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  if (!event) return null;
  const start = dateFromKey(event.startDate);
  const end = dateFromKey(event.endDate);
  const when = event.allDay
    ? `${event.startDate === event.endDate ? capitalize(formatDate(locale, start, 'fullDay')) : formatDayRange(locale, start, end)}, ${t.calendar.allDay.toLowerCase()}`
    : `${capitalize(formatDate(locale, start, 'fullDay'))}, ${formatTime(event.start_hour, event.start_minute)}–${formatTime(event.end_hour, event.end_minute)}`;
  return (
    <Sheet open onClose={onClose} title={t.calendar.deviceEvent} compact>
      <div className="pad-x devev" style={{ ['--c' as string]: event.color }}>
        <span className="tag devev__cal"><i className="hatch" />{event.calendarName}</span>
        <h2 className="h-dialog">{event.title || '—'}</h2>
        <div className="rows">
          <div className="row"><Icon name="clock" /><span className="row__main"><span className="row__meta">{t.deviceEvent.when}</span>{when}</span></div>
          {event.location && <div className="row"><Icon name="mapPin" /><span className="row__main"><span className="row__meta">{t.deviceEvent.location}</span>{event.location}</span></div>}
          {event.notes && <div className="row"><Icon name="note" /><span className="row__main"><span className="row__meta">{t.deviceEvent.notes}</span><span className="pre">{event.notes}</span></span></div>}
        </div>
        <p className="note"><Icon name="info" />{t.deviceEvent.readOnly}</p>
        {isNative && (
          <div className="sheet__foot">
            <button type="button" className="btn btn--ghost btn--wide" onClick={() => CapacitorCalendar.openCalendar({ date: start.getTime() }).catch(() => {})}>
              <Icon name="calendar" /> {t.deviceEvent.open}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
