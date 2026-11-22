// Bottom sheet (DESIGN.md: dialog as bottom sheet on phones). Registers an
// Android back handler while open, closes on Escape and on the scrim.
// Header chrome differs per platform only through CSS (styles/ios.css,
// styles/android.css): iOS round ✕ / title centred / round ✓, Android ✕ +
// title / filled "Save" button.

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { pushBackHandler } from '../native/platform';
import { Icon } from './icons';
import { useI18n } from '../i18n/I18n';

export function useBackHandler(active: boolean, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const off = pushBackHandler(() => ref.current());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      off();
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Shows the confirm button (✓ on iOS, "Save" on Android). */
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  /** Short sheets (pickers, choices) hug their content. */
  compact?: boolean;
  className?: string;
}

export function Sheet({ open, onClose, title, children, onConfirm, confirmLabel, confirmDisabled, compact, className = '' }: SheetProps) {
  const { t } = useI18n();
  useBackHandler(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="overlay" role="presentation">
      <div className="scrim" onClick={onClose} />
      <div className={`sheet${compact ? ' sheet--compact' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__bar">
          <button type="button" className="sheet__close" onClick={onClose} aria-label={t.common.close}>
            <Icon name="close" />
          </button>
          <h2 className="sheet__title">{title}</h2>
          {onConfirm ? (
            <button type="button" className="sheet__ok" onClick={onConfirm} disabled={confirmDisabled} aria-label={confirmLabel ?? t.common.save}>
              <Icon name="check" />
              <span>{confirmLabel ?? t.common.save}</span>
            </button>
          ) : (
            <span className="sheet__spacer" />
          )}
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface DialogAction {
  label: string;
  onClick: () => void;
  kind?: 'primary' | 'danger' | 'plain';
}

/** Centred confirm / choice dialog. The last action is the default. */
export function Dialog({ open, onClose, title, message, actions }: { open: boolean; onClose: () => void; title: string; message?: ReactNode; actions: DialogAction[] }) {
  const { t } = useI18n();
  useBackHandler(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="overlay overlay--center" role="presentation">
      <div className="scrim" onClick={onClose} />
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2 className="dialog__title">{title}</h2>
        {message && <div className="dialog__msg">{message}</div>}
        <div className="dialog__acts">
          {actions.map((a) => (
            <button key={a.label} type="button" className={`dialog__btn dialog__btn--${a.kind ?? 'plain'}`} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
          <button type="button" className="dialog__btn dialog__btn--cancel" onClick={onClose}>
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
