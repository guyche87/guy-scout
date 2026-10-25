// FM24 player roles with their key (highlighted) and preferred attributes, plus the positions they apply to.
// Attribute lists follow FM's in-game role descriptions as closely as practical; users can override them in Settings.
import type { PlayerAttrKey, PositionKey } from './attributes.ts';

export type Duty = 'D' | 'S' | 'A' | 'St' | 'C' | 'Au';

export interface RoleDef {
  /** e.g. "AF-A" */
  id: string;
  name: string;
  duty: Duty;
  positions: PositionKey[];
  key: PlayerAttrKey[];
  preferred: PlayerAttrKey[];
}

export const DUTY_LABELS: Record<Duty, string> = {
  D: 'Defend', S: 'Support', A: 'Attack', St: 'Stopper', C: 'Cover', Au: 'Automatic',
};

const GK: PositionKey[] = ['GK'];
const DC: PositionKey[] = ['DC'];
const FB: PositionKey[] = ['DL', 'DR'];
const WB: PositionKey[] = ['WBL', 'WBR', 'DL', 'DR'];
const DM: PositionKey[] = ['DM'];
const MC: PositionKey[] = ['MC'];
const DMMC: PositionKey[] = ['DM', 'MC'];
const WIDE: PositionKey[] = ['ML', 'MR'];
const WIDE_AM: PositionKey[] = ['AML', 'AMR'];
const WIDE_ALL: PositionKey[] = ['ML', 'MR', 'AML', 'AMR'];
const AMC: PositionKey[] = ['AMC'];
const ST: PositionKey[] = ['ST'];

type A = PlayerAttrKey;
function role(id: string, name: string, duty: Duty, positions: PositionKey[], key: A[], preferred: A[]): RoleDef {
  return { id, name, duty, positions, key, preferred };
}

export const ROLES: RoleDef[] = [
  // Goalkeepers
  role('GK-D', 'Goalkeeper', 'D', GK,
    ['aerialReach', 'commandOfArea', 'communication', 'handling', 'kicking', 'reflexes', 'concentration', 'positioning', 'agility'],
    ['oneOnOnes', 'throwing', 'anticipation', 'decisions']),
  role('SK-D', 'Sweeper Keeper', 'D', GK,
    ['commandOfArea', 'kicking', 'oneOnOnes', 'reflexes', 'anticipation', 'concentration', 'positioning', 'agility'],
    ['aerialReach', 'communication', 'firstTouch', 'handling', 'passing', 'rushingOut', 'throwing', 'composure', 'decisions', 'vision', 'acceleration']),
  role('SK-S', 'Sweeper Keeper', 'S', GK,
    ['commandOfArea', 'kicking', 'oneOnOnes', 'reflexes', 'rushingOut', 'anticipation', 'composure', 'concentration', 'positioning', 'agility'],
    ['aerialReach', 'communication', 'firstTouch', 'handling', 'passing', 'throwing', 'decisions', 'vision', 'acceleration']),
  role('SK-A', 'Sweeper Keeper', 'A', GK,
    ['commandOfArea', 'kicking', 'oneOnOnes', 'reflexes', 'rushingOut', 'anticipation', 'composure', 'concentration', 'positioning', 'agility'],
    ['aerialReach', 'communication', 'eccentricity', 'firstTouch', 'handling', 'passing', 'throwing', 'decisions', 'vision', 'acceleration']),

  // Central defenders
  role('CD-D', 'Central Defender', 'D', DC,
    ['heading', 'marking', 'tackling', 'positioning', 'jumpingReach', 'strength'],
    ['aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'pace']),
  role('CD-St', 'Central Defender', 'St', DC,
    ['heading', 'tackling', 'aggression', 'bravery', 'decisions', 'jumpingReach', 'strength'],
    ['marking', 'anticipation', 'composure', 'concentration', 'positioning']),
  role('CD-C', 'Central Defender', 'C', DC,
    ['marking', 'tackling', 'anticipation', 'concentration', 'decisions', 'positioning', 'pace'],
    ['heading', 'bravery', 'composure', 'jumpingReach', 'strength']),
  role('BPD-D', 'Ball Playing Defender', 'D', DC,
    ['heading', 'marking', 'passing', 'tackling', 'composure', 'positioning', 'jumpingReach', 'strength'],
    ['firstTouch', 'technique', 'aggression', 'anticipation', 'bravery', 'concentration', 'decisions', 'vision', 'pace']),
  role('BPD-St', 'Ball Playing Defender', 'St', DC,
    ['heading', 'passing', 'tackling', 'aggression', 'bravery', 'composure', 'decisions', 'jumpingReach', 'strength'],
    ['firstTouch', 'marking', 'technique', 'anticipation', 'concentration', 'positioning', 'vision']),
  role('BPD-C', 'Ball Playing Defender', 'C', DC,
    ['marking', 'passing', 'tackling', 'anticipation', 'composure', 'concentration', 'decisions', 'positioning', 'pace'],
    ['firstTouch', 'heading', 'technique', 'bravery', 'vision', 'jumpingReach', 'strength']),
  role('NCB-D', 'No-Nonsense Centre-Back', 'D', DC,
    ['heading', 'marking', 'tackling', 'positioning', 'jumpingReach', 'strength'],
    ['aggression', 'anticipation', 'bravery', 'concentration']),
  role('WCB-D', 'Wide Centre-Back', 'D', DC,
    ['heading', 'marking', 'tackling', 'positioning', 'jumpingReach', 'strength'],
    ['dribbling', 'passing', 'technique', 'aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'pace', 'agility']),
  role('WCB-S', 'Wide Centre-Back', 'S', DC,
    ['dribbling', 'heading', 'marking', 'tackling', 'positioning', 'jumpingReach', 'pace', 'strength'],
    ['crossing', 'passing', 'technique', 'aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'offTheBall', 'agility', 'stamina']),
  role('WCB-A', 'Wide Centre-Back', 'A', DC,
    ['crossing', 'dribbling', 'heading', 'marking', 'tackling', 'offTheBall', 'positioning', 'jumpingReach', 'pace', 'stamina', 'strength'],
    ['firstTouch', 'passing', 'technique', 'aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'workRate', 'agility']),
  role('L-S', 'Libero', 'S', DC,
    ['firstTouch', 'heading', 'marking', 'passing', 'tackling', 'technique', 'composure', 'decisions', 'positioning', 'teamwork', 'jumpingReach', 'strength'],
    ['anticipation', 'bravery', 'concentration', 'pace', 'stamina']),
  role('L-A', 'Libero', 'A', DC,
    ['dribbling', 'firstTouch', 'heading', 'marking', 'passing', 'tackling', 'technique', 'composure', 'decisions', 'positioning', 'teamwork', 'jumpingReach', 'strength'],
    ['anticipation', 'bravery', 'concentration', 'vision', 'pace', 'stamina']),

  // Full-backs & wing-backs
  role('FB-D', 'Full-Back', 'D', FB,
    ['marking', 'tackling', 'anticipation', 'concentration', 'positioning'],
    ['crossing', 'passing', 'decisions', 'teamwork', 'pace', 'stamina']),
  role('FB-S', 'Full-Back', 'S', FB,
    ['marking', 'tackling', 'anticipation', 'concentration', 'positioning', 'teamwork'],
    ['crossing', 'dribbling', 'passing', 'technique', 'decisions', 'pace', 'stamina', 'workRate']),
  role('FB-A', 'Full-Back', 'A', FB,
    ['crossing', 'marking', 'tackling', 'anticipation', 'positioning', 'teamwork'],
    ['dribbling', 'firstTouch', 'passing', 'technique', 'concentration', 'decisions', 'offTheBall', 'agility', 'pace', 'stamina', 'workRate']),
  role('NFB-D', 'No-Nonsense Full-Back', 'D', FB,
    ['marking', 'tackling', 'anticipation', 'positioning', 'strength'],
    ['heading', 'aggression', 'bravery', 'concentration', 'teamwork']),
  role('IFB-D', 'Inverted Full-Back', 'D', FB,
    ['heading', 'marking', 'passing', 'tackling', 'positioning', 'strength'],
    ['firstTouch', 'technique', 'aggression', 'anticipation', 'bravery', 'composure', 'concentration', 'decisions', 'jumpingReach', 'pace']),
  role('WB-D', 'Wing-Back', 'D', WB,
    ['marking', 'tackling', 'anticipation', 'positioning', 'teamwork', 'acceleration', 'stamina', 'workRate'],
    ['crossing', 'dribbling', 'passing', 'technique', 'concentration', 'decisions', 'offTheBall', 'agility', 'balance', 'pace']),
  role('WB-S', 'Wing-Back', 'S', WB,
    ['crossing', 'dribbling', 'marking', 'tackling', 'teamwork', 'workRate', 'acceleration', 'stamina'],
    ['firstTouch', 'passing', 'technique', 'anticipation', 'concentration', 'decisions', 'offTheBall', 'positioning', 'agility', 'balance', 'pace']),
  role('WB-A', 'Wing-Back', 'A', WB,
    ['crossing', 'dribbling', 'tackling', 'technique', 'offTheBall', 'teamwork', 'workRate', 'acceleration', 'pace', 'stamina'],
    ['firstTouch', 'marking', 'passing', 'anticipation', 'concentration', 'decisions', 'flair', 'positioning', 'agility', 'balance']),
  role('CWB-S', 'Complete Wing-Back', 'S', WB,
    ['crossing', 'dribbling', 'technique', 'offTheBall', 'teamwork', 'workRate', 'acceleration', 'stamina'],
    ['firstTouch', 'marking', 'passing', 'tackling', 'anticipation', 'decisions', 'flair', 'positioning', 'agility', 'balance', 'pace']),
  role('CWB-A', 'Complete Wing-Back', 'A', WB,
    ['crossing', 'dribbling', 'technique', 'flair', 'offTheBall', 'teamwork', 'workRate', 'acceleration', 'stamina'],
    ['firstTouch', 'marking', 'passing', 'tackling', 'anticipation', 'decisions', 'positioning', 'agility', 'balance', 'pace']),
  role('IWB-D', 'Inverted Wing-Back', 'D', WB,
    ['passing', 'tackling', 'anticipation', 'decisions', 'positioning', 'teamwork'],
    ['firstTouch', 'marking', 'technique', 'composure', 'concentration', 'workRate', 'acceleration', 'agility', 'stamina']),
  role('IWB-S', 'Inverted Wing-Back', 'S', WB,
    ['passing', 'tackling', 'composure', 'decisions', 'teamwork'],
    ['firstTouch', 'marking', 'technique', 'anticipation', 'concentration', 'offTheBall', 'positioning', 'vision', 'workRate', 'acceleration', 'agility', 'stamina']),
  role('IWB-A', 'Inverted Wing-Back', 'A', WB,
    ['firstTouch', 'passing', 'tackling', 'technique', 'composure', 'decisions', 'offTheBall', 'teamwork', 'vision', 'acceleration'],
    ['crossing', 'dribbling', 'longShots', 'marking', 'anticipation', 'concentration', 'flair', 'positioning', 'workRate', 'agility', 'stamina']),

  // Defensive midfield
  role('DM-D', 'Defensive Midfielder', 'D', DM,
    ['tackling', 'anticipation', 'concentration', 'positioning', 'teamwork'],
    ['marking', 'passing', 'aggression', 'composure', 'decisions', 'workRate', 'stamina', 'strength']),
  role('DM-S', 'Defensive Midfielder', 'S', DM,
    ['tackling', 'anticipation', 'concentration', 'positioning', 'teamwork'],
    ['firstTouch', 'marking', 'passing', 'aggression', 'composure', 'decisions', 'workRate', 'stamina', 'strength']),
  role('A-D', 'Anchor', 'D', DM,
    ['marking', 'tackling', 'anticipation', 'concentration', 'decisions', 'positioning'],
    ['composure', 'teamwork', 'strength']),
  role('HB-D', 'Half Back', 'D', DM,
    ['marking', 'tackling', 'anticipation', 'composure', 'concentration', 'decisions', 'positioning', 'teamwork'],
    ['firstTouch', 'passing', 'aggression', 'bravery', 'workRate', 'jumpingReach', 'stamina', 'strength']),
  role('DLP-D', 'Deep Lying Playmaker', 'D', DMMC,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'teamwork', 'vision'],
    ['tackling', 'anticipation', 'positioning', 'balance']),
  role('DLP-S', 'Deep Lying Playmaker', 'S', DMMC,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'teamwork', 'vision'],
    ['anticipation', 'offTheBall', 'positioning', 'balance']),
  role('BWM-D', 'Ball Winning Midfielder', 'D', DMMC,
    ['tackling', 'aggression', 'anticipation', 'teamwork', 'workRate', 'stamina'],
    ['marking', 'bravery', 'concentration', 'positioning', 'agility', 'pace', 'strength']),
  role('BWM-S', 'Ball Winning Midfielder', 'S', DMMC,
    ['tackling', 'aggression', 'anticipation', 'teamwork', 'workRate', 'stamina'],
    ['marking', 'passing', 'bravery', 'agility', 'pace', 'strength']),
  role('RGA-S', 'Regista', 'S', DM,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'flair', 'offTheBall', 'teamwork', 'vision'],
    ['dribbling', 'longShots', 'anticipation', 'balance']),
  role('RPM-S', 'Roaming Playmaker', 'S', DMMC,
    ['firstTouch', 'passing', 'technique', 'anticipation', 'composure', 'decisions', 'offTheBall', 'teamwork', 'vision', 'workRate', 'acceleration', 'stamina'],
    ['dribbling', 'longShots', 'flair', 'positioning', 'agility', 'balance', 'pace']),
  role('SV-S', 'Segundo Volante', 'S', DM,
    ['marking', 'passing', 'tackling', 'offTheBall', 'positioning', 'workRate', 'pace', 'stamina'],
    ['finishing', 'firstTouch', 'longShots', 'anticipation', 'composure', 'concentration', 'decisions', 'acceleration', 'balance', 'strength']),
  role('SV-A', 'Segundo Volante', 'A', DM,
    ['finishing', 'longShots', 'passing', 'tackling', 'anticipation', 'offTheBall', 'positioning', 'workRate', 'pace', 'stamina'],
    ['firstTouch', 'marking', 'composure', 'concentration', 'decisions', 'acceleration', 'balance', 'strength']),

  // Central midfield
  role('CM-D', 'Central Midfielder', 'D', MC,
    ['tackling', 'concentration', 'decisions', 'positioning', 'teamwork'],
    ['firstTouch', 'marking', 'passing', 'technique', 'aggression', 'anticipation', 'composure', 'workRate', 'stamina']),
  role('CM-S', 'Central Midfielder', 'S', MC,
    ['firstTouch', 'passing', 'tackling', 'decisions', 'teamwork'],
    ['technique', 'anticipation', 'composure', 'concentration', 'offTheBall', 'vision', 'workRate', 'stamina']),
  role('CM-A', 'Central Midfielder', 'A', MC,
    ['firstTouch', 'passing', 'decisions', 'offTheBall'],
    ['longShots', 'tackling', 'technique', 'anticipation', 'composure', 'vision', 'workRate', 'acceleration', 'stamina']),
  role('B2B-S', 'Box To Box Midfielder', 'S', MC,
    ['passing', 'tackling', 'offTheBall', 'teamwork', 'workRate', 'stamina'],
    ['dribbling', 'finishing', 'firstTouch', 'longShots', 'technique', 'aggression', 'anticipation', 'composure', 'decisions', 'positioning', 'acceleration', 'balance', 'pace', 'strength']),
  role('MEZ-S', 'Mezzala', 'S', MC,
    ['passing', 'technique', 'decisions', 'offTheBall', 'workRate', 'acceleration'],
    ['dribbling', 'firstTouch', 'longShots', 'tackling', 'anticipation', 'composure', 'vision', 'balance', 'stamina']),
  role('MEZ-A', 'Mezzala', 'A', MC,
    ['dribbling', 'passing', 'technique', 'decisions', 'offTheBall', 'vision', 'workRate', 'acceleration'],
    ['finishing', 'firstTouch', 'longShots', 'anticipation', 'composure', 'flair', 'balance', 'stamina']),
  role('CAR-S', 'Carrilero', 'S', MC,
    ['firstTouch', 'passing', 'tackling', 'decisions', 'positioning', 'teamwork', 'stamina'],
    ['technique', 'anticipation', 'composure', 'concentration', 'offTheBall', 'vision', 'workRate']),
  role('AP-S', 'Advanced Playmaker', 'S', ['MC', 'AMC', 'AML', 'AMR'],
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'teamwork', 'vision'],
    ['dribbling', 'anticipation', 'flair', 'agility']),
  role('AP-A', 'Advanced Playmaker', 'A', ['MC', 'AMC', 'AML', 'AMR'],
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'teamwork', 'vision'],
    ['dribbling', 'anticipation', 'flair', 'acceleration', 'agility']),

  // Wide midfield / wide attack
  role('WM-D', 'Wide Midfielder', 'D', WIDE,
    ['passing', 'tackling', 'concentration', 'decisions', 'positioning', 'teamwork', 'workRate'],
    ['crossing', 'firstTouch', 'marking', 'technique', 'anticipation', 'composure', 'stamina']),
  role('WM-S', 'Wide Midfielder', 'S', WIDE,
    ['passing', 'tackling', 'decisions', 'teamwork', 'workRate', 'stamina'],
    ['crossing', 'firstTouch', 'technique', 'anticipation', 'composure', 'concentration', 'offTheBall', 'positioning', 'vision']),
  role('WM-A', 'Wide Midfielder', 'A', WIDE,
    ['crossing', 'firstTouch', 'passing', 'decisions', 'teamwork', 'workRate', 'stamina'],
    ['tackling', 'technique', 'anticipation', 'composure', 'offTheBall', 'vision']),
  role('W-S', 'Winger', 'S', WIDE_ALL,
    ['crossing', 'dribbling', 'technique', 'acceleration', 'agility'],
    ['firstTouch', 'passing', 'offTheBall', 'workRate', 'balance', 'pace', 'stamina']),
  role('W-A', 'Winger', 'A', WIDE_ALL,
    ['crossing', 'dribbling', 'technique', 'acceleration', 'agility'],
    ['firstTouch', 'passing', 'anticipation', 'flair', 'offTheBall', 'balance', 'pace', 'stamina', 'workRate']),
  role('DW-D', 'Defensive Winger', 'D', WIDE,
    ['technique', 'anticipation', 'offTheBall', 'positioning', 'teamwork', 'workRate', 'stamina'],
    ['crossing', 'dribbling', 'firstTouch', 'marking', 'tackling', 'aggression', 'concentration', 'decisions', 'acceleration']),
  role('DW-S', 'Defensive Winger', 'S', WIDE,
    ['crossing', 'technique', 'offTheBall', 'teamwork', 'workRate', 'stamina'],
    ['dribbling', 'firstTouch', 'marking', 'passing', 'tackling', 'aggression', 'anticipation', 'composure', 'concentration', 'decisions', 'positioning', 'acceleration']),
  role('WP-S', 'Wide Playmaker', 'S', WIDE_ALL,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'teamwork', 'vision'],
    ['dribbling', 'offTheBall', 'agility']),
  role('WP-A', 'Wide Playmaker', 'A', WIDE_ALL,
    ['dribbling', 'firstTouch', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'teamwork', 'vision'],
    ['anticipation', 'flair', 'acceleration', 'agility']),
  role('IW-S', 'Inverted Winger', 'S', WIDE_ALL,
    ['crossing', 'dribbling', 'passing', 'technique', 'composure', 'decisions', 'vision', 'acceleration', 'agility'],
    ['firstTouch', 'longShots', 'anticipation', 'flair', 'offTheBall', 'workRate', 'balance', 'pace', 'stamina']),
  role('IW-A', 'Inverted Winger', 'A', WIDE_ALL,
    ['crossing', 'dribbling', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'vision', 'acceleration', 'agility'],
    ['firstTouch', 'longShots', 'anticipation', 'flair', 'workRate', 'balance', 'pace', 'stamina']),
  role('IF-S', 'Inside Forward', 'S', WIDE_AM,
    ['dribbling', 'finishing', 'firstTouch', 'technique', 'offTheBall', 'acceleration', 'agility'],
    ['longShots', 'passing', 'anticipation', 'composure', 'flair', 'vision', 'workRate', 'balance', 'pace', 'stamina']),
  role('IF-A', 'Inside Forward', 'A', WIDE_AM,
    ['dribbling', 'finishing', 'firstTouch', 'technique', 'anticipation', 'offTheBall', 'acceleration', 'agility'],
    ['longShots', 'passing', 'composure', 'flair', 'balance', 'pace', 'stamina']),
  role('RMD-A', 'Raumdeuter', 'A', WIDE_AM,
    ['finishing', 'anticipation', 'composure', 'concentration', 'decisions', 'offTheBall', 'balance'],
    ['firstTouch', 'technique', 'workRate', 'acceleration', 'stamina']),
  role('WTF-S', 'Wide Target Forward', 'S', WIDE_AM,
    ['heading', 'bravery', 'teamwork', 'jumpingReach', 'strength'],
    ['crossing', 'firstTouch', 'anticipation', 'offTheBall', 'workRate', 'balance', 'stamina']),
  role('WTF-A', 'Wide Target Forward', 'A', WIDE_AM,
    ['heading', 'bravery', 'offTheBall', 'jumpingReach', 'strength'],
    ['crossing', 'finishing', 'firstTouch', 'anticipation', 'teamwork', 'workRate', 'balance', 'stamina']),

  // Attacking midfield (centre)
  role('AM-S', 'Attacking Midfielder', 'S', AMC,
    ['firstTouch', 'longShots', 'passing', 'technique', 'anticipation', 'decisions', 'flair', 'offTheBall'],
    ['dribbling', 'composure', 'vision', 'agility']),
  role('AM-A', 'Attacking Midfielder', 'A', AMC,
    ['dribbling', 'firstTouch', 'longShots', 'passing', 'technique', 'anticipation', 'decisions', 'flair', 'offTheBall'],
    ['finishing', 'composure', 'vision', 'agility']),
  role('SS-A', 'Shadow Striker', 'A', AMC,
    ['dribbling', 'finishing', 'firstTouch', 'anticipation', 'composure', 'offTheBall', 'acceleration'],
    ['passing', 'technique', 'concentration', 'decisions', 'workRate', 'agility', 'balance', 'pace', 'stamina']),
  role('ENG-S', 'Enganche', 'S', AMC,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'vision'],
    ['dribbling', 'anticipation', 'flair', 'offTheBall', 'teamwork', 'agility']),
  role('T-A', 'Trequartista', 'A', ['AMC', 'AML', 'AMR', 'ST'],
    ['dribbling', 'firstTouch', 'passing', 'technique', 'composure', 'decisions', 'flair', 'offTheBall', 'vision'],
    ['finishing', 'anticipation', 'acceleration', 'agility', 'balance']),

  // Strikers
  role('AF-A', 'Advanced Forward', 'A', ST,
    ['dribbling', 'finishing', 'firstTouch', 'technique', 'composure', 'offTheBall', 'acceleration'],
    ['passing', 'anticipation', 'decisions', 'workRate', 'agility', 'balance', 'pace', 'stamina']),
  role('P-A', 'Poacher', 'A', ST,
    ['finishing', 'anticipation', 'composure', 'offTheBall'],
    ['firstTouch', 'heading', 'technique', 'decisions', 'acceleration']),
  role('CF-S', 'Complete Forward', 'S', ST,
    ['dribbling', 'firstTouch', 'heading', 'longShots', 'passing', 'technique', 'anticipation', 'composure', 'decisions', 'offTheBall', 'vision', 'acceleration', 'agility', 'strength'],
    ['finishing', 'teamwork', 'workRate', 'balance', 'jumpingReach', 'pace', 'stamina']),
  role('CF-A', 'Complete Forward', 'A', ST,
    ['dribbling', 'finishing', 'firstTouch', 'heading', 'technique', 'anticipation', 'composure', 'offTheBall', 'acceleration', 'agility', 'strength'],
    ['longShots', 'passing', 'decisions', 'teamwork', 'vision', 'workRate', 'balance', 'jumpingReach', 'pace', 'stamina']),
  role('DLF-S', 'Deep Lying Forward', 'S', ST,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'teamwork'],
    ['finishing', 'anticipation', 'flair', 'vision', 'balance', 'strength']),
  role('DLF-A', 'Deep Lying Forward', 'A', ST,
    ['firstTouch', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'teamwork'],
    ['dribbling', 'finishing', 'anticipation', 'flair', 'vision', 'balance', 'strength']),
  role('F9-S', 'False Nine', 'S', ST,
    ['dribbling', 'firstTouch', 'passing', 'technique', 'composure', 'decisions', 'offTheBall', 'vision', 'acceleration', 'agility'],
    ['finishing', 'anticipation', 'flair', 'teamwork', 'balance']),
  role('PF-D', 'Pressing Forward', 'D', ST,
    ['aggression', 'anticipation', 'bravery', 'decisions', 'teamwork', 'workRate', 'acceleration', 'pace', 'stamina'],
    ['firstTouch', 'composure', 'concentration', 'agility', 'balance', 'strength']),
  role('PF-S', 'Pressing Forward', 'S', ST,
    ['aggression', 'anticipation', 'bravery', 'decisions', 'teamwork', 'workRate', 'acceleration', 'pace', 'stamina'],
    ['firstTouch', 'passing', 'composure', 'concentration', 'offTheBall', 'agility', 'balance', 'strength']),
  role('PF-A', 'Pressing Forward', 'A', ST,
    ['aggression', 'anticipation', 'bravery', 'offTheBall', 'teamwork', 'workRate', 'acceleration', 'pace', 'stamina'],
    ['finishing', 'firstTouch', 'composure', 'concentration', 'decisions', 'agility', 'balance', 'strength']),
  role('TF-S', 'Target Forward', 'S', ST,
    ['heading', 'bravery', 'teamwork', 'balance', 'jumpingReach', 'strength'],
    ['finishing', 'firstTouch', 'aggression', 'anticipation', 'composure', 'decisions', 'offTheBall']),
  role('TF-A', 'Target Forward', 'A', ST,
    ['finishing', 'heading', 'bravery', 'composure', 'offTheBall', 'balance', 'jumpingReach', 'strength'],
    ['firstTouch', 'aggression', 'anticipation', 'decisions', 'teamwork']),
];

export const ROLE_BY_ID: Record<string, RoleDef> = Object.fromEntries(ROLES.map(r => [r.id, r]));

export function roleLabel(r: RoleDef): string {
  return `${r.name} (${DUTY_LABELS[r.duty]})`;
}

export function rolesForPosition(pos: PositionKey): RoleDef[] {
  return ROLES.filter(r => r.positions.includes(pos));
}
