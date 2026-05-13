/**
 * Drive state engine — pure logic.
 *
 * Tracks one offensive drive: down, distance, ball position, score. Applies
 * a play outcome to the state and detects drive-ending conditions.
 *
 * Field convention: ballOn is the yardline (0–100) from the offense's own
 * goal line. 25 = own 25-yard line. 100 = scored a TD. 0 = safety.
 * yardsToGo is yards remaining for a first down.
 */

import type { PlayOutcome } from '../types/PlayAnimation';

export type DriveEndReason =
  | 'TOUCHDOWN'           // Crossed the goal line (+6 → +7 after PAT, simplified to +7)
  | 'TURNOVER'            // INT or FUMBLE
  | 'TURNOVER_ON_DOWNS'   // Failed 4th-down conversion
  | 'PUNT'                // Voluntarily punted on 4th
  | 'FIELD_GOAL'          // Voluntarily kicked FG on 4th
  | 'SAFETY';             // Tackled in own end zone

export interface DriveState {
  /** Current down (1–4). */
  down: number;
  /** Yards to go for a first down. */
  yardsToGo: number;
  /** Ball position, 0–100 yardline from offense's own goal (50 = midfield). */
  ballOn: number;
  /** Yardline where the current set of downs started, for first-down math. */
  firstDownTarget: number;
  /** Cumulative offensive score (+7 per TD, +3 per FG). */
  score: number;
  /** Plays run on this drive (for stats / display). */
  playsRun: number;
  /** Drive is over — caller should reset or move on. */
  driveOver: boolean;
  driveOverReason: DriveEndReason | null;
  /** Description of the last play's result, for the HUD line. */
  lastPlaySummary: string | null;
}

/** Start a fresh drive at the given yardline (default own 25). */
export function startDrive(startingYardline: number = 25): DriveState {
  return {
    down: 1,
    yardsToGo: 10,
    ballOn: startingYardline,
    firstDownTarget: Math.min(100, startingYardline + 10),
    score: 0,
    playsRun: 0,
    driveOver: false,
    driveOverReason: null,
    lastPlaySummary: null,
  };
}

/** Restart the down series after a first down. */
function newDownsFrom(ballOn: number, score: number, playsRun: number): Partial<DriveState> {
  // Yards to go capped by goal-to-go distance.
  const distanceToGoal = 100 - ballOn;
  const yardsToGo = Math.min(10, distanceToGoal);
  return {
    down: 1,
    yardsToGo,
    firstDownTarget: ballOn + yardsToGo,
    score,
    playsRun,
  };
}

/**
 * Apply a play outcome to the drive state. Pure function — caller swaps in
 * the new state. Handles TDs, turnovers, first downs, regular down advance.
 *
 * `outcome.yardsGained` is interpreted in actual yards (post-conversion
 * from the simulator's field units). Negative for sacks / TFLs.
 */
export function applyPlayOutcome(state: DriveState, outcome: PlayOutcome): DriveState {
  if (state.driveOver) return state;

  const playsRun = state.playsRun + 1;
  const grossYards = Math.round(outcome.yardsGained);

  // Turnovers end the drive immediately, regardless of yards.
  if (outcome.result === 'INTERCEPTION' || outcome.result === 'FUMBLE') {
    return {
      ...state,
      playsRun,
      driveOver: true,
      driveOverReason: 'TURNOVER',
      lastPlaySummary: `${outcome.result === 'INTERCEPTION' ? 'Intercepted' : 'Fumble lost'} — drive over`,
    };
  }

  // Move the ball. Clamp to the field. (We don't wrap negative past own goal yet.)
  let ballOn = Math.max(0, Math.min(100, state.ballOn + grossYards));

  // Touchdown — crossed the opponent's goal line.
  if (ballOn >= 100) {
    return {
      ...state,
      ballOn: 100,
      playsRun,
      score: state.score + 7,
      driveOver: true,
      driveOverReason: 'TOUCHDOWN',
      lastPlaySummary: `TOUCHDOWN — ${formatYards(grossYards)}`,
    };
  }

  // Safety — tackled in own end zone (rare; only on big losses near own goal).
  if (ballOn <= 0) {
    return {
      ...state,
      ballOn: 0,
      playsRun,
      driveOver: true,
      driveOverReason: 'SAFETY',
      lastPlaySummary: `Safety — tackled in own end zone`,
    };
  }

  // First down?
  if (ballOn >= state.firstDownTarget) {
    return {
      ...state,
      ballOn,
      lastPlaySummary: `${describePlay(outcome)} (1st DOWN)`,
      ...newDownsFrom(ballOn, state.score, playsRun),
      driveOver: false,
      driveOverReason: null,
    } as DriveState;
  }

  // No first down. Advance the down.
  const nextDown = state.down + 1;
  if (nextDown > 4) {
    // Turnover on downs.
    return {
      ...state,
      ballOn,
      playsRun,
      driveOver: true,
      driveOverReason: 'TURNOVER_ON_DOWNS',
      lastPlaySummary: `${describePlay(outcome)} — turnover on downs`,
    };
  }

  return {
    ...state,
    ballOn,
    yardsToGo: Math.max(0, state.firstDownTarget - ballOn),
    down: nextDown,
    playsRun,
    lastPlaySummary: describePlay(outcome),
  };
}

/**
 * Voluntary 4th-down decisions. Caller invokes one of these instead of
 * snapping. The drive ends; the slice resets to a new drive.
 */
export function punt(state: DriveState): DriveState {
  return {
    ...state,
    driveOver: true,
    driveOverReason: 'PUNT',
    lastPlaySummary: 'Punted',
  };
}

export function attemptFieldGoal(state: DriveState): DriveState {
  // Quick & dirty: success rate scales with distance.
  // FG distance = (100 - ballOn) yards from goal line + ~17 yards for the snap/holder.
  const fgDistance = (100 - state.ballOn) + 17;
  // Crude probability curve: 95% inside 35, scales down to ~30% at 55+.
  const successRate = fgDistance <= 35 ? 0.95
    : fgDistance <= 45 ? 0.78
    : fgDistance <= 55 ? 0.55
    : 0.30;
  const made = Math.random() < successRate;

  return {
    ...state,
    score: made ? state.score + 3 : state.score,
    driveOver: true,
    driveOverReason: 'FIELD_GOAL',
    lastPlaySummary: made
      ? `Field goal good (${fgDistance} yards)`
      : `Field goal NO GOOD (${fgDistance} yards)`,
  };
}

/** Human-friendly down/distance/spot line: "1st & 10 at OWN 25". */
export function formatDownDistance(state: DriveState): string {
  const ord = state.down === 1 ? '1st'
    : state.down === 2 ? '2nd'
    : state.down === 3 ? '3rd' : '4th';
  const distance = state.firstDownTarget >= 100 ? 'GOAL' : state.yardsToGo.toString();
  return `${ord} & ${distance} at ${formatBallOn(state.ballOn)}`;
}

/** Format ball position: 1–49 = OWN, 50 = MIDFIELD, 51–99 = OPP, 100 = TD. */
export function formatBallOn(ballOn: number): string {
  if (ballOn === 50) return 'MIDFIELD';
  if (ballOn === 100) return 'OPP GOAL';
  if (ballOn === 0) return 'OWN GOAL';
  if (ballOn < 50) return `OWN ${Math.round(ballOn)}`;
  return `OPP ${Math.round(100 - ballOn)}`;
}

function formatYards(n: number): string {
  if (n === 0) return 'no gain';
  if (n > 0) return `+${n} yd`;
  return `${n} yd`;
}

function describePlay(outcome: PlayOutcome): string {
  const y = formatYards(Math.round(outcome.yardsGained));
  switch (outcome.result) {
    case 'COMPLETE':   return `Complete, ${y}`;
    case 'INCOMPLETE': return 'Incomplete';
    case 'SACK':       return `Sacked, ${y}`;
    case 'RUSH':       return `Run, ${y}`;
    case 'TOUCHDOWN':  return `TD ${y}`;
    default:           return y;
  }
}
