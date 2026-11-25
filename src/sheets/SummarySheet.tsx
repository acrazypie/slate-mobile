// Hours summary (design-notes §3, month view): two-cell HUD (this week /
// this month) and one row per category plus shifts. Unlike the web app it
// follows the period on screen, not always the current one.

import { useMemo, useState } from 'react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useData, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { capitalize, fill, formatDate } from '../i18n/format';
import { computePay, formatMoney } from '../lib/pay';
import { CATEGORIES, CATEGORY_COLORS, SHIFT_DEFAULT_COLOR, formatDuration } from '../lib/types';
import { dayContents, daysFrom, summarize, weekStart } from '../lib/days';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';

export function SummaryPanel({ anchor }: { anchor: Date }) {
  const { t, locale } = useI18n();
  const data = useData();
  const settings = useSettings();
  const [scope, setScope] = useState<'week' | 'month'>('week');
  const week = useMemo(() => summarize(dayContents(data, daysFrom(weekStart(anchor), 7))), [data, anchor]);
  const month = useMemo(() => {
    const start = startOfMonth(anchor);
    return summarize(dayContents(data, daysFrom(start, endOfMonth(anchor).getDate())));
  }, [data, anchor]);
  const s = scope === 'week' ? week : month;
  const max = Math.max(1, ...CATEGORIES.map((c) => s.byCategory[c]), s.shifts);
  const hours = (m: number) => Math.round((m / 60) * 10) / 10;
  const monthName = capitalize(formatDate(locale, anchor, 'monthYear').replace(String(anchor.getFullYear()), '').trim());
  const pay = useMemo(
    () => computePay(Object.entries(s.shiftsByWeek).map(([weekStart, minutes]) => ({ weekStart, minutes })), settings.pay),
    [s, settings.pay],
  );

  return (
    <section className="summary">
      <div className="summary__head">
        <span className="summary__switch">
          <button type="button" className={scope === 'week' ? 'on' : ''} onClick={() => setScope('week')}>{t.views.week}</button>
          {' / '}
          <button type="button" className={scope === 'month' ? 'on' : ''} onClick={() => setScope('month')}>{t.views.month}</button>
        </span>
      </div>
      <div className="hud">
        <div className="hud__c">
          <span className="label">{t.summary.thisWeek}</span>
          <div className="hud__v">{hours(week.total)}<small>h</small></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (week.total / Math.max(month.total, 1)) * 100 * 4)}%` }} /></div>
        </div>
        <div className="hud__c">
          <span className="label">{monthName}</span>
          <div className="hud__v acc">{hours(month.total)}<small>h</small></div>
          <div className="bar"><i style={{ width: month.total > 0 ? '100%' : '0%' }} /></div>
        </div>
      </div>
      {s.total === 0 ? (
        <p className="summary__empty small">{t.summary.empty}</p>
      ) : (
        <div className="srows">
          {CATEGORIES.map((c) => (
            <div key={c} className="srow" style={{ ['--c' as string]: CATEGORY_COLORS[c] }}>
              <span className="k" />
              <span className="n">{t.categories[c]}</span>
              <span className="b"><i style={{ width: `${(s.byCategory[c] / max) * 100}%` }} /></span>
              <span className="v">{s.byCategory[c] ? formatDuration(s.byCategory[c]) : '–'}</span>
            </div>
          ))}
          <div className="srow" style={{ ['--c' as string]: SHIFT_DEFAULT_COLOR }}>
            <span className="k s" />
            <span className="n">{t.common.shifts}</span>
            <span className="b"><i style={{ width: `${(s.shifts / max) * 100}%` }} /></span>
            <span className="v">{s.shifts ? formatDuration(s.shifts) : '–'}</span>
          </div>
        </div>
      )}
      {settings.pay.hourlyRate !== null && s.shifts > 0 && (
        <div className="hud">
          <div className="hud__c">
            <span className="label">{t.pay.earnings}</span>
            <div className="hud__v acc">{formatMoney(pay.amount ?? 0, settings.pay.currency, locale)}</div>
          </div>
          <div className="hud__c">
            <span className="label">{t.pay.overtime}</span>
            <div className="hud__v">{hours(pay.overtimeMinutes)}<small>h</small></div>
          </div>
        </div>
      )}
      {s.breaks > 0 && (
        <p className="note"><Icon name="info" />{fill(t.breaks.excluded, { minutes: s.breaks })}</p>
      )}
    </section>
  );
}

export function SummarySheet({ open, onClose, anchor }: { open: boolean; onClose: () => void; anchor: Date }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t.summary.title} compact>
      <div className="pad">
        <SummaryPanel anchor={anchor} />
      </div>
    </Sheet>
  );
}
