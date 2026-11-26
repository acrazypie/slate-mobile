// The day view with nothing on this day: the hour grid stays, faded behind a
// short card with the existing copy and the two add actions (as the week does).

import { useI18n } from '../i18n/I18n';
import { Icon, Mark } from '../ui/icons';

export function EmptyDay({ onNewEvent, onNewShift }: { onNewEvent: () => void; onNewShift: () => void }) {
  const { t } = useI18n();
  return (
    <div className="empty">
      <div className="empty__card">
        <Mark big />
        <p className="lede">{t.calendar.emptyDay}</p>
        <p className="small">{t.calendar.emptyWeekHint}</p>
        <div className="empty__acts">
          <button type="button" className="btn" onClick={onNewEvent}>
            <Icon name="plus" /> {t.calendar.newEvent}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onNewShift}>
            {t.calendar.createShift}
          </button>
        </div>
      </div>
    </div>
  );
}
