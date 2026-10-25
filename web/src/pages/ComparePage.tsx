// Compare up to four players side by side (docs/ui-design.md section 11). Best value per row is marked
// (highest, or lowest for INVERTED_KEYS and wage); ties all marked; all-equal rows get no marker.
import { useId, useMemo, useState, type ReactNode } from 'react';
import {
  ATTR_LABELS, GOALKEEPING, HIDDEN, MENTAL, PERSONALITY, PERSONALITY_LABELS, PHYSICAL, TECHNICAL,
  type PlayerAttrKey,
} from '../../../shared/attributes.ts';
import { ROLE_BY_ID, roleLabel } from '../../../shared/roles.ts';
import type { Player, PlayerDetail } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { EmptyState, ErrorBlock, LoadingBlock, Spinner } from '../components/EmptyState.tsx';
import { AbilityMeter, AbilityTile, AttrTile, RatingTile } from '../components/Values.tsx';
import { useDebouncedValue } from '../lib/debounce.ts';
import { date, saleValue, wage } from '../lib/format.ts';
import { formatRoute, playerHref, type Route } from '../lib/router.ts';
import { INVERTED_KEYS } from '../lib/tiers.ts';
import { useFetch } from '../lib/useFetch.ts';
import { COMPARE_MAX, useCompare } from '../state/compare.tsx';
import { useSettings } from '../state/settings.tsx';
import { useStatus } from '../state/status.tsx';
import { ROLE_GROUPS, roleOptionLabel } from './PlayerFilters.tsx';

type Num = number | null | undefined;

/** Indices of the best values; empty when fewer than two values or all equal. */
function bestIndices(values: readonly Num[], lowWins = false): Set<number> {
  const nums = values.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null));
  const present = nums.filter((v): v is number => v !== null);
  if (present.length < 2) return new Set();
  const best = lowWins ? Math.min(...present) : Math.max(...present);
  if (present.every(v => v === best)) return new Set();
  const out = new Set<number>();
  nums.forEach((v, i) => {
    if (v === best) out.add(i);
  });
  return out;
}

interface RowDef {
  id: string;
  label: string;
  title?: string;
  /** Numeric value for "best" (omit for text facts). */
  value?: (p: PlayerDetail) => Num;
  lowWins?: boolean;
  render: (p: PlayerDetail) => ReactNode;
}

export function ComparePage({ route }: { route: Route }) {
  const { dataKey } = useStatus();
  const { money, ratingsVersion } = useSettings();
  const compare = useCompare();
  const ids = compare.ids;
  const roleSelectId = useId();
  const [roleId, setRoleId] = useState('');

  const { data, loading, error, reload } = useFetch(
    dataKey && ids.length ? `${ids.join(',')}|${dataKey}|${ratingsVersion}` : null,
    async signal => {
      const results = await Promise.allSettled(ids.map(id => api.player(id, { signal, quiet: true })));
      const found: PlayerDetail[] = [];
      const missing: number[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') found.push(r.value);
        else missing.push(ids[i]);
      });
      return { found, missing };
    },
  );

  // Keep the selection order (results may be stale while a new fetch runs).
  const players = useMemo(() => {
    const byId = new Map((data?.found ?? []).map(p => [p.id, p]));
    return ids.map(id => byId.get(id)).filter((p): p is PlayerDetail => p !== undefined);
  }, [data, ids]);

  const effectiveRole = roleId || players[0]?.bestRole?.id || '';

  const rowGroups = useMemo(() => {
    const attrRows = (keys: readonly PlayerAttrKey[]): RowDef[] => keys.map(k => ({
      id: `attr:${k}`,
      label: ATTR_LABELS[k],
      value: p => p.attrs[k],
      lowWins: INVERTED_KEYS.has(k),
      render: p => <AttrTile value={p.attrs[k]} attrKey={k} />,
    }));
    const role = ROLE_BY_ID[effectiveRole];
    const roleValue = (p: PlayerDetail) => p.roleRatings.find(r => r.id === effectiveRole)?.rating;
    const facts: RowDef[] = [
      { id: 'age', label: 'Age', render: p => p.age },
      { id: 'club', label: 'Club', render: p => (p.clubId !== null ? p.club : 'Free agent') },
      { id: 'nation', label: 'Nationality', render: p => p.nations[0] ?? '–' },
      { id: 'pos', label: 'Position', render: p => p.positionText || p.bestPosition },
      { id: 'ca', label: 'Current ability', value: p => p.ca, render: p => <AbilityTile value={p.ca} /> },
      { id: 'pa', label: 'Potential ability', value: p => p.pa, render: p => <AbilityTile value={p.pa} /> },
      { id: 'value', label: 'Sale value', render: p => saleValue(p.value, money) },
      { id: 'wage', label: 'Wage', value: p => p.contract?.wage, lowWins: true, render: p => (p.contract ? wage(p.contract.wage, money) : '–') },
      { id: 'expires', label: 'Contract expires', render: p => date(p.contract?.expires) },
      { id: 'height', label: 'Height', render: p => (p.height ? `${p.height} cm` : '–') },
      { id: 'personality', label: 'Personality', render: p => p.personalityLabel || '–' },
      {
        id: 'best', label: 'Best role', value: p => p.bestRole?.rating,
        render: p => (
          <span className="inline-flex items-center gap-1-5">
            <RatingTile value={p.bestRole?.rating} />
            <span className="cell-sub">{p.bestRole ? ROLE_BY_ID[p.bestRole.id]?.id ?? '' : ''}</span>
          </span>
        ),
      },
      {
        id: 'role', label: role ? roleLabel(role) : 'Role', title: 'Rating for the chosen role',
        value: roleValue, render: p => <RatingTile value={roleValue(p)} />,
      },
    ];
    return [
      { title: 'Overview', rows: facts },
      { title: 'Technical', rows: attrRows(TECHNICAL) },
      { title: 'Mental', rows: attrRows(MENTAL) },
      { title: 'Physical', rows: attrRows(PHYSICAL) },
      { title: 'Goalkeeping', rows: attrRows(GOALKEEPING) },
      { title: 'Hidden', rows: attrRows(HIDDEN) },
      {
        title: 'Personality',
        rows: PERSONALITY.map<RowDef>(k => ({
          id: `pers:${k}`,
          label: PERSONALITY_LABELS[k],
          value: p => p.personality[k],
          lowWins: INVERTED_KEYS.has(k),
          render: p => <AttrTile value={p.personality[k]} attrKey={k} />,
        })),
      },
    ];
  }, [effectiveRole, money]);

  const cols = Math.max(2, Math.min(COMPARE_MAX, players.length + (players.length < COMPARE_MAX ? 1 : 0)));
  const showAdd = ids.length < COMPARE_MAX;

  return (
    <div className="page page--wide">
      <div className="page__inner">
        {/* The page <h1> is in the FM header; this is the section strip. */}
        <div className="fm-section-bar">
          <h2 className="fm-section-title">{ids.length} of {COMPARE_MAX} players compared</h2>
          <div className="fm-section-bar__actions">
            <div className="field field--inline">
              <label className="field__label" htmlFor={roleSelectId}>Role row</label>
              <select id={roleSelectId} className="select select--sm" value={roleId} onChange={e => setRoleId(e.target.value)}>
                <option value="">First player's best role</option>
                {ROLE_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.roles.map(r => <option key={r.id} value={r.id}>{roleOptionLabel(r)}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" disabled={!ids.length} onClick={compare.clear}>Clear all</button>
          </div>
        </div>

        {error && !data && <ErrorBlock message={error} onRetry={reload} />}
        {data && data.missing.length > 0 && (
          <div className="callout" data-variant="warning">
            <div className="callout__content">
              <p className="callout__title">Some players are not in the loaded data</p>
              <p className="callout__body">IDs {data.missing.join(', ')} were not found (another save or snapshot?).</p>
            </div>
            <div className="callout__actions">
              <button type="button" className="btn btn--sm" onClick={() => data.missing.forEach(id => compare.remove(id))}>Remove them</button>
            </div>
          </div>
        )}

        {!ids.length ? (
          <EmptyState
            title="Nothing to compare yet"
            actions={<a className="btn btn--primary" href={formatRoute({ page: 'players' })}>Find players</a>}
          >
            Tick the compare box on player rows (or press <span className="kbd">C</span>), or use “Compare” in a profile. Up to four players.
            <div className="w-full"><AddSlot /></div>
          </EmptyState>
        ) : !players.length && loading ? (
          <LoadingBlock label="Loading players…" />
        ) : (
          <div className="table-scroll table-scroll--auto" role="region" aria-label="Comparison" tabIndex={0} aria-busy={loading || undefined}>
            <table className="compare-grid" data-cols={String(cols)}>
              <caption className="visually-hidden">Player comparison; best value in each row marked</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="visually-hidden">Attribute</span></th>
                  {players.map((p, i) => (
                    <th key={p.id} scope="col">
                      <div className="compare-grid__head">
                        <a className="compare-grid__name link-btn" href={playerHref(route, p.id)} title={p.name}>{p.name}</a>
                        <span className="compare-grid__sub">{p.clubId !== null ? p.club : 'Free agent'} · {p.age}</span>
                        <AbilityMeter ca={p.ca} pa={p.pa} />
                        <div className="cluster justify-center">
                          <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={`Move ${p.name} left`} disabled={i === 0} onClick={() => compare.move(p.id, -1)}>
                            <span className="btn__glyph" aria-hidden="true">‹</span>
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={`Move ${p.name} right`} disabled={i === players.length - 1} onClick={() => compare.move(p.id, 1)}>
                            <span className="btn__glyph" aria-hidden="true">›</span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--icon compare-grid__remove"
                        aria-label={`Remove ${p.name} from comparison`}
                        onClick={() => compare.remove(p.id)}
                      >
                        <span className="btn__glyph" aria-hidden="true">×</span>
                      </button>
                    </th>
                  ))}
                  {showAdd && (
                    <th scope="col">
                      <AddSlot />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rowGroups.map(g => (
                  <SectionRows key={g.title} title={g.title} rows={g.rows} players={players} span={players.length + 1 + (showAdd ? 1 : 0)} addCell={showAdd} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {loading && players.length > 0 && <Spinner label="Updating" />}
      </div>
    </div>
  );
}

function SectionRows({ title, rows, players, span, addCell }: { title: string; rows: RowDef[]; players: PlayerDetail[]; span: number; addCell: boolean }) {
  return (
    <>
      <tr className="compare-grid__section">
        <th colSpan={span} scope="colgroup"><span>{title}</span></th>
      </tr>
      {rows.map(r => {
        const best = r.value ? bestIndices(players.map(p => r.value!(p)), r.lowWins) : new Set<number>();
        return (
          <tr key={r.id}>
            <th scope="row" title={r.title ?? (r.lowWins ? `${r.label} (lower is better)` : r.label)}>{r.label}</th>
            {players.map((p, i) => (
              <td key={p.id} className={best.has(i) ? 'is-best' : undefined}>
                {r.render(p)}
                {best.has(i) && <span className="visually-hidden">(best)</span>}
              </td>
            ))}
            {addCell && <td />}
          </tr>
        );
      })}
    </>
  );
}

/** Empty dashed slot that opens a small player search. */
function AddSlot() {
  const compare = useCompare();
  const { hasData } = useStatus();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 250);
  const inputId = useId();
  const { data, loading } = useFetch(
    open && hasData && q.length >= 2 ? `pick|${q}` : null,
    signal => api.searchPlayers({ query: { text: q }, sort: { key: 'ca', dir: 'desc' }, limit: 8 }, { signal, quiet: true }),
  );
  const results: Player[] = (data?.rows ?? []).filter(p => !compare.set.has(p.id));

  if (!open) {
    return (
      <button type="button" className="compare-grid__add" onClick={() => setOpen(true)} disabled={!hasData}>
        + Add player
      </button>
    );
  }
  return (
    <div className="stack gap-1 text-left">
      <label className="visually-hidden" htmlFor={inputId}>Find a player to add</label>
      <div className="search-box">
        <input
          id={inputId}
          className="input input--sm"
          type="search"
          autoFocus
          placeholder="Player name…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setText('');
            }
          }}
        />
      </div>
      {loading && <Spinner size="sm" label="Searching" />}
      {q.length >= 2 && !loading && results.length === 0 && <span className="xsmall muted">No matches</span>}
      <ul className="menu" aria-label="Matching players">
        {results.map(p => (
          <li key={p.id}>
            <button
              type="button"
              className="menu__item"
              onClick={() => {
                compare.add(p.id);
                setText('');
                setOpen(false);
              }}
            >
              <span className="truncate">{p.name}</span>
              <span className="ml-auto xsmall muted">{p.club || 'Free'} · {p.ca}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="link-btn link-btn--muted xsmall" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
