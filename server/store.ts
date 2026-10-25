// In-memory home of the loaded game: the GameData itself plus the indexes every request relies on.
// Also hosts the few helpers shared by all server modules (HttpError, fold) so that nothing imports in a cycle.
import type { Meta, Status } from '../shared/api.ts';
import { PERSONALITY_TYPES } from '../shared/personality.ts';
import { computeRatings, DEFAULT_RATING_CONFIG, type RatingConfig } from '../shared/ratings.ts';
import type { Club, Player, Staff } from '../shared/types.ts';
import { isFmRunning, loadLiveGame } from './fm/reader.ts';
import type { GameData, LoadProgress, ProgressFn } from './fm/types.ts';

/** An error carrying an HTTP status; the error middleware turns it into `{ error }` with that status. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const ASCII = /^[\u0000-\u007f]*$/;
const COMBINING_MARKS = /[̀-ͯ]/g;
// Letters that NFD does not decompose but users type without the stroke ("Ødegaard", "Łukasz").
const NON_DECOMPOSING: Record<string, string> = {
  'ø': 'o', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'ħ': 'h', 'ı': 'i', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'þ': 'th',
};
const NON_DECOMPOSING_RE = /[øłđðħıßæœþ]/g;

/** Lowercase, accent-free form used for all text matching and string sorting. */
export function fold(s: string): string {
  if (!s) return '';
  if (ASCII.test(s)) return s.toLowerCase();
  return s.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
    .replace(NON_DECOMPOSING_RE, c => NON_DECOMPOSING[c]);
}

type Named = Pick<Player, 'name' | 'commonName' | 'firstName' | 'lastName'>;

/** Folded display name plus any other spelling of it, newline separated (search words never contain '\n'). */
function nameKey(p: Named): string {
  let key = fold(p.name);
  for (const variant of [p.commonName, `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()]) {
    const f = fold(variant);
    if (f && !key.includes(f)) key += '\n' + f;
  }
  return key;
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const sorted = (values: Iterable<string>): string[] => [...values].sort(collator.compare);

function buildMeta(d: GameData): Meta {
  const nations = new Set<string>();
  const continents = new Set<string>();
  const jobs = new Set<string>();
  const traits = new Set<string>();
  const labels = new Set<string>(PERSONALITY_TYPES);
  const leagues = new Map<string, { name: string; nation: string; players: number }>();
  const league = (name: string, nation: string) => {
    const k = `${name}\u0000${nation}`;
    let l = leagues.get(k);
    if (!l) leagues.set(k, l = { name, nation, players: 0 });
    return l;
  };

  for (const c of d.clubs) {
    if (c.nation) nations.add(c.nation);
    if (c.continent) continents.add(c.continent);
    if (c.league) league(c.league, c.leagueNation ?? '');
  }
  for (const p of d.players) {
    for (const n of p.nations) if (n) nations.add(n);
    for (const t of p.traits) if (t) traits.add(t);
    if (p.continent) continents.add(p.continent);
    if (p.personalityLabel) labels.add(p.personalityLabel);
    if (p.league) league(p.league, p.leagueNation ?? '').players++;
  }
  for (const s of d.staff) {
    for (const n of s.nations) if (n) nations.add(n);
    if (s.job) jobs.add(s.job);
    if (s.personalityLabel) labels.add(s.personalityLabel);
  }

  return {
    nations: sorted(nations),
    leagues: [...leagues.values()].sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.nation, b.nation)),
    continents: sorted(continents),
    jobs: sorted(jobs),
    traits: sorted(traits),
    personalityLabels: sorted(labels),
    currencies: d.currencies ?? [],
  };
}

function applyRatings(players: readonly Player[], cfg: RatingConfig): void {
  for (const p of players) {
    const r = computeRatings(p.attrs, p.positions, cfg);
    p.positionText = r.positionText;
    p.bestPosition = r.bestPosition;
    p.bestRole = r.bestRole;
    p.positionRatings = r.positionRatings;
  }
}

function groupByClub<T extends { clubId: number | null }>(rows: readonly T[]): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    if (r.clubId === null || r.clubId === undefined) continue;
    const list = out.get(r.clubId);
    if (list) list.push(r);
    else out.set(r.clubId, [r]);
  }
  return out;
}

const FM_CHECK_INTERVAL_MS = 2000;

class Store {
  data: GameData | null = null;
  ratingConfig: RatingConfig = DEFAULT_RATING_CONFIG;

  playerById = new Map<number, Player>();
  staffById = new Map<number, Staff>();
  clubById = new Map<number, Club>();
  playersByClub = new Map<number, Player[]>();
  staffByClub = new Map<number, Staff[]>();
  // Folded search strings, index-aligned with data.players / data.staff / data.clubs. Arrays are replaced
  // (never mutated) on load, so a request that reads them synchronously always sees a consistent set.
  playerNameKeys: string[] = [];
  playerClubKeys: string[] = [];
  staffNameKeys: string[] = [];
  staffClubKeys: string[] = [];
  clubNameKeys: string[] = [];

  private state: Status['state'] = 'idle';
  private message: string | null = null;
  private progress: LoadProgress | null = null;
  private snapshotName: string | null = null;
  private meta: Meta | null = null;
  private fmCheck = { at: 0, running: false };

  get players(): Player[] { return this.data?.players ?? []; }
  get staff(): Staff[] { return this.data?.staff ?? []; }
  get clubs(): Club[] { return this.data?.clubs ?? []; }
  get humanClubId(): number | null { return this.data?.humanClubId ?? null; }

  requireData(): GameData {
    if (!this.data) throw new HttpError(409, 'No data loaded yet. Load the running game or a snapshot first.');
    return this.data;
  }

  getMeta(): Meta {
    const d = this.requireData();
    return this.meta ??= buildMeta(d);
  }

  status(): Status {
    const d = this.data;
    return {
      state: this.state,
      source: d?.source ?? null,
      message: this.message,
      fmRunning: this.fmRunning(),
      gameDate: d?.gameDate ?? null,
      loadedAt: d?.loadedAt ?? null,
      counts: { players: d?.players.length ?? 0, staff: d?.staff.length ?? 0, clubs: d?.clubs.length ?? 0 },
      humanClubId: d?.humanClubId ?? null,
      humanClub: d?.humanClub ?? null,
      snapshotName: d ? this.snapshotName : null,
      progress: this.state === 'loading' ? this.progress : null,
    };
  }

  /** Starts reading the running game in the background; a second call while loading is a no-op. */
  startLiveLoad(): Status {
    if (this.state !== 'loading') {
      this.fmCheck.at = 0;
      this.runLoad(loadLiveGame, null).catch(err => console.error(`Loading from FM failed: ${errorMessage(err)}`));
    }
    return this.status();
  }

  /**
   * Runs one load at a time (live read or snapshot). Previously loaded data stays queryable until the new
   * data is complete, and is kept if the load fails (state becomes "error" with the reason in `message`).
   */
  async runLoad(task: (onProgress: ProgressFn) => Promise<GameData>, snapshotName: string | null): Promise<void> {
    if (this.state === 'loading') throw new HttpError(409, 'A load is already in progress.');
    this.state = 'loading';
    this.message = null;
    this.progress = { phase: 'Starting', done: 0, total: 0 };
    try {
      const data = await task(p => { this.progress = { phase: p.phase, done: p.done, total: p.total }; });
      this.setData(data, snapshotName);
      this.state = 'ready';
    } catch (err) {
      this.state = 'error';
      this.message = errorMessage(err);
      throw err;
    } finally {
      this.progress = null;
    }
  }

  /** Applies new rating settings; player bestRole/positionRatings/positionText are recomputed if they changed. */
  setRatingConfig(cfg: RatingConfig): void {
    if (JSON.stringify(cfg) === JSON.stringify(this.ratingConfig)) return;
    this.ratingConfig = cfg;
    if (this.data) applyRatings(this.data.players, cfg);
  }

  private setData(data: GameData, snapshotName: string | null): void {
    if (!data || !Array.isArray(data.players) || !Array.isArray(data.staff) || !Array.isArray(data.clubs)) {
      throw new Error('The loaded data is incomplete (players, staff or clubs missing).');
    }
    // The reader (or an old snapshot) may have rated players with other settings.
    applyRatings(data.players, this.ratingConfig);

    const { players, staff, clubs } = data;
    const playerById = new Map<number, Player>();
    const playerNameKeys = new Array<string>(players.length);
    const playerClubKeys = new Array<string>(players.length);
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      playerById.set(p.id, p);
      playerNameKeys[i] = nameKey(p);
      playerClubKeys[i] = fold(p.club);
    }
    const staffById = new Map<number, Staff>();
    const staffNameKeys = new Array<string>(staff.length);
    const staffClubKeys = new Array<string>(staff.length);
    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      staffById.set(s.id, s);
      staffNameKeys[i] = nameKey(s);
      staffClubKeys[i] = fold(s.club);
    }
    const clubById = new Map<number, Club>();
    const clubNameKeys = new Array<string>(clubs.length);
    for (let i = 0; i < clubs.length; i++) {
      const c = clubs[i];
      clubById.set(c.id, c);
      const name = fold(c.name), short = fold(c.shortName);
      clubNameKeys[i] = short && !name.includes(short) ? `${name}\n${short}` : name;
    }

    this.data = data;
    this.snapshotName = snapshotName;
    this.meta = null;
    this.playerById = playerById;
    this.staffById = staffById;
    this.clubById = clubById;
    this.playersByClub = groupByClub(players);
    this.staffByClub = groupByClub(staff);
    this.playerNameKeys = playerNameKeys;
    this.playerClubKeys = playerClubKeys;
    this.staffNameKeys = staffNameKeys;
    this.staffClubKeys = staffClubKeys;
    this.clubNameKeys = clubNameKeys;
  }

  // The UI polls status every second or so; checking the process list that often is wasteful.
  private fmRunning(): boolean {
    const now = Date.now();
    if (now - this.fmCheck.at > FM_CHECK_INTERVAL_MS) {
      let running = false;
      try { running = isFmRunning(); } catch { running = false; }
      this.fmCheck = { at: now, running };
    }
    return this.fmCheck.running;
  }
}

export const store = new Store();
