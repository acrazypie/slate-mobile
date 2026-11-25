// The reports on the summary: the list of reports the user added (each worked
// out for the period on screen), and the sheet that adds one.

import { useData, repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { formatMoney } from '../lib/pay';
import { reportFor, REPORT_KINDS, type ReportKind, type ReportResult } from '../lib/reports';
import type { Report } from '../lib/reportTypes';
import { formatDuration } from '../lib/types';
import type { Period } from '../lib/summaryRange';
import { haptics } from '../native/platform';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/icons';
import type { Dictionary } from '../i18n/dictionaries';

function kindName(t: Dictionary, kind: ReportKind): string {
  return { hours: t.summaryUi.reportHours, counts: t.summaryUi.reportCounts, overtime: t.summaryUi.reportOvertime, pay: t.summaryUi.reportPay }[kind];
}

function kindHint(t: Dictionary, kind: ReportKind): string {
  return {
    hours: t.summaryUi.reportHoursHint,
    counts: t.summaryUi.reportCountsHint,
    overtime: t.summaryUi.reportOvertimeHint,
    pay: t.summaryUi.reportPayHint,
  }[kind];
}

/** The sheet opened by "Add report": one row per kind. */
export function AddReportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <Sheet open onClose={onClose} title={t.summaryUi.pickReport} compact>
      <div className="rows pad-x">
        {REPORT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="row"
            onClick={async () => {
              await repo.addReport(kind);
              haptics.success();
              onClose();
            }}
          >
            <span className="row__main">
              <span className="row__name">{kindName(t, kind)}</span>
              <span className="row__meta">{kindHint(t, kind)}</span>
            </span>
            <Icon name="chevronRight" className="row__arrow" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** One line of the report: label, value, and the bar showing its share. */
function Line({ label, value, color, bar }: { label: string; value: string; color?: string; bar?: number }) {
  return (
    <div className="srow" style={{ ['--c' as string]: color ?? 'var(--mid)' }}>
      <span className="k" />
      <span className="n">{label}</span>
      <span className="b">{bar !== undefined && <i style={{ width: `${Math.min(100, bar * 100)}%` }} />}</span>
      <span className="v">{value}</span>
    </div>
  );
}

function ReportBody({ result }: { result: ReportResult }) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  switch (result.kind) {
    case 'hours':
    case 'counts': {
      const max = Math.max(1, ...result.lines.map((l) => l.value));
      // Hours are durations; counts are plain numbers of days (the card title says which).
      const fmt = (v: number) => (result.kind === 'hours' ? formatDuration(v) : String(v));
      const total = result.kind === 'hours' ? result.totalMinutes : result.totalDays;
      if (result.lines.length === 0) return <p className="summary__empty small">{t.summary.empty}</p>;
      return (
        <div className="srows">
          {result.lines.map((l) => (
            <Line key={l.shiftId} label={l.title} value={fmt(l.value)} color={l.color} bar={l.value / max} />
          ))}
          <Line label={t.summaryUi.total} value={fmt(total)} />
        </div>
      );
    }
    case 'overtime':
      return (
        <div className="srows">
          <Line label={t.summaryUi.regular} value={formatDuration(result.regularMinutes)} />
          <Line label={t.summaryUi.overtimeLabel} value={formatDuration(result.overtimeMinutes)} />
          {result.overtimeAmount !== null && (
            <Line label={t.pay.earnings} value={formatMoney(result.overtimeAmount, settings.pay.currency, locale)} />
          )}
        </div>
      );
    case 'pay':
      if (result.amount === null) return <p className="note"><Icon name="info" />{t.summaryUi.noRate}</p>;
      return (
        <div className="srows">
          <Line label={t.pay.earnings} value={formatMoney(result.amount, settings.pay.currency, locale)} />
          <Line label={t.summaryUi.regular} value={formatDuration(result.regularMinutes)} />
          <Line label={t.summaryUi.overtimeLabel} value={formatDuration(result.overtimeMinutes)} />
        </div>
      );
  }
}

/** All the reports the user added, in the order they were added. */
export function ReportCards({ period }: { period: Period }) {
  const { t } = useI18n();
  const data = useData();
  if (data.reports.length === 0) return <p className="note">{t.summaryUi.noReports}</p>;
  return (
    <div className="reports">
      {data.reports.map((report: Report) => (
        <section key={report.id} className="report">
          <header className="report__head">
            <span className="label">{kindName(t, report.kind)}</span>
            <button type="button" className="gbtn" aria-label={t.summaryUi.removeReport} onClick={() => void repo.removeReport(report.id)}>
              <Icon name="trash" />
            </button>
          </header>
          <ReportBody result={reportFor(report.kind, data, period)} />
        </section>
      ))}
    </div>
  );
}
