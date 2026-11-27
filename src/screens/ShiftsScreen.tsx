import { useMemo, useState } from 'react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useData } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { capitalize, fill, formatDate } from '../i18n/format';
import { keyFromDate } from '../lib/recurrence';
import type { Rotation, Shift } from '../lib/types';
import { formatDuration, formatTime, isOvernightShift, paidShiftMinutes } from '../lib/types';
import { placedShifts } from '../data/repository';
import { ShiftSheet } from '../sheets/ShiftSheet';
import { RotationSheet } from '../sheets/RotationSheet';
import { Icon } from '../ui/icons';

export function ShiftsScreen() {
  const { t, locale } = useI18n();
  const data = useData();
  const [editing, setEditing] = useState<Shift | null | undefined>(undefined);
  const [editingRotation, setEditingRotation] = useState<Rotation | null | undefined>(undefined);
  const now = new Date();
  const month = useMemo(() => placedShifts(data, keyFromDate(startOfMonth(now)), keyFromDate(endOfMonth(now))), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthMinutes = month.reduce((m, p) => m + paidShiftMinutes(p.shift), 0);
  const monthName = formatDate(locale, now, 'monthYear').replace(String(now.getFullYear()), '').trim();
  const todayKey = keyFromDate(now);
  const nextDate = (id: string) => data.assignments.filter((a) => a.shift_id === id && a.shift_date >= todayKey).map((a) => a.shift_date).sort()[0];

  return (
    <div className="screen page">
      <div className="page__bar">
        <span className="page__bar-title">{t.shiftsView.title}</span>
        <button type="button" className="gbtn round accent ios-only" onClick={() => setEditing(null)} aria-label={t.create.newShift}>
          <Icon name="plus" />
        </button>
      </div>
      <header className="page__head">
        <h1 className="h-page">{t.shiftsView.titleBefore} <span className="acc">{t.shiftsView.titleAccent}</span></h1>
        <p className="lede">{t.shiftsView.intro}</p>
      </header>

      {data.shifts.length > 0 && (
        <div className="hud pad-x">
          <div className="hud__c">
            <span className="label">{fill(t.shiftsView.inMonth, { month: capitalize(monthName) })}</span>
            <div className="hud__v">{month.length}<small>{t.common.shifts.toLowerCase()}</small></div>
          </div>
          <div className="hud__c">
            <span className="label">{t.shiftsView.hours}</span>
            <div className="hud__v acc">{Math.round((monthMinutes / 60) * 10) / 10}<small>h</small></div>
          </div>
        </div>
      )}

      {data.shifts.length === 0 ? (
        <div className="pad-x page__empty">
          <p className="lede">{t.shiftsView.empty}</p>
          <button type="button" className="btn" onClick={() => setEditing(null)}><Icon name="plus" /> {t.shiftsView.createFirst}</button>
        </div>
      ) : (
        <>
        <h2 className="section-h ios-only">{t.common.shifts}</h2>
        <div className="rows shift-rows">
          {data.shifts.map((s) => {
            const next = nextDate(s.id);
            return (
              <button key={s.id} type="button" className="row" onClick={() => setEditing(s)}>
                <span className="glyph glyph--lg" style={{ ['--c' as string]: s.color }} />
                <span className="row__main">
                  <span className="row__name">{s.title}</span>
                  <span className="row__meta">
                    {formatTime(s.start_hour, s.start_minute)}–{formatTime(s.end_hour, s.end_minute)}
                    {isOvernightShift(s) && <span className="dim"> {t.shiftsView.nextDay}</span>}, {formatDuration(paidShiftMinutes(s))}
                    {s.break_minutes > 0 && <span className="dim"> · {fill(t.breaks.withBreak, { minutes: s.break_minutes })}</span>}
                  </span>
                </span>
                {next && <span className="row__end android-only">{formatDate(locale, new Date(`${next}T00:00:00`), 'dayMonth')}</span>}
                <Icon name="chevronRight" className="row__arrow" />
              </button>
            );
          })}
        </div>
        </>
      )}
      {data.shifts.length > 0 && <p className="note pad-x"><Icon name="info" />{t.shiftsView.howToPlace}</p>}

      {data.shifts.length > 0 && (
        <section className="rotations">
          <h2 className="section-h">{t.rotation.section}</h2>
          <p className="note pad-x">{t.rotation.intro}</p>
          <div className="rows">
            {data.rotations.map((r) => {
              const worked = r.pattern.filter((v) => v !== null).length;
              return (
                <button key={r.id} type="button" className="row" onClick={() => setEditingRotation(r)}>
                  <span className="row__main">
                    <span className="row__name">{r.title}</span>
                    <span className="row__meta">{fill(t.rotation.days, { n: r.pattern.length })} · {worked}/{r.pattern.length}</span>
                  </span>
                  <Icon name="chevronRight" className="row__arrow" />
                </button>
              );
            })}
            <button type="button" className="row row--add" onClick={() => setEditingRotation(null)}>
              <Icon name="plus" className="row__lead" />
              <span className="row__main"><span className="row__name">{t.rotation.add}</span></span>
            </button>
          </div>
          {data.rotations.length === 0 && <p className="lede pad-x">{t.rotation.empty}</p>}
        </section>
      )}

      <button type="button" className="fab android-only" onClick={() => setEditing(null)} aria-label={t.create.newShift}>
        <Icon name="plus" />
      </button>
      <ShiftSheet open={editing !== undefined} shift={editing ?? null} placed={null} placeOn={null} onClose={() => setEditing(undefined)} />
      <RotationSheet open={editingRotation !== undefined} rotation={editingRotation ?? null} onClose={() => setEditingRotation(undefined)} />
    </div>
  );
}
