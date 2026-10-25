// HTTP API contract (all JSON). Base path: /api
import type { PersonalityKey, PlayerAttrKey, PositionKey, StaffAttrKey } from './attributes.ts';
import type { Club, ClubDetail, Currency, Player, PlayerDetail, Settings, Shortlist, Staff } from './types.ts';

export interface Range {
  min?: number;
  max?: number;
}

export interface PlayerQuery {
  /** Name contains (accent/case-insensitive). */
  text?: string;
  /** Club name contains. */
  club?: string;
  clubId?: number;
  /** Any of these nationalities (primary or secondary). */
  nations?: string[];
  leagues?: string[];
  leagueNations?: string[];
  continents?: string[];
  age?: Range;
  ca?: Range;
  pa?: Range;
  /** Max PA-CA gap or min: use for "room to grow". */
  growth?: Range;
  currentRep?: Range;
  value?: Range;
  wage?: Range;
  height?: Range;
  /** Any of these positions at >= minFamiliarity (default 15). */
  positions?: PositionKey[];
  minFamiliarity?: number;
  /** Role id + minimum rating 0..100. */
  role?: string;
  minRoleRating?: number;
  /** ISO date; contract ends on or before. */
  contractExpiresBefore?: string;
  freeAgent?: boolean;
  onLoan?: boolean;
  transferListed?: boolean;
  loanListed?: boolean;
  hasReleaseClause?: boolean;
  foot?: 'left' | 'right' | 'both';
  /** Minimum attribute values (1..20). */
  attrs?: Partial<Record<PlayerAttrKey, number>>;
  /** Minimum personality values (1..20); controversy is treated as a maximum. */
  personality?: Partial<Record<PersonalityKey, number>>;
  personalityLabels?: string[];
  traits?: string[];
  shortlistId?: string;
  myClub?: boolean;
  ids?: number[];
}

export interface StaffQuery {
  text?: string;
  club?: string;
  clubId?: number;
  nations?: string[];
  leagues?: string[];
  jobs?: string[];
  age?: Range;
  ca?: Range;
  pa?: Range;
  currentRep?: Range;
  freeAgent?: boolean;
  /** Staff role id from shared/staffRoles.ts + minimum rating. */
  role?: string;
  minRoleRating?: number;
  attrs?: Partial<Record<StaffAttrKey, number>>;
  myClub?: boolean;
}

export interface ClubQuery {
  text?: string;
  nations?: string[];
  leagues?: string[];
  reputation?: Range;
  /** Only clubs that have at least one player loaded. */
  withSquad?: boolean;
}

/**
 * Sort keys: any top-level numeric/string field of the row ("ca", "age", "value", "name", "club"),
 * "attr:<key>", "pers:<key>", "pos:<PositionKey>" (familiarity), "posr:<PositionKey>" (position rating),
 * "role:<roleId>", "wage", "expires", "bestRole".
 */
export interface Sort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface SearchRequest<Q> {
  query: Q;
  sort?: Sort;
  offset?: number;
  /** Default 100, max 1000. */
  limit?: number;
}

export interface SearchResponse<T> {
  total: number;
  rows: T[];
  /** Present when the query had a role: rating of each row for that role. */
  roleRatings?: number[];
}

export interface Status {
  state: 'idle' | 'loading' | 'ready' | 'error';
  source: 'live' | 'snapshot' | null;
  message: string | null;
  fmRunning: boolean;
  gameDate: string | null;
  loadedAt: string | null;
  counts: { players: number; staff: number; clubs: number };
  humanClubId: number | null;
  humanClub: string | null;
  snapshotName: string | null;
  progress: { phase: string; done: number; total: number } | null;
}

export interface Meta {
  nations: string[];
  leagues: { name: string; nation: string; players: number }[];
  continents: string[];
  jobs: string[];
  traits: string[];
  personalityLabels: string[];
  /** FM's currencies with the game's exchange rates (empty for old snapshots). */
  currencies: Currency[];
}

export interface SnapshotInfo {
  name: string;
  gameDate: string | null;
  savedAt: string;
  sizeBytes: number;
}

export interface SlfFileInfo {
  /** File name within the FM shortlists folder, e.g. "my list.slf". */
  file: string;
  /** Shortlist name stored inside the file. */
  name: string;
  players: number;
  savedAt: string;
}

export interface SlfImportResult {
  name: string;
  total: number;
  matched: { id: number; name: string }[];
  /** UIDs not found in the loaded game (e.g. from a different save). */
  unmatched: number[];
}

export interface SlfExportResult {
  file: string;
  path: string;
  players: number;
}

export interface ExportRequest {
  query: PlayerQuery;
  sort?: Sort;
  /** Column keys using the same syntax as sort keys. */
  columns: string[];
  format: 'csv' | 'html';
}

// Endpoint map (method path -> request -> response), for reference:
//   GET  /api/status                         -> Status
//   POST /api/load                           -> Status          (attach to running FM and read everything)
//   GET  /api/meta                           -> Meta
//   POST /api/players/search  SearchRequest<PlayerQuery> -> SearchResponse<Player>
//   GET  /api/players/:id                    -> PlayerDetail
//   POST /api/players/export  ExportRequest  -> file (text/csv or text/html)
//   POST /api/staff/search    SearchRequest<StaffQuery>  -> SearchResponse<Staff>
//   GET  /api/staff/:id                      -> Staff
//   POST /api/clubs/search    SearchRequest<ClubQuery>   -> SearchResponse<Club>
//   GET  /api/clubs/:id                      -> ClubDetail
//   GET  /api/shortlists                     -> Shortlist[]
//   GET  /api/shortlists/fm-files            -> SlfFileInfo[]   (Genie Scout .slf files in the FM folder)
//   POST /api/shortlists/import   {file}     -> SlfImportResult (match a .slf's ids to loaded players)
//   POST /api/shortlists/export   {name, playerIds} -> SlfExportResult (write a .slf FM can open)
//   PUT  /api/shortlists      Shortlist[]    -> Shortlist[]
//   GET  /api/settings                       -> Settings
//   PUT  /api/settings        Settings       -> Settings
//   GET  /api/snapshots                      -> SnapshotInfo[]
//   POST /api/snapshots       {}             -> SnapshotInfo    (save current data to data/snapshots)
//   POST /api/snapshots/load  {name}         -> Status
//   GET  /api/snapshots/:name/download       -> .json.gz file
export type { Club, ClubDetail, Player, PlayerDetail, Settings, Shortlist, Staff };
