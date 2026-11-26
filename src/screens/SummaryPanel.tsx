// The summary: the period from Settings › Summary (today's week, fortnight,
// month or year, or the custom dates), its hours and earnings, the reports the
// user added, and the buttons to add a report and export a PDF.

import { useMemo, useState } from 'react';
import { useData, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { formatDate } from '../i18n/format';
import { computePay, formatMoney } from '../lib/pay';
import { CATEGORIES, CATEGORY_COLORS, SHIFT_DEFAULT_COLOR, formatDuration } from '../lib/types';
import { dayContents, summarize } from '../lib/days';
import { periodDays, periodFor } from '../lib/summaryRange';
import { platform } from '../native/platform';
import { Icon } from '../ui/icons';
import { AddReportSheet, ReportCards } from './SummaryReports';
import { PdfExportSheet } from './PdfExportSheet';

/** PDF export writes a file with Capacitor Filesystem and shares it; the iOS build leaves that plugin out. */
export const PDF_EXPORT_AVAILABLE = platform !== 'ios';

/** Asks the app to switch tabs (App.tsx listens for it). */
export function goToTab(tab: 'calendar' | 'shifts' | 'summary' | 'settings') {
  window.dispatchEvent(new CustomEvent('slate:navigate', { detail: { tab } }));
}

export function SummaryPanel({ anchor }: { anchor: Date }) {
  const { t, locale } = useI18n();
  const data = useData();
  const settings = useSettings();
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const period = useMemo(() => periodFor(settings.summaryRange, anchor), [settings.summaryRange, anchor]);
  const s = useMemo(() => summarize(dayContents(data, periodDays(period))), [data, period]);
  const hours = (m: number) => Math.round((m / 60) * 10) / 10;
  const pay = useMemo(
    () => computePay(Object.entries(s.shiftsByWeek).map(([weekStart, minutes]) => ({ weekStart, minutes })), settings.pay),
    [s, settings.pay],
  );
  const label = `${formatDate(locale, period.start, 'dayMonth')} ${period.start.getFullYear()} – ${formatDate(locale, period.end, 'dayMonth')} ${period.end.getFullYear()}`;

  // The chip names the period kind the setting already has. Changing it stays in Settings › Summary.
  const chipLabel = {
    week: t.summary.thisWeek,
    month: t.summary.thisMonth,
    twoWeeks: t.settingsSummary.rangeTwoWeeks,
    year: t.settingsSummary.rangeYear,
    custom: t.settingsSummary.rangeCustom,
  }[settings.summaryRange.kind];

  // One stacked bar: the categories, then the shifts, each as its share of the total.
  const segments = [
    ...CATEGORIES.map((c) => ({ key: c, name: t.categories[c], color: CATEGORY_COLORS[c], minutes: s.byCategory[c] })),
    { key: 'shifts', name: t.common.shifts, color: SHIFT_DEFAULT_COLOR, minutes: s.shifts },
  ].filter((seg) => seg.minutes > 0);

  return (
    <section className="summary">
      <div className="summary__head">
        <span className="chip sel summary__chip">{chipLabel}</span>
        <span className="summary__range">{label}</span>
        <button type="button" className="summary__change" onClick={() => goToTab('settings')}>{t.summaryUi.change}</button>
      </div>

      <div className="hud">
        <div className="hud__c">
          <span className="label">{t.summaryUi.total}</span>
          <div className="hud__v">{hours(s.total)}<small>h</small></div>
        </div>
      </div>

      {s.total === 0 ? (
        <p className="summary__empty small">{t.summary.empty}</p>
      ) : (
        <div className="summary__bars">
          <div className="stackbar" role="img" aria-label={segments.map((seg) => `${seg.name} ${formatDuration(seg.minutes)}`).join(', ')}>
            {segments.map((seg) => (
              <i key={seg.key} style={{ ['--c' as string]: seg.color, flexGrow: seg.minutes }} />
            ))}
          </div>
          <ul className="stackbar__legend">
            {segments.map((seg) => (
              <li key={seg.key} style={{ ['--c' as string]: seg.color }}>
                <span className="k" />
                <span className="n">{seg.name}</span>
                <span className="v">{formatDuration(seg.minutes)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {settings.pay.hourlyRate !== null && s.shifts > 0 && (
        <div className="earn">
          <Icon name="globe" className="earn__ic" />
          <div className="earn__main">
            <span className="earn__name">{t.pay.earnings}</span>
            <span className="earn__hint">{t.summaryUi.earningsHint}</span>
          </div>
          <span className="earn__v">{formatMoney(pay.amount ?? 0, settings.pay.currency, locale)}</span>
        </div>
      )}

      <h2 className="summary__h">{t.summaryUi.reports}</h2>
      <ReportCards period={period} />

      <div className="summary__actions">
        <button type="button" className="btn btn--wide" onClick={() => setAdding(true)}>
          <Icon name="plus" /> {t.summaryUi.addReport}
        </button>
        {PDF_EXPORT_AVAILABLE ? (
          <button type="button" className="btn btn--ghost btn--wide" onClick={() => setExporting(true)}>
            <Icon name="upload" /> {t.summaryUi.exportPdf}
          </button>
        ) : (
          <p className="note"><Icon name="info" />{t.summaryUi.pdfAndroid}</p>
        )}
      </div>

      <AddReportSheet open={adding} onClose={() => setAdding(false)} />
      {exporting && <PdfExportSheet period={period} onClose={() => setExporting(false)} />}
    </section>
  );
}
