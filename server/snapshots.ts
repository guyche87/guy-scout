// Snapshots: the whole GameData as gzip JSON in data/snapshots, so a session can be reopened without FM running.
import { createReadStream, createWriteStream, type Dirent, type ReadStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { createGzip, gunzip as gunzipCallback } from 'node:zlib';
import type { SnapshotInfo } from '../shared/api.ts';
import type { Club, Player, Staff } from '../shared/types.ts';
import type { GameData } from './fm/types.ts';
import { replaceFile, SNAPSHOT_DIR, tempPath } from './persist.ts';
import { errorMessage, HttpError, isObject, store } from './store.ts';

const gunzip = promisify(gunzipCallback);
const EXT = '.json.gz';
const FORMAT = 'web-genie-scout-24/snapshot';
// No separators, drive letters or leading dots: a name can only ever address a file directly in SNAPSHOT_DIR.
const NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_ .()-]{0,150}$/;
const CHUNK_CHARS = 1 << 16;

function isValidName(name: string): boolean {
  return NAME_RE.test(name) && !name.includes('..') && path.dirname(path.resolve(SNAPSHOT_DIR, name + EXT)) === SNAPSHOT_DIR;
}

/** Accepts the name with or without the .json.gz extension. */
function checkName(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) throw new HttpError(400, 'Snapshot name must be a non-empty string.');
  const name = raw.endsWith(EXT) ? raw.slice(0, -EXT.length) : raw;
  if (!isValidName(name)) throw new HttpError(400, `Invalid snapshot name "${raw}".`);
  return name;
}

const fileOf = (name: string) => path.join(SNAPSHOT_DIR, name + EXT);
const exists = (file: string) => stat(file).then(() => true, () => false);
const pad = (n: number) => String(n).padStart(2, '0');

function info(name: string, mtime: Date, sizeBytes: number): SnapshotInfo {
  return { name, gameDate: /^(\d{4}-\d{2}-\d{2})_/.exec(name)?.[1] ?? null, savedAt: mtime.toISOString(), sizeBytes };
}

/** Newest first. */
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(SNAPSHOT_DIR, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const out: SnapshotInfo[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(EXT)) continue;
    const name = e.name.slice(0, -EXT.length);
    if (!isValidName(name)) continue;
    const st = await stat(fileOf(name)).catch(() => null);
    if (st) out.push(info(name, st.mtime, st.size));
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// One record per line, streamed in ~64 KB pieces: the result is ordinary JSON, but the server never has to
// hold the whole serialised database as one giant string.
function* snapshotChunks(d: GameData, savedAt: Date): Generator<string> {
  const head = {
    format: FORMAT, version: 1, savedAt: savedAt.toISOString(), source: d.source, gameDate: d.gameDate,
    loadedAt: d.loadedAt, humanClubId: d.humanClubId, humanClub: d.humanClub,
  };
  yield JSON.stringify(head).slice(0, -1);
  for (const [key, rows] of [['clubs', d.clubs], ['staff', d.staff], ['players', d.players]] as const) {
    let buf = `,\n${JSON.stringify(key)}:[`;
    for (let i = 0; i < rows.length; i++) {
      buf += (i ? ',\n' : '\n') + JSON.stringify(rows[i]);
      if (buf.length >= CHUNK_CHARS) { yield buf; buf = ''; }
    }
    yield buf + '\n]';
  }
  yield '}\n';
}

/** Saves the current data as data/snapshots/<game date>_<HHmmss>.json.gz. */
export async function saveSnapshot(): Promise<SnapshotInfo> {
  const data = store.requireData();
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const now = new Date();
  const date = /^\d{4}-\d{2}-\d{2}/.exec(data.gameDate ?? '')?.[0] ?? 'unknown-date';
  const base = `${date}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let name = base;
  for (let n = 2; await exists(fileOf(name)); n++) name = `${base}-${n}`;

  const file = fileOf(name);
  const tmp = tempPath(file);
  try {
    await pipeline(Readable.from(snapshotChunks(data, now)), createGzip(), createWriteStream(tmp));
    await replaceFile(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
  const st = await stat(file);
  return info(name, st.mtime, st.size);
}

function parseSnapshot(json: string, name: string): GameData {
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch (err) {
    throw new Error(`Snapshot "${name}" is damaged (${errorMessage(err)}).`);
  }
  if (!isObject(v) || !Array.isArray(v.players) || !Array.isArray(v.staff) || !Array.isArray(v.clubs)) {
    throw new Error(`"${name}" is not a Web Genie Scout snapshot (players, staff or clubs missing).`);
  }
  return {
    source: 'snapshot',
    gameDate: typeof v.gameDate === 'string' ? v.gameDate : null,
    loadedAt: new Date().toISOString(),
    players: v.players as Player[],
    staff: v.staff as Staff[],
    clubs: v.clubs as Club[],
    humanClubId: typeof v.humanClubId === 'number' ? v.humanClubId : null,
    humanClub: typeof v.humanClub === 'string' ? v.humanClub : null,
  };
}

/** Loads a snapshot into the store (source "snapshot"); resolves once the data is ready. */
export async function loadSnapshot(rawName: unknown): Promise<void> {
  const name = checkName(rawName);
  const file = fileOf(name);
  if (!(await exists(file))) throw new HttpError(404, `Snapshot "${name}" not found.`);
  await store.runLoad(async onProgress => {
    onProgress({ phase: 'Reading snapshot', done: 0, total: 3 });
    const zipped = await readFile(file);
    onProgress({ phase: 'Decompressing snapshot', done: 1, total: 3 });
    let json: string;
    try {
      json = (await gunzip(zipped)).toString('utf8');
    } catch (err) {
      throw new Error(`Snapshot "${name}" is not a valid gzip file (${errorMessage(err)}).`);
    }
    onProgress({ phase: 'Parsing snapshot', done: 2, total: 3 });
    return parseSnapshot(json, name);
  }, name);
}

export async function openSnapshot(rawName: unknown): Promise<{ stream: ReadStream; fileName: string; size: number }> {
  const name = checkName(rawName);
  const file = fileOf(name);
  const st = await stat(file).catch(() => null);
  if (!st?.isFile()) throw new HttpError(404, `Snapshot "${name}" not found.`);
  return { stream: createReadStream(file), fileName: name + EXT, size: st.size };
}
