// Server status: polled every 500 ms while a load runs, every 5 s otherwise (to notice FM / the server going away).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Status } from '../../../shared/api.ts';
import { api, ApiError } from '../api/client.ts';
import { toast } from '../lib/toast.ts';

export interface StatusState {
  status: Status | null;
  /** The server could not be reached on the last poll. */
  offline: boolean;
  /** Changes whenever a new data set becomes available (live load or snapshot). Use as an effect dependency. */
  dataKey: string | null;
  hasData: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  loadGame: () => Promise<void>;
  loadSnapshot: (name: string) => Promise<void>;
}

const StatusContext = createContext<StatusState | null>(null);

const FAST_MS = 500;
const SLOW_MS = 5000;

function dataKeyOf(s: Status | null): string | null {
  if (!s || !s.source || !s.loadedAt) return null;
  return `${s.source}|${s.loadedAt}|${s.snapshotName ?? ''}|${s.counts.players}`;
}

export function StatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [offline, setOffline] = useState(false);
  const lastJson = useRef('');
  const timer = useRef<number | undefined>(undefined);
  const prevState = useRef<Status['state'] | null>(null);

  const apply = useCallback((s: Status) => {
    const j = JSON.stringify(s);
    if (j !== lastJson.current) {
      lastJson.current = j;
      setStatus(s);
    }
    setOffline(false);
    const was = prevState.current;
    prevState.current = s.state;
    if (was === 'loading' && s.state === 'ready') {
      toast.success(s.source === 'snapshot' ? `Snapshot "${s.snapshotName ?? ''}" loaded.` : 'Game loaded.');
    } else if (was === 'loading' && s.state === 'error') {
      toast.error(s.message ?? 'Loading failed.');
    }
  }, []);

  const poll = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    let next = SLOW_MS;
    try {
      const s = await api.status({ quiet: true });
      apply(s);
      if (s.state === 'loading') next = FAST_MS;
    } catch (err) {
      if (err instanceof ApiError && err.offline) setOffline(true);
    }
    timer.current = window.setTimeout(() => void poll(), next);
  }, [apply]);

  useEffect(() => {
    void poll();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll]);

  const loadGame = useCallback(async () => {
    try {
      // A response of "loading" is remembered by apply(), so the poll that sees "ready" shows the toast.
      apply(await api.load());
    } catch {
      // toast already shown
    }
    void poll();
  }, [apply, poll]);

  const loadSnapshot = useCallback(async (name: string) => {
    try {
      // The server may answer once the snapshot is loaded, or immediately with state "loading".
      prevState.current = 'loading';
      const s = await api.loadSnapshot(name);
      apply(s);
    } catch {
      prevState.current = null;
    }
    void poll();
  }, [apply, poll]);

  const value = useMemo<StatusState>(() => {
    const dataKey = dataKeyOf(status);
    return {
      status,
      offline,
      dataKey,
      hasData: dataKey !== null,
      loading: status?.state === 'loading',
      refresh: poll,
      loadGame,
      loadSnapshot,
    };
  }, [status, offline, poll, loadGame, loadSnapshot]);

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
}

export function useStatus(): StatusState {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error('useStatus must be used inside StatusProvider');
  return ctx;
}
