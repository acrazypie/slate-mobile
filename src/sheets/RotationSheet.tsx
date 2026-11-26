// Create / edit a rotation: a repeating cycle of shifts (or days off), placed
// on the calendar from a chosen day (Timeline design, screen 15). "Place on
// calendar" saves the rotation and places it. Placing never removes shifts
// that are already there; days that already hold the same shift are skipped.

import { useEffect, useState } from 'react';
import { repo, useData } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { fill } from '../i18n/format';
import { dateFromKey, keyFromDate } from '../lib/recurrence';
import type { Rotation } from '../lib/types';
import { ROTATION_MAX_DAYS, ROTATION_MIN_DAYS } from '../lib/types';
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

  /** Checks the form and saves the rotation. Returns the saved rotation's id, or null if the form is not valid. */
  const saveOnly = async (): Promise<string | null> => {
    if (!title.trim()) {
      setError(t.blockModal.titleRequired);
      haptics.warning();
      return null;
    }
    if (pattern.every((v) => v === null)) {
      setError(t.rotation.needShift);
      haptics.warning();
      return null;
    }
    if (rotation) {
      await repo.updateRotation(rotation.id, { title, pattern });
      return rotation.id;
    }
    const created = await repo.createRotation({ title, pattern });
    return created.id;
  };

  const save = async () => {
    if (!(await saveOnly())) return;
    haptics.success();
    onClose();
  };

  const placeOnCalendar = async () => {
    const id = await saveOnly();
    if (!id) return;
    const placed = await repo.applyRotation(id, from, weeks * 7);
    if (placed > 0) {
      haptics.success();
      toast(fill(t.rotation.applied, { count: placed }));
    } else {
      haptics.warning();
      toast(t.rotation.appliedNone, 'warn');
    }
    onClose();
  };

  const shiftLabel = (id: string) => data.shifts.find((x) => x.id === id)?.title ?? '';

  return (
    <Sheet open onClose={onClose} title={rotation ? t.rotation.editTitle : t.rotation.newTitle} onConfirm={save}>
      <label className="fld fld--title">
        <span className="fld__l">{t.rotation.name}</span>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder={t.rotation.namePlaceholder} maxLength={100} autoFocus={!rotation} />
      </label>
      {error && <p className="fld__err">{error}</p>}

      <div className="rot">
        <div className="rot-row">
          <span className="rot-row__name">{t.rotation.cycle}</span>
          <span className="rot-row__value">{fill(t.rotation.days, { n: pattern.length })}</span>
          <select className="rot-hit" value={pattern.length} onChange={(e) => changeLength(Number(e.target.value))} aria-label={t.rotation.cycle}>
            {LENGTHS.map((n) => <option key={n} value={n}>{fill(t.rotation.days, { n })}</option>)}
          </select>
        </div>

        <div className="rot-pattern">
          <span className="rot-pattern__label">{t.rotation.pattern}</span>
          <div className="rot-chips">
            {pattern.map((shiftId, i) => (
              <span key={i} className={`chip rot-chip${shiftId ? ' sel' : ''}`}>
                {shiftId ? shiftLabel(shiftId) : t.rotation.off}
                <select
                  className="rot-hit"
                  value={shiftId ?? ''}
                  onChange={(e) => { setDay(i, e.target.value || null); setError(''); }}
                  aria-label={fill(t.rotation.day, { n: i + 1 })}
                >
                  <option value="">{t.rotation.off}</option>
                  {data.shifts.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </span>
            ))}
          </div>
        </div>

        <div className="rot-row">
          <span className="rot-row__name">{t.rotation.applyFrom}</span>
          <span className="rot-row__value">{dateFromKey(from).toLocaleDateString()}</span>
          <input className="rot-hit" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} aria-label={t.rotation.applyFrom} />
        </div>

        <div className="rot-row">
          <span className="rot-row__name">{t.rotation.applyFor}</span>
          <span className="rot-row__value">{weeks === 1 ? t.rotation.week : fill(t.rotation.weeks, { n: weeks })}</span>
          <select className="rot-hit" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} aria-label={t.rotation.applyFor}>
            {WEEKS.map((w) => <option key={w} value={w}>{w === 1 ? t.rotation.week : fill(t.rotation.weeks, { n: w })}</option>)}
          </select>
        </div>
      </div>

      <div className="pad-x sheet__foot stack">
        <button type="button" className="btn btn--wide" onClick={placeOnCalendar} disabled={pattern.every((v) => v === null)}>
          <Icon name="calendar" /> {t.rotation.apply}
        </button>
        {rotation && (
          <button type="button" className="btn btn--text btn--danger-text btn--wide" onClick={() => setConfirm(true)}>
            <Icon name="trash" /> {t.rotation.delete}
          </button>
        )}
      </div>
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
