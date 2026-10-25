// Compare selection (up to four players), kept in localStorage.
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useStoredState } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';

export const COMPARE_MAX = 4;

export interface CompareState {
  ids: readonly number[];
  set: ReadonlySet<number>;
  add: (id: number) => void;
  addMany: (ids: readonly number[]) => void;
  remove: (id: number) => void;
  toggle: (id: number) => void;
  move: (id: number, delta: number) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareState | null>(null);

function validIds(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).slice(0, COMPARE_MAX);
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useStoredState<number[]>('compare.ids', [], validIds);

  const add = useCallback((id: number) => {
    setIds(prev => {
      if (prev.includes(id)) return prev;
      if (prev.length >= COMPARE_MAX) {
        toast.warning(`Compare holds up to ${COMPARE_MAX} players. Remove one first.`);
        return prev;
      }
      return [...prev, id];
    });
  }, [setIds]);

  const addMany = useCallback((more: readonly number[]) => {
    setIds(prev => {
      const next = [...prev];
      let skipped = 0;
      for (const id of more) {
        if (next.includes(id)) continue;
        if (next.length >= COMPARE_MAX) { skipped++; continue; }
        next.push(id);
      }
      if (skipped) toast.warning(`Compare holds up to ${COMPARE_MAX} players; ${skipped} not added.`);
      return next;
    });
  }, [setIds]);

  const remove = useCallback((id: number) => setIds(prev => prev.filter(x => x !== id)), [setIds]);

  const toggle = useCallback((id: number) => {
    setIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= COMPARE_MAX) {
        toast.warning(`Compare holds up to ${COMPARE_MAX} players. Remove one first.`);
        return prev;
      }
      return [...prev, id];
    });
  }, [setIds]);

  const move = useCallback((id: number, delta: number) => {
    setIds(prev => {
      const i = prev.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, [setIds]);

  const clear = useCallback(() => setIds([]), [setIds]);

  const value = useMemo<CompareState>(
    () => ({ ids, set: new Set(ids), add, addMany, remove, toggle, move, clear }),
    [ids, add, addMany, remove, toggle, move, clear],
  );
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareState {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
