// Staff role suitability ratings and coaching star estimates.
import type { StaffAttrKey } from './attributes.ts';

export interface StaffRoleDef {
  id: string;
  name: string;
  /** attribute -> weight */
  weights: Partial<Record<StaffAttrKey, number>>;
}

export const STAFF_ROLES: StaffRoleDef[] = [
  { id: 'manager', name: 'Manager / Head Coach', weights: { tacticalKnowledge: 4, manManagement: 3, motivating: 3, determination: 2, judgingPlayerAbility: 2, judgingPlayerPotential: 1, levelOfDiscipline: 1, adaptability: 1, attacking: 1, defending: 1, tactical: 1 } },
  { id: 'assistant', name: 'Assistant Manager', weights: { judgingPlayerAbility: 3, judgingPlayerPotential: 2, tacticalKnowledge: 3, manManagement: 2, motivating: 2, attacking: 1, defending: 1, mentalCoaching: 1, tactical: 1, technical: 1 } },
  { id: 'coach', name: 'Coach (general)', weights: { attacking: 2, defending: 2, tactical: 2, technical: 2, mentalCoaching: 2, fitness: 1, determination: 1, levelOfDiscipline: 1, motivating: 1 } },
  { id: 'gkcoach', name: 'Goalkeeping Coach', weights: { gkShotStopping: 3, gkHandling: 3, gkDistribution: 2, determination: 1, levelOfDiscipline: 1, motivating: 1 } },
  { id: 'fitness', name: 'Fitness Coach', weights: { fitness: 4, sportsScience: 1, determination: 1, levelOfDiscipline: 1, motivating: 1 } },
  { id: 'scout', name: 'Scout', weights: { judgingPlayerAbility: 4, judgingPlayerPotential: 4, adaptability: 1, determination: 1, tacticalKnowledge: 1 } },
  { id: 'recruit', name: 'Recruitment Analyst', weights: { analysingData: 4, judgingPlayerAbility: 2, judgingPlayerPotential: 2 } },
  { id: 'perf', name: 'Performance Analyst', weights: { analysingData: 4, tacticalKnowledge: 3 } },
  { id: 'physio', name: 'Physio', weights: { physiotherapy: 4, sportsScience: 1 } },
  { id: 'sportsci', name: 'Sports Scientist', weights: { sportsScience: 4, physiotherapy: 1, fitness: 1 } },
  { id: 'dof', name: 'Director of Football', weights: { judgingPlayerAbility: 3, judgingPlayerPotential: 3, judgingStaffAbility: 3, negotiating: 3, determination: 1, adaptability: 1 } },
  { id: 'td', name: 'Technical Director', weights: { judgingStaffAbility: 3, workingWithYoungsters: 2, judgingPlayerPotential: 2, judgingPlayerAbility: 2, tacticalKnowledge: 2 } },
  { id: 'hoyd', name: 'Head of Youth Development', weights: { workingWithYoungsters: 4, judgingPlayerPotential: 3, judgingStaffAbility: 2, determination: 1, levelOfDiscipline: 1, motivating: 1 } },
  { id: 'youth', name: 'Youth Coach', weights: { workingWithYoungsters: 4, technical: 2, mentalCoaching: 2, tactical: 1, attacking: 1, defending: 1, motivating: 1 } },
  { id: 'loan', name: 'Loan Manager', weights: { judgingPlayerAbility: 2, judgingPlayerPotential: 2, negotiating: 2, manManagement: 2 } },
];

export const STAFF_ROLE_BY_ID: Record<string, StaffRoleDef> = Object.fromEntries(STAFF_ROLES.map(r => [r.id, r]));

export function staffRoleRating(attrs: Record<StaffAttrKey, number>, role: StaffRoleDef): number {
  let sum = 0, max = 0;
  for (const [k, w] of Object.entries(role.weights) as [StaffAttrKey, number][]) {
    sum += (attrs[k] ?? 0) * w;
    max += 20 * w;
  }
  return max ? Math.round((sum / max) * 1000) / 10 : 0;
}

export function staffRatings(attrs: Record<StaffAttrKey, number>): { ratings: Record<string, number>; best: { id: string; rating: number } } {
  const ratings: Record<string, number> = {};
  let best = { id: STAFF_ROLES[0].id, rating: -1 };
  for (const r of STAFF_ROLES) {
    const v = staffRoleRating(attrs, r);
    ratings[r.id] = v;
    if (v > best.rating) best = { id: r.id, rating: v };
  }
  return { ratings, best };
}

// FM24 training categories: (primary, secondary) coaching attributes. Stars are an approximation of FM's formula:
// score = (3*primary + 2*secondary + determination + discipline + motivating) / 8, mapped 1..20 -> 0..5 stars.
export const TRAINING_CATEGORIES: { id: string; name: string; primary: StaffAttrKey; secondary: StaffAttrKey }[] = [
  { id: 'gkShot', name: 'GK Shot Stopping', primary: 'gkShotStopping', secondary: 'gkHandling' },
  { id: 'gkHandling', name: 'GK Handling & Distribution', primary: 'gkHandling', secondary: 'gkDistribution' },
  { id: 'defTac', name: 'Defending Tactical', primary: 'defending', secondary: 'tactical' },
  { id: 'defTec', name: 'Defending Technical', primary: 'defending', secondary: 'technical' },
  { id: 'posTac', name: 'Possession Tactical', primary: 'mentalCoaching', secondary: 'tactical' },
  { id: 'posTec', name: 'Possession Technical', primary: 'mentalCoaching', secondary: 'technical' },
  { id: 'attTac', name: 'Attacking Tactical', primary: 'attacking', secondary: 'tactical' },
  { id: 'attTec', name: 'Attacking Technical', primary: 'attacking', secondary: 'technical' },
  { id: 'fitStr', name: 'Fitness Strength', primary: 'fitness', secondary: 'sportsScience' },
  { id: 'fitQck', name: 'Fitness Quickness', primary: 'fitness', secondary: 'sportsScience' },
  { id: 'setPieces', name: 'Set Pieces', primary: 'tactical', secondary: 'technical' },
];

export function coachingStars(a: Record<StaffAttrKey, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of TRAINING_CATEGORIES) {
    const score = (3 * a[c.primary] + 2 * a[c.secondary] + a.determination + a.levelOfDiscipline + a.motivating) / 8;
    out[c.id] = Math.max(0, Math.min(5, Math.round((score / 4) * 2) / 2));
  }
  return out;
}

/** FM job codes (contract byte) mapped from staff attribute profiles; unknown codes show as "Staff (#n)". */
export const JOB_NAMES: Record<number, string> = {
  1: 'Player / Staff', 2: 'Coach', 4: 'Chairman', 6: 'Director', 8: 'Managing Director', 10: 'Director of Football', 12: 'Physio',
  14: 'Scout', 16: 'Manager', 20: 'Assistant Manager', 22: 'Youth Coach', 26: 'Fitness Coach', 34: 'Goalkeeping Coach',
  40: 'Head of Sports Science', 44: 'Chief Scout', 46: 'Head Physio', 48: 'Sports Scientist', 50: 'Physio',
  58: 'Recruitment Analyst', 60: 'Recruitment Analyst', 62: 'Head of Performance Analysis', 64: 'Technical Director',
  66: 'Media Pundit', 70: 'President', 86: 'Loan Manager', 88: 'Head of Youth Development',
};

/** Board-level jobs: FM stores filler coaching values for them, so role ratings are meaningless. */
export const BOARD_JOBS: ReadonlySet<number> = new Set([4, 6, 8, 70]);

export function jobName(code: number): string {
  if (code < 0) return 'Unemployed';
  return JOB_NAMES[code] ?? `Staff (#${code})`;
}
