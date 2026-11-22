// Settings › Calendars shown (mockup 06c): grouped by account, checkmark
// (iOS) / checkbox (Android). Slate's own push target is listed apart and
// never shown, so blocks don't appear twice.

import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { useDeviceCalendar } from '../calendar/CalendarProvider';
import { haptics } from '../native/platform';
import { Group, Row } from '../ui/controls';
import { Icon } from '../ui/icons';

export function CalendarPicker({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const settings = useSettings();
  const { calendars, slateCalendarId } = useDeviceCalendar();
  const shown = calendars.filter((c) => c.id !== slateCalendarId);
  const selected = new Set(settings.calendar.visibleCalendarIds ?? shown.map((c) => c.id));
  const groups = new Map<string, typeof shown>();
  for (const c of shown) {
    const key = c.account ?? t.calendarSync.onPhone;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const toggle = (id: string) => {
    haptics.tick();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void repo.updateSettings({ calendar: { ...settings.calendar, visibleCalendarIds: [...next] } });
  };
  const slate = calendars.find((c) => c.id === slateCalendarId);

  return (
    <div className="screen page page--grouped">
      <div className="page__bar page__bar--back">
        <button type="button" className="gbtn back" onClick={onBack}>
          <Icon name="chevronLeft" /> <span>{t.settings.title}</span>
        </button>
      </div>
      <header className="page__head">
        <h1 className="h-page">{t.calendarSync.pickerTitle}</h1>
        <p className="lede">{t.calendarSync.pickerLede}</p>
      </header>
      {shown.length === 0 && <p className="lede pad-x">{t.calendarSync.noCalendars}</p>}
      {[...groups.entries()].map(([account, list]) => (
        <Group key={account} label={account}>
          {list.map((c) => (
            <Row key={c.id} name={<span className="calrow"><i className="hatchsq" style={{ ['--c' as string]: c.color }} />{c.name}</span>} hint={c.writable ? undefined : t.calendarSync.readOnly} onClick={() => toggle(c.id)}>
              <span className={`checkmark${selected.has(c.id) ? ' on' : ''}`} role="checkbox" aria-checked={selected.has(c.id)}>
                <Icon name="check" />
              </span>
            </Row>
          ))}
        </Group>
      ))}
      {slate && (
        <Group label={t.calendarSync.onPhone}>
          <Row name={<span className="calrow"><i className="solidsq" style={{ ['--c' as string]: slate.color }} />{slate.name}</span>} hint={t.calendarSync.slateHidden} />
        </Group>
      )}
    </div>
  );
}
