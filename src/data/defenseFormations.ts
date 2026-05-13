/**
 * Defense Formations
 *
 * Defines the base positions for each defensive formation.
 * Coordinates use 0-100 system where:
 * - X: 0 = left sideline, 100 = right sideline, 50 = center
 * - Y: 50 = line of scrimmage, higher numbers = offense's side, lower = defense's side
 */

import type {
  DefenseFormation,
  DefenderAssignment,
  DefenseFormationName,
} from '../types/DefenseFormation';

/**
 * 4-3 Formation - Standard defense
 * 4 DL (2 DE, 2 DT), 3 LB (WILL, MIKE, SAM), 4 DB (2 CB, FS, SS)
 */
const FORMATION_4_3: DefenseFormation = {
  name: '4-3',
  assignments: [
    // Defensive Line
    { positionSlot: 'DE_L', startX: 30, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'BALANCED' },
    { positionSlot: 'DT_L', startX: 42, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'BALANCED' },
    { positionSlot: 'DT_R', startX: 58, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'BALANCED' },
    { positionSlot: 'DE_R', startX: 70, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'BALANCED' },
    // Linebackers
    { positionSlot: 'WILL', startX: 32, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_HOOK_L' },
    { positionSlot: 'MIKE', startX: 50, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_MIDDLE' },
    { positionSlot: 'SAM', startX: 68, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_B_R', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_HOOK_R' },
    // Secondary
    { positionSlot: 'CB_L', startX: 12, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR1' },
    { positionSlot: 'CB_R', startX: 88, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR2' },
    { positionSlot: 'FS', startX: 50, startY: 70, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_THIRD_M' },
    { positionSlot: 'SS', startX: 65, startY: 64, isBlitzing: false, runAssignment: 'RUN_FIT_C_R', readBehavior: 'BALANCED', coverageAssignment: 'MAN_TE' },
  ],
};

/**
 * 3-4 Formation - More LB flexibility
 * 3 DL (2 DE, 1 NT), 4 LB (2 OLB, 2 ILB), 4 DB
 */
const FORMATION_3_4: DefenseFormation = {
  name: '3-4',
  assignments: [
    // Defensive Line
    { positionSlot: 'DE_L', startX: 35, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'BALANCED' },
    { positionSlot: 'NT', startX: 50, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'RUN_FIRST' },
    { positionSlot: 'DE_R', startX: 65, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_B_R', readBehavior: 'BALANCED' },
    // Linebackers
    { positionSlot: 'OLB_L', startX: 25, startY: 52, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_FLAT_L' },
    { positionSlot: 'WILL', startX: 40, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_HOOK_L' },
    { positionSlot: 'MIKE', startX: 60, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_HOOK_R' },
    { positionSlot: 'OLB_R', startX: 75, startY: 52, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_FLAT_R' },
    // Secondary
    { positionSlot: 'CB_L', startX: 10, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR1' },
    { positionSlot: 'CB_R', startX: 90, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR2' },
    { positionSlot: 'FS', startX: 50, startY: 70, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_THIRD_M' },
    { positionSlot: 'SS', startX: 60, startY: 64, isBlitzing: false, runAssignment: 'RUN_FIT_C_R', readBehavior: 'BALANCED', coverageAssignment: 'MAN_TE' },
  ],
};

/**
 * Nickel Formation - Pass defense
 * 4 DL, 2 LB, 5 DB (adds slot CB)
 */
const FORMATION_NICKEL: DefenseFormation = {
  name: 'NICKEL',
  assignments: [
    // Defensive Line
    { positionSlot: 'DE_L', startX: 30, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST' },
    { positionSlot: 'DT_L', startX: 42, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'BALANCED' },
    { positionSlot: 'DT_R', startX: 58, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'BALANCED' },
    { positionSlot: 'DE_R', startX: 70, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST' },
    // Linebackers (only 2)
    { positionSlot: 'WILL', startX: 38, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_HOOK_L' },
    { positionSlot: 'MIKE', startX: 62, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_B_R', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_HOOK_R' },
    // Secondary (5 DBs)
    { positionSlot: 'CB_L', startX: 8, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR1' },
    { positionSlot: 'CB_R', startX: 92, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR2' },
    { positionSlot: 'CB_S', startX: 35, startY: 60, isBlitzing: false, runAssignment: 'RUN_FIT_C_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_SLOT' },
    { positionSlot: 'FS', startX: 50, startY: 72, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_THIRD_M' },
    { positionSlot: 'SS', startX: 65, startY: 64, isBlitzing: false, runAssignment: 'RUN_FIT_C_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_TE' },
  ],
};

/**
 * Dime Formation - Heavy pass defense
 * 4 DL, 1 LB, 6 DB
 */
const FORMATION_DIME: DefenseFormation = {
  name: 'DIME',
  assignments: [
    // Defensive Line
    { positionSlot: 'DE_L', startX: 32, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST' },
    { positionSlot: 'DT_L', startX: 44, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'PASS_FIRST' },
    { positionSlot: 'DT_R', startX: 56, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'PASS_FIRST' },
    { positionSlot: 'DE_R', startX: 68, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST' },
    // Linebacker (only 1)
    { positionSlot: 'MIKE', startX: 50, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'BALANCED', coverageAssignment: 'ZONE_MIDDLE' },
    // Secondary (6 DBs)
    { positionSlot: 'CB_L', startX: 5, startY: 54, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR1' },
    { positionSlot: 'CB_R', startX: 95, startY: 54, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_WR2' },
    { positionSlot: 'CB_S', startX: 30, startY: 54, isBlitzing: false, runAssignment: 'RUN_FIT_C_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_SLOT' },
    { positionSlot: 'DB', startX: 70, startY: 54, isBlitzing: false, runAssignment: 'RUN_FIT_C_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'MAN_TE' },
    { positionSlot: 'FS', startX: 40, startY: 70, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_HALF_L' },
    { positionSlot: 'SS', startX: 60, startY: 70, isBlitzing: false, runAssignment: 'RUN_FIT_B_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_HALF_R' },
  ],
};

/**
 * Goal Line Formation - Maximum run defense
 * 5 DL, 4 LB, 2 DB
 */
const FORMATION_GOAL_LINE: DefenseFormation = {
  name: 'GOAL_LINE',
  assignments: [
    // Defensive Line (5) — at the LOS
    { positionSlot: 'DE_L', startX: 25, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'RUN_FIRST' },
    { positionSlot: 'DT_L', startX: 38, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'RUN_FIRST' },
    { positionSlot: 'NT', startX: 50, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'RUN_FIRST' },
    { positionSlot: 'DT_R', startX: 62, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_B_R', readBehavior: 'RUN_FIRST' },
    { positionSlot: 'DE_R', startX: 75, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'RUN_FIRST' },
    // Linebackers (4) — 4–5 yards back, stacked tight
    { positionSlot: 'OLB_L', startX: 20, startY: 56, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'RUN_FIRST', coverageAssignment: 'ZONE_FLAT_L' },
    { positionSlot: 'WILL', startX: 40, startY: 56, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'RUN_FIRST', coverageAssignment: 'ZONE_HOOK_L' },
    { positionSlot: 'MIKE', startX: 60, startY: 56, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'RUN_FIRST', coverageAssignment: 'ZONE_HOOK_R' },
    { positionSlot: 'OLB_R', startX: 80, startY: 56, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'RUN_FIRST', coverageAssignment: 'ZONE_FLAT_R' },
    // Secondary (only 2) — wide and a little deeper
    { positionSlot: 'CB_L', startX: 10, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'RUN_FIRST', coverageAssignment: 'MAN_WR1' },
    { positionSlot: 'SS', startX: 90, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'RUN_FIRST', coverageAssignment: 'MAN_WR2' },
  ],
};

/**
 * Quarter Formation - Prevent defense
 * 3 DL, 1 LB, 7 DB
 */
const FORMATION_QUARTER: DefenseFormation = {
  name: 'QUARTER',
  assignments: [
    // Defensive Line (3)
    { positionSlot: 'DE_L', startX: 35, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST' },
    { positionSlot: 'NT', startX: 50, startY: 51, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'PASS_FIRST' },
    { positionSlot: 'DE_R', startX: 65, startY: 51, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST' },
    // Linebacker (1)
    { positionSlot: 'MIKE', startX: 50, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_A_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_MIDDLE' },
    // Secondary (7 DBs)
    { positionSlot: 'CB_L', startX: 5, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_THIRD_L' },
    { positionSlot: 'CB_R', startX: 95, startY: 58, isBlitzing: false, runAssignment: 'CONTAIN_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_THIRD_R' },
    { positionSlot: 'CB_S', startX: 25, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_C_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_FLAT_L' },
    { positionSlot: 'DB', startX: 75, startY: 55, isBlitzing: false, runAssignment: 'RUN_FIT_C_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_FLAT_R' },
    { positionSlot: 'FS', startX: 50, startY: 75, isBlitzing: false, runAssignment: 'RUN_FIT_A_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_DEEP_THIRD_M' },
    { positionSlot: 'SS', startX: 35, startY: 62, isBlitzing: false, runAssignment: 'RUN_FIT_B_L', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_HOOK_L' },
    { positionSlot: 'WILL', startX: 65, startY: 62, isBlitzing: false, runAssignment: 'RUN_FIT_B_R', readBehavior: 'PASS_FIRST', coverageAssignment: 'ZONE_HOOK_R' },
  ],
};

/**
 * All formations indexed by name
 */
export const DEFENSE_FORMATIONS: Record<DefenseFormationName, DefenseFormation> = {
  '4-3': FORMATION_4_3,
  '3-4': FORMATION_3_4,
  'NICKEL': FORMATION_NICKEL,
  'DIME': FORMATION_DIME,
  'GOAL_LINE': FORMATION_GOAL_LINE,
  '4-6': FORMATION_4_3, // Fallback to 4-3 for now
  'QUARTER': FORMATION_QUARTER,
};

/**
 * Get formation based on defensive play type
 */
export function getFormationForPlayType(playType: string): DefenseFormationName {
  switch (playType) {
    case 'MAN_COVERAGE':
    case 'ZONE_COVERAGE':
      return '4-3';

    case 'PRESS_COVERAGE':
      return 'NICKEL';

    case 'DEEP_ZONE':
    case 'PREVENT':
      return 'QUARTER';

    case 'BLITZ':
    case 'ZONE_BLITZ':
      return '4-3';  // Will modify assignments for blitz

    case 'CONTAIN':
    case 'SPY':
      return '4-3';

    case 'STACK_THE_BOX':
    case 'GOAL_LINE_STAND':
      return 'GOAL_LINE';

    case 'GUESS_PLAY':
      return 'NICKEL';

    default:
      return '4-3';
  }
}

/**
 * Clone a formation with deep copy of assignments
 */
export function cloneFormation(formation: DefenseFormation): DefenseFormation {
  return {
    name: formation.name,
    assignments: formation.assignments.map(a => ({ ...a, zoneBounds: a.zoneBounds ? { ...a.zoneBounds } : undefined })),
  };
}

/**
 * Apply play type modifications to a formation
 * Returns a new formation with adjusted assignments based on the defensive call
 */
export function applyPlayTypeToFormation(
  baseFormation: DefenseFormation,
  playType: string
): DefenderAssignment[] {
  const assignments = baseFormation.assignments.map(a => ({
    ...a,
    zoneBounds: a.zoneBounds ? { ...a.zoneBounds } : undefined,
  }));

  switch (playType) {
    case 'MAN_COVERAGE':
      // Everyone in man coverage
      assignments.forEach(a => {
        if (a.coverageAssignment?.startsWith('ZONE_')) {
          // Convert zone to man based on position
          if (a.positionSlot === 'WILL' || a.positionSlot === 'MIKE') {
            a.coverageAssignment = 'MAN_RB';
          } else if (a.positionSlot === 'SAM' || a.positionSlot === 'SS') {
            a.coverageAssignment = 'MAN_TE';
          }
        }
        a.readBehavior = 'PASS_FIRST';
      });
      break;

    case 'ZONE_COVERAGE':
      // Everyone in zone
      assignments.forEach(a => {
        if (a.coverageAssignment?.startsWith('MAN_')) {
          // Convert man to zone
          if (a.positionSlot === 'CB_L') a.coverageAssignment = 'ZONE_DEEP_THIRD_L';
          if (a.positionSlot === 'CB_R') a.coverageAssignment = 'ZONE_DEEP_THIRD_R';
          if (a.positionSlot === 'FS') a.coverageAssignment = 'ZONE_DEEP_THIRD_M';
          if (a.positionSlot === 'SS') a.coverageAssignment = 'ZONE_HOOK_R';
        }
        a.readBehavior = 'BALANCED';
      });
      break;

    case 'BLITZ':
      // Send extra rushers
      const lbs = assignments.filter(a =>
        ['WILL', 'MIKE', 'SAM', 'OLB_L', 'OLB_R'].includes(a.positionSlot)
      );
      // Blitz 2 LBs
      lbs.slice(0, 2).forEach(lb => {
        lb.isBlitzing = true;
        lb.coverageAssignment = 'PASS_RUSH';
        lb.readBehavior = 'AGGRESSIVE';
      });
      // Send a safety too sometimes
      const ss = assignments.find(a => a.positionSlot === 'SS');
      if (ss) {
        ss.isBlitzing = true;
        ss.coverageAssignment = 'PASS_RUSH';
        ss.readBehavior = 'AGGRESSIVE';
      }
      break;

    case 'ZONE_BLITZ':
      // Blitz but with zone behind
      const olb = assignments.find(a => a.positionSlot === 'OLB_L' || a.positionSlot === 'WILL');
      if (olb) {
        olb.isBlitzing = true;
        olb.coverageAssignment = 'PASS_RUSH';
        olb.readBehavior = 'AGGRESSIVE';
      }
      // DE drops into coverage
      const de = assignments.find(a => a.positionSlot === 'DE_R');
      if (de) {
        de.isBlitzing = false;
        de.coverageAssignment = 'ZONE_FLAT_R';
        de.readBehavior = 'BALANCED';
      }
      break;

    case 'PRESS_COVERAGE':
      // CBs press at line
      assignments.forEach(a => {
        if (a.positionSlot.startsWith('CB')) {
          a.startY = 51;  // Move up to LOS
          a.readBehavior = 'AGGRESSIVE';
        }
      });
      break;

    case 'CONTAIN':
      // DEs focus on contain
      assignments.forEach(a => {
        if (a.positionSlot === 'DE_L' || a.positionSlot === 'DE_R') {
          a.runAssignment = a.positionSlot === 'DE_L' ? 'CONTAIN_L' : 'CONTAIN_R';
          a.readBehavior = 'BALANCED';
        }
      });
      break;

    case 'SPY':
      // LB spies the QB
      const mike = assignments.find(a => a.positionSlot === 'MIKE');
      if (mike) {
        mike.coverageAssignment = 'SPY_QB';
        mike.readBehavior = 'BALANCED';
      }
      break;

    case 'STACK_THE_BOX':
      // Move safeties up
      assignments.forEach(a => {
        if (a.positionSlot === 'SS' || a.positionSlot === 'FS') {
          a.startY = Math.max(a.startY - 8, 54);
          a.readBehavior = 'RUN_FIRST';
        }
        // Everyone reads run first
        a.readBehavior = 'RUN_FIRST';
      });
      break;

    case 'DEEP_ZONE':
    case 'PREVENT':
      // Everyone drops deep
      assignments.forEach(a => {
        if (a.coverageAssignment?.includes('HOOK') || a.coverageAssignment?.includes('FLAT')) {
          // Move hook zones deeper
          a.startY += 5;
        }
        a.readBehavior = 'PASS_FIRST';
      });
      break;
  }

  return assignments;
}
