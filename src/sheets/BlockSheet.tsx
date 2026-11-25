// Create / edit a Slate block (the web app's BlockModal). Fields render as
// grouped rows with value pills on iOS and outlined fields on Android, from
// the same markup (.fld). Native date/time inputs open the OS pickers.

import { useEffect, useState } from 'react';
import { repo, useSettings } from '../app/store';
import { useI18n } from '../i18n/I18n';
import { fill, formatDate, weekdayNames } from '../i18n/format';
import { haptics } from '../native/platform';
import { dateFromKey, keyFromDate, weekOffsetForDate } from '../lib/recurrence';
import type { Block, BlockCategory, BlockFormData, RecurrenceType } from '../lib/types';
import { CATEGORIES, CATEGORY_COLORS, COLOR_PALETTE, DURATION_OPTIONS, blockEndTime, colorKey, formatDuration, formatTime } from '../lib/types';
import { Dialog, Sheet } from '../ui/Sheet';
import { Swatches } from '../ui/controls';
import { Icon } from '../ui/icons';
import type { DeleteScope } from '../data/repository';
import { ReminderField } from './ReminderField';

export interface BlockTarget {
  /** Editing: the occurrence that was tapped (series id, shown week). */
  block?: Block;
  /** The day it was opened on. */
  date: Date;
  hour?: number;
}

export function BlockSheet({ target, onClose }: { target: BlockTarget | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const editing = target?.block ?? null;
  const series = editing?.is_recurring ? repo.getBlock(editing.id) ?? editing : null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlockCategory>('studio');
  const [color, setColor] = useState(CATEGORY_COLORS.studio);
  const [date, setDate] = useState('');
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [repeat, setRepeat] = useState<'none' | RecurrenceType>('none');
  const [repeatEnd, setRepeatEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'plain' | 'series' | null>(null);
  const [reminder, setReminder] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!target) return;
    const b = target.block;
    setError('');
    setConfirm(null);
    if (b) {
      setTitle(b.title);
      setCategory(b.category);
      setColor(b.color);
      setDate(keyFromDate(target.date));
      setWeekday(b.day_of_week);
      setStart(formatTime(b.start_hour, b.start_minute));
      setDuration(b.duration_minutes);
      setRepeat(b.is_recurring && b.recurrence_type ? b.recurrence_type : 'none');
      setRepeatEnd(b.recurrence_end_date ?? '');
      setNotes(b.notes ?? '');
      setReminder(b.reminder_minutes);
    } else {
      setTitle('');
      setCategory('studio');
      setColor(CATEGORY_COLORS.studio);
      setDate(keyFromDate(target.date));
      setWeekday((target.date.getDay() + 6) % 7);
      setStart(formatTime(target.hour ?? 9, 0));
      setDuration(60);
      setRepeat('none');
      setRepeatEnd('');
      setNotes('');
      setReminder(undefined);
    }
  }, [target]);

  if (!target) return null;

  const [sh, sm] = start.split(':').map(Number);
  const end = blockEndTime({ start_hour: sh || 0, start_minute: sm || 0, duration_minutes: duration });
  const durations = DURATION_OPTIONS.includes(duration) ? DURATION_OPTIONS : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);
  const editingSeries = !!editing?.is_recurring;

  const save = async () => {
    if (!title.trim()) {
      setError(t.blockModal.titleRequired);
      haptics.warning();
      return;
    }
    const day = dateFromKey(date || keyFromDate(target.date));
    const form: BlockFormData = {
      title,
      category,
      color,
      day_of_week: editingSeries ? weekday : (day.getDay() + 6) % 7,
      start_hour: sh || 0,
      start_minute: sm || 0,
      duration_minutes: duration,
      notes,
      is_recurring: repeat !== 'none',
      recurrence_type: repeat === 'none' ? undefined : repeat,
      recurrence_end_date: repeat !== 'none' && repeatEnd ? repeatEnd : undefined,
      reminder_minutes: reminder,
    };
    if (editing) await repo.updateBlock(editing.id, form, editingSeries ? undefined : weekOffsetForDate(day));
    else await repo.createBlock(form, weekOffsetForDate(day));
    haptics.success();
    onClose();
  };

  const remove = async (scope?: DeleteScope) => {
    if (!editing) return;
    if (scope && editing.is_recurring) await repo.deleteOccurrence(editing.id, editing.week_offset, scope);
    else await repo.deleteBlock(editing.id);
    haptics.warning();
    setConfirm(null);
    onClose();
  };

  const pushNote = settings.calendar.push ? t.calendarSync.pushNote : null;

  return (
    <Sheet open onClose={onClose} title={editing ? t.blockModal.editTitle : t.blockModal.newTitle} onConfirm={save}>
      <label className="fld fld--title">
        <span className="fld__l">{t.blockModal.title}</span>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder={t.blockModal.titlePlaceholder} maxLength={200} autoFocus={!editing} enterKeyHint="done" />
      </label>
      {error && <p className="fld__err">{error}</p>}

      <span className="flabel label">{t.blockModal.category}</span>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip${c === category ? ' sel' : ''}`} style={{ ['--c' as string]: CATEGORY_COLORS[c] }} onClick={() => { haptics.tick(); setCategory(c); setColor(CATEGORY_COLORS[c]); }}>
            <Icon name="check" className="chip__check" />
            <span className="dot" />
            {t.categories[c]}
          </button>
        ))}
      </div>

      <span className="flabel label">{t.common.color}</span>
      <div className="pad-x">
        <Swatches colors={COLOR_PALETTE} value={color} onChange={setColor} names={(c) => { const k = colorKey(c); return k ? t.colors[k] : c; }} />
      </div>

      <div className="form-grp">
        {editingSeries ? (
          <label className="fld">
            <span className="fld__l">{t.blockModal.day}</span>
            <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {weekdayNames(locale).map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          </label>
        ) : (
          <label className="fld">
            <span className="fld__l">{t.blockModal.date}</span>
            <span className="fld__show">{date ? formatDate(locale, dateFromKey(date), 'dayShortMonth') : ''}</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        )}
        <label className="fld">
          <span className="fld__l">{t.common.startTime}</span>
          {/* the WebView may render <input type=time> in 12h; show our own 24h value over it */}
          <span className="fld__show">{start}</span>
          <input className="fld__overlay" type="time" value={start} step={300} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
        <label className="fld">
          <span className="fld__l">{t.blockModal.duration}</span>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {durations.map((d) => <option key={d} value={d}>{formatDuration(d)}</option>)}
          </select>
        </label>
        <div className="fld fld--static ios-only">
          <span className="fld__l">{t.common.endTime}</span>
          <span className="fld__v">{formatTime(end.hour, end.minute)}</span>
        </div>
      </div>

      <div className="form-grp">
        <ReminderField value={reminder} onChange={setReminder} defaultLead={settings.notifications.leadMinutes} />
      </div>

      <div className="form-grp">
        <label className="fld">
          <span className="fld__l">{t.blockModal.repeat}</span>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)}>
            <option value="none">{t.blockModal.repeatNone}</option>
            <option value="weekly">{t.blockModal.weekly}</option>
            <option value="monthly">{t.blockModal.monthly}</option>
          </select>
        </label>
        {repeat !== 'none' && (
          <label className="fld">
            <span className="fld__l">{t.blockModal.repeatEnd}</span>
            <span className="fld__show">{repeatEnd ? `${t.blockModal.until} ${formatDate(locale, dateFromKey(repeatEnd), 'dayMonth')}` : t.blockModal.never}</span>
            <input type="date" value={repeatEnd} min={date} onChange={(e) => setRepeatEnd(e.target.value)} aria-label={t.blockModal.repeatEndDate} />
          </label>
        )}
        <label className="fld fld--notes">
          <span className="fld__l">{t.blockModal.notes}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={5000} />
        </label>
      </div>

      {editingSeries && <p className="note pad-x"><Icon name="repeat" />{t.blockModal.seriesHint}</p>}
      {pushNote && <p className="note pad-x"><Icon name="calendarCheck" />{pushNote}</p>}

      {editing && (
        <div className="pad-x sheet__foot">
          <button type="button" className="btn btn--danger btn--wide" onClick={() => setConfirm(editing.is_recurring ? 'series' : 'plain')}>
            <Icon name="trash" /> {t.blockModal.deleteEvent}
          </button>
        </div>
      )}

      <Dialog
        open={confirm === 'plain'}
        onClose={() => setConfirm(null)}
        title={t.blockModal.deleteEvent}
        message={t.blockModal.confirmDelete}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: () => void remove() }]}
      />
      <Dialog
        open={confirm === 'series'}
        onClose={() => setConfirm(null)}
        title={t.blockModal.deleteWhat}
        message={series ? fill(t.blockModal.occurrenceOf, { date: formatDate(locale, target.date, 'fullDay') }) : undefined}
        actions={[
          { label: t.blockModal.deleteCurrent, kind: 'danger', onClick: () => void remove('current') },
          { label: t.blockModal.deleteFollowing, kind: 'danger', onClick: () => void remove('this-and-following') },
          { label: t.blockModal.deleteAll, kind: 'danger', onClick: () => void remove('all') },
        ]}
      />
    </Sheet>
  );
}
