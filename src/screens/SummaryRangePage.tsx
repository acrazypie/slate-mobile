// Settings › Summary: which days the summary covers. The choices change what
// the Summary tab and its PDF show.

import { useSettings, repo } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { weekdayNames } from '../i18n/format';
import { dateFromKey, keyFromDate } from '../lib/recurrence';
import { type SummaryRange } from '../lib/summaryRange';
import { Group, Row } from '../ui/controls';

export function SummaryRangePage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const range = settings.summaryRange;
  const set = (patch: Partial<SummaryRange>) => void repo.updateSettings({ summaryRange: { ...range, ...patch } });
  const todayKey = keyFromDate(new Date());

  // Two choices (design 19): the period that contains today (a week or a month, the
  // same setting as the Summary chips), or custom dates.
  const inPeriod = range.kind === 'week' || range.kind === 'month';
  const choose = (choice: 'period' | 'custom') => {
    if (choice === 'custom') {
      set({ kind: 'custom', customStart: range.customStart ?? todayKey, customEnd: range.customEnd ?? range.customStart ?? todayKey });
    } else {
      set({ kind: inPeriod ? range.kind : 'month' });
    }
  };
  const kindOptions: { value: 'period' | 'custom'; label: string; on: boolean }[] = [
    { value: 'period', label: t.settingsSummary.rangePeriod, on: inPeriod },
    { value: 'custom', label: t.settingsSummary.rangeCustom, on: range.kind === 'custom' },
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekdays = weekdayNames(locale);

  return (
    <>
      <Group footer={t.settingsSummary.lede}>
        {kindOptions.map((o) => (
          <Row key={o.value} name={o.label} onClick={() => choose(o.value)}>
            <span className={`radio${o.on ? ' on' : ''}`} aria-hidden="true" />
          </Row>
        ))}
      </Group>

      {inPeriod && (
        <Group>
          <Row icon="calendar" name={t.settingsSummary.periodKind}>
            <select className="row-select" value={range.kind} onChange={(e) => set({ kind: e.target.value === 'week' ? 'week' : 'month' })} aria-label={t.settingsSummary.periodKind}>
              <option value="week">{t.summary.thisWeek}</option>
              <option value="month">{t.summary.thisMonth}</option>
            </select>
          </Row>
        </Group>
      )}

      {range.kind === 'week' && (
        <Group>
          <Row icon="calendar" name={t.settingsSummary.startsOn}>
            <select className="row-select" value={range.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} aria-label={t.settingsSummary.startsOn}>
              {weekdays.map((n, i) => (
                <option key={i} value={i}>{n}</option>
              ))}
            </select>
          </Row>
        </Group>
      )}


      {range.kind === 'month' && (
        <Group>
          <Row icon="calendar" name={t.settingsSummary.startDay}>
            <select className="row-select" value={range.monthDay} onChange={(e) => set({ monthDay: Number(e.target.value) })} aria-label={t.settingsSummary.startDay}>
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Row>
        </Group>
      )}


      {range.kind === 'custom' && (
        <Group footer={t.settingsSummary.customHint}>
          <Row icon="calendar" name={t.settingsSummary.from}>
            <input
              type="date"
              className="row-select"
              value={range.customStart ?? todayKey}
              onChange={(e) => e.target.value && set({ customStart: e.target.value, customEnd: range.customEnd && dateFromKey(range.customEnd) < dateFromKey(e.target.value) ? e.target.value : range.customEnd })}
              aria-label={t.settingsSummary.from}
            />
          </Row>
          <Row icon="calendar" name={t.settingsSummary.to}>
            <input
              type="date"
              className="row-select"
              value={range.customEnd ?? range.customStart ?? todayKey}
              min={range.customStart ?? undefined}
              onChange={(e) => e.target.value && set({ customEnd: e.target.value })}
              aria-label={t.settingsSummary.to}
            />
          </Row>
        </Group>
      )}
    </>
  );
}
