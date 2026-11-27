// A settings row that shows the current choice and opens the app's own sheet to
// pick another. Replaces the native <select>, whose system popup (a grey list on
// Android) does not match the rest of the app.

import { useState, type ReactNode } from 'react';
import { Row } from './controls';
import { Sheet } from './Sheet';
import { Icon, type IconName } from './icons';

export type Choice = { value: string; label: string };

export function ChoiceRow({ icon, name, value, options, onChange, ariaLabel }: {
  icon?: IconName;
  name: ReactNode;
  value: string;
  options: Choice[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <>
      <Row icon={icon} name={name} value={current} chevron onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={ariaLabel} compact>
        <ul className="choice-list" role="radiogroup" aria-label={ariaLabel}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`choice${on ? ' on' : ''}`}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                >
                  <span>{o.label}</span>
                  {on && <Icon name="check" className="choice__ck" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
