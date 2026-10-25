// Shortlists live on the server (GET/PUT /api/shortlists). Edits are optimistic and saved as a whole array.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Shortlist } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { loadJson, saveJson } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';

export interface ShortlistsState {
  lists: readonly Shortlist[];
  loaded: boolean;
  /** List used by the star toggle in tables. */
  activeId: string | null;
  setActiveId: (id: string) => void;
  /** Player ids in the active list. */
  activeSet: ReadonlySet<number>;
  /** Player ids in any list. */
  anySet: ReadonlySet<number>;
  create: (name: string) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  /** Toggles membership; uses the active list (created on demand) when listId is omitted. */
  toggle: (playerId: number, listId?: string) => void;
  addMany: (playerIds: readonly number[], listId?: string) => void;
  setNote: (listId: string, playerId: number, note: string) => void;
  /** Bumped after each change so list views can refetch their players. */
  version: number;
}

const ShortlistsContext = createContext<ShortlistsState | null>(null);

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // insecure context
  }
  return `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(raw: unknown): Shortlist[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Shortlist => !!l && typeof l === 'object' && typeof (l as Shortlist).id === 'string')
    .map(l => ({
      id: l.id,
      name: typeof l.name === 'string' ? l.name : 'Shortlist',
      playerIds: Array.isArray(l.playerIds) ? l.playerIds.filter(n => typeof n === 'number') : [],
      notes: l.notes && typeof l.notes === 'object' ? l.notes : {},
    }));
}

const ACTIVE_KEY = 'shortlists.active';

export function ShortlistsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Shortlist[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveIdState] = useState<string | null>(() => loadJson<string | null>(ACTIVE_KEY, null));
  const [version, setVersion] = useState(0);
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const confirmed = useRef<Shortlist[]>([]);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = (attempt: number) => {
      api.shortlists({ quiet: true }).then(
        l => {
          if (cancelled) return;
          const clean = sanitize(l);
          confirmed.current = clean;
          setLists(clean);
          setLoaded(true);
        },
        () => {
          if (!cancelled && attempt < 20) window.setTimeout(() => tryLoad(attempt + 1), 3000);
        },
      );
    };
    tryLoad(0);
    return () => {
      cancelled = true;
      window.clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = useCallback((next: Shortlist[], delayMs = 0) => {
    window.clearTimeout(saveTimer.current);
    const run = () => {
      api.saveShortlists(next).then(
        saved => {
          const clean = sanitize(saved);
          confirmed.current = clean;
          // Only adopt the server copy if nothing changed meanwhile.
          if (listsRef.current === next) setLists(clean);
        },
        () => {
          setLists(confirmed.current);
          setVersion(v => v + 1);
        },
      );
    };
    if (delayMs > 0) saveTimer.current = window.setTimeout(run, delayMs);
    else run();
  }, []);

  const update = useCallback((fn: (prev: Shortlist[]) => Shortlist[], delayMs = 0) => {
    const next = fn(listsRef.current);
    if (next === listsRef.current) return;
    listsRef.current = next;
    setLists(next);
    setVersion(v => v + 1);
    persist(next, delayMs);
  }, [persist]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    saveJson(ACTIVE_KEY, id);
  }, []);

  const create = useCallback((name: string): string => {
    const id = newId();
    const trimmed = name.trim() || `Shortlist ${listsRef.current.length + 1}`;
    update(prev => [...prev, { id, name: trimmed, playerIds: [], notes: {} }]);
    setActiveId(id);
    return id;
  }, [update, setActiveId]);

  const rename = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update(prev => prev.map(l => (l.id === id ? { ...l, name: trimmed } : l)));
  }, [update]);

  const remove = useCallback((id: string) => {
    update(prev => prev.filter(l => l.id !== id));
  }, [update]);

  // Resolves the target list, creating a default one when there are none.
  const resolveTarget = useCallback((listId: string | undefined, prev: Shortlist[]): { lists: Shortlist[]; id: string } => {
    if (listId && prev.some(l => l.id === listId)) return { lists: prev, id: listId };
    const active = activeId && prev.some(l => l.id === activeId) ? activeId : prev[0]?.id;
    if (active) return { lists: prev, id: active };
    const id = newId();
    return { lists: [...prev, { id, name: 'My Shortlist', playerIds: [], notes: {} }], id };
  }, [activeId]);

  const toggle = useCallback((playerId: number, listId?: string) => {
    let targetName = '';
    let added = false;
    let targetId = '';
    update(prev => {
      const t = resolveTarget(listId, prev);
      targetId = t.id;
      return t.lists.map(l => {
        if (l.id !== t.id) return l;
        targetName = l.name;
        if (l.playerIds.includes(playerId)) {
          const notes = { ...l.notes };
          delete notes[String(playerId)];
          return { ...l, playerIds: l.playerIds.filter(p => p !== playerId), notes };
        }
        added = true;
        return { ...l, playerIds: [...l.playerIds, playerId] };
      });
    });
    if (targetId && targetId !== activeId && !listId) setActiveId(targetId);
    if (targetName) toast.info(added ? `Added to "${targetName}".` : `Removed from "${targetName}".`, { ms: 2000 });
  }, [update, resolveTarget, activeId, setActiveId]);

  const addMany = useCallback((playerIds: readonly number[], listId?: string) => {
    let n = 0;
    let targetName = '';
    update(prev => {
      const t = resolveTarget(listId, prev);
      return t.lists.map(l => {
        if (l.id !== t.id) return l;
        targetName = l.name;
        const have = new Set(l.playerIds);
        const extra = playerIds.filter(p => !have.has(p));
        n = extra.length;
        return extra.length ? { ...l, playerIds: [...l.playerIds, ...extra] } : l;
      });
    });
    if (targetName) toast.info(`Added ${n} player${n === 1 ? '' : 's'} to "${targetName}".`, { ms: 2500 });
  }, [update, resolveTarget]);

  const setNote = useCallback((listId: string, playerId: number, note: string) => {
    update(prev => prev.map(l => {
      if (l.id !== listId) return l;
      const notes = { ...l.notes };
      if (note.trim()) notes[String(playerId)] = note;
      else delete notes[String(playerId)];
      return { ...l, notes };
    }), 600);
  }, [update]);

  const effectiveActive = activeId && lists.some(l => l.id === activeId) ? activeId : lists[0]?.id ?? null;

  const activeSet = useMemo(() => {
    const l = lists.find(x => x.id === effectiveActive);
    return new Set(l ? l.playerIds : []);
  }, [lists, effectiveActive]);

  const anySet = useMemo(() => {
    const s = new Set<number>();
    for (const l of lists) for (const p of l.playerIds) s.add(p);
    return s;
  }, [lists]);

  const value = useMemo<ShortlistsState>(() => ({
    lists, loaded, activeId: effectiveActive, setActiveId, activeSet, anySet,
    create, rename, remove, toggle, addMany, setNote, version,
  }), [lists, loaded, effectiveActive, setActiveId, activeSet, anySet, create, rename, remove, toggle, addMany, setNote, version]);

  return <ShortlistsContext.Provider value={value}>{children}</ShortlistsContext.Provider>;
}

export function useShortlists(): ShortlistsState {
  const ctx = useContext(ShortlistsContext);
  if (!ctx) throw new Error('useShortlists must be used inside ShortlistsProvider');
  return ctx;
}
