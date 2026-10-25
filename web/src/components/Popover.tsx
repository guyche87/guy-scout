// Button + popover panel (menus, column chooser, shortlist picker). Closes on outside click / Esc.
import { useCallback, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useDismiss } from '../lib/focus.ts';
import { cx } from '../lib/css.ts';

interface PopoverProps {
  /** Button content. */
  label: ReactNode;
  buttonClassName?: string;
  buttonTitle?: string;
  ariaLabel?: string;
  align?: 'start' | 'end';
  up?: boolean;
  /** 'menu' gives the button aria-haspopup="menu"; 'dialog' for panels with form controls. */
  kind?: 'menu' | 'dialog';
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
  onOpen?: () => void;
}

export function Popover({
  label, buttonClassName = 'btn btn--sm', buttonTitle, ariaLabel, align = 'start', up, kind = 'menu', disabled, children, onOpen,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => btnRef.current?.focus());
  }, []);
  const closeQuietly = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, closeQuietly, close);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    onOpen?.();
    setOpen(true);
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], input, button, select, textarea',
      );
      first?.focus();
    });
  };

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (kind !== 'menu' || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End')) return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? []);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    let n = 0;
    if (e.key === 'ArrowDown') n = (i + 1) % items.length;
    else if (e.key === 'ArrowUp') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'End') n = items.length - 1;
    items[n].focus();
  };

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className={buttonClassName}
        aria-haspopup={kind}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        title={buttonTitle}
        disabled={disabled}
        onClick={toggle}
      >
        {label}
      </button>
      {open && (
        <div
          ref={panelRef}
          id={id}
          className={cx('popover', align === 'end' && 'popover--end', up && 'popover--up')}
          role={kind === 'dialog' ? 'dialog' : undefined}
          aria-label={kind === 'dialog' ? (ariaLabel ?? (typeof label === 'string' ? label : undefined)) : undefined}
          onKeyDown={onMenuKey}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onSelect: () => void;
  children: ReactNode;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}

export function MenuItem({ onSelect, children, checked, danger, disabled, title }: MenuItemProps) {
  return (
    <li role="none">
      <button
        type="button"
        role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
        aria-checked={checked}
        className={cx('menu__item', danger && 'menu__item--danger')}
        disabled={disabled}
        title={title}
        tabIndex={-1}
        onClick={onSelect}
      >
        {children}
      </button>
    </li>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <li role="presentation" className="menu__label">{children}</li>;
}

export function MenuSeparator() {
  return <li role="separator" className="menu__sep" />;
}

export function Menu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className="menu" role="menu" aria-label={label}>
      {children}
    </ul>
  );
}
