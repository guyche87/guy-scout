// Clubs search: filters (name, nation, league, reputation, with squad) and a sortable table.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClubQuery, SearchRequest, Sort } from '../../../shared/api.ts';
import type { Club } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { DataTable, type Column } from '../components/DataTable.tsx';
import { EmptyState, ErrorBlock } from '../components/EmptyState.tsx';
import { FilterPanel } from '../components/FilterPanel.tsx';
import { FilterSection } from '../components/FilterSection.tsx';
import { Checkbox, RangeInput, TextField } from '../components/Inputs.tsx';
import { MultiSelect, toOptions } from '../components/MultiSelect.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { AbilityTile } from '../components/Values.tsx';
import { setBrowseList } from '../lib/browse.ts';
import { useDebouncedValue } from '../lib/debounce.ts';
import { decimal, int, money, type MoneyFormat } from '../lib/format.ts';
import { cleanQuery, clubChips } from '../lib/query.ts';
import { clubHref, navigate, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useFilterDrawer } from '../lib/useFilterDrawer.ts';
import { useMeta } from '../state/meta.tsx';
import { useSettings } from '../state/settings.tsx';
import { useStatus } from '../state/status.tsx';
import { PAGE_SIZES, validSort } from './PlayersPage.tsx';
import { leagueOptions } from './PlayerFilters.tsx';

function validQuery(v: unknown): ClubQuery | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as ClubQuery) : null;
}

function clubColumns(m: MoneyFormat): Column<Club>[] {
  return [
    {
      id: 'name', header: 'Club', title: 'Club', sortKey: 'name', defaultDir: 'asc', className: 'col-name', rowHeader: true,
      render: c => (
        <div className="cell-name">
          <button type="button" className="link-btn" data-open="" aria-haspopup="dialog" title={c.name}>{c.name}</button>
        </div>
      ),
    },
    { id: 'nation', header: 'Nation', sortKey: 'nation', defaultDir: 'asc', render: c => <span className="cell-truncate">{c.nation || '–'}</span> },
    { id: 'league', header: 'League', sortKey: 'league', defaultDir: 'asc', render: c => <span className="cell-truncate" title={c.league}>{c.league || '–'}</span> },
    { id: 'reputation', header: 'Rep', title: 'Reputation', sortKey: 'reputation', className: 'num', render: c => int(c.reputation) },
    { id: 'squadSize', header: 'Squad', title: 'Players loaded', sortKey: 'squadSize', className: 'num', render: c => int(c.squadSize) },
    { id: 'avgAge', header: 'Avg age', title: 'Average age', sortKey: 'avgAge', defaultDir: 'asc', className: 'num', render: c => (c.squadSize ? decimal(c.avgAge, 1) : '–') },
    { id: 'avgCa', header: 'Avg Current', title: 'Average current ability', sortKey: 'avgCa', className: 'num', render: c => (c.squadSize ? <AbilityTile value={Math.round(c.avgCa)} /> : '–') },
    {
      id: 'bestPlayer', header: 'Best player', title: 'Player with the highest current ability', sortKey: 'bestCa',
      render: c => (c.bestPlayer ? (
        <span className="inline-flex items-center gap-1-5">
          <AbilityTile value={c.bestCa} />
          <span className="cell-truncate">{c.bestPlayer}</span>
        </span>
      ) : <span className="cell-muted">–</span>),
    },
    { id: 'totalWages', header: 'Wages p/w', title: 'Total weekly player wages', sortKey: 'totalWages', className: 'num', render: c => money(c.totalWages, m) },
    { id: 'totalValue', header: 'Sale value', title: 'Total squad sale value, excluding players who are not for sale', sortKey: 'totalValue', className: 'num', render: c => money(c.totalValue, m) },
    { id: 'staffCount', header: 'Staff', title: 'Staff members', sortKey: 'staffCount', className: 'num', render: c => int(c.staffCount) },
  ];
}

export function ClubsPage({ route }: { route: Route }) {
  const { dataKey } = useStatus();
  const { money: m } = useSettings();
  const meta = useMeta();
  const drawer = useFilterDrawer('club-filters');

  const [query, setQuery] = useStoredState<ClubQuery>('clubs.query', { withSquad: true }, validQuery);
  const [sort, setSort] = useStoredState<Sort | null>('clubs.sort', null, validSort);
  const [limit, setLimit] = useStoredState<number>('clubs.limit', 100, v => (typeof v === 'number' && (PAGE_SIZES as readonly number[]).includes(v) ? v : null));

  const debounced = useDebouncedValue(query, 300);
  const cleaned = useMemo(() => cleanQuery(debounced), [debounced]);
  const qJson = JSON.stringify(cleaned);
  const [page, setPage] = useState({ q: '', offset: 0 });
  const offset = page.q === qJson ? page.offset : 0;
  const req: SearchRequest<ClubQuery> = { query: cleaned, sort: sort ?? undefined, offset, limit };
  const { data, loading, error, reload } = useFetch(dataKey ? `${JSON.stringify(req)}|${dataKey}` : null, signal => api.searchClubs(req, { signal }));
  const rows: readonly Club[] = data?.rows ?? [];
  useEffect(() => {
    setBrowseList('club', rows.map(r => r.id));
  }, [rows]);

  const columns = useMemo(() => clubColumns(m), [m]);
  const chips = useMemo(() => clubChips(query), [query]);
  const onOpen = useCallback((c: Club) => navigate(clubHref(c.id)), []);
  const set = <K extends keyof ClubQuery>(k: K, v: ClubQuery[K]) => {
    const next = { ...query };
    if (v === undefined || (Array.isArray(v) && v.length === 0)) delete next[k];
    else next[k] = v;
    setQuery(next);
  };
  const nationOpts = useMemo(() => toOptions(meta.nations), [meta.nations]);
  const leagueOpts = useMemo(() => leagueOptions(meta), [meta]);
  const total = data?.total ?? 0;
  const selectedKey = route.page === 'clubs' && route.id ? Number(route.id) : null;

  return (
    <div className="layout-search" data-filters={drawer.dataFilters}>
      <aside className="layout-search__sidebar" id={drawer.panelId} aria-label="Club filters">
        <FilterPanel titleRef={drawer.titleRef} chips={chips} query={query} onChange={setQuery} onReset={() => setQuery({})} onClose={drawer.close}>
          <FilterSection id="clubs.general" title="General" count={chips.length} defaultOpen>
            <TextField label="Name" aside="contains" value={query.text ?? ''} onChange={v => set('text', v || undefined)} search placeholder="Search clubs" />
            <MultiSelect label="Nation" options={nationOpts} value={query.nations} onChange={v => set('nations', v)} />
            <MultiSelect label="League" options={leagueOpts} value={query.leagues} onChange={v => set('leagues', v)} />
            <RangeInput label="Reputation" value={query.reputation} onChange={r => set('reputation', r)} min={0} max={10000} />
            <Checkbox checked={!!query.withSquad} onChange={v => set('withSquad', v ? true : undefined)}>
              Only clubs with a loaded squad
            </Checkbox>
          </FilterSection>
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
              : `${int(total)} ${total === 1 ? 'club' : 'clubs'} found${chips.length > 0 ? ' (filtered)' : ''}`}
          </h2>
        </div>
        {error && !data ? (
          <div className="results__body"><div className="page"><ErrorBlock message={error} onRetry={reload} /></div></div>
        ) : (
          <DataTable<Club>
            label="Clubs"
            columns={columns}
            rows={rows}
            rowKey={clubKey}
            sort={sort}
            implicitSort={{ key: 'reputation', dir: 'desc' }}
            onSort={setSort}
            onOpen={onOpen}
            selectedKey={selectedKey}
            loading={loading}
            stickyFirst
            scrollClassName="table-scroll--flush"
            empty={
              <EmptyState
                title={data ? 'No clubs match these filters' : 'Searching…'}
                actions={chips.length > 0 && <button type="button" className="btn btn--primary" onClick={() => setQuery({})}>Reset filters</button>}
              />
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
        </div>
      </section>
    </div>
  );
}

const clubKey = (c: Club) => c.id;
