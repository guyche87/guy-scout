// Column catalogue for the players table. Keys use the server's sort/export key syntax (shared/api.ts).
import {
  ATTR_LABELS, ATTR_SHORT, GOALKEEPING, HIDDEN, MENTAL, PERSONALITY, PERSONALITY_LABELS, PHYSICAL, POSITIONS,
  POSITION_LABELS, TECHNICAL, type PersonalityKey, type PlayerAttrKey, type PositionKey,
} from '../../../shared/attributes.ts';
import { DUTY_LABELS, ROLES, ROLE_BY_ID } from '../../../shared/roles.ts';

export type PlayerCellKind =
  | 'name' | 'text' | 'club' | 'nation' | 'int' | 'ca' | 'pa' | 'growth' | 'attr' | 'pers' | 'fam'
  | 'rating' | 'bestRole' | 'role' | 'value' | 'wage' | 'money' | 'date' | 'bool' | 'height' | 'weight';

export interface PlayerColumnDef {
  /** Sort / export key, e.g. "ca", "attr:pace", "role:AF-A". */
  key: string;
  /** Header text (short). */
  label: string;
  /** Full name for tooltips and the column chooser. */
  title: string;
  group: ColumnGroup;
  kind: PlayerCellKind;
  sortable: boolean;
  /** Direction used on the first header click. */
  defaultDir: 'asc' | 'desc';
}

export type ColumnGroup =
  | 'General' | 'Contract' | 'Technical' | 'Mental' | 'Physical' | 'Goalkeeping' | 'Hidden' | 'Personality'
  | 'Familiarity' | 'Position ratings' | 'Roles';

export const COLUMN_GROUPS: readonly ColumnGroup[] = [
  'General', 'Contract', 'Technical', 'Mental', 'Physical', 'Goalkeeping', 'Hidden', 'Personality',
  'Familiarity', 'Position ratings', 'Roles',
];

const col = (
  key: string, label: string, title: string, group: ColumnGroup, kind: PlayerCellKind,
  defaultDir: 'asc' | 'desc' = 'desc', sortable = true,
): PlayerColumnDef => ({ key, label, title, group, kind, sortable, defaultDir });

const GENERAL: PlayerColumnDef[] = [
  col('name', 'Name', 'Name', 'General', 'name', 'asc'),
  col('age', 'Age', 'Age', 'General', 'int', 'asc'),
  col('nation', 'Nat', 'Nationality', 'General', 'nation', 'asc'),
  col('club', 'Club', 'Club', 'General', 'club', 'asc'),
  col('league', 'League', 'League', 'General', 'text', 'asc'),
  col('positionText', 'Position', 'Positions (accomplished or better)', 'General', 'text', 'asc'),
  col('ca', 'Current', 'Current ability (1-200)', 'General', 'ca'),
  col('pa', 'Potential', 'Potential ability (1-200)', 'General', 'pa'),
  col('growth', 'Growth', 'Room to grow (Potential - Current)', 'General', 'growth'),
  col('bestRole', 'Best role', 'Best role and rating', 'General', 'bestRole'),
  col('personalityLabel', 'Personality', 'Personality', 'General', 'text', 'asc'),
  col('height', 'Hgt', 'Height (cm)', 'General', 'height'),
  col('weight', 'Wgt', 'Weight (kg)', 'General', 'weight'),
  col('currentRep', 'Rep', 'Current reputation', 'General', 'int'),
  col('worldRep', 'W Rep', 'World reputation', 'General', 'int'),
  col('birthDate', 'Born', 'Date of birth', 'General', 'date', 'asc'),
];

const CONTRACT: PlayerColumnDef[] = [
  col('value', 'Value', 'Sale value (asking price; 300M+ = not for sale)', 'Contract', 'value'),
  col('wage', 'Wage', 'Weekly wage', 'Contract', 'wage'),
  col('expires', 'Expires', 'Contract expiry', 'Contract', 'date', 'asc'),
  col('releaseClause', 'Clause', 'Largest release clause', 'Contract', 'money'),
  col('transferListed', 'TL', 'Transfer listed', 'Contract', 'bool'),
  col('loanListed', 'LL', 'Loan listed', 'Contract', 'bool'),
  col('onLoan', 'Loan', 'On loan', 'Contract', 'bool'),
];

function attrCols(keys: readonly PlayerAttrKey[], group: ColumnGroup): PlayerColumnDef[] {
  return keys.map(k => col(`attr:${k}`, ATTR_SHORT[k], ATTR_LABELS[k], group, 'attr'));
}

function persCols(keys: readonly PersonalityKey[]): PlayerColumnDef[] {
  return keys.map(k => col(`pers:${k}`, PERSONALITY_LABELS[k].slice(0, 4), PERSONALITY_LABELS[k], 'Personality', 'pers', k === 'controversy' ? 'asc' : 'desc'));
}

function famCols(keys: readonly PositionKey[]): PlayerColumnDef[] {
  return keys.map(k => col(`pos:${k}`, k, `${POSITION_LABELS[k]} familiarity (0-20)`, 'Familiarity', 'fam'));
}

function posRatingCols(keys: readonly PositionKey[]): PlayerColumnDef[] {
  return keys.map(k => col(`posr:${k}`, `${k}%`, `${POSITION_LABELS[k]} rating (best role, 0-100)`, 'Position ratings', 'rating'));
}

/** Position order used for display (pitch order, GK to ST), not FM's internal order. */
export const DISPLAY_POSITIONS: readonly PositionKey[] = [
  'GK', 'SW', 'DR', 'DC', 'DL', 'WBR', 'DM', 'WBL', 'MR', 'MC', 'ML', 'AMR', 'AMC', 'AML', 'ST',
];

export function roleColumn(roleId: string): PlayerColumnDef {
  const r = ROLE_BY_ID[roleId];
  const short = r ? `${r.id}` : roleId;
  const title = r ? `${r.name} (${DUTY_LABELS[r.duty]}) rating` : roleId;
  return col(`role:${roleId}`, short, title, 'Roles', 'role');
}

export const PLAYER_COLUMNS: readonly PlayerColumnDef[] = [
  ...GENERAL,
  ...CONTRACT,
  ...attrCols(TECHNICAL, 'Technical'),
  ...attrCols(MENTAL, 'Mental'),
  ...attrCols(PHYSICAL, 'Physical'),
  ...attrCols(GOALKEEPING, 'Goalkeeping'),
  ...attrCols(HIDDEN, 'Hidden'),
  ...persCols(PERSONALITY),
  ...famCols(DISPLAY_POSITIONS),
  ...posRatingCols(DISPLAY_POSITIONS),
  ...ROLES.map(r => roleColumn(r.id)),
];

const BY_KEY = new Map(PLAYER_COLUMNS.map(c => [c.key, c]));

export function playerColumn(key: string): PlayerColumnDef | undefined {
  return BY_KEY.get(key) ?? (key.startsWith('role:') && ROLE_BY_ID[key.slice(5)] ? roleColumn(key.slice(5)) : undefined);
}

const attrKeys = (keys: readonly PlayerAttrKey[]) => keys.map(k => `attr:${k}`);

export const COLUMN_PRESETS: { id: string; label: string; columns: string[] }[] = [
  {
    id: 'general',
    label: 'General',
    // Nationality is the second line of the name cell, league of the club cell, best role of the position cell.
    columns: ['name', 'club', 'positionText', 'age', 'ca', 'pa', 'value', 'wage', 'expires', 'bestRole', 'personalityLabel'],
  },
  {
    id: 'attributes',
    label: 'Attributes',
    columns: ['name', 'age', 'positionText', 'ca', 'pa', ...attrKeys(TECHNICAL), ...attrKeys(MENTAL), ...attrKeys(PHYSICAL)],
  },
  {
    id: 'hidden',
    label: 'Hidden',
    columns: ['name', 'age', 'club', 'positionText', 'ca', 'pa', ...attrKeys(HIDDEN), ...PERSONALITY.map(k => `pers:${k}`), 'personalityLabel'],
  },
  {
    id: 'contract',
    label: 'Contract',
    columns: ['name', 'age', 'club', 'positionText', 'ca', 'pa', 'value', 'wage', 'expires', 'releaseClause', 'transferListed', 'loanListed', 'onLoan'],
  },
  {
    id: 'ratings',
    label: 'Ratings',
    columns: ['name', 'age', 'club', 'positionText', 'ca', 'pa', 'bestRole', ...DISPLAY_POSITIONS.filter(p => p !== 'SW').map(p => `posr:${p}`)],
  },
];

export const DEFAULT_PLAYER_COLUMNS: readonly string[] = COLUMN_PRESETS[0].columns;

/** Keeps known keys only (stored column lists may come from an older version). */
export function validColumnKeys(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const keys = v.filter((k): k is string => typeof k === 'string' && playerColumn(k) !== undefined);
  if (!keys.length) return null;
  if (!keys.includes('name')) keys.unshift('name');
  return [...new Set(keys)];
}

/** POSITIONS re-exported for callers that only import this module. */
export { POSITIONS };
