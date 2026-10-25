// Club drawer (wide): header with aggregates, squad table (reuses the players table, client-side sort) and staff.
import { useCallback, useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { Sort } from '../../../shared/api.ts';
import type { Staff } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { DataTable, sortRows } from '../components/DataTable.tsx';
import { Drawer, DrawerHeader } from '../components/Drawer.tsx';
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/EmptyState.tsx';
import { Segmented } from '../components/Inputs.tsx';
import { TabList, TabPanels, type TabDef } from '../components/Tabs.tsx';
import { AbilityTile } from '../components/Values.tsx';
import { neighbours, useBrowseList } from '../lib/browse.ts';
import { COLUMN_PRESETS } from '../lib/columns.ts';
import { decimal, int, money } from '../lib/format.ts';
import { clubHref, navigate, staffHref, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { initials } from '../lib/text.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useCompare } from '../state/compare.tsx';
import { useSettings } from '../state/settings.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { useStatus } from '../state/status.tsx';
import { PlayerListTable } from './PlayerListTable.tsx';
import { buildStaffColumns, staffSortValue } from './staffColumns.tsx';

type TabId = 'squad' | 'staff';

const SQUAD_VIEWS = COLUMN_PRESETS.map(p => ({ value: p.id, label: p.label }));
const STAFF_KEYS = ['name', 'age', 'nation', 'job', 'ca', 'pa', 'bestRole', 'wage', 'expires',
  'attr:attacking', 'attr:defending', 'attr:tactical', 'attr:technical', 'attr:judgingPlayerAbility', 'attr:judgingPlayerPotential'];

export function ClubProfile({ id, route, onClose }: { id: number; route: Route; onClose: () => void }) {
  const { dataKey, status } = useStatus();
  const { money: m } = useSettings();
  const shortlists = useShortlists();
  const compare = useCompare();
  const nameId = useId();
  const tabsBase = useId();
  const [tab, setTab] = useState<TabId>('squad');
  const [view, setView] = useStoredState<string>('club.squadView', 'general', v => (typeof v === 'string' && COLUMN_PRESETS.some(p => p.id === v) ? v : null));
  const [staffSort, setStaffSort] = useState<Sort>({ key: 'ca', dir: 'desc' });
  const list = useBrowseList('club');
  const nav = route.page === 'clubs' ? neighbours(list, id) : { prev: null, next: null, index: -1 };
  const { data: c, loading, error, reload } = useFetch(dataKey ? `${id}|${dataKey}` : null, signal => api.club(id, { signal }));

  const squadColumns = COLUMN_PRESETS.find(p => p.id === view)?.columns ?? COLUMN_PRESETS[0].columns;
  const staffColumns = useMemo(() => buildStaffColumns(STAFF_KEYS, { money: m, roleRatings: null, roleId: null }), [m]);
  const staffRows = useMemo(() => (c ? sortRows(c.staff, s => staffSortValue(s, staffSort.key), staffSort.dir) : []), [c, staffSort]);
  const openStaff = useCallback((s: Staff) => navigate(staffHref(route, s.id)), [route]);

  const go = (target: number | null) => {
    if (target !== null) navigate(clubHref(target), { replace: true });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); go(nav.prev); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); go(nav.next); }
  };

  const tabs: TabDef<TabId>[] = [
    { id: 'squad', label: <>Squad {c && <span className="badge badge--count">{c.players.length}</span>}</> },
    { id: 'staff', label: <>Staff {c && <span className="badge badge--count">{c.staff.length}</span>}</> },
  ];
  const isMine = status?.humanClubId === id;

  return (
    <Drawer labelledBy={nameId} ariaLabel="Club" onClose={onClose} wide>
      <div className="flex flex-col h-full min-w-0" onKeyDown={onKeyDown}>
        <DrawerHeader eyebrow={nav.index >= 0 ? `Club ${nav.index + 1} of ${list.length}` : 'Club'} onClose={onClose} closeLabel="Close club">
          {nav.index >= 0 && (
            <>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Previous club" title="Previous (Alt+↑)" disabled={nav.prev === null} onClick={() => go(nav.prev)}>
                <span className="btn__glyph" aria-hidden="true">‹</span>
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Next club" title="Next (Alt+↓)" disabled={nav.next === null} onClick={() => go(nav.next)}>
                <span className="btn__glyph" aria-hidden="true">›</span>
              </button>
            </>
          )}
          {c && c.players.length > 0 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              title="Add the whole squad to the active shortlist"
              onClick={() => shortlists.addMany(c.players.map(p => p.id))}
            >
              Shortlist squad
            </button>
          )}
        </DrawerHeader>

        {!c && loading && <LoadingBlock label="Loading club…" />}
        {!c && error && <div className="tab-panel"><ErrorBlock message={error} onRetry={reload} /></div>}
        {c && (
          <>
            <header className="profile-header" aria-busy={c.id !== id || loading || undefined}>
              <div className="profile-header__identity">
                <div className="profile-header__avatar" aria-hidden="true">{initials(c.shortName || c.name)}</div>
                <div className="profile-header__titles">
                  <h2 className="profile-header__name" id={nameId}>
                    <span className="profile-header__name-text">{c.name}</span>
                  </h2>
                  <ul className="profile-header__meta">
                    <li>{c.nation || '–'}</li>
                    <li>{c.league || 'No league'}</li>
                    <li>Reputation {int(c.reputation)}</li>
                  </ul>
                  <div className="profile-header__tags">
                    {isMine && <span className="badge badge--accent">Your club</span>}
                  </div>
                </div>
              </div>
              <dl className="profile-header__stats">
                <div className="stat"><dt className="stat__label">Squad</dt><dd className="stat__value">{int(c.squadSize)}</dd><dd className="stat__sub">avg age {c.squadSize ? decimal(c.avgAge, 1) : '–'}</dd></div>
                <div className="stat"><dt className="stat__label">Avg Current</dt><dd className="stat__value"><AbilityTile value={Math.round(c.avgCa)} /></dd><dd className="stat__sub">best {c.bestPlayer || '–'} ({c.bestCa || '–'})</dd></div>
                <div className="stat"><dt className="stat__label">Wages</dt><dd className="stat__value">{money(c.totalWages, m)}</dd><dd className="stat__sub">per week</dd></div>
                <div className="stat"><dt className="stat__label">Sale value</dt><dd className="stat__value">{money(c.totalValue, m)}</dd></div>
                <div className="stat"><dt className="stat__label">Staff</dt><dd className="stat__value">{int(c.staffCount)}</dd></div>
              </dl>
            </header>
            <TabList base={tabsBase} tabs={tabs} selected={tab} onSelect={setTab} label="Club sections" />
            <div className="drawer__body">
              <TabPanels
                base={tabsBase}
                tabs={tabs}
                selected={tab}
                render={t => t === 'squad' ? (
                  <div className="stack gap-3">
                    <div className="cluster">
                      <Segmented label="Squad columns" value={view} onChange={setView} options={SQUAD_VIEWS} />
                      <span className="spacer" />
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={!c.players.length}
                        title="Add the four players with the highest current ability to Compare"
                        onClick={() => compare.addMany([...c.players].sort((a, b) => b.ca - a.ca).slice(0, 4).map(p => p.id))}
                      >
                        Compare top 4
                      </button>
                    </div>
                    <PlayerListTable
                      label={`${c.name} squad`}
                      rows={c.players}
                      columns={squadColumns}
                      route={route}
                      scrollClassName="table-scroll--auto"
                      empty={<EmptyState compact title="No players loaded for this club" />}
                    />
                  </div>
                ) : (
                  <DataTable<Staff>
                    label={`${c.name} staff`}
                    columns={staffColumns}
                    rows={staffRows}
                    rowKey={s => s.id}
                    sort={staffSort}
                    onSort={setStaffSort}
                    onOpen={openStaff}
                    scrollClassName="table-scroll--auto"
                    grouped
                    empty={<EmptyState compact title="No staff loaded for this club" />}
                  />
                )}
              />
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
