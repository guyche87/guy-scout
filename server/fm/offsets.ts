// FM24 (24.4.x, 64-bit) memory layout. Person offsets come from the community FM24 Cheat Engine table
// (also used by github.com/dgarfias/fm_scouter); staff/club/date details were reverse-engineered here
// against a live 24.4.2 game using MSVC RTTI class names.
import type { PersonalityKey, PlayerAttrKey, StaffAttrKey } from '../../shared/attributes.ts';

export const AOB = {
  /** lea rcx,[dbtRoot] ; lea rdx,... — validated by following dbtRoot+0x68 to a plausible person table. */
  dbtRoot: '48 8D 0D ?? ?? ?? ?? 48 8D 15',
  /** xor edx,1 ; mov eax,[gameDate] ; or ... — disp32 at +5, instruction ends at +9. */
  gameDate: '83 F2 01 8B 05 ?? ?? ?? ?? 66 09',
} as const;

/** Tables hanging off dbtRoot. Each points to a db object whose +0x80 is a std::vector<T*> descriptor. */
export const DB = {
  vectorInDb: 0x80,
  clubs: 0x10,
  competitions: 0x18,
  continents: 0x20,
  currencies: 0x30,
  nations: 0x28,
  persons: 0x68,
  teams: 0x98,
} as const;

/** RTTI class names (without .?AV / @db@@) and the offset from the person sub-object to the complete object. */
export const PERSON_CLASS = {
  player: 'ACTUAL_PLAYER',
  staff: 'ACTUAL_NON_PLAYER',
  playerStaff: 'ACTUAL_PLAYER_AND_NON_PLAYER',
  human: 'HUMAN_NON_PLAYER',
} as const;

/** Distance from the person sub-object back to the player part. */
export const PLAYER_PART = { ACTUAL_PLAYER: 0x278, ACTUAL_PLAYER_AND_NON_PLAYER: 0x368 } as const;
/** The non-player (staff) part always sits right before the person sub-object. */
export const STAFF_PART_BACK = 0xF8;

export const PERSON = {
  uid: 0x0C,
  dobDay: 0x44,
  dobYear: 0x46,
  firstName: 0x58,
  lastName: 0x60,
  commonName: 0x68,
  nation: 0x70,
  personality: 0x78, // 8 bytes, 1..20, order = PERSONALITY_ORDER
  nationList: 0x80,
  contract: 0xC8,
  loanContract: 0xD0,
  traits: 0xF0, // 8-byte bitfield
  size: 0xF8,
} as const;

export const PERSONALITY_ORDER: PersonalityKey[] = [
  'adaptability', 'ambition', 'loyalty', 'pressure', 'professionalism', 'sportsmanship', 'temperament', 'controversy',
];

/** Offsets inside the player part (from its start). */
export const PLAYER = {
  blockStart: 0x148,
  blockSize: 0x108, // up to 0x250, covers attributes (0x217 + 54)
  weight: 0x14C,
  height: 0x14E,
  saleValue: 0x1D0,
  currentRep: 0x1FC,
  worldRep: 0x1FE,
  ca: 0x200,
  pa: 0x202,
  positions: 0x208, // 15 bytes, 1..20, order = shared POSITIONS
  attrs: 0x217, // 54 raw bytes (value * 5)
} as const;

/** Byte offset of each attribute inside the 54-byte attribute block (FM24 CE table). */
export const PLAYER_ATTR_OFFSETS: Record<PlayerAttrKey, number> = {
  crossing: 0x00, dribbling: 0x01, finishing: 0x02, heading: 0x03, longShots: 0x04, marking: 0x05,
  offTheBall: 0x06, passing: 0x07, penaltyTaking: 0x08, tackling: 0x09, vision: 0x0A, handling: 0x0B,
  aerialReach: 0x0C, commandOfArea: 0x0D, communication: 0x0E, kicking: 0x0F, throwing: 0x10,
  anticipation: 0x11, decisions: 0x12, oneOnOnes: 0x13, positioning: 0x14, reflexes: 0x15,
  firstTouch: 0x16, technique: 0x17, leftFoot: 0x18, rightFoot: 0x19, flair: 0x1A, corners: 0x1B,
  teamwork: 0x1C, workRate: 0x1D, longThrows: 0x1E, eccentricity: 0x1F, rushingOut: 0x20, punching: 0x21,
  acceleration: 0x22, freeKicks: 0x23, strength: 0x24, stamina: 0x25, pace: 0x26, jumpingReach: 0x27,
  leadership: 0x28, dirtiness: 0x29, balance: 0x2A, bravery: 0x2B, consistency: 0x2C, aggression: 0x2D,
  agility: 0x2E, importantMatches: 0x2F, injuryProneness: 0x30, versatility: 0x31, naturalFitness: 0x32,
  determination: 0x33, composure: 0x34, concentration: 0x35,
};

/** Offsets inside the staff part (from its start = person - 0xF8). */
export const STAFF = {
  attrs: 0x32, // 26 raw bytes (value * 5)
  currentRep: 0xD0,
  homeRep: 0xD2,
  worldRep: 0xD4,
  ca: 0xD6,
  pa: 0xD8,
} as const;

/** Staff attribute byte offsets relative to STAFF.attrs (adaptability comes from the person's personality). */
export const STAFF_ATTR_OFFSETS: Record<Exclude<StaffAttrKey, 'adaptability'>, number> = {
  business: 0x00, gkDistribution: 0x01, judgingPlayerAbility: 0x02, judgingPlayerPotential: 0x03,
  manManagement: 0x04, determination: 0x05, physiotherapy: 0x06, tacticalKnowledge: 0x07,
  attacking: 0x08, defending: 0x09, fitness: 0x0A, motivating: 0x0B, technical: 0x0C, tactical: 0x0D,
  negotiating: 0x0E, gkHandling: 0x0F, gkShotStopping: 0x10, levelOfDiscipline: 0x11, analysingData: 0x12,
  interference: 0x13, patience: 0x14, sportsScience: 0x15, resources: 0x16, judgingStaffAbility: 0x17,
  mentalCoaching: 0x18, workingWithYoungsters: 0x19,
};

export const CONTRACT = {
  size: 0x90,
  team: 0x10,
  wage: 0x18,
  job: 0x1C,
  expiry: 0x40, // (year << 16) | dayOfYear
  flags: 0x48,
  terms: 0x60, // std::vector<u64>: (type << 48) | amount
} as const;

export const RELEASE_CLAUSE_TYPES: Record<number, string> = {
  0x00: 'Release clause',
  0x10: 'Foreign clubs',
  0x11: 'Clubs in a higher division',
  0x12: 'Domestic clubs',
  0x1B: 'Clubs in a major continental competition',
  0x1F: 'Clubs in a continental competition',
};

export const CLUB = { uid: 0x0C, name: 0xC0, shortName: 0xC8, nation: 0xD8 } as const;
export const TEAM = { club: 0x30, competition: 0x50, reputation: 0xA8, size: 0xB0 } as const;
export const COMP = { name: 0x48, nation: 0x60, type: 0xF4 } as const;
export const NATION = { name: 0x18, continent: 0xF0 } as const;
export const CONTINENT = { name: 0x18 } as const;
/** rate = float units per 1 GBP. */
export const CURRENCY = { name: 0x18, symbol: 0x30, rate: 0x38 } as const;

/** Player trait (PPM) bit positions in PERSON.traits: [byte, bit, label]. */
export const TRAIT_BITS: [number, number, string][] = [
  [0, 0, 'Runs With Ball Down Left'], [0, 1, 'Runs With Ball Down Right'], [0, 2, 'Runs With Ball Through Centre'],
  [0, 3, 'Gets Into Opposition Area'], [0, 4, 'Moves Into Channels'], [0, 5, 'Gets Forward Whenever Possible'],
  [0, 6, 'Plays Short Simple Passes'], [0, 7, 'Tries Killer Balls Often'],
  [1, 0, 'Shoots From Distance'], [1, 1, 'Shoots With Power'], [1, 2, 'Places Shots'], [1, 3, 'Curls Ball'],
  [1, 4, 'Likes To Round Keeper'], [1, 5, 'Likes To Try To Beat Offside Trap'], [1, 6, 'Uses Outside Of Foot'],
  [1, 7, 'Marks Opponent Tightly'],
  [2, 0, 'Winds Up Opponents'], [2, 1, 'Argues With Officials'], [2, 2, 'Plays With Back To Goal'],
  [2, 3, 'Comes Deep To Get Ball'], [2, 4, 'Plays One-Twos'], [2, 5, 'Likes To Lob Keeper'], [2, 6, 'Dictates Tempo'],
  [2, 7, 'Attempts Overhead Kicks'],
  [3, 0, 'Looks For Pass Rather Than Attempting To Score'], [3, 1, 'Plays No Through Balls'], [3, 2, 'Stops Play'],
  [3, 3, 'Knocks Ball Past Opponent'], [3, 4, 'Moves Ball To Right Foot Before Dribble Attempt'],
  [3, 5, 'Moves Ball To Left Foot Before Dribble Attempt'], [3, 6, 'Dwells On Ball'], [3, 7, "Arrives Late In Opponent's Area"],
  [4, 0, 'Tries To Play Way Out Of Trouble'], [4, 1, 'Stays Back At All Times'], [4, 2, 'Avoids Using Weaker Foot'],
  [4, 3, 'Tries Tricks'], [4, 4, 'Tries Long Range Free Kicks'], [4, 5, 'Dives Into Tackles'],
  [5, 0, 'Hugs Line'], [5, 6, 'Likes To Beat Opponent Repeatedly'],
  [6, 0, 'Shows Onto Weaker Foot'], [7, 0, 'Refrains From Taking Long Shots'],
];
