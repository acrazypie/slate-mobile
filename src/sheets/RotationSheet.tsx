// Create / edit a rotation: a repeating cycle of shifts (or days off), and
// placing that cycle on the calendar from a chosen day. Placing never removes
// shifts that are already there; days that already hold the same shift are
// skipped.

import { useEffect, useState } from 'react';
import { repo, useData } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { fill } from '../i18n/format';
import { dateFromKey, keyFromDate } from '../lib/recurrence';
import type { Rotation } from '../lib/types';
import { formatCompactRange, ROTATION_MAX_DAYS, ROTATION_MIN_DAYS } from '../lib/types';
import { haptics } from '../native/platform';
import { Dialog, Sheet } from '../ui/Sheet';
import { useToast } from '../ui/controls';
import { Icon } from '../ui/icons';

const LENGTHS = [2, 3, 4, 5, 6, 7, 10, 14, 21, 28].filter((n) => n >= ROTATION_MIN_DAYS && n <= ROTATION_MAX_DAYS);
const WEEKS = [1, 2, 4, 8, 12, 26];

export function RotationSheet({ open, rotation, onClose }: { open: boolean; rotation: Rotation | null; onClose: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [pattern, setPattern] = useState<(string | null)[]>([null, null, null, null]);
  const [from, setFrom] = useState(keyFromDate(new Date()));
  const [weeks, setWeeks] = useState(1);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirm(false);
    setTitle(rotation?.title ?? '');
    setPattern(rotation ? [...rotation.pattern] : [null, null, null, null]);
    setFrom(keyFromDate(new Date()));
    setWeeks(1);
  }, [open, rotation]);

  if (!open) return null;

  const changeLength = (n: number) => setPattern((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? null));
  const setDay = (i: number, shiftId: string | null) => setPattern((prev) => prev.map((v, j) => (j === i ? shiftId : v)));

  const save = async () => {
    if (!title.trim()) {
      setError(t.blockModal.titleRequired);
      haptics.warning();
      return;
    }
    if (pattern.every((v) => v === null)) {
      setError(t.rotation.needShift);
      haptics.warning();
      return;
    }
    if (rotation) await repo.updateRotation(rotation.id, { title, pattern });
    else await repo.createRotation({ title, pattern });
    haptics.success();
    onClose();
  };

  const place = async () => {
    if (!rotation) return;
    const placed = await repo.applyRotation(rotation.id, from, weeks * 7);
    if (placed > 0) {
      haptics.success();
      toast(fill(t.rotation.applied, { count: placed }));
    } else {
      haptics.warning();
      toast(t.rotation.appliedNone, 'warn');
    }
  };

  const shiftLabel = (id: string) => {
    const s = data.shifts.find((x) => x.id === id);
    return s ? `${s.title} · ${formatCompactRange(s.start_hour, s.start_minute, s.end_hour, s.end_minute)}` : '';
  };

  return (
    <Sheet open onClose={onClose} title={rotation ? t.rotation.editTitle : t.rotation.newTitle} onConfirm={save}>
      <label className="fld fld--title">
        <span className="fld__l">{t.rotation.name}</span>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder={t.rotation.namePlaceholder} maxLength={100} autoFocus={!rotation} />
      </label>
      {error && <p className="fld__err">{error}</p>}
      <p className="note pad-x"><Icon name="info" />{t.rotation.intro}</p>

      <div className="form-grp">
        <label className="fld">
          <span className="fld__l">{t.rotation.cycle}</span>
          <select className="row-select" value={pattern.length} onChange={(e) => changeLength(Number(e.target.value))}>
            {LENGTHS.map((n) => <option key={n} value={n}>{fill(t.rotation.days, { n })}</option>)}
          </select>
        </label>
      </div>

      <div className="rows">
        {pattern.map((shiftId, i) => (
          <label key={i} className="row">
            <span className="row__main">
              <span className="row__name">{fill(t.rotation.day, { n: i + 1 })}</span>
            </span>
            <select className="row-select" value={shiftId ?? ''} onChange={(e) => { setDay(i, e.target.value || null); setError(''); }} aria-label={fill(t.rotation.day, { n: i + 1 })}>
              <option value="">{t.rotation.off}</option>
              {data.shifts.map((s) => <option key={s.id} value={s.id}>{shiftLabel(s.id)}</option>)}
            </select>
          </label>
        ))}
      </div>

      {rotation && (
        <div className="pad-x sheet__foot stack">
          <span className="flabel label">{t.rotation.apply}</span>
          <label className="fld">
            <span className="fld__l">{t.rotation.applyFrom}</span>
            <span className="fld__v">{dateFromKey(from).toLocaleDateString()}</span>
            <input className="fld__overlay" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <label className="fld">
            <span className="fld__l">{t.rotation.applyFor}</span>
            <select className="row-select" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              {WEEKS.map((w) => <option key={w} value={w}>{w === 1 ? t.rotation.week : fill(t.rotation.weeks, { n: w })}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn--wide" onClick={place} disabled={pattern.every((v) => v === null)}>
            <Icon name="plus" /> {t.rotation.apply}
          </button>
          <button type="button" className="btn btn--danger btn--wide" onClick={() => setConfirm(true)}>
            <Icon name="trash" /> {t.rotation.delete}
          </button>
        </div>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t.rotation.delete}
        message={fill(t.rotation.confirmDelete, { title: rotation?.title ?? '' })}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: async () => { if (rotation) await repo.deleteRotation(rotation.id); haptics.warning(); setConfirm(false); onClose(); } }]}
      />
    </Sheet>
  );
}
