// Rating maths shared by server and UI: role ratings, position ratings, projected attributes, scouting report.
import { PLAYER_ATTRS, POSITIONS, positionSummary, ATTR_LABELS, PHYSICAL, type PlayerAttrKey, type PositionKey } from './attributes.ts';
import { ROLES, ROLE_BY_ID, roleLabel, type RoleDef } from './roles.ts';
import type { Player, PlayerDetail, RoleRating, Settings } from './types.ts';

export interface RatingConfig {
  weights: { key: number; preferred: number };
  overrides: Settings['roleOverrides'];
}

export const DEFAULT_RATING_CONFIG: RatingConfig = { weights: { key: 2, preferred: 1 }, overrides: {} };

type Attrs = Record<PlayerAttrKey, number>;

export function effectiveRole(role: RoleDef, cfg: RatingConfig): RoleDef {
  const o = cfg.overrides[role.id];
  return o ? { ...role, key: o.key, preferred: o.preferred } : role;
}

/** 0..100: weighted average of the role's key and preferred attributes, where 20 = 100%. */
export function roleRating(attrs: Attrs, role: RoleDef, cfg: RatingConfig = DEFAULT_RATING_CONFIG): number {
  const r = effectiveRole(role, cfg);
  const wk = cfg.weights.key, wp = cfg.weights.preferred;
  let sum = 0, max = 0;
  for (const a of r.key) { sum += (attrs[a] ?? 0) * wk; max += 20 * wk; }
  for (const a of r.preferred) { sum += (attrs[a] ?? 0) * wp; max += 20 * wp; }
  return max ? Math.round((sum / max) * 1000) / 10 : 0;
}

export function roleRatingById(attrs: Attrs, roleId: string, cfg: RatingConfig = DEFAULT_RATING_CONFIG): number {
  const r = ROLE_BY_ID[roleId];
  return r ? roleRating(attrs, r, cfg) : 0;
}

/** All role ratings, best first. */
export function allRoleRatings(attrs: Attrs, cfg: RatingConfig = DEFAULT_RATING_CONFIG): RoleRating[] {
  return ROLES.map(r => ({ id: r.id, rating: roleRating(attrs, r, cfg) })).sort((a, b) => b.rating - a.rating);
}

/** Familiarity factor applied when ranking a player's realistic best role (natural = 1.0). */
export function familiarityFactor(fam: number): number {
  if (fam >= 18) return 1;
  if (fam >= 15) return 0.97;
  if (fam >= 12) return 0.9;
  if (fam >= 9) return 0.8;
  if (fam >= 5) return 0.65;
  return 0.5;
}

export interface ComputedRatings {
  positionText: string;
  bestPosition: PositionKey;
  bestRole: RoleRating;
  positionRatings: Partial<Record<PositionKey, number>>;
}

export function computeRatings(attrs: Attrs, positions: Record<PositionKey, number>, cfg: RatingConfig = DEFAULT_RATING_CONFIG): ComputedRatings {
  const positionRatings: Partial<Record<PositionKey, number>> = {};
  let bestRole: RoleRating = { id: ROLES[0].id, rating: 0 };
  let bestScore = -1;
  for (const r of ROLES) {
    const rating = roleRating(attrs, r, cfg);
    let fam = 0;
    for (const p of r.positions) {
      if ((positionRatings[p] ?? -1) < rating) positionRatings[p] = rating;
      fam = Math.max(fam, positions[p] ?? 0);
    }
    const score = rating * familiarityFactor(fam);
    if (score > bestScore) { bestScore = score; bestRole = { id: r.id, rating }; }
  }
  let bestPosition: PositionKey = 'GK';
  for (const p of POSITIONS) if ((positions[p] ?? 0) > (positions[bestPosition] ?? 0)) bestPosition = p;
  const positionText = positionSummary(positions) || positionSummary(positions, Math.max(...POSITIONS.map(p => positions[p] ?? 0)));
  return { positionText, bestPosition, bestRole, positionRatings };
}

/**
 * Rough estimate of attributes at potential: the CA→PA gap is spread over attributes in proportion to
 * how far each is from 20, with physical attributes growing less for players past their early twenties.
 */
export function projectAttributes(p: Pick<Player, 'attrs' | 'ca' | 'pa' | 'age'>): Attrs {
  const out = { ...p.attrs };
  if (p.pa <= p.ca || p.ca <= 0) return out;
  const growth = Math.min(1.5, (p.pa - p.ca) / p.ca);
  const physicalAgeFactor = p.age <= 21 ? 1 : p.age <= 24 ? 0.6 : p.age <= 27 ? 0.3 : 0.1;
  const technicalAgeFactor = p.age <= 24 ? 1 : p.age <= 28 ? 0.7 : 0.4;
  for (const k of PLAYER_ATTRS) {
    if (k === 'leftFoot' || k === 'rightFoot' || k === 'consistency' || k === 'dirtiness' || k === 'importantMatches' || k === 'injuryProneness' || k === 'versatility') continue;
    const v = p.attrs[k];
    if (!v) continue;
    const factor = (PHYSICAL as readonly string[]).includes(k) ? physicalAgeFactor : technicalAgeFactor;
    const room = 20 - v;
    out[k] = Math.min(20, Math.round(v + room * Math.min(1, growth * 1.4) * factor));
  }
  return out;
}

function topAttrs(attrs: Attrs, keys: readonly PlayerAttrKey[], n: number, best: boolean): PlayerAttrKey[] {
  return [...keys].filter(k => attrs[k] > 0).sort((a, b) => best ? attrs[b] - attrs[a] : attrs[a] - attrs[b]).slice(0, n);
}

/** A short Genie-style scouting report. */
export function scoutingReport(p: Player, roles: RoleRating[]): string[] {
  const out: string[] = [];
  const role = ROLE_BY_ID[roles[0]?.id];
  out.push(`${p.name} (${p.age}) is a ${p.personalityLabel.toLowerCase() || 'balanced'} ${p.positionText || p.bestPosition} ` +
    `${p.club ? `at ${p.club}` : 'without a club'}, with current ability ${p.ca} and potential ${p.pa}.`);
  const gap = p.pa - p.ca;
  if (gap >= 30) out.push(`Plenty of room to grow: ${gap} points between current and potential ability.`);
  else if (gap >= 10) out.push(`Still developing, with ${gap} points of potential left to reach.`);
  else out.push('Close to his ceiling; what you see is largely what you get.');
  if (role) out.push(`Best suited as a ${roleLabel(role)} (${roles[0].rating.toFixed(0)}%)` +
    (roles[1] ? `, also ${roleLabel(ROLE_BY_ID[roles[1].id])} (${roles[1].rating.toFixed(0)}%).` : '.'));
  const outfield = PLAYER_ATTRS.filter(k => !['aerialReach', 'commandOfArea', 'communication', 'eccentricity', 'handling', 'kicking', 'oneOnOnes', 'punching', 'reflexes', 'rushingOut', 'throwing', 'leftFoot', 'rightFoot', 'consistency', 'dirtiness', 'importantMatches', 'injuryProneness', 'versatility'].includes(k));
  const keys = p.bestPosition === 'GK' ? PLAYER_ATTRS.filter(k => !['leftFoot', 'rightFoot', 'consistency', 'dirtiness', 'importantMatches', 'injuryProneness', 'versatility'].includes(k)) : outfield;
  out.push(`Strengths: ${topAttrs(p.attrs, keys, 4, true).map(k => `${ATTR_LABELS[k]} ${p.attrs[k]}`).join(', ')}.`);
  out.push(`Weaknesses: ${topAttrs(p.attrs, keys, 3, false).map(k => `${ATTR_LABELS[k]} ${p.attrs[k]}`).join(', ')}.`);
  const hidden: string[] = [];
  if (p.attrs.consistency <= 8) hidden.push('inconsistent');
  if (p.attrs.consistency >= 16) hidden.push('very consistent');
  if (p.attrs.importantMatches >= 16) hidden.push('a big-game player');
  if (p.attrs.importantMatches <= 7) hidden.push('can freeze in big games');
  if (p.attrs.injuryProneness >= 14) hidden.push('injury prone');
  if (p.attrs.injuryProneness <= 5) hidden.push('rarely injured');
  if (p.attrs.dirtiness >= 15) hidden.push('a dirty player');
  if (hidden.length) out.push(`Hidden traits: ${hidden.join(', ')}.`);
  const weak = Math.min(p.attrs.leftFoot, p.attrs.rightFoot);
  const strongFoot = p.attrs.leftFoot > p.attrs.rightFoot ? 'left' : 'right';
  out.push(weak >= 15 ? 'Comfortable on both feet.' : `Prefers his ${strongFoot} foot (weaker foot ${weak}).`);
  if (p.contract?.transferListed) out.push('Currently transfer listed.');
  if (p.contract?.releaseClauses.length) out.push(`Has ${p.contract.releaseClauses.length} release clause(s) in his contract.`);
  return out;
}

export function toPlayerDetail(p: Player, cfg: RatingConfig = DEFAULT_RATING_CONFIG): PlayerDetail {
  const roleRatings = allRoleRatings(p.attrs, cfg);
  return { ...p, roleRatings, projected: projectAttributes(p), report: scoutingReport(p, roleRatings) };
}

export function ratingConfigFromSettings(s: Pick<Settings, 'ratingWeights' | 'roleOverrides'>): RatingConfig {
  return { weights: s.ratingWeights, overrides: s.roleOverrides };
}
