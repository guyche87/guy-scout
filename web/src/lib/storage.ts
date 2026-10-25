// Per-browser conveniences only (columns, last filters, compare selection, theme). Never throws.
import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'wgs24:';

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled: conveniences are optional.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * useState that is persisted to localStorage (debounced write). `validate` can reject or repair
 * stale shapes from an older version.
 */
export function useStoredState<T>(
  key: string,
  initial: T | (() => T),
  validate?: (v: unknown) => T | null,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    const stored = loadJson<unknown>(key, undefined);
    if (stored === undefined) return fallback;
    if (validate) return validate(stored) ?? fallback;
    return stored as T;
  });
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveJson(key, latest.current), 250);
    return () => window.clearTimeout(timer.current);
  }, [key, value]);

  // Flush on unload so a quick reload keeps the last change.
  useEffect(() => {
    const flush = () => saveJson(key, latest.current);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [key]);

  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set];
}
