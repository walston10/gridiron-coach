import type {
  Play,
  PlayerAssignment,
  FieldSide,
  OLBlockingAssignment,
  PassAction,
  RunGap,
  ProtectionScheme,
  MotionAssignment,
} from '../types';

/**
 * Flip a field side to its mirror
 */
const flipFieldSide = (side: FieldSide): FieldSide => {
  if (side === 'LEFT') return 'RIGHT';
  if (side === 'RIGHT') return 'LEFT';
  return 'CENTER';
};

/**
 * Flip OL blocking assignment direction
 */
const flipBlocking = (blocking: OLBlockingAssignment | undefined): OLBlockingAssignment | undefined => {
  if (!blocking) return undefined;
  switch (blocking) {
    case 'ZONE_LEFT': return 'ZONE_RIGHT';
    case 'ZONE_RIGHT': return 'ZONE_LEFT';
    case 'PULL_LEFT': return 'PULL_RIGHT';
    case 'PULL_RIGHT': return 'PULL_LEFT';
    default: return blocking;
  }
};

/**
 * Flip pass action direction
 */
const flipPassAction = (action: PassAction | undefined): PassAction | undefined => {
  if (!action) return undefined;
  switch (action) {
    case 'SPRINT_LEFT': return 'SPRINT_RIGHT';
    case 'SPRINT_RIGHT': return 'SPRINT_LEFT';
    case 'BOOT_LEFT': return 'BOOT_RIGHT';
    case 'BOOT_RIGHT': return 'BOOT_LEFT';
    default: return action;
  }
};

/**
 * Flip run gap direction
 */
const flipRunGap = (gap: RunGap | undefined): RunGap | undefined => {
  if (!gap) return undefined;
  switch (gap) {
    case 'A_LEFT': return 'A_RIGHT';
    case 'A_RIGHT': return 'A_LEFT';
    case 'B_LEFT': return 'B_RIGHT';
    case 'B_RIGHT': return 'B_LEFT';
    case 'C_LEFT': return 'C_RIGHT';
    case 'C_RIGHT': return 'C_LEFT';
    case 'D_LEFT': return 'D_RIGHT';
    case 'D_RIGHT': return 'D_LEFT';
    default: return gap;
  }
};

/**
 * Flip protection scheme direction
 */
const flipProtectionScheme = (scheme: ProtectionScheme | undefined): ProtectionScheme | undefined => {
  if (!scheme) return undefined;
  switch (scheme) {
    case 'HALF_SLIDE_LEFT': return 'HALF_SLIDE_RIGHT';
    case 'HALF_SLIDE_RIGHT': return 'HALF_SLIDE_LEFT';
    case 'FULL_SLIDE_LEFT': return 'FULL_SLIDE_RIGHT';
    case 'FULL_SLIDE_RIGHT': return 'FULL_SLIDE_LEFT';
    default: return scheme;
  }
};

/**
 * Flip a motion assignment
 */
const flipMotionAssignment = (motion: MotionAssignment | undefined): MotionAssignment | undefined => {
  if (!motion) return undefined;
  return {
    ...motion,
    path: motion.path.map(point => ({
      x: 100 - point.x,
      y: point.y,
    })),
  };
};

/**
 * Flip a player assignment to its mirror
 */
const flipPlayerAssignment = (assignment: PlayerAssignment): PlayerAssignment => {
  return {
    ...assignment,
    startX: 100 - assignment.startX,
    fieldSide: flipFieldSide(assignment.fieldSide),
    olBlocking: flipBlocking(assignment.olBlocking),
    blockingAssignment: flipBlocking(assignment.blockingAssignment),
    runGap: flipRunGap(assignment.runGap),
    motion: flipMotionAssignment(assignment.motion),
    motionPath: assignment.motionPath?.map(point => ({
      x: 100 - point.x,
      y: point.y,
    })),
    customRoutePoints: assignment.customRoutePoints?.map(point => ({
      x: 100 - point.x,
      y: point.y,
    })),
  };
};

/**
 * Create a flipped/mirrored version of a play
 * This creates a new play with all positions and directions mirrored
 */
export function flipPlay(play: Play): Play {
  return {
    ...play,
    id: play.id, // Keep same ID - we're modifying in place
    assignments: play.assignments.map(flipPlayerAssignment),
    passAction: flipPassAction(play.passAction),
    protectionScheme: flipProtectionScheme(play.protectionScheme),
    motion: flipMotionAssignment(play.motion),
  };
}

/**
 * Create a flipped copy of a play with a new ID
 */
export function createFlippedPlayCopy(play: Play, newId: string): Play {
  const flipped = flipPlay(play);
  return {
    ...flipped,
    id: newId,
    name: `${play.name} (Flipped)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
