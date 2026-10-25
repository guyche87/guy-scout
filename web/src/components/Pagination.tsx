import { memo } from 'react';
import { int } from '../lib/format.ts';

interface PaginationProps {
  total: number;
  offset: number;
  limit: number;
  onOffset: (offset: number) => void;
  onLimit?: (limit: number) => void;
  sizes?: readonly number[];
  label?: string;
}

function pageList(current: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const out: (number | 'gap')[] = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(count - 2, current + 1);
  if (start > 1) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 2) out.push('gap');
  out.push(count - 1);
  return out;
}

export const Pagination = memo(function Pagination({
  total, offset, limit, onOffset, onLimit, sizes = [50, 100, 200, 500], label = 'Pages',
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(pages - 1, Math.floor(offset / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(total, offset + limit);
  const go = (p: number) => onOffset(Math.max(0, Math.min(pages - 1, p)) * limit);

  return (
    <nav className="pagination" aria-label={label}>
      <span className="pagination__info" aria-live="polite">
        {int(from)}–{int(to)} of {int(total)}
      </span>
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--icon"
        aria-label="Previous page"
        disabled={current <= 0}
        onClick={() => go(current - 1)}
      >
        <span className="btn__glyph" aria-hidden="true">‹</span>
      </button>
      <ul className="pagination__pages">
        {pageList(current, pages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`}>
              <span className="pagination__ellipsis" aria-hidden="true">…</span>
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className="pagination__page"
                aria-current={p === current ? 'page' : undefined}
                aria-label={`Page ${p + 1}`}
                onClick={() => go(p)}
              >
                {p + 1}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--icon"
        aria-label="Next page"
        disabled={current >= pages - 1}
        onClick={() => go(current + 1)}
      >
        <span className="btn__glyph" aria-hidden="true">›</span>
      </button>
      {onLimit && (
        <label className="pagination__size">
          Rows
          <select className="select select--sm" value={limit} onChange={e => onLimit(Number(e.target.value))}>
            {sizes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
});
