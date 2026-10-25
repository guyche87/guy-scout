// Dense data table (docs/ui-design.md section 8). Rows are memoised: a row re-renders only when its data,
// the column set, its selected state or its `rowState` signature changes, so typing in filters or toggling
// one star does not re-render the whole table. Clicks and keys are delegated to <tbody>.
// Keyboard: the name button ([data-open]) opens the row; ↑/↓ move focus to the same control in the
// neighbouring row, Home/End to the first/last row; page-specific keys via onRowKey.
import {
  memo, useCallback, useEffect, useMemo, useRef,
  type KeyboardEvent, type MouseEvent, type ReactNode,
} from 'react';
import type { Sort } from '../../../shared/api.ts';
import { cssVars, cx } from '../lib/css.ts';

export interface Column<T> {
  /** Unique id within the table. */
  id: string;
  header: ReactNode;
  /** Full name: tooltip and accessible name of the header. */
  title?: string;
  /** Sort key (server or client); omit for unsortable columns. */
  sortKey?: string;
  /** First-click direction: desc for numbers, asc for text. */
  defaultDir?: 'asc' | 'desc';
  /** Classes for both <th> and <td>, e.g. "num", "col-attr", "col-icon", "col-name". */
  className?: string;
  /** Extra sticky column: px offset from the left edge. */
  stickyLeft?: number;
  /** Render the body cell as <th scope="row">. */
  rowHeader?: boolean;
  /** Header group label (Technical / Mental ...) for the grouped header row. */
  group?: string;
  /** Strong divider at the start of an attribute group. */
  groupStart?: boolean;
  render: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  /** Region / caption label, e.g. "Players". */
  label: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string | number;
  sort?: Sort | null;
  /** Sort the data has when `sort` is null (shown with aria-sort). */
  implicitSort?: Sort | null;
  onSort?: (s: Sort) => void;
  onOpen?: (row: T, index: number) => void;
  /** Extra keys while focus is inside a row (e.g. "s" = shortlist); return true when handled. */
  onRowKey?: (e: KeyboardEvent<HTMLElement>, row: T, index: number) => boolean;
  /** Key of the row whose profile is open. */
  selectedKey?: string | number | null;
  /** Other rows to mark .is-selected (e.g. compare picks). */
  isMarked?: (row: T) => boolean;
  loading?: boolean;
  empty?: ReactNode;
  /** Extra classes on <table>, e.g. "data-table--compact". */
  tableClassName?: string;
  /** Extra classes on .table-scroll, e.g. "table-scroll--flush" or "table-scroll--auto". */
  scrollClassName?: string;
  /** Per-row signature for memo invalidation when cells depend on outside state (stars, compare). */
  rowState?: (row: T) => string;
  /** Show a group header row built from Column.group. */
  grouped?: boolean;
  /** Sticky first column (.data-table--sticky-first). */
  stickyFirst?: boolean;
  /** Wrap in .results__body (default) - turn off when the caller provides the positioned box. */
  wrap?: boolean;
}

interface RowProps<T> {
  row: T;
  index: number;
  columns: readonly Column<T>[];
  selected: boolean;
  stateKey: string;
}

function stickyStyle<T>(c: Column<T>) {
  return c.stickyLeft !== undefined ? cssVars({ '--sticky-left': `${c.stickyLeft}px` }) : undefined;
}

function cellClass<T>(c: Column<T>): string | undefined {
  return cx(c.className, c.stickyLeft !== undefined && 'sticky-col', c.groupStart && 'col-group-start') || undefined;
}

function RowInner<T>({ row, index, columns, selected }: RowProps<T>) {
  return (
    <tr data-index={index} className={selected ? 'is-selected' : undefined}>
      {columns.map(c =>
        c.rowHeader ? (
          <th key={c.id} scope="row" className={cellClass(c)} style={stickyStyle(c)}>
            {c.render(row, index)}
          </th>
        ) : (
          <td key={c.id} className={cellClass(c)} style={stickyStyle(c)}>
            {c.render(row, index)}
          </td>
        ),
      )}
    </tr>
  );
}

const Row = memo(RowInner, (a, b) =>
  a.row === b.row && a.columns === b.columns && a.index === b.index && a.selected === b.selected && a.stateKey === b.stateKey,
) as unknown as <T>(p: RowProps<T>) => ReactNode;

const INTERACTIVE = 'button, a, input, select, textarea, label, summary';
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])';

function headerText<T>(c: Column<T> | undefined): string {
  if (!c) return '';
  if (c.title) return c.title;
  return typeof c.header === 'string' ? c.header : c.id;
}

function DataTableInner<T>({
  label, columns, rows, rowKey, sort, implicitSort, onSort, onOpen, onRowKey, selectedKey, isMarked, loading, empty,
  tableClassName, scrollClassName, rowState, grouped, stickyFirst, wrap = true,
}: DataTableProps<T>) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onRowKeyRef = useRef(onRowKey);
  onRowKeyRef.current = onRowKey;

  // A new result set (different first row): scroll back to the top.
  const firstKey = rows.length ? rowKey(rows[0]) : null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [firstKey]);

  // Keep the open profile's row in view (prev/next in the drawer).
  useEffect(() => {
    if (selectedKey === null || selectedKey === undefined) return;
    const i = rowsRef.current.findIndex(r => rowKey(r) === selectedKey);
    if (i < 0) return;
    bodyRef.current?.querySelector<HTMLElement>(`tr[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedKey, rowKey]);

  const active = sort ?? implicitSort ?? null;
  const sortedCol = active ? columns.find(c => c.sortKey === active.key) : undefined;
  const caption = sortedCol && active
    ? `${label}, sorted by ${headerText(sortedCol)}, ${active.dir === 'asc' ? 'ascending' : 'descending'}`
    : label;

  const onBodyClick = useCallback((e: MouseEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement;
    const tr = target.closest<HTMLTableRowElement>('tr[data-index]');
    if (!tr) return;
    if (!target.closest('[data-open]') && target.closest(INTERACTIVE)) return;
    // Don't treat a text selection drag as a click.
    if (window.getSelection()?.toString()) return;
    const i = Number(tr.dataset.index);
    const row = rowsRef.current[i];
    if (row !== undefined) onOpenRef.current?.(row, i);
  }, []);

  const onBodyKey = useCallback((e: KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement;
    const tr = target.closest<HTMLTableRowElement>('tr[data-index]');
    if (!tr) return;
    const i = Number(tr.dataset.index);
    const row = rowsRef.current[i];
    if (row === undefined) return;
    const typing = target instanceof HTMLInputElement && target.type !== 'checkbox';
    if (typing || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

    const cell = target.closest<HTMLTableCellElement>('td, th');
    const col = cell ? cell.cellIndex : 0;
    const focusRow = (n: number) => {
      const max = rowsRef.current.length - 1;
      const idx = Math.max(0, Math.min(max, n));
      const nextTr = bodyRef.current?.querySelector<HTMLTableRowElement>(`tr[data-index="${idx}"]`);
      if (!nextTr) return;
      const sameCell = nextTr.cells[col]?.querySelector<HTMLElement>(FOCUSABLE);
      (sameCell ?? nextTr.querySelector<HTMLElement>('[data-open]') ?? nextTr.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    };
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusRow(i + 1); return;
      case 'ArrowUp': e.preventDefault(); focusRow(i - 1); return;
      case 'Home': if (e.ctrlKey) { e.preventDefault(); focusRow(0); } return;
      case 'End': if (e.ctrlKey) { e.preventDefault(); focusRow(rowsRef.current.length - 1); } return;
      default:
        if (!e.altKey && !e.ctrlKey && !e.metaKey && onRowKeyRef.current?.(e, row, i)) e.preventDefault();
    }
  }, []);

  const headerClick = (c: Column<T>) => {
    if (!c.sortKey || !onSort) return;
    if (active && active.key === c.sortKey) onSort({ key: c.sortKey, dir: active.dir === 'asc' ? 'desc' : 'asc' });
    else onSort({ key: c.sortKey, dir: c.defaultDir ?? 'desc' });
  };

  const groupRow = useMemo(() => {
    if (!grouped) return null;
    const cells: { label: string; span: number; first: Column<T> }[] = [];
    for (const c of columns) {
      const g = c.group ?? '';
      const last = cells[cells.length - 1];
      const sticky = c.stickyLeft !== undefined || (stickyFirst && c === columns[0]);
      if (last && last.label === g && !sticky && last.first.stickyLeft === undefined && !(stickyFirst && last.first === columns[0])) last.span++;
      else cells.push({ label: g, span: 1, first: c });
    }
    return cells;
  }, [columns, grouped, stickyFirst]);

  const body = !rows.length && !loading ? (
    empty
  ) : (
    <>
      <div
        ref={scrollRef}
        className={cx('table-scroll', scrollClassName)}
        role="region"
        aria-label={label}
        aria-busy={loading || undefined}
        tabIndex={0}
      >
        <table
          className={cx(
            'data-table',
            onOpen && 'data-table--interactive',
            grouped && 'data-table--grouped',
            stickyFirst && 'data-table--sticky-first',
            tableClassName,
          )}
        >
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            {groupRow && (
              <tr>
                {groupRow.map((g, i) => (
                  <th
                    key={`${g.first.id}-g${i}`}
                    colSpan={g.span}
                    scope={g.label ? 'colgroup' : undefined}
                    className={cx(g.first.stickyLeft !== undefined && 'sticky-col', g.first.groupStart && 'col-group-start') || undefined}
                    style={stickyStyle(g.first)}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {columns.map(c => {
                const dir = active && c.sortKey && active.key === c.sortKey ? active.dir : null;
                const text = headerText(c);
                const showLabel = typeof c.header === 'string' && text !== c.header;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className={cellClass(c)}
                    style={stickyStyle(c)}
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                    title={c.sortKey && onSort ? undefined : c.title}
                  >
                    {c.sortKey && onSort ? (
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => headerClick(c)}
                        aria-label={showLabel ? text : undefined}
                        title={c.title}
                      >
                        {c.header}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={bodyRef} onClick={onBodyClick} onKeyDown={onBodyKey}>
            {rows.map((r, i) => {
              const k = rowKey(r);
              const selected = (selectedKey !== undefined && selectedKey !== null && k === selectedKey) || (isMarked ? isMarked(r) : false);
              return (
                <Row
                  key={k}
                  row={r}
                  index={i}
                  columns={columns}
                  selected={selected}
                  stateKey={rowState ? rowState(r) : ''}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="loading-overlay" hidden={!loading}>
        <span className="spinner" aria-hidden="true" /> Loading…
      </div>
    </>
  );

  return wrap ? <div className="results__body">{body}</div> : <>{body}</>;
}

export const DataTable = memo(DataTableInner) as unknown as <T>(p: DataTableProps<T>) => ReactNode;

// ------------------------------------------------------------------ client-side sorting

/** Sorts a fixed list (club squad, staff) by a getter; missing values always last. Stable. */
export function sortRows<T>(rows: readonly T[], get: (row: T) => number | string | null | undefined, dir: 'asc' | 'desc'): T[] {
  const sign = dir === 'desc' ? -1 : 1;
  return rows
    .map((r, i) => ({ r, i, v: get(r) }))
    .sort((a, b) => {
      const x = a.v, y = b.v;
      const xm = x === null || x === undefined || x === '' || (typeof x === 'number' && Number.isNaN(x));
      const ym = y === null || y === undefined || y === '' || (typeof y === 'number' && Number.isNaN(y));
      if (xm || ym) return xm === ym ? a.i - b.i : xm ? 1 : -1;
      if (typeof x === 'number' && typeof y === 'number') return x === y ? a.i - b.i : (x - y) * sign;
      const c = String(x).localeCompare(String(y), undefined, { sensitivity: 'base', numeric: true });
      return c === 0 ? a.i - b.i : c * sign;
    })
    .map(x => x.r);
}
