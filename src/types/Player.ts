/**
 * SIMPLIFIED ROSTER SYSTEM
 *
 * Roster has ~12 characters per team:
 * - 5 offensive skill players + 1 O-LINE unit
 * - 5 defensive skill players + 1 D-LINE unit
 * - Each position has 1 bench player (except line units)
 *
 * Players have a ROSTER POSITION (what they are on the team)
 * Formations assign FIELD ROLES (where they line up on a play)
 */

// =============================================================================
// LEGACY POSITION TYPE - For player generation/franchise mode
// =============================================================================

export type OffensePosition = 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT';
export type DefensePosition = 'DE' | 'DT' | 'NT' | 'OLB' | 'MLB' | 'ILB' | 'CB' | 'FS' | 'SS';
export type SpecialTeamsPosition = 'K' | 'P';
export type Position = OffensePosition | DefensePosition | SpecialTeamsPosition;

// =============================================================================
// ROSTER POSITIONS - What players ARE on the roster (simplified game view)
// =============================================================================

export type OffenseRosterPosition = 'QB' | 'RB' | 'WR1' | 'WR2' | 'FLEX';
export type DefenseRosterPosition = 'CB1' | 'CB2' | 'S' | 'LB1' | 'LB2';
export type RosterPosition = OffenseRosterPosition | DefenseRosterPosition;

// Line units are special - they're not individual players, they're cloned
// HOGS = Offensive Line unit (cloned into 5 O-linemen: LT, LG, C, RG, RT)
// FRONT = Defensive Line unit (cloned into 4 D-linemen: DE_L, DT_L, DT_R, DE_R)
export type LineUnit = 'HOGS' | 'FRONT';

// All roster slots (for depth chart purposes)
export type RosterSlot = RosterPosition | LineUnit;

// =============================================================================
// FIELD ROLES - Where players line up during a play
// =============================================================================

// Offensive field roles (what the formation assigns)
export type OffenseFieldRole =
  | 'QB'           // Quarterback
  | 'RB'           // Running back
  | 'FB'           // Fullback (FLEX in I-Form)
  | 'WR_X'         // Outside receiver left (WR1)
  | 'WR_Z'         // Outside receiver right (WR2)
  | 'SLOT'         // Slot receiver (FLEX in spread)
  | 'TE'           // Tight end (FLEX in base)
  | 'BLOCKER';     // Generic blocker (O-LINE)

// Defensive field roles
export type DefenseFieldRole =
  | 'CB_LEFT'      // Left cornerback (CB1)
  | 'CB_RIGHT'     // Right cornerback (CB2)
  | 'NICKEL_CB'    // Nickel corner (CB1 bench or S in nickel)
  | 'FS'           // Free safety (S)
  | 'SS'           // Strong safety (S or LB in some formations)
  | 'MLB'          // Middle linebacker (LB1)
  | 'LOLB'         // Left outside linebacker (LB2)
  | 'ROLB'         // Right outside linebacker (LB2)
  | 'PASS_RUSHER'; // Generic pass rusher (D-LINE)

export type FieldRole = OffenseFieldRole | DefenseFieldRole;

// =============================================================================
// FORMATION TO ROLE MAPPING
// =============================================================================

export type OffenseFormation = 'I_FORM' | 'SHOTGUN' | 'SINGLEBACK' | 'PISTOL' | 'SPREAD' | 'GOAL_LINE';
export type DefenseFormation = '4_3' | '3_4' | 'NICKEL' | 'DIME' | 'GOAL_LINE_D';
export type Formation = OffenseFormation | DefenseFormation;

// How each roster position maps to a field role in each formation
export type OffenseRoleMapping = Record<OffenseRosterPosition, OffenseFieldRole>;
export type DefenseRoleMapping = Record<DefenseRosterPosition, DefenseFieldRole>;

// Formation role mappings
export const OFFENSE_FORMATION_ROLES: Record<OffenseFormation, OffenseRoleMapping> = {
  I_FORM: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FLEX: 'FB',      // FLEX plays fullback in I-Form
  },
  SHOTGUN: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FLEX: 'TE',      // FLEX plays tight end in Shotgun
  },
  SINGLEBACK: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FLEX: 'TE',      // FLEX plays tight end
  },
  PISTOL: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FLEX: 'SLOT',    // FLEX plays slot in Pistol
  },
  SPREAD: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FLEX: 'SLOT',    // FLEX plays slot in Spread (4-wide)
  },
  GOAL_LINE: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'TE',       // WR2 becomes TE in goal line
    FLEX: 'FB',      // FLEX plays fullback
  },
};

export const DEFENSE_FORMATION_ROLES: Record<DefenseFormation, DefenseRoleMapping> = {
  '4_3': {
    CB1: 'CB_LEFT',
    CB2: 'CB_RIGHT',
    S: 'FS',
    LB1: 'MLB',
    LB2: 'LOLB',     // Could also be ROLB
  },
  '3_4': {
    CB1: 'CB_LEFT',
    CB2: 'CB_RIGHT',
    S: 'FS',
    LB1: 'MLB',
    LB2: 'LOLB',
  },
  NICKEL: {
    CB1: 'CB_LEFT',
    CB2: 'CB_RIGHT',
    S: 'NICKEL_CB',  // Safety plays nickel corner
    LB1: 'MLB',
    LB2: 'SS',       // LB2 drops to strong safety role
  },
  DIME: {
    CB1: 'CB_LEFT',
    CB2: 'CB_RIGHT',
    S: 'FS',
    LB1: 'NICKEL_CB', // LB1 becomes nickel corner
    LB2: 'SS',        // LB2 stays in coverage
  },
  GOAL_LINE_D: {
    CB1: 'CB_LEFT',
    CB2: 'CB_RIGHT',
    S: 'SS',
    LB1: 'MLB',
    LB2: 'ROLB',
  },
};

// =============================================================================
// PLAYER STATS
// =============================================================================

export type PlayerStats = {
  // Physical attributes
  speed: number;          // 1-99 - Top end speed
  acceleration: number;   // 1-99 - Burst off the line
  strength: number;       // 1-99 - Power in collisions
  agility: number;        // 1-99 - Change of direction
  stamina: number;        // 1-99 - How fast they fatigue in-game
  toughness: number;      // 1-99 - Injury resistance, playing through pain

  // Mental attributes
  awareness: number;      // 1-99 - General football IQ, acts as modifier
  discipline: number;     // 1-99 - Penalties, blown assignments, mistakes
  composure: number;      // 1-99 - Performance in clutch/pressure moments

  // Intangibles (hidden/drama stats)
  motor: number;          // 1-99 - Effort consistency (taking plays off)
  ego: number;            // 1-99 - Reaction to benching, fewer targets, criticism

  // Skill attributes
  catching: number;       // WR, TE, RB
  carrying: number;       // RB, WR (after catch)
  throwPower: number;     // QB only
  throwAccuracy: number;  // QB only
  routeRunning: number;   // WR, TE

  // Blocking (used for FLEX when playing FB/TE)
  passBlock: number;
  runBlock: number;

  // Defense
  tackle: number;         // All defense
  coverage: number;       // CB, S
  passRush: number;       // LB (when blitzing)
  elusiveness: number;    // Ball carrier evasion
};

// =============================================================================
// LINE UNIT STATS (aggregate for the whole unit)
// =============================================================================

export type LineUnitStats = {
  passBlock: number;      // O-LINE: Pass protection rating
  runBlock: number;       // O-LINE: Run blocking rating
  passRush: number;       // D-LINE: Pass rush rating
  runStop: number;        // D-LINE: Run defense rating
  overall: number;        // Combined rating
};

// =============================================================================
// PLAYER TYPES
// =============================================================================

export type Contract = {
  years: number;
  yearlySalary: number;
  guaranteedMoney: number;
  signingBonus: number;
};

export type InjuryStatus = {
  type: string;
  weeksRemaining: number;
};

// Individual skill player on the roster
export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;            // Their position (QB, RB, WR, TE, etc.)
  age: number;
  experience: number;            // Years in league
  stats: PlayerStats;
  overall: number;               // Calculated from stats
  potential: number;             // Development ceiling
  contract: Contract | null;
  injuryStatus: InjuryStatus | null;
  teamId: string | null;
  isStarter?: boolean;           // Optional - true = starter, false = bench
  isEmergencyBackup?: boolean;   // McBum players - can never be injured, traded, cut, or in events
};

// Line unit (O-LINE or D-LINE as a single entity)
export type LineUnitEntity = {
  id: string;
  type: LineUnit;
  teamId: string;
  stats: LineUnitStats;
  overall: number;
};

// =============================================================================
// ROSTER STRUCTURE
// =============================================================================

export interface TeamRoster {
  // Offense skill players (5 starters + 5 bench = 10)
  offense: {
    QB: { starter: Player; bench: Player };
    RB: { starter: Player; bench: Player };
    WR1: { starter: Player; bench: Player };
    WR2: { starter: Player; bench: Player };
    FLEX: { starter: Player; bench: Player };
  };

  // Defense skill players (5 starters + 5 bench = 10)
  defense: {
    CB1: { starter: Player; bench: Player };
    CB2: { starter: Player; bench: Player };
    S: { starter: Player; bench: Player };
    LB1: { starter: Player; bench: Player };
    LB2: { starter: Player; bench: Player };
  };

  // Line units (cloned into multiple field players during games)
  lineUnits: {
    HOGS: LineUnitEntity;   // Cloned into 5 O-linemen
    FRONT: LineUnitEntity;  // Cloned into 4 D-linemen
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Get the field role for a roster position in a given formation
export function getFieldRole(
  rosterPosition: OffenseRosterPosition,
  formation: OffenseFormation
): OffenseFieldRole;
export function getFieldRole(
  rosterPosition: DefenseRosterPosition,
  formation: DefenseFormation
): DefenseFieldRole;
export function getFieldRole(
  rosterPosition: RosterPosition,
  formation: Formation
): FieldRole {
  if (isOffensePosition(rosterPosition) && isOffenseFormation(formation)) {
    return OFFENSE_FORMATION_ROLES[formation][rosterPosition];
  }
  if (isDefensePosition(rosterPosition) && isDefenseFormation(formation)) {
    return DEFENSE_FORMATION_ROLES[formation][rosterPosition];
  }
  throw new Error(`Invalid position/formation combination: ${rosterPosition}/${formation}`);
}

// Type guards
export function isOffensePosition(pos: RosterPosition): pos is OffenseRosterPosition {
  return ['QB', 'RB', 'WR1', 'WR2', 'FLEX'].includes(pos);
}

export function isDefensePosition(pos: RosterPosition): pos is DefenseRosterPosition {
  return ['CB1', 'CB2', 'S', 'LB1', 'LB2'].includes(pos);
}

export function isOffenseFormation(f: Formation): f is OffenseFormation {
  return ['I_FORM', 'SHOTGUN', 'SINGLEBACK', 'PISTOL', 'SPREAD', 'GOAL_LINE'].includes(f);
}

export function isDefenseFormation(f: Formation): f is DefenseFormation {
  return ['4_3', '3_4', 'NICKEL', 'DIME', 'GOAL_LINE_D'].includes(f);
}

// Get all players from a roster as a flat array
export function getAllPlayers(roster: TeamRoster): Player[] {
  const players: Player[] = [];

  // Offense
  for (const pos of ['QB', 'RB', 'WR1', 'WR2', 'FLEX'] as OffenseRosterPosition[]) {
    players.push(roster.offense[pos].starter);
    players.push(roster.offense[pos].bench);
  }

  // Defense
  for (const pos of ['CB1', 'CB2', 'S', 'LB1', 'LB2'] as DefenseRosterPosition[]) {
    players.push(roster.defense[pos].starter);
    players.push(roster.defense[pos].bench);
  }

  return players;
}

// Calculate overall rating for a player based on position
export function calculateOverall(stats: PlayerStats, position: RosterPosition): number {
  const weights = getPositionWeights(position);
  let total = 0;
  let weightSum = 0;

  for (const [stat, weight] of Object.entries(weights)) {
    total += (stats[stat as keyof PlayerStats] || 50) * weight;
    weightSum += weight;
  }

  return Math.round(total / weightSum);
}

function getPositionWeights(position: RosterPosition): Partial<Record<keyof PlayerStats, number>> {
  switch (position) {
    case 'QB':
      return { throwAccuracy: 3, throwPower: 2, awareness: 2, composure: 2, speed: 1, agility: 1 };
    case 'RB':
      return { speed: 3, agility: 2, carrying: 2, elusiveness: 2, stamina: 1, toughness: 1, catching: 1 };
    case 'WR1':
    case 'WR2':
      return { speed: 3, catching: 3, routeRunning: 2, agility: 1, discipline: 1 };
    case 'FLEX':
      return { catching: 2, runBlock: 2, speed: 2, strength: 2, toughness: 1, routeRunning: 1 };
    case 'CB1':
    case 'CB2':
      return { speed: 3, coverage: 3, agility: 2, composure: 1, discipline: 1, awareness: 1 };
    case 'S':
      return { speed: 2, coverage: 2, tackle: 2, awareness: 2, composure: 1, strength: 1 };
    case 'LB1':
    case 'LB2':
      return { tackle: 3, speed: 2, strength: 2, coverage: 1, awareness: 1, motor: 1 };
    default:
      return { speed: 1, strength: 1, awareness: 1, stamina: 1 };
  }
}

// =============================================================================
// EMERGENCY BACKUP (McBum) HELPERS
// =============================================================================

/**
 * Check if a player is an emergency backup (McBum)
 * McBums can never be: injured, traded, cut, suspended, or triggered in events
 */
export function isEmergencyBackup(player: Player): boolean {
  return player.isEmergencyBackup === true;
}

/**
 * Check if a player can be traded
 * Returns false for emergency backups
 */
export function canBeTradedOrCut(player: Player): boolean {
  return !isEmergencyBackup(player);
}

/**
 * Check if a player can be selected for an event
 * Returns false for emergency backups
 */
export function canBeInEvent(player: Player): boolean {
  return !isEmergencyBackup(player);
}

/**
 * Check if a player can be injured
 * Returns false for emergency backups
 */
export function canBeInjured(player: Player): boolean {
  return !isEmergencyBackup(player);
}
