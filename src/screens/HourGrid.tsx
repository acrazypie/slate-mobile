// 24 hour rows with labels in a gutter, N day columns, the now line, and
// tap-to-create on empty space. Items are passed as children, one
// `.grid__items` per column (positioned by the --col variable).

import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18n';

export function HourGrid({ hourHeight, columns, todayIndex, onSlot, children, nowLabel }: {
  hourHeight: number;
  columns: number;
  todayIndex: number;
  onSlot: (column: number, hour: number) => void;
  children: ReactNode;
  nowLabel?: boolean;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * hourHeight;
  const hh = (h: number) => h.toString().padStart(2, '0');

  return (
    <div className="grid" style={{ height: 24 * hourHeight, ['--cols' as string]: columns, ['--hour' as string]: `${hourHeight}px` }}>
      <div className="grid__hours" aria-hidden="true">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="grid__h" style={{ top: h * hourHeight }}>
            {h > 0 && <span>{nowLabel ? `${hh(h)}:00` : hh(h)}</span>}
          </div>
        ))}
      </div>
      <div className="grid__cols">
        {Array.from({ length: columns }, (_, i) => (
          <div
            key={i}
            className={`grid__col${i === todayIndex ? ' today' : ''}`}
            role="button"
            tabIndex={-1}
            aria-label={t.calendar.add}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const hour = Math.min(23, Math.max(0, Math.floor((e.clientY - rect.top) / hourHeight)));
              onSlot(i, hour);
            }}
          />
        ))}
      </div>
      <div className="grid__layer">{children}</div>
      {todayIndex >= 0 && (
        <div className="now" style={{ top: nowTop }} aria-hidden="true">
          <div className="now__today" style={{ left: `calc(${todayIndex} * 100% / ${columns})`, width: `calc(100% / ${columns})` }} />
          {nowLabel && <span className="now__lbl">{`${hh(now.getHours())}:${hh(now.getMinutes())}`}</span>}
        </div>
      )}
    </div>
  );
}
