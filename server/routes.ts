// JSON API mounted at /api (see the endpoint map in shared/api.ts). Handlers stay thin: validation and the
// actual work live in search/persist/snapshots/export. Express 5 forwards thrown/rejected errors to the
// error middleware in index.ts.
import express from 'express';
import type { Router } from 'express';
import { pipeline } from 'node:stream/promises';
import type { ClubQuery, ExportRequest, PlayerQuery, SearchRequest, StaffQuery } from '../shared/api.ts';
import { ratingConfigFromSettings, toPlayerDetail } from '../shared/ratings.ts';
import type { ClubDetail } from '../shared/types.ts';
import { exportPlayers } from './export.ts';
import { getSettings, getShortlists, saveSettings, saveShortlists } from './persist.ts';
import { searchClubs, searchPlayers, searchStaff, type PlayerSearchCtx } from './search.ts';
import { exportSlf, importSlf, listSlfFiles } from './shortlistsFm.ts';
import { listSnapshots, loadSnapshot, openSnapshot, saveSnapshot } from './snapshots.ts';
import { HttpError, isObject, store } from './store.ts';

function parseId(raw: string): number {
  if (!/^\d{1,15}$/.test(raw)) throw new HttpError(400, `Invalid id "${raw}".`);
  return Number(raw);
}

/** Resolves query.shortlistId before searching, so the search itself runs synchronously on one data set. */
async function shortlistIds(query: unknown): Promise<Set<number> | undefined> {
  const id = isObject(query) ? query.shortlistId : undefined;
  if (typeof id !== 'string' || !id) return undefined;
  const list = (await getShortlists()).find(l => l.id === id);
  return list ? new Set(list.playerIds) : undefined;
}

function playerCtx(ids: Set<number> | undefined): PlayerSearchCtx {
  return {
    nameKeys: store.playerNameKeys,
    clubKeys: store.playerClubKeys,
    ratingConfig: store.ratingConfig,
    humanClubId: store.humanClubId,
    shortlistIds: ids,
  };
}

const bodyOf = (body: unknown): Record<string, unknown> => (isObject(body) ? body : {});
const byCaDesc = (a: { ca: number }, b: { ca: number }) => b.ca - a.ca;

export function apiRouter(): Router {
  const api = express.Router();

  api.get('/status', (_req, res) => {
    res.json(store.status());
  });

  // Starts reading FM in the background; the UI polls /status for progress.
  api.post('/load', (_req, res) => {
    res.json(store.startLiveLoad());
  });

  api.get('/meta', (_req, res) => {
    res.json(store.getMeta());
  });

  // ---------------------------------------------------------------- players

  api.post('/players/search', async (req, res) => {
    const body = bodyOf(req.body);
    const ids = await shortlistIds(body.query);
    store.requireData();
    res.json(searchPlayers(store.players, body as unknown as SearchRequest<PlayerQuery>, playerCtx(ids)));
  });

  api.post('/players/export', async (req, res) => {
    const body = bodyOf(req.body);
    const ids = await shortlistIds(body.query);
    const settings = await getSettings();
    const data = store.requireData();
    const file = exportPlayers(data.players, body as unknown as ExportRequest, playerCtx(ids), settings, data.gameDate);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Cache-Control': 'no-store',
    });
    res.send(file.body);
  });

  api.get('/players/:id', (req, res) => {
    store.requireData();
    const player = store.playerById.get(parseId(req.params.id));
    if (!player) throw new HttpError(404, `Player ${req.params.id} not found.`);
    res.json(toPlayerDetail(player, store.ratingConfig));
  });

  // ---------------------------------------------------------------- staff

  api.post('/staff/search', (req, res) => {
    store.requireData();
    res.json(searchStaff(store.staff, req.body as SearchRequest<StaffQuery> | undefined, {
      nameKeys: store.staffNameKeys,
      clubKeys: store.staffClubKeys,
      humanClubId: store.humanClubId,
    }));
  });

  api.get('/staff/:id', (req, res) => {
    store.requireData();
    const staff = store.staffById.get(parseId(req.params.id));
    if (!staff) throw new HttpError(404, `Staff member ${req.params.id} not found.`);
    res.json(staff);
  });

  // ---------------------------------------------------------------- clubs

  api.post('/clubs/search', (req, res) => {
    store.requireData();
    res.json(searchClubs(store.clubs, req.body as SearchRequest<ClubQuery> | undefined, {
      nameKeys: store.clubNameKeys,
      playersByClub: store.playersByClub,
    }));
  });

  api.get('/clubs/:id', (req, res) => {
    store.requireData();
    const id = parseId(req.params.id);
    const club = store.clubById.get(id);
    if (!club) throw new HttpError(404, `Club ${req.params.id} not found.`);
    const detail: ClubDetail = {
      ...club,
      players: [...(store.playersByClub.get(id) ?? [])].sort(byCaDesc),
      staff: [...(store.staffByClub.get(id) ?? [])].sort(byCaDesc),
    };
    res.json(detail);
  });

  // ---------------------------------------------------------------- shortlists & settings

  api.get('/shortlists', async (_req, res) => {
    res.json(await getShortlists());
  });

  api.put('/shortlists', async (req, res) => {
    res.json(await saveShortlists(req.body));
  });

  // ---- FM .slf import / export (the player id IS FM's unique id, so a .slf is just a list of them) ----

  // Genie Scout / scout .slf files in the configured FM shortlists folder (FM's own .fmf are encrypted and skipped).
  api.get('/shortlists/fm-files', async (_req, res) => {
    res.json(await listSlfFiles());
  });

  // Reads a .slf and matches its ids to loaded players; the client then saves the resulting scout shortlist.
  api.post('/shortlists/import', async (req, res) => {
    const body = bodyOf(req.body);
    const lookup = (id: number) => store.playerById.get(id)?.name ?? null;
    res.json(await importSlf({ file: typeof body.file === 'string' ? body.file : undefined }, lookup));
  });

  // Writes a .slf into the FM shortlists folder so FM's "Load Shortlist" can open it.
  api.post('/shortlists/export', async (req, res) => {
    const body = bodyOf(req.body);
    const name = typeof body.name === 'string' ? body.name : '';
    const ids = body.playerIds;
    if (!name.trim()) throw new HttpError(400, 'A shortlist name is required.');
    if (!Array.isArray(ids) || !ids.every(x => Number.isSafeInteger(x))) throw new HttpError(400, 'playerIds must be an array of integers.');
    if (!ids.length) throw new HttpError(400, 'The shortlist is empty.');
    res.json(await exportSlf(name, ids as number[]));
  });

  api.get('/settings', async (_req, res) => {
    res.json(await getSettings());
  });

  api.put('/settings', async (req, res) => {
    const settings = await saveSettings(req.body);
    store.setRatingConfig(ratingConfigFromSettings(settings));
    res.json(settings);
  });

  // ---------------------------------------------------------------- snapshots

  api.get('/snapshots', async (_req, res) => {
    res.json(await listSnapshots());
  });

  api.post('/snapshots', async (_req, res) => {
    res.json(await saveSnapshot());
  });

  // Unlike /load this waits until the snapshot is in memory (a few seconds at most) and returns the final status.
  api.post('/snapshots/load', async (req, res) => {
    await loadSnapshot(bodyOf(req.body).name);
    res.json(store.status());
  });

  api.get('/snapshots/:name/download', async (req, res) => {
    const file = await openSnapshot(req.params.name);
    res.set({
      'Content-Type': 'application/gzip',
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
    });
    try {
      await pipeline(file.stream, res);
    } catch (err) {
      // The browser cancelling a download is not a server error.
      if ((err as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') throw err;
    }
  });

  return api;
}
