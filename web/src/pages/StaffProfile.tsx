// Staff profile drawer: attributes grouped Coaching / Mental / Knowledge / Medical / Data / Chairman (hidden),
// unverified badges, coaching stars per training category, role suitability, contract and personality.
import { useId, type KeyboardEvent } from 'react';
import { PERSONALITY, PERSONALITY_LABELS, STAFF_ATTR_LABELS } from '../../../shared/attributes.ts';
import { STAFF_ROLES, STAFF_ROLE_BY_ID, TRAINING_CATEGORIES } from '../../../shared/staffRoles.ts';
import type { Staff } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { Drawer, DrawerHeader } from '../components/Drawer.tsx';
import { Callout, ErrorBlock, LoadingBlock } from '../components/EmptyState.tsx';
import { TabList, TabPanels, type TabDef } from '../components/Tabs.tsx';
import { AbilityMeter, AttrTile, MeterRow, RatingTile, Stars } from '../components/Values.tsx';
import { neighbours, useBrowseList } from '../lib/browse.ts';
import { date, money as fmtMoney, wage } from '../lib/format.ts';
import { clubHref, navigate, staffHref, type Route } from '../lib/router.ts';
import { useStoredState } from '../lib/storage.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useSettings } from '../state/settings.tsx';
import { useStatus } from '../state/status.tsx';
import { STAFF_ATTR_GROUPS, UNVERIFIED } from './staffColumns.tsx';

type TabId = 'attributes' | 'coaching' | 'roles' | 'contract';
const TABS: TabDef<TabId>[] = [
  { id: 'attributes', label: 'Attributes' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'roles', label: 'Roles' },
  { id: 'contract', label: 'Contract & personality' },
];

interface StaffProfileProps {
  id: number;
  route: Route;
  browse: boolean;
  onClose: () => void;
}

export function StaffProfile({ id, route, browse, onClose }: StaffProfileProps) {
  const { dataKey } = useStatus();
  const nameId = useId();
  const tabsBase = useId();
  const [tab, setTab] = useStoredState<TabId>('staffProfile.tab', 'attributes', v => (TABS.some(t => t.id === v) ? (v as TabId) : null));
  const list = useBrowseList('staff');
  const nav = browse ? neighbours(list, id) : { prev: null, next: null, index: -1 };
  const { data: s, loading, error, reload } = useFetch(dataKey ? `${id}|${dataKey}` : null, signal => api.staff(id, { signal }));

  const go = (target: number | null) => {
    if (target !== null) navigate(staffHref(route, target), { replace: true });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); go(nav.prev); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); go(nav.next); }
  };

  return (
    <Drawer labelledBy={nameId} ariaLabel="Staff profile" onClose={onClose}>
      <div className="flex flex-col h-full min-w-0" onKeyDown={onKeyDown}>
        <DrawerHeader eyebrow={nav.index >= 0 ? `Staff ${nav.index + 1} of ${list.length}` : 'Staff'} onClose={onClose} closeLabel="Close profile">
          {browse && (
            <>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Previous staff member" title="Previous (Alt+↑)" disabled={nav.prev === null} onClick={() => go(nav.prev)}>
                <span className="btn__glyph" aria-hidden="true">‹</span>
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Next staff member" title="Next (Alt+↓)" disabled={nav.next === null} onClick={() => go(nav.next)}>
                <span className="btn__glyph" aria-hidden="true">›</span>
              </button>
            </>
          )}
        </DrawerHeader>
        {!s && loading && <LoadingBlock label="Loading staff member…" />}
        {!s && error && <div className="tab-panel"><ErrorBlock message={error} onRetry={reload} /></div>}
        {s && (
          <>
            <StaffHeader s={s} nameId={nameId} stale={s.id !== id || loading} />
            <TabList base={tabsBase} tabs={TABS} selected={tab} onSelect={setTab} label="Profile sections" />
            <div className="drawer__body">
              <TabPanels
                base={tabsBase}
                tabs={TABS}
                selected={tab}
                render={t => {
                  switch (t) {
                    case 'attributes': return <AttributesTab s={s} />;
                    case 'coaching': return <CoachingTab s={s} />;
                    case 'roles': return <RolesTab s={s} />;
                    case 'contract': return <ContractTab s={s} />;
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

function StaffHeader({ s, nameId, stale }: { s: Staff; nameId: string; stale: boolean }) {
  const { money } = useSettings();
  const best = s.bestRole ? STAFF_ROLE_BY_ID[s.bestRole.id] : undefined;
  return (
    <header className="profile-header" aria-busy={stale || undefined}>
      <div className="profile-header__identity">
        <div className="profile-header__avatar" aria-hidden="true">{(s.job || 'ST').slice(0, 3).toUpperCase()}</div>
        <div className="profile-header__titles">
          <h2 className="profile-header__name" id={nameId}>
            <span className="profile-header__name-text">{s.name}</span>
          </h2>
          <ul className="profile-header__meta">
            <li>{s.age} yrs</li>
            <li>{s.nations.join(' / ') || '–'}</li>
            <li>{s.job || 'Staff'}</li>
            <li>{s.clubId !== null ? <a href={clubHref(s.clubId)}>{s.club}</a> : 'Unattached'}{s.league ? ` · ${s.league}` : ''}</li>
          </ul>
          <div className="profile-header__tags">
            {s.personalityLabel && <span className="badge badge--accent">{s.personalityLabel}</span>}
            {s.clubId === null && <span className="badge badge--positive">Free</span>}
            {s.alsoPlayer && <span className="badge">Player-coach</span>}
          </div>
        </div>
      </div>
      <dl className="profile-header__stats">
        <div className="stat">
          <dt className="stat__label">Ability</dt>
          <dd className="stat__value"><AbilityMeter ca={s.ca} pa={s.pa} /></dd>
        </div>
        <div className="stat">
          <dt className="stat__label">Wage</dt>
          <dd className="stat__value">{s.contract ? wage(s.contract.wage, money) : '–'}</dd>
          <dd className="stat__sub">{s.contract?.expires ? `until ${date(s.contract.expires)}` : 'no contract'}</dd>
        </div>
        <div className="stat">
          <dt className="stat__label">Best role</dt>
          <dd className="stat__value"><RatingTile value={best && s.bestRole.rating ? s.bestRole.rating : null} /></dd>
          <dd className="stat__sub">{best && s.bestRole.rating ? best.name : '–'}</dd>
        </div>
      </dl>
    </header>
  );
}

function AttributesTab({ s }: { s: Staff }) {
  const anyUnverified = STAFF_ATTR_GROUPS.some(g => g.keys.some(k => UNVERIFIED.has(k)));
  return (
    <div className="stack gap-4">
      {anyUnverified && (
        <Callout variant="warning" title="Some staff values are unverified">
          Tiles with a dashed outline come from memory offsets whose labels are not yet confirmed against Genie Scout.
        </Callout>
      )}
      <div className="attr-grid">
        {STAFF_ATTR_GROUPS.map(g => {
          const hasUnv = g.keys.some(k => UNVERIFIED.has(k));
          return (
            <section key={g.id} className="attr-group" aria-labelledby={`sg-${s.id}-${g.id}`}>
              <h3 className="attr-group__title" id={`sg-${s.id}-${g.id}`}>
                {g.title}
                {hasUnv && <span className="badge badge--unverified" title="Label not yet confirmed against Genie Scout">unverified</span>}
              </h3>
              <ul className="attr-list">
                {g.keys.map(k => {
                  const unv = UNVERIFIED.has(k);
                  return (
                    <li key={k} className="attr-row">
                      <span className="attr-row__label" title={unv ? `${STAFF_ATTR_LABELS[k]} - label not yet confirmed against Genie Scout` : STAFF_ATTR_LABELS[k]}>
                        {STAFF_ATTR_LABELS[k]}
                        {unv && <span className="visually-hidden"> (unverified)</span>}
                      </span>
                      <span />
                      <AttrTile value={s.attrs[k]} attrKey={k} unverified={unv} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CoachingTab({ s }: { s: Staff }) {
  return (
    <div className="stack gap-3">
      <p className="small muted">
        Estimated FM training stars per category (0–5 in half steps) from the coaching attributes plus determination,
        discipline and motivating.
      </p>
      <table className="data-table">
        <caption className="visually-hidden">Coaching stars per training category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Main attributes</th>
            <th scope="col">Stars</th>
          </tr>
        </thead>
        <tbody>
          {TRAINING_CATEGORIES.map(c => {
            const v = s.coachingStars?.[c.id] ?? 0;
            const unv = UNVERIFIED.has(c.primary) || UNVERIFIED.has(c.secondary);
            return (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                <td className="cell-muted">
                  {STAFF_ATTR_LABELS[c.primary]}, {STAFF_ATTR_LABELS[c.secondary]}
                  {unv && <> <span className="badge badge--unverified" title="Uses an unverified attribute">unverified</span></>}
                </td>
                <td>
                  <span className="inline-flex items-center gap-1-5">
                    <Stars value={v} />
                    <span className="tabular small">{v.toFixed(1)}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RolesTab({ s }: { s: Staff }) {
  const rows = STAFF_ROLES.map(r => ({ r, v: s.ratings?.[r.id] ?? 0 })).sort((a, b) => b.v - a.v);
  const allZero = rows.every(x => !x.v);
  return (
    <div className="stack gap-3">
      {allZero ? (
        <p className="muted">No staff role ratings for this person (board members such as chairmen are not rated).</p>
      ) : (
        <ul className="meter-list" aria-label="Staff role suitability">
          {rows.map((x, i) => (
            <MeterRow key={x.r.id} label={x.r.name} value={x.v} best={i === 0 && x.v > 0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ContractTab({ s }: { s: Staff }) {
  const { money } = useSettings();
  const c = s.contract;
  return (
    <div className="stack gap-4">
      <dl className="kv kv--cols-2 kv--divided">
        <div className="kv__row"><dt>Job</dt><dd>{s.job || '–'}</dd></div>
        <div className="kv__row"><dt>Club</dt><dd>{s.clubId !== null ? <a href={clubHref(s.clubId)}>{s.club}</a> : 'Unattached'}</dd></div>
        <div className="kv__row"><dt>Wage</dt><dd className="tabular">{c ? wage(c.wage, money) : '–'}</dd></div>
        <div className="kv__row"><dt>Expires</dt><dd className="tabular">{date(c?.expires)}</dd></div>
        <div className="kv__row">
          <dt>Release clauses</dt>
          <dd>{c && c.releaseClauses.length ? c.releaseClauses.map(r => `${r.type} ${fmtMoney(r.amount, money)}`).join(', ') : 'None'}</dd>
        </div>
        <div className="kv__row"><dt>Reputation</dt><dd className="tabular">{s.currentRep} current · {s.homeRep} home · {s.worldRep} world</dd></div>
        <div className="kv__row"><dt>FM unique ID</dt><dd className="mono">{s.id}</dd></div>
      </dl>
      <section className="card" aria-labelledby={`sp-${s.id}`}>
        <div className="card__header">
          <h3 className="card__title" id={`sp-${s.id}`}>Personality</h3>
          {s.personalityLabel && <span className="badge badge--accent">{s.personalityLabel}</span>}
        </div>
        <div className="card__body">
          <ul className="attr-list">
            {PERSONALITY.map(k => (
              <li key={k} className="attr-row">
                <span className="attr-row__label">{PERSONALITY_LABELS[k]}</span>
                <span />
                <AttrTile value={s.personality?.[k]} attrKey={k} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
