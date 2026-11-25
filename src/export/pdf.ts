// Builds the summary's PDF: a list of days, a month grid per month, or a
// year overview. Pure apart from jsPDF; the options come from the export sheet.
// Built-in PDF fonts cover Latin text only, so Japanese titles may not print.

import type { SlateData } from '../data/schema';
import { dayContents, type DayContent } from '../lib/days';
import { formatDuration, formatTime, shiftDurationMinutes } from '../lib/types';
import { periodDays, type Period } from '../lib/summaryRange';
import { keyFromDate } from '../lib/recurrence';
import type { Locale } from '../i18n/config';
import { INTL_TAGS } from '../i18n/config';

export type PdfView = 'list' | 'month' | 'year';
export type PdfText = 'title' | 'start' | 'empty';

export interface PdfOptions {
  view: PdfView;
  /** Shift ids to include; null = all shifts. */
  shiftIds: string[] | null;
  events: boolean;
  icon: boolean;
  time: boolean;
  title: boolean;
  notes: boolean;
  breakMinutes: boolean;
  duration: boolean;
  emptyRows: boolean;
  logo: boolean;
  text: PdfText;
  /** Four header lines (empty ones are skipped). */
  header: string[];
  headerDate: boolean;
  /** Text printed at the bottom when `logo` is on. */
  footer: string;
  /** Localised labels: "Total", "Break", and so on, passed in so the builder stays language-free. */
  labels: { headerDateLabel: string };
  locale: Locale;
  now: Date;
}

/** Colour as [r, g, b] from '#rrggbb'. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Item {
  kind: 'shift' | 'event';
  title: string;
  color: string;
  start: number;
  end: number;
  notes?: string;
  breakMinutes: number;
}

/** What each day shows, after the options. Overnight tails and filtered shifts are dropped. */
function itemsByDay(days: DayContent[], options: PdfOptions): Map<string, Item[]> {
  const out = new Map<string, Item[]>();
  for (const day of days) {
    const items: Item[] = [];
    if (options.events) {
      for (const b of day.blocks) {
        const start = b.start_hour * 60 + b.start_minute;
        items.push({ kind: 'event', title: b.title, color: b.color, start, end: start + b.duration_minutes, notes: b.notes ?? undefined, breakMinutes: 0 });
      }
    }
    for (const seg of day.shifts) {
      if (seg.continued) continue;
      const shift = seg.placed.shift;
      if (options.shiftIds && !options.shiftIds.includes(shift.id)) continue;
      items.push({
        kind: 'shift',
        title: shift.title,
        color: shift.color,
        start: shift.start_hour * 60 + shift.start_minute,
        end: shift.start_hour * 60 + shift.start_minute + shiftDurationMinutes(shift),
        breakMinutes: shift.break_minutes,
      });
    }
    items.sort((a, b) => a.start - b.start);
    out.set(day.key, items);
  }
  return out;
}

function itemLine(item: Item, options: PdfOptions): string {
  const parts: string[] = [];
  if (options.time) parts.push(`${formatTime(Math.floor(item.start / 60) % 24, item.start % 60)}–${formatTime(Math.floor(item.end / 60) % 24, item.end % 60)}`);
  if (options.title) parts.push(item.title);
  if (options.duration) parts.push(formatDuration(item.end - item.start));
  if (options.breakMinutes && item.breakMinutes > 0) parts.push(`(-${item.breakMinutes} min)`);
  return parts.join('  ');
}

/** Builds the PDF and returns its bytes. */
export async function buildPdf(data: SlateData, period: Period, options: PdfOptions): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const days = dayContents(data, periodDays(period));
  const items = itemsByDay(days, options);
  const tag = INTL_TAGS[options.locale];
  const dayName = (d: Date) => d.toLocaleDateString(tag, { weekday: 'short', day: 'numeric', month: 'short' });
  const landscape = options.view !== 'list';
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const W = landscape ? 297 : 210;
  const H = landscape ? 210 : 297;
  const M = 12;

  let y = M;
  const footer = () => {
    if (!options.logo) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(options.footer, W - M, H - 6, { align: 'right' });
    doc.setTextColor(0);
  };

  const header = () => {
    y = M;
    const lines = options.header.filter((l) => l.trim() !== '');
    lines.forEach((line, i) => {
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      doc.setFontSize(i === 0 ? 15 : 10);
      doc.text(line, M, y + 5);
      y += i === 0 ? 8 : 5;
    });
    if (options.headerDate) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(`${options.labels.headerDateLabel}: ${options.now.toLocaleDateString(tag)}`, M, y + 4);
      doc.setTextColor(0);
      y += 7;
    }
    y += 3;
  };

  const newPage = (orientation?: 'portrait' | 'landscape') => {
    footer();
    doc.addPage('a4', orientation ?? (landscape ? 'landscape' : 'portrait'));
    header();
  };

  if (options.view === 'list') {
    header();
    for (const day of days) {
      const dayItems = items.get(day.key) ?? [];
      if (dayItems.length === 0 && !options.emptyRows) continue;
      const rowHeight = Math.max(1, dayItems.length) * 6 + 4 + (dayItems.some((i) => i.notes) && options.notes ? 4 : 0);
      if (y + rowHeight > H - 14) newPage('portrait');
      doc.setDrawColor(210);
      doc.line(M, y, W - M, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(dayName(day.date), M, y + 5);
      if (dayItems.length === 0) {
        y += 8;
        continue;
      }
      dayItems.forEach((item, i) => {
        const [r, g, b] = rgb(item.color);
        const row = y + 4 + i * 6;
        if (options.icon) {
          doc.setFillColor(r, g, b);
          doc.rect(M + 40, row - 2.5, 2.5, 2.5, 'F');
        }
        doc.setFont('helvetica', item.kind === 'shift' ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.text(itemLine(item, options), M + 45, row);
      });
      y += 4 + dayItems.length * 6;
      if (options.notes) {
        const note = dayItems.find((i) => i.notes)?.notes;
        if (note) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(90);
          doc.text(note.slice(0, 140), M + 45, y);
          doc.setTextColor(0);
          y += 4;
        }
      }
      y += 3;
    }
    footer();
    return new Uint8Array(doc.output('arraybuffer'));
  }

  // Month and year grids. Each month: 7 columns (Monday first), up to 6 rows.
  const months: { year: number; month: number }[] = [];
  for (const day of days) {
    const m = { year: day.date.getFullYear(), month: day.date.getMonth() };
    if (!months.some((x) => x.year === m.year && x.month === m.month)) months.push(m);
  }

  const cellText = (item: Item): string => {
    if (options.text === 'empty') return '';
    if (options.text === 'start') return formatTime(Math.floor(item.start / 60) % 24, item.start % 60);
    return item.title;
  };

  if (options.view === 'month') {
    header();
    // One month per page: the first uses the page the header is on.
    months.forEach(({ year, month }, index) => {
      if (index > 0) newPage('landscape');
      const first = new Date(year, month, 1);
      const offset = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cols = 7;
      const rows = Math.ceil((offset + daysInMonth) / cols);
      const cw = (W - 2 * M) / cols;
      const ch = Math.min(28, (H - y - 22) / rows);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(first.toLocaleDateString(tag, { month: 'long', year: 'numeric' }), M, y + 4);
      y += 8;
      for (let d = 1; d <= daysInMonth; d++) {
        const idx = offset + d - 1;
        const x = M + (idx % cols) * cw;
        const top = y + Math.floor(idx / cols) * ch;
        doc.setDrawColor(200);
        doc.rect(x, top, cw, ch);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text(String(d), x + 1.5, top + 3.5);
        const key = keyFromDate(new Date(year, month, d));
        const dayItems = items.get(key) ?? [];
        dayItems.slice(0, Math.max(0, Math.floor((ch - 6) / 3.6))).forEach((item, i) => {
          const yy = top + 6.5 + i * 3.6;
          if (options.icon) {
            const [r, g, b] = rgb(item.color);
            doc.setFillColor(r, g, b);
            doc.rect(x + 1.2, yy - 2, 1.6, 1.6, 'F');
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          const txt = cellText(item);
          if (txt) doc.text(txt.slice(0, 22), x + (options.icon ? 3.6 : 1.5), yy);
        });
      }
      y += rows * ch + 8;
    });
    footer();
    return new Uint8Array(doc.output('arraybuffer'));
  }

  // Year: the twelve months of the period's year, four across and three down.
  header();
  const year = period.start.getFullYear();
  const colsY = 4;
  const cellW = (W - 2 * M) / colsY;
  const cellH = (H - y - 14) / 3;
  for (let month = 0; month < 12; month++) {
    const ox = M + (month % colsY) * cellW;
    const oy = y + Math.floor(month / colsY) * cellH;
    const first = new Date(year, month, 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0);
    doc.text(first.toLocaleDateString(tag, { month: 'short' }), ox + 1, oy + 3);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cw = (cellW - 3) / 7;
    const rh = (cellH - 6) / 6;
    for (let d = 1; d <= daysInMonth; d++) {
      const idx = offset + d - 1;
      const x = ox + 1 + (idx % 7) * cw;
      const top = oy + 5 + Math.floor(idx / 7) * rh;
      const key = keyFromDate(new Date(year, month, d));
      const dayItems = items.get(key) ?? [];
      if (dayItems.length > 0 && options.icon) {
        const [r, g, b] = rgb(dayItems[0].color);
        doc.setFillColor(r, g, b);
      } else {
        doc.setFillColor(238, 238, 238);
      }
      doc.rect(x, top, cw - 0.4, rh - 0.4, 'F');
    }
  }
  footer();
  return new Uint8Array(doc.output('arraybuffer'));
}
