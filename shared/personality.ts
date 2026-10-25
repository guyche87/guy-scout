// FM-style personality description derived from the hidden personality attributes (+ determination/leadership).
// FM's exact rules are not public; these thresholds follow the community-documented ones and are approximate.
import type { PersonalityKey } from './attributes.ts';

type P = Record<PersonalityKey, number>;

interface Rule {
  label: string;
  test: (p: P, det: number, ldr: number) => boolean;
}

const RULES: Rule[] = [
  { label: 'Model Citizen', test: (p, det) => det >= 14 && p.ambition >= 12 && p.loyalty >= 14 && p.pressure >= 13 && p.professionalism >= 15 && p.sportsmanship >= 14 && p.temperament >= 15 && p.controversy <= 6 },
  { label: 'Model Professional', test: p => p.professionalism >= 20 && p.temperament >= 10 },
  { label: 'Perfectionist', test: (p, det) => det >= 14 && p.ambition >= 14 && p.professionalism >= 14 && p.temperament <= 9 },
  { label: 'Resolute', test: (p, det) => det >= 14 && p.professionalism >= 15 && p.temperament >= 10 && p.pressure >= 11 },
  { label: 'Professional', test: p => p.professionalism >= 18 && p.temperament >= 10 },
  { label: 'Born Leader', test: (p, det, ldr) => ldr >= 20 && det >= 15 },
  { label: 'Charismatic Leader', test: (p, det, ldr) => ldr >= 18 && det >= 12 && p.temperament >= 10 },
  { label: 'Iron Willed', test: (p, det) => p.pressure >= 20 && det >= 10 },
  { label: 'Resilient', test: (p, det) => p.pressure >= 18 && det >= 10 },
  { label: 'Driven', test: (p, det) => det >= 20 && p.ambition >= 10 },
  { label: 'Spirited', test: (p, det) => det >= 18 && p.pressure >= 11 && p.ambition >= 11 },
  { label: 'Determined', test: (p, det) => det >= 18 },
  { label: 'Fairly Professional', test: p => p.professionalism >= 15 && p.temperament >= 10 },
  { label: 'Very Ambitious', test: p => p.ambition >= 18 && p.loyalty >= 7 },
  { label: 'Mercenary', test: p => p.ambition >= 15 && p.loyalty <= 4 },
  { label: 'Ambitious', test: p => p.ambition >= 15 },
  { label: 'Fairly Determined', test: (p, det) => det >= 15 },
  { label: 'Very Loyal', test: p => p.loyalty >= 18 },
  { label: 'Loyal', test: p => p.loyalty >= 15 },
  { label: 'Honest', test: p => p.sportsmanship >= 18 && p.controversy <= 5 },
  { label: 'Sporting', test: p => p.sportsmanship >= 15 },
  { label: 'Jovial', test: p => p.temperament >= 15 && p.pressure >= 12 && p.professionalism <= 9 },
  { label: 'Light-Hearted', test: p => p.temperament >= 15 && p.professionalism <= 11 },
  { label: 'Casual', test: p => p.professionalism <= 5 && p.ambition <= 9 },
  { label: 'Slack', test: p => p.professionalism <= 3 },
  { label: 'Spineless', test: (p, det) => det <= 3 },
  { label: 'Low Determination', test: (p, det) => det <= 6 },
  { label: 'Easily Discouraged', test: (p, det) => det <= 8 && p.pressure <= 8 },
  { label: 'Low Self-Belief', test: p => p.pressure <= 5 },
  { label: 'Unambitious', test: p => p.ambition <= 5 },
  { label: 'Temperamental', test: p => p.temperament <= 5 },
  { label: 'Unsporting', test: p => p.sportsmanship <= 4 },
  { label: 'Fickle', test: p => p.loyalty <= 4 },
  { label: 'Fairly Ambitious', test: p => p.ambition >= 12 },
  { label: 'Fairly Loyal', test: p => p.loyalty >= 12 },
  { label: 'Fairly Sporting', test: p => p.sportsmanship >= 12 },
];

export const PERSONALITY_TYPES: string[] = [...RULES.map(r => r.label), 'Balanced'];

export function personalityLabel(p: P, determination: number, leadership = 0): string {
  for (const r of RULES) if (r.test(p, determination, leadership)) return r.label;
  return 'Balanced';
}

/** Media handling style is not stored in a way we can read reliably yet; only the personality label is derived. */
