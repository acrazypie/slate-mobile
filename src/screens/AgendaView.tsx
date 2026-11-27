// Agenda (Android, Timeline design screen 07): the next seven days as a list,
// each day under its own heading on a vertical spine. Read-only overview; to
// place something, use the day or week view.

import { isSameDay } from 'date-fns';
import { useI18n } from '../i18n/I18n';
import { capitalize, formatDate } from '../i18n/format';
import type { DeviceEvent } from '../lib/types';
import type { DayContent } from '../lib/days';
import type { CalendarActions } from './CalendarScreen';
import { DayList, dayItems } from './DayList';

export function AgendaView({ contents, deviceEvents, today, actions }: {
  contents: DayContent[];
  deviceEvents: DeviceEvent[];
  today: Date;
  actions: CalendarActions;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="agenda">
      {contents.map((c) => {
        const items = dayItems(t, c.date, c, deviceEvents, actions);
        const isToday = isSameDay(c.date, today);
        return (
          <section key={c.key} className={`agenda__day${isToday ? ' today' : ''}`}>
            <h2 className="agenda__head">{capitalize(formatDate(locale, c.date, 'weekdayDayMonth'))}</h2>
            <div className="agenda__items">
              <DayList items={items} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
