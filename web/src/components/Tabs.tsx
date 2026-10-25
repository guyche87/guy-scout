// ARIA tabs for in-page sections (docs/ui-design.md "tabs"). TabList and TabPanels are separate so the
// list can sit above a scrolling body (profile drawers). Roving tabindex; ←/→ activate, Home/End jump.
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../lib/css.ts';

export interface TabDef<K extends string> {
  id: K;
  label: ReactNode;
  disabled?: boolean;
}

const tabId = (base: string, id: string) => `${base}-tab-${id}`;
const panelId = (base: string, id: string) => `${base}-panel-${id}`;

interface TabListProps<K extends string> {
  /** Unique prefix shared with TabPanels (use useId()). */
  base: string;
  tabs: readonly TabDef<K>[];
  selected: K;
  onSelect: (id: K) => void;
  label: string;
  small?: boolean;
}

export function TabList<K extends string>({ base, tabs, selected, onSelect, label, small }: TabListProps<K>) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = tabs.filter(t => !t.disabled);
    if (!enabled.length) return;
    const i = Math.max(0, enabled.findIndex(t => t.id === selected));
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % enabled.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = enabled[next].id;
    onSelect(id);
    document.getElementById(tabId(base, id))?.focus();
  };

  return (
    <div ref={listRef} className={cx('tabs', small && 'tabs--sm')} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className="tabs__tab"
          id={tabId(base, t.id)}
          aria-selected={t.id === selected}
          aria-controls={panelId(base, t.id)}
          tabIndex={t.id === selected ? 0 : -1}
          disabled={t.disabled}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface TabPanelsProps<K extends string> {
  base: string;
  tabs: readonly TabDef<K>[];
  selected: K;
  /** Renders the selected panel's content (inactive panels stay empty and hidden). */
  render: (id: K) => ReactNode;
  flush?: boolean;
}

export function TabPanels<K extends string>({ base, tabs, selected, render, flush }: TabPanelsProps<K>) {
  return (
    <>
      {tabs.map(t => (
        <div
          key={t.id}
          className={cx('tab-panel', flush && 'tab-panel--flush')}
          role="tabpanel"
          id={panelId(base, t.id)}
          aria-labelledby={tabId(base, t.id)}
          tabIndex={0}
          hidden={t.id !== selected}
        >
          {t.id === selected ? render(t.id) : null}
        </div>
      ))}
    </>
  );
}
