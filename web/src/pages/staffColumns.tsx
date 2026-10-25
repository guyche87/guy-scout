// Staff table columns (sort keys from shared/api.ts: name, age, job, club, ca, pa, nation, wage, expires,
// bestRole, attr:<key>, pers:<key>, role:<id>).
import {
  PERSONALITY, PERSONALITY_LABELS, STAFF_ATTR_LABELS, STAFF_COACHING, STAFF_DATA, STAFF_HIDDEN, STAFF_KNOWLEDGE,
  STAFF_MEDICAL, STAFF_MENTAL, STAFF_UNVERIFIED, type StaffAttrKey,
} from '../../../shared/attributes.ts';
import { STAFF_ROLES, STAFF_ROLE_BY_ID } from '../../../shared/staffRoles.ts';
import type { Staff } from '../../../shared/types.ts';
import type { ChooserColumn } from '../components/ColumnChooser.tsx';
import type { Column } from '../components/DataTable.tsx';
import { AbilityTile, AttrTile, RatingTile } from '../components/Values.tsx';
import { dateShort, int, wage, type MoneyFormat } from '../lib/format.ts';
import { clubHref } from '../lib/router.ts';

export const STAFF_ATTR_GROUPS: { id: string; title: string; keys: readonly StaffAttrKey[] }[] = [
  { id: 'coaching', title: 'Coaching', keys: STAFF_COACHING },
  { id: 'mental', title: 'Mental', keys: STAFF_MENTAL },
  { id: 'knowledge', title: 'Knowledge', keys: STAFF_KNOWLEDGE },
  { id: 'medical', title: 'Medical', keys: STAFF_MEDICAL },
  { id: 'data', title: 'Data', keys: STAFF_DATA },
  { id: 'hidden', title: 'Chairman (hidden)', keys: STAFF_HIDDEN },
];

export const UNVERIFIED: ReadonlySet<string> = new Set<string>(STAFF_UNVERIFIED);

/** Short headers for staff attributes. */
const STAFF_SHORT: Record<StaffAttrKey, string> = {
  attacking: 'Att', defending: 'Def', fitness: 'Fit', gkDistribution: 'GKD', gkHandling: 'GKH', gkShotStopping: 'GKS',
  mentalCoaching: 'Men', tactical: 'Tac', technical: 'Tec', workingWithYoungsters: 'Yth',
  adaptability: 'Ada', determination: 'Det', levelOfDiscipline: 'Dis', manManagement: 'MM', motivating: 'Mot',
  judgingPlayerAbility: 'JPA', judgingPlayerPotential: 'JPP', judgingStaffAbility: 'JSA', negotiating: 'Neg',
  tacticalKnowledge: 'TK', physiotherapy: 'Phy', sportsScience: 'SpS', analysingData: 'Dat',
  business: 'Bus', interference: 'Int', patience: 'Pat', resources: 'Res',
};

type Kind = 'name' | 'text' | 'club' | 'nation' | 'int' | 'ability' | 'attr' | 'pers' | 'bestRole' | 'role' | 'wage' | 'date';

interface StaffColDef {
  key: string;
  label: string;
  title: string;
  group: string;
  kind: Kind;
  defaultDir: 'asc' | 'desc';
}

const c = (key: string, label: string, title: string, group: string, kind: Kind, defaultDir: 'asc' | 'desc' = 'desc'): StaffColDef =>
  ({ key, label, title, group, kind, defaultDir });

export const STAFF_COLUMN_GROUPS = ['General', 'Coaching', 'Mental', 'Knowledge', 'Medical', 'Data', 'Chairman (hidden)', 'Personality', 'Roles'] as const;

export const STAFF_COLUMNS: readonly StaffColDef[] = [
  c('name', 'Name', 'Name', 'General', 'name', 'asc'),
  c('age', 'Age', 'Age', 'General', 'int', 'asc'),
  c('nation', 'Nat', 'Nationality', 'General', 'nation', 'asc'),
  c('job', 'Job', 'Job', 'General', 'text', 'asc'),
  c('club', 'Club', 'Club', 'General', 'club', 'asc'),
  c('league', 'League', 'League', 'General', 'text', 'asc'),
  c('ca', 'Current', 'Current ability', 'General', 'ability'),
  c('pa', 'Potential', 'Potential ability', 'General', 'ability'),
  c('bestRole', 'Best role', 'Best staff role and rating', 'General', 'bestRole'),
  c('currentRep', 'Rep', 'Current reputation', 'General', 'int'),
  c('personalityLabel', 'Personality', 'Personality', 'General', 'text', 'asc'),
  c('wage', 'Wage', 'Weekly wage', 'General', 'wage'),
  c('expires', 'Expires', 'Contract expiry', 'General', 'date', 'asc'),
  ...STAFF_ATTR_GROUPS.flatMap(g => g.keys.map(k => c(`attr:${k}`, STAFF_SHORT[k], STAFF_ATTR_LABELS[k], g.title, 'attr'))),
  ...PERSONALITY.map(k => c(`pers:${k}`, PERSONALITY_LABELS[k].slice(0, 4), PERSONALITY_LABELS[k], 'Personality', 'pers', k === 'controversy' ? 'asc' : 'desc')),
  ...STAFF_ROLES.map(r => c(`role:${r.id}`, r.name.split(' ')[0], `${r.name} suitability`, 'Roles', 'role')),
];

const BY_KEY = new Map(STAFF_COLUMNS.map(x => [x.key, x]));

export const STAFF_CHOOSER: ChooserColumn[] = STAFF_COLUMNS.map(x => ({
  key: x.key,
  label: x.kind === 'attr' && UNVERIFIED.has(x.key.slice(5)) ? `${x.title} (?)` : x.title,
  group: x.group,
}));

// Nationality is the second line of the name cell, best role of the job cell, league of the club cell.
export const DEFAULT_STAFF_COLUMNS: readonly string[] = [
  'name', 'job', 'club', 'age', 'ca', 'pa', 'bestRole',
  'attr:attacking', 'attr:defending', 'attr:tactical', 'attr:technical', 'attr:fitness', 'attr:workingWithYoungsters',
  'attr:judgingPlayerAbility', 'attr:judgingPlayerPotential', 'attr:tacticalKnowledge', 'attr:manManagement', 'attr:motivating',
];

export const STAFF_PRESETS = [
  { id: 'general', label: 'General', columns: DEFAULT_STAFF_COLUMNS },
  { id: 'coaching', label: 'Coaching', columns: ['name', 'age', 'job', 'club', 'ca', 'bestRole', ...STAFF_COACHING.map(k => `attr:${k}`), 'attr:determination', 'attr:levelOfDiscipline', 'attr:motivating'] },
  { id: 'scouting', label: 'Scouting', columns: ['name', 'age', 'job', 'club', 'ca', 'bestRole', 'attr:judgingPlayerAbility', 'attr:judgingPlayerPotential', 'attr:analysingData', 'attr:adaptability', 'attr:tacticalKnowledge', 'role:scout', 'role:recruit'] },
  { id: 'medical', label: 'Medical', columns: ['name', 'age', 'job', 'club', 'ca', 'bestRole', 'attr:physiotherapy', 'attr:sportsScience', 'attr:fitness', 'role:physio', 'role:sportsci'] },
  { id: 'roles', label: 'Roles', columns: ['name', 'age', 'job', 'club', 'ca', 'bestRole', ...STAFF_ROLES.map(r => `role:${r.id}`)] },
] as const;

export function validStaffColumns(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const keys = v.filter((k): k is string => typeof k === 'string' && BY_KEY.has(k));
  if (!keys.length) return null;
  if (!keys.includes('name')) keys.unshift('name');
  return [...new Set(keys)];
}

export interface StaffCellCtx {
  money: MoneyFormat;
  roleRatings: readonly number[] | null;
  roleId: string | null;
}

function render(def: StaffColDef, s: Staff, i: number, ctx: StaffCellCtx) {
  const arg = def.key.includes(':') ? def.key.slice(def.key.indexOf(':') + 1) : '';
  switch (def.kind) {
    case 'name':
      return (
        <div className="cell-name">
          <div className="cell-stack">
            <button type="button" className="link-btn" data-open="" aria-haspopup="dialog" title={s.name}>{s.name}</button>
            <span className="cell-stack__sub" title={s.nations.join(', ')}>{s.nations[0] ?? '–'}</span>
          </div>
          {s.clubId === null && <span className="badge badge--positive">Free</span>}
          {s.alsoPlayer && <span className="badge badge--outline" title="Also a player">P-C</span>}
        </div>
      );
    case 'club':
      if (s.clubId === null) {
        return (
          <div className="cell-stack">
            <span className="cell-stack__main">Unattached</span>
            <span className="cell-stack__sub">No club</span>
          </div>
        );
      }
      return (
        <div className="cell-stack">
          <a className="link-btn" href={clubHref(s.clubId)} title={s.club}>{s.club}</a>
          <span className="cell-stack__sub" title={s.league}>{s.league || '–'}</span>
        </div>
      );
    case 'nation':
      return <span className="cell-truncate" title={s.nations.join(', ')}>{s.nations[0] ?? '–'}</span>;
    case 'text': {
      if (def.key === 'job') {
        const best = s.bestRole && s.bestRole.rating ? STAFF_ROLE_BY_ID[s.bestRole.id] : undefined;
        return (
          <div className="cell-stack">
            <span className="cell-stack__main" title={s.job}>{s.job || 'Staff'}</span>
            <span className="cell-stack__sub" title={best ? `Best role: ${best.name}` : undefined}>{best ? best.name : '–'}</span>
          </div>
        );
      }
      const v = (s as unknown as Record<string, unknown>)[def.key];
      const t = typeof v === 'string' && v ? v : '–';
      return <span className="cell-truncate" title={t}>{t}</span>;
    }
    case 'int': {
      const v = (s as unknown as Record<string, unknown>)[def.key];
      return typeof v === 'number' ? int(v) : '–';
    }
    case 'ability':
      return <AbilityTile value={def.key === 'ca' ? s.ca : s.pa} />;
    case 'attr':
      return <AttrTile value={(s.attrs as Record<string, number>)[arg]} attrKey={arg} unverified={UNVERIFIED.has(arg)} />;
    case 'pers':
      return <AttrTile value={(s.personality as Record<string, number>)[arg]} attrKey={arg} />;
    case 'bestRole': {
      const r = s.bestRole ? STAFF_ROLE_BY_ID[s.bestRole.id] : undefined;
      if (!r || !s.bestRole.rating) return <span className="cell-muted">–</span>;
      return (
        <span className="inline-flex items-center gap-1-5" title={r.name}>
          <RatingTile value={s.bestRole.rating} />
          <span className="cell-sub cell-truncate">{r.name}</span>
        </span>
      );
    }
    case 'role': {
      const v = ctx.roleId === arg && ctx.roleRatings ? ctx.roleRatings[i] : s.ratings?.[arg];
      return <RatingTile value={v} />;
    }
    case 'wage':
      return s.contract
        ? <span className="value-pill">{wage(s.contract.wage, ctx.money)}</span>
        : <span className="cell-muted">–</span>;
    case 'date':
      return dateShort(s.contract?.expires);
    default:
      return '–';
  }
}

function classFor(k: Kind): string | undefined {
  if (k === 'name') return 'col-name';
  if (k === 'attr' || k === 'pers') return 'col-attr';
  if (k === 'role' || k === 'bestRole') return 'col-rating';
  if (k === 'int' || k === 'ability' || k === 'wage' || k === 'date') return 'num';
  return undefined;
}

export function buildStaffColumns(keys: readonly string[], ctx: StaffCellCtx): Column<Staff>[] {
  const out: Column<Staff>[] = [];
  let prev = '';
  for (const key of keys) {
    const def = BY_KEY.get(key);
    if (!def) continue;
    const group = def.group === 'General' ? '' : def.group;
    out.push({
      id: def.key,
      header: def.label,
      title: def.title,
      sortKey: def.key,
      defaultDir: def.defaultDir,
      className: classFor(def.kind),
      rowHeader: def.kind === 'name',
      group,
      groupStart: group !== '' && group !== prev,
      render: (s, i) => render(def, s, i, ctx),
    });
    prev = group;
  }
  return out;
}

export function staffHasGroups(keys: readonly string[]): boolean {
  return keys.some(k => (BY_KEY.get(k)?.group ?? 'General') !== 'General');
}

/** Client-side sort value (club staff lists). */
export function staffSortValue(s: Staff, key: string): number | string | null {
  const colon = key.indexOf(':');
  if (colon > 0) {
    const prefix = key.slice(0, colon), arg = key.slice(colon + 1);
    if (prefix === 'attr') return (s.attrs as Record<string, number>)[arg] ?? null;
    if (prefix === 'pers') return (s.personality as Record<string, number>)[arg] ?? null;
    if (prefix === 'role') return s.ratings?.[arg] ?? null;
  }
  switch (key) {
    case 'wage': return s.contract?.wage ?? null;
    case 'expires': return s.contract?.expires ?? null;
    case 'bestRole': return s.bestRole?.rating ?? null;
    case 'nation': return s.nations[0] ?? null;
    default: {
      const v = (s as unknown as Record<string, unknown>)[key];
      return typeof v === 'number' || typeof v === 'string' ? v : null;
    }
  }
}
