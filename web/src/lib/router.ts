// Tiny hash router: #/page[/id][?key=value&...]. Back/forward work because every navigation is a hash change.
import { useSyncExternalStore } from 'react';

export const PAGES = ['players', 'staff', 'clubs', 'shortlists', 'compare', 'settings'] as const;
export type Page = typeof PAGES[number];

export interface Route {
  page: Page;
  /** Second path segment, e.g. the player id in #/players/123. */
  id: string | null;
  /** Query parameters after "?", e.g. #/clubs/12?player=345 opens a player drawer over a club. */
  params: Readonly<Record<string, string>>;
}

const DEFAULT_ROUTE: Route = { page: 'players', id: null, params: {} };

export function parseHash(hash: string): Route {
  let h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (h.startsWith('/')) h = h.slice(1);
  const q = h.indexOf('?');
  const path = q < 0 ? h : h.slice(0, q);
  const search = q < 0 ? '' : h.slice(q + 1);
  const [first, second] = path.split('/');
  const page = (PAGES as readonly string[]).includes(first) ? (first as Page) : null;
  if (!page) return DEFAULT_ROUTE;
  const params: Record<string, string> = {};
  if (search) for (const [k, v] of new URLSearchParams(search)) params[k] = v;
  return { page, id: second ? decodeURIComponent(second) : null, params };
}

export function formatRoute(r: { page: Page; id?: string | number | null; params?: Readonly<Record<string, string | number | null | undefined>> }): string {
  let s = `#/${r.page}`;
  if (r.id !== null && r.id !== undefined && r.id !== '') s += `/${encodeURIComponent(String(r.id))}`;
  if (r.params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(r.params)) if (v !== null && v !== undefined && v !== '') sp.set(k, String(v));
    const qs = sp.toString();
    if (qs) s += `?${qs}`;
  }
  return s;
}

// Cache so useSyncExternalStore gets a stable snapshot between hash changes.
let cachedHash: string | null = null;
let cachedRoute: Route = DEFAULT_ROUTE;

function getRoute(): Route {
  const h = window.location.hash;
  if (h !== cachedHash) {
    cachedHash = h;
    cachedRoute = parseHash(h);
  }
  return cachedRoute;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute, () => DEFAULT_ROUTE);
}

export function currentRoute(): Route {
  return getRoute();
}

export function navigate(hash: string, opts: { replace?: boolean } = {}): void {
  const target = hash.startsWith('#') ? hash : `#${hash}`;
  if (target === window.location.hash) return;
  if (opts.replace) {
    const url = `${window.location.pathname}${window.location.search}${target}`;
    window.history.replaceState(window.history.state, '', url);
    // replaceState does not fire hashchange; notify subscribers ourselves. The history entry before the
    // current one is unchanged, so prevHash must not move.
    replacing = true;
    try {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } finally {
      replacing = false;
    }
  } else {
    window.location.hash = target;
  }
}

// The hash we were on before the current one, so closing a drawer that was just opened can pop history
// instead of pushing a new entry (back after close then does not re-open the drawer).
let prevHash: string | null = null;
let curHash: string | null = typeof window !== 'undefined' ? window.location.hash : null;
let replacing = false;
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (window.location.hash === curHash) return;
    if (!replacing) prevHash = curHash;
    curHash = window.location.hash;
  });
}

/** Leave the current route for `hash` (used when closing drawers). */
export function closeTo(hash: string): void {
  const target = hash.startsWith('#') ? hash : `#${hash}`;
  const norm = (h: string | null) => (h === null ? null : h === '' || h === '#' ? '#/players' : h);
  if (norm(prevHash) === target && window.history.length > 1) {
    window.history.back();
  } else {
    navigate(target, { replace: true });
  }
}

/** Same route with one query parameter set (or removed when value is null). */
export function withParam(r: Route, key: string, value: string | number | null): string {
  const params: Record<string, string> = { ...r.params };
  if (value === null) delete params[key];
  else params[key] = String(value);
  return formatRoute({ page: r.page, id: r.id, params });
}

/**
 * Link that opens a player's profile. On the players page it is the canonical #/players/:id; elsewhere the
 * drawer opens over the current page (?player=id) so closing it returns to the same context.
 */
export function playerHref(r: Route, id: number): string {
  if (r.page === 'players') return formatRoute({ page: 'players', id, params: stripOverlays(r.params) });
  return withParam(r, 'player', id);
}

export function staffHref(r: Route, id: number): string {
  if (r.page === 'staff') return formatRoute({ page: 'staff', id, params: stripOverlays(r.params) });
  return withParam(r, 'staff', id);
}

export function clubHref(id: number): string {
  return formatRoute({ page: 'clubs', id });
}

function stripOverlays(p: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = { ...p };
  delete out.player;
  delete out.staff;
  return out;
}

/**
 * Route to return to when a drawer closes: 'player' / 'staff' drop that overlay parameter, 'id' drops the
 * path id (#/players/12 -> #/players) together with any overlays.
 */
export function closeOverlayHref(r: Route, kind: 'player' | 'staff' | 'id'): string {
  if (kind === 'player' && r.params.player) return withParam(r, 'player', null);
  if (kind === 'staff' && r.params.staff) return withParam(r, 'staff', null);
  return formatRoute({ page: r.page, id: null, params: stripOverlays(r.params) });
}
