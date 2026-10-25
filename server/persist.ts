// Small JSON files under data/: shortlists and settings. Single user, single process, so after the first read
// the in-memory copy is the source of truth; every write goes through a temp file + rename.
import { homedir } from 'node:os';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { PLAYER_ATTRS, type PlayerAttrKey } from '../shared/attributes.ts';
import { ROLE_BY_ID } from '../shared/roles.ts';
import type { Settings, Shortlist } from '../shared/types.ts';
import { DEFAULT_FM_BUILD } from './fm/slf.ts';
import { errorMessage, HttpError, isObject } from './store.ts';

export const ROOT_DIR = path.resolve(import.meta.dirname, '..');
// In the packaged .exe, data must live in a writable folder next to the exe, not inside the read-only bundle.
export const DATA_DIR = process.env.GUYSCOUT_DATA_DIR ? path.resolve(process.env.GUYSCOUT_DATA_DIR) : path.join(ROOT_DIR, 'data');
export const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');
const SHORTLISTS_FILE = path.join(DATA_DIR, 'shortlists.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

/** FM's default shortlists folder; used unless the user points the setting elsewhere. */
export function defaultFmShortlistsDir(): string {
  return path.join(homedir(), 'Documents', 'Sports Interactive', 'Football Manager 2024', 'shortlists');
}

export function defaultSettings(): Settings {
  return {
    currencySymbol: '£', currencyRate: 1, roleOverrides: {}, ratingWeights: { key: 2, preferred: 1 },
    fmShortlistsDir: defaultFmShortlistsDir(), fmBuildId: DEFAULT_FM_BUILD,
  };
}

/** Persists the FM build id learned from a .slf the scout read, so exports match the user's game. */
export async function rememberFmBuildId(buildId: number): Promise<void> {
  if (!Number.isInteger(buildId) || buildId <= 0) return;
  const current = await getSettings();
  if (current.fmBuildId === buildId) return;
  await saveSettings({ fmBuildId: buildId });
}

function defaultShortlists(): Shortlist[] {
  return [{ id: 'default', name: 'My Shortlist', playerIds: [], notes: {} }];
}

// Cached as promises so concurrent first reads share one file read and a later save can't be overwritten by it.
let shortlistsP: Promise<Shortlist[]> | null = null;
let settingsP: Promise<Settings> | null = null;

/** The returned value is shared; treat it as read-only. */
export function getShortlists(): Promise<Shortlist[]> {
  return shortlistsP ??= readOrDefault(SHORTLISTS_FILE, validateShortlists, defaultShortlists);
}

export async function saveShortlists(input: unknown): Promise<Shortlist[]> {
  const lists = validateShortlists(input);
  await writeJsonAtomic(SHORTLISTS_FILE, lists);
  shortlistsP = Promise.resolve(lists);
  return lists;
}

/** The returned value is shared; treat it as read-only. */
export function getSettings(): Promise<Settings> {
  return settingsP ??= readOrDefault(SETTINGS_FILE, v => validateSettings(v, defaultSettings()), defaultSettings);
}

/** Fields missing from `input` keep their current value; unknown fields are ignored. */
export async function saveSettings(input: unknown): Promise<Settings> {
  const settings = validateSettings(input, await getSettings());
  await writeJsonAtomic(SETTINGS_FILE, settings);
  settingsP = Promise.resolve(settings);
  return settings;
}

// ------------------------------------------------------------------ validation

const bad = (msg: string) => new HttpError(400, msg);

function validateShortlists(input: unknown): Shortlist[] {
  if (!Array.isArray(input)) throw bad('Shortlists must be a JSON array.');
  const seen = new Set<string>();
  return input.map((v: unknown, n): Shortlist => {
    const where = `Shortlist #${n + 1}`;
    if (!isObject(v)) throw bad(`${where} must be an object.`);
    const { id, name, playerIds, notes } = v;
    if (typeof id !== 'string' || !id.trim() || id.length > 100) throw bad(`${where}: id must be a non-empty string.`);
    if (seen.has(id)) throw bad(`${where}: duplicate id "${id}".`);
    seen.add(id);
    if (typeof name !== 'string' || !name.trim() || name.length > 200) throw bad(`${where}: name must be a non-empty string (max 200 characters).`);
    if (!Array.isArray(playerIds) || !playerIds.every(x => Number.isSafeInteger(x))) throw bad(`${where}: playerIds must be an array of integers.`);
    const cleanNotes: Record<string, string> = {};
    if (notes !== undefined && notes !== null) {
      if (!isObject(notes)) throw bad(`${where}: notes must be an object of player id -> text.`);
      for (const [pid, text] of Object.entries(notes)) {
        if (typeof text !== 'string') throw bad(`${where}: note for ${pid} must be a string.`);
        if (text) cleanNotes[pid] = text;
      }
    }
    return { id, name: name.trim(), playerIds: [...new Set(playerIds as number[])], notes: cleanNotes };
  });
}

function validateSettings(input: unknown, base: Settings): Settings {
  if (!isObject(input)) throw bad('Settings must be a JSON object.');
  const out: Settings = { ...base };
  const { currencySymbol, currencyRate, ratingWeights, roleOverrides } = input;
  if (currencySymbol !== undefined) {
    if (typeof currencySymbol !== 'string' || currencySymbol.length > 8) throw bad('currencySymbol must be a string of at most 8 characters.');
    out.currencySymbol = currencySymbol;
  }
  if (currencyRate !== undefined) {
    if (typeof currencyRate !== 'number' || !Number.isFinite(currencyRate) || currencyRate <= 0 || currencyRate > 1e6) {
      throw bad('currencyRate must be a positive number.');
    }
    out.currencyRate = currencyRate;
  }
  if (ratingWeights !== undefined) out.ratingWeights = validateWeights(ratingWeights);
  if (roleOverrides !== undefined) out.roleOverrides = validateOverrides(roleOverrides);
  const { fmShortlistsDir, fmBuildId } = input;
  if (fmShortlistsDir !== undefined) {
    if (typeof fmShortlistsDir !== 'string' || fmShortlistsDir.length > 500) throw bad('fmShortlistsDir must be a path string.');
    out.fmShortlistsDir = fmShortlistsDir.trim() || defaultFmShortlistsDir();
  }
  if (fmBuildId !== undefined) {
    if (typeof fmBuildId !== 'number' || !Number.isInteger(fmBuildId) || fmBuildId < 0 || fmBuildId > 0xffffffff) throw bad('fmBuildId must be an unsigned 32-bit integer.');
    out.fmBuildId = fmBuildId;
  }
  // Older settings files won't have these fields; fill them in.
  if (!out.fmShortlistsDir) out.fmShortlistsDir = defaultFmShortlistsDir();
  if (!out.fmBuildId) out.fmBuildId = DEFAULT_FM_BUILD;
  return out;
}

function validateWeights(v: unknown): Settings['ratingWeights'] {
  const ok = (w: unknown): w is number => typeof w === 'number' && Number.isFinite(w) && w >= 0 && w <= 100;
  if (!isObject(v) || !ok(v.key) || !ok(v.preferred) || v.key + v.preferred <= 0) {
    throw bad('ratingWeights must be { key, preferred } with numbers from 0 to 100, not both 0.');
  }
  return { key: v.key, preferred: v.preferred };
}

function validateOverrides(v: unknown): Settings['roleOverrides'] {
  if (!isObject(v)) throw bad('roleOverrides must be an object of role id -> { key, preferred }.');
  const out: Settings['roleOverrides'] = {};
  for (const [roleId, o] of Object.entries(v)) {
    if (!Object.hasOwn(ROLE_BY_ID, roleId)) throw bad(`roleOverrides: unknown role "${roleId}".`);
    if (!isObject(o)) throw bad(`roleOverrides.${roleId} must be { key, preferred }.`);
    const key = attrList(o.key, `roleOverrides.${roleId}.key`);
    const preferred = attrList(o.preferred, `roleOverrides.${roleId}.preferred`).filter(a => !key.includes(a));
    if (!key.length && !preferred.length) throw bad(`roleOverrides.${roleId} needs at least one attribute.`);
    out[roleId] = { key, preferred };
  }
  return out;
}

function attrList(v: unknown, field: string): PlayerAttrKey[] {
  if (!Array.isArray(v)) throw bad(`${field} must be an array of attribute keys.`);
  for (const a of v) {
    if (typeof a !== 'string' || !(PLAYER_ATTRS as readonly string[]).includes(a)) throw bad(`${field}: unknown attribute "${String(a)}".`);
  }
  return [...new Set(v as PlayerAttrKey[])];
}

// ------------------------------------------------------------------ files

const rel = (file: string) => path.relative(ROOT_DIR, file);

async function readOrDefault<T>(file: string, validate: (v: unknown) => T, fallback: () => T): Promise<T> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.warn(`Could not read ${rel(file)} (${errorMessage(err)}); using defaults.`);
    return fallback();
  }
  try {
    return validate(JSON.parse(text.replace(/^﻿/, '')));
  } catch (err) {
    // Keep the broken file for the user instead of silently overwriting it on the next save.
    const backup = `${file}.broken-${Date.now()}`;
    await rename(file, backup).catch(() => {});
    console.warn(`${rel(file)} is invalid (${errorMessage(err)}); moved it to ${path.basename(backup)} and using defaults.`);
    return fallback();
  }
}

let tempCounter = 0;

export function tempPath(file: string): string {
  return `${file}.${process.pid}.${++tempCounter}.tmp`;
}

/** rename() over an existing file, retried because Windows briefly locks files that antivirus or indexers hold open. */
export async function replaceFile(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 6 || (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY')) throw err;
      await sleep(40 * attempt);
    }
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

/** Writes are serialised so two quick saves can never land out of order. */
function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const run = writeChain.then(async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = tempPath(file);
    try {
      await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
      await replaceFile(tmp, file);
    } catch (err) {
      await rm(tmp, { force: true }).catch(() => {});
      throw err;
    }
  });
  writeChain = run.catch(() => {});
  return run;
}
