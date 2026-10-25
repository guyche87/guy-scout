// Dark (default) / light theme via data-theme on <html>. Stored under "wgs24:theme" (index.html applies it
// before first paint).
import { useCallback, useSyncExternalStore } from 'react';
import { loadJson, saveJson } from './storage.ts';

export type Theme = 'dark' | 'light';

const KEY = 'theme';
const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(t: Theme): void {
  if (t === 'light') document.documentElement.dataset.theme = 'light';
  else document.documentElement.dataset.theme = 'dark';
}

/** Applies the stored theme; call once before the first render. */
export function initTheme(): void {
  const t = loadJson<unknown>(KEY, null);
  applyTheme(t === 'light' ? 'light' : 'dark');
}

export function setTheme(t: Theme): void {
  applyTheme(t);
  saveJson(KEY, t);
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useTheme(): [Theme, (t: Theme) => void, () => void] {
  const theme = useSyncExternalStore(subscribe, current, () => 'dark' as Theme);
  const toggle = useCallback(() => setTheme(current() === 'light' ? 'dark' : 'light'), []);
  return [theme, setTheme, toggle];
}
