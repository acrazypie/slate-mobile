import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '../native/platform';
import { Icon, type IconName } from './icons';

/** DESIGN.md switch; Material-sized with a knob on Android via CSS. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' on' : ''}`}
      onClick={() => {
        haptics.tick();
        onChange(!checked);
      }}
    />
  );
}

/** Capsule segmented control (iOS) / M3 segmented buttons (Android). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => {
            if (o.value !== value) haptics.tick();
            onChange(o.value);
          }}
        >
          <Icon name="check" className="seg__check" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A settings-style row in a grouped list. */
export function Row({ icon, name, hint, value, onClick, children, chevron, danger, stack }: {
  icon?: IconName;
  name: ReactNode;
  hint?: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  chevron?: boolean;
  danger?: boolean;
  stack?: boolean;
}) {
  const inner = (
    <>
      <div className="irow__head">
        {icon && (
          <span className="irow__ic">
            <Icon name={icon} />
          </span>
        )}
        <span className={`irow__nm${danger ? ' warn' : ''}`}>
          {name}
          {hint && <small>{hint}</small>}
        </span>
        {value !== undefined && <span className="irow__vl">{value}</span>}
        {chevron && <Icon name="chevronRight" className="irow__ch" />}
        {!stack && children}
      </div>
      {stack && children}
    </>
  );
  const cls = `irow${stack ? ' irow--stack' : ''}${icon ? '' : ' irow--noicon'}`;
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function Group({ label, footer, children }: { label?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="grp-wrap">
      {label && <h3 className="grp-h label">{label}</h3>}
      <div className="grp">{children}</div>
      {footer && <p className="grp-f">{footer}</p>}
    </section>
  );
}

export function Swatches({ colors, value, onChange, names, custom, columns }: { colors: string[]; value: string; onChange: (c: string) => void; names: (c: string) => string; custom?: string; columns?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const isCustom = !colors.some((c) => c.toUpperCase() === value.toUpperCase());
  return (
    <div
      className="swatches"
      role="radiogroup"
      style={columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 32px)`, justifyContent: 'space-between' } : undefined}
    >
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c.toUpperCase() === value.toUpperCase()}
          aria-label={names(c)}
          className={`sw${c.toUpperCase() === value.toUpperCase() ? ' sel' : ''}`}
          style={{ ['--c' as string]: c }}
          onClick={() => {
            haptics.tick();
            onChange(c);
          }}
        />
      ))}
      {custom && (
        <label className={`sw custom${isCustom ? ' sel' : ''}`} style={{ ['--c' as string]: isCustom ? value : 'transparent' }} aria-label={custom}>
          <input ref={input} type="color" value={value.toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </label>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast

const ToastContext = createContext<(msg: string, kind?: 'ok' | 'warn') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'warn'; key: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((msg: string, kind: 'ok' | 'warn' = 'ok') => {
    window.clearTimeout(timer.current);
    setToast({ msg, kind, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast &&
        createPortal(
          <div key={toast.key} className={`toast toast--${toast.kind}`} role="status" onClick={() => setToast(null)}>
            {toast.msg}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
