// What is on one day, as DESIGN.md rows: shifts, blocks and device events in
// time order. Used by the month view (under the grid) and the day sheet.

import { useI18n } from '../i18n/I18n';
import type { Dictionary } from '../i18n/dictionaries/it';
import { keyFromDate } from '../lib/recurrence';
import type { DeviceEvent } from '../lib/types';
import { blockEndTime, deviceEventsForDay, formatTime } from '../lib/types';
import type { DayContent } from '../lib/days';
import type { CalendarActions } from './CalendarScreen';
import { Icon } from '../ui/icons';

export type DayItemKind = 'shift' | 'block' | 'device';

export interface DayItem {
  k: string;
  kind: DayItemKind;
  /** Minutes from midnight; -1 for all-day events. */
  start: number;
  color: string;
  title: string;
  /** Compact time range for tight spaces ("14–18", "9:30–11"). */
  short: string;
  meta: string;
  open: () => void;
}

const compact = (h: number, m: number) => (m === 0 ? `${h}` : `${h}:${m.toString().padStart(2, '0')}`);

/**
 * Items of one day. Sorted by time when `byKind` is false; with `byKind`
 * shifts come first, then blocks, then device events (each by time): the
 * order the detailed month cell uses when it has to leave some out.
 */
export function dayItems(t: Dictionary, date: Date, day: DayContent | undefined, deviceEvents: DeviceEvent[], actions: CalendarActions, byKind = false): DayItem[] {
  const dev = deviceEventsForDay(deviceEvents, keyFromDate(date));
  const items: DayItem[] = [
    ...(day?.shifts ?? []).map((s): DayItem => {
      const sh = s.placed.shift;
      return {
        k: 's' + s.placed.id + (s.continued ? '+' : ''), kind: 'shift', start: s.start, color: sh.color, title: sh.title,
        short: `${compact(sh.start_hour, sh.start_minute)}–${compact(sh.end_hour, sh.end_minute)}`,
        meta: `${t.common.shift}, ${formatTime(sh.start_hour, sh.start_minute)}–${formatTime(sh.end_hour, sh.end_minute)}`,
        open: () => actions.onShift(s.placed),
      };
    }),
    ...(day?.blocks ?? []).map((b): DayItem => {
      const e = blockEndTime(b);
      return {
        k: 'b' + b.id, kind: 'block', start: b.start_hour * 60 + b.start_minute, color: b.color, title: b.title,
        short: `${compact(b.start_hour, b.start_minute)}–${compact(e.hour, e.minute)}`,
        meta: `${t.categories[b.category]}, ${formatTime(b.start_hour, b.start_minute)}–${formatTime(e.hour, e.minute)}`,
        open: () => actions.onBlock(b, date),
      };
    }),
    ...dev.allDay.map((e): DayItem => ({
      k: 'a' + e.id, kind: 'device', start: -1, color: e.color, title: e.title, short: '',
      meta: `${e.source === 'google' ? t.eventTags.google : t.eventTags.device} · ${e.calendarName}, ${t.calendar.allDay.toLowerCase()}`, open: () => actions.onDeviceEvent(e),
    })),
    ...dev.timed.map((g): DayItem => ({
      k: 'd' + g.event.id, kind: 'device', start: g.start, color: g.event.color, title: g.event.title,
      short: `${compact(g.event.start_hour, g.event.start_minute)}–${compact(g.event.end_hour, g.event.end_minute)}`,
      meta: `${g.event.source === 'google' ? t.eventTags.google : t.eventTags.device} · ${g.event.calendarName}, ${formatTime(g.event.start_hour, g.event.start_minute)}–${formatTime(g.event.end_hour, g.event.end_minute)}`,
      open: () => actions.onDeviceEvent(g.event),
    })),
  ];
  const rank: Record<DayItemKind, number> = { shift: 0, block: 1, device: 2 };
  return items.sort((a, b) => (byKind ? rank[a.kind] - rank[b.kind] : 0) || a.start - b.start);
}

const GLYPH: Record<DayItemKind, string> = { shift: '', block: 'glyph--ev--block', device: 'glyph--ev--device' };

export function DayList({ items }: { items: DayItem[] }) {
  const { t } = useI18n();
  if (items.length === 0) return <p className="lede">{t.calendar.emptyDay}</p>;
  return (
    <div className="rows">
      {items.map((it) => (
        <button key={it.k} type="button" className="row" onClick={it.open}>
          <span className={`glyph ${GLYPH[it.kind]}`} style={{ ['--c' as string]: it.color }} />
          <span className="row__main"><span className="row__name">{it.title}</span><span className="row__meta">{it.meta}</span></span>
          <Icon name="chevronRight" className="row__arrow" />
        </button>
      ))}
    </div>
  );
}
