// The Calendar tab: header (today, summary, add), view switch, and the day,
// week and month views with swipe navigation. Owns the sheets for creating
// and editing blocks and placing shifts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, endOfWeek, isSameDay, startOfMonth } from 'date-fns';
import { useData, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { capitalize, fill, formatDate, formatDayRange } from '../i18n/format';
import { useDeviceEvents } from '../calendar/CalendarProvider';
import { haptics, platform } from '../native/platform';
import type { Block, DeviceEvent, PlacedShift, ViewMode } from '../lib/types';
import { dayContents, daysFrom, isoWeek, weekStart } from '../lib/days';
import { Icon } from '../ui/icons';
import { Segmented } from '../ui/controls';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { BlockSheet, type BlockTarget } from '../sheets/BlockSheet';
import { CreateSheet } from '../sheets/CreateSheet';
import { ShiftSheet } from '../sheets/ShiftSheet';
import { DeviceEventSheet } from '../sheets/DeviceEventSheet';
import { DaySheet } from '../sheets/DaySheet';

export interface CalendarActions {
  onSlot: (date: Date, hour: number) => void;
  onBlock: (block: Block, date: Date) => void;
  onShift: (placed: PlacedShift) => void;
  onDeviceEvent: (event: DeviceEvent) => void;
  onOpenDay: (date: Date) => void;
  /** Switches to the day view on that date. */
  onGoToDay: (date: Date) => void;
}

export function CalendarScreen({ onGoToShifts }: { onGoToShifts: () => void }) {
  const { t, locale } = useI18n();
  const data = useData();
  const settings = useSettings();
  const [view, setView] = useState<ViewMode>(settings.defaultView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [today, setToday] = useState(() => new Date());
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null);

  // sheets
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const [create, setCreate] = useState<{ date: Date; hour: number } | null>(null);
  const [shiftEdit, setShiftEdit] = useState<{ placed?: PlacedShift; placeOn?: string } | null>(null);
  const [deviceEvent, setDeviceEvent] = useState<DeviceEvent | null>(null);
  const [daySheet, setDaySheet] = useState<Date | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // range on screen
  const range = useMemo(() => {
    if (view === 'month') {
      const start = weekStart(startOfMonth(anchor));
      const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
      return { start, end };
    }
    const start = weekStart(anchor);
    return { start, end: addDays(start, 6) };
  }, [view, anchor]);
  const days = useMemo(() => {
    const n = differenceInCalendarDays(range.end, range.start) + 1;
    return daysFrom(range.start, n);
  }, [range]);
  const contents = useMemo(() => dayContents(data, days), [data, days]);
  const deviceEvents = useDeviceEvents(range.start, range.end);

  const go = useCallback(
    (dir: 1 | -1) => {
      haptics.tick();
      setSlide(dir === 1 ? 'next' : 'prev');
      setAnchor((a) => (view === 'day' ? addDays(a, dir) : view === 'week' ? addDays(a, 7 * dir) : addMonths(a, dir)));
    },
    [view],
  );
  const goToday = () => {
    haptics.tick();
    setSlide(null);
    setAnchor(new Date());
  };

  // swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const actions: CalendarActions = {
    onSlot: (date, hour) => {
      haptics.light();
      setCreate({ date, hour });
    },
    onBlock: (block, date) => setBlockTarget({ block, date }),
    onShift: (placed) => setShiftEdit({ placed }),
    onDeviceEvent: setDeviceEvent,
    onOpenDay: (date) => {
      if (view === 'month') setDaySheet(date);
      else {
        setAnchor(date);
        setView('day');
      }
    },
    onGoToDay: (date) => {
      setSlide(null);
      setAnchor(date);
      setView('day');
    },
  };

  // header text
  const monthYear = formatDate(locale, anchor, 'monthYear');
  const year = String(anchor.getFullYear());
  // Android (Timeline design): the day view's title is the day itself ("Wed 25 November"),
  // with no eyebrow and no accent year. iOS keeps the month title and eyebrow.
  const androidDay = platform === 'android' && view === 'day';
  const titleMain = androidDay
    ? capitalize(formatDate(locale, anchor, 'weekdayDayMonth'))
    : capitalize(monthYear.replace(year, '').trim());
  // eyebrow only where it says something the title doesn't (design-notes §2)
  const tag =
    platform === 'android'
      ? null
      : view === 'week'
        ? fill(t.calendar.weekTag, { n: isoWeek(anchor), range: formatDayRange(locale, range.start, range.end) })
        : view === 'day'
          ? capitalize(formatDate(locale, anchor, 'fullDay'))
          : null;

  const weekEmpty = view === 'week' && contents.every((c) => c.blocks.length === 0 && c.shifts.length === 0);

  return (
    <div className="screen cal" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="cal-head">
        <div className="cal-head__bar">
          <button type="button" className="gbtn cal-head__today" onClick={goToday} aria-label={t.calendar.today}>
            <Icon name="calendarCheck" className="android-only" />
            <span className="ios-only">{t.calendar.today}</span>
          </button>
          <div className="cal-head__title">
            {tag && <span className="tag">{tag}</span>}
            <h1 className="h-page">
              {androidDay ? titleMain : <>{titleMain} <span className="acc">{year}</span></>}
            </h1>
          </div>
          <div className="cal-head__nav">
            <button type="button" className="gbtn round" onClick={() => go(-1)} aria-label={t.calendar.previous}>
              <Icon name="chevronLeft" />
            </button>
            <button type="button" className="gbtn round" onClick={() => go(1)} aria-label={t.calendar.next}>
              <Icon name="chevronRight" />
            </button>
          </div>
          <button type="button" className="gbtn round accent ios-only" onClick={() => actions.onSlot(view === 'day' ? anchor : isSameDay(range.start, weekStart(today)) ? today : range.start, 9)} aria-label={t.calendar.add}>
            <Icon name="plus" />
          </button>
        </div>
        <Segmented
          label={t.calendar.view}
          value={view}
          onChange={(v) => {
            setSlide(null);
            setView(v);
          }}
          options={(['day', 'week', 'month'] as const).map((v) => ({ value: v, label: t.views[v] }))}
        />
      </header>

      <div key={`${view}-${range.start.getTime()}-${view === 'day' ? anchor.getTime() : ''}`} className={`cal-body${slide ? ` slide-${slide}` : ''}`}>
        {view === 'week' && (
          <WeekView contents={contents} deviceEvents={deviceEvents} today={today} actions={actions} empty={weekEmpty} onNewShift={() => setShiftEdit({})} />
        )}
        {view === 'day' && (
          <DayView
            anchor={anchor}
            contents={contents}
            deviceEvents={deviceEvents}
            today={today}
            actions={actions}
            onPickDay={(d) => {
              haptics.tick();
              setSlide(d > anchor ? 'next' : 'prev');
              setAnchor(d);
            }}
          />
        )}
        {view === 'month' && <MonthView anchor={anchor} contents={contents} deviceEvents={deviceEvents} today={today} actions={actions} />}
      </div>

      <button type="button" className="fab android-only" onClick={() => actions.onSlot(view === 'day' ? anchor : today, 9)} aria-label={t.calendar.add}>
        <Icon name="plus" />
      </button>

      <CreateSheet
        context={create}
        onClose={() => setCreate(null)}
        onEvent={() => {
          if (!create) return;
          setBlockTarget({ date: create.date, hour: create.hour });
          setCreate(null);
        }}
        onNewShift={(dateKey) => {
          setCreate(null);
          setShiftEdit({ placeOn: dateKey });
        }}
        onManageShifts={onGoToShifts}
      />
      <BlockSheet target={blockTarget} onClose={() => setBlockTarget(null)} />
      <ShiftSheet
        open={shiftEdit !== null}
        shift={shiftEdit?.placed?.shift ?? null}
        placed={shiftEdit?.placed ?? null}
        placeOn={shiftEdit?.placeOn ?? null}
        onClose={() => setShiftEdit(null)}
      />
      <DeviceEventSheet event={deviceEvent} onClose={() => setDeviceEvent(null)} />
      <DaySheet
        date={daySheet}
        contents={contents}
        deviceEvents={deviceEvents}
        actions={actions}
        onClose={() => setDaySheet(null)}
        onAdd={(d) => {
          setDaySheet(null);
          actions.onSlot(d, 9);
        }}
      />
    </div>
  );
}

