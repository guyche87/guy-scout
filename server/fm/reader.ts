// Entry point of the FM24 memory reader: attaches to fm.exe, reads the whole database, detaches.
import type { Club, Player, Staff } from '../../shared/types.ts';
import { DEFAULT_RATING_CONFIG, type RatingConfig } from '../../shared/ratings.ts';
import { DB, PERSON_CLASS, PLAYER_PART } from './offsets.ts';
import { PeopleReader } from './people.ts';
import { FmSession, type ClubInfo } from './session.ts';
import { findProcess } from './win32.ts';
import type { GameData, ProgressFn } from './types.ts';

export type { GameData, LoadProgress, ProgressFn } from './types.ts';

const CHUNK = 2000;
/** FM stores 300M as the sale value of players who are not for sale. */
const SALE_VALUE_CAP = 300_000_000;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

export function isFmRunning(): boolean {
  return findProcess('fm.exe') !== null;
}

/**
 * Attaches to the running FM24 process (read-only) and reads players, staff and clubs.
 * Memory reads are synchronous; work is chunked and yields to the event loop between chunks.
 */
export async function loadLiveGame(onProgress: ProgressFn, cfg: RatingConfig = DEFAULT_RATING_CONFIG): Promise<GameData> {
  onProgress({ phase: 'Attaching to Football Manager', done: 0, total: 1 });
  await tick();
  const s = FmSession.attach();
  s.mem.enableCache();
  try {
    onProgress({ phase: 'Reading nations, clubs and competitions', done: 0, total: 1 });
    await tick();
    const gameDate = s.gameDate();
    const currencies = s.currencies();
    s.loadNations();
    s.loadClubs();
    await tick();

    const persons = s.table(DB.persons);
    const reader = new PeopleReader(s, gameDate, cfg);
    const players: Player[] = [];
    const staff: Staff[] = [];
    let humanClub: ClubInfo | null = null;
    let humanStaff: Staff | null = null;

    for (let i = 0; i < persons.length; i++) {
      if (i % CHUNK === 0) {
        onProgress({ phase: 'Reading people', done: i, total: persons.length });
        await tick();
      }
      const per = persons[i];
      const cls = s.className(s.mem.ptr(per));
      if (cls === PERSON_CLASS.player) {
        const p = reader.readPlayer(per, PLAYER_PART.ACTUAL_PLAYER, false);
        if (p) players.push(p);
      } else if (cls === PERSON_CLASS.staff) {
        const st = reader.readStaff(per, false);
        if (st) staff.push(st);
      } else if (cls === PERSON_CLASS.playerStaff) {
        const p = reader.readPlayer(per, PLAYER_PART.ACTUAL_PLAYER_AND_NON_PLAYER, true);
        if (p) players.push(p);
        const st = reader.readStaff(per, true);
        if (st) staff.push(st);
      } else if (cls === PERSON_CLASS.human) {
        const st = reader.readStaff(per, false);
        if (st) {
          staff.push(st);
          if (st.clubId !== null && !humanStaff) {
            humanStaff = st;
            humanClub = [...s.clubsByPtr.values()].find(c => c.id === st.clubId) ?? null;
          }
        }
      }
    }
    onProgress({ phase: 'Building club summaries', done: persons.length, total: persons.length });
    await tick();
    assertLayoutLooksRight(players, s);

    return {
      source: 'live',
      gameDate,
      loadedAt: new Date().toISOString(),
      players,
      staff,
      clubs: summarizeClubs([...s.clubsByPtr.values()], players, staff),
      currencies,
      humanClubId: humanClub?.id ?? null,
      humanClub: humanClub?.name ?? null,
    };
  } finally {
    s.close();
  }
}

/** Guards against a wrong/shifted layout: fail with a diagnostic message instead of showing garbage. */
function assertLayoutLooksRight(players: Player[], s: FmSession): void {
  const info = s.describe();
  if (players.length === 0) {
    throw new Error(`${info}: found FM but could not read any players. Make sure you are inside a fully loaded save (not the main menu or a loading screen), then try again. On Game Pass or Epic the tool targets the Steam build of FM24 and may not match.`);
  }
  let plausible = 0;
  for (const p of players) if (p.ca >= 1 && p.ca <= 200 && p.pa >= p.ca - 5 && p.attrs.pace >= 1 && p.birthDate) plausible++;
  // A real save has hundreds+ of players; a tiny count or mostly-garbage data means the layout is wrong.
  if (plausible / players.length < 0.9 || plausible < 20) {
    throw new Error(`${info}: the player data does not look right (read ${players.length}, ${plausible} plausible). This usually means the save is still loading, or a different FM build than the Steam FM24 24.4.x the tool targets (e.g. Game Pass or Epic).`);
  }
}

export function summarizeClubs(infos: ClubInfo[], players: Player[], staff: Staff[]): Club[] {
  const byClub = new Map<number, Player[]>();
  for (const p of players) {
    if (p.clubId === null) continue;
    let arr = byClub.get(p.clubId);
    if (!arr) byClub.set(p.clubId, (arr = []));
    arr.push(p);
  }
  const staffCount = new Map<number, number>();
  for (const st of staff) if (st.clubId !== null) staffCount.set(st.clubId, (staffCount.get(st.clubId) ?? 0) + 1);
  return infos.filter(c => c.name).map(c => {
    const squad = byClub.get(c.id) ?? [];
    let best: Player | null = null, sumCa = 0, sumAge = 0, wages = 0, value = 0;
    for (const p of squad) {
      sumCa += p.ca;
      sumAge += p.age;
      wages += p.contract?.wage ?? 0;
      if (p.value < SALE_VALUE_CAP) value += p.value; // capped = not for sale; would swamp the total
      if (!best || p.ca > best.ca) best = p;
    }
    const n = squad.length || 1;
    return {
      id: c.id, name: c.name, shortName: c.shortName, nation: c.nation, league: c.league,
      leagueNation: c.leagueNation, continent: c.continent, reputation: c.reputation,
      squadSize: squad.length,
      avgAge: Math.round((sumAge / n) * 10) / 10,
      avgCa: Math.round((sumCa / n) * 10) / 10,
      bestCa: best?.ca ?? 0, bestPlayer: best?.name ?? '',
      totalWages: wages, totalValue: value,
      staffCount: staffCount.get(c.id) ?? 0,
    };
  });
}
