// The reminder row in the event and shift editors: default (the Settings lead),
// off, or one of the lead times. undefined = default, null = off, else minutes.

import { fill } from '../i18n/format';
import { useI18n } from '../i18n/I18n';
import { LEAD_OPTIONS } from '../notify/plan';
import { leadLabel } from '../notify/notifications';

export function ReminderField({ value, onChange, defaultLead }: {
  value: number | null | undefined;
  onChange: (value: number | null | undefined) => void;
  defaultLead: number;
}) {
  const { t } = useI18n();
  const key = value === undefined ? 'default' : value === null ? 'off' : String(value);
  return (
    <label className="fld">
      <span className="fld__l">{t.notify.reminder}</span>
      <select
        value={key}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === 'default' ? undefined : v === 'off' ? null : Number(v));
        }}
      >
        <option value="default">{fill(t.notify.reminderDefault, { lead: leadLabel(defaultLead, t) })}</option>
        <option value="off">{t.notify.reminderOff}</option>
        {LEAD_OPTIONS.map((m) => (
          <option key={m} value={m}>{leadLabel(m, t)}</option>
        ))}
      </select>
    </label>
  );
}
