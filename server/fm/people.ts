// Reads players and staff out of the person table.
import { PLAYER_ATTRS, POSITIONS, STAFF_ATTRS, type PersonalityKey, type PlayerAttrKey, type PositionKey, type StaffAttrKey } from '../../shared/attributes.ts';
import { computeRatings, DEFAULT_RATING_CONFIG, type RatingConfig } from '../../shared/ratings.ts';
import { personalityLabel } from '../../shared/personality.ts';
import { BOARD_JOBS, coachingStars, jobName, staffRatings, STAFF_ROLES } from '../../shared/staffRoles.ts';
import type { Contract, Player, ReleaseClause, Staff } from '../../shared/types.ts';
import { readPtr, isUserAddress } from './memory.ts';
import {
  CONTRACT, PERSON, PERSONALITY_ORDER, PLAYER, PLAYER_ATTR_OFFSETS, RELEASE_CLAUSE_TYPES, STAFF,
  STAFF_ATTR_OFFSETS, STAFF_PART_BACK, TRAIT_BITS,
} from './offsets.ts';
import { ageOn, dayOfYearToIso } from './dates.ts';
import type { ClubInfo, FmSession } from './session.ts';

interface PersonCore {
  id: number;
  firstName: string;
  lastName: string;
  commonName: string;
  name: string;
  birthDate: string | null;
  age: number;
  nations: string[];
  personality: Record<PersonalityKey, number>;
  traitsBits: Buffer;
  contractPtr: number;
  loanPtr: number;
}

interface ContractInfo {
  contract: Contract;
  job: number;
  club: ClubInfo | null;
}

export class PeopleReader {
  private s: FmSession;
  private gameDate: string | null;
  private cfg: RatingConfig;

  constructor(session: FmSession, gameDate: string | null, cfg: RatingConfig = DEFAULT_RATING_CONFIG) {
    this.s = session;
    this.gameDate = gameDate;
    this.cfg = cfg;
  }

  private core(per: number): PersonCore | null {
    const b = this.s.mem.read(per, PERSON.size);
    if (!b) return null;
    const firstName = this.s.name(readPtr(b, PERSON.firstName));
    const lastName = this.s.name(readPtr(b, PERSON.lastName));
    const commonName = this.s.name(readPtr(b, PERSON.commonName));
    const name = commonName || `${firstName} ${lastName}`.trim();
    if (!name) return null;
    const birthDate = dayOfYearToIso(b.readUInt16LE(PERSON.dobYear), b.readUInt16LE(PERSON.dobDay));
    const personality = {} as Record<PersonalityKey, number>;
    PERSONALITY_ORDER.forEach((k, i) => { personality[k] = b[PERSON.personality + i]; });
    return {
      id: b.readUInt32LE(PERSON.uid),
      firstName, lastName, commonName, name, birthDate,
      age: ageOn(birthDate, this.gameDate),
      nations: this.nations(readPtr(b, PERSON.nation), readPtr(b, PERSON.nationList)),
      personality,
      traitsBits: b.subarray(PERSON.traits, PERSON.traits + 8),
      contractPtr: readPtr(b, PERSON.contract),
      loanPtr: readPtr(b, PERSON.loanContract),
    };
  }

  private nations(primary: number, listRoot: number): string[] {
    const out: string[] = [];
    const p = this.s.nations.get(primary);
    if (p?.name) out.push(p.name);
    // Secondary nationalities: a list node holding (nation*, meta) pairs; meta 0xFF00FF02 marks non-passport links.
    const node = listRoot ? this.s.mem.ptr(listRoot) : 0;
    const blob = node ? this.s.mem.read(node, 0x80) : null;
    if (blob) {
      for (let off = 0; off + 16 <= blob.length; off += 8) {
        const ptr = readPtr(blob, off);
        if (!ptr || ptr === primary) continue;
        const n = this.s.nations.get(ptr);
        if (!n?.name || out.includes(n.name)) continue;
        if (blob.readUInt32LE(off + 12) === 0xFF00FF02) continue;
        out.push(n.name);
      }
    }
    return out;
  }

  private contract(ptr: number): ContractInfo | null {
    if (!ptr) return null;
    const b = this.s.mem.read(ptr, CONTRACT.size);
    if (!b) return null;
    const expiryRaw = b.readUInt32LE(CONTRACT.expiry);
    const flags = b.readUInt32LE(CONTRACT.flags);
    const releaseClauses: ReleaseClause[] = [];
    const tb = readPtr(b, CONTRACT.terms), te = readPtr(b, CONTRACT.terms + 8);
    if (tb && te > tb && (te - tb) % 8 === 0 && (te - tb) / 8 <= 32) {
      const terms = this.s.mem.read(tb, te - tb);
      if (terms) {
        for (let i = 0; i < terms.length; i += 8) {
          const type = terms.readUInt16LE(i + 6);
          const amount = terms.readUInt32LE(i);
          const label = RELEASE_CLAUSE_TYPES[type];
          if (label && amount > 0 && amount !== 0xffffffff) releaseClauses.push({ type: label, amount });
        }
      }
    }
    return {
      contract: {
        wage: b.readUInt32LE(CONTRACT.wage),
        expires: dayOfYearToIso(expiryRaw >>> 16, expiryRaw & 0xffff),
        releaseClauses,
        transferListed: !!(flags & (1 << 3)) || !!(flags & (1 << 5)),
        loanListed: !!(flags & (1 << 1)) && !(flags & (1 << 6)),
      },
      job: b[CONTRACT.job],
      club: this.s.clubOfTeam(readPtr(b, CONTRACT.team)),
    };
  }

  private loanClub(loanPtr: number): ClubInfo | null {
    if (!loanPtr) return null;
    const real = this.s.mem.ptr(loanPtr);
    if (!isUserAddress(real)) return null;
    return this.s.clubOfTeam(this.s.mem.ptr(real + CONTRACT.team));
  }

  readPlayer(per: number, playerPartBack: number, alsoStaff: boolean): Player | null {
    const c = this.core(per);
    if (!c) return null;
    const base = per - playerPartBack;
    const b = this.s.mem.read(base + PLAYER.blockStart, PLAYER.blockSize);
    if (!b) return null;
    const at = (off: number) => off - PLAYER.blockStart;
    const attrs = {} as Record<PlayerAttrKey, number>;
    for (const k of PLAYER_ATTRS) {
      const raw = b[at(PLAYER.attrs) + PLAYER_ATTR_OFFSETS[k]];
      attrs[k] = raw > 0 ? Math.max(1, Math.min(20, Math.round(raw / 5))) : 0;
    }
    const positions = {} as Record<PositionKey, number>;
    POSITIONS.forEach((p, i) => { positions[p] = Math.min(20, b[at(PLAYER.positions) + i]); });
    let pa = b.readInt16LE(at(PLAYER.pa));
    if (pa < 0) pa = Math.min(200, -pa * 2); // unresolved database ranges (-95 etc.)
    const ci = this.contract(c.contractPtr);
    const loan = this.loanClub(c.loanPtr);
    const club = loan ?? ci?.club ?? null;
    const traits: string[] = [];
    for (const [byte, bit, label] of TRAIT_BITS) if (c.traitsBits[byte] & (1 << bit)) traits.push(label);
    const ratings = computeRatings(attrs, positions, this.cfg);
    const height = b.readInt16LE(at(PLAYER.height));
    const weight = b.readInt16LE(at(PLAYER.weight));
    return {
      id: c.id,
      name: c.name, firstName: c.firstName, lastName: c.lastName, commonName: c.commonName,
      birthDate: c.birthDate, age: c.age, nations: c.nations,
      clubId: club?.id ?? null, club: club?.name ?? '', league: club?.league ?? '',
      leagueNation: club?.leagueNation ?? '', continent: club?.continent ?? '',
      onLoan: !!loan,
      loanFromClubId: loan ? ci?.club?.id ?? null : null,
      loanFromClub: loan ? ci?.club?.name ?? '' : '',
      ca: Math.max(0, b.readInt16LE(at(PLAYER.ca))), pa,
      currentRep: b.readUInt16LE(at(PLAYER.currentRep)), worldRep: b.readUInt16LE(at(PLAYER.worldRep)),
      height: height >= 100 && height <= 230 ? height : 0,
      weight: weight >= 30 && weight <= 150 ? weight : 0,
      positions, attrs,
      personality: c.personality,
      personalityLabel: personalityLabel(c.personality, attrs.determination, attrs.leadership),
      traits,
      contract: ci?.contract ?? null,
      // A free agent (no club) has no asking price; the raw field holds leftover/capped data, so report 0.
      value: club ? b.readUInt32LE(at(PLAYER.saleValue)) : 0,
      ...ratings,
      alsoStaff,
    };
  }

  readStaff(per: number, alsoPlayer: boolean): Staff | null {
    const c = this.core(per);
    if (!c) return null;
    const base = per - STAFF_PART_BACK;
    const b = this.s.mem.read(base, STAFF_PART_BACK);
    if (!b) return null;
    const attrs = {} as Record<StaffAttrKey, number>;
    for (const k of STAFF_ATTRS) {
      if (k === 'adaptability') continue;
      const raw = b[STAFF.attrs + STAFF_ATTR_OFFSETS[k]];
      attrs[k] = raw > 0 ? Math.max(1, Math.min(20, Math.round(raw / 5))) : 0;
    }
    attrs.adaptability = c.personality.adaptability;
    const ci = this.contract(c.contractPtr);
    const club = ci?.club ?? null;
    const job = ci && club ? ci.job : -1;
    const board = BOARD_JOBS.has(job);
    const { ratings, best } = board
      ? { ratings: Object.fromEntries(STAFF_ROLES.map(r => [r.id, 0])), best: { id: STAFF_ROLES[0].id, rating: 0 } }
      : staffRatings(attrs);
    return {
      id: c.id,
      name: c.name, firstName: c.firstName, lastName: c.lastName, commonName: c.commonName,
      birthDate: c.birthDate, age: c.age, nations: c.nations,
      clubId: club?.id ?? null, club: club?.name ?? '', league: club?.league ?? '',
      job: jobName(job), jobCode: job,
      ca: b.readUInt16LE(STAFF.ca), pa: b.readUInt16LE(STAFF.pa),
      currentRep: b.readUInt16LE(STAFF.currentRep), homeRep: b.readUInt16LE(STAFF.homeRep),
      worldRep: b.readUInt16LE(STAFF.worldRep),
      attrs,
      personality: c.personality,
      personalityLabel: personalityLabel(c.personality, attrs.determination),
      contract: ci && club ? ci.contract : null,
      alsoPlayer,
      ratings,
      bestRole: best,
      coachingStars: board ? Object.fromEntries(Object.keys(coachingStars(attrs)).map(k => [k, 0])) : coachingStars(attrs),
    };
  }
}

