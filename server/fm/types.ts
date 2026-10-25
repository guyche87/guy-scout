// What the FM memory reader produces for the rest of the server.
import type { Club, Currency, Player, Staff } from '../../shared/types.ts';

export interface GameData {
  source: 'live' | 'snapshot';
  /** ISO date of the in-game current date. */
  gameDate: string | null;
  loadedAt: string;
  players: Player[];
  staff: Staff[];
  /** Clubs with squad aggregates already filled in. */
  clubs: Club[];
  /** Optional so snapshots saved before this field existed still load. */
  currencies?: Currency[];
  humanClubId: number | null;
  humanClub: string | null;
}

export interface LoadProgress {
  phase: string;
  done: number;
  total: number;
}

export type ProgressFn = (p: LoadProgress) => void;
