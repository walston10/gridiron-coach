/**
 * Defense Formation Types
 *
 * Defines defensive formations, positions, and assignments for the play simulation.
 */

import type { DefensivePlayType } from './card.types';

/**
 * Defensive position slots
 */
export type DefensePositionSlot =
  // Defensive Line
  | 'DE_L'   // Left Defensive End
  | 'DT_L'   // Left Defensive Tackle (or Nose in 3-4)
  | 'DT_R'   // Right Defensive Tackle
  | 'DE_R'   // Right Defensive End
  | 'NT'     // Nose Tackle (3-4)
  // Linebackers
  | 'WILL'   // Weak-side LB
  | 'MIKE'   // Middle LB
  | 'SAM'    // Strong-side LB
  | 'OLB_L'  // Outside LB Left (3-4)
  | 'OLB_R'  // Outside LB Right (3-4)
  // Secondary
  | 'CB_L'   // Left Cornerback
  | 'CB_R'   // Right Cornerback
  | 'CB_S'   // Slot Cornerback (Nickel)
  | 'FS'     // Free Safety
  | 'SS'     // Strong Safety
  | 'DB'     // Extra DB (Dime);

/**
 * Defensive formation names
 */
export type DefenseFormationName =
  | '4-3'           // 4 DL, 3 LB, 4 DB - Standard
  | '3-4'           // 3 DL, 4 LB, 4 DB - More LB pressure
  | 'NICKEL'        // 4 DL, 2 LB, 5 DB - Pass defense
  | 'DIME'          // 4 DL, 1 LB, 6 DB - Heavy pass defense
  | 'GOAL_LINE'     // 5 DL, 4 LB, 2 DB - Run stuffing
  | '4-6'           // 4 DL, 6 LB/DB - Bear defense
  | 'QUARTER';      // 3 DL, 1 LB, 7 DB - Prevent

/**
 * Coverage assignment types
 */
export type CoverageAssignment =
  | 'MAN_WR1'       // Man coverage on WR1 (X)
  | 'MAN_WR2'       // Man coverage on WR2 (Z)
  | 'MAN_SLOT'      // Man coverage on slot (H)
  | 'MAN_TE'        // Man coverage on TE (Y)
  | 'MAN_RB'        // Man coverage on RB
  | 'ZONE_FLAT_L'   // Left flat zone
  | 'ZONE_FLAT_R'   // Right flat zone
  | 'ZONE_HOOK_L'   // Left hook/curl zone
  | 'ZONE_HOOK_R'   // Right hook/curl zone
  | 'ZONE_DEEP_THIRD_L'  // Deep left third
  | 'ZONE_DEEP_THIRD_M'  // Deep middle third
  | 'ZONE_DEEP_THIRD_R'  // Deep right third
  | 'ZONE_DEEP_HALF_L'   // Deep left half (Cover 2)
  | 'ZONE_DEEP_HALF_R'   // Deep right half (Cover 2)
  | 'ZONE_MIDDLE'        // Middle zone (Cover 3)
  | 'SPY_QB'             // Spy the QB
  | 'PASS_RUSH'          // Rush the passer
  | 'CONTAIN_L'          // Contain left edge
  | 'CONTAIN_R'          // Contain right edge
  | 'RUN_FIT_A_L'        // Fill A gap left
  | 'RUN_FIT_A_R'        // Fill A gap right
  | 'RUN_FIT_B_L'        // Fill B gap left
  | 'RUN_FIT_B_R'        // Fill B gap right
  | 'RUN_FIT_C_L'        // Fill C gap left
  | 'RUN_FIT_C_R';       // Fill C gap right

/**
 * Run vs Pass read behavior
 */
export type ReadBehavior =
  | 'PASS_FIRST'    // Assume pass until proven run
  | 'RUN_FIRST'     // Assume run until proven pass
  | 'BALANCED'      // Read and react
  | 'AGGRESSIVE';   // Attack immediately

/**
 * Individual defender assignment
 */
export interface DefenderAssignment {
  positionSlot: DefensePositionSlot;
  startX: number;  // 0-100 field position (0=left sideline, 100=right)
  startY: number;  // 0-100 field position (50=LOS, higher=offense side)

  // Pre-snap behavior
  isBlitzing: boolean;

  // Coverage assignment (if not blitzing)
  coverageAssignment?: CoverageAssignment;

  // Run defense assignment
  runAssignment: CoverageAssignment;

  // Read behavior
  readBehavior: ReadBehavior;

  // Zone boundaries (for zone coverage)
  zoneBounds?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}

/**
 * Full defensive formation with all 11 players
 */
export interface DefenseFormation {
  name: DefenseFormationName;
  assignments: DefenderAssignment[];
}

/**
 * Defense call - combines formation with play type adjustments
 */
export interface DefenseCall {
  formation: DefenseFormationName;
  playType: DefensivePlayType;
  assignments: DefenderAssignment[];

  // Adjustments based on play type
  blitzers: DefensePositionSlot[];  // Who's blitzing
  manCoverage: Map<DefensePositionSlot, string>;  // Defender -> Offensive target
}

/**
 * Defender state during simulation
 */
export interface DefenderState {
  positionSlot: DefensePositionSlot;
  x: number;
  y: number;
  assignment: DefenderAssignment;

  // Current target (for man coverage)
  manTarget?: string;  // Offensive position slot

  // Movement state
  isEngaged: boolean;  // Blocked or in coverage
  isBlocked: boolean;  // Being blocked by OL
  hasMadeTackle: boolean;

  // Rating attributes (from roster)
  speed: number;
  tackling: number;
  coverage: number;
  passRush: number;
  awareness: number;
}

/**
 * Zone definitions on the field
 */
export const ZONE_BOUNDARIES = {
  FLAT_L: { xMin: 0, xMax: 30, yMin: 45, yMax: 35 },
  FLAT_R: { xMin: 70, xMax: 100, yMin: 45, yMax: 35 },
  HOOK_L: { xMin: 20, xMax: 45, yMin: 35, yMax: 20 },
  HOOK_R: { xMin: 55, xMax: 80, yMin: 35, yMax: 20 },
  DEEP_THIRD_L: { xMin: 0, xMax: 33, yMin: 20, yMax: 0 },
  DEEP_THIRD_M: { xMin: 33, xMax: 67, yMin: 20, yMax: 0 },
  DEEP_THIRD_R: { xMin: 67, xMax: 100, yMin: 20, yMax: 0 },
  DEEP_HALF_L: { xMin: 0, xMax: 50, yMin: 15, yMax: 0 },
  DEEP_HALF_R: { xMin: 50, xMax: 100, yMin: 15, yMax: 0 },
  MIDDLE: { xMin: 30, xMax: 70, yMin: 35, yMax: 15 },
} as const;

/**
 * Speed constants for defenders (yards per second)
 */
export const DEFENDER_SPEEDS = {
  CB: 9.5,      // Fastest - cover receivers
  FS: 9.2,      // Very fast - range
  SS: 8.8,      // Fast - run support
  LB: 7.5,      // Medium - versatile
  DE: 7.0,      // Medium - pass rush
  DT: 5.5,      // Slowest - interior
} as const;

/**
 * Reaction times (ms) based on read behavior
 */
export const REACTION_TIMES = {
  PASS_FIRST: { runReaction: 400, passReaction: 100 },
  RUN_FIRST: { runReaction: 100, passReaction: 400 },
  BALANCED: { runReaction: 250, passReaction: 250 },
  AGGRESSIVE: { runReaction: 50, passReaction: 50 },
} as const;
