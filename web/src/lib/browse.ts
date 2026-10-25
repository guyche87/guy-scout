// The ids currently listed by a table (one result page), so a profile drawer can step prev/next through them.
import { useSyncExternalStore } from 'react';

export type BrowseKind = 'player' | 'staff' | 'club';

const lists: Record<BrowseKind, readonly number[]> = { player: [], staff: [], club: [] };
const listeners = new Set<() => void>();

export function setBrowseList(kind: BrowseKind, ids: readonly number[]): void {
  const cur = lists[kind];
  if (cur.length === ids.length && cur.every((v, i) => v === ids[i])) return;
  lists[kind] = ids;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useBrowseList(kind: BrowseKind): readonly number[] {
  return useSyncExternalStore(subscribe, () => lists[kind], () => lists[kind]);
}

/** Previous / next id around `id` in the list, or null at the ends (or when id is not listed). */
export function neighbours(list: readonly number[], id: number): { prev: number | null; next: number | null; index: number } {
  const i = list.indexOf(id);
  if (i < 0) return { prev: null, next: null, index: -1 };
  return { prev: i > 0 ? list[i - 1] : null, next: i < list.length - 1 ? list[i + 1] : null, index: i };
}
