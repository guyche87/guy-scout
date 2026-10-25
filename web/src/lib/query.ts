// Helpers for filter state: the UI edits PlayerQuery/StaffQuery/ClubQuery objects directly; these functions
// strip empty values before sending, describe active filters as removable chips and build quick presets.
import type { ClubQuery, PlayerQuery, Range, StaffQuery } from '../../../shared/api.ts';
import {
  ATTR_LABELS, PERSONALITY_LABELS, STAFF_ATTR_LABELS, type PersonalityKey, type PlayerAttrKey, type StaffAttrKey,
} from '../../../shared/attributes.ts';
import { ROLE_BY_ID, roleLabel } from '../../../shared/roles.ts';
import { STAFF_ROLE_BY_ID } from '../../../shared/staffRoles.ts';
import { date, money, nextJulyFirst, parseMoneyInput, type MoneyFormat } from './format.ts';

export function isEmptyRange(r: Range | undefined): boolean {
  return !r || (r.min === undefined && r.max === undefined);
}

function cleanRange(r: Range | undefined): Range | undefined {
  if (!r) return undefined;
  const out: Range = {};
  if (typeof r.min === 'number' && Number.isFinite(r.min)) out.min = r.min;
  if (typeof r.max === 'number' && Number.isFinite(r.max)) out.max = r.max;
  return out.min === undefined && out.max === undefined ? undefined : out;
}

function cleanMinima<K extends string>(m: Partial<Record<K, number>> | undefined): Partial<Record<K, number>> | undefined {
  if (!m) return undefined;
  const out: Partial<Record<K, number>> = {};
  let any = false;
  for (const [k, v] of Object.entries(m) as [K, number | undefined][]) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k] = v;
      any = true;
    }
  }
  return any ? out : undefined;
}

/** Removes empty strings, empty arrays, empty ranges and undefined flags. Works on any of the query types. */
export function cleanQuery<Q extends object>(q: Q): Q {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) out[k] = t;
      continue;
    }
    if (Array.isArray(v)) {
      if (v.length) out[k] = v;
      continue;
    }
    if (typeof v === 'object') {
      if (k === 'attrs' || k === 'personality') {
        const m = cleanMinima(v as Record<string, number>);
        if (m) out[k] = m;
        continue;
      }
      const r = cleanRange(v as Range);
      if (r) out[k] = r;
      continue;
    }
    out[k] = v;
  }
  return out as Q;
}

export function isEmptyQuery(q: object): boolean {
  return Object.keys(cleanQuery(q)).length === 0;
}

// ------------------------------------------------------------------ chips

export interface Chip<Q> {
  id: string;
  label: string;
  remove: (q: Q) => Q;
}

function without<Q extends object>(q: Q, key: keyof Q & string): Q {
  const next = { ...q } as unknown as Record<string, unknown>;
  delete next[key];
  return next as unknown as Q;
}

function rangeText(label: string, r: Range | undefined, fmt: (n: number) => string = String): string | null {
  if (isEmptyRange(r)) return null;
  const { min, max } = r!;
  if (min !== undefined && max !== undefined) return min === max ? `${label} ${fmt(min)}` : `${label} ${fmt(min)}–${fmt(max)}`;
  if (min !== undefined) return `${label} ≥ ${fmt(min)}`;
  return `${label} ≤ ${fmt(max!)}`;
}

function listText(label: string, values: readonly string[] | undefined, max = 2): string | null {
  if (!values || !values.length) return null;
  const head = values.slice(0, max).join(', ');
  return `${label}: ${head}${values.length > max ? ` +${values.length - max}` : ''}`;
}

const triText = (label: string, v: boolean | undefined) => (v === undefined ? null : v ? label : `Not ${label.toLowerCase()}`);

function pushIf<Q>(out: Chip<Q>[], id: string, label: string | null, remove: (q: Q) => Q): void {
  if (label) out.push({ id, label, remove });
}

export function playerChips(q: PlayerQuery, m: MoneyFormat, myClubName: string | null): Chip<PlayerQuery>[] {
  const out: Chip<PlayerQuery>[] = [];
  const mf = (n: number) => money(n, m);
  pushIf(out, 'text', q.text?.trim() ? `Name: ${q.text.trim()}` : null, x => without(x, 'text'));
  pushIf(out, 'club', q.club?.trim() ? `Club: ${q.club.trim()}` : null, x => without(x, 'club'));
  pushIf(out, 'nations', listText('Nation', q.nations), x => without(x, 'nations'));
  pushIf(out, 'leagues', listText('League', q.leagues), x => without(x, 'leagues'));
  pushIf(out, 'age', rangeText('Age', q.age), x => without(x, 'age'));
  pushIf(out, 'ca', rangeText('Current', q.ca), x => without(x, 'ca'));
  pushIf(out, 'pa', rangeText('Potential', q.pa), x => without(x, 'pa'));
  pushIf(out, 'growth', rangeText('Growth', q.growth), x => without(x, 'growth'));
  pushIf(out, 'height', rangeText('Height', q.height, n => `${n} cm`), x => without(x, 'height'));
  if (q.positions?.length) {
    const fam = q.minFamiliarity !== undefined ? ` (≥ ${q.minFamiliarity})` : '';
    out.push({ id: 'positions', label: `Pos: ${q.positions.join(', ')}${fam}`, remove: x => without(without(x, 'positions'), 'minFamiliarity') });
  }
  if (q.role) {
    const r = ROLE_BY_ID[q.role];
    const name = r ? roleLabel(r) : q.role;
    out.push({
      id: 'role',
      label: q.minRoleRating !== undefined ? `${name} ≥ ${q.minRoleRating}%` : name,
      remove: x => without(without(x, 'role'), 'minRoleRating'),
    });
  }
  pushIf(out, 'foot', q.foot ? `Foot: ${q.foot === 'both' ? 'either' : q.foot}` : null, x => without(x, 'foot'));
  pushIf(out, 'myClub', q.myClub ? (myClubName ? `My club (${myClubName})` : 'My club') : null, x => without(x, 'myClub'));
  pushIf(out, 'freeAgent', triText('Free agent', q.freeAgent), x => without(x, 'freeAgent'));
  pushIf(out, 'wage', rangeText('Wage', q.wage, n => `${mf(n)} p/w`), x => without(x, 'wage'));
  pushIf(out, 'value', rangeText('Value', q.value, mf), x => without(x, 'value'));
  pushIf(out, 'expires', q.contractExpiresBefore ? `Expires by ${date(q.contractExpiresBefore)}` : null, x => without(x, 'contractExpiresBefore'));
  pushIf(out, 'transferListed', triText('Transfer listed', q.transferListed), x => without(x, 'transferListed'));
  pushIf(out, 'loanListed', triText('Loan listed', q.loanListed), x => without(x, 'loanListed'));
  pushIf(out, 'onLoan', triText('On loan', q.onLoan), x => without(x, 'onLoan'));
  pushIf(out, 'hasReleaseClause', triText('Release clause', q.hasReleaseClause), x => without(x, 'hasReleaseClause'));
  for (const [k, v] of Object.entries(q.attrs ?? {}) as [PlayerAttrKey, number | undefined][]) {
    if (!v) continue;
    out.push({
      id: `attr:${k}`,
      label: `${ATTR_LABELS[k]} ≥ ${v}`,
      remove: x => {
        const attrs = { ...x.attrs };
        delete attrs[k];
        return { ...x, attrs };
      },
    });
  }
  for (const [k, v] of Object.entries(q.personality ?? {}) as [PersonalityKey, number | undefined][]) {
    if (!v) continue;
    out.push({
      id: `pers:${k}`,
      label: `${PERSONALITY_LABELS[k]} ${k === 'controversy' ? '≤' : '≥'} ${v}`,
      remove: x => {
        const personality = { ...x.personality };
        delete personality[k];
        return { ...x, personality };
      },
    });
  }
  pushIf(out, 'personalityLabels', listText('Personality', q.personalityLabels), x => without(x, 'personalityLabels'));
  pushIf(out, 'traits', listText('Traits', q.traits), x => without(x, 'traits'));
  return out;
}

export function staffChips(q: StaffQuery, myClubName: string | null): Chip<StaffQuery>[] {
  const out: Chip<StaffQuery>[] = [];
  pushIf(out, 'text', q.text?.trim() ? `Name: ${q.text.trim()}` : null, x => without(x, 'text'));
  pushIf(out, 'club', q.club?.trim() ? `Club: ${q.club.trim()}` : null, x => without(x, 'club'));
  pushIf(out, 'nations', listText('Nation', q.nations), x => without(x, 'nations'));
  pushIf(out, 'leagues', listText('League', q.leagues), x => without(x, 'leagues'));
  pushIf(out, 'jobs', listText('Job', q.jobs), x => without(x, 'jobs'));
  pushIf(out, 'age', rangeText('Age', q.age), x => without(x, 'age'));
  pushIf(out, 'ca', rangeText('Current', q.ca), x => without(x, 'ca'));
  pushIf(out, 'pa', rangeText('Potential', q.pa), x => without(x, 'pa'));
  pushIf(out, 'freeAgent', triText('Free agent', q.freeAgent), x => without(x, 'freeAgent'));
  pushIf(out, 'myClub', q.myClub ? (myClubName ? `My club (${myClubName})` : 'My club') : null, x => without(x, 'myClub'));
  if (q.role) {
    const name = STAFF_ROLE_BY_ID[q.role]?.name ?? q.role;
    out.push({
      id: 'role',
      label: q.minRoleRating !== undefined ? `${name} ≥ ${q.minRoleRating}%` : name,
      remove: x => without(without(x, 'role'), 'minRoleRating'),
    });
  }
  for (const [k, v] of Object.entries(q.attrs ?? {}) as [StaffAttrKey, number | undefined][]) {
    if (!v) continue;
    out.push({
      id: `attr:${k}`,
      label: `${STAFF_ATTR_LABELS[k]} ≥ ${v}`,
      remove: x => {
        const attrs = { ...x.attrs };
        delete attrs[k];
        return { ...x, attrs };
      },
    });
  }
  return out;
}

export function clubChips(q: ClubQuery): Chip<ClubQuery>[] {
  const out: Chip<ClubQuery>[] = [];
  pushIf(out, 'text', q.text?.trim() ? `Name: ${q.text.trim()}` : null, x => without(x, 'text'));
  pushIf(out, 'nations', listText('Nation', q.nations), x => without(x, 'nations'));
  pushIf(out, 'leagues', listText('League', q.leagues), x => without(x, 'leagues'));
  pushIf(out, 'reputation', rangeText('Reputation', q.reputation), x => without(x, 'reputation'));
  pushIf(out, 'withSquad', q.withSquad ? 'With squad' : null, x => without(x, 'withSquad'));
  return out;
}

// ------------------------------------------------------------------ presets

export interface PlayerPreset {
  id: string;
  label: string;
  title: string;
  build: (ctx: { gameDate: string | null; money: MoneyFormat }) => PlayerQuery;
}

export const PLAYER_PRESETS: readonly PlayerPreset[] = [
  {
    id: 'wonderkids',
    label: 'Wonderkids',
    title: 'Age 19 or under with PA 150+',
    build: () => ({ age: { max: 19 }, pa: { min: 150 } }),
  },
  {
    id: 'free',
    label: 'Free agents',
    title: 'Players without a club',
    build: () => ({ freeAgent: true }),
  },
  {
    id: 'bargains',
    label: 'Bargains',
    title: 'Sale value 2M or less with CA 120+',
    build: ({ money: m }) => ({ value: { max: parseMoneyInput('2M', m) ?? 2_000_000 }, ca: { min: 120 } }),
  },
  {
    id: 'expiring',
    label: 'Expiring contracts',
    title: 'Contract ends by the next 1 July after the game date',
    build: ({ gameDate }) => ({ contractExpiresBefore: nextJulyFirst(gameDate) }),
  },
];

/** Range setter helper: returns the range with one bound replaced (undefined clears it). */
export function setBound(r: Range | undefined, bound: 'min' | 'max', v: number | undefined): Range | undefined {
  const next: Range = { ...r };
  if (v === undefined) delete next[bound];
  else next[bound] = v;
  return next.min === undefined && next.max === undefined ? undefined : next;
}
