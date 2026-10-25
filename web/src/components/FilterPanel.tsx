// .filter-panel shell: title, reset, close (narrow), removable chips, scrolling body, footer.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Chip } from '../lib/query.ts';

interface FilterPanelProps<Q> {
  title?: string;
  titleRef: RefObject<HTMLHeadingElement | null>;
  chips: readonly Chip<Q>[];
  query: Q;
  onChange: (q: Q) => void;
  onReset: () => void;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** Splits "CA ≥ 140" / "Nation: France" into a muted key and the rest. */
function splitLabel(label: string): [string, string] {
  const m = /^(.+?)(: | ≥ | ≤ )(.*)$/.exec(label);
  if (!m || m[1].length > 24) return ['', label];
  return [m[1], m[2] + m[3]];
}

export function FilterPanel<Q>({ title = 'Filters', titleRef, chips, query, onChange, onReset, onClose, footer, children }: FilterPanelProps<Q>) {
  const chipsRef = useRef<HTMLUListElement>(null);
  const [focusAfter, setFocusAfter] = useState<number | null>(null);

  // After a chip is removed, focus the next chip (or the title when none is left).
  useEffect(() => {
    if (focusAfter === null) return;
    const buttons = chipsRef.current?.querySelectorAll<HTMLButtonElement>('.chip__remove');
    if (buttons && buttons.length) buttons[Math.min(focusAfter, buttons.length - 1)].focus();
    else titleRef.current?.focus();
    setFocusAfter(null);
  }, [chips, focusAfter, titleRef]);

  return (
    <div className="filter-panel">
      <div className="filter-panel__header">
        <h2 className="filter-panel__title" tabIndex={-1} ref={titleRef}>{title}</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset} disabled={!chips.length}>
          Reset
        </button>
        <button type="button" className="btn btn--ghost btn--sm btn--icon show-below-1100" aria-label="Close filters" onClick={onClose}>
          <span className="btn__glyph" aria-hidden="true">×</span>
        </button>
      </div>
      {chips.length > 0 && (
        <ul className="filter-panel__chips" aria-label="Active filters" ref={chipsRef}>
          {chips.map((c, i) => {
            const [key, rest] = splitLabel(c.label);
            return (
              <li key={c.id} className="chip chip--accent">
                <span className="chip__label" title={c.label}>
                  {key && <span className="chip__key">{key}</span>}
                  {rest}
                </span>
                <button
                  type="button"
                  className="chip__remove"
                  aria-label={`Remove filter: ${c.label}`}
                  onClick={() => {
                    setFocusAfter(i);
                    onChange(c.remove(query));
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
      <div className="filter-panel__body">{children}</div>
      {footer && <div className="filter-panel__footer">{footer}</div>}
    </div>
  );
}
