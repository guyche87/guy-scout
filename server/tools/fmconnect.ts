// Dev helper shared by the exploration tools: attaches to FM and resolves dbtRoot + class names.
import { findProcess, mainModule, openForRead } from '../fm/win32.ts';
import { ProcessMemory, parseAob, readPtr, scanAob } from '../fm/memory.ts';

export function connect() {
  const proc = findProcess('fm.exe');
  if (!proc) throw new Error('fm.exe is not running');
  const mod = mainModule(proc.pid)!;
  const mem = new ProcessMemory(openForRead(proc.pid));
  let dbt = 0;
  scanAob(mem, mod.base, mod.size, parseAob('48 8D 0D ?? ?? ?? ?? 48 8D 15'), (addr, chunk, i) => {
    const target = addr + 7 + chunk.readInt32LE(i + 3);
    const personDb = mem.ptr(target + 0x68);
    if (!personDb) return false;
    const tbl = mem.ptr(personDb + 0x80);
    if (!tbl) return false;
    const s = mem.ptr(tbl), e = mem.ptr(tbl + 8);
    const count = (e - s) / 8;
    if (s && e > s && count > 1000 && count < 500000) { dbt = target; return true; }
    return false;
  });
  const classCache = new Map<number, string>();
  function className(vtable: number): string {
    let c = classCache.get(vtable);
    if (c !== undefined) return c;
    const col = mem.ptr(vtable - 8);
    const colBuf = col ? mem.read(col, 24) : null;
    c = colBuf ? mem.cstr(mod.base + colBuf.readUInt32LE(12) + 16, 128).replace(/^\.\?AV|@db@@$/g, '') : '?';
    classCache.set(vtable, c);
    return c;
  }
  function table(dbOffset: number): number[] {
    const tbl = mem.ptr(mem.ptr(dbt + dbOffset) + 0x80);
    const s = mem.ptr(tbl), e = mem.ptr(tbl + 8);
    const raw = mem.read(s, e - s)!;
    const out: number[] = [];
    for (let i = 0; i < raw.length; i += 8) { const p = readPtr(raw, i); if (p) out.push(p); }
    return out;
  }
  function nameAt(entryPtr: number): string {
    if (!entryPtr) return '';
    const head = mem.ptr(entryPtr);
    const viaHead = head ? mem.cstr(head + 4) : '';
    if (viaHead && /^[\p{L}\p{N} .'\-()&]+$/u.test(viaHead)) return viaHead;
    return mem.cstr(entryPtr + 4);
  }
  function personName(per: number): string {
    const cn = nameAt(mem.ptr(per + 0x68));
    if (cn) return cn;
    return `${nameAt(mem.ptr(per + 0x58))} ${nameAt(mem.ptr(per + 0x60))}`.trim();
  }
  return { mem, mod, dbt, className, table, nameAt, personName };
}
