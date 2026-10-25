// Pure filter / sort / paginate functions over the loaded rows. Queries arrive as untrusted JSON, so every
// field is validated and hoisted into locals once; the per-row loops then only compare numbers and strings.
import type { ClubQuery, PlayerQuery, SearchRequest, SearchResponse, Sort, StaffQuery } from '../shared/api.ts';
import { PERSONALITY, PLAYER_ATTRS, POSITIONS, STAFF_ATTRS, type PositionKey } from '../shared/attributes.ts';
import { roleRatingById, type RatingConfig } from '../shared/ratings.ts';
import { ROLE_BY_ID } from '../shared/roles.ts';
import { STAFF_ROLE_BY_ID } from '../shared/staffRoles.ts';
import type { Club, Contract, Player, Staff } from '../shared/types.ts';
import { fold, HttpError, isObject } from './store.ts';

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 1000;
const DEFAULT_FAMILIARITY = 15;
const STRONG_FOOT = 15;

/** Matching rows as indices into the searched array, plus the query role's rating for each hit. */
export interface Hits {
  idx: number[];
  /** Same order as `idx`; present when the query had a role. */
  role: number[] | null;
  roleId: string | null;
}

export interface PlayerSearchCtx {
  /** Folded name strings, index-aligned with the players array. */
  nameKeys: readonly string[];
  /** Folded club names, index-aligned with the players array. */
  clubKeys: readonly string[];
  ratingConfig: RatingConfig;
  humanClubId: number | null;
  /** Player ids of query.shortlistId, resolved by the caller; undefined means the list does not exist. */
  shortlistIds?: ReadonlySet<number>;
}

export interface StaffSearchCtx {
  nameKeys: readonly string[];
  clubKeys: readonly string[];
  humanClubId: number | null;
}

export interface ClubSearchCtx {
  /** Folded name + short name, index-aligned with the clubs array. */
  nameKeys: readonly string[];
  playersByClub: ReadonlyMap<number, readonly Player[]>;
}

// ------------------------------------------------------------------ input validation

interface Bounds { lo: number; hi: number }
interface Minima { keys: string[]; vals: number[] }

const bad = (msg: string) => new HttpError(400, msg);
const absent = (v: unknown) => v === undefined || v === null;

function optObject(v: unknown, field: string): Record<string, unknown> {
  if (absent(v)) return {};
  if (!isObject(v)) throw bad(`${field} must be an object.`);
  return v;
}

function optNum(v: unknown, field: string): number | undefined {
  if (absent(v)) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw bad(`${field} must be a number.`);
  return v;
}

function optInt(v: unknown, field: string): number | undefined {
  if (absent(v)) return undefined;
  if (!Number.isSafeInteger(v)) throw bad(`${field} must be an integer.`);
  return v as number;
}

/** Tri-state flag: undefined = don't care, true = must be, false = must not be. */
function optBool(v: unknown, field: string): boolean | undefined {
  if (absent(v)) return undefined;
  if (typeof v !== 'boolean') throw bad(`${field} must be true or false.`);
  return v;
}

function optString(v: unknown, field: string): string | undefined {
  if (absent(v)) return undefined;
  if (typeof v !== 'string') throw bad(`${field} must be a string.`);
  return v;
}

/** Folded words that must all occur (any order), or null when empty. */
function optWords(v: unknown, field: string): string[] | null {
  const s = optString(v, field);
  const words = s ? fold(s).split(/\s+/).filter(Boolean) : [];
  return words.length ? words : null;
}

function optStrings(v: unknown, field: string): string[] | null {
  if (absent(v)) return null;
  if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) throw bad(`${field} must be an array of strings.`);
  return v.length ? (v as string[]) : null;
}

function optSet(v: unknown, field: string): Set<string> | null {
  const list = optStrings(v, field);
  return list ? new Set(list) : null;
}

function optIdSet(v: unknown, field: string): Set<number> | null {
  if (absent(v)) return null;
  if (!Array.isArray(v) || !v.every(x => Number.isSafeInteger(x))) throw bad(`${field} must be an array of integers.`);
  return v.length ? new Set(v as number[]) : null;
}

function optEnumList<K extends string>(v: unknown, allowed: readonly K[], field: string): K[] | null {
  const list = optStrings(v, field);
  if (!list) return null;
  for (const k of list) if (!(allowed as readonly string[]).includes(k)) throw bad(`${field}: unknown value "${k}".`);
  return list as K[];
}

function optRange(v: unknown, field: string): Bounds | null {
  if (absent(v)) return null;
  if (!isObject(v)) throw bad(`${field} must be an object like { "min": 1, "max": 20 }.`);
  const min = optNum(v.min, `${field}.min`), max = optNum(v.max, `${field}.max`);
  if (min === undefined && max === undefined) return null;
  return { lo: min ?? -Infinity, hi: max ?? Infinity };
}

function optMinima(v: unknown, allowed: readonly string[], field: string, skip?: string): Minima | null {
  const keys: string[] = [], vals: number[] = [];
  for (const [k, raw] of Object.entries(optObject(v, field))) {
    if (k === skip) continue;
    if (!allowed.includes(k)) throw bad(`${field}: unknown attribute "${k}".`);
    const n = optNum(raw, `${field}.${k}`);
    if (n !== undefined && n > 0) { keys.push(k); vals.push(n); }
  }
  return keys.length ? { keys, vals } : null;
}

function optRoleId(v: unknown, table: Record<string, unknown>, field: string): string | null {
  if (absent(v) || v === '') return null;
  if (typeof v !== 'string' || !Object.hasOwn(table, v)) throw bad(`${field}: unknown role "${String(v)}".`);
  return v;
}

function optDate(v: unknown, field: string): string | null {
  const s = optString(v, field);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) throw bad(`${field} must be an ISO date (yyyy-mm-dd).`);
  return s.slice(0, 10);
}

function optFoot(v: unknown): 'left' | 'right' | 'both' | null {
  if (absent(v) || v === '') return null;
  if (v === 'left' || v === 'right' || v === 'both') return v as 'left' | 'right' | 'both';
  throw bad('foot must be "left", "right" or "both".');
}

// ------------------------------------------------------------------ row predicates (allocation free)

const inRange = (v: number, b: Bounds) => v >= b.lo && v <= b.hi;

function containsAll(haystack: string, words: readonly string[]): boolean {
  for (let k = 0; k < words.length; k++) if (!haystack.includes(words[k])) return false;
  return true;
}

function hasAny(values: readonly string[], set: ReadonlySet<string>): boolean {
  for (let k = 0; k < values.length; k++) if (set.has(values[k])) return true;
  return false;
}

function hasAll(values: readonly string[], required: readonly string[]): boolean {
  for (let k = 0; k < required.length; k++) if (!values.includes(required[k])) return false;
  return true;
}

function meetsMinima(rec: Record<string, number>, m: Minima): boolean {
  for (let k = 0; k < m.keys.length; k++) if (!((rec[m.keys[k]] ?? 0) >= m.vals[k])) return false;
  return true;
}

/** Largest release clause amount, or null when there is none. */
export function releaseClauseAmount(c: Contract | null): number | null {
  if (!c || !c.releaseClauses.length) return null;
  let max = 0;
  for (const rc of c.releaseClauses) if (rc.amount > max) max = rc.amount;
  return max;
}

const EMPTY_IDS: ReadonlySet<number> = new Set();

// ------------------------------------------------------------------ filters

export function filterPlayers(players: readonly Player[], query: PlayerQuery | undefined, ctx: PlayerSearchCtx): Hits {
  const q = optObject(query, 'query');
  const words = optWords(q.text, 'text');
  const clubWords = optWords(q.club, 'club');
  const clubId = optInt(q.clubId, 'clubId');
  const nations = optSet(q.nations, 'nations');
  const leagues = optSet(q.leagues, 'leagues');
  const leagueNations = optSet(q.leagueNations, 'leagueNations');
  const continents = optSet(q.continents, 'continents');
  const age = optRange(q.age, 'age');
  const ca = optRange(q.ca, 'ca');
  const pa = optRange(q.pa, 'pa');
  const growth = optRange(q.growth, 'growth');
  const rep = optRange(q.currentRep, 'currentRep');
  const value = optRange(q.value, 'value');
  const wage = optRange(q.wage, 'wage');
  const height = optRange(q.height, 'height');
  const positions = optEnumList<PositionKey>(q.positions, POSITIONS, 'positions');
  const minFam = optNum(q.minFamiliarity, 'minFamiliarity') ?? DEFAULT_FAMILIARITY;
  const roleId = optRoleId(q.role, ROLE_BY_ID, 'role');
  const minRole = optNum(q.minRoleRating, 'minRoleRating');
  const expiresBy = optDate(q.contractExpiresBefore, 'contractExpiresBefore');
  const freeAgent = optBool(q.freeAgent, 'freeAgent');
  const onLoan = optBool(q.onLoan, 'onLoan');
  const transferListed = optBool(q.transferListed, 'transferListed');
  const loanListed = optBool(q.loanListed, 'loanListed');
  const hasClause = optBool(q.hasReleaseClause, 'hasReleaseClause');
  const myClub = optBool(q.myClub, 'myClub');
  const foot = optFoot(q.foot);
  const attrs = optMinima(q.attrs, PLAYER_ATTRS, 'attrs');
  const pers = optObject(q.personality, 'personality');
  const persMin = optMinima(pers, PERSONALITY, 'personality', 'controversy');
  const controversyMax = optNum(pers.controversy, 'personality.controversy');
  const labels = optSet(q.personalityLabels, 'personalityLabels');
  const traits = optStrings(q.traits, 'traits');
  const ids = optIdSet(q.ids, 'ids');
  const shortlist = optString(q.shortlistId, 'shortlistId') ? ctx.shortlistIds ?? EMPTY_IDS : null;
  const { nameKeys, clubKeys, humanClubId, ratingConfig } = ctx;

  const idx: number[] = [];
  const role: number[] | null = roleId ? [] : null;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (ids !== null && !ids.has(p.id)) continue;
    if (shortlist !== null && !shortlist.has(p.id)) continue;
    if (clubId !== undefined && p.clubId !== clubId) continue;
    if (myClub !== undefined && (humanClubId !== null && p.clubId === humanClubId) !== myClub) continue;
    if (freeAgent !== undefined && (p.clubId === null) !== freeAgent) continue;
    if (onLoan !== undefined && p.onLoan !== onLoan) continue;
    if (age !== null && !inRange(p.age, age)) continue;
    if (ca !== null && !inRange(p.ca, ca)) continue;
    if (pa !== null && !inRange(p.pa, pa)) continue;
    if (growth !== null && !inRange(p.pa - p.ca, growth)) continue;
    if (rep !== null && !inRange(p.currentRep, rep)) continue;
    if (value !== null && !inRange(p.value, value)) continue;
    if (height !== null && !inRange(p.height, height)) continue;
    if (nations !== null && !hasAny(p.nations, nations)) continue;
    if (leagues !== null && !leagues.has(p.league)) continue;
    if (leagueNations !== null && !leagueNations.has(p.leagueNation)) continue;
    if (continents !== null && !continents.has(p.continent)) continue;

    const c = p.contract;
    if (wage !== null && !(c !== null && inRange(c.wage, wage))) continue;
    if (expiresBy !== null && !(c !== null && c.expires !== null && c.expires <= expiresBy)) continue;
    if (transferListed !== undefined && (c !== null && c.transferListed) !== transferListed) continue;
    if (loanListed !== undefined && (c !== null && c.loanListed) !== loanListed) continue;
    if (hasClause !== undefined && (c !== null && c.releaseClauses.length > 0) !== hasClause) continue;

    if (positions !== null) {
      let ok = false;
      for (let k = 0; k < positions.length && !ok; k++) ok = (p.positions[positions[k]] ?? 0) >= minFam;
      if (!ok) continue;
    }
    if (foot !== null) {
      const a = p.attrs;
      const ok = foot === 'left' ? a.leftFoot >= STRONG_FOOT
        : foot === 'right' ? a.rightFoot >= STRONG_FOOT
        : a.leftFoot >= STRONG_FOOT && a.rightFoot >= STRONG_FOOT;
      if (!ok) continue;
    }
    if (attrs !== null && !meetsMinima(p.attrs, attrs)) continue;
    if (persMin !== null && !meetsMinima(p.personality, persMin)) continue;
    if (controversyMax !== undefined && !(p.personality.controversy <= controversyMax)) continue;
    if (labels !== null && !labels.has(p.personalityLabel)) continue;
    if (traits !== null && !hasAll(p.traits, traits)) continue;
    if (words !== null && !containsAll(nameKeys[i], words)) continue;
    if (clubWords !== null && !containsAll(clubKeys[i], clubWords)) continue;

    if (role !== null) {
      const r = roleRatingById(p.attrs, roleId!, ratingConfig);
      if (minRole !== undefined && r < minRole) continue;
      role.push(r);
    }
    idx.push(i);
  }
  return { idx, role, roleId };
}

export function filterStaff(staff: readonly Staff[], query: StaffQuery | undefined, ctx: StaffSearchCtx): Hits {
  const q = optObject(query, 'query');
  const words = optWords(q.text, 'text');
  const clubWords = optWords(q.club, 'club');
  const clubId = optInt(q.clubId, 'clubId');
  const nations = optSet(q.nations, 'nations');
  const leagues = optSet(q.leagues, 'leagues');
  const jobs = optSet(q.jobs, 'jobs');
  const age = optRange(q.age, 'age');
  const ca = optRange(q.ca, 'ca');
  const pa = optRange(q.pa, 'pa');
  const rep = optRange(q.currentRep, 'currentRep');
  const freeAgent = optBool(q.freeAgent, 'freeAgent');
  const myClub = optBool(q.myClub, 'myClub');
  const roleId = optRoleId(q.role, STAFF_ROLE_BY_ID, 'role');
  const roleDef = roleId ? STAFF_ROLE_BY_ID[roleId] : null;
  const minRole = optNum(q.minRoleRating, 'minRoleRating');
  const attrs = optMinima(q.attrs, STAFF_ATTRS, 'attrs');
  const { nameKeys, clubKeys, humanClubId } = ctx;

  const idx: number[] = [];
  const role: number[] | null = roleDef ? [] : null;
  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    if (clubId !== undefined && s.clubId !== clubId) continue;
    if (myClub !== undefined && (humanClubId !== null && s.clubId === humanClubId) !== myClub) continue;
    if (freeAgent !== undefined && (s.clubId === null) !== freeAgent) continue;
    if (age !== null && !inRange(s.age, age)) continue;
    if (ca !== null && !inRange(s.ca, ca)) continue;
    if (pa !== null && !inRange(s.pa, pa)) continue;
    if (rep !== null && !inRange(s.currentRep, rep)) continue;
    if (nations !== null && !hasAny(s.nations, nations)) continue;
    if (leagues !== null && !leagues.has(s.league)) continue;
    if (jobs !== null && !jobs.has(s.job)) continue;
    if (attrs !== null && !meetsMinima(s.attrs, attrs)) continue;
    if (words !== null && !containsAll(nameKeys[i], words)) continue;
    if (clubWords !== null && !containsAll(clubKeys[i], clubWords)) continue;

    if (role !== null) {
      const r = s.ratings[roleDef!.id] ?? 0; // stored ratings already zero out board members
      if (minRole !== undefined && r < minRole) continue;
      role.push(r);
    }
    idx.push(i);
  }
  return { idx, role, roleId };
}

export function filterClubs(clubs: readonly Club[], query: ClubQuery | undefined, ctx: ClubSearchCtx): Hits {
  const q = optObject(query, 'query');
  const words = optWords(q.text, 'text');
  const nations = optSet(q.nations, 'nations');
  const leagues = optSet(q.leagues, 'leagues');
  const rep = optRange(q.reputation, 'reputation');
  const withSquad = optBool(q.withSquad, 'withSquad');
  const { nameKeys, playersByClub } = ctx;

  const idx: number[] = [];
  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    if (rep !== null && !inRange(c.reputation, rep)) continue;
    if (nations !== null && !nations.has(c.nation)) continue;
    if (leagues !== null && !leagues.has(c.league)) continue;
    if (withSquad !== undefined && playersByClub.has(c.id) !== withSquad) continue;
    if (words !== null && !containsAll(nameKeys[i], words)) continue;
    idx.push(i);
  }
  return { idx, role: null, roleId: null };
}

// ------------------------------------------------------------------ sort keys

type Val = number | string | null;

/** How to read one sort/column key from a row; `hit` is the row's position in Hits (for query-role lookups). */
export interface KeySpec<T> {
  kind: 'num' | 'str';
  get: (row: T, hit: number) => Val;
}

const num = <T>(get: (row: T, hit: number) => Val): KeySpec<T> => ({ kind: 'num', get });
const str = <T>(get: (row: T, hit: number) => Val): KeySpec<T> => ({ kind: 'str', get });

/** "attr:pace" -> ["attr", "pace"]; "ca" -> ["", "ca"]. */
export function splitKey(key: string): [string, string] {
  const at = key.indexOf(':');
  return at < 0 ? ['', key] : [key.slice(0, at), key.slice(at + 1)];
}

function requireIn(arg: string, allowed: readonly string[], key: string): void {
  if (!allowed.includes(arg)) throw bad(`Unknown key "${key}".`);
}

/** Any top-level number/string/boolean field; arrays sort by their first element. */
function plainKey<T extends object>(rows: readonly T[], key: string): KeySpec<T> {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) throw bad(`Unknown key "${key}".`);
  const first = rows[0] as Record<string, unknown> | undefined;
  if (first && !Object.hasOwn(first, key)) throw bad(`Unknown key "${key}".`);
  let kind: KeySpec<T>['kind'] = 'num';
  for (const r of rows) {
    const v = (r as Record<string, unknown>)[key];
    if (absent(v)) continue;
    if (typeof v === 'string' || Array.isArray(v)) kind = 'str';
    else if (typeof v !== 'number' && typeof v !== 'boolean') throw bad(`Key "${key}" is not sortable.`);
    break;
  }
  return {
    kind,
    get: r => {
      const v = (r as Record<string, unknown>)[key];
      if (typeof v === 'number' || typeof v === 'string') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
      return null;
    },
  };
}

export function playerKey(key: string, rows: readonly Player[], hits: Hits, cfg: RatingConfig): KeySpec<Player> {
  const [prefix, arg] = splitKey(key);
  switch (prefix) {
    case '':
      break;
    case 'attr':
      requireIn(arg, PLAYER_ATTRS, key);
      return num(p => (p.attrs as Record<string, number>)[arg] ?? null);
    case 'pers':
      requireIn(arg, PERSONALITY, key);
      return num(p => (p.personality as Record<string, number>)[arg] ?? null);
    case 'pos':
      requireIn(arg, POSITIONS, key);
      return num(p => p.positions[arg as PositionKey] ?? null);
    case 'posr':
      requireIn(arg, POSITIONS, key);
      return num(p => p.positionRatings[arg as PositionKey] ?? null);
    case 'role': {
      if (!Object.hasOwn(ROLE_BY_ID, arg)) throw bad(`Unknown role in key "${key}".`);
      const known = arg === hits.roleId ? hits.role : null;
      return known ? num((_p, h) => known[h]) : num(p => roleRatingById(p.attrs, arg, cfg));
    }
    default:
      throw bad(`Unknown key "${key}".`);
  }
  switch (key) {
    case 'wage': return num(p => p.contract?.wage ?? null);
    case 'expires': return str(p => p.contract?.expires ?? null);
    case 'bestRole': return num(p => p.bestRole?.rating ?? null);
    case 'growth': return num(p => p.pa - p.ca);
    case 'nation': return str(p => p.nations[0] ?? null);
    case 'releaseClause': return num(p => releaseClauseAmount(p.contract));
    case 'transferListed': return num(p => (p.contract ? +p.contract.transferListed : null));
    case 'loanListed': return num(p => (p.contract ? +p.contract.loanListed : null));
    default: return plainKey(rows, key);
  }
}

export function staffKey(key: string, rows: readonly Staff[], hits: Hits): KeySpec<Staff> {
  const [prefix, arg] = splitKey(key);
  switch (prefix) {
    case '':
      break;
    case 'attr':
      requireIn(arg, STAFF_ATTRS, key);
      return num(s => (s.attrs as Record<string, number>)[arg] ?? null);
    case 'pers':
      requireIn(arg, PERSONALITY, key);
      return num(s => (s.personality as Record<string, number>)[arg] ?? null);
    case 'role': {
      if (!Object.hasOwn(STAFF_ROLE_BY_ID, arg)) throw bad(`Unknown staff role in key "${key}".`);
      const def = STAFF_ROLE_BY_ID[arg];
      const known = arg === hits.roleId ? hits.role : null;
      return known ? num((_s, h) => known[h]) : num(s => s.ratings[def.id] ?? 0);
    }
    default:
      throw bad(`Unknown key "${key}".`);
  }
  switch (key) {
    case 'wage': return num(s => s.contract?.wage ?? null);
    case 'expires': return str(s => s.contract?.expires ?? null);
    case 'bestRole': return num(s => s.bestRole?.rating ?? null);
    case 'nation': return str(s => s.nations[0] ?? null);
    default: return plainKey(rows, key);
  }
}

export function clubKey(key: string, rows: readonly Club[]): KeySpec<Club> {
  return plainKey(rows, key);
}

// ------------------------------------------------------------------ sort + paginate

export function parseSort(v: unknown, fallback: Sort): Sort {
  if (absent(v)) return fallback;
  if (!isObject(v) || typeof v.key !== 'string' || !v.key) throw bad('sort must be { "key": string, "dir": "asc" | "desc" }.');
  if (!absent(v.dir) && v.dir !== 'asc' && v.dir !== 'desc') throw bad('sort.dir must be "asc" or "desc".');
  return { key: v.key, dir: v.dir === 'desc' ? 'desc' : 'asc' };
}

/** Stable sort of the hits by one key; missing values (null, NaN, '') always go last. */
export function sortHits<T>(rows: readonly T[], hits: Hits, spec: KeySpec<T>, dir: Sort['dir']): Hits {
  const { idx, role } = hits;
  const n = idx.length;
  const sign = dir === 'desc' ? -1 : 1;
  const order = new Array<number>(n);
  for (let k = 0; k < n; k++) order[k] = k;

  if (spec.kind === 'num') {
    const vals = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const v = spec.get(rows[idx[k]], k);
      vals[k] = typeof v === 'number' ? v : NaN;
    }
    order.sort((a, b) => {
      const x = vals[a], y = vals[b];
      const xMissing = Number.isNaN(x), yMissing = Number.isNaN(y);
      if (xMissing || yMissing) return xMissing === yMissing ? a - b : xMissing ? 1 : -1;
      return x < y ? -sign : x > y ? sign : a - b;
    });
  } else {
    const vals = new Array<string | null>(n);
    const folded = new Map<string, string>();
    for (let k = 0; k < n; k++) {
      const v = spec.get(rows[idx[k]], k);
      if (typeof v !== 'string' || v === '') { vals[k] = null; continue; }
      let f = folded.get(v);
      if (f === undefined) folded.set(v, f = fold(v));
      vals[k] = f;
    }
    order.sort((a, b) => {
      const x = vals[a], y = vals[b];
      if (x === null || y === null) return x === y ? a - b : x === null ? 1 : -1;
      return x < y ? -sign : x > y ? sign : a - b;
    });
  }

  const outIdx = new Array<number>(n);
  const outRole = role ? new Array<number>(n) : null;
  for (let k = 0; k < n; k++) {
    outIdx[k] = idx[order[k]];
    if (outRole) outRole[k] = role![order[k]];
  }
  return { idx: outIdx, role: outRole, roleId: hits.roleId };
}

export function pageBounds(total: number, offset: unknown, limit: unknown): { start: number; end: number } {
  const o = optInt(offset, 'offset') ?? 0;
  const l = optInt(limit, 'limit') ?? DEFAULT_LIMIT;
  if (o < 0 || l < 0) throw bad('offset and limit must not be negative.');
  const start = Math.min(o, total);
  return { start, end: Math.min(total, start + Math.min(l, MAX_LIMIT)) };
}

function page<T>(rows: readonly T[], hits: Hits, offset: unknown, limit: unknown): SearchResponse<T> {
  const { start, end } = pageBounds(hits.idx.length, offset, limit);
  const out: SearchResponse<T> = { total: hits.idx.length, rows: hits.idx.slice(start, end).map(i => rows[i]) };
  if (hits.role) out.roleRatings = hits.role.slice(start, end);
  return out;
}

// Without an explicit sort: by the query role when there is one, otherwise by the most telling number.
const roleFirst = (hits: Hits, fallback: Sort): Sort => (hits.roleId ? { key: `role:${hits.roleId}`, dir: 'desc' } : fallback);

/** Filtered and sorted player hits (all of them; used by search and export). */
export function sortedPlayerHits(players: readonly Player[], query: PlayerQuery | undefined, sort: unknown, ctx: PlayerSearchCtx): Hits {
  const hits = filterPlayers(players, query, ctx);
  const s = parseSort(sort, roleFirst(hits, { key: 'ca', dir: 'desc' }));
  return sortHits(players, hits, playerKey(s.key, players, hits, ctx.ratingConfig), s.dir);
}

export function searchPlayers(players: readonly Player[], req: SearchRequest<PlayerQuery> | undefined, ctx: PlayerSearchCtx): SearchResponse<Player> {
  const r = optObject(req, 'request body');
  const hits = sortedPlayerHits(players, r.query as PlayerQuery | undefined, r.sort, ctx);
  return page(players, hits, r.offset, r.limit);
}

export function searchStaff(staff: readonly Staff[], req: SearchRequest<StaffQuery> | undefined, ctx: StaffSearchCtx): SearchResponse<Staff> {
  const r = optObject(req, 'request body');
  const hits = filterStaff(staff, r.query as StaffQuery | undefined, ctx);
  const s = parseSort(r.sort, roleFirst(hits, { key: 'currentRep', dir: 'desc' }));
  return page(staff, sortHits(staff, hits, staffKey(s.key, staff, hits), s.dir), r.offset, r.limit);
}

export function searchClubs(clubs: readonly Club[], req: SearchRequest<ClubQuery> | undefined, ctx: ClubSearchCtx): SearchResponse<Club> {
  const r = optObject(req, 'request body');
  const hits = filterClubs(clubs, r.query as ClubQuery | undefined, ctx);
  const s = parseSort(r.sort, { key: 'reputation', dir: 'desc' });
  return page(clubs, sortHits(clubs, hits, clubKey(s.key, clubs), s.dir), r.offset, r.limit);
}
