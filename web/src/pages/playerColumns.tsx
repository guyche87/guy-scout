// Turns column keys (sort-key syntax) into DataTable columns for Player rows. Used by the players search,
// club squads and shortlists. Cells that depend on outside state (star, compare) read it from a ref; the
// table's rowState signature re-renders just the affected rows.
import type { RefObject } from 'react';
import type { PositionKey } from '../../../shared/attributes.ts';
import { ROLE_BY_ID, roleLabel } from '../../../shared/roles.ts';
import { roleRatingById, type RatingConfig } from '../../../shared/ratings.ts';
import type { Player } from '../../../shared/types.ts';
import type { Column } from '../components/DataTable.tsx';
import { AbilityTile, AttrTile, RatingTile, ShortlistStar } from '../components/Values.tsx';
import { playerColumn, type PlayerColumnDef } from '../lib/columns.ts';
import { SALE_VALUE_CAP, dateShort, int, money, saleValue, wage, type MoneyFormat } from '../lib/format.ts';
import { clubHref } from '../lib/router.ts';

export interface PlayerCellCtx {
  money: MoneyFormat;
  ratingCfg: RatingConfig;
  /** Ratings for the query role, index-aligned with the rows (SearchResponse.roleRatings). */
  roleRatings: readonly number[] | null;
  roleId: string | null;
  /** Live state read at render time; rows re-render through rowState when these change. */
  state: RefObject<{
    starred: ReadonlySet<number>;
    compared: ReadonlySet<number>;
    toggleStar: (id: number) => void;
    toggleCompare: (id: number) => void;
  }>;
  /** Show the compare checkbox column. */
  selectable?: boolean;
}

function roleShort(id: string): string {
  const r = ROLE_BY_ID[id];
  return r ? r.id : id;
}

function bool(v: boolean | undefined | null) {
  return v ? <span className="badge badge--outline">Yes</span> : <span className="cell-muted">–</span>;
}

function renderCell(def: PlayerColumnDef, p: Player, i: number, ctx: PlayerCellCtx) {
  const key = def.key;
  const colon = key.indexOf(':');
  const arg = colon < 0 ? '' : key.slice(colon + 1);
  switch (def.kind) {
    case 'name': {
      const s = ctx.state.current;
      const nations = p.nations.join(' / ');
      return (
        <div className="cell-name">
          <ShortlistStar on={s?.starred.has(p.id) ?? false} name={p.name} onToggle={() => s?.toggleStar(p.id)} />
          <div className="cell-stack">
            <button type="button" className="link-btn" data-open="" aria-haspopup="dialog" title={p.name}>
              {p.name}
            </button>
            <span className="cell-stack__sub" title={nations}>{nations || '–'}</span>
          </div>
          {p.onLoan && <span className="badge badge--info" title={p.loanFromClub ? `On loan from ${p.loanFromClub}` : 'On loan'}>Loan</span>}
          {p.clubId === null && <span className="badge badge--positive">Free</span>}
          {p.contract?.transferListed && <span className="badge badge--warning" title="Transfer listed">Listed</span>}
          {p.alsoStaff && <span className="badge badge--outline" title="Also a member of staff">P-C</span>}
        </div>
      );
    }
    case 'club':
      if (p.clubId === null) {
        return (
          <div className="cell-stack">
            <span className="cell-stack__main">Free agent</span>
            <span className="cell-stack__sub">No club</span>
          </div>
        );
      }
      return (
        <div className="cell-stack">
          <a className="link-btn" href={clubHref(p.clubId)} title={p.club}>
            {p.club}
          </a>
          <span className="cell-stack__sub" title={p.onLoan && p.loanFromClub ? `On loan from ${p.loanFromClub}` : p.league}>
            {p.onLoan && p.loanFromClub ? `On loan from ${p.loanFromClub}` : p.league || '–'}
          </span>
        </div>
      );
    case 'nation':
      return (
        <span className="cell-truncate" title={p.nations.join(' / ')}>{p.nations.join(' / ') || '–'}</span>
      );
    case 'text': {
      if (key === 'positionText') {
        const role = p.bestRole ? ROLE_BY_ID[p.bestRole.id] : undefined;
        const pos = p.positionText || p.bestPosition;
        return (
          <div className="cell-stack">
            <span className="cell-stack__main" title={pos}>{pos}</span>
            <span className="cell-stack__sub" title={role ? `Best role: ${roleLabel(role)}` : undefined}>
              {role ? roleLabel(role) : '–'}
            </span>
          </div>
        );
      }
      const v = (p as unknown as Record<string, unknown>)[key];
      const text = typeof v === 'string' && v ? v : '–';
      return <span className="cell-truncate" title={text}>{text}</span>;
    }
    case 'int': {
      const v = (p as unknown as Record<string, unknown>)[key];
      return typeof v === 'number' ? int(v) : '–';
    }
    case 'height':
      return p.height ? int(p.height) : '–';
    case 'weight':
      return p.weight ? int(p.weight) : '–';
    case 'ca':
      return <AbilityTile value={p.ca} />;
    case 'pa':
      return <AbilityTile value={p.pa} />;
    case 'growth': {
      const g = p.pa - p.ca;
      return g > 0 ? <span className="text-positive">+{g}</span> : <span className="cell-muted">0</span>;
    }
    case 'attr':
      return <AttrTile value={(p.attrs as Record<string, number>)[arg]} attrKey={arg} />;
    case 'pers':
      return <AttrTile value={(p.personality as Record<string, number>)[arg]} attrKey={arg} />;
    case 'fam':
      return <AttrTile value={p.positions[arg as PositionKey]} />;
    case 'rating':
      return <RatingTile value={p.positionRatings[arg as PositionKey]} />;
    case 'bestRole':
      return (
        <span className="inline-flex items-center gap-1-5" title={p.bestRole ? ROLE_BY_ID[p.bestRole.id]?.name : undefined}>
          <RatingTile value={p.bestRole?.rating} />
          <span className="cell-sub">{p.bestRole ? roleShort(p.bestRole.id) : ''}</span>
        </span>
      );
    case 'role': {
      const v = ctx.roleId === arg && ctx.roleRatings ? ctx.roleRatings[i] : roleRatingById(p.attrs, arg, ctx.ratingCfg);
      return <RatingTile value={v} />;
    }
    case 'value':
      if (p.value >= SALE_VALUE_CAP) {
        return (
          <span className="value-pill value-pill--wide value-pill--outline value-pill--muted" title="Capped at FM's maximum asking price: effectively not for sale">
            {saleValue(p.value, ctx.money)}
          </span>
        );
      }
      return (
        <span className="value-pill value-pill--wide">
          <span className="value-pill__knob" aria-hidden="true" />
          {saleValue(p.value, ctx.money)}
        </span>
      );
    case 'wage':
      return p.contract
        ? <span className="value-pill">{wage(p.contract.wage, ctx.money)}</span>
        : <span className="cell-muted">–</span>;
    case 'money': {
      const clauses = p.contract?.releaseClauses ?? [];
      if (!clauses.length) return <span className="cell-muted">–</span>;
      return money(Math.max(...clauses.map(c => c.amount)), ctx.money);
    }
    case 'date':
      return key === 'expires' ? dateShort(p.contract?.expires) : dateShort(p.birthDate);
    case 'bool':
      if (key === 'transferListed') return bool(p.contract?.transferListed);
      if (key === 'loanListed') return bool(p.contract?.loanListed);
      return bool(p.onLoan);
    default:
      return '–';
  }
}

function classFor(def: PlayerColumnDef): string | undefined {
  switch (def.kind) {
    case 'name': return 'col-name';
    case 'attr': case 'pers': case 'fam': return 'col-attr';
    case 'rating': case 'role': case 'bestRole': return 'col-rating';
    case 'int': case 'height': case 'weight': case 'ca': case 'pa': case 'growth':
    case 'value': case 'wage': case 'money': case 'date':
      return 'num';
    case 'bool': return 'text-center';
    default: return undefined;
  }
}

const GROUPED_KINDS = new Set(['attr', 'pers', 'fam', 'rating', 'role']);

export function buildPlayerColumns(keys: readonly string[], ctx: PlayerCellCtx): Column<Player>[] {
  const out: Column<Player>[] = [];
  let stickyLeft = 0;
  if (ctx.selectable) {
    out.push({
      id: 'compare',
      header: <span className="visually-hidden">Compare</span>,
      title: 'Select for compare',
      className: 'col-icon',
      stickyLeft: 0,
      render: p => {
        const s = ctx.state.current;
        return (
          <label className="checkbox" title="Compare">
            <input type="checkbox" checked={s?.compared.has(p.id) ?? false} onChange={() => s?.toggleCompare(p.id)} />
            <span className="visually-hidden">Compare {p.name}</span>
          </label>
        );
      },
    });
    stickyLeft = 32;
  }
  let prevGroup = '';
  for (const key of keys) {
    const def = playerColumn(key);
    if (!def) continue;
    const group = GROUPED_KINDS.has(def.kind) ? def.group : '';
    const isName = def.kind === 'name';
    out.push({
      id: def.key,
      header: def.label,
      title: def.title,
      sortKey: def.sortable ? def.key : undefined,
      defaultDir: def.defaultDir,
      className: classFor(def),
      stickyLeft: isName ? stickyLeft : undefined,
      rowHeader: isName,
      group,
      groupStart: group !== '' && group !== prevGroup,
      render: (p, i) => renderCell(def, p, i, ctx),
    });
    prevGroup = group;
  }
  return out;
}

/** True when any visible column belongs to an attribute-like group (use the grouped header). */
export function hasGroupedColumns(keys: readonly string[]): boolean {
  return keys.some(k => {
    const d = playerColumn(k);
    return d !== undefined && GROUPED_KINDS.has(d.kind);
  });
}

/** Client-side sort value for a column key (club squads, shortlists without server sort). */
export function playerSortValue(p: Player, key: string, cfg: RatingConfig): number | string | null {
  const colon = key.indexOf(':');
  const prefix = colon < 0 ? '' : key.slice(0, colon);
  const arg = colon < 0 ? key : key.slice(colon + 1);
  switch (prefix) {
    case 'attr': return (p.attrs as Record<string, number>)[arg] ?? null;
    case 'pers': return (p.personality as Record<string, number>)[arg] ?? null;
    case 'pos': return p.positions[arg as PositionKey] ?? null;
    case 'posr': return p.positionRatings[arg as PositionKey] ?? null;
    case 'role': return roleRatingById(p.attrs, arg, cfg);
    default: break;
  }
  switch (key) {
    case 'wage': return p.contract?.wage ?? null;
    case 'expires': return p.contract?.expires ?? null;
    case 'bestRole': return p.bestRole?.rating ?? null;
    case 'growth': return p.pa - p.ca;
    case 'nation': return p.nations[0] ?? null;
    case 'releaseClause': {
      const c = p.contract?.releaseClauses ?? [];
      return c.length ? Math.max(...c.map(x => x.amount)) : null;
    }
    case 'transferListed': return p.contract ? +p.contract.transferListed : null;
    case 'loanListed': return p.contract ? +p.contract.loanListed : null;
    default: {
      const v = (p as unknown as Record<string, unknown>)[key];
      if (typeof v === 'number' || typeof v === 'string') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      return null;
    }
  }
}
