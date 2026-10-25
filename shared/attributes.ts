// Attribute, position and personality metadata shared by the server and the web UI.

export const TECHNICAL = [
  'corners', 'crossing', 'dribbling', 'finishing', 'firstTouch', 'freeKicks', 'heading',
  'longShots', 'longThrows', 'marking', 'passing', 'penaltyTaking', 'tackling', 'technique',
] as const;
export const MENTAL = [
  'aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions',
  'determination', 'flair', 'leadership', 'offTheBall', 'positioning', 'teamwork', 'vision', 'workRate',
] as const;
export const PHYSICAL = [
  'acceleration', 'agility', 'balance', 'jumpingReach', 'naturalFitness', 'pace', 'stamina', 'strength',
] as const;
export const GOALKEEPING = [
  'aerialReach', 'commandOfArea', 'communication', 'eccentricity', 'handling', 'kicking',
  'oneOnOnes', 'punching', 'reflexes', 'rushingOut', 'throwing',
] as const;
export const HIDDEN = [
  'consistency', 'dirtiness', 'importantMatches', 'injuryProneness', 'versatility', 'leftFoot', 'rightFoot',
] as const;

export type TechnicalKey = typeof TECHNICAL[number];
export type MentalKey = typeof MENTAL[number];
export type PhysicalKey = typeof PHYSICAL[number];
export type GoalkeepingKey = typeof GOALKEEPING[number];
export type HiddenKey = typeof HIDDEN[number];
export type PlayerAttrKey = TechnicalKey | MentalKey | PhysicalKey | GoalkeepingKey | HiddenKey;

export const PLAYER_ATTRS: readonly PlayerAttrKey[] = [...TECHNICAL, ...MENTAL, ...PHYSICAL, ...GOALKEEPING, ...HIDDEN];

export const ATTR_LABELS: Record<PlayerAttrKey, string> = {
  corners: 'Corners', crossing: 'Crossing', dribbling: 'Dribbling', finishing: 'Finishing',
  firstTouch: 'First Touch', freeKicks: 'Free Kick Taking', heading: 'Heading', longShots: 'Long Shots',
  longThrows: 'Long Throws', marking: 'Marking', passing: 'Passing', penaltyTaking: 'Penalty Taking',
  tackling: 'Tackling', technique: 'Technique',
  aggression: 'Aggression', anticipation: 'Anticipation', bravery: 'Bravery', composure: 'Composure',
  concentration: 'Concentration', decisions: 'Decisions', determination: 'Determination', flair: 'Flair',
  leadership: 'Leadership', offTheBall: 'Off The Ball', positioning: 'Positioning', teamwork: 'Teamwork',
  vision: 'Vision', workRate: 'Work Rate',
  acceleration: 'Acceleration', agility: 'Agility', balance: 'Balance', jumpingReach: 'Jumping Reach',
  naturalFitness: 'Natural Fitness', pace: 'Pace', stamina: 'Stamina', strength: 'Strength',
  aerialReach: 'Aerial Reach', commandOfArea: 'Command Of Area', communication: 'Communication',
  eccentricity: 'Eccentricity', handling: 'Handling', kicking: 'Kicking', oneOnOnes: 'One On Ones',
  punching: 'Punching (Tendency)', reflexes: 'Reflexes', rushingOut: 'Rushing Out (Tendency)', throwing: 'Throwing',
  consistency: 'Consistency', dirtiness: 'Dirtiness', importantMatches: 'Important Matches',
  injuryProneness: 'Injury Proneness', versatility: 'Versatility', leftFoot: 'Left Foot', rightFoot: 'Right Foot',
};

/** Short column headers (FM style). */
export const ATTR_SHORT: Record<PlayerAttrKey, string> = {
  corners: 'Cor', crossing: 'Cro', dribbling: 'Dri', finishing: 'Fin', firstTouch: 'Fir', freeKicks: 'Fre',
  heading: 'Hea', longShots: 'Lon', longThrows: 'L Th', marking: 'Mar', passing: 'Pas', penaltyTaking: 'Pen',
  tackling: 'Tck', technique: 'Tec', aggression: 'Agg', anticipation: 'Ant', bravery: 'Bra', composure: 'Cmp',
  concentration: 'Cnt', decisions: 'Dec', determination: 'Det', flair: 'Fla', leadership: 'Ldr', offTheBall: 'OtB',
  positioning: 'Pos', teamwork: 'Tea', vision: 'Vis', workRate: 'Wor', acceleration: 'Acc', agility: 'Agi',
  balance: 'Bal', jumpingReach: 'Jum', naturalFitness: 'Nat', pace: 'Pac', stamina: 'Sta', strength: 'Str',
  aerialReach: 'Aer', commandOfArea: 'Cmd', communication: 'Com', eccentricity: 'Ecc', handling: 'Han',
  kicking: 'Kic', oneOnOnes: '1v1', punching: 'Pun', reflexes: 'Ref', rushingOut: 'TRO', throwing: 'Thr',
  consistency: 'Cons', dirtiness: 'Dirt', importantMatches: 'ImpM', injuryProneness: 'InjPr', versatility: 'Vers',
  leftFoot: 'L Ft', rightFoot: 'R Ft',
};

export const PERSONALITY = [
  'adaptability', 'ambition', 'loyalty', 'pressure', 'professionalism', 'sportsmanship', 'temperament', 'controversy',
] as const;
export type PersonalityKey = typeof PERSONALITY[number];
export const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  adaptability: 'Adaptability', ambition: 'Ambition', loyalty: 'Loyalty', pressure: 'Pressure',
  professionalism: 'Professionalism', sportsmanship: 'Sportsmanship', temperament: 'Temperament', controversy: 'Controversy',
};

// FM's internal position order (the 15-byte familiarity array).
export const POSITIONS = ['GK', 'SW', 'DL', 'DC', 'DR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST', 'WBL', 'WBR'] as const;
export type PositionKey = typeof POSITIONS[number];
export const POSITION_LABELS: Record<PositionKey, string> = {
  GK: 'Goalkeeper', SW: 'Sweeper', DL: 'Defender (Left)', DC: 'Defender (Centre)', DR: 'Defender (Right)',
  DM: 'Defensive Midfielder', ML: 'Midfielder (Left)', MC: 'Midfielder (Centre)', MR: 'Midfielder (Right)',
  AML: 'Attacking Midfielder (Left)', AMC: 'Attacking Midfielder (Centre)', AMR: 'Attacking Midfielder (Right)',
  ST: 'Striker', WBL: 'Wing-Back (Left)', WBR: 'Wing-Back (Right)',
};
/** Pitch coordinates (0..100, x = left→right, y = own goal→opponent goal) for drawing a position map. */
export const POSITION_PITCH: Record<PositionKey, { x: number; y: number }> = {
  GK: { x: 50, y: 5 }, SW: { x: 50, y: 14 }, DL: { x: 12, y: 22 }, DC: { x: 50, y: 22 }, DR: { x: 88, y: 22 },
  WBL: { x: 10, y: 38 }, DM: { x: 50, y: 38 }, WBR: { x: 90, y: 38 }, ML: { x: 12, y: 55 }, MC: { x: 50, y: 55 },
  MR: { x: 88, y: 55 }, AML: { x: 14, y: 72 }, AMC: { x: 50, y: 72 }, AMR: { x: 86, y: 72 }, ST: { x: 50, y: 88 },
};

/** Familiarity thresholds used by FM's position colouring. */
export const FAMILIARITY = { natural: 18, accomplished: 15, competent: 12, unconvincing: 9, awkward: 5 } as const;

export function familiarityLabel(v: number): string {
  if (v >= FAMILIARITY.natural) return 'Natural';
  if (v >= FAMILIARITY.accomplished) return 'Accomplished';
  if (v >= FAMILIARITY.competent) return 'Competent';
  if (v >= FAMILIARITY.unconvincing) return 'Unconvincing';
  if (v >= FAMILIARITY.awkward) return 'Awkward';
  return 'Ineffectual';
}

/** "D (RC), DM, AM (C)" style summary of positions at or above `min` familiarity. */
export function positionSummary(pos: Partial<Record<PositionKey, number>>, min: number = FAMILIARITY.accomplished): string {
  const has = (k: PositionKey) => (pos[k] ?? 0) >= min;
  const parts: string[] = [];
  if (has('GK')) parts.push('GK');
  if (has('SW')) parts.push('SW');
  const sided = (prefix: string, l: PositionKey, c: PositionKey | null, r: PositionKey) => {
    const s = `${has(r) ? 'R' : ''}${has(l) ? 'L' : ''}${c && has(c) ? 'C' : ''}`;
    if (s) parts.push(`${prefix} (${s})`);
  };
  sided('D', 'DL', 'DC', 'DR');
  sided('WB', 'WBL', null, 'WBR');
  if (has('DM')) parts.push('DM');
  sided('M', 'ML', 'MC', 'MR');
  sided('AM', 'AML', 'AMC', 'AMR');
  if (has('ST')) parts.push('ST');
  return parts.join(', ');
}

// ---------------------------------------------------------------- staff

export const STAFF_COACHING = [
  'attacking', 'defending', 'fitness', 'gkDistribution', 'gkHandling', 'gkShotStopping',
  'mentalCoaching', 'tactical', 'technical', 'workingWithYoungsters',
] as const;
export const STAFF_MENTAL = ['adaptability', 'determination', 'levelOfDiscipline', 'manManagement', 'motivating'] as const;
export const STAFF_KNOWLEDGE = [
  'judgingPlayerAbility', 'judgingPlayerPotential', 'judgingStaffAbility', 'negotiating', 'tacticalKnowledge',
] as const;
export const STAFF_MEDICAL = ['physiotherapy', 'sportsScience'] as const;
export const STAFF_DATA = ['analysingData'] as const;
export const STAFF_HIDDEN = ['business', 'interference', 'patience', 'resources'] as const;

export type StaffAttrKey =
  | typeof STAFF_COACHING[number] | typeof STAFF_MENTAL[number] | typeof STAFF_KNOWLEDGE[number]
  | typeof STAFF_MEDICAL[number] | typeof STAFF_DATA[number] | typeof STAFF_HIDDEN[number];

export const STAFF_ATTRS: readonly StaffAttrKey[] = [
  ...STAFF_COACHING, ...STAFF_MENTAL, ...STAFF_KNOWLEDGE, ...STAFF_MEDICAL, ...STAFF_DATA, ...STAFF_HIDDEN,
];

export const STAFF_ATTR_LABELS: Record<StaffAttrKey, string> = {
  attacking: 'Attacking', defending: 'Defending', fitness: 'Fitness', gkDistribution: 'GK Distribution',
  gkHandling: 'GK Handling', gkShotStopping: 'GK Shot Stopping', mentalCoaching: 'Mental', tactical: 'Tactical',
  technical: 'Technical', workingWithYoungsters: 'Working With Youngsters',
  adaptability: 'Adaptability', determination: 'Determination', levelOfDiscipline: 'Level Of Discipline',
  manManagement: 'Man Management', motivating: 'Motivating',
  judgingPlayerAbility: 'Judging Player Ability', judgingPlayerPotential: 'Judging Player Potential',
  judgingStaffAbility: 'Judging Staff Ability', negotiating: 'Negotiating', tacticalKnowledge: 'Tactical Knowledge',
  physiotherapy: 'Physiotherapy', sportsScience: 'Sports Science', analysingData: 'Analysing Data',
  business: 'Business', interference: 'Interference', patience: 'Patience', resources: 'Resources',
};

/**
 * Staff attribute byte offsets were reverse-engineered statistically (job groups + known managers).
 * Ones not yet confirmed against Genie Scout / FM are listed here so the UI can mark them.
 */
export const STAFF_UNVERIFIED: readonly StaffAttrKey[] = [
  'gkDistribution', 'gkHandling', 'gkShotStopping', 'mentalCoaching', 'judgingStaffAbility', 'negotiating',
  'levelOfDiscipline', 'adaptability', 'business', 'interference', 'patience', 'resources',
];
