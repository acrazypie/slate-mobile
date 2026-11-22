import { useCallback, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import type { CSSProperties } from 'react';
import type { DeviceEvent, OverlapSlot } from '../lib/types';
import { deviceEventsForDay, layoutOverlaps } from '../lib/types';
import { compactHours, type DayContent } from '../lib/days';
import { useI18n } from '../i18n/I18n';
import { formatDate } from '../i18n/format';
import type { CalendarActions } from './CalendarScreen';
import { AllDayChip, BlockCard, DeviceCard, MIN_CARD_MINUTES, ShiftCard } from './cards';
import { HourGrid } from './HourGrid';
import { EmptyWeek } from './EmptyWeek';

const HOUR = 48;

/**
 * Week columns are ~48px wide on a phone, too narrow to split. Shifts are
 * drawn full width as a background band; blocks and device events sit on top,
 * inset a few px on days with a shift so its dashed edge stays visible.
 * Overlapping items cascade: each later one is shifted right and drawn above,
 * so every card keeps at least ~55% of the column and the earlier card's
 * title stays readable above it (design-notes §3).
 */
function cascade(slot: OverlapSlot | undefined, inset: number): { pos: CSSProperties; stacked: boolean } {
  const left = (extra: string) => `calc(${extra}${inset + 1.5}px)`;
  if (!slot || slot.cols <= 1) return { pos: { left: left(''), right: '1.5px' }, stacked: false };
  const step = Math.min(35, 45 / (slot.cols - 1));
  return { pos: { left: left(`${slot.col * step}% + `), right: '1.5px', zIndex: 2 + slot.col }, stacked: slot.col > 0 };
}

export function WeekView({ contents, deviceEvents, today, actions, empty, onNewShift }: {
  contents: DayContent[];
  deviceEvents: DeviceEvent[];
  today: Date;
  actions: CalendarActions;
  empty: boolean;
  onNewShift: () => void;
}) {
  const { locale } = useI18n();
  const device = useMemo(() => contents.map((c) => deviceEventsForDay(deviceEvents, c.key)), [contents, deviceEvents]);
  const todayIndex = contents.findIndex((c) => isSameDay(c.date, today));
  const hasAllDay = device.some((d) => d.allDay.length > 0);

  const scrollToMorning = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollTop = Math.max(0, Math.min(new Date().getHours() - 1, 8)) * HOUR;
  }, []);

  return (
    <div className="week">
      <div className="days">
        <span />
        {contents.map((c, i) => {
          const we = i >= 5;
          return (
            <button key={c.key} type="button" className={`days__d${i === todayIndex ? ' today' : ''}${we ? ' we' : ''}`} onClick={() => actions.onOpenDay(c.date)} aria-label={formatDate(locale, c.date, 'fullDay')}>
              <span className="days__wd">{formatDate(locale, c.date, 'weekdayShort').replace('.', '')}</span>
              <span className="days__n">{c.date.getDate()}</span>
              <span className="days__hrs">{compactHours(c.minutes) || ' '}</span>
            </button>
          );
        })}
      </div>
      {hasAllDay && (
        <div className="allday">
          <span />
          {device.map((d, i) => (
            <div key={i} className="allday__cell">
              {d.allDay.slice(0, 2).map((e) => (
                <AllDayChip key={e.id} event={e} onClick={() => actions.onDeviceEvent(e)} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="week__scroll" ref={scrollToMorning}>
        <HourGrid hourHeight={HOUR} columns={7} todayIndex={todayIndex} onSlot={(col, hour) => actions.onSlot(contents[col].date, hour)}>
          {contents.map((c, i) => {
            const dev = device[i].timed;
            const inset = c.shifts.length > 0 ? 5 : 0;
            const slots = layoutOverlaps([
              ...c.blocks.map((b) => {
                const s = b.start_hour * 60 + b.start_minute;
                return { key: `b:${b.id}`, start: s, end: s + Math.max(b.duration_minutes, MIN_CARD_MINUTES) };
              }),
              ...dev.map((g) => ({ key: `d:${g.event.id}`, start: g.start, end: Math.max(g.end, g.start + MIN_CARD_MINUTES) })),
            ]);
            const px = (m: number) => (m / 60) * HOUR;
            return (
              <div key={c.key} className="grid__items" style={{ ['--col' as string]: i }}>
                {c.shifts.map((s) => (
                  <ShiftCard key={`${s.placed.id}${s.continued ? '+' : ''}`} seg={s} p={{ top: px(s.start), height: Math.max(px(s.end - s.start), 18), pos: { left: '1.5px', right: '1.5px', zIndex: 1 } }} onClick={() => actions.onShift(s.placed)} />
                ))}
                {c.blocks.map((b) => {
                  const s = b.start_hour * 60 + b.start_minute;
                  return <BlockCard key={b.id} block={b} p={{ top: px(s), height: Math.max(px(Math.min(b.duration_minutes, 1440 - s)), 18), ...cascade(slots.get(`b:${b.id}`), inset) }} onClick={() => actions.onBlock(b, c.date)} />;
                })}
                {dev.map((g) => (
                  <DeviceCard key={g.event.id} event={g.event} p={{ top: px(g.start), height: Math.max(px(g.end - g.start), 18), ...cascade(slots.get(`d:${g.event.id}`), inset) }} onClick={() => actions.onDeviceEvent(g.event)} />
                ))}
              </div>
            );
          })}
        </HourGrid>
      </div>
      {empty && <EmptyWeek onNewEvent={() => actions.onSlot(todayIndex >= 0 ? today : contents[0].date, 9)} onNewShift={onNewShift} weekTag={null} />}
    </div>
  );
}
