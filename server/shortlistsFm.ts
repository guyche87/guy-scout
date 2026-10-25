// Import/export FM shortlists (.slf). The scout's player id is FM's unique id, so a .slf is just a list of
// those ids: import matches them to loaded players; export writes the ids FM will resolve back to players.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseSlf, writeSlf } from './fm/slf.ts';
import { getSettings, rememberFmBuildId, replaceFile, tempPath } from './persist.ts';
import { HttpError } from './store.ts';

export interface SlfFileInfo {
  file: string;
  name: string;
  players: number;
  savedAt: string;
}

export interface ImportResult {
  name: string;
  total: number;
  matched: { id: number; name: string }[];
  unmatched: number[];
}

const bad = (msg: string) => new HttpError(400, msg);

/** Rejects names that would escape the shortlists folder; returns the absolute path inside it. */
async function resolveInDir(file: string): Promise<string> {
  if (!file || file.includes('/') || file.includes('\\') || file.includes('..')) throw bad('Invalid shortlist file name.');
  const dir = (await getSettings()).fmShortlistsDir;
  return path.join(dir, file);
}

export async function listSlfFiles(): Promise<SlfFileInfo[]> {
  const dir = (await getSettings()).fmShortlistsDir;
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return []; // folder may not exist yet; the UI shows an empty list and the configured path
  }
  const out: SlfFileInfo[] = [];
  for (const name of names) {
    if (!name.toLowerCase().endsWith('.slf')) continue;
    try {
      const full = path.join(dir, name);
      const [buf, st] = await Promise.all([readFile(full), stat(full)]);
      const slf = parseSlf(buf);
      out.push({ file: name, name: slf.name, players: slf.uids.length, savedAt: st.mtime.toISOString() });
    } catch {
      // Not a readable Genie Scout .slf (FM's own .fmf shortlists are encrypted); skip it.
    }
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Parses a .slf (by file name in the folder, or an uploaded buffer) and matches ids to loaded players. */
export async function importSlf(opts: { file?: string; buffer?: Buffer }, lookup: (id: number) => string | null): Promise<ImportResult> {
  let buf: Buffer;
  if (opts.buffer) buf = opts.buffer;
  else if (opts.file) {
    try { buf = await readFile(await resolveInDir(opts.file)); }
    catch { throw new HttpError(404, `Shortlist file "${opts.file}" was not found.`); }
  } else throw bad('No shortlist file given.');

  const slf = parseSlf(buf);
  await rememberFmBuildId(slf.buildId);
  const matched: { id: number; name: string }[] = [];
  const unmatched: number[] = [];
  for (const id of slf.uids) {
    const name = lookup(id);
    if (name) matched.push({ id, name });
    else unmatched.push(id);
  }
  return { name: slf.name, total: slf.uids.length, matched, unmatched };
}

/** Writes a .slf into the FM shortlists folder so it shows up in FM's "Load Shortlist" dialog. */
export async function exportSlf(name: string, uids: number[]): Promise<{ file: string; path: string; players: number }> {
  const clean = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'shortlist';
  const settings = await getSettings();
  const file = `${clean}.slf`;
  const full = await resolveInDir(file);
  const buf = writeSlf({ name: clean, buildId: settings.fmBuildId, uids: uids.filter(u => Number.isInteger(u) && u > 0) });
  const tmp = tempPath(full);
  try {
    await writeFile(tmp, buf);
    await replaceFile(tmp, full);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw bad(`The FM shortlists folder does not exist: ${settings.fmShortlistsDir}. Set the right folder in Settings.`);
    throw err;
  }
  return { file, path: full, players: uids.length };
}
