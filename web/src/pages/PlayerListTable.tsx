// A players table for fixed lists (club squad) or server-sorted lists (shortlists), with stars, compare
// checkboxes and profile opening wired up. Client-side sorting when no onSort is supplied.
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Sort } from '../../../shared/api.ts';
import { ratingConfigFromSettings } from '../../../shared/ratings.ts';
import type { Player } from '../../../shared/types.ts';
import { DataTable, sortRows, type Column } from '../components/DataTable.tsx';
import { navigate, playerHref, type Route } from '../lib/router.ts';
import { useCompare } from '../state/compare.tsx';
import { useSettings } from '../state/settings.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { buildPlayerColumns, hasGroupedColumns, playerSortValue, type PlayerCellCtx } from './playerColumns.tsx';

interface PlayerListTableProps {
  label: string;
  rows: readonly Player[];
  columns: readonly string[];
  route: Route;
  /** Server sort; when omitted the rows are sorted client-side. */
  sort?: Sort | null;
  onSort?: (s: Sort) => void;
  implicitSort?: Sort;
  loading?: boolean;
  empty?: ReactNode;
  scrollClassName?: string;
  /** Extra trailing columns (e.g. shortlist notes). */
  extraColumns?: Column<Player>[];
  compact?: boolean;
}

export function PlayerListTable({
  label, rows, columns, route, sort, onSort, implicitSort = { key: 'ca', dir: 'desc' }, loading, empty, scrollClassName,
  extraColumns, compact,
}: PlayerListTableProps) {
  const { settings, money } = useSettings();
  const shortlists = useShortlists();
  const compare = useCompare();
  const ratingCfg = useMemo(() => ratingConfigFromSettings(settings), [settings]);
  const [clientSort, setClientSort] = useState<Sort>(implicitSort);
  const serverSorted = onSort !== undefined;

  const stateRef = useRef<PlayerCellCtx['state']['current']>({
    starred: shortlists.activeSet, compared: compare.set, toggleStar: shortlists.toggle, toggleCompare: compare.toggle,
  });
  stateRef.current = { starred: shortlists.activeSet, compared: compare.set, toggleStar: shortlists.toggle, toggleCompare: compare.toggle };

  const tableColumns = useMemo(() => {
    const cols = buildPlayerColumns(columns, { money, ratingCfg, roleRatings: null, roleId: null, state: stateRef, selectable: true });
    return extraColumns ? [...cols, ...extraColumns] : cols;
  }, [columns, money, ratingCfg, extraColumns]);

  const sorted = useMemo(
    () => (serverSorted ? rows : sortRows(rows, p => playerSortValue(p, clientSort.key, ratingCfg), clientSort.dir)),
    [rows, serverSorted, clientSort, ratingCfg],
  );

  const { activeSet } = shortlists;
  const compareSet = compare.set;
  const rowState = useCallback((p: Player) => `${activeSet.has(p.id) ? 'S' : ''}${compareSet.has(p.id) ? 'C' : ''}`, [activeSet, compareSet]);
  const isMarked = useCallback((p: Player) => compareSet.has(p.id), [compareSet]);
  const routeRef = useRef(route);
  routeRef.current = route;
  const onOpen = useCallback((p: Player) => navigate(playerHref(routeRef.current, p.id)), []);
  const onRowKey = useCallback((e: KeyboardEvent<HTMLElement>, p: Player) => {
    if (e.key === 's' || e.key === 'S') { stateRef.current.toggleStar(p.id); return true; }
    if (e.key === 'c' || e.key === 'C') { stateRef.current.toggleCompare(p.id); return true; }
    return false;
  }, []);
  const selectedKey = route.params.player ? Number(route.params.player) : route.page === 'players' && route.id ? Number(route.id) : null;

  return (
    <DataTable<Player>
      label={label}
      columns={tableColumns}
      rows={sorted}
      rowKey={playerKey}
      sort={serverSorted ? sort ?? null : clientSort}
      implicitSort={implicitSort}
      onSort={serverSorted ? onSort : setClientSort}
      onOpen={onOpen}
      onRowKey={onRowKey}
      selectedKey={selectedKey}
      isMarked={isMarked}
      rowState={rowState}
      loading={loading}
      grouped={hasGroupedColumns(columns)}
      tableClassName={compact ? 'data-table--compact' : undefined}
      scrollClassName={scrollClassName}
      empty={empty}
    />
  );
}

const playerKey = (p: Player) => p.id;
