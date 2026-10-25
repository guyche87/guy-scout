// Genie Scout / FM "shortlist" .slf file: a plaintext list of player unique IDs.
// Layout (all integers little-endian):
//   02 01? no -> 03 01            2-byte record magic
//   "fls."                        4-byte type tag
//   02 00 01                      3-byte format signature (as written by Genie Scout 24)
//   buildId   u32                 FM data build the UIDs belong to
//   nameLen   u32, name           shortlist name (latin1/UTF-8 bytes)
//   count     u32                 number of players
//   uid[count] u32                player unique IDs (same ids FM/our reader expose)
//   00                            1 trailing byte
// This file is NOT encrypted (unlike FM's own .fmf shortlists), so we can read and write it directly,
// and FM's "Load Shortlist" dialog accepts .slf.

const MAGIC = Buffer.from([0x03, 0x01]);
const TAG = 'fls.';
const SIGNATURE = Buffer.from([0x02, 0x00, 0x01]);

export interface Slf {
  name: string;
  buildId: number;
  uids: number[];
}

export function parseSlf(buf: Buffer): Slf {
  if (buf.length < 17 || buf[0] !== 0x03 || buf[1] !== 0x01 || buf.toString('latin1', 2, 6) !== TAG) {
    throw new Error('Not a Genie Scout .slf shortlist file.');
  }
  let p = 9;
  const buildId = buf.readUInt32LE(p); p += 4;
  const nameLen = buf.readUInt32LE(p); p += 4;
  if (nameLen > 1024 || p + nameLen + 4 > buf.length) throw new Error('Corrupt .slf: bad name length.');
  const name = buf.toString('utf8', p, p + nameLen); p += nameLen;
  const count = buf.readUInt32LE(p); p += 4;
  if (count > 100000 || p + count * 4 > buf.length) throw new Error('Corrupt .slf: bad player count.');
  const uids: number[] = [];
  for (let i = 0; i < count; i++) { uids.push(buf.readUInt32LE(p)); p += 4; }
  return { name, buildId, uids };
}

export function writeSlf(slf: Slf): Buffer {
  const name = Buffer.from(slf.name, 'utf8');
  const head = Buffer.alloc(9);
  MAGIC.copy(head, 0);
  head.write(TAG, 2, 'latin1');
  SIGNATURE.copy(head, 6);
  const nameLen = Buffer.alloc(4); nameLen.writeUInt32LE(name.length);
  const build = Buffer.alloc(4); build.writeUInt32LE(slf.buildId >>> 0);
  const count = Buffer.alloc(4); count.writeUInt32LE(slf.uids.length);
  const ids = Buffer.alloc(slf.uids.length * 4);
  slf.uids.forEach((u, i) => ids.writeUInt32LE(u >>> 0, i * 4));
  return Buffer.concat([head, build, nameLen, name, count, ids, Buffer.from([0x00])]);
}

/** FM 24.4.x data build, used as a fallback when we cannot learn the real one from an existing .slf. */
export const DEFAULT_FM_BUILD = 0x2bb3c8;
