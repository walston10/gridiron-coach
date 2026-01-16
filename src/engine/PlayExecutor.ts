/**
 * PlayExecutor - Converts a Play definition into frame-by-frame animation data
 *
 * This is the core engine that takes the static play data (formations, routes, assignments)
 * and generates the movement paths and timing for animating the play.
 */

import type { Play, PlayerAssignment } from '../types/Play';
import type {
  AnimationFrame,
  AnimatedPlayerState,
  AnimatedBallState,
  AnimationPhase,
  AnimationEvent,
  PlayAnimationResult,
  PlayExecutorConfig,
  MovementPath,
  Waypoint,
  PlayOutcome,
} from '../types/PlayAnimation';
import { DEFAULT_EXECUTOR_CONFIG, PLAYER_SPEEDS, YARDS_TO_UNITS } from '../types/PlayAnimation';
import { getRoutePoints } from '../data/routes';

/**
 * Execute a play and generate all animation frames
 */
export function executePlay(
  play: Play,
  config: Partial<PlayExecutorConfig> = {},
  outcome?: Partial<PlayOutcome>
): PlayAnimationResult {
  const cfg = { ...DEFAULT_EXECUTOR_CONFIG, ...config };

  // Generate movement paths for all players
  const paths = generateMovementPaths(play, cfg, outcome);

  // Determine total duration based on the longest path
  const totalDurationMs = Math.max(
    ...paths.map(p => p.waypoints[p.waypoints.length - 1]?.arrivalTimeMs || 0),
    3000 // Minimum 3 seconds
  );

  // Generate frames at 60fps
  const frameIntervalMs = 1000 / 60;
  const frames: AnimationFrame[] = [];

  for (let timeMs = 0; timeMs <= totalDurationMs; timeMs += frameIntervalMs) {
    const frame = generateFrame(play, paths, timeMs, cfg, outcome);
    frames.push(frame);
  }

  // Determine play outcome
  const finalOutcome: PlayOutcome = {
    result: outcome?.result || (play.playType === 'PASS' ? 'COMPLETE' : 'RUSH'),
    yardsGained: outcome?.yardsGained ?? (play.playType === 'PASS' ? 8 : 4),
    targetReceiver: outcome?.targetReceiver,
    tackledBy: outcome?.tackledBy,
  };

  return {
    play,
    totalDurationMs,
    frames,
    outcome: finalOutcome,
  };
}

/**
 * Generate movement paths for all 11 players
 */
function generateMovementPaths(
  play: Play,
  config: PlayExecutorConfig,
  outcome?: Partial<PlayOutcome>
): MovementPath[] {
  const paths: MovementPath[] = [];
  const snapTime = config.preSnapDuration + config.snapDuration;

  for (const assignment of play.assignments) {
    const path = generatePlayerPath(play, assignment, config, snapTime, outcome);
    paths.push(path);
  }

  return paths;
}

/**
 * Generate movement path for a single player based on their assignment
 */
function generatePlayerPath(
  play: Play,
  assignment: PlayerAssignment,
  config: PlayExecutorConfig,
  snapTime: number,
  outcome?: Partial<PlayOutcome>
): MovementPath {
  const waypoints: Waypoint[] = [];
  const startX = assignment.startX;
  const startY = assignment.startY;

  // Everyone starts at their formation position
  waypoints.push({
    x: startX,
    y: startY,
    arrivalTimeMs: 0,
  });

  // Stay at formation until snap
  waypoints.push({
    x: startX,
    y: startY,
    arrivalTimeMs: config.preSnapDuration,
  });

  // After snap - behavior depends on role
  if (assignment.positionSlot === 'QB') {
    generateQBPath(waypoints, play, assignment, config, snapTime, outcome);
  } else if (!assignment.canRunRoutes) {
    // Offensive linemen
    generateOLPath(waypoints, play, assignment, config, snapTime);
  } else if (assignment.route && assignment.route !== 'BLOCK') {
    // Receiver running a route
    generateRoutePath(waypoints, play, assignment, config, snapTime, outcome);
  } else if (assignment.isBallCarrier || assignment.runAssignment) {
    // Running back
    generateRBPath(waypoints, play, assignment, config, snapTime, outcome);
  } else if (assignment.isLeadBlocker) {
    // Fullback/lead blocker
    generateLeadBlockerPath(waypoints, play, assignment, config, snapTime);
  } else {
    // Default - move forward slightly (blocking WRs, etc)
    generateBlockerPath(waypoints, assignment, config, snapTime);
  }

  return {
    playerId: assignment.playerId,
    positionSlot: assignment.positionSlot,
    waypoints,
  };
}

/**
 * Generate QB movement path
 */
function generateQBPath(
  waypoints: Waypoint[],
  play: Play,
  assignment: PlayerAssignment,
  _config: PlayExecutorConfig,
  snapTime: number,
  _outcome?: Partial<PlayOutcome>
): void {
  const startX = assignment.startX;
  const startY = assignment.startY;

  if (play.playType === 'PASS') {
    // Dropback based on pass action
    let dropDepth = 5; // units (about 2.5 yards)
    let dropTime = 800;
    let lateralMovement = 0;

    switch (play.passAction) {
      case '3_STEP':
        dropDepth = 4;
        dropTime = 600;
        break;
      case '5_STEP':
        dropDepth = 7;
        dropTime = 1000;
        break;
      case '7_STEP':
        dropDepth = 10;
        dropTime = 1400;
        break;
      case 'SPRINT_LEFT':
        dropDepth = 3;
        lateralMovement = -15;
        dropTime = 1200;
        break;
      case 'SPRINT_RIGHT':
        dropDepth = 3;
        lateralMovement = 15;
        dropTime = 1200;
        break;
      case 'BOOT_LEFT':
        dropDepth = 2;
        lateralMovement = -20;
        dropTime = 1500;
        break;
      case 'BOOT_RIGHT':
        dropDepth = 2;
        lateralMovement = 20;
        dropTime = 1500;
        break;
    }

    // Dropback position
    waypoints.push({
      x: startX + lateralMovement,
      y: startY + dropDepth,
      arrivalTimeMs: snapTime + dropTime,
    });

    // Throw point (stay in pocket for throw)
    waypoints.push({
      x: startX + lateralMovement,
      y: startY + dropDepth,
      arrivalTimeMs: snapTime + dropTime + 500,
      action: 'THROW',
    });

  } else {
    // Run play - QB hands off or keeps
    if (play.qbRun === 'HANDOFF') {
      // Move toward RB for handoff
      const rb = play.assignments.find(a => a.isHandoffTarget || a.isBallCarrier);
      if (rb) {
        const handoffX = (startX + rb.startX) / 2;
        const handoffY = Math.max(startY, rb.startY - 3);
        waypoints.push({
          x: handoffX,
          y: handoffY,
          arrivalTimeMs: snapTime + 400,
          action: 'HANDOFF',
        });
        // After handoff, drift back
        waypoints.push({
          x: handoffX - 5,
          y: handoffY + 5,
          arrivalTimeMs: snapTime + 1500,
        });
      }
    } else if (play.qbRun === 'QB_SNEAK') {
      // Sneak straight ahead
      waypoints.push({
        x: startX,
        y: startY - 8,
        arrivalTimeMs: snapTime + 800,
      });
    } else if (play.qbRun === 'QB_DRAW' || play.qbRun === 'QB_POWER') {
      // Fake pass then run
      waypoints.push({
        x: startX,
        y: startY + 3,
        arrivalTimeMs: snapTime + 600,
      });
      waypoints.push({
        x: startX,
        y: startY - 15,
        arrivalTimeMs: snapTime + 2000,
      });
    }
  }
}

/**
 * Generate offensive line movement path
 */
function generateOLPath(
  waypoints: Waypoint[],
  _play: Play,
  assignment: PlayerAssignment,
  _config: PlayExecutorConfig,
  snapTime: number
): void {
  const startX = assignment.startX;
  const startY = assignment.startY;
  const blocking = assignment.olBlocking || assignment.blockingAssignment;

  // At snap - fire off the ball
  waypoints.push({
    x: startX,
    y: startY - 2,
    arrivalTimeMs: snapTime + 200,
    action: 'BLOCK',
  });

  switch (blocking) {
    case 'PASS_PRO':
    case 'MAN':
      // Step back and hold position
      waypoints.push({
        x: startX,
        y: startY + 2,
        arrivalTimeMs: snapTime + 400,
      });
      waypoints.push({
        x: startX,
        y: startY + 2,
        arrivalTimeMs: snapTime + 2500,
      });
      break;

    case 'ZONE_LEFT':
      // Step left and upfield
      waypoints.push({
        x: startX - 4,
        y: startY - 4,
        arrivalTimeMs: snapTime + 600,
      });
      waypoints.push({
        x: startX - 6,
        y: startY - 8,
        arrivalTimeMs: snapTime + 1200,
      });
      break;

    case 'ZONE_RIGHT':
      // Step right and upfield
      waypoints.push({
        x: startX + 4,
        y: startY - 4,
        arrivalTimeMs: snapTime + 600,
      });
      waypoints.push({
        x: startX + 6,
        y: startY - 8,
        arrivalTimeMs: snapTime + 1200,
      });
      break;

    case 'PULL_LEFT':
      // Pull across the formation
      waypoints.push({
        x: startX,
        y: startY + 4,
        arrivalTimeMs: snapTime + 300,
      });
      waypoints.push({
        x: startX - 20,
        y: startY + 4,
        arrivalTimeMs: snapTime + 800,
      });
      waypoints.push({
        x: startX - 25,
        y: startY - 8,
        arrivalTimeMs: snapTime + 1400,
      });
      break;

    case 'PULL_RIGHT':
      waypoints.push({
        x: startX,
        y: startY + 4,
        arrivalTimeMs: snapTime + 300,
      });
      waypoints.push({
        x: startX + 20,
        y: startY + 4,
        arrivalTimeMs: snapTime + 800,
      });
      waypoints.push({
        x: startX + 25,
        y: startY - 8,
        arrivalTimeMs: snapTime + 1400,
      });
      break;

    case 'TRAP':
      // Quick pull to trap
      waypoints.push({
        x: startX - 10,
        y: startY - 5,
        arrivalTimeMs: snapTime + 600,
      });
      break;

    case 'DOUBLE_TEAM':
      // Push forward together
      waypoints.push({
        x: startX,
        y: startY - 6,
        arrivalTimeMs: snapTime + 800,
      });
      waypoints.push({
        x: startX,
        y: startY - 10,
        arrivalTimeMs: snapTime + 1500,
      });
      break;

    default:
      // Default forward movement
      waypoints.push({
        x: startX,
        y: startY - 3,
        arrivalTimeMs: snapTime + 500,
      });
  }
}

/**
 * Generate receiver route path
 */
function generateRoutePath(
  waypoints: Waypoint[],
  _play: Play,
  assignment: PlayerAssignment,
  config: PlayExecutorConfig,
  snapTime: number,
  outcome?: Partial<PlayOutcome>
): void {
  const startX = assignment.startX;
  const startY = assignment.startY;

  if (!assignment.route || !assignment.fieldSide) {
    waypoints.push({ x: startX, y: startY - 5, arrivalTimeMs: snapTime + 1000 });
    return;
  }

  // Get route points from the route template
  const routePoints = getRoutePoints(
    assignment.route,
    assignment.fieldSide,
    startX,
    startY
  );

  if (routePoints.length === 0) {
    waypoints.push({ x: startX, y: startY - 5, arrivalTimeMs: snapTime + 1000 });
    return;
  }

  // Calculate timing for each route point
  // Speed varies by route type
  const speedMultiplier = config.routeSpeedMultiplier;
  let currentTime = snapTime;

  // First release off the line
  waypoints.push({
    x: startX,
    y: startY - 2,
    arrivalTimeMs: currentTime + 150,
  });
  currentTime += 150;

  // Traverse route points
  let prevPoint = { x: startX, y: startY - 2 };

  for (let i = 0; i < routePoints.length; i++) {
    const point = routePoints[i];
    const distance = Math.sqrt(
      Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
    );

    // Time = distance / speed (in units per ms)
    const speedUnitsPerMs = (PLAYER_SPEEDS.WR_ROUTE * YARDS_TO_UNITS) / 1000 * speedMultiplier;
    const travelTime = distance / speedUnitsPerMs;

    currentTime += travelTime;

    // Check if this is the target receiver and we should add catch action
    const isTarget = outcome?.targetReceiver === assignment.positionSlot;
    const isLastPoint = i === routePoints.length - 1;

    waypoints.push({
      x: point.x,
      y: point.y,
      arrivalTimeMs: currentTime,
      action: isTarget && isLastPoint ? 'CATCH' : undefined,
    });

    prevPoint = point;
  }

  // If this is the target, continue running after catch
  if (outcome?.targetReceiver === assignment.positionSlot) {
    const lastPoint = routePoints[routePoints.length - 1];
    waypoints.push({
      x: lastPoint.x,
      y: lastPoint.y - 10,
      arrivalTimeMs: currentTime + 800,
      action: 'TACKLE',
    });
  }
}

/**
 * Generate running back path
 */
function generateRBPath(
  waypoints: Waypoint[],
  play: Play,
  assignment: PlayerAssignment,
  _config: PlayExecutorConfig,
  snapTime: number,
  _outcome?: Partial<PlayOutcome>
): void {
  const startX = assignment.startX;
  const startY = assignment.startY;
  const runAssignment = assignment.runAssignment;

  // Determine run path based on assignment
  let runPath: { x: number; y: number; delay: number }[] = [];

  switch (runAssignment) {
    case 'DIVE':
    case 'INSIDE_ZONE':
      // Straight ahead through A gap
      runPath = [
        { x: startX, y: startY - 5, delay: 200 },
        { x: startX, y: startY - 15, delay: 600 },
        { x: startX, y: startY - 25, delay: 1200 },
      ];
      break;

    case 'POWER':
      // Wait for guard, hit B gap
      runPath = [
        { x: startX, y: startY - 3, delay: 300 },
        { x: startX + 8, y: startY - 10, delay: 700 },
        { x: startX + 10, y: startY - 22, delay: 1400 },
      ];
      break;

    case 'COUNTER':
      // Fake one way, cut back
      runPath = [
        { x: startX - 5, y: startY - 2, delay: 200 },
        { x: startX + 5, y: startY - 5, delay: 500 },
        { x: startX + 12, y: startY - 18, delay: 1100 },
      ];
      break;

    case 'SWEEP':
    case 'OUTSIDE_ZONE':
    case 'TOSS':
    case 'STRETCH':
      // Wide run to the edge
      const sweepDir = assignment.runGap?.includes('LEFT') ? -1 : 1;
      runPath = [
        { x: startX + (10 * sweepDir), y: startY, delay: 300 },
        { x: startX + (25 * sweepDir), y: startY - 5, delay: 700 },
        { x: startX + (35 * sweepDir), y: startY - 15, delay: 1300 },
      ];
      break;

    case 'DRAW':
      // Delayed handoff - fake pass protection first
      runPath = [
        { x: startX, y: startY + 2, delay: 400 },
        { x: startX, y: startY - 5, delay: 800 },
        { x: startX, y: startY - 20, delay: 1500 },
      ];
      break;

    case 'ISO':
      // Follow fullback through hole
      runPath = [
        { x: startX, y: startY - 5, delay: 350 },
        { x: startX, y: startY - 15, delay: 800 },
        { x: startX, y: startY - 25, delay: 1400 },
      ];
      break;

    default:
      // Generic run forward
      runPath = [
        { x: startX, y: startY - 10, delay: 500 },
        { x: startX, y: startY - 20, delay: 1200 },
      ];
  }

  // If receiving handoff, account for that
  if (assignment.isHandoffTarget && play.qbRun === 'HANDOFF') {
    // Adjust first waypoint to meet QB
    const qb = play.assignments.find(a => a.positionSlot === 'QB');
    if (qb) {
      waypoints.push({
        x: (startX + qb.startX) / 2 + 2,
        y: startY - 3,
        arrivalTimeMs: snapTime + 400,
        action: 'HANDOFF',
      });
    }
  }

  // Add run path waypoints
  for (const point of runPath) {
    waypoints.push({
      x: point.x,
      y: point.y,
      arrivalTimeMs: snapTime + point.delay + (assignment.isHandoffTarget ? 200 : 0),
    });
  }

  // End with tackle
  const lastPoint = runPath[runPath.length - 1];
  waypoints.push({
    x: lastPoint.x,
    y: lastPoint.y,
    arrivalTimeMs: snapTime + lastPoint.delay + 400 + (assignment.isHandoffTarget ? 200 : 0),
    action: 'TACKLE',
  });
}

/**
 * Generate lead blocker (fullback) path
 */
function generateLeadBlockerPath(
  waypoints: Waypoint[],
  play: Play,
  assignment: PlayerAssignment,
  _config: PlayExecutorConfig,
  snapTime: number
): void {
  const startX = assignment.startX;
  const startY = assignment.startY;

  // Find the ball carrier to lead block for
  const rb = play.assignments.find(a => a.isBallCarrier);
  if (!rb) {
    waypoints.push({ x: startX, y: startY - 10, arrivalTimeMs: snapTime + 800 });
    return;
  }

  // Lead through the hole
  const direction = rb.runGap?.includes('LEFT') ? -1 : rb.runGap?.includes('RIGHT') ? 1 : 0;

  waypoints.push({
    x: startX + (5 * direction),
    y: startY - 8,
    arrivalTimeMs: snapTime + 400,
    action: 'BLOCK',
  });

  waypoints.push({
    x: startX + (8 * direction),
    y: startY - 18,
    arrivalTimeMs: snapTime + 900,
  });

  waypoints.push({
    x: startX + (10 * direction),
    y: startY - 25,
    arrivalTimeMs: snapTime + 1400,
  });
}

/**
 * Generate path for blocking receivers (stalk block, crack block, etc.)
 */
function generateBlockerPath(
  waypoints: Waypoint[],
  assignment: PlayerAssignment,
  _config: PlayExecutorConfig,
  snapTime: number
): void {
  const startX = assignment.startX;
  const startY = assignment.startY;

  // Move forward to engage defender
  waypoints.push({
    x: startX,
    y: startY - 5,
    arrivalTimeMs: snapTime + 400,
    action: 'BLOCK',
  });

  // Push forward
  waypoints.push({
    x: startX,
    y: startY - 12,
    arrivalTimeMs: snapTime + 1000,
  });

  // Sustain block
  waypoints.push({
    x: startX,
    y: startY - 15,
    arrivalTimeMs: snapTime + 2000,
  });
}

/**
 * Generate a single animation frame by interpolating player positions
 */
function generateFrame(
  play: Play,
  paths: MovementPath[],
  timeMs: number,
  config: PlayExecutorConfig,
  outcome?: Partial<PlayOutcome>
): AnimationFrame {
  const players: AnimatedPlayerState[] = [];

  // Determine current phase
  const phase = determinePhase(timeMs, config, play, outcome);

  // Interpolate each player's position
  for (const path of paths) {
    const assignment = play.assignments.find(a => a.positionSlot === path.positionSlot);
    if (!assignment) continue;

    const position = interpolatePosition(path.waypoints, timeMs);
    const currentAction = getCurrentAction(path.waypoints, timeMs);

    // Build path history for route visualization
    const pathHistory: { x: number; y: number }[] = [];
    if (config.showRouteTrails && assignment.route) {
      for (let t = config.preSnapDuration; t < timeMs; t += 50) {
        const pos = interpolatePosition(path.waypoints, t);
        pathHistory.push({ x: pos.x, y: pos.y });
      }
    }

    // Determine player role
    let role: AnimatedPlayerState['role'] = 'RECEIVER';
    if (assignment.positionSlot === 'QB') role = 'QB';
    else if (!assignment.canRunRoutes) role = 'OL';
    else if (assignment.isBallCarrier || assignment.runAssignment) role = 'RB';
    else if (assignment.isLeadBlocker || assignment.receiverBlock) role = 'BLOCKER';

    // Determine if this player has the ball
    const hasBall = determineBallCarrier(play, path.positionSlot, timeMs, config, outcome);

    players.push({
      playerId: path.playerId,
      positionSlot: path.positionSlot,
      label: assignment.label,
      x: position.x,
      y: position.y,
      hasBall,
      isBlocking: currentAction === 'BLOCK' || role === 'OL' || role === 'BLOCKER',
      isRunningRoute: !!assignment.route && phase === 'DEVELOPING',
      isTackled: currentAction === 'TACKLE',
      role,
      pathHistory,
    });
  }

  // Generate ball state
  const ball = generateBallState(play, players, timeMs, config, outcome);

  // Check for events at this time
  const event = getEventAtTime(paths, timeMs, config, play);

  return {
    timeMs,
    players,
    ball,
    phase,
    event,
  };
}

/**
 * Determine the current phase of the play
 */
function determinePhase(
  timeMs: number,
  config: PlayExecutorConfig,
  play: Play,
  _outcome?: Partial<PlayOutcome>
): AnimationPhase {
  const snapTime = config.preSnapDuration;
  const postSnapTime = timeMs - snapTime;

  if (timeMs < config.preSnapDuration) {
    return 'PRE_SNAP';
  }

  if (timeMs < snapTime + config.snapDuration) {
    return 'SNAP';
  }

  if (play.playType === 'RUN') {
    if (postSnapTime < 500) return 'HANDOFF';
    if (postSnapTime < 2500) return 'RUNNING';
    return 'TACKLE';
  }

  // Pass play phases
  if (postSnapTime < 1000) return 'DEVELOPING';
  if (postSnapTime < 1500) return 'THROW';
  if (postSnapTime < 2000) return 'BALL_IN_AIR';
  if (postSnapTime < 2500) return 'CATCH';
  if (postSnapTime < 3500) return 'RUN_AFTER_CATCH';
  return 'TACKLE';
}

/**
 * Interpolate position between waypoints
 */
function interpolatePosition(
  waypoints: Waypoint[],
  timeMs: number
): { x: number; y: number } {
  if (waypoints.length === 0) return { x: 50, y: 50 };
  if (waypoints.length === 1) return { x: waypoints[0].x, y: waypoints[0].y };

  // Find the two waypoints we're between
  let prevWaypoint = waypoints[0];
  let nextWaypoint = waypoints[waypoints.length - 1];

  for (let i = 0; i < waypoints.length - 1; i++) {
    if (timeMs >= waypoints[i].arrivalTimeMs && timeMs <= waypoints[i + 1].arrivalTimeMs) {
      prevWaypoint = waypoints[i];
      nextWaypoint = waypoints[i + 1];
      break;
    }
  }

  // If we're past all waypoints, stay at last position
  if (timeMs >= nextWaypoint.arrivalTimeMs) {
    return { x: nextWaypoint.x, y: nextWaypoint.y };
  }

  // If we're before first waypoint
  if (timeMs <= prevWaypoint.arrivalTimeMs) {
    return { x: prevWaypoint.x, y: prevWaypoint.y };
  }

  // Interpolate
  const duration = nextWaypoint.arrivalTimeMs - prevWaypoint.arrivalTimeMs;
  const elapsed = timeMs - prevWaypoint.arrivalTimeMs;
  const t = duration > 0 ? elapsed / duration : 0;

  // Ease-out for more natural movement
  const easedT = 1 - Math.pow(1 - t, 2);

  return {
    x: prevWaypoint.x + (nextWaypoint.x - prevWaypoint.x) * easedT,
    y: prevWaypoint.y + (nextWaypoint.y - prevWaypoint.y) * easedT,
  };
}

/**
 * Get the current action at this time
 */
function getCurrentAction(
  waypoints: Waypoint[],
  timeMs: number
): string | undefined {
  for (const wp of waypoints) {
    if (Math.abs(wp.arrivalTimeMs - timeMs) < 100 && wp.action) {
      return wp.action;
    }
  }
  return undefined;
}

/**
 * Determine who has the ball at this time
 */
function determineBallCarrier(
  play: Play,
  positionSlot: string,
  timeMs: number,
  config: PlayExecutorConfig,
  outcome?: Partial<PlayOutcome>
): boolean {
  const snapTime = config.preSnapDuration;

  // Before snap, QB/Center has ball
  if (timeMs < snapTime) {
    return positionSlot === 'QB' || positionSlot === 'C';
  }

  const postSnapTime = timeMs - snapTime;

  if (play.playType === 'RUN') {
    // QB has ball initially, then RB after handoff (~400ms)
    if (postSnapTime < 400) {
      return positionSlot === 'QB';
    }
    const rb = play.assignments.find(a => a.isBallCarrier);
    return positionSlot === rb?.positionSlot;
  }

  // Pass play
  if (postSnapTime < 1500) {
    // QB has ball during dropback
    return positionSlot === 'QB';
  }

  if (postSnapTime < 2000) {
    // Ball in air - no one has it
    return false;
  }

  // After catch, target receiver has it
  return positionSlot === outcome?.targetReceiver;
}

/**
 * Generate ball state for the frame
 */
function generateBallState(
  play: Play,
  players: AnimatedPlayerState[],
  timeMs: number,
  config: PlayExecutorConfig,
  outcome?: Partial<PlayOutcome>
): AnimatedBallState {
  const snapTime = config.preSnapDuration;
  const postSnapTime = timeMs - snapTime;

  // Find ball carrier
  const carrier = players.find(p => p.hasBall);

  if (carrier) {
    return {
      x: carrier.x,
      y: carrier.y,
      isVisible: true,
      isInAir: false,
      carrier: carrier.positionSlot,
    };
  }

  // Ball in air (pass play)
  if (play.playType === 'PASS' && postSnapTime >= 1500 && postSnapTime < 2000) {
    const qb = players.find(p => p.positionSlot === 'QB');
    const target = players.find(p => p.positionSlot === outcome?.targetReceiver);

    if (qb && target) {
      const t = (postSnapTime - 1500) / 500;
      return {
        x: qb.x + (target.x - qb.x) * t,
        y: qb.y + (target.y - qb.y) * t - (Math.sin(t * Math.PI) * 10), // Arc
        isVisible: true,
        isInAir: true,
        carrier: null,
      };
    }
  }

  // Default - ball at center
  return {
    x: 50,
    y: 50,
    isVisible: timeMs > snapTime - 100,
    isInAir: false,
    carrier: null,
  };
}

/**
 * Get any event that occurs at this time
 */
function getEventAtTime(
  _paths: MovementPath[],
  timeMs: number,
  config: PlayExecutorConfig,
  play: Play
): AnimationEvent | undefined {
  const snapTime = config.preSnapDuration;

  // Check for snap
  if (Math.abs(timeMs - snapTime) < 20) {
    return { type: 'SNAP', description: 'Ball snapped' };
  }

  // Check for handoff
  if (play.playType === 'RUN' && play.qbRun === 'HANDOFF') {
    if (Math.abs(timeMs - (snapTime + 400)) < 20) {
      const rb = play.assignments.find(a => a.isBallCarrier);
      return {
        type: 'HANDOFF',
        playerId: rb?.positionSlot,
        description: `Handoff to ${rb?.label || 'RB'}`,
      };
    }
  }

  // Check for throw
  if (play.playType === 'PASS') {
    if (Math.abs(timeMs - (snapTime + 1500)) < 20) {
      return { type: 'THROW', playerId: 'QB', description: 'Pass thrown' };
    }
    if (Math.abs(timeMs - (snapTime + 2000)) < 20) {
      return { type: 'CATCH', description: 'Pass caught!' };
    }
  }

  return undefined;
}

/**
 * Export a simpler function to get just the first receiver with a route
 * (for default target selection)
 */
export function getDefaultTargetReceiver(play: Play): string | undefined {
  const receivers = play.assignments.filter(
    a => a.route && a.route !== 'BLOCK' && a.canRunRoutes
  );

  // Prefer slot or primary receivers
  const preferredOrder = ['H', 'Y', 'X', 'Z', 'RB', 'FB'];
  for (const slot of preferredOrder) {
    const receiver = receivers.find(r => r.positionSlot === slot);
    if (receiver) return receiver.positionSlot;
  }

  return receivers[0]?.positionSlot;
}
