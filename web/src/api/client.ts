// Typed fetch helpers for every endpoint in shared/api.ts. Failures raise ApiError and (unless quiet) show a toast.
import type {
  ClubQuery, ExportRequest, Meta, PlayerQuery, SearchRequest, SearchResponse, SlfExportResult, SlfFileInfo, SlfImportResult, SnapshotInfo, Status, StaffQuery,
} from '../../../shared/api.ts';
import type { Club, ClubDetail, Player, PlayerDetail, Settings, Shortlist, Staff } from '../../../shared/types.ts';
import { toast } from '../lib/toast.ts';

export class ApiError extends Error {
  readonly status: number;
  /** True when the server could not be reached at all. */
  readonly offline: boolean;

  constructor(status: number, message: string, offline = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.offline = offline;
  }
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export const NO_DATA_MESSAGE = 'No game data loaded yet. Start FM24, load your save, then click "Load game" (or open a snapshot).';

export interface RequestOptions {
  signal?: AbortSignal;
  /** Do not show a toast on failure (caller handles it). */
  quiet?: boolean;
}

function describe(status: number, serverMessage: string | null): string {
  if (status === 409) return serverMessage && /load/i.test(serverMessage) ? serverMessage : NO_DATA_MESSAGE;
  if (serverMessage) return serverMessage;
  if (status === 404) return 'Not found.';
  if (status >= 500) return `Server error (${status}).`;
  return `Request failed (${status}).`;
}

async function readError(res: Response): Promise<string | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    try {
      const j = JSON.parse(text) as unknown;
      if (j && typeof j === 'object') {
        const o = j as Record<string, unknown>;
        if (typeof o.error === 'string') return o.error;
        if (typeof o.message === 'string') return o.message;
      }
    } catch {
      // not JSON
    }
    return text.length < 300 ? text : null;
  } catch {
    return null;
  }
}

async function send(method: string, path: string, body: unknown, opts: RequestOptions): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    const e = new ApiError(0, 'Cannot reach the scout server. Is it running (npm start)?', true);
    if (!opts.quiet) toast.error(e.message);
    throw e;
  }
  if (!res.ok) {
    const msg = describe(res.status, await readError(res));
    const e = new ApiError(res.status, msg);
    if (!opts.quiet) toast.error(msg);
    throw e;
  }
  return res;
}

async function json<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const res = await send(method, path, body, opts);
  try {
    return (await res.json()) as T;
  } catch (err) {
    if (isAbort(err)) throw err;
    const e = new ApiError(res.status, 'The server sent an unreadable response.');
    if (!opts.quiet) toast.error(e.message);
    throw e;
  }
}

function filenameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get('Content-Disposition') ?? '';
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // fall through
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
  return plain ? plain[1].trim() : fallback;
}

/** Triggers a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const api = {
  status: (opts?: RequestOptions) => json<Status>('GET', '/status', undefined, opts),
  load: (opts?: RequestOptions) => json<Status>('POST', '/load', {}, opts),
  meta: (opts?: RequestOptions) => json<Meta>('GET', '/meta', undefined, opts),

  searchPlayers: (req: SearchRequest<PlayerQuery>, opts?: RequestOptions) =>
    json<SearchResponse<Player>>('POST', '/players/search', req, opts),
  player: (id: number, opts?: RequestOptions) => json<PlayerDetail>('GET', `/players/${id}`, undefined, opts),
  async exportPlayers(req: ExportRequest, opts: RequestOptions = {}): Promise<void> {
    const res = await send('POST', '/players/export', req, opts);
    const blob = await res.blob();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, filenameFrom(res, `players-${stamp}.${req.format}`));
  },

  searchStaff: (req: SearchRequest<StaffQuery>, opts?: RequestOptions) =>
    json<SearchResponse<Staff>>('POST', '/staff/search', req, opts),
  staff: (id: number, opts?: RequestOptions) => json<Staff>('GET', `/staff/${id}`, undefined, opts),

  searchClubs: (req: SearchRequest<ClubQuery>, opts?: RequestOptions) =>
    json<SearchResponse<Club>>('POST', '/clubs/search', req, opts),
  club: (id: number, opts?: RequestOptions) => json<ClubDetail>('GET', `/clubs/${id}`, undefined, opts),

  shortlists: (opts?: RequestOptions) => json<Shortlist[]>('GET', '/shortlists', undefined, opts),
  fmShortlistFiles: (opts?: RequestOptions) => json<SlfFileInfo[]>('GET', '/shortlists/fm-files', undefined, opts),
  importShortlist: (file: string, opts?: RequestOptions) => json<SlfImportResult>('POST', '/shortlists/import', { file }, opts),
  exportShortlist: (name: string, playerIds: readonly number[], opts?: RequestOptions) => json<SlfExportResult>('POST', '/shortlists/export', { name, playerIds }, opts),
  saveShortlists: (lists: Shortlist[], opts?: RequestOptions) => json<Shortlist[]>('PUT', '/shortlists', lists, opts),

  settings: (opts?: RequestOptions) => json<Settings>('GET', '/settings', undefined, opts),
  saveSettings: (s: Settings, opts?: RequestOptions) => json<Settings>('PUT', '/settings', s, opts),

  snapshots: (opts?: RequestOptions) => json<SnapshotInfo[]>('GET', '/snapshots', undefined, opts),
  saveSnapshot: (opts?: RequestOptions) => json<SnapshotInfo>('POST', '/snapshots', {}, opts),
  loadSnapshot: (name: string, opts?: RequestOptions) => json<Status>('POST', '/snapshots/load', { name }, opts),
  snapshotDownloadUrl: (name: string) => `/api/snapshots/${encodeURIComponent(name)}/download`,
};
