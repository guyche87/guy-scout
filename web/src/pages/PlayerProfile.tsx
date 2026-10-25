// Player profile drawer: header, tabs (Overview, Attributes, Positions, Roles, Contract), shortlist / compare
// actions, prev/next through the current result page (Alt+↑/↓).
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  ATTR_LABELS, GOALKEEPING, HIDDEN, MENTAL, PERSONALITY, PERSONALITY_LABELS, PHYSICAL, POSITION_LABELS, POSITIONS,
  TECHNICAL, familiarityLabel, type PlayerAttrKey, type PositionKey,
} from '../../../shared/attributes.ts';
import { effectiveRole, ratingConfigFromSettings } from '../../../shared/ratings.ts';
import { DUTY_LABELS, ROLE_BY_ID, roleLabel } from '../../../shared/roles.ts';
import type { PlayerDetail } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { DataTable, sortRows, type Column } from '../components/DataTable.tsx';
import { Drawer, DrawerHeader } from '../components/Drawer.tsx';
import { ErrorBlock, LoadingBlock } from '../components/EmptyState.tsx';
import { Checkbox } from '../components/Inputs.tsx';
import { Pitch } from '../components/Pitch.tsx';
import { Menu, MenuItem, MenuLabel, MenuSeparator, Popover } from '../components/Popover.tsx';
import { TabList, TabPanels, type TabDef } from '../components/Tabs.tsx';
import { AbilityMeter, AttrTile, MeterRow, RatingTile, ShortlistStar } from '../components/Values.tsx';
import { neighbours, useBrowseList } from '../lib/browse.ts';
import { cssVars } from '../lib/css.ts';
import { DISPLAY_POSITIONS } from '../lib/columns.ts';
import { date, footStrength, height, money as fmtMoney, preferredFoot, saleValue, wage, weight } from '../lib/format.ts';
import { clubHref, navigate, playerHref, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { familiarity } from '../lib/tiers.ts';
import { toast } from '../lib/toast.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useCompare } from '../state/compare.tsx';
import { useSettings } from '../state/settings.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { useStatus } from '../state/status.tsx';

type TabId = 'overview' | 'attributes' | 'positions' | 'roles' | 'contract';
const TABS: TabDef<TabId>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'positions', label: 'Positions' },
  { id: 'roles', label: 'Roles' },
  { id: 'contract', label: 'Contract' },
];

interface PlayerProfileProps {
  id: number;
  route: Route;
  /** Prev/next through the players page's current results. */
  browse: boolean;
  onClose: () => void;
}

export function PlayerProfile({ id, route, browse, onClose }: PlayerProfileProps) {
  const { dataKey } = useStatus();
  const { ratingsVersion } = useSettings();
  const nameId = useId();
  const tabsBase = useId();
  const [tab, setTab] = useStoredState<TabId>('profile.tab', 'overview', v => (TABS.some(t => t.id === v) ? (v as TabId) : null));
  const list = useBrowseList('player');
  const nav = browse ? neighbours(list, id) : { prev: null, next: null, index: -1 };

  const { data, loading, error, reload } = useFetch(
    dataKey ? `${id}|${dataKey}|${ratingsVersion}` : null,
    signal => api.player(id, { signal }),
  );
  // While the next player loads, the previous one stays on screen (marked busy).
  const p = data;

  const go = (target: number | null) => {
    if (target === null) return;
    navigate(playerHref(route, target), { replace: true });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      go(nav.prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      go(nav.next);
    }
  };

  return (
    <Drawer labelledBy={nameId} ariaLabel="Player profile" onClose={onClose}>
      <div className="flex flex-col h-full min-w-0" onKeyDown={onKeyDown}>
        <DrawerHeader eyebrow={nav.index >= 0 ? `Player ${nav.index + 1} of ${list.length}` : 'Player'} onClose={onClose} closeLabel="Close profile">
          {browse && (
            <>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Previous player" title="Previous (Alt+↑)" disabled={nav.prev === null} onClick={() => go(nav.prev)}>
                <span className="btn__glyph" aria-hidden="true">‹</span>
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Next player" title="Next (Alt+↓)" disabled={nav.next === null} onClick={() => go(nav.next)}>
                <span className="btn__glyph" aria-hidden="true">›</span>
              </button>
            </>
          )}
          {p && <ProfileActions player={p} />}
        </DrawerHeader>

        {!p && loading && <LoadingBlock label="Loading player…" />}
        {!p && error && <div className="tab-panel"><ErrorBlock message={error} onRetry={reload} /></div>}
        {p && (
          <>
            <ProfileHeader p={p} nameId={nameId} stale={p.id !== id || loading} />
            <TabList base={tabsBase} tabs={TABS} selected={tab} onSelect={setTab} label="Profile sections" />
            <div className="drawer__body">
              <TabPanels
                base={tabsBase}
                tabs={TABS}
                selected={tab}
                render={t => {
                  switch (t) {
                    case 'overview': return <OverviewTab p={p} />;
                    case 'attributes': return <AttributesTab p={p} />;
                    case 'positions': return <PositionsTab p={p} />;
                    case 'roles': return <RolesTab p={p} />;
                    case 'contract': return <ContractTab p={p} />;
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

// ------------------------------------------------------------------ header + actions

function ProfileActions({ player: p }: { player: PlayerDetail }) {
  const shortlists = useShortlists();
  const compare = useCompare();
  const inCompare = compare.set.has(p.id);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(p.id));
      toast.success(`Copied FM unique ID ${p.id}.`);
    } catch {
      toast.warning(`Could not copy. The FM unique ID is ${p.id}.`, { ms: 10000 });
    }
  };

  return (
    <>
      <ShortlistStar on={shortlists.activeSet.has(p.id)} name={p.name} onToggle={() => shortlists.toggle(p.id)} size="md" />
      <Popover label="Lists" buttonClassName="btn btn--ghost btn--sm" ariaLabel="Add to shortlist" buttonTitle="Choose shortlists" align="end">
        {close => (
          <Menu label="Shortlists">
            <MenuLabel>Shortlists</MenuLabel>
            {shortlists.lists.map(l => (
              <MenuItem key={l.id} checked={l.playerIds.includes(p.id)} onSelect={() => shortlists.toggle(p.id, l.id)}>
                {l.name}
              </MenuItem>
            ))}
            {shortlists.lists.length > 0 && <MenuSeparator />}
            <MenuItem
              onSelect={() => {
                const id = shortlists.create(`Shortlist ${shortlists.lists.length + 1}`);
                shortlists.toggle(p.id, id);
                close();
              }}
            >
              New shortlist with this player
            </MenuItem>
          </Menu>
        )}
      </Popover>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-pressed={inCompare}
        title={inCompare ? 'Remove from compare' : 'Add to compare (up to 4)'}
        onClick={() => compare.toggle(p.id)}
      >
        Compare
      </button>
      <button type="button" className="btn btn--ghost btn--sm" title="Copy FM unique ID" onClick={() => void copyId()}>
        ID {p.id}
      </button>
    </>
  );
}

function ProfileHeader({ p, nameId, stale }: { p: PlayerDetail; nameId: string; stale: boolean }) {
  const { money } = useSettings();
  const foot = preferredFoot(p.attrs.leftFoot, p.attrs.rightFoot);
  const best = p.bestRole ? ROLE_BY_ID[p.bestRole.id] : undefined;
  return (
    <header className="profile-header" aria-busy={stale || undefined}>
      <div className="profile-header__identity">
        <div className="profile-header__avatar" aria-hidden="true">{p.bestPosition}</div>
        <div className="profile-header__titles">
          <h2 className="profile-header__name" id={nameId}>
            <span className="profile-header__name-text">{p.name}</span>
          </h2>
          <ul className="profile-header__meta">
            <li>{p.age} yrs{p.birthDate ? ` (${date(p.birthDate)})` : ''}</li>
            <li>{p.nations.join(' / ') || '–'}</li>
            <li>
              {p.clubId !== null ? <a href={clubHref(p.clubId)}>{p.club}</a> : 'Free agent'}
              {p.league ? ` · ${p.league}` : ''}
            </li>
            <li>{p.positionText || p.bestPosition}</li>
            <li>{height(p.height)} · {weight(p.weight)}</li>
            <li title={`Left ${footStrength(p.attrs.leftFoot)}, right ${footStrength(p.attrs.rightFoot)}`}>
              {foot === 'Either' ? 'Either foot' : `${foot} foot`} (L {p.attrs.leftFoot} / R {p.attrs.rightFoot})
            </li>
          </ul>
          <div className="profile-header__tags">
            {p.personalityLabel && <span className="badge badge--accent">{p.personalityLabel}</span>}
            {p.onLoan && <span className="badge badge--info">Loan{p.loanFromClub ? ` from ${p.loanFromClub}` : ''}</span>}
            {p.clubId === null && <span className="badge badge--positive">Free</span>}
            {p.contract?.transferListed && <span className="badge badge--warning">Listed</span>}
            {p.contract?.loanListed && <span className="badge badge--warning">Loan listed</span>}
            {(p.contract?.releaseClauses.length ?? 0) > 0 && <span className="badge badge--outline">Rel. clause</span>}
            {p.alsoStaff && <span className="badge">Player-coach</span>}
          </div>
        </div>
      </div>
      <dl className="profile-header__stats">
        <div className="stat">
          <dt className="stat__label">Ability</dt>
          <dd className="stat__value"><AbilityMeter ca={p.ca} pa={p.pa} /></dd>
        </div>
        <div className="stat">
          <dt className="stat__label">Sale value</dt>
          <dd className="stat__value">{saleValue(p.value, money)}</dd>
        </div>
        <div className="stat">
          <dt className="stat__label">Wage</dt>
          <dd className="stat__value">{p.contract ? wage(p.contract.wage, money) : '–'}</dd>
          <dd className="stat__sub">{p.contract?.expires ? `until ${date(p.contract.expires)}` : 'no contract'}</dd>
        </div>
        <div className="stat">
          <dt className="stat__label">Best role</dt>
          <dd className="stat__value"><RatingTile value={p.bestRole?.rating} /></dd>
          <dd className="stat__sub">{best ? roleLabel(best) : '–'}</dd>
        </div>
      </dl>
    </header>
  );
}

// ------------------------------------------------------------------ Overview

const KEY_HIDDEN: PlayerAttrKey[] = ['consistency', 'importantMatches', 'injuryProneness', 'dirtiness', 'versatility'];

function OverviewTab({ p }: { p: PlayerDetail }) {
  const top = p.roleRatings.slice(0, 5);
  return (
    <div className="stack gap-4">
      <section aria-labelledby="ov-report">
        <h3 className="eyebrow" id="ov-report">Scout report</h3>
        <div className="prose">
          {p.report.length ? p.report.map((para, i) => <p key={i}>{para}</p>) : <p className="muted">No report.</p>}
        </div>
      </section>
      <div className="card-grid">
        <section className="card" aria-labelledby="ov-roles">
          <div className="card__header"><h3 className="card__title" id="ov-roles">Top roles</h3></div>
          <div className="card__body">
            <ul className="meter-list" aria-label="Top role ratings">
              {top.map((r, i) => {
                const def = ROLE_BY_ID[r.id];
                return (
                  <MeterRow
                    key={r.id}
                    label={def ? def.name : r.id}
                    sub={def ? `${DUTY_LABELS[def.duty]} · ${def.positions.join('/')}` : undefined}
                    value={r.rating}
                    best={i === 0}
                  />
                );
              })}
            </ul>
          </div>
        </section>
        <section className="card" aria-labelledby="ov-hidden">
          <div className="card__header"><h3 className="card__title" id="ov-hidden">Key hidden attributes</h3></div>
          <div className="card__body">
            <ul className="attr-list">
              {KEY_HIDDEN.map(k => (
                <li key={k} className="attr-row">
                  <span className="attr-row__label">{ATTR_LABELS[k]}</span>
                  <span />
                  <AttrTile value={p.attrs[k]} attrKey={k} />
                </li>
              ))}
            </ul>
          </div>
        </section>
        {p.traits.length > 0 && (
          <section className="card" aria-labelledby="ov-traits">
            <div className="card__header"><h3 className="card__title" id="ov-traits">Traits</h3></div>
            <div className="card__body">
              <ul className="cluster" aria-label="Player traits">
                {p.traits.map(t => <li key={t} className="chip chip--sm"><span className="chip__label">{t}</span></li>)}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Attributes

function AttrGroup({
  title, keys, p, projected, emphasis, secondary,
}: {
  title: string;
  keys: readonly PlayerAttrKey[];
  p: PlayerDetail;
  projected: boolean;
  emphasis: { key: Set<string>; preferred: Set<string> };
  secondary?: boolean;
}) {
  const hid = useId();
  const vals = keys.map(k => p.attrs[k]).filter(v => v > 0);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return (
    <section className={secondary ? 'attr-group attr-group--secondary' : 'attr-group'} aria-labelledby={hid}>
      <h3 className="attr-group__title" id={hid}>
        {title} {avg > 0 && <span className="attr-group__avg">avg {avg.toFixed(1)}</span>}
      </h3>
      <ul className="attr-list">
        {keys.map(k => {
          const v = p.attrs[k];
          const proj = p.projected?.[k];
          const up = projected && typeof proj === 'number' && proj > v ? proj : null;
          const emph = emphasis.key.has(k) ? 'key' : emphasis.preferred.has(k) ? 'preferred' : undefined;
          return (
            <li key={k} className="attr-row" data-emphasis={emph}>
              <span className="attr-row__label" title={ATTR_LABELS[k]}>{ATTR_LABELS[k]}</span>
              {projected && (
                <span className={up !== null ? 'attr-row__proj attr-row__proj--up' : 'attr-row__proj'} title={up !== null ? `Projected at potential: ${up} (+${up - v})` : undefined}>
                  {up !== null ? `↑${up}` : ''}
                </span>
              )}
              {!projected && <span />}
              <AttrTile value={v} attrKey={k} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AttributesTab({ p }: { p: PlayerDetail }) {
  const { settings } = useSettings();
  const [projected, setProjected] = useState(false);
  const [roleId, setRoleId] = useState<string>(p.bestRole?.id ?? '');
  const cfg = useMemo(() => ratingConfigFromSettings(settings), [settings]);
  const emphasis = useMemo(() => {
    const r = ROLE_BY_ID[roleId];
    if (!r) return { key: new Set<string>(), preferred: new Set<string>() };
    const eff = effectiveRole(r, cfg);
    return { key: new Set<string>(eff.key), preferred: new Set<string>(eff.preferred) };
  }, [roleId, cfg]);
  const isGk = p.bestPosition === 'GK';
  const roleRating = p.roleRatings.find(r => r.id === roleId)?.rating;

  return (
    <div className="stack gap-4">
      <div className="cluster gap-3">
        <Checkbox checked={projected} onChange={setProjected} small>Show projected at potential</Checkbox>
        <div className="field field--inline" style={cssVars({ '--field-control-w': '240px' })}>
          <label className="field__label" htmlFor={`${p.id}-emph`}>Highlight role</label>
          <select id={`${p.id}-emph`} className="select select--sm" value={roleId} onChange={e => setRoleId(e.target.value)}>
            <option value="">None</option>
            {p.roleRatings.map(r => {
              const d = ROLE_BY_ID[r.id];
              return <option key={r.id} value={r.id}>{d ? roleLabel(d) : r.id} – {Math.round(r.rating)}%</option>;
            })}
          </select>
        </div>
        {roleId && roleRating !== undefined && <RatingTile value={roleRating} unit />}
      </div>
      {roleId && (
        <p className="xsmall muted">
          Bold with a solid bar = key attribute, dotted bar = preferred attribute for the highlighted role.
          {projected && ' ↑ = estimated value at potential.'}
        </p>
      )}
      <div className={isGk ? 'attr-grid attr-grid--gk' : 'attr-grid'}>
        {isGk && <AttrGroup title="Goalkeeping" keys={GOALKEEPING} p={p} projected={projected} emphasis={emphasis} />}
        <AttrGroup title="Technical" keys={TECHNICAL} p={p} projected={projected} emphasis={emphasis} secondary={isGk} />
        <AttrGroup title="Mental" keys={MENTAL} p={p} projected={projected} emphasis={emphasis} />
        <AttrGroup title="Physical" keys={PHYSICAL} p={p} projected={projected} emphasis={emphasis} />
      </div>
      <div className="card-grid">
        <section className="card" aria-labelledby={`${p.id}-hid`}>
          <div className="card__header"><h3 className="card__title" id={`${p.id}-hid`}>Hidden</h3></div>
          <div className="card__body">
            <ul className="attr-list">
              {HIDDEN.map(k => (
                <li key={k} className="attr-row">
                  <span className="attr-row__label">{ATTR_LABELS[k]}</span>
                  <span />
                  <AttrTile value={p.attrs[k]} attrKey={k} />
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="card" aria-labelledby={`${p.id}-pers`}>
          <div className="card__header">
            <h3 className="card__title" id={`${p.id}-pers`}>Personality</h3>
            {p.personalityLabel && <span className="badge badge--accent">{p.personalityLabel}</span>}
          </div>
          <div className="card__body">
            <ul className="attr-list">
              {PERSONALITY.map(k => (
                <li key={k} className="attr-row">
                  <span className="attr-row__label">{PERSONALITY_LABELS[k]}</span>
                  <span />
                  <AttrTile value={p.personality[k]} attrKey={k} />
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="card" aria-labelledby={`${p.id}-traits`}>
          <div className="card__header"><h3 className="card__title" id={`${p.id}-traits`}>Traits</h3></div>
          <div className="card__body">
            {p.traits.length ? (
              <ul className="cluster" aria-label="Player traits">
                {p.traits.map(t => <li key={t} className="chip chip--sm"><span className="chip__label">{t}</span></li>)}
              </ul>
            ) : (
              <p className="muted small">No player traits.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Positions

function PositionsTab({ p }: { p: PlayerDetail }) {
  const rows = [...POSITIONS].sort((a, b) => (p.positions[b] ?? 0) - (p.positions[a] ?? 0)
    || (p.positionRatings[b] ?? 0) - (p.positionRatings[a] ?? 0));
  return (
    <div className="card-grid" style={cssVars({ '--card-min-w': '260px' })}>
      <Pitch positions={p.positions} size="lg" caption={`${p.name}: positions`} />
      <div className="table-scroll table-scroll--auto" role="region" aria-label="Position familiarity" tabIndex={0}>
        <table className="data-table">
          <caption className="visually-hidden">Position familiarity and ratings, best first</caption>
          <thead>
            <tr>
              <th scope="col">Position</th>
              <th scope="col">Familiarity</th>
              <th scope="col" className="col-attr" title="Familiarity 0-20">0-20</th>
              <th scope="col" className="col-rating" title="Best role rating at this position">Rating %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(pos => {
              const v = p.positions[pos] ?? 0;
              return (
                <tr key={pos}>
                  <th scope="row" title={POSITION_LABELS[pos]}>{pos}</th>
                  <td className={familiarity(v) === 'ineffectual' ? 'cell-muted' : undefined}>{familiarityLabel(v)}</td>
                  <td className="col-attr"><AttrTile value={v} /></td>
                  <td className="col-rating"><RatingTile value={p.positionRatings[pos]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Roles

interface RoleRow { id: string; name: string; duty: string; positions: string; rating: number }

function RolesTab({ p }: { p: PlayerDetail }) {
  const [pos, setPos] = useState<PositionKey | ''>('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'rating', dir: 'desc' });
  const all = useMemo<RoleRow[]>(() => p.roleRatings.map(r => {
    const d = ROLE_BY_ID[r.id];
    return {
      id: r.id,
      name: d?.name ?? r.id,
      duty: d ? DUTY_LABELS[d.duty] : '',
      positions: d ? d.positions.join(', ') : '',
      rating: r.rating,
    };
  }), [p.roleRatings]);
  const rows = useMemo(() => {
    const filtered = pos ? all.filter(r => ROLE_BY_ID[r.id]?.positions.includes(pos)) : all;
    const get = (r: RoleRow) => (sort.key === 'rating' ? r.rating : sort.key === 'duty' ? r.duty : sort.key === 'positions' ? r.positions : r.name);
    return sortRows(filtered, get, sort.dir);
  }, [all, pos, sort]);
  const best = all[0]?.id;

  const columns = useMemo<Column<RoleRow>[]>(() => [
    {
      id: 'name', header: 'Role', sortKey: 'name', defaultDir: 'asc', rowHeader: true,
      render: r => <span className={r.id === best ? 'strong' : undefined}>{r.name}</span>,
    },
    { id: 'duty', header: 'Duty', sortKey: 'duty', defaultDir: 'asc', render: r => r.duty },
    { id: 'positions', header: 'Positions', sortKey: 'positions', defaultDir: 'asc', render: r => <span className="cell-muted">{r.positions}</span> },
    { id: 'rating', header: 'Rating %', sortKey: 'rating', className: 'col-rating', render: r => <RatingTile value={r.rating} /> },
  ], [best]);

  return (
    <div className="stack gap-3">
      <div className="field field--inline" style={cssVars({ '--field-control-w': '240px' })}>
        <label className="field__label" htmlFor={`${p.id}-rolepos`}>Position</label>
        <select id={`${p.id}-rolepos`} className="select select--sm" value={pos} onChange={e => setPos(e.target.value as PositionKey | '')}>
          <option value="">All positions</option>
          {DISPLAY_POSITIONS.map(x => <option key={x} value={x}>{x} – {POSITION_LABELS[x]}</option>)}
        </select>
      </div>
      <DataTable<RoleRow>
        label="Role ratings"
        columns={columns}
        rows={rows}
        rowKey={r => r.id}
        sort={sort}
        onSort={setSort}
        scrollClassName="table-scroll--auto"
        tableClassName="data-table--compact"
        wrap={false}
        empty={<p className="muted">No roles for this position.</p>}
      />
    </div>
  );
}

// ------------------------------------------------------------------ Contract

function ContractTab({ p }: { p: PlayerDetail }) {
  const { money } = useSettings();
  const c = p.contract;
  return (
    <div className="stack gap-4">
      <dl className="kv kv--cols-2 kv--divided">
        <div className="kv__row"><dt>Club</dt><dd>{p.clubId !== null ? <a href={clubHref(p.clubId)}>{p.club}</a> : 'Free agent'}</dd></div>
        <div className="kv__row"><dt>League</dt><dd>{p.league || '–'}</dd></div>
        <div className="kv__row"><dt>Wage</dt><dd className="tabular">{c ? wage(c.wage, money) : '–'}</dd></div>
        <div className="kv__row"><dt>Expires</dt><dd className="tabular">{date(c?.expires)}</dd></div>
        <div className="kv__row"><dt>Sale value</dt><dd className="tabular">{saleValue(p.value, money)}</dd></div>
        <div className="kv__row"><dt>Transfer listed</dt><dd>{c?.transferListed ? 'Yes' : 'No'}</dd></div>
        <div className="kv__row"><dt>Loan listed</dt><dd>{c?.loanListed ? 'Yes' : 'No'}</dd></div>
        <div className="kv__row">
          <dt>On loan</dt>
          <dd>
            {p.onLoan
              ? p.loanFromClubId !== null
                ? <>from <a href={clubHref(p.loanFromClubId)}>{p.loanFromClub || 'parent club'}</a></>
                : `from ${p.loanFromClub || 'another club'}`
              : 'No'}
          </dd>
        </div>
        <div className="kv__row"><dt>Reputation</dt><dd className="tabular">{p.currentRep} current · {p.worldRep} world</dd></div>
        <div className="kv__row"><dt>FM unique ID</dt><dd className="mono">{p.id}</dd></div>
      </dl>
      <section className="card card--flush" aria-labelledby={`${p.id}-rc`}>
        <div className="card__header"><h3 className="card__title" id={`${p.id}-rc`}>Release clauses</h3></div>
        <div className="card__body">
          {c && c.releaseClauses.length ? (
            <table className="data-table">
              <caption className="visually-hidden">Release clauses</caption>
              <thead><tr><th scope="col">Type</th><th scope="col" className="num">Amount</th></tr></thead>
              <tbody>
                {c.releaseClauses.map((rc, i) => (
                  <tr key={i}><td>{rc.type}</td><td className="num">{fmtMoney(rc.amount, money)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="card__body muted small">No release clauses.</p>
          )}
        </div>
      </section>
    </div>
  );
}
