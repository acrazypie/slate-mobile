import { useCallback, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import type { DeviceEvent } from '../lib/types';
import { blockEndTime, deviceEventsForDay, formatDuration, formatTime, layoutOverlaps, overlapPosition, shiftDurationMinutes } from '../lib/types';
import { keyFromDate } from '../lib/recurrence';
import { compactHours, daysFrom, weekStart, type DayContent } from '../lib/days';
import { useI18n } from '../i18n/I18n';
import { formatDate } from '../i18n/format';
import { Icon, type IconName } from '../ui/icons';
import type { CalendarActions } from './CalendarScreen';
import { AllDayChip, MIN_CARD_MINUTES } from './cards';
import { HourGrid } from './HourGrid';

const HOUR = 64;
const CATEGORY_ICON: Record<string, IconName> = { studio: 'book', lavoro: 'briefcase', lezione: 'cap', altro: 'note' };

export function DayView({ anchor, contents, deviceEvents, today, actions, onPickDay }: {
  anchor: Date;
  contents: DayContent[];
  deviceEvents: DeviceEvent[];
  today: Date;
  actions: CalendarActions;
  onPickDay: (d: Date) => void;
}) {
  const { t, locale } = useI18n();
  const key = keyFromDate(anchor);
  const day = contents.find((c) => c.key === key) ?? { date: anchor, key, blocks: [], shifts: [], minutes: 0 };
  const dev = useMemo(() => deviceEventsForDay(deviceEvents, key), [deviceEvents, key]);
  const strip = daysFrom(weekStart(anchor), 7);
  const isToday = isSameDay(anchor, today);

  const scrollToMorning = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollTop = Math.max(0, Math.min(new Date().getHours() - 1, 8)) * HOUR;
  }, []);

  const half = day.shifts.length > 0 && day.blocks.length + dev.timed.length > 0;
  const slots = layoutOverlaps([
    ...day.blocks.map((b) => {
      const s = b.start_hour * 60 + b.start_minute;
      return { key: `b:${b.id}`, start: s, end: s + Math.max(b.duration_minutes, MIN_CARD_MINUTES) };
    }),
    ...dev.timed.map((g) => ({ key: `d:${g.event.id}`, start: g.start, end: Math.max(g.end, g.start + MIN_CARD_MINUTES) })),
  ]);
  const px = (m: number) => (m / 60) * HOUR;
  const weekday = (d: Date) => formatDate(locale, d, 'weekdayShort').replace('.', '').slice(0, 1).toUpperCase();

  return (
    <div className="dayv">
      <div className="strip">
        {strip.map((d, i) => {
          const c = contents.find((x) => x.key === keyFromDate(d));
          const busy = !!c && (c.blocks.length > 0 || c.shifts.length > 0);
          return (
            <button key={i} type="button" className={`strip__d${isSameDay(d, anchor) ? ' sel' : ''}${isSameDay(d, today) ? ' today' : ''}${i >= 5 ? ' we' : ''}`} onClick={() => onPickDay(d)} aria-label={formatDate(locale, d, 'fullDay')}>
              <span className="strip__wd">{weekday(d)}</span>
              <span className="strip__n">{d.getDate()}</span>
              <i className={busy ? 'on' : ''} />
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span className="legend__tot">{day.minutes > 0 ? `${compactHours(day.minutes)} ${isToday ? t.calendar.today : ''}` : ' '}</span>
        <span><i className="lb" />{t.common.event}</span>
        <span><i className="ls" />{t.common.shift}</span>
        <span><i className="ld" />{t.deviceEvent.calendar}</span>
      </div>
      {dev.allDay.length > 0 && (
        <div className="allday allday--day">
          {dev.allDay.map((e) => (
            <AllDayChip key={e.id} event={e} onClick={() => actions.onDeviceEvent(e)} />
          ))}
        </div>
      )}
      <div className="day__scroll" ref={scrollToMorning}>
        <HourGrid hourHeight={HOUR} columns={1} todayIndex={isToday ? 0 : -1} onSlot={(_, hour) => actions.onSlot(anchor, hour)} nowLabel>
          <div className="grid__items" style={{ ['--col' as string]: 0 }}>
            {day.shifts.map((s) => {
              const sh = s.placed.shift;
              return (
                <button key={s.placed.id + (s.continued ? '+' : '')} type="button" className="dcard ev--shift" style={{ top: px(s.start), height: Math.max(px(s.end - s.start), 40), ['--c' as string]: sh.color, ...(half ? { right: 'calc(50% + 2px)' } : {}) }} onClick={(e) => { e.stopPropagation(); actions.onShift(s.placed); }}>
                  <span className="eb"><Icon name="briefcase" />{t.common.shift}</span>
                  <span className="t">{sh.title}</span>
                  <span className="tm">{formatTime(sh.start_hour, sh.start_minute)}–{formatTime(sh.end_hour, sh.end_minute)}, {formatDuration(shiftDurationMinutes(sh))}</span>
                </button>
              );
            })}
            {day.blocks.map((b) => {
              const s = b.start_hour * 60 + b.start_minute;
              const end = blockEndTime(b);
              const h = Math.max(px(Math.min(b.duration_minutes, 1440 - s)), 40);
              return (
                <button key={b.id} type="button" className={`dcard ev--block${h < 84 ? ' dcard--short' : ''}`} style={{ top: px(s), height: h, ['--c' as string]: b.color, ...overlapPosition(slots.get(`b:${b.id}`), half) }} onClick={(e) => { e.stopPropagation(); actions.onBlock(b, anchor); }}>
                  <span className="eb"><Icon name={CATEGORY_ICON[b.category]} />{t.categories[b.category]}{b.is_recurring ? `, ${b.recurrence_type === 'monthly' ? t.blockModal.everyMonth : t.blockModal.everyWeek}` : ''}</span>
                  <span className="t">{b.title}</span>
                  <span className="tm">{formatTime(b.start_hour, b.start_minute)}–{formatTime(end.hour, end.minute)}, {formatDuration(b.duration_minutes)}{b.is_recurring && <Icon name="repeat" />}</span>
                </button>
              );
            })}
            {dev.timed.map((g) => (
              <button key={g.event.id} type="button" className={`dcard ev--device${px(g.end - g.start) < 84 ? ' dcard--short' : ''}`} style={{ top: px(g.start), height: Math.max(px(g.end - g.start), 40), ['--c' as string]: g.event.color, ...overlapPosition(slots.get(`d:${g.event.id}`), half) }} onClick={(e) => { e.stopPropagation(); actions.onDeviceEvent(g.event); }}>
                <span className="eb"><Icon name="calendar" />{g.event.calendarName}</span>
                <span className="t">{g.event.title}</span>
                <span className="tm">{formatTime(g.event.start_hour, g.event.start_minute)}–{formatTime(g.event.end_hour, g.event.end_minute)}</span>
              </button>
            ))}
          </div>
        </HourGrid>
      </div>
    </div>
  );
}

