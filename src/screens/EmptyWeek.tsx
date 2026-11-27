import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { Icon, Mark } from '../ui/icons';

/** design-notes §7: mark, tag, title with accent word, lede, two actions; grid faded behind. */
export function EmptyWeek({ onNewEvent, onNewShift, weekTag }: { onNewEvent: () => void; onNewShift: () => void; weekTag: string | null }) {
  const { t } = useI18n();
  const { hideEmptyTips } = useSettings();
  if (hideEmptyTips) return null;
  return (
    <div className="empty">
      <div className="empty__card">
        <Mark big />
        {weekTag && <span className="tag">{weekTag}</span>}
        <h2 className="h-page">{t.calendar.emptyWeekTitle}</h2>
        <p className="lede">{t.calendar.emptyWeekLede}</p>
        <div className="empty__acts">
          <button type="button" className="btn" onClick={onNewEvent}>
            <Icon name="plus" /> {t.calendar.newEvent}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onNewShift}>
            {t.calendar.createShift}
          </button>
        </div>
        <button type="button" className="empty__dismiss" onClick={() => void repo.updateSettings({ hideEmptyTips: true })}>
          {t.calendar.dontShowAgain}
        </button>
      </div>
    </div>
  );
}
