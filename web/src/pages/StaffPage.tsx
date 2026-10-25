// Staff search: filters (name, club, nation, league, job, ranges, role + min rating, attribute minimums) and table.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchRequest, Sort, StaffQuery } from '../../../shared/api.ts';
import { STAFF_ATTR_LABELS } from '../../../shared/attributes.ts';
import { STAFF_ROLES } from '../../../shared/staffRoles.ts';
import type { Staff } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { ColumnChooser } from '../components/ColumnChooser.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { EmptyState, ErrorBlock } from '../components/EmptyState.tsx';
import { FilterPanel } from '../components/FilterPanel.tsx';
import { FilterSection } from '../components/FilterSection.tsx';
import { routeView } from '../components/FmSubtabs.tsx';
import { Checkbox, MinGrid, NumberInput, RangeInput, Segmented, SelectField, TextField, TriState } from '../components/Inputs.tsx';
import { MultiSelect, toOptions } from '../components/MultiSelect.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { setBrowseList } from '../lib/browse.ts';
import { cssVars } from '../lib/css.ts';
import { useDebouncedValue } from '../lib/debounce.ts';
import { int } from '../lib/format.ts';
import { cleanQuery, staffChips } from '../lib/query.ts';
import { navigate, staffHref, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useFilterDrawer } from '../lib/useFilterDrawer.ts';
import { useMeta } from '../state/meta.tsx';
import { useSettings } from '../state/settings.tsx';
import { useStatus } from '../state/status.tsx';
import { DENSITY_OPTIONS, PAGE_SIZES, densityClass, validDensity, validSort, type Density } from './PlayersPage.tsx';
import { leagueOptions } from './PlayerFilters.tsx';
import {
  DEFAULT_STAFF_COLUMNS, STAFF_ATTR_GROUPS, STAFF_CHOOSER, STAFF_COLUMN_GROUPS, STAFF_PRESETS, UNVERIFIED,
  buildStaffColumns, staffHasGroups, validStaffColumns,
} from './staffColumns.tsx';

function validQuery(v: unknown): StaffQuery | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as StaffQuery) : null;
}

function withRole(keys: readonly string[], roleId: string | undefined): string[] {
  if (!roleId) return [...keys];
  const k = `role:${roleId}`;
  if (keys.includes(k)) return [...keys];
  const out = [...keys];
  const after = Math.max(out.indexOf('bestRole'), out.indexOf('pa'), out.indexOf('name'));
  out.splice(after + 1, 0, k);
  return out;
}

export function StaffPage({ route }: { route: Route }) {
  const { status, dataKey } = useStatus();
  const { money } = useSettings();
  const meta = useMeta();
  const drawer = useFilterDrawer('staff-filters');

  const [query, setQuery] = useStoredState<StaffQuery>('staff.query', {}, validQuery);
  const [sort, setSort] = useStoredState<Sort | null>('staff.sort', null, validSort);
  const [limit, setLimit] = useStoredState<number>('staff.limit', 100, v => (typeof v === 'number' && (PAGE_SIZES as readonly number[]).includes(v) ? v : null));
  const [columns, setColumns] = useStoredState<string[]>('staff.columns', () => [...DEFAULT_STAFF_COLUMNS], validStaffColumns);
  const [density, setDensity] = useStoredState<Density>('staff.rowDensity', 'comfy', validDensity);

  // Sub-tab view (?view=myclub) applied on top of the sidebar filters.
  const view = routeView(route);
  const debounced = useDebouncedValue(query, 300);
  const cleaned = useMemo<StaffQuery>(() => {
    const q = cleanQuery(debounced);
    return view === 'myclub' ? { ...q, myClub: true } : q;
  }, [debounced, view]);
  const qJson = JSON.stringify(cleaned);
  const [page, setPage] = useState({ q: '', offset: 0 });
  const offset = page.q === qJson ? page.offset : 0;

  const req: SearchRequest<StaffQuery> = { query: cleaned, sort: sort ?? undefined, offset, limit };
  const { data, loading, error, reload } = useFetch(
    dataKey ? `${JSON.stringify(req)}|${dataKey}` : null,
    signal => api.searchStaff(req, { signal }),
  );
  const rows: readonly Staff[] = data?.rows ?? [];
  useEffect(() => {
    setBrowseList('staff', rows.map(r => r.id));
  }, [rows]);

  const roleId = cleaned.role ?? null;
  const keys = useMemo(() => withRole(columns, cleaned.role), [columns, cleaned.role]);
  const tableColumns = useMemo(
    () => buildStaffColumns(keys, { money, roleRatings: data?.roleRatings ?? null, roleId }),
    [keys, money, data?.roleRatings, roleId],
  );

  const chips = useMemo(() => staffChips(query, status?.humanClub ?? null), [query, status?.humanClub]);
  const routeRef = useRef(route);
  routeRef.current = route;
  const onOpen = useCallback((s: Staff) => navigate(staffHref(routeRef.current, s.id)), []);
  const implicitSort: Sort = roleId ? { key: `role:${roleId}`, dir: 'desc' } : { key: 'currentRep', dir: 'desc' };
  const selectedKey = route.page === 'staff' && route.id ? Number(route.id) : null;
  const total = data?.total ?? 0;

  const set = <K extends keyof StaffQuery>(k: K, v: StaffQuery[K]) => {
    const next = { ...query };
    if (v === undefined || (Array.isArray(v) && v.length === 0)) delete next[k];
    else next[k] = v;
    setQuery(next);
  };

  const nationOpts = useMemo(() => toOptions(meta.nations), [meta.nations]);
  const leagueOpts = useMemo(() => leagueOptions(meta), [meta]);
  const jobOpts = useMemo(() => toOptions(meta.jobs), [meta.jobs]);
  const generalCount = [query.text?.trim(), query.club?.trim(), query.nations?.length, query.leagues?.length, query.jobs?.length,
    query.age, query.ca, query.pa, query.freeAgent !== undefined, query.myClub, query.role].filter(Boolean).length;
  const attrCount = Object.values(query.attrs ?? {}).filter(v => typeof v === 'number' && v > 0).length;

  return (
    <div className="layout-search" data-filters={drawer.dataFilters}>
      <aside className="layout-search__sidebar" id={drawer.panelId} aria-label="Staff filters">
        <FilterPanel
          titleRef={drawer.titleRef}
          chips={chips}
          query={query}
          onChange={setQuery}
          onReset={() => setQuery({})}
          onClose={drawer.close}
        >
          <FilterSection id="staff.general" title="General" count={generalCount} defaultOpen>
            <TextField label="Name" aside="contains" value={query.text ?? ''} onChange={v => set('text', v || undefined)} search placeholder="Search staff" />
            <TextField label="Club" aside="contains" value={query.club ?? ''} onChange={v => set('club', v || undefined)} />
            <MultiSelect label="Nationality" options={nationOpts} value={query.nations} onChange={v => set('nations', v)} />
            <MultiSelect label="League" options={leagueOpts} value={query.leagues} onChange={v => set('leagues', v)} />
            <MultiSelect label="Job" options={jobOpts} value={query.jobs} onChange={v => set('jobs', v)} />
            <div className="field-row">
              <RangeInput label="Age" value={query.age} onChange={r => set('age', r)} min={14} max={90} />
              <RangeInput label="Current" value={query.ca} onChange={r => set('ca', r)} min={1} max={200} />
            </div>
            <div className="field-row">
              <RangeInput label="Potential" value={query.pa} onChange={r => set('pa', r)} min={1} max={200} />
              <span />
            </div>
            <SelectField label="Staff role" value={query.role ?? ''} onChange={v => setQuery(v ? { ...query, role: v } : { ...query, role: undefined, minRoleRating: undefined })}>
              <option value="">Any role</option>
              {STAFF_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </SelectField>
            <div className="field field--inline" style={cssVars({ '--field-control-w': '64px' })}>
              <label className="field__label" htmlFor="sf-rolemin">Min. role rating %</label>
              <NumberInput id="sf-rolemin" value={query.minRoleRating} onChange={v => set('minRoleRating', v)} min={0} max={100} placeholder="–" />
            </div>
            <Checkbox checked={!!query.myClub} onChange={v => set('myClub', v ? true : undefined)} disabled={!status?.humanClub}>
              My club only{status?.humanClub ? ` (${status.humanClub})` : ''}
            </Checkbox>
            <TriState label="Free agents" value={query.freeAgent} onChange={v => set('freeAgent', v)} yes="Only" no="Exclude" />
          </FilterSection>
          <FilterSection id="staff.attrs" title="Attributes" count={attrCount}>
            <p className="field__hint">
              Minimum values (1–20). <span className="badge badge--unverified">unverified</span> marks labels not yet confirmed against Genie Scout.
            </p>
            {STAFF_ATTR_GROUPS.map(g => (
              <div key={g.id} className="stack" role="group" aria-label={`${g.title} minimums`}>
                <div className="flex items-center gap-1-5">
                  <span className="eyebrow">{g.title}</span>
                  {g.keys.some(k => UNVERIFIED.has(k)) && (
                    <span className="badge badge--unverified" title="Label not yet confirmed against Genie Scout">unverified</span>
                  )}
                  {g.keys.some(k => (query.attrs?.[k] ?? 0) > 0) && (
                    <button
                      type="button"
                      className="link-btn link-btn--muted xsmall ml-auto"
                      aria-label={`Clear ${g.title.toLowerCase()} minimums`}
                      onClick={() => {
                        const attrs = { ...query.attrs };
                        for (const k of g.keys) delete attrs[k];
                        set('attrs', Object.keys(attrs).length ? attrs : undefined);
                      }}
                    >
                      clear
                    </button>
                  )}
                </div>
                <MinGrid
                  keys={g.keys}
                  labels={STAFF_ATTR_LABELS}
                  values={query.attrs}
                  unverified={g.keys.filter(k => UNVERIFIED.has(k))}
                  onChange={vals => {
                    const attrs = { ...query.attrs };
                    for (const k of g.keys) delete attrs[k];
                    Object.assign(attrs, vals);
                    set('attrs', Object.keys(attrs).length ? attrs : undefined);
                  }}
                />
              </div>
            ))}
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
              : `${int(total)} staff found${chips.length > 0 || view !== 'all' ? ' (filtered)' : ''}`}
          </h2>
          <div className="fm-section-bar__actions">
            <div className="toolbar__group hide-below-900">
              <Segmented label="Row density" value={density} onChange={setDensity} options={DENSITY_OPTIONS} />
            </div>
            <span className="toolbar__divider" aria-hidden="true" />
            <ColumnChooser
              columns={STAFF_CHOOSER}
              groups={STAFF_COLUMN_GROUPS}
              value={columns}
              onChange={k => setColumns(validStaffColumns(k) ?? [...DEFAULT_STAFF_COLUMNS])}
              presets={STAFF_PRESETS}
              defaultColumns={DEFAULT_STAFF_COLUMNS}
            />
          </div>
        </div>
        {error && !data ? (
          <div className="results__body"><div className="page"><ErrorBlock message={error} onRetry={reload} /></div></div>
        ) : (
          <DataTable<Staff>
            label="Staff"
            columns={tableColumns}
            rows={rows}
            rowKey={staffKey}
            sort={sort}
            implicitSort={implicitSort}
            onSort={setSort}
            onOpen={onOpen}
            selectedKey={selectedKey}
            loading={loading}
            grouped={staffHasGroups(keys)}
            tableClassName={densityClass(density)}
            scrollClassName="table-scroll--flush"
            empty={
              <EmptyState
                title={data ? 'No staff match these filters' : 'Searching…'}
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

const staffKey = (s: Staff) => s.id;
