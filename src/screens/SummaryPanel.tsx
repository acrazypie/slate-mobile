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
  const max = Math.max(1, ...CATEGORIES.map((c) => s.byCategory[c]), s.shifts);
  const hours = (m: number) => Math.round((m / 60) * 10) / 10;
  const pay = useMemo(
    () => computePay(Object.entries(s.shiftsByWeek).map(([weekStart, minutes]) => ({ weekStart, minutes })), settings.pay),
    [s, settings.pay],
  );
  const label = `${formatDate(locale, period.start, 'dayMonth')} ${period.start.getFullYear()} – ${formatDate(locale, period.end, 'dayMonth')} ${period.end.getFullYear()}`;

  return (
    <section className="summary">
      <div className="summary__head">
        <span className="summary__range">{label}</span>
        <button type="button" className="summary__change" onClick={() => goToTab('settings')}>{t.summaryUi.change}</button>
      </div>

      <div className="hud">
        <div className="hud__c">
          <span className="label">{t.summaryUi.total}</span>
          <div className="hud__v">{hours(s.total)}<small>h</small></div>
        </div>
        {settings.pay.hourlyRate !== null && s.shifts > 0 && (
          <div className="hud__c">
            <span className="label">{t.pay.earnings}</span>
            <div className="hud__v acc">{formatMoney(pay.amount ?? 0, settings.pay.currency, locale)}</div>
          </div>
        )}
      </div>

      {s.total === 0 ? (
        <p className="summary__empty small">{t.summary.empty}</p>
      ) : (
        <>
          {/* iOS: one stacked bar with its labels under it (design/ios/dark/16-summary.png). The list below is hidden there. */}
          <div className="sumbar ios-only">
            <div className="sumbar__bar">
              {CATEGORIES.map((c) => (
                <i key={c} style={{ flexGrow: s.byCategory[c], background: CATEGORY_COLORS[c] }} />
              ))}
              <i style={{ flexGrow: s.shifts, background: SHIFT_DEFAULT_COLOR }} />
            </div>
            <div className="sumbar__labels">
              {CATEGORIES.filter((c) => s.byCategory[c] > 0).map((c) => (
                <span key={c}>{t.categories[c]} {formatDuration(s.byCategory[c])}</span>
              ))}
              {s.shifts > 0 && <span>{t.common.shifts} {formatDuration(s.shifts)}</span>}
            </div>
          </div>
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
        </>
      )}

      <h2 className="section-h ios-only">{t.summaryUi.reports}</h2>
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
