// Month view, in one of two styles (Settings → Month view):
// - compact: small squares per day; tapping a day selects it and lists what
//   is on it under the grid; tapping it again opens the day view.
// - detailed: the web app's month, cells with a chip per item. When a cell
//   can't fit everything, shifts come first, then blocks, then device events,
//   and the last line says how many more there are. Tapping opens the day sheet.

import { useEffect, useMemo, useRef, useState } from 'react';
import { isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import type { DeviceEvent } from '../lib/types';
import type { DayContent } from '../lib/days';
import { useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { capitalize, formatDate, weekdayNames } from '../i18n/format';
import type { CalendarActions } from './CalendarScreen';
import { DayList, dayItems, type DayItem } from './DayList';
import { Icon } from '../ui/icons';

export function MonthView({ anchor, contents, deviceEvents, today, actions }: {
  anchor: Date;
  contents: DayContent[];
  deviceEvents: DeviceEvent[];
  today: Date;
  actions: CalendarActions;
}) {
  const { monthStyle } = useSettings();
  const { locale } = useI18n();
  const labels = useMemo(() => weekdayNames(locale).map((n) => n.slice(0, monthStyle === 'detailed' ? 3 : 1)), [locale, monthStyle]);
  return monthStyle === 'detailed' ? (
    <DetailedMonth anchor={anchor} contents={contents} deviceEvents={deviceEvents} today={today} actions={actions} labels={labels} />
  ) : (
    <CompactMonth anchor={anchor} contents={contents} deviceEvents={deviceEvents} today={today} actions={actions} labels={labels} />
  );
}

type Props = {
  anchor: Date;
  contents: DayContent[];
  deviceEvents: DeviceEvent[];
  today: Date;
  actions: CalendarActions;
  labels: string[];
};

function CompactMonth({ anchor, contents, deviceEvents, today, actions, labels }: Props) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState(() => (isSameMonth(today, anchor) ? today : startOfMonth(anchor)));
  const selectedDay = contents.find((c) => isSameDay(c.date, selected));
  const items = dayItems(t, selected, selectedDay, deviceEvents, actions);

  return (
    <div className="month">
      <div className="mwd">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="mgrid">
        {contents.map((c) => {
          const squares = dayItems(t, c.date, c, deviceEvents, actions, true).filter((it) => !it.k.endsWith('+')).slice(0, 3);
          const sel = isSameDay(c.date, selected);
          return (
            <button
              key={c.key}
              type="button"
              className={`mcell${isSameMonth(c.date, anchor) ? '' : ' out'}${isSameDay(c.date, today) ? ' today' : ''}${sel ? ' sel' : ''}`}
              onClick={() => (sel ? actions.onGoToDay(c.date) : setSelected(c.date))}
              aria-label={formatDate(locale, c.date, 'fullDay')}
              aria-pressed={sel}
            >
              <span className="n">{c.date.getDate()}</span>
              <span className="sq">
                {squares.map((s) => (
                  <i key={s.k} className={s.kind === 'shift' ? 's' : s.kind === 'device' ? 'd' : ''} style={{ ['--c' as string]: s.color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <section className="mday" aria-live="polite">
        <div className="mday__head">
          <h2 className="h-row">{capitalize(formatDate(locale, selected, 'fullDay'))}</h2>
          <button type="button" className="gbtn round" onClick={() => actions.onSlot(selected, 9)} aria-label={t.calendar.add}>
            <Icon name="plus" />
          </button>
        </div>
        <DayList items={items} />
        {items.length > 0 && (
          <button type="button" className="mday__open" onClick={() => actions.onGoToDay(selected)}>
            {t.calendar.openDay}
          </button>
        )}
      </section>
    </div>
  );
}

const CHIP_H = 25; // px per chip incl. gap
const NUM_H = 24; // the day number

function DetailedMonth({ anchor, contents, deviceEvents, today, actions, labels }: Props) {
  const { t, locale } = useI18n();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellH, setCellH] = useState(96);
  const rows = Math.ceil(contents.length / 7);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setCellH(el.clientHeight / rows);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows]);

  const fit = Math.max(1, Math.floor((cellH - NUM_H - 4) / CHIP_H));

  return (
    <div className="month month--detailed">
      <div className="mwd">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="mgrid mgrid--detailed" ref={gridRef} style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
        {contents.map((c) => {
          const all = dayItems(t, c.date, c, deviceEvents, actions, true);
          const shown: DayItem[] = all.length > fit ? all.slice(0, fit - 1) : all;
          const more = all.length - shown.length;
          return (
            <button
              key={c.key}
              type="button"
              className={`dcell${isSameMonth(c.date, anchor) ? '' : ' out'}${isSameDay(c.date, today) ? ' today' : ''}`}
              onClick={() => actions.onOpenDay(c.date)}
              aria-label={formatDate(locale, c.date, 'fullDay')}
            >
              <span className="n">{c.date.getDate()}</span>
              {shown.map((it) => (
                <span key={it.k} className={`mchip mchip--${it.kind}`} style={{ ['--c' as string]: it.color }}>
                  <b>{it.title}</b>
                  {it.short && <small>{it.short}</small>}
                </span>
              ))}
              {more > 0 && <span className="mchip__more">+{more}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
