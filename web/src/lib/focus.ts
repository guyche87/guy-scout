// Focus management for drawers and modals: trap Tab inside, restore focus to the opener on close.
import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => {
    if (el.hasAttribute('inert') || el.closest('[inert]')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // Skip elements that are not rendered.
    return el.offsetParent !== null || el === document.activeElement || getComputedStyle(el).position === 'fixed';
  });
}

/**
 * While `active`, keeps keyboard focus inside `ref`. Focuses `initial` (or the container) on open and
 * returns focus to whatever had it before when deactivated / unmounted.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  initial?: RefObject<HTMLElement | null>,
): void {
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restore.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    if (!root) return;
    const target = initial?.current ?? root;
    // Defer so the element is laid out (drawer slide-in).
    const raf = requestAnimationFrame(() => {
      if (!root.contains(document.activeElement)) target.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const r = ref.current;
      if (!r) return;
      // Only the top-most trap handles Tab (nested drawers).
      const traps = document.querySelectorAll('[data-focus-trap="on"]');
      if (traps.length && traps[traps.length - 1] !== r) return;
      const items = focusables(r);
      if (!items.length) {
        e.preventDefault();
        r.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey && (cur === first || cur === r || !r.contains(cur))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (cur === last || !r.contains(cur))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    root.setAttribute('data-focus-trap', 'on');

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      root.removeAttribute('data-focus-trap');
      const back = restore.current;
      restore.current = null;
      if (back && document.contains(back)) {
        // After the drawer is gone, put focus back where the user was (e.g. the table row).
        requestAnimationFrame(() => back.focus({ preventScroll: true }));
      }
    };
  }, [active, ref, initial]);
}

/** Calls `fn` on Escape while `active`; only the most recently registered handler runs. */
const escStack: { id: number; fn: () => void }[] = [];
let escId = 0;
let escBound = false;

function onEscape(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const top = escStack[escStack.length - 1];
  if (!top) return;
  e.preventDefault();
  e.stopPropagation();
  top.fn();
}

export function useEscape(active: boolean, fn: () => void): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!active) return;
    if (!escBound) {
      document.addEventListener('keydown', onEscape);
      escBound = true;
    }
    const id = ++escId;
    escStack.push({ id, fn: () => fnRef.current() });
    return () => {
      const i = escStack.findIndex(x => x.id === id);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, [active]);
}

/**
 * Closes a popover when clicking outside `ref` (onOutside) or pressing Escape (onEscape, defaults to
 * onOutside). Escape usually also returns focus to the trigger; an outside click should not steal focus.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onOutside: () => void,
  onEscapeKey?: () => void,
): void {
  const outsideRef = useRef(onOutside);
  outsideRef.current = onOutside;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) outsideRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, ref]);
  useEscape(open, onEscapeKey ?? onOutside);
}
