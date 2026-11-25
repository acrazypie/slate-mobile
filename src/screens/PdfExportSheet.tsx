// "Export PDF" on the summary, laid out like the share-and-print screen in the
// reference video: view, range, shifts, what to print, text in the cells, and a
// four-line header. Options are kept for this session only.

import { useState } from 'react';
import { useData } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { buildPdf, type PdfOptions, type PdfText, type PdfView } from '../export/pdf';
import { sharePdf } from '../export/share';
import { keyFromDate } from '../lib/recurrence';
import { formatDate } from '../i18n/format';
import type { Period } from '../lib/summaryRange';
import { Group, Row, Segmented, Switch, useToast } from '../ui/controls';
import { Sheet } from '../ui/Sheet';

type Flags = Pick<PdfOptions, 'events' | 'icon' | 'time' | 'title' | 'notes' | 'breakMinutes' | 'duration' | 'emptyRows' | 'logo' | 'headerDate'>;

const DEFAULT_FLAGS: Flags = {
  events: false,
  icon: true,
  time: true,
  title: true,
  notes: false,
  breakMinutes: false,
  duration: false,
  emptyRows: true,
  logo: true,
  headerDate: false,
};

export function PdfExportSheet({ period, onClose }: { period: Period; onClose: () => void }) {
  const { t, locale } = useI18n();
  const data = useData();
  const toast = useToast();
  const [view, setView] = useState<PdfView>('list');
  /** null = every shift. */
  const [shiftIds, setShiftIds] = useState<string[] | null>(null);
  const [flags, setFlags] = useState<Flags>(DEFAULT_FLAGS);
  const [text, setText] = useState<PdfText>('title');
  const [header, setHeader] = useState<string[]>(['', '', '', '']);
  const [busy, setBusy] = useState(false);

  const setFlag = (key: keyof Flags, value: boolean) => setFlags((f) => ({ ...f, [key]: value }));
  const included = (id: string) => shiftIds === null || shiftIds.includes(id);
  const toggleShift = (id: string, on: boolean) => {
    const all = data.shifts.map((s) => s.id);
    const current = shiftIds ?? all;
    const next = on ? [...new Set([...current, id])] : current.filter((x) => x !== id);
    setShiftIds(next.length === all.length && all.every((x) => next.includes(x)) ? null : next);
  };
  const rangeLabel = `${formatDate(locale, period.start, 'dayMonth')} ${period.start.getFullYear()} – ${formatDate(locale, period.end, 'dayMonth')} ${period.end.getFullYear()}`;

  const share = async () => {
    setBusy(true);
    try {
      const bytes = await buildPdf(data, period, {
        ...flags,
        view,
        shiftIds,
        text,
        header,
        footer: t.pdf.footer,
        labels: { headerDateLabel: t.pdf.headerDate },
        locale,
        now: new Date(),
      });
      await sharePdf(bytes, `slate-${keyFromDate(period.start)}-${keyFromDate(period.end)}.pdf`, t.pdf.title);
    } catch {
      toast(t.pdf.failed, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const toggles: { key: keyof Flags; label: string }[] = [
    { key: 'events', label: t.pdf.events },
    { key: 'icon', label: t.pdf.icon },
    { key: 'time', label: t.pdf.time },
    { key: 'title', label: t.pdf.titleOpt },
    { key: 'notes', label: t.pdf.notes },
    { key: 'breakMinutes', label: t.pdf.breakOpt },
    { key: 'duration', label: t.pdf.duration },
    { key: 'emptyRows', label: t.pdf.emptyRows },
    { key: 'logo', label: t.pdf.logo },
  ];

  return (
    <Sheet open onClose={onClose} title={t.pdf.title} onConfirm={share} confirmLabel={busy ? t.pdf.preparing : t.pdf.share} confirmDisabled={busy}>
      <Group label={t.pdf.view}>
        <Row icon="layout" name={t.pdf.view} stack>
          <Segmented<PdfView>
            label={t.pdf.view}
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: t.pdf.list },
              { value: 'month', label: t.pdf.month },
              { value: 'year', label: t.pdf.year },
            ]}
          />
        </Row>
      </Group>

      <Group label={t.pdf.range}>
        <Row icon="calendar" name={t.pdf.range} value={rangeLabel} />
      </Group>

      <Group label={t.pdf.shifts}>
        <Row icon="briefcase" name={t.pdf.all}>
          <Switch label={t.pdf.all} checked={shiftIds === null} onChange={(on) => on && setShiftIds(null)} />
        </Row>
        {data.shifts.map((s) => (
          <Row key={s.id} icon="clock" name={s.title}>
            <Switch label={s.title} checked={included(s.id)} onChange={(on) => toggleShift(s.id, on)} />
          </Row>
        ))}
      </Group>

      <Group>
        {toggles.map(({ key, label }) => (
          <Row key={key} name={label}>
            <Switch label={label} checked={flags[key] as boolean} onChange={(on) => setFlag(key, on)} />
          </Row>
        ))}
      </Group>

      <Group label={t.pdf.text}>
        <Row icon="layout" name={t.pdf.text} stack>
          <Segmented<PdfText>
            label={t.pdf.text}
            value={text}
            onChange={setText}
            options={[
              { value: 'title', label: t.pdf.textTitle },
              { value: 'start', label: t.pdf.textStart },
              { value: 'empty', label: t.pdf.textEmpty },
            ]}
          />
        </Row>
      </Group>

      <Group label={t.pdf.header}>
        {header.map((line, i) => (
          <Row key={i} name={t.pdf.headerLine.replace('{n}', String(i + 1))} stack>
            <input
              type="text"
              value={line}
              maxLength={80}
              aria-label={t.pdf.headerLine.replace('{n}', String(i + 1))}
              onChange={(e) => setHeader((h) => h.map((x, j) => (j === i ? e.target.value : x)))}
              style={{ width: '100%', boxSizing: 'border-box', background: 'none', border: 0, color: 'inherit', font: 'inherit', padding: '6px 0' }}
            />
          </Row>
        ))}
        <Row name={t.pdf.headerDate}>
          <Switch label={t.pdf.headerDate} checked={flags.headerDate} onChange={(on) => setFlag('headerDate', on)} />
        </Row>
      </Group>
    </Sheet>
  );
}
