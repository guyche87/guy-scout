import { useEffect, useRef, useState } from 'react';

/** Returns `value` once it has stopped changing for `ms` milliseconds. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms]);
  return debounced;
}

/** A stable debounced callback; the latest `fn` is always the one invoked. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const cb = useRef((...args: A) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fnRef.current(...args), ms);
  });
  return cb.current;
}
