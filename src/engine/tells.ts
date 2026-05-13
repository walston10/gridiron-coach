/**
 * Scout tells — pre-snap visual hints about what the defense will do.
 *
 * Re-derives defender assignments client-side from the same APIs the simulator
 * uses, so the tells are guaranteed to match the actual defensive call.
 * Each tell is gated by a scout grade — higher grade = more revealed.
 */

import type { DefensiveCard } from '../types/card.types';
import type { DefenderAssignment } from '../types/DefenseFormation';
import {
  DEFENSE_FORMATIONS,
  getFormationForPlayType,
  applyPlayTypeToFormation,
} from '../data/defenseFormations';

/** Scout report quality — drives how much pre-snap information is revealed. */
export type ScoutGrade = 'A' | 'B' | 'C' | 'D';

/**
 * Derive the same defender assignments the simulator uses for this card.
 * Y coordinates are pre-flip (the simulator flips Y on init).
 */
export function deriveAssignments(defenseCard: DefensiveCard): DefenderAssignment[] {
  const formationName = getFormationForPlayType(defenseCard.playType);
  const baseFormation = DEFENSE_FORMATIONS[formationName];
  return applyPlayTypeToFormation(baseFormation, defenseCard.playType);
}

/**
 * The kind of tell a single defender produces, derived from their assignment.
 * `null` = nothing interesting to show for this defender.
 */
export type TellKind =
  | 'BLITZ'         // Will rush the QB
  | 'DEEP'          // Deep-zone safety
  | 'SPY'           // QB spy
  | 'MAN'           // Man coverage
  | 'FLAT'          // Flat zone (underneath, sideline)
  | 'HOOK'          // Hook/curl zone (underneath, middle);

export interface DefenderTell {
  positionSlot: string;
  kind: TellKind;
  /** Short label shown over the defender (e.g. "BLITZ", "DEEP", "MAN"). */
  label: string;
}

/**
 * Map a defender's assignment to a TellKind.
 */
function tellForAssignment(a: DefenderAssignment): DefenderTell | null {
  if (a.isBlitzing) {
    return { positionSlot: a.positionSlot, kind: 'BLITZ', label: 'BLITZ' };
  }
  const cov = a.coverageAssignment;
  if (!cov) return null;

  if (cov === 'SPY_QB') return { positionSlot: a.positionSlot, kind: 'SPY', label: 'SPY' };
  if (cov === 'PASS_RUSH') return { positionSlot: a.positionSlot, kind: 'BLITZ', label: 'RUSH' };

  if (cov.startsWith('MAN_')) {
    return { positionSlot: a.positionSlot, kind: 'MAN', label: 'MAN' };
  }
  if (cov.startsWith('ZONE_DEEP_')) {
    return { positionSlot: a.positionSlot, kind: 'DEEP', label: 'DEEP' };
  }
  if (cov.startsWith('ZONE_FLAT_')) {
    return { positionSlot: a.positionSlot, kind: 'FLAT', label: 'FLAT' };
  }
  if (cov.startsWith('ZONE_HOOK_') || cov === 'ZONE_MIDDLE') {
    return { positionSlot: a.positionSlot, kind: 'HOOK', label: 'HOOK' };
  }
  return null;
}

/**
 * Tells that pass the scout-grade gate.
 * - A: everything (BLITZ, DEEP, SPY, MAN, FLAT, HOOK)
 * - B: BLITZ, DEEP, SPY (the high-impact reveals)
 * - C: BLITZ only (you can tell heat is coming, but not coverage shape)
 * - D: nothing
 */
const TELLS_BY_GRADE: Record<ScoutGrade, ReadonlySet<TellKind>> = {
  A: new Set<TellKind>(['BLITZ', 'DEEP', 'SPY', 'MAN', 'FLAT', 'HOOK']),
  B: new Set<TellKind>(['BLITZ', 'DEEP', 'SPY']),
  C: new Set<TellKind>(['BLITZ']),
  D: new Set<TellKind>(),
};

/**
 * Produce the visible tells for a given defense + scout grade.
 */
export function tellsFor(defenseCard: DefensiveCard, grade: ScoutGrade): DefenderTell[] {
  const assignments = deriveAssignments(defenseCard);
  const allowed = TELLS_BY_GRADE[grade];
  const out: DefenderTell[] = [];
  for (const a of assignments) {
    const t = tellForAssignment(a);
    if (t && allowed.has(t.kind)) out.push(t);
  }
  return out;
}

/** Display name for the grade. */
export function gradeLabel(grade: ScoutGrade): string {
  switch (grade) {
    case 'A': return 'Elite scout';
    case 'B': return 'Good scout';
    case 'C': return 'Basic scout';
    case 'D': return 'No scout';
  }
}
