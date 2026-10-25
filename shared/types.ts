// Data contract between the scout server and the web UI.
import type { PersonalityKey, PlayerAttrKey, PositionKey, StaffAttrKey } from './attributes.ts';

export interface ReleaseClause {
  type: string;
  amount: number;
}

export interface Contract {
  /** Weekly wage in FM's base currency. */
  wage: number;
  /** ISO date (yyyy-mm-dd) or null when unknown. */
  expires: string | null;
  releaseClauses: ReleaseClause[];
  transferListed: boolean;
  loanListed: boolean;
}

export interface RoleRating {
  /** Role id from shared/roles.ts, e.g. "AF-A". */
  id: string;
  /** 0..100 */
  rating: number;
}

export interface Player {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  commonName: string;
  birthDate: string | null;
  age: number;
  /** Primary nationality first. */
  nations: string[];
  clubId: number | null;
  club: string;
  league: string;
  leagueNation: string;
  continent: string;
  onLoan: boolean;
  loanFromClubId: number | null;
  loanFromClub: string;
  ca: number;
  pa: number;
  currentRep: number;
  worldRep: number;
  height: number;
  weight: number;
  /** 0..20 familiarity per position. */
  positions: Record<PositionKey, number>;
  /** 1..20 (raw values are /5 and rounded). Includes hidden attributes. */
  attrs: Record<PlayerAttrKey, number>;
  personality: Record<PersonalityKey, number>;
  personalityLabel: string;
  traits: string[];
  contract: Contract | null;
  /** Sale value: the asking price FM stores per player (base currency, GBP; capped at 300M). Not shown in-game. */
  value: number;
  /** Summary like "D (RC), DM". */
  positionText: string;
  bestPosition: PositionKey;
  bestRole: RoleRating;
  /** Best rating per position (0..100), attribute-based only. */
  positionRatings: Partial<Record<PositionKey, number>>;
  /** True when the player is also a member of staff (player-coach). */
  alsoStaff: boolean;
}

export interface PlayerDetail extends Player {
  /** Every role rating, sorted best first. */
  roleRatings: RoleRating[];
  /** Estimated attributes at potential (1..20). */
  projected: Record<PlayerAttrKey, number>;
  /** Short scouting report paragraphs. */
  report: string[];
}

export interface Staff {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  commonName: string;
  birthDate: string | null;
  age: number;
  nations: string[];
  clubId: number | null;
  club: string;
  league: string;
  job: string;
  jobCode: number;
  ca: number;
  pa: number;
  currentRep: number;
  homeRep: number;
  worldRep: number;
  attrs: Record<StaffAttrKey, number>;
  personality: Record<PersonalityKey, number>;
  personalityLabel: string;
  contract: Contract | null;
  alsoPlayer: boolean;
  /** Suitability per staff role (0..100), see shared/staffRoles.ts. */
  ratings: Record<string, number>;
  bestRole: RoleRating;
  /** Training category star ratings (0..5 in 0.5 steps). */
  coachingStars: Record<string, number>;
}

export interface Club {
  id: number;
  name: string;
  shortName: string;
  nation: string;
  league: string;
  leagueNation: string;
  continent: string;
  reputation: number;
  squadSize: number;
  avgAge: number;
  avgCa: number;
  bestCa: number;
  bestPlayer: string;
  totalWages: number;
  totalValue: number;
  staffCount: number;
}

export interface ClubDetail extends Club {
  players: Player[];
  staff: Staff[];
}

/** A currency from FM's own table; rate = units per 1 GBP (FM's base currency). */
export interface Currency {
  name: string;
  symbol: string;
  rate: number;
}

export interface Shortlist {
  id: string;
  name: string;
  playerIds: number[];
  notes: Record<string, string>;
}

export interface Settings {
  currencySymbol: string;
  /** Multiplier applied to FM base-currency amounts for display. */
  currencyRate: number;
  /** Per-role overrides of key/preferred attributes and weights (see shared/roles.ts). */
  roleOverrides: Record<string, { key: PlayerAttrKey[]; preferred: PlayerAttrKey[] }>;
  ratingWeights: { key: number; preferred: number };
  /** Folder where FM reads/writes shortlists; .slf files are imported from and exported to here. */
  fmShortlistsDir: string;
  /** FM data build stamped into exported .slf files; learned from any .slf the scout reads. */
  fmBuildId: number;
}
