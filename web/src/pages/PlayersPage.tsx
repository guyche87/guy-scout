// Players search: filter sidebar, results toolbar (columns, export, compare), sortable server-paged table.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { PlayerQuery, SearchRequest, Sort } from '../../../shared/api.ts';
import { ratingConfigFromSettings } from '../../../shared/ratings.ts';
import type { Player } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { ColumnChooser, type ChooserColumn } from '../components/ColumnChooser.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { EmptyState, ErrorBlock } from '../components/EmptyState.tsx';
import { FilterPanel } from '../components/FilterPanel.tsx';
import { Segmented } from '../components/Inputs.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { Menu, MenuItem, Popover } from '../components/Popover.tsx';
import { setBrowseList } from '../lib/browse.ts';
import {
  COLUMN_GROUPS, COLUMN_PRESETS, DEFAULT_PLAYER_COLUMNS, PLAYER_COLUMNS, playerColumn, validColumnKeys,
} from '../lib/columns.ts';
import { useDebouncedValue } from '../lib/debounce.ts';
import { int } from '../lib/format.ts';
import { cleanQuery, playerChips } from '../lib/query.ts';
import { navigate, playerHref, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useFilterDrawer } from '../lib/useFilterDrawer.ts';
import { useCompare } from '../state/compare.tsx';
import { useMeta } from '../state/meta.tsx';
import { useSettings } from '../state/settings.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { useStatus } from '../state/status.tsx';
import { routeView } from '../components/FmSubtabs.tsx';
import { buildPlayerColumns, hasGroupedColumns, type PlayerCellCtx } from './playerColumns.tsx';
import { PlayerFilters } from './PlayerFilters.tsx';

export const PAGE_SIZES = [50, 100, 200, 300] as const;
const NAME_INPUT_ID = 'players-name-filter';

const CHOOSER_COLUMNS: ChooserColumn[] = PLAYER_COLUMNS.map(c => ({
  key: c.key,
  label: c.group === 'Roles' ? c.title.replace(/ rating$/, '') : c.title,
  group: c.group,
}));

function validQuery(v: unknown): PlayerQuery | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as PlayerQuery) : null;
}

export function validSort(v: unknown): Sort | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Sort;
  return typeof s.key === 'string' && (s.dir === 'asc' || s.dir === 'desc') ? s : null;
}

function validLimit(v: unknown): number | null {
  return typeof v === 'number' && (PAGE_SIZES as readonly number[]).includes(v) ? v : null;
}

export type Density = 'comfy' | 'normal' | 'compact';

export const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: 'comfy', label: 'Comfy' },
  { value: 'normal', label: 'Normal' },
  { value: 'compact', label: 'Compact' },
];

export function validDensity(v: unknown): Density | null {
  return v === 'comfy' || v === 'normal' || v === 'compact' ? v : null;
}

export function densityClass(d: Density): string | undefined {
  return d === 'comfy' ? 'data-table--comfy' : d === 'compact' ? 'data-table--compact' : undefined;
}

/** shortlistId that matches nothing (shortlist view without an active list). */
const NO_SHORTLIST = '__none__';

/** Visible columns plus the query role's rating column when a role filter is active. */
function withRoleColumn(keys: readonly string[], roleId: string | undefined): string[] {
  if (!roleId) return [...keys];
  const k = `role:${roleId}`;
  if (keys.includes(k)) return [...keys];
  const out = [...keys];
  const after = Math.max(out.indexOf('bestRole'), out.indexOf('pa'), out.indexOf('ca'), out.indexOf('name'));
  out.splice(after + 1, 0, k);
  return out;
}

export function PlayersPage({ route }: { route: Route }) {
  const { status, dataKey } = useStatus();
  const { settings, money, ratingsVersion } = useSettings();
  const meta = useMeta();
  const shortlists = useShortlists();
  const compare = useCompare();
  const drawer = useFilterDrawer('player-filters');

  const [query, setQuery] = useStoredState<PlayerQuery>('players.query', {}, validQuery);
  const [sort, setSort] = useStoredState<Sort | null>('players.sort', null, validSort);
  const [limit, setLimit] = useStoredState<number>('players.limit', 100, validLimit);
  const [columns, setColumns] = useStoredState<string[]>('players.columns', () => [...DEFAULT_PLAYER_COLUMNS], validColumnKeys);
  // FM "comfortable" two-line rows are the default; Normal / Compact are the dense Genie Scout modes.
  const [density, setDensity] = useStoredState<Density>('players.rowDensity', 'comfy', validDensity);
  const [exporting, setExporting] = useState(false);

  // Sub-tab view (?view=myclub | shortlist) applied on top of the sidebar filters.
  const view = routeView(route);
  const activeShortlist = shortlists.activeId;
  const debounced = useDebouncedValue(query, 300);
  const cleaned = useMemo<PlayerQuery>(() => {
    const q = cleanQuery(debounced);
    if (view === 'myclub') return { ...q, myClub: true };
    if (view === 'shortlist') return { ...q, shortlistId: activeShortlist ?? NO_SHORTLIST };
    return q;
  }, [debounced, view, activeShortlist]);
  const qJson = JSON.stringify(cleaned);
  // The page offset belongs to one query; any filter change goes back to the first page.
  const [page, setPage] = useState<{ q: string; offset: number }>({ q: '', offset: 0 });
  const offset = page.q === qJson ? page.offset : 0;

  // In the shortlist view, starring / unstarring must refresh the results.
  const membership = view === 'shortlist' ? [...shortlists.activeSet].join(',') : '';
  const req: SearchRequest<PlayerQuery> = { query: cleaned, sort: sort ?? undefined, offset, limit };
  const fetchKey = dataKey ? `${JSON.stringify(req)}|${dataKey}|${ratingsVersion}|${membership}` : null;
  const { data, loading, error, reload } = useFetch(fetchKey, signal => api.searchPlayers(req, { signal }));

  const rows: readonly Player[] = data?.rows ?? [];
  useEffect(() => {
    setBrowseList('player', rows.map(r => r.id));
  }, [rows]);

  const roleId = cleaned.role ?? null;
  const visibleKeys = useMemo(() => withRoleColumn(columns, cleaned.role), [columns, cleaned.role]);
  const ratingCfg = useMemo(() => ratingConfigFromSettings(settings), [settings]);

  // Star / compare state is read through a ref so the column set stays stable when they change.
  const stateRef = useRef<PlayerCellCtx['state']['current']>({
    starred: shortlists.activeSet,
    compared: compare.set,
    toggleStar: shortlists.toggle,
    toggleCompare: compare.toggle,
  });
  stateRef.current = {
    starred: shortlists.activeSet,
    compared: compare.set,
    toggleStar: shortlists.toggle,
    toggleCompare: compare.toggle,
  };

  const tableColumns = useMemo(
    () => buildPlayerColumns(visibleKeys, {
      money, ratingCfg, roleRatings: data?.roleRatings ?? null, roleId, state: stateRef, selectable: true,
    }),
    [visibleKeys, money, ratingCfg, data?.roleRatings, roleId],
  );

  const { activeSet } = shortlists;
  const compareSet = compare.set;
  const rowState = useCallback(
    (p: Player) => `${activeSet.has(p.id) ? 'S' : ''}${compareSet.has(p.id) ? 'C' : ''}`,
    [activeSet, compareSet],
  );
  const isMarked = useCallback((p: Player) => compareSet.has(p.id), [compareSet]);

  const updateQuery = useCallback((q: PlayerQuery) => setQuery(q), [setQuery]);
  const chips = useMemo(() => playerChips(query, money, status?.humanClub ?? null), [query, money, status?.humanClub]);

  const onSort = useCallback((s: Sort) => setSort(s), [setSort]);
  const routeRef = useRef(route);
  routeRef.current = route;
  const onOpen = useCallback((p: Player) => navigate(playerHref(routeRef.current, p.id)), []);
  const onRowKey = useCallback((e: KeyboardEvent<HTMLElement>, p: Player) => {
    if (e.key === 's' || e.key === 'S') {
      stateRef.current.toggleStar(p.id);
      return true;
    }
    if (e.key === 'c' || e.key === 'C') {
      stateRef.current.toggleCompare(p.id);
      return true;
    }
    return false;
  }, []);

  // "/" focuses the name filter.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('dialog'))) return;
      e.preventDefault();
      if (!drawer.open) drawer.toggle();
      requestAnimationFrame(() => document.getElementById(NAME_INPUT_ID)?.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const implicitSort: Sort = roleId ? { key: `role:${roleId}`, dir: 'desc' } : { key: 'ca', dir: 'desc' };
  const selectedKey = route.page === 'players' && route.id ? Number(route.id) : null;
  const total = data?.total ?? 0;

  const doExport = async (format: 'csv' | 'html') => {
    setExporting(true);
    try {
      await api.exportPlayers({ query: cleaned, sort: sort ?? undefined, columns: visibleKeys, format });
      toast.success(`Exported ${int(total)} players as ${format.toUpperCase()}.`);
    } catch {
      // toast shown by the client
    } finally {
      setExporting(false);
    }
  };

  const activeName = shortlists.lists.find(l => l.id === shortlists.activeId)?.name ?? 'a new shortlist';

  return (
    <div className="layout-search" data-filters={drawer.dataFilters}>
      <aside className="layout-search__sidebar" id={drawer.panelId} aria-label="Player filters">
        <FilterPanel
          titleRef={drawer.titleRef}
          chips={chips}
          query={query}
          onChange={updateQuery}
          onReset={() => updateQuery({})}
          onClose={drawer.close}
          footer={
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!rows.length}
              title={`Add the ${rows.length} players on this page to ${activeName}`}
              onClick={() => shortlists.addMany(rows.map(r => r.id))}
            >
              Add page to shortlist
            </button>
          }
        >
          <PlayerFilters
            query={query}
            onChange={updateQuery}
            meta={meta}
            money={money}
            gameDate={status?.gameDate ?? null}
            myClub={status?.humanClub ?? null}
            nameInputId={NAME_INPUT_ID}
          />
        </FilterPanel>
      </aside>
      <div className="layout-search__scrim" aria-hidden="true" onClick={drawer.close} />
      <section className="layout-search__results" aria-label="Results" inert={drawer.drawerMode}>
        <div className="fm-section-bar fm-section-bar--plain">
          <button
            ref={drawer.toggleRef}
            type="button"
            className="btn btn--secondary btn--sm"
            aria-expanded={drawer.open}
            aria-controls={drawer.panelId}
            onClick={drawer.toggle}
          >
            Filters
            {chips.length > 0 && <span className="badge badge--accent badge--count">{chips.length}</span>}
          </button>
          <h2 className="fm-section-title" aria-live="polite">
            {!data && loading
              ? 'Searching…'
              : `${int(total)} ${total === 1 ? 'player' : 'players'} found${chips.length > 0 || view !== 'all' ? ' (filtered)' : ''}`}
          </h2>
          <div className="fm-section-bar__actions">
            <div className="toolbar__group hide-below-900">
              <Segmented label="Row density" value={density} onChange={setDensity} options={DENSITY_OPTIONS} />
            </div>
            <span className="toolbar__divider" aria-hidden="true" />
            <ColumnChooser
              columns={CHOOSER_COLUMNS}
              groups={COLUMN_GROUPS}
              value={columns}
              onChange={keys => setColumns(keys.filter(k => playerColumn(k) !== undefined))}
              presets={COLUMN_PRESETS}
              defaultColumns={DEFAULT_PLAYER_COLUMNS}
              searchOnlyGroups={['Roles']}
            />
            <Popover label="Export" buttonClassName="btn btn--secondary btn--sm" align="end" disabled={!total || exporting}>
              {close => (
                <Menu label="Export">
                  <MenuItem onSelect={() => { close(); void doExport('csv'); }}>CSV (opens in Excel)</MenuItem>
                  <MenuItem onSelect={() => { close(); void doExport('html'); }}>HTML table</MenuItem>
                </Menu>
              )}
            </Popover>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={!rows.length}
              title="Add the first players on this page to Compare (up to 4)"
              onClick={() => compare.addMany(rows.slice(0, 4).map(r => r.id))}
            >
              Add page to compare
            </button>
          </div>
        </div>

        {error && !data ? (
          <div className="results__body">
            <div className="page">
              <ErrorBlock message={error} onRetry={reload} />
            </div>
          </div>
        ) : (
          <DataTable<Player>
            label="Players"
            columns={tableColumns}
            rows={rows}
            rowKey={rowKey}
            sort={sort}
            implicitSort={implicitSort}
            onSort={onSort}
            onOpen={onOpen}
            onRowKey={onRowKey}
            selectedKey={selectedKey}
            isMarked={isMarked}
            rowState={rowState}
            loading={loading}
            grouped={hasGroupedColumns(visibleKeys)}
            tableClassName={densityClass(density)}
            scrollClassName="table-scroll--flush"
            empty={
              <EmptyState
                title={
                  !data ? 'Searching…'
                    : view === 'shortlist' && !shortlists.activeSet.size ? 'The active shortlist is empty'
                      : view === 'myclub' ? 'No players at your club match these filters'
                        : 'No players match these filters'
                }
                actions={chips.length > 0 && <button type="button" className="btn btn--primary" onClick={() => updateQuery({})}>Reset filters</button>}
              >
                {!data ? null
                  : view === 'shortlist' && !shortlists.activeSet.size
                    ? 'Star players in the All players view (or press S on a row) to add them to the active shortlist.'
                    : 'Try removing a filter or widening a range.'}
              </EmptyState>
            }
          />
        )}

        <div className="toolbar toolbar--footer">
          <Pagination
            total={total}
            offset={offset}
            limit={limit}
            sizes={PAGE_SIZES}
            onOffset={o => setPage({ q: qJson, offset: o })}
            onLimit={l => {
              setLimit(l);
              setPage({ q: qJson, offset: 0 });
            }}
          />
          <span className="toolbar__spacer" />
          <span className="xsmall muted hide-below-900">
            <span className="kbd">/</span> search · <span className="kbd">↑</span><span className="kbd">↓</span> move · <span className="kbd">S</span> star · <span className="kbd">C</span> compare
          </span>
        </div>
      </section>
    </div>
  );
}

const rowKey = (p: Player) => p.id;
