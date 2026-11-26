// Settings › Summary: which days the summary covers. The choices change what
// the Summary tab and its PDF show.

import { useSettings, repo } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { formatDate, weekdayNames } from '../i18n/format';
import { dateFromKey, keyFromDate } from '../lib/recurrence';
import { type RangeKind, type SummaryRange } from '../lib/summaryRange';
import { Group, Row } from '../ui/controls';

export function SummaryRangePage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const range = settings.summaryRange;
  const set = (patch: Partial<SummaryRange>) => void repo.updateSettings({ summaryRange: { ...range, ...patch } });
  const todayKey = keyFromDate(new Date());

  const setKind = (kind: RangeKind) => {
    if (kind === 'custom' && !range.customStart) {
      set({ kind, customStart: todayKey, customEnd: todayKey });
    } else {
      set({ kind });
    }
  };
  const kindOptions: { value: RangeKind; label: string }[] = [
    { value: 'week', label: t.settingsSummary.rangeWeek },
    { value: 'twoWeeks', label: t.settingsSummary.rangeTwoWeeks },
    { value: 'month', label: t.settingsSummary.rangeMonth },
    { value: 'year', label: t.settingsSummary.rangeYear },
    { value: 'custom', label: t.settingsSummary.rangeCustom },
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthName = (m: number) => formatDate(locale, new Date(2026, m - 1, 1), 'monthShort');
  const weekdays = weekdayNames(locale);

  return (
    <>
      <Group footer={t.settingsSummary.lede}>
        {kindOptions.map((o) => (
          <Row key={o.value} name={o.label} onClick={() => setKind(o.value)}>
            <span className={`radio${range.kind === o.value ? " on" : ""}`} aria-hidden="true" />
          </Row>
        ))}
      </Group>

      {(range.kind === 'week' || range.kind === 'twoWeeks') && (
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

      {range.kind === 'twoWeeks' && (
        <Group>
          <Row icon="calendar" name={t.settingsSummary.fortnightWeek}>
            <select className="row-select" value={range.fortnightWeek} onChange={(e) => set({ fortnightWeek: Number(e.target.value) === 2 ? 2 : 1 })} aria-label={t.settingsSummary.fortnightWeek}>
              <option value={1}>{t.settingsSummary.weekOne}</option>
              <option value={2}>{t.settingsSummary.weekTwo}</option>
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

      {range.kind === 'year' && (
        <Group>
          <Row icon="calendar" name={t.settingsSummary.startMonth}>
            <select className="row-select" value={range.yearMonth} onChange={(e) => set({ yearMonth: Number(e.target.value) })} aria-label={t.settingsSummary.startMonth}>
              {months.map((m) => (
                <option key={m} value={m}>{monthName(m)}</option>
              ))}
            </select>
          </Row>
          <Row icon="calendar" name={t.settingsSummary.startDay}>
            <select className="row-select" value={range.yearDay} onChange={(e) => set({ yearDay: Number(e.target.value) })} aria-label={t.settingsSummary.startDay}>
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
