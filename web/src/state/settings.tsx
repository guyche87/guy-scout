import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Settings } from '../../../shared/types.ts';
import { api } from '../api/client.ts';
import { moneyFormat, type MoneyFormat } from '../lib/format.ts';
import { toast } from '../lib/toast.ts';

export const DEFAULT_SETTINGS: Settings = {
  currencySymbol: '£',
  currencyRate: 1,
  roleOverrides: {},
  ratingWeights: { key: 2, preferred: 1 },
  fmShortlistsDir: '',
  fmBuildId: 0,
};

export interface SettingsState {
  settings: Settings;
  /** False until the server answered once (defaults are used meanwhile). */
  loaded: boolean;
  money: MoneyFormat;
  /** Bumped after each successful save; searches that depend on ratings refetch on change. */
  ratingsVersion: number;
  save: (s: Settings) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsState | null>(null);

function normalise(s: Partial<Settings> | null | undefined): Settings {
  return {
    currencySymbol: typeof s?.currencySymbol === 'string' ? s.currencySymbol : DEFAULT_SETTINGS.currencySymbol,
    currencyRate: typeof s?.currencyRate === 'number' && s.currencyRate > 0 ? s.currencyRate : DEFAULT_SETTINGS.currencyRate,
    roleOverrides: s?.roleOverrides && typeof s.roleOverrides === 'object' ? s.roleOverrides : {},
    ratingWeights: {
      key: typeof s?.ratingWeights?.key === 'number' ? s.ratingWeights.key : DEFAULT_SETTINGS.ratingWeights.key,
      preferred: typeof s?.ratingWeights?.preferred === 'number' ? s.ratingWeights.preferred : DEFAULT_SETTINGS.ratingWeights.preferred,
    },
    fmShortlistsDir: typeof s?.fmShortlistsDir === 'string' ? s.fmShortlistsDir : DEFAULT_SETTINGS.fmShortlistsDir,
    fmBuildId: typeof s?.fmBuildId === 'number' ? s.fmBuildId : DEFAULT_SETTINGS.fmBuildId,
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [ratingsVersion, setRatingsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = (attempt: number) => {
      api.settings({ quiet: true }).then(
        s => {
          if (cancelled) return;
          setSettings(normalise(s));
          setLoaded(true);
        },
        () => {
          // Server not up yet: retry a few times, quietly.
          if (!cancelled && attempt < 20) window.setTimeout(() => tryLoad(attempt + 1), 3000);
        },
      );
    };
    tryLoad(0);
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (s: Settings): Promise<boolean> => {
    try {
      const saved = await api.saveSettings(s);
      setSettings(normalise(saved ?? s));
      setLoaded(true);
      setRatingsVersion(v => v + 1);
      toast.success('Settings saved.');
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<SettingsState>(
    () => ({ settings, loaded, money: moneyFormat(settings), ratingsVersion, save }),
    [settings, loaded, ratingsVersion, save],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

/** Shorthand for the money format only. */
export function useMoney(): MoneyFormat {
  return useSettings().money;
}
