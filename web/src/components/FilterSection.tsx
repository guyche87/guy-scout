// Collapsible filter group: <details class="filter-section"> with an active-filter count. Open state is remembered.
import type { ReactNode } from 'react';
import { useStoredState } from '../lib/storage.ts';

interface FilterSectionProps {
  /** Stable id used to remember the open/closed state. */
  id: string;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function FilterSection({ id, title, count = 0, defaultOpen = false, children }: FilterSectionProps) {
  const [open, setOpen] = useStoredState<boolean>(`filters.open.${id}`, defaultOpen, v => (typeof v === 'boolean' ? v : null));
  return (
    <details
      className="filter-section"
      open={open}
      onToggle={e => {
        const now = (e.currentTarget as HTMLDetailsElement).open;
        if (now !== open) setOpen(now);
      }}
    >
      <summary className="filter-section__header">
        <span className="filter-section__title">{title}</span>
        {count > 0 && (
          <span className="filter-section__count">
            {count}
            <span className="visually-hidden"> active filters</span>
          </span>
        )}
      </summary>
      {open && <div className="filter-section__body">{children}</div>}
    </details>
  );
}
