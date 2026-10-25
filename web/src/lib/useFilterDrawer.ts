// Filter sidebar behaviour (docs/ui-design.md "layout-search"): a column at >= 1100px, an off-canvas drawer
// below. In drawer mode focus moves to the panel title, Esc/scrim close it, results are inert, and focus
// returns to the toggle on close.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEscape } from './focus.ts';

const WIDE = '(min-width: 1100px)';

function isWide(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches;
}

export function useFilterDrawer(panelId: string) {
  const [wide, setWide] = useState(isWide);
  const [open, setOpen] = useState(isWide);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const m = window.matchMedia(WIDE);
    const on = () => {
      setWide(m.matches);
      setOpen(m.matches);
    };
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);

  const drawerMode = !wide && open;

  useEffect(() => {
    if (drawerMode) requestAnimationFrame(() => titleRef.current?.focus());
  }, [drawerMode]);

  const close = useCallback(() => {
    setOpen(false);
    if (!isWide()) requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  useEscape(drawerMode, close);

  const toggle = useCallback(() => {
    setOpen(o => {
      if (o && !isWide()) requestAnimationFrame(() => toggleRef.current?.focus());
      return !o;
    });
  }, []);

  return { panelId, open, wide, drawerMode, toggle, close, toggleRef, titleRef, dataFilters: open ? 'open' : 'closed' } as const;
}
