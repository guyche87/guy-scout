// Read-only view over another process's address space.
import { ReadProcessMemory } from './win32.ts';

const TWO_32 = 0x1_0000_0000;
const MAX_USER_ADDR = 0x7fff_ffff_ffff;
const utf8 = new TextDecoder('utf-8', { fatal: false });

const PAGE = 0x10000;

export class ProcessMemory {
  readonly handle: bigint;
  reads = 0;
  /**
   * Optional page cache: FM packs its database objects densely, so one 64 KB read replaces hundreds of
   * tiny ones (each ReadProcessMemory call costs ~15 µs). Only use while taking a one-off snapshot,
   * since cached pages go stale as the game runs.
   */
  private pages: Map<number, Buffer | null> | null = null;
  private maxPages = 0;

  constructor(handle: bigint) {
    this.handle = handle;
  }

  enableCache(maxBytes = 768 << 20): void {
    this.pages = new Map();
    this.maxPages = Math.floor(maxBytes / PAGE);
  }

  disableCache(): void {
    this.pages = null;
  }

  /** Reads `size` bytes; returns null if any part is unreadable. The result must be treated as read-only. */
  read(addr: number, size: number): Buffer | null {
    if (!isUserAddress(addr) || size <= 0) return null;
    if (this.pages && size <= PAGE) {
      const pageAddr = addr - (addr % PAGE);
      const off = addr - pageAddr;
      if (off + size <= PAGE) {
        const page = this.page(pageAddr);
        if (page) return page.subarray(off, off + size);
      }
    }
    return this.readDirect(addr, size);
  }

  private readDirect(addr: number, size: number): Buffer | null {
    const buf = Buffer.allocUnsafe(size);
    this.reads++;
    return ReadProcessMemory(this.handle, addr, buf, size, null) ? buf : null;
  }

  private page(pageAddr: number): Buffer | null {
    const pages = this.pages!;
    let p = pages.get(pageAddr);
    if (p !== undefined) return p;
    if (pages.size >= this.maxPages) pages.delete(pages.keys().next().value!);
    // A page that straddles an unreadable region falls back to direct reads (null).
    p = this.readDirect(pageAddr, PAGE);
    pages.set(pageAddr, p);
    return p;
  }

  readInto(addr: number, buf: Buffer): boolean {
    if (!isUserAddress(addr)) return false;
    this.reads++;
    return !!ReadProcessMemory(this.handle, addr, buf, buf.length, null);
  }

  ptr(addr: number): number {
    const b = this.read(addr, 8);
    return b ? readPtr(b, 0) : 0;
  }

  u32(addr: number): number {
    const b = this.read(addr, 4);
    return b ? b.readUInt32LE(0) : 0;
  }

  u16(addr: number): number {
    const b = this.read(addr, 2);
    return b ? b.readUInt16LE(0) : 0;
  }

  u8(addr: number): number {
    const b = this.read(addr, 1);
    return b ? b[0] : 0;
  }

  /** Null-terminated UTF-8 string. */
  cstr(addr: number, max = 96): string {
    const b = this.read(addr, max);
    return b ? decodeCString(b, 0, max) : '';
  }
}

export function isUserAddress(addr: number): boolean {
  return addr >= 0x10000 && addr <= MAX_USER_ADDR;
}

/** 64-bit little-endian pointer as a JS number (safe: user-space addresses are < 2^47). */
export function readPtr(b: Buffer, off: number): number {
  const lo = b.readUInt32LE(off);
  const hi = b.readUInt32LE(off + 4);
  if (hi > 0x7fff) return 0;
  return hi * TWO_32 + lo;
}

export function decodeCString(b: Buffer, off: number, max: number): string {
  const end = Math.min(b.length, off + max);
  let z = off;
  while (z < end && b[z] !== 0) z++;
  return utf8.decode(b.subarray(off, z));
}

export interface AobPattern {
  bytes: number[];
  mask: boolean[];
}

export function parseAob(pattern: string): AobPattern {
  const bytes: number[] = [];
  const mask: boolean[] = [];
  for (const part of pattern.trim().split(/\s+/)) {
    if (part === '??' || part === '?') {
      bytes.push(0);
      mask.push(false);
    } else {
      bytes.push(parseInt(part, 16));
      mask.push(true);
    }
  }
  return { bytes, mask };
}

/**
 * Scans [start, start+size) for a byte pattern, calling `onMatch` with each match address.
 * Stops early when `onMatch` returns true.
 */
export function scanAob(mem: ProcessMemory, start: number, size: number, pattern: AobPattern,
  onMatch: (addr: number, chunk: Buffer, offset: number) => boolean): void {
  const chunkSize = 1 << 20;
  const plen = pattern.bytes.length;
  const first = pattern.bytes[0];
  for (let off = 0; off < size; off += chunkSize) {
    const n = Math.min(chunkSize + plen, size - off);
    const chunk = mem.read(start + off, n);
    if (!chunk) continue;
    let i = chunk.indexOf(first);
    while (i !== -1 && i + plen <= n) {
      let ok = true;
      for (let j = 1; j < plen; j++) {
        if (pattern.mask[j] && chunk[i + j] !== pattern.bytes[j]) { ok = false; break; }
      }
      if (ok && onMatch(start + off + i, chunk, i)) return;
      i = chunk.indexOf(first, i + 1);
    }
  }
}
