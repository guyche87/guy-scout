// Fetch-on-change hook with abort of stale requests. The previous data is kept while a new request runs
// so tables do not flash empty between pages / filter changes.
import { useEffect, useRef, useState } from 'react';
import { isAbort } from '../api/client.ts';

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the request with the same inputs. */
  reload: () => void;
}

/**
 * Runs `fn` whenever `key` changes (key should be a string built from every input, e.g. JSON of the request).
 * Pass key = null to skip (data is cleared).
 */
export function useFetch<T>(key: string | null, fn: (signal: AbortSignal) => Promise<T>): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reloadRef = useRef(() => setNonce(n => n + 1));

  useEffect(() => {
    if (key === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fnRef.current(ac.signal).then(
      d => {
        if (ac.signal.aborted) return;
        setData(d);
        setLoading(false);
      },
      err => {
        if (ac.signal.aborted || isAbort(err)) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
    );
    return () => ac.abort();
  }, [key, nonce]);

  return { data, loading, error, reload: reloadRef.current };
}
