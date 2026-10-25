// Guy Scout server: the JSON API under /api plus the built React UI from web/dist, on localhost only.
// Started by start.bat via `node server/index.ts` (Node runs the TypeScript directly; no build step).
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ratingConfigFromSettings } from '../shared/ratings.ts';
import { getSettings, ROOT_DIR } from './persist.ts';
import { apiRouter } from './routes.ts';
import { listSnapshots } from './snapshots.ts';
import { errorMessage, HttpError, store } from './store.ts';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 4824;
const DIST_DIR = path.join(ROOT_DIR, 'web', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]']);

function parsePort(v: string | undefined): number {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 && n < 65536 ? n : DEFAULT_PORT;
}

const PORT = parsePort(process.env.PORT);

const NOT_BUILT_PAGE = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Guy Scout</title></head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;max-width:40em;margin:4em auto;line-height:1.5">
<h1>Guy Scout</h1>
<p><strong>UI not built &mdash; run start.bat</strong> (it builds the web UI and then starts this server).</p>
<p>The API is running: <a href="/api/status">/api/status</a></p>
</body></html>
`;

const app = express();
app.disable('x-powered-by');

// Bound to 127.0.0.1, but a web page could still reach us through DNS rebinding; a foreign Host header gives it away.
app.use((req, res, next) => {
  const host = (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase();
  if (LOCAL_HOSTNAMES.has(host)) return next();
  res.status(403).json({ error: 'Forbidden host.' });
});

app.use('/api', express.json({ limit: '5mb' }), apiRouter());
app.use('/api', req => {
  throw new HttpError(404, `No such endpoint: ${req.method} ${req.originalUrl}`);
});

// Vite puts content-hashed files under assets/, so those can be cached forever; index.html must always revalidate.
app.use(express.static(DIST_DIR, {
  setHeaders(res: http.ServerResponse, file: string) {
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

// SPA fallback for client-side routes. Paths with an extension are missing files and get a plain 404.
app.get('/{*splat}', (req, res, next) => {
  if (path.extname(req.path)) return next();
  if (existsSync(INDEX_HTML)) {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(INDEX_HTML);
  } else if (req.path === '/') {
    res.type('html').send(NOT_BUILT_PAGE);
  } else {
    next();
  }
});

function statusOf(err: unknown): number {
  if (err instanceof HttpError) return err.status;
  const e = err as { status?: unknown; statusCode?: unknown } | null;
  const s = e?.status ?? e?.statusCode;
  return typeof s === 'number' && s >= 400 && s < 600 ? s : 500;
}

function messageOf(err: unknown, status: number): string {
  if ((err as { type?: unknown } | null)?.type === 'entity.parse.failed') return 'Request body is not valid JSON.';
  if (status === 413) return 'Request body is too large.';
  return errorMessage(err) || 'Internal server error.';
}

// Express recognises error middleware by its four parameters, so `next` must stay even when unused.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = statusOf(err);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: messageOf(err, status) });
});

async function start(): Promise<void> {
  try {
    store.setRatingConfig(ratingConfigFromSettings(await getSettings()));
  } catch (err) {
    console.warn(`Could not apply saved settings, using defaults: ${errorMessage(err)}`);
  }

  const server = http.createServer(app);
  server.once('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE'
      ? `Port ${PORT} is already in use. Is Guy Scout already running? (Set PORT to use another port.)`
      : `Could not start the server: ${err.message}`);
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    console.log(`Guy Scout is running at http://${HOST}:${PORT}/`);
    if (!existsSync(INDEX_HTML)) console.log('The web UI is not built yet (web/dist is missing): run start.bat.');
    // Snapshots are only listed here; the UI decides whether to load one or read the running game.
    listSnapshots()
      .then(list => { if (list.length) console.log(`${list.length} saved snapshot(s) available in data/snapshots.`); })
      .catch(() => {});
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
