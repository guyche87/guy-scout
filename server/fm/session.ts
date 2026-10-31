// A read-only attachment to a running fm.exe: resolves the database root and caches lookups
// (class names, name strings, nations, competitions, clubs) shared by the player/staff/club readers.
import { closeHandle, findProcesses, mainModule, openForRead, type ModuleInfo } from './win32.ts';
import { ProcessMemory, decodeCString, isUserAddress, parseAob, readPtr, scanAob } from './memory.ts';
import { AOB, CLUB, COMP, CONTINENT, CURRENCY, DB, NATION, TEAM } from './offsets.ts';
import type { Currency } from '../../shared/types.ts';
import { dayOfYearToIso } from './dates.ts';

export interface NationInfo { name: string; continent: string }
export interface CompInfo { name: string; nation: string; continent: string; type: number }
export interface ClubInfo {
  ptr: number;
  id: number;
  name: string;
  shortName: string;
  nation: string;
  /** Main (highest reputation) team's competition and reputation. */
  league: string;
  leagueNation: string;
  continent: string;
  reputation: number;
}

/** Guesses the store/distribution from the exe path — the key signal when the memory layout doesn't match. */
export function detectStore(exePath: string): string {
  const p = (exePath || '').toLowerCase();
  if (p.includes('steamapps')) return 'Steam';
  if (p.includes('epic games') || p.includes('epicgames')) return 'Epic';
  if (p.includes('windowsapps') || p.includes('xboxgames') || p.includes('gamingservices')) return 'Game Pass';
  return 'unknown store';
}

export class FmSession {
  readonly mem: ProcessMemory;
  readonly mod: ModuleInfo;
  readonly pid: number;
  /** "Steam" / "Epic" / "Game Pass" / "unknown store", from the exe path. */
  readonly store: string;
  dbt = 0;
  private _version: string | null = null;
  private classCache = new Map<number, string>();
  private nameCache = new Map<number, string>();
  readonly nations = new Map<number, NationInfo>();
  private comps = new Map<number, CompInfo | null>();
  readonly clubsByPtr = new Map<number, ClubInfo>();
  /** team pointer -> club pointer */
  readonly teamClub = new Map<number, number>();

  private constructor(pid: number, mod: ModuleInfo, mem: ProcessMemory) {
    this.pid = pid;
    this.mod = mod;
    this.mem = mem;
    this.store = detectStore(mod.path);
  }

  static attach(): FmSession {
    const procs = findProcesses('fm.exe');
    if (!procs.length) throw new Error('Football Manager 2024 (fm.exe) is not running. Start FM and load your save first.');
    // Several fm.exe may run (e.g. FM24 and FM27 both open) — pick the FM 2024 one by its install path.
    let chosen: { pid: number; mod: ModuleInfo } | null = null;
    let other: ModuleInfo | null = null;
    for (const p of procs) {
      const mod = mainModule(p.pid);
      if (!mod) continue;
      if (/football manager 2024/i.test(mod.path)) { chosen = { pid: p.pid, mod }; break; }
      other ??= mod;
    }
    if (!chosen) {
      const where = other?.path ?? '';
      const product = /football manager\s*(\d{2,4})/i.exec(where)?.[1];
      const name = product ? `Football Manager ${product}` : 'another Football Manager version';
      throw new Error(`This tool reads Football Manager 2024. The running game looks like ${name}${where ? ` (${where})` : ''}, which uses a different engine and can't be read. Start FM 2024 (24.4.x) and load a save, then try again.`);
    }
    const mod = chosen.mod;
    const s = new FmSession(chosen.pid, mod, new ProcessMemory(openForRead(chosen.pid)));
    s.dbt = s.findDbtRoot();
    if (!s.dbt) {
      const info = s.describe();
      s.close();
      throw new Error(`${info} — found FM, but no loaded game database. Make sure you are inside a fully loaded save (not the main menu or a loading screen), then click Load game again. On Game Pass or Epic the tool targets the Steam build of FM24 and may not match.`);
    }
    return s;
  }

  /** The FM version string from the exe (e.g. "24.4.2+2081827"); scanned once, on demand. */
  version(): string {
    if (this._version !== null) return this._version;
    let v = '';
    scanAob(this.mem, this.mod.base, this.mod.size, parseAob('32 34 2e'), (addr, chunk, i) => {
      const m = /^\d{2}\.\d{1,2}\.\d{1,2}\+\d+/.exec(chunk.subarray(i, i + 28).toString('latin1'));
      if (m) { v = m[0]; return true; }
      return false;
    });
    this._version = v || 'version unknown';
    return this._version;
  }

  /** One-line identity for error messages, e.g. "FM 24.4.2+2081827 via Steam". */
  describe(): string {
    return `FM ${this.version()} via ${this.store}`;
  }

  close(): void {
    closeHandle(this.mem.handle);
  }

  private findDbtRoot(): number {
    let dbt = 0;
    scanAob(this.mem, this.mod.base, this.mod.size, parseAob(AOB.dbtRoot), (addr, chunk, i) => {
      const target = addr + 7 + chunk.readInt32LE(i + 3);
      const count = this.vectorCountAt(target, DB.persons);
      if (count > 1000 && count < 1_000_000) { dbt = target; return true; }
      return false;
    });
    return dbt;
  }

  private vectorCountAt(dbt: number, dbOffset: number): number {
    const db = this.mem.ptr(dbt + dbOffset);
    if (!db) return 0;
    const vec = this.mem.ptr(db + DB.vectorInDb);
    if (!vec) return 0;
    const s = this.mem.ptr(vec), e = this.mem.ptr(vec + 8);
    return s && e > s && (e - s) % 8 === 0 ? (e - s) / 8 : 0;
  }

  /** All non-null object pointers in a dbtRoot table. */
  table(dbOffset: number): number[] {
    const vec = this.mem.ptr(this.mem.ptr(this.dbt + dbOffset) + DB.vectorInDb);
    const s = this.mem.ptr(vec), e = this.mem.ptr(vec + 8);
    if (!s || e <= s) return [];
    const raw = this.mem.read(s, e - s);
    if (!raw) return [];
    const out: number[] = [];
    for (let i = 0; i < raw.length; i += 8) {
      const p = readPtr(raw, i);
      if (p) out.push(p);
    }
    return out;
  }

  gameDate(): string | null {
    let iso: string | null = null;
    scanAob(this.mem, this.mod.base, this.mod.size, parseAob(AOB.gameDate), (addr, chunk, i) => {
      const target = addr + 9 + chunk.readInt32LE(i + 5);
      const day = this.mem.u32(target) & 0x1ff;
      const year = this.mem.u16(target + 2);
      if (year >= 2020 && year < 2200 && day >= 1 && day <= 366) { iso = dayOfYearToIso(year, day); return true; }
      return false;
    });
    return iso;
  }

  /** MSVC RTTI class name for an object's vtable, without the ".?AV" / "@db@@" decoration. */
  className(vtable: number): string {
    let c = this.classCache.get(vtable);
    if (c !== undefined) return c;
    c = '';
    const col = this.mem.ptr(vtable - 8);
    const colBuf = col ? this.mem.read(col, 24) : null;
    if (colBuf) {
      const name = this.mem.cstr(this.mod.base + colBuf.readUInt32LE(12) + 16, 128);
      c = name.replace(/^\.\?AV/, '').replace(/@db@@$/, '');
    }
    this.classCache.set(vtable, c);
    return c;
  }

  /** Resolves an FM name-entry pointer (string at +4, sometimes behind one extra indirection). */
  name(entry: number): string {
    if (!entry) return '';
    let s = this.nameCache.get(entry);
    if (s !== undefined) return s;
    s = '';
    const buf = this.mem.read(entry, 112);
    if (buf) {
      const direct = decodeCString(buf, 4, 108);
      if (isCleanText(direct)) s = direct;
      else {
        const head = readPtr(buf, 0);
        if (isUserAddress(head)) {
          const indirect = this.mem.cstr(head + 4, 108);
          if (isCleanText(indirect)) s = indirect;
        }
      }
    }
    this.nameCache.set(entry, s);
    return s;
  }

  loadNations(): void {
    const continents = new Map<number, string>();
    for (const c of this.table(DB.continents)) continents.set(c, this.name(this.mem.ptr(c + CONTINENT.name)));
    for (const n of this.table(DB.nations)) {
      const cont = this.mem.ptr(n + NATION.continent);
      this.nations.set(n, { name: this.name(this.mem.ptr(n + NATION.name)), continent: continents.get(cont) ?? '' });
    }
  }

  currencies(): Currency[] {
    const out: Currency[] = [];
    for (const c of this.table(DB.currencies)) {
      const b = this.mem.read(c, 0x40);
      if (!b) continue;
      const name = this.name(readPtr(b, CURRENCY.name));
      const rate = b.readFloatLE(CURRENCY.rate);
      if (!name || !(rate > 0) || rate > 1e7) continue;
      out.push({ name, symbol: this.name(readPtr(b, CURRENCY.symbol)) || name, rate: Math.round(rate * 10000) / 10000 });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  competition(ptr: number): CompInfo | null {
    if (!ptr) return null;
    let c = this.comps.get(ptr);
    if (c !== undefined) return c;
    const nation = this.nations.get(this.mem.ptr(ptr + COMP.nation));
    c = {
      name: this.name(this.mem.ptr(ptr + COMP.name)),
      nation: nation?.name ?? '',
      continent: nation?.continent ?? '',
      type: this.mem.u8(ptr + COMP.type),
    };
    this.comps.set(ptr, c);
    return c;
  }

  /** Reads every club, then every team to pick each club's main team (league + reputation). */
  loadClubs(): void {
    for (const c of this.table(DB.clubs)) {
      const b = this.mem.read(c, 0xE0);
      if (!b) continue;
      const nation = this.nations.get(readPtr(b, CLUB.nation));
      this.clubsByPtr.set(c, {
        ptr: c,
        id: b.readUInt32LE(CLUB.uid),
        name: this.name(readPtr(b, CLUB.name)),
        shortName: this.name(readPtr(b, CLUB.shortName)),
        nation: nation?.name ?? '',
        league: '', leagueNation: '', continent: nation?.continent ?? '',
        reputation: 0,
      });
    }
    const bestTeamRep = new Map<number, number>();
    for (const t of this.table(DB.teams)) {
      const b = this.mem.read(t, TEAM.size);
      if (!b) continue;
      const clubPtr = readPtr(b, TEAM.club);
      const club = this.clubsByPtr.get(clubPtr);
      if (!club) continue;
      this.teamClub.set(t, clubPtr);
      const rep = b.readUInt16LE(TEAM.reputation);
      if (rep >= (bestTeamRep.get(clubPtr) ?? -1)) {
        bestTeamRep.set(clubPtr, rep);
        const comp = this.competition(readPtr(b, TEAM.competition));
        club.reputation = rep;
        club.league = comp?.name ?? '';
        club.leagueNation = comp?.nation ?? '';
        if (comp?.continent) club.continent = comp.continent;
      }
    }
  }

  clubOfTeam(team: number): ClubInfo | null {
    if (!team) return null;
    let clubPtr = this.teamClub.get(team);
    if (clubPtr === undefined) {
      clubPtr = this.mem.ptr(team + TEAM.club);
      this.teamClub.set(team, clubPtr);
    }
    return this.clubsByPtr.get(clubPtr) ?? null;
  }
}

function isCleanText(s: string): boolean {
  if (!s) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0xfffd || (c >= 0x7f && c < 0xa0)) return false;
  }
  return true;
}

