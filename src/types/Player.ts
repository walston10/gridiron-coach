/**
 * SIMPLIFIED ROSTER SYSTEM
 *
 * Offense (7 slots):
 * - QB, RB, WR1, WR2, FB_TE, SLOT (6 skill players)
 * - HOGS (O-Line unit, cloned into 5 linemen)
 *
 * Defense (3 captain + unit slots):
 * - D_LINE: Captain + unit rating (clones to 4 DL)
 * - LINEBACKERS: Captain + unit rating (clones to all LBs)
 * - SECONDARY: Captain + unit rating (clones to CBs/Safeties)
 *
 * Total: 10 draft picks (6 offense + 1 HOGS + 3 defense captains)
 */

// =============================================================================
// LEGACY POSITION TYPE - For player generation/display
// =============================================================================

export type OffensePosition = 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT';
export type DefensePosition = 'DE' | 'DT' | 'NT' | 'OLB' | 'MLB' | 'ILB' | 'CB' | 'FS' | 'SS';
export type SpecialTeamsPosition = 'K' | 'P';
export type Position = OffensePosition | DefensePosition | SpecialTeamsPosition;

// =============================================================================
// ROSTER POSITIONS - What players ARE on the roster (simplified game view)
// =============================================================================

// Offense skill positions
export type OffenseRosterPosition = 'QB' | 'RB' | 'WR1' | 'WR2' | 'FB_TE' | 'SLOT';

// Defense captain positions (each comes with a unit rating)
export type DefenseRosterPosition = 'D_LINE' | 'LINEBACKERS' | 'SECONDARY';

export type RosterPosition = OffenseRosterPosition | DefenseRosterPosition;

// O-Line unit (HOGS) - cloned into 5 linemen
export type LineUnit = 'HOGS';

// All roster slots for depth chart
export type RosterSlot = RosterPosition | LineUnit;

// =============================================================================
// FIELD ROLES - Where players line up during a play
// =============================================================================

// Offensive field roles (what the formation assigns)
export type OffenseFieldRole =
  | 'QB'           // Quarterback
  | 'RB'           // Running back
  | 'FB'           // Fullback (FB_TE in power formations)
  | 'WR_X'         // Outside receiver left (WR1)
  | 'WR_Z'         // Outside receiver right (WR2)
  | 'WR_SLOT'      // Slot receiver (SLOT position)
  | 'WR_4'         // 4th receiver (FB_TE in spread)
  | 'TE_INLINE'    // Tight end on the line (FB_TE or SLOT)
  | 'TE_FLEX'      // Flexed tight end (SLOT in 2-TE sets)
  | 'BLOCKER';     // Generic blocker (O-LINE)

// Defensive field roles (all cloned from unit ratings)
export type DefenseFieldRole =
  | 'DE_L'         // Left defensive end
  | 'DE_R'         // Right defensive end
  | 'DT_L'         // Left defensive tackle
  | 'DT_R'         // Right defensive tackle
  | 'MLB'          // Middle linebacker
  | 'LOLB'         // Left outside linebacker
  | 'ROLB'         // Right outside linebacker
  | 'CB_L'         // Left cornerback
  | 'CB_R'         // Right cornerback
  | 'FS'           // Free safety
  | 'SS';          // Strong safety

export type FieldRole = OffenseFieldRole | DefenseFieldRole;

// =============================================================================
// FORMATION TO ROLE MAPPING (Offense only - defense uses unit cloning)
// =============================================================================

export type OffenseFormation = 'I_FORM' | 'SHOTGUN' | 'SINGLEBACK' | 'PISTOL' | 'SPREAD' | 'GOAL_LINE';
export type DefenseFormation = '4_3' | '3_4' | 'NICKEL' | 'DIME' | 'GOAL_LINE_D';
export type Formation = OffenseFormation | DefenseFormation;

// How each offensive roster position maps to a field role in each formation
export type OffenseRoleMapping = Record<OffenseRosterPosition, OffenseFieldRole>;

// Formation role mappings for offense
// FB_TE = primary hybrid (FB/TE/WR4), SLOT = secondary flex (slot WR/TE2)
export const OFFENSE_FORMATION_ROLES: Record<OffenseFormation, OffenseRoleMapping> = {
  I_FORM: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FB_TE: 'FB',         // Fullback in I-Form
    SLOT: 'TE_INLINE',   // Tight end on the line
  },
  SHOTGUN: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FB_TE: 'TE_INLINE',  // Tight end
    SLOT: 'WR_SLOT',     // Slot receiver
  },
  SINGLEBACK: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FB_TE: 'TE_INLINE',  // Tight end
    SLOT: 'WR_SLOT',     // Slot receiver
  },
  PISTOL: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FB_TE: 'TE_INLINE',  // Tight end
    SLOT: 'WR_SLOT',     // Slot receiver
  },
  SPREAD: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'WR_Z',
    FB_TE: 'WR_4',       // 4th receiver in spread
    SLOT: 'WR_SLOT',     // Slot receiver (5-wide capable)
  },
  GOAL_LINE: {
    QB: 'QB',
    RB: 'RB',
    WR1: 'WR_X',
    WR2: 'TE_FLEX',      // WR2 as flexed TE in goal line
    FB_TE: 'FB',         // Fullback for power
    SLOT: 'TE_INLINE',   // Tight end blocking
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

  // Blocking (used for FB_TE, SLOT when blocking)
  passBlock: number;
  runBlock: number;

  // Defense
  tackle: number;         // All defense
  coverage: number;       // CB, S, some LBs
  passRush: number;       // D-Line, LB (when blitzing)
  elusiveness: number;    // Ball carrier evasion
};

// =============================================================================
// UNIT STATS (aggregate for cloned players)
// =============================================================================

// O-Line unit stats (HOGS)
export type OLineUnitStats = {
  passBlock: number;      // Pass protection rating
  runBlock: number;       // Run blocking rating
  overall: number;        // Combined rating
};

// Defensive unit stats (each defensive position group)
export type DefenseUnitStats = {
  overall: number;        // Overall unit rating - cloned to all players in group
  // Individual stats are derived from overall with position-specific weighting
};

// Generic line unit stats (for FieldLineUnit visualization in GameSim)
// Used for both O-LINE and D-LINE visual representation
export type LineUnitStats = {
  passBlock: number;      // O-LINE uses this
  runBlock: number;       // O-LINE uses this
  passRush: number;       // D-LINE uses this
  runStop: number;        // D-LINE uses this
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
  position: Position;            // Legacy position for display (QB, RB, WR, etc.)
  rosterSlot?: RosterSlot;       // Which roster slot they fill (QB, WR1, FB_TE, D_LINE, etc.)
  age: number;
  experience: number;            // Years in league
  stats: PlayerStats;
  overall: number;               // Calculated from stats
  potential: number;             // Development ceiling
  contract: Contract | null;
  injuryStatus: InjuryStatus | null;
  teamId: string | null;
  isStarter?: boolean;           // true = starter, false = bench
  isEmergencyBackup?: boolean;   // McBum players - can never be injured, traded, cut, or in events
  personality?: string;          // Flavor text for draft ("Ball hawk with attitude problem")
};

// O-Line unit entity (HOGS)
export type OLineEntity = {
  id: string;
  name: string;                  // "The Maulers", "The Wall", etc.
  teamId: string;
  stats: OLineUnitStats;
  overall: number;
  personality?: string;          // Flavor text for draft
};

// Defense captain with unit rating
// The captain is the "face" of the unit for events, the unit rating affects all cloned players
export type DefenseCaptainEntity = {
  id: string;
  captain: Player;               // The face of the unit (appears in events)
  unitRating: number;            // Overall rating cloned to all players in this group
  teamId: string;
};

// =============================================================================
// ROSTER STRUCTURE
// =============================================================================

export interface TeamRoster {
  // Offense skill players (6 positions, each with starter + McBum backup)
  offense: {
    QB: Player;
    RB: Player;
    WR1: Player;
    WR2: Player;
    FB_TE: Player;    // Hybrid: FB, TE, or WR4 based on formation
    SLOT: Player;     // Flex: Slot WR or TE2 based on formation
  };

  // O-Line unit (cloned into 5 linemen: LT, LG, C, RG, RT)
  HOGS: OLineEntity;

  // Defense (3 captain + unit combos)
  defense: {
    D_LINE: DefenseCaptainEntity;      // Clones to DE_L, DE_R, DT_L, DT_R
    LINEBACKERS: DefenseCaptainEntity; // Clones to MLB, LOLB, ROLB
    SECONDARY: DefenseCaptainEntity;   // Clones to CB_L, CB_R, FS, SS
  };
}

// =============================================================================
// DRAFT TYPES
// =============================================================================

export type DraftSlot =
  | 'QB' | 'RB' | 'WR1' | 'WR2' | 'FB_TE' | 'SLOT'  // Offense skill
  | 'HOGS'                                           // O-Line unit
  | 'D_LINE' | 'LINEBACKERS' | 'SECONDARY';          // Defense captains

export type DraftPlayer = {
  id: string;
  name: string;
  position: DraftSlot;
  overall: number;
  cost: number;           // Budget cost
  personality: string;    // "Franchise cornerstone", "Diva with hands", etc.
};

export type DraftPool = Record<DraftSlot, DraftPlayer[]>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Get the field role for an offensive roster position in a given formation
export function getOffenseFieldRole(
  rosterPosition: OffenseRosterPosition,
  formation: OffenseFormation
): OffenseFieldRole {
  return OFFENSE_FORMATION_ROLES[formation][rosterPosition];
}

// Type guards
export function isOffensePosition(pos: RosterPosition): pos is OffenseRosterPosition {
  return ['QB', 'RB', 'WR1', 'WR2', 'FB_TE', 'SLOT'].includes(pos);
}

export function isDefensePosition(pos: RosterPosition): pos is DefenseRosterPosition {
  return ['D_LINE', 'LINEBACKERS', 'SECONDARY'].includes(pos);
}

export function isOffenseFormation(f: Formation): f is OffenseFormation {
  return ['I_FORM', 'SHOTGUN', 'SINGLEBACK', 'PISTOL', 'SPREAD', 'GOAL_LINE'].includes(f);
}

export function isDefenseFormation(f: Formation): f is DefenseFormation {
  return ['4_3', '3_4', 'NICKEL', 'DIME', 'GOAL_LINE_D'].includes(f);
}

// Get all players from a roster as a flat array (for events, etc.)
export function getAllPlayers(roster: TeamRoster): Player[] {
  const players: Player[] = [];

  // Offense skill players
  players.push(roster.offense.QB);
  players.push(roster.offense.RB);
  players.push(roster.offense.WR1);
  players.push(roster.offense.WR2);
  players.push(roster.offense.FB_TE);
  players.push(roster.offense.SLOT);

  // Defense captains (these are the "faces" for events)
  players.push(roster.defense.D_LINE.captain);
  players.push(roster.defense.LINEBACKERS.captain);
  players.push(roster.defense.SECONDARY.captain);

  return players;
}

// Calculate overall rating for a player based on their roster slot
export function calculateOverall(stats: PlayerStats, slot: RosterSlot): number {
  const weights = getPositionWeights(slot);
  let total = 0;
  let weightSum = 0;

  for (const [stat, weight] of Object.entries(weights)) {
    total += (stats[stat as keyof PlayerStats] || 50) * weight;
    weightSum += weight;
  }

  return Math.round(total / weightSum);
}

function getPositionWeights(slot: RosterSlot): Partial<Record<keyof PlayerStats, number>> {
  switch (slot) {
    case 'QB':
      return { throwAccuracy: 3, throwPower: 2, awareness: 2, composure: 2, speed: 1, agility: 1 };
    case 'RB':
      return { speed: 3, agility: 2, carrying: 2, elusiveness: 2, stamina: 1, toughness: 1, catching: 1 };
    case 'WR1':
    case 'WR2':
      return { speed: 3, catching: 3, routeRunning: 2, agility: 1, discipline: 1 };
    case 'FB_TE':
      return { catching: 2, runBlock: 2, strength: 2, speed: 1, toughness: 1, routeRunning: 1 };
    case 'SLOT':
      return { speed: 2, catching: 3, routeRunning: 3, agility: 2, elusiveness: 1 };
    case 'D_LINE':
      return { passRush: 3, strength: 3, tackle: 2, speed: 1, motor: 1 };
    case 'LINEBACKERS':
      return { tackle: 3, speed: 2, strength: 2, coverage: 1, awareness: 1, motor: 1 };
    case 'SECONDARY':
      return { speed: 3, coverage: 3, agility: 2, tackle: 1, awareness: 1 };
    case 'HOGS':
      return { passBlock: 3, runBlock: 3, strength: 2, awareness: 1 };
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
