// Month view: tapping a day lists what is on it.
import { useI18n } from '../i18n/I18n';
import { capitalize, formatDate } from '../i18n/format';
import { keyFromDate } from '../lib/recurrence';
import type { DeviceEvent } from '../lib/types';
import { DayList, dayItems } from '../screens/DayList';
import type { DayContent } from '../lib/days';
import type { CalendarActions } from '../screens/CalendarScreen';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';

export function DaySheet({ date, contents, deviceEvents, actions, onClose, onAdd }: {
  date: Date | null;
  contents: DayContent[];
  deviceEvents: DeviceEvent[];
  actions: CalendarActions;
  onClose: () => void;
  onAdd: (d: Date) => void;
}) {
  const { t, locale } = useI18n();
  if (!date) return null;
  const key = keyFromDate(date);
  const items = dayItems(t, date, contents.find((c) => c.key === key), deviceEvents, actions);

  return (
    <Sheet open onClose={onClose} title={capitalize(formatDate(locale, date, 'fullDay'))} compact>
      <div className="pad-x">
        <DayList items={items} />
        <div className="sheet__foot stack">
          <button type="button" className="btn btn--wide" onClick={() => onAdd(date)}><Icon name="plus" /> {t.common.add}</button>
          <button type="button" className="btn btn--ghost btn--wide" onClick={() => { onClose(); actions.onGoToDay(date); }}>{t.calendar.openDay}</button>
        </div>
      </div>
    </Sheet>
  );
}
