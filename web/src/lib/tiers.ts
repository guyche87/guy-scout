// Value tiers - copied verbatim from docs/ui-design.md section 4, plus small "...For" wrappers that return the
// data-tier string (or undefined for a neutral "–" tile).
import { FAMILIARITY } from '../../../shared/attributes.ts';

export type Tier = 1 | 2 | 3 | 4 | 5;

/** 1-20 attribute (player, staff, personality, hidden). `invert` for "lower is better" keys. */
export function attrTier(value: number, invert = false): Tier {
  const v = invert ? 21 - value : value;
  if (v >= 18) return 5;
  if (v >= 15) return 4;
  if (v >= 11) return 3;
  if (v >= 6) return 2;
  return 1;
}

/** 0-100 role / position / staff-role rating. Rounded first so the colour matches the printed number. */
export function ratingTier(pct: number): Tier {
  const v = Math.round(pct);
  if (v >= 90) return 5;
  if (v >= 75) return 4;
  if (v >= 55) return 3;
  if (v >= 30) return 2;
  return 1;
}

/** 1-200 current or potential ability. */
export function abilityTier(v: number): Tier {
  if (v >= 160) return 5;
  if (v >= 140) return 4;
  if (v >= 120) return 3;
  if (v >= 90) return 2;
  return 1;
}

/** Keys where a high value is bad: the colour is inverted, the printed number is not. */
export const INVERTED_KEYS: ReadonlySet<string> = new Set([
  'dirtiness', 'injuryProneness', 'controversy', 'interference',
]);

/** For 1-20 tiles: the data-tier string, or undefined (neutral tile showing "–") when there is no value. */
export function attrTierFor(key: string, value: number | null | undefined): string | undefined {
  if (value == null || value <= 0) return undefined;
  return String(attrTier(value, INVERTED_KEYS.has(key)));
}

export type Familiarity =
  | 'natural' | 'accomplished' | 'competent' | 'unconvincing' | 'awkward' | 'ineffectual';

/** 0-20 position familiarity -> data-fam (thresholds from shared/attributes.ts). */
export function familiarity(v: number): Familiarity {
  if (v >= FAMILIARITY.natural) return 'natural';
  if (v >= FAMILIARITY.accomplished) return 'accomplished';
  if (v >= FAMILIARITY.competent) return 'competent';
  if (v >= FAMILIARITY.unconvincing) return 'unconvincing';
  if (v >= FAMILIARITY.awkward) return 'awkward';
  return 'ineffectual';
}

// ------------------------------------------------------------------ app helpers (not part of the doc snippet)

/** data-tier for a 0-100 rating, or undefined when missing. */
export function ratingTierFor(v: number | null | undefined): string | undefined {
  if (v == null || !Number.isFinite(v)) return undefined;
  return String(ratingTier(v));
}

/** data-tier for CA/PA, or undefined when missing. */
export function abilityTierFor(v: number | null | undefined): string | undefined {
  if (v == null || !Number.isFinite(v) || v <= 0) return undefined;
  return String(abilityTier(v));
}
