// The three kinds of item on the grids (design-notes §3): Slate blocks
// (filled + left bar), shifts (dashed outline) and device events (hatched).

import type { CSSProperties } from 'react';
import type { Block, DeviceEvent, OverlapSlot } from '../lib/types';
import { blockEndTime, formatCompactRange, formatTime, overlapPosition } from '../lib/types';
import type { ShiftSegment } from '../lib/days';

export const MIN_CARD_MINUTES = 30;

interface Placement {
  top: number;
  height: number;
  slot?: OverlapSlot;
  half?: boolean;
  shiftSide?: boolean;
  /** Explicit horizontal position; wins over slot/half (used by the week view's cascade). */
  pos?: CSSProperties;
  stacked?: boolean;
}

function style(p: Placement, color: string): CSSProperties {
  const pos = p.pos ?? (p.shiftSide ? (p.half ? { left: '2px', right: 'calc(50% + 1px)' } : undefined) : overlapPosition(p.slot, p.half));
  return { top: p.top, height: p.height, ['--c' as string]: color, ...pos };
}

const cls = (base: string, p: Placement) => `${base}${p.stacked ? ' ev--stacked' : ''}`;

export function BlockCard({ block, p, onClick, big }: { block: Block; p: Placement; onClick: () => void; big?: boolean }) {
  const end = blockEndTime(block);
  return (
    <button type="button" className={cls(`ev ev--block${big ? ' ev--big' : ''}`, p)} style={style(p, block.color)} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <b>{block.title}</b>
      {p.height > 52 && <small>{formatCompactRange(block.start_hour, block.start_minute, end.hour, end.minute).replace(/(\d+)(?=–|$)/g, (m) => m.padStart(2, '0'))}</small>}
    </button>
  );
}

export function ShiftCard({ seg, p, onClick }: { seg: ShiftSegment; p: Placement; onClick: () => void }) {
  const s = seg.placed.shift;
  return (
    <button type="button" className={cls('ev ev--shift', p)} style={style({ ...p, shiftSide: true }, s.color)} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <b>{s.title}</b>
      {p.height > 52 && <small>{formatTime(s.start_hour, s.start_minute).replace(':00', '')}–{formatTime(s.end_hour, s.end_minute).replace(':00', '')}</small>}
    </button>
  );
}

export function DeviceCard({ event, p, onClick }: { event: DeviceEvent; p: Placement; onClick: () => void }) {
  return (
    <button type="button" className={cls('ev ev--device', p)} style={style(p, event.color)} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <span className="ev__patch">
        <b>{event.title}</b>
        {p.height > 52 && <small>{formatCompactRange(event.start_hour, event.start_minute, event.end_hour, event.end_minute)}</small>}
      </span>
    </button>
  );
}

export function AllDayChip({ event, onClick }: { event: DeviceEvent; onClick: () => void }) {
  return (
    <button type="button" className="adchip" style={{ ['--c' as string]: event.color }} onClick={onClick}>
      {event.title}
    </button>
  );
}
