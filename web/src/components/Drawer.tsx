// Native <dialog> shells (docs/ui-design.md section 10/12): opened with showModal() on mount, Esc ("cancel")
// and backdrop clicks call onClose, focus goes to [data-autofocus] and returns to the opener on unmount.
import { useId, useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { cx } from '../lib/css.ts';
import { raiseToasts } from '../lib/toast.ts';

function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // close() calls we make ourselves (unmount, StrictMode re-run) must not be reported as user closes.
  const ownCloses = useRef(0);

  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute('open', '');
      }
    }
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    raiseToasts();
    return () => {
      if (d.open) {
        ownCloses.current++;
        d.close();
      }
      requestAnimationFrame(() => {
        // Only on a real unmount (StrictMode's simulated one keeps the node connected).
        if (!d.isConnected && opener && opener.isConnected) opener.focus({ preventScroll: true });
      });
    };
  }, []);

  const handlers = {
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onCloseRef.current();
    },
    onClose: () => {
      if (ownCloses.current > 0) {
        ownCloses.current--;
        return;
      }
      // The browser closed it (e.g. a repeated Esc): sync the app state.
      onCloseRef.current();
    },
    onClick: (e: SyntheticEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onCloseRef.current();
    },
  };
  return { ref, handlers };
}

interface DrawerProps {
  /** id of the element naming the dialog (usually the profile name heading). */
  labelledBy?: string;
  ariaLabel?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

/** Right-side drawer. Compose with DrawerHeader, a .profile-header, Tabs and a .drawer__body. */
export function Drawer({ labelledBy, ariaLabel, onClose, wide, children }: DrawerProps) {
  const { ref, handlers } = useModalDialog(onClose);
  return (
    <dialog
      ref={ref}
      className={cx('drawer', wide && 'drawer--wide')}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      {...handlers}
    >
      {children}
    </dialog>
  );
}

interface DrawerHeaderProps {
  eyebrow: string;
  onClose: () => void;
  closeLabel?: string;
  /** Buttons between the eyebrow and the close button (prev/next, star ...). */
  children?: ReactNode;
}

export function DrawerHeader({ eyebrow, onClose, closeLabel = 'Close', children }: DrawerHeaderProps) {
  return (
    <div className="drawer__header">
      <span className="eyebrow">{eyebrow}</span>
      <span className="spacer" />
      {children}
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--icon"
        aria-label={closeLabel}
        title={`${closeLabel} (Esc)`}
        data-autofocus=""
        onClick={onClose}
      >
        <span className="btn__glyph" aria-hidden="true">×</span>
      </button>
    </div>
  );
}

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  children: ReactNode;
}

/** Centered modal. Mark the element to focus first with data-autofocus (e.g. Cancel for destructive confirms). */
export function Modal({ title, onClose, size = 'md', footer, children }: ModalProps) {
  const { ref, handlers } = useModalDialog(onClose);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      className={cx('modal', size === 'sm' && 'modal--sm', size === 'lg' && 'modal--lg')}
      aria-labelledby={titleId}
      {...handlers}
    >
      <div className="modal__header">
        <h2 className="modal__title" id={titleId}>{title}</h2>
        <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Close" onClick={onClose}>
          <span className="btn__glyph" aria-hidden="true">×</span>
        </button>
      </div>
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__footer">{footer}</div>}
    </dialog>
  );
}

interface ConfirmProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive confirms focus Cancel first. */
export function ConfirmModal({ title, message, confirmLabel, danger = true, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn" data-autofocus="" onClick={onCancel}>Cancel</button>
          <button type="button" className={cx('btn', danger ? 'btn--danger' : 'btn--primary')} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
