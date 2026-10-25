// Shortlists: create / rename / delete lists (GET/PUT /api/shortlists), view a list's players through
// /api/players/search {shortlistId}, notes per player, export, add to compare. #/shortlists/:id selects a list.
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { PlayerQuery, SearchRequest, Sort } from '../../../shared/api.ts';
import type { SlfFileInfo } from '../../../shared/api.ts';
import type { Player, Shortlist } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import type { Column } from '../components/DataTable.tsx';
import { ConfirmModal } from '../components/Drawer.tsx';
import { Callout, EmptyState, ErrorBlock } from '../components/EmptyState.tsx';
import { Segmented } from '../components/Inputs.tsx';
import { Menu, MenuItem, MenuLabel, Popover } from '../components/Popover.tsx';
import { setBrowseList } from '../lib/browse.ts';
import { COLUMN_PRESETS } from '../lib/columns.ts';
import { int } from '../lib/format.ts';
import { formatRoute, navigate, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useFilterDrawer } from '../lib/useFilterDrawer.ts';
import { useCompare } from '../state/compare.tsx';
import { useSettings } from '../state/settings.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { useStatus } from '../state/status.tsx';
import { PlayerListTable } from './PlayerListTable.tsx';
import { validSort } from './PlayersPage.tsx';

const VIEWS = COLUMN_PRESETS.map(p => ({ value: p.id, label: p.label }));

export function ShortlistsPage({ route }: { route: Route }) {
  const shortlists = useShortlists();
  const { lists, loaded } = shortlists;
  const drawer = useFilterDrawer('shortlist-lists');
  const selectedId = route.id && lists.some(l => l.id === route.id) ? route.id : null;
  const selected = lists.find(l => l.id === selectedId) ?? null;

  // Default to the active (or first) list.
  useEffect(() => {
    if (!loaded || selectedId || !lists.length) return;
    const target = lists.find(l => l.id === shortlists.activeId) ?? lists[0];
    navigate(formatRoute({ page: 'shortlists', id: target.id }), { replace: true });
  }, [loaded, selectedId, lists, shortlists.activeId]);

  // The viewed list becomes the target of the table stars.
  useEffect(() => {
    if (selectedId && selectedId !== shortlists.activeId) shortlists.setActiveId(selectedId);
  }, [selectedId, shortlists]);

  const createList = () => {
    const id = shortlists.create(`Shortlist ${lists.length + 1}`);
    navigate(formatRoute({ page: 'shortlists', id, params: { rename: '1' } }));
  };

  return (
    <div className="layout-search" data-filters={drawer.dataFilters}>
      <aside className="layout-search__sidebar" id={drawer.panelId} aria-label="Shortlists">
        <div className="filter-panel">
          <div className="filter-panel__header">
            <h2 className="filter-panel__title" tabIndex={-1} ref={drawer.titleRef}>Shortlists</h2>
            <button type="button" className="btn btn--ghost btn--sm btn--icon show-below-1100" aria-label="Close shortlists" onClick={drawer.close}>
              <span className="btn__glyph" aria-hidden="true">×</span>
            </button>
          </div>
          <div className="filter-panel__body">
            {!loaded && <p className="filter-section__body muted">Loading…</p>}
            {loaded && lists.length === 0 && (
              <p className="filter-section__body muted">No shortlists yet. Star a player in any table, or create one below.</p>
            )}
            <ul className="menu" aria-label="Your shortlists">
              {lists.map(l => (
                <li key={l.id}>
                  <a
                    className="menu__item"
                    href={formatRoute({ page: 'shortlists', id: l.id })}
                    aria-current={l.id === selectedId ? 'page' : undefined}
                    onClick={() => drawer.drawerMode && drawer.close()}
                  >
                    <span className="truncate">{l.name}</span>
                    <span className="badge badge--count ml-auto">{l.playerIds.length}</span>
                    {l.id === shortlists.activeId && <span className="visually-hidden"> (active)</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="filter-panel__footer stack gap-2">
            <button type="button" className="btn btn--primary" onClick={createList}>New shortlist</button>
            <ImportFromFm />
          </div>
        </div>
      </aside>
      <div className="layout-search__scrim" aria-hidden="true" onClick={drawer.close} />
      <section className="layout-search__results" aria-label="Shortlist players" inert={drawer.drawerMode}>
        {selected ? (
          <ListView key={selected.id} list={selected} route={route} toggleRef={drawer.toggleRef} onToggle={drawer.toggle} panelId={drawer.panelId} open={drawer.open} />
        ) : (
          <div className="results__body">
            <EmptyState
              title={loaded ? 'No shortlist selected' : 'Loading shortlists…'}
              actions={loaded && <button type="button" className="btn btn--primary" onClick={createList}>New shortlist</button>}
            >
              {loaded ? 'Create a shortlist, or star players in the Players table to collect them in your active list.' : null}
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}

interface ListViewProps {
  list: Shortlist;
  route: Route;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
  panelId: string;
  open: boolean;
}

function ListView({ list, route, toggleRef, onToggle, panelId, open }: ListViewProps) {
  const { dataKey, hasData } = useStatus();
  const { ratingsVersion } = useSettings();
  const shortlists = useShortlists();
  const compare = useCompare();
  const [sort, setSort] = useStoredState<Sort | null>('shortlist.sort', null, validSort);
  const [view, setView] = useStoredState<string>('shortlist.view', 'general', v => (typeof v === 'string' && COLUMN_PRESETS.some(p => p.id === v) ? v : null));
  const [renaming, setRenaming] = useState(route.params.rename === '1');
  const [name, setName] = useState(list.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(list.name), [list.name]);
  useEffect(() => {
    if (renaming) requestAnimationFrame(() => renameRef.current?.select());
  }, [renaming]);

  const query: PlayerQuery = useMemo(() => ({ shortlistId: list.id }), [list.id]);
  const req: SearchRequest<PlayerQuery> = { query, sort: sort ?? undefined, offset: 0, limit: 1000 };
  const ids = list.playerIds.join(',');
  const { data, loading, error, reload } = useFetch(
    hasData && dataKey && list.playerIds.length ? `${JSON.stringify(req)}|${ids}|${dataKey}|${ratingsVersion}` : null,
    signal => api.searchPlayers(req, { signal }),
  );
  const rows: readonly Player[] = list.playerIds.length ? data?.rows ?? [] : [];
  useEffect(() => {
    setBrowseList('player', rows.map(r => r.id));
  }, [rows]);

  const columns = COLUMN_PRESETS.find(p => p.id === view)?.columns ?? COLUMN_PRESETS[0].columns;
  const notes = list.notes;
  const extraColumns = useMemo<Column<Player>[]>(() => [
    {
      id: 'note',
      header: 'Note',
      title: 'Your note for this player',
      className: 'col-note',
      render: p => <NoteInput listId={list.id} player={p} value={notes[String(p.id)] ?? ''} />,
    },
    {
      id: 'remove',
      header: <span className="visually-hidden">Remove</span>,
      className: 'col-icon',
      render: p => (
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--icon"
          aria-label={`Remove ${p.name} from ${list.name}`}
          title="Remove from this list"
          onClick={() => shortlists.toggle(p.id, list.id)}
        >
          <span className="btn__glyph" aria-hidden="true">×</span>
        </button>
      ),
    },
  ], [list.id, list.name, notes, shortlists]);

  const commitRename = () => {
    setRenaming(false);
    const t = name.trim();
    if (t && t !== list.name) shortlists.rename(list.id, t);
    else setName(list.name);
    if (route.params.rename) navigate(formatRoute({ page: 'shortlists', id: list.id }), { replace: true });
  };

  const doExport = async (format: 'csv' | 'html') => {
    try {
      await api.exportPlayers({ query, sort: sort ?? undefined, columns, format });
    } catch {
      // toast shown by the client
    }
  };

  const [savingFm, setSavingFm] = useState(false);
  const saveToFm = async () => {
    setSavingFm(true);
    try {
      const res = await api.exportShortlist(list.name, list.playerIds);
      toast.info(`Saved "${res.file}" (${res.players} players) to your FM shortlists folder. Open it in FM via Scouting → Shortlist → Load.`, { ms: 6000 });
    } catch {
      // toast shown by the client
    } finally {
      setSavingFm(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <button
          ref={toggleRef}
          type="button"
          className="btn btn--secondary btn--sm show-below-1100"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          Lists
        </button>
        {renaming ? (
          <input
            ref={renameRef}
            className="input input--sm"
            aria-label="Shortlist name"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setName(list.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <h2 className="strong">{list.name}</h2>
        )}
        <span className="toolbar__count" aria-live="polite"><strong>{int(list.playerIds.length)}</strong> players</span>
        {shortlists.activeId === list.id && <span className="badge badge--accent" title="Stars in tables add to this list">Active</span>}
        <span className="toolbar__spacer" />
        <Segmented label="Columns" value={view} onChange={setView} options={VIEWS} />
        <span className="toolbar__divider" aria-hidden="true" />
        {!renaming && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRenaming(true)}>Rename</button>}
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={!rows.length}
          onClick={() => compare.addMany(rows.slice(0, 4).map(r => r.id))}
        >
          Compare first 4
        </button>
        <Popover label="Export" buttonClassName="btn btn--secondary btn--sm" align="end" disabled={!list.playerIds.length}>
          {close => (
            <Menu label="Export">
              <MenuItem onSelect={() => { close(); void saveToFm(); }}>Save to FM (.slf)</MenuItem>
              <MenuItem onSelect={() => { close(); void doExport('csv'); }} disabled={!rows.length}>CSV (opens in Excel)</MenuItem>
              <MenuItem onSelect={() => { close(); void doExport('html'); }} disabled={!rows.length}>HTML table</MenuItem>
            </Menu>
          )}
        </Popover>
        {savingFm && <span className="visually-hidden" aria-live="polite">Saving to FM…</span>}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(true)}>Delete</button>
      </div>

      {!hasData ? (
        <div className="results__body">
          <div className="page">
            <Callout variant="info" title="Load the game to see these players">
              The list keeps {int(list.playerIds.length)} player IDs. Load the running game or a snapshot to show their details.
            </Callout>
          </div>
        </div>
      ) : error && !data ? (
        <div className="results__body"><div className="page"><ErrorBlock message={error} onRetry={reload} /></div></div>
      ) : (
        <PlayerListTable
          label={`${list.name} players`}
          rows={rows}
          columns={columns}
          route={route}
          sort={sort}
          onSort={setSort}
          loading={loading}
          scrollClassName="table-scroll--flush"
          extraColumns={extraColumns}
          empty={
            <EmptyState title="This shortlist is empty">
              Star players in the Players table (or press <span className="kbd">S</span> on a row) while this list is active.
            </EmptyState>
          }
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete shortlist?"
          message={`"${list.name}" and its notes will be deleted. Players are not affected.`}
          confirmLabel="Delete shortlist"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            shortlists.remove(list.id);
            toast.info(`Deleted "${list.name}".`);
            navigate(formatRoute({ page: 'shortlists' }), { replace: true });
          }}
        />
      )}
    </>
  );
}

// Lists Genie Scout .slf files in the FM shortlists folder and imports one into a new scout shortlist.
function ImportFromFm() {
  const shortlists = useShortlists();
  const [files, setFiles] = useState<SlfFileInfo[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    setLoading(true);
    api.fmShortlistFiles({ quiet: true }).then(
      f => { setFiles(f); setLoading(false); },
      () => { setFiles([]); setLoading(false); },
    );
  };

  const doImport = async (f: SlfFileInfo) => {
    try {
      const res = await api.importShortlist(f.file);
      const ids = [...res.matched.map(m => m.id), ...res.unmatched];
      const id = shortlists.create(res.name || f.name || 'Imported shortlist');
      shortlists.addMany(ids, id);
      navigate(formatRoute({ page: 'shortlists', id }));
      const miss = res.unmatched.length ? ` ${res.unmatched.length} not in this game.` : '';
      toast.info(`Imported ${res.matched.length} of ${res.total} players from "${f.file}".${miss}`, { ms: 6000 });
    } catch {
      // toast shown by the client
    }
  };

  return (
    <Popover label="Import from FM" buttonClassName="btn btn--secondary" align="start" up onOpen={refresh}>
      {close => (
        <Menu label="Genie Scout shortlists">
          {loading && <MenuLabel>Loading…</MenuLabel>}
          {!loading && files && files.length === 0 && <MenuLabel>No .slf files found in your FM shortlists folder.</MenuLabel>}
          {files?.map(f => (
            <MenuItem key={f.file} onSelect={() => { close(); void doImport(f); }} title={`${f.file} · saved ${new Date(f.savedAt).toLocaleDateString()}`}>
              {f.name || f.file} <span className="muted">({f.players})</span>
            </MenuItem>
          ))}
        </Menu>
      )}
    </Popover>
  );
}

function NoteInput({ listId, player, value }: { listId: string; player: Player; value: string }) {
  const shortlists = useShortlists();
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  return (
    <input
      className="input input--sm"
      aria-label={`Note for ${player.name}`}
      placeholder="Add a note…"
      value={text}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; }}
      onChange={e => {
        setText(e.target.value);
        shortlists.setNote(listId, player.id, e.target.value);
      }}
    />
  );
}
