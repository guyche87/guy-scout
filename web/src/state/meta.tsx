import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Meta } from '../../../shared/api.ts';
import { api } from '../api/client.ts';
import { useStatus } from './status.tsx';

export const EMPTY_META: Meta = { nations: [], leagues: [], continents: [], jobs: [], traits: [], personalityLabels: [], currencies: [] };

const MetaContext = createContext<Meta>(EMPTY_META);

/** Lists for filter pickers; refetched whenever a new data set is loaded. */
export function MetaProvider({ children }: { children: ReactNode }) {
  const { dataKey } = useStatus();
  const [meta, setMeta] = useState<Meta>(EMPTY_META);

  useEffect(() => {
    if (!dataKey) return;
    const ac = new AbortController();
    api.meta({ signal: ac.signal, quiet: true }).then(
      m => setMeta({
        nations: m.nations ?? [],
        leagues: m.leagues ?? [],
        continents: m.continents ?? [],
        jobs: m.jobs ?? [],
        traits: m.traits ?? [],
        personalityLabels: m.personalityLabels ?? [],
        currencies: m.currencies ?? [],
      }),
      () => {
        // Filters just have empty pickers; searches still work.
      },
    );
    return () => ac.abort();
  }, [dataKey]);

  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export function useMeta(): Meta {
  return useContext(MetaContext);
}
