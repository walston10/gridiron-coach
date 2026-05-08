/**
 * PlaySimulator - Real-time play simulation engine
 *
 * Simulates offensive plays against defensive AI to determine outcomes.
 * The animation IS the game - defenders react and the outcome is determined
 * by when/where tackles occur, passes are defended, etc.
 */

import type { Play, PlayerAssignment } from '../types/Play';
import type { DefensiveCard } from '../types/card.types';
import type {
  DefenderAssignment,
  DefenderState,
  DefensePositionSlot,
  CoverageAssignment,
} from '../types/DefenseFormation';
import type {
  AnimationFrame,
  AnimatedPlayerState,
  AnimatedBallState,
  AnimationPhase,
  PlayOutcome,
  Waypoint,
} from '../types/PlayAnimation';
import { YARDS_TO_UNITS, PLAYER_SPEEDS } from '../types/PlayAnimation';
import { DEFENDER_SPEEDS, ZONE_BOUNDARIES } from '../types/DefenseFormation';
import { DEFENSE_FORMATIONS, getFormationForPlayType, applyPlayTypeToFormation } from '../data/defenseFormations';
import { getRoutePoints } from '../data/routes';

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  tickIntervalMs: number;      // Simulation tick rate (default 16ms = 60fps)
  maxDurationMs: number;       // Maximum play duration
  tackleRadius: number;        // Distance for tackle (in field units)
  coverageRadius: number;      // Distance for pass breakup (in field units)
  catchRadius: number;         // Distance receiver needs to be "open"
  preSnapDurationMs: number;   // Time before snap
  qbThrowTimeMs: number;       // Min time before QB throws

  /**
   * Optional override: force the QB to target this position slot (e.g. 'WR1', 'TE', 'RB').
   * When set, replaces the internal AI receiver selection. Used by the Key Frame
   * branched-precompute system to simulate one play multiple times with different
   * pinned reads, then let the player pick which branch is canon mid-snap.
   */
  pinnedTargetReceiver?: string;

  /**
   * Optional override: force a throw-away (incomplete sideline pass).
   * When true, QB throws to a sideline-out point with no receiver target,
   * producing an INCOMPLETE outcome. Used as the Key Frame "bail" branch.
   */
  pinnedThrowAway?: boolean;

  /**
   * Optional override: replace the RB's generated run path with an explicit
   * waypoint sequence. Used by the Key Frame branched-precompute system to
   * simulate a run play with different lane choices (assigned / bounce / cutback).
   * Each entry is `{ x, y, delay }` where delay is ms after the previous waypoint.
   */
  pinnedRunPath?: { x: number; y: number; delay: number }[];
}

const DEFAULT_CONFIG: SimulationConfig = {
  tickIntervalMs: 16,
  maxDurationMs: 8000,
  tackleRadius: 2.5,      // Slightly smaller - need to be closer for tackle
  coverageRadius: 4,      // Coverage radius for pass breakup
  catchRadius: 4,
  preSnapDurationMs: 800,
  qbThrowTimeMs: 1000,    // Reduced from 1500 - QB can throw faster
};

/**
 * Simulation state tracked during play execution
 */
interface SimulationState {
  timeMs: number;
  phase: AnimationPhase;

  // Offense
  offensePlayers: OffensePlayerState[];
  ballCarrier: string | null;  // Position slot of ball carrier
  targetReceiver: string | null;  // Who QB is throwing to

  // Defense
  defenders: DefenderState[];

  // Ball
  ball: AnimatedBallState;
  ballInAir: boolean;
  ballThrowTime: number | null;
  ballCatchTime: number | null;

  // Outcome tracking
  playEnded: boolean;
  endReason: 'TACKLE' | 'OUT_OF_BOUNDS' | 'TOUCHDOWN' | 'INCOMPLETE' | 'INTERCEPTION' | 'SACK' | 'FUMBLE' | null;
  yardsGained: number;
  tackledBy: DefensePositionSlot | null;

  // Key Frame branch flags
  throwAway: boolean;  // QB will bail to sideline (incomplete by design)
}

interface OffensePlayerState {
  positionSlot: string;
  x: number;
  y: number;
  path: Waypoint[];
  currentWaypointIndex: number;
  role: string;
  hasBall: boolean;
  isBlocked: boolean;
  speed: number;
}

/**
 * Result from running a simulation
 */
export interface SimulationResult {
  frames: AnimationFrame[];
  outcome: PlayOutcome;
  totalDurationMs: number;
  tackleLocation: { x: number; y: number } | null;
  tackledBy: DefensePositionSlot | null;
}

/**
 * Main simulation function
 */
export function simulatePlay(
  play: Play,
  defenseCard: DefensiveCard,
  offenseRatings: OffenseRatings,
  defenseRatings: DefenseRatings,
  config: Partial<SimulationConfig> = {}
): SimulationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get defensive formation and apply play type
  const formationName = getFormationForPlayType(defenseCard.playType);
  const baseFormation = DEFENSE_FORMATIONS[formationName];
  const defenseAssignments = applyPlayTypeToFormation(baseFormation, defenseCard.playType);

  // Initialize simulation state
  const state = initializeSimulation(play, defenseAssignments, defenseRatings, cfg);

  // Determine target receiver for pass plays.
  // If the caller pinned a target (Key Frame branch), use it; otherwise fall back to AI selection.
  if (play.playType === 'PASS') {
    if (cfg.pinnedThrowAway) {
      // Throw-away branch has no receiver target; handleQBThrow will detect this.
      state.targetReceiver = null;
    } else if (cfg.pinnedTargetReceiver) {
      state.targetReceiver = cfg.pinnedTargetReceiver;
    } else {
      state.targetReceiver = selectTargetReceiver(play, state.defenders);
    }
  }

  // Run simulation
  const frames: AnimationFrame[] = [];

  while (!state.playEnded && state.timeMs < cfg.maxDurationMs) {
    // Generate frame
    const frame = generateSimulationFrame(state, play, defenseCard);
    frames.push(frame);

    // Advance simulation
    tickSimulation(state, play, defenseCard, offenseRatings, defenseRatings, cfg);

    state.timeMs += cfg.tickIntervalMs;
  }

  // Calculate yards gained based on where ball carrier ended up
  const yardsGained = calculateYardsFromPosition(state, play);

  // Build outcome
  const outcome: PlayOutcome = {
    result: determineOutcomeResult(state, play),
    yardsGained,
    targetReceiver: state.targetReceiver || undefined,
    tackledBy: state.tackledBy || undefined,
  };

  return {
    frames,
    outcome,
    totalDurationMs: state.timeMs,
    tackleLocation: state.ballCarrier ? findPlayerPosition(state, state.ballCarrier) : null,
    tackledBy: state.tackledBy,
  };
}

/**
 * Initialize simulation state
 */
function initializeSimulation(
  play: Play,
  defenseAssignments: DefenderAssignment[],
  defenseRatings: DefenseRatings,
  config: SimulationConfig
): SimulationState {
  // Initialize offense players from play assignments
  const offensePlayers: OffensePlayerState[] = play.assignments.map(assignment => {
    const path = generateOffensePath(play, assignment, config.preSnapDurationMs, config.pinnedRunPath);
    const speed = getOffenseSpeed(assignment);

    return {
      positionSlot: assignment.positionSlot,
      x: assignment.startX,
      y: assignment.startY,
      path,
      currentWaypointIndex: 0,
      role: determineRole(assignment),
      hasBall: assignment.positionSlot === 'QB',
      isBlocked: false,
      speed,
    };
  });

  // Initialize defenders
  // NOTE: Defense formations use Y > 50 for deeper coverage, but canvas renders
  // Y > 50 as below LOS (offensive side). Flip Y to put defenders above LOS.
  const defenders: DefenderState[] = defenseAssignments.map(assignment => {
    const ratings = getDefenderRatings(assignment.positionSlot, defenseRatings);

    // Flip Y coordinate: y=51 becomes y=49, y=65 becomes y=35
    const flippedY = 100 - assignment.startY;

    return {
      positionSlot: assignment.positionSlot,
      x: assignment.startX,
      y: flippedY,
      assignment: { ...assignment, startY: flippedY },
      isEngaged: false,
      isBlocked: false,
      hasMadeTackle: false,
      ...ratings,
    };
  });

  return {
    timeMs: 0,
    phase: 'PRE_SNAP',
    offensePlayers,
    defenders,
    ballCarrier: 'QB',
    targetReceiver: null,
    ball: { x: 50, y: 50, isVisible: true, isInAir: false, carrier: 'QB', isInFlight: false },
    ballInAir: false,
    ballThrowTime: null,
    ballCatchTime: null,
    playEnded: false,
    endReason: null,
    yardsGained: 0,
    tackledBy: null,
    throwAway: config.pinnedThrowAway ?? false,
  };
}

/**
 * Generate offense path for a player
 */
function generateOffensePath(
  play: Play,
  assignment: PlayerAssignment,
  preSnapDuration: number,
  pinnedRunPath?: { x: number; y: number; delay: number }[]
): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const snapTime = preSnapDuration + 200;

  // Start at position
  waypoints.push({ x: assignment.startX, y: assignment.startY, arrivalTimeMs: 0 });
  waypoints.push({ x: assignment.startX, y: assignment.startY, arrivalTimeMs: preSnapDuration });

  // After snap, movement depends on role
  if (assignment.positionSlot === 'QB') {
    // QB dropback
    if (play.playType === 'PASS') {
      const dropDepth = play.passAction === '3_STEP' ? 3 : play.passAction === '7_STEP' ? 7 : 5;
      waypoints.push({
        x: assignment.startX,
        y: assignment.startY + dropDepth,
        arrivalTimeMs: snapTime + 600,
      });
    } else {
      // Handoff
      waypoints.push({
        x: assignment.startX,
        y: assignment.startY + 2,
        arrivalTimeMs: snapTime + 400,
        action: 'HANDOFF',
      });
    }
  } else if (assignment.route && assignment.route !== 'BLOCK') {
    // Receiver route
    const routePoints = getRoutePoints(
      assignment.route,
      assignment.fieldSide || 'LEFT',
      assignment.startX,
      assignment.startY
    );

    let currentTime = snapTime + 100;
    for (const point of routePoints) {
      currentTime += 400;
      waypoints.push({ x: point.x, y: point.y, arrivalTimeMs: currentTime });
    }
  } else if (assignment.isBallCarrier || assignment.runAssignment) {
    // Running back. If a Key Frame branch pinned an explicit lane path, use it;
    // otherwise generate from the play's runAssignment.
    const runPath = pinnedRunPath ?? generateRunPath(assignment, play);
    let currentTime = snapTime + 300;
    for (const point of runPath) {
      currentTime += point.delay;
      waypoints.push({ x: point.x, y: point.y, arrivalTimeMs: currentTime });
    }
  } else if (!assignment.canRunRoutes) {
    // Offensive lineman - blocking
    waypoints.push({
      x: assignment.startX,
      y: assignment.startY - 2,
      arrivalTimeMs: snapTime + 200,
    });
  }

  return waypoints;
}

/**
 * Generate run path for RB
 */
function generateRunPath(
  assignment: PlayerAssignment,
  _play: Play
): { x: number; y: number; delay: number }[] {
  const startX = assignment.startX;
  const startY = assignment.startY;

  switch (assignment.runAssignment) {
    case 'DIVE':
    case 'INSIDE_ZONE':
      return [
        { x: startX, y: startY - 5, delay: 200 },
        { x: startX, y: startY - 15, delay: 400 },
        { x: startX, y: startY - 30, delay: 600 },
      ];

    case 'POWER':
      return [
        { x: startX, y: startY - 3, delay: 300 },
        { x: startX + 8, y: startY - 12, delay: 500 },
        { x: startX + 10, y: startY - 28, delay: 700 },
      ];

    case 'SWEEP':
    case 'OUTSIDE_ZONE':
    case 'TOSS':
      const dir = assignment.runGap?.includes('LEFT') ? -1 : 1;
      return [
        { x: startX + (12 * dir), y: startY, delay: 250 },
        { x: startX + (25 * dir), y: startY - 8, delay: 500 },
        { x: startX + (30 * dir), y: startY - 20, delay: 700 },
      ];

    default:
      return [
        { x: startX, y: startY - 10, delay: 400 },
        { x: startX, y: startY - 25, delay: 700 },
      ];
  }
}

/**
 * Advance simulation by one tick
 */
function tickSimulation(
  state: SimulationState,
  play: Play,
  defenseCard: DefensiveCard,
  offenseRatings: OffenseRatings,
  defenseRatings: DefenseRatings,
  config: SimulationConfig
): void {
  // Update phase
  if (state.timeMs < config.preSnapDurationMs) {
    state.phase = 'PRE_SNAP';
    return;  // Don't move anyone pre-snap
  } else if (state.timeMs < config.preSnapDurationMs + 200) {
    state.phase = 'SNAP';
  } else if (state.ballInAir) {
    state.phase = 'THROW';
  } else if (play.playType === 'PASS' && !state.ballInAir && state.ballCarrier === 'QB') {
    state.phase = 'DEVELOPING';
  } else {
    state.phase = state.ballCarrier === 'QB' ? 'DEVELOPING' : 'AFTER_CATCH';
  }

  // Move offense players along their paths
  moveOffensePlayers(state, config);

  // Handle handoff for run plays (not during SNAP phase)
  if (play.playType === 'RUN' && state.phase !== 'SNAP') {
    handleHandoff(state, play, config);
  }

  // Move defenders based on their AI
  moveDefenders(state, play, defenseCard, defenseRatings, config);

  // Handle QB throw for pass plays
  if (play.playType === 'PASS' && state.ballCarrier === 'QB' && !state.ballInAir) {
    handleQBThrow(state, play, offenseRatings, defenseRatings, config);
  }

  // Move ball if in flight
  if (state.ballInAir) {
    moveBall(state, config);
  }

  // Check for collisions/tackles
  checkTackles(state, defenseCard, config);

  // Check for pass breakup/interception
  if (state.ballInAir) {
    checkPassDefense(state, defenseCard, defenseRatings, config);
  }

  // Check for out of bounds
  checkBoundaries(state);

  // Check for touchdown
  checkTouchdown(state);
}

/**
 * Move offense players along their paths
 */
function moveOffensePlayers(state: SimulationState, _config: SimulationConfig): void {
  for (const player of state.offensePlayers) {
    if (player.path.length === 0) continue;

    // Find current target waypoint
    let targetWaypoint = player.path[player.currentWaypointIndex];
    while (
      player.currentWaypointIndex < player.path.length - 1 &&
      targetWaypoint.arrivalTimeMs <= state.timeMs
    ) {
      player.currentWaypointIndex++;
      targetWaypoint = player.path[player.currentWaypointIndex];
    }

    // Interpolate position
    const prevWaypoint = player.path[Math.max(0, player.currentWaypointIndex - 1)];
    const progress = Math.min(1, Math.max(0,
      (state.timeMs - prevWaypoint.arrivalTimeMs) /
      (targetWaypoint.arrivalTimeMs - prevWaypoint.arrivalTimeMs || 1)
    ));

    player.x = prevWaypoint.x + (targetWaypoint.x - prevWaypoint.x) * progress;
    player.y = prevWaypoint.y + (targetWaypoint.y - prevWaypoint.y) * progress;
  }
}

/**
 * Handle handoff from QB to RB
 */
function handleHandoff(state: SimulationState, play: Play, config: SimulationConfig): void {
  if (state.ballCarrier !== 'QB') return;

  const handoffTime = config.preSnapDurationMs + 400;
  if (state.timeMs < handoffTime) return;

  // Find the ball carrier (RB)
  const rbAssignment = play.assignments.find(a => a.isBallCarrier || a.isHandoffTarget);
  if (!rbAssignment) return;

  const qb = state.offensePlayers.find(p => p.positionSlot === 'QB');
  const rb = state.offensePlayers.find(p => p.positionSlot === rbAssignment.positionSlot);

  if (qb && rb) {
    const distance = Math.sqrt(Math.pow(qb.x - rb.x, 2) + Math.pow(qb.y - rb.y, 2));
    if (distance < 6) {
      // Handoff complete
      qb.hasBall = false;
      rb.hasBall = true;
      state.ballCarrier = rb.positionSlot;
      state.ball.x = rb.x;
      state.ball.y = rb.y;
    }
  }
}

/**
 * Move defenders based on their AI
 */
function moveDefenders(
  state: SimulationState,
  play: Play,
  _defenseCard: DefensiveCard,
  _defenseRatings: DefenseRatings,
  config: SimulationConfig
): void {
  // FIRST: Check for OL blocking defenders BEFORE they move
  handleBlocking(state, play);

  const isRun = play.playType === 'RUN' || (play.playType === 'PASS' && state.timeMs < config.preSnapDurationMs + 800);

  for (const defender of state.defenders) {
    if (defender.isBlocked || defender.hasMadeTackle) continue;

    // Determine target based on assignment and read
    const target = getDefenderTarget(defender, state, play, isRun);

    if (!target) continue;

    // Move toward target
    const dx = target.x - defender.x;
    const dy = target.y - defender.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.5) {
      // Calculate speed based on position type and ratings
      const baseSpeed = getDefenderBaseSpeed(defender.positionSlot);
      const speedBonus = (defender.speed - 70) / 100;  // Rating 70 is baseline
      const speed = baseSpeed * (1 + speedBonus);

      // Convert to units per tick
      const unitsPerTick = (speed * YARDS_TO_UNITS / 1000) * config.tickIntervalMs;

      // Apply pursuit angle - try to cut off ball carrier
      let moveX = dx / distance;
      let moveY = dy / distance;

      // Predict ball carrier movement
      if (state.ballCarrier && target.predictedX !== undefined) {
        const predictDx = target.predictedX - defender.x;
        const predictDy = target.predictedY! - defender.y;
        const predictDist = Math.sqrt(predictDx * predictDx + predictDy * predictDy);
        if (predictDist > 0) {
          moveX = (moveX * 0.6 + (predictDx / predictDist) * 0.4);
          moveY = (moveY * 0.6 + (predictDy / predictDist) * 0.4);
        }
      }

      defender.x += moveX * unitsPerTick;
      defender.y += moveY * unitsPerTick;
    }
  }
}

/**
 * Get target for defender to pursue
 */
function getDefenderTarget(
  defender: DefenderState,
  state: SimulationState,
  _play: Play,
  isRun: boolean
): { x: number; y: number; predictedX?: number; predictedY?: number } | null {
  const assignment = defender.assignment;

  // If blitzing, go for QB/ball carrier
  if (assignment.isBlitzing) {
    const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
    if (ballCarrier) {
      return {
        x: ballCarrier.x,
        y: ballCarrier.y,
        predictedX: ballCarrier.x,
        predictedY: ballCarrier.y - 5,  // Predict running forward
      };
    }
  }

  // Man coverage - follow assigned receiver
  if (assignment.coverageAssignment?.startsWith('MAN_')) {
    const targetSlot = getManCoverageTarget(assignment.coverageAssignment);
    const target = state.offensePlayers.find(p => matchesManTarget(p.positionSlot, targetSlot));
    if (target) {
      return { x: target.x, y: target.y };
    }
  }

  // Zone coverage - go to zone or react to ball
  if (assignment.coverageAssignment?.startsWith('ZONE_')) {
    // If ball is in our zone, go to it
    if (state.ballInAir) {
      return { x: state.ball.x, y: state.ball.y };
    }

    // Otherwise patrol zone
    const zone = getZoneBounds(assignment.coverageAssignment);
    if (zone) {
      const centerX = (zone.xMin + zone.xMax) / 2;
      const centerY = (zone.yMin + zone.yMax) / 2;
      return { x: centerX, y: centerY };
    }
  }

  // QB spy
  if (assignment.coverageAssignment === 'SPY_QB') {
    const qb = state.offensePlayers.find(p => p.positionSlot === 'QB');
    if (qb) {
      // Mirror QB horizontally, stay slightly back
      return { x: qb.x, y: qb.y + 3 };
    }
  }

  // Run fit - go to gap assignment then pursue ball
  if (isRun || state.phase === 'AFTER_CATCH') {
    const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
    if (ballCarrier) {
      return {
        x: ballCarrier.x,
        y: ballCarrier.y,
        predictedX: ballCarrier.x,
        predictedY: ballCarrier.y - 3,
      };
    }
  }

  // Default - pass rush
  if (isPassRusher(defender.positionSlot)) {
    const qb = state.offensePlayers.find(p => p.positionSlot === 'QB');
    if (qb) {
      return { x: qb.x, y: qb.y };
    }
  }

  return null;
}

/**
 * Handle QB throw decision
 */
function handleQBThrow(
  state: SimulationState,
  _play: Play,
  offenseRatings: OffenseRatings,
  _defenseRatings: DefenseRatings,
  config: SimulationConfig
): void {
  const qb = state.offensePlayers.find(p => p.positionSlot === 'QB');
  if (!qb) return;

  // Check pressure level
  const closestDefender = getClosestDefender(state.defenders, qb.x, qb.y);
  const defenderDistance = closestDefender?.distance ?? 100;

  // Pressure thresholds (in field units)
  const heavyPressureRange = 4;   // Defender very close
  const pressureRange = 8;        // Defender approaching
  const sackRange = 2;            // Too close to escape

  const isHeavyPressure = defenderDistance < heavyPressureRange;
  const isPressured = defenderDistance < pressureRange;

  // Calculate minimum throw time based on pressure
  // Normal: 0.5s after snap, Pressured: 0.3s, Heavy pressure: 0.1s
  let minThrowDelay = 500;  // Faster normal timing
  if (isHeavyPressure) {
    minThrowDelay = 100;  // Must throw quickly
  } else if (isPressured) {
    minThrowDelay = 300;  // Throw earlier under pressure
  }

  const minThrowTime = config.preSnapDurationMs + minThrowDelay;
  const canThrow = state.timeMs >= minThrowTime;

  // Throw-away branch (Key Frame "bail" intent): QB heaves it toward the sideline,
  // no receiver target, ball lands incomplete by design. Resolves the same on every roll.
  if (state.throwAway && canThrow) {
    // Pick the nearer sideline relative to QB's current x (field is 0..100 wide)
    const sidelineX = qb.x < 50 ? 5 : 95;
    state.ballInAir = true;
    state.ballThrowTime = state.timeMs;
    qb.hasBall = false;
    state.ballCarrier = null;
    state.ball.targetX = sidelineX;
    state.ball.targetY = qb.y - 4;  // Just past LOS
    state.ball.isInFlight = true;
    state.phase = 'THROW';
    return;
  }

  // Find target receiver
  const receiver = state.targetReceiver
    ? state.offensePlayers.find(p => p.positionSlot === state.targetReceiver)
    : null;

  // Check if receiver is open
  const coveringDefender = receiver
    ? getClosestDefender(state.defenders, receiver.x, receiver.y)
    : null;
  const isOpen = !coveringDefender || coveringDefender.distance > config.coverageRadius;

  // QB decision to throw - more aggressive
  const shouldThrow = canThrow && receiver && (
    isOpen ||                                    // Receiver is open
    isPressured ||                               // Throw under any pressure
    state.timeMs > config.preSnapDurationMs + 1500  // Throw after 1.5s no matter what
  );

  if (shouldThrow && receiver) {
    // Throw the ball
    state.ballInAir = true;
    state.ballThrowTime = state.timeMs;
    qb.hasBall = false;
    state.ballCarrier = null;

    // Set ball target position - lead the receiver
    state.ball.targetX = receiver.x;
    state.ball.targetY = receiver.y - 5;  // Lead the receiver downfield
    state.ball.isInFlight = true;
    state.phase = 'THROW';
    return;
  }

  // Sack check - only if we didn't throw
  // Defender must be very close AND QB must have had time to throw
  if (defenderDistance < sackRange && state.timeMs > config.preSnapDurationMs + 500) {
    // Give QB one last chance to throw under extreme pressure
    const qbRating = offenseRatings.qbAccuracy ?? 70;
    const rusherRating = closestDefender?.defender.passRush ?? 70;

    // Higher QB awareness = better chance to avoid sack
    const escapeChance = 0.3 + (qbRating - rusherRating) / 200;  // 20-50% base

    if (Math.random() < escapeChance && receiver) {
      // Desperation throw!
      state.ballInAir = true;
      state.ballThrowTime = state.timeMs;
      qb.hasBall = false;
      state.ballCarrier = null;

      // Less accurate under pressure
      state.ball.targetX = receiver.x + (Math.random() - 0.5) * 10;
      state.ball.targetY = receiver.y - 3;
      state.ball.isInFlight = true;
      state.phase = 'THROW';
    } else {
      // Sacked!
      state.playEnded = true;
      state.endReason = 'SACK';
      state.tackledBy = closestDefender?.defender.positionSlot ?? null;
    }
  }
}

/**
 * Move ball when in flight
 */
function moveBall(state: SimulationState, config: SimulationConfig): void {
  if (!state.ball.targetX || !state.ball.targetY || !state.ballThrowTime) return;

  const qb = state.offensePlayers.find(p => p.positionSlot === 'QB');
  if (!qb) return;

  const flightDuration = 500;  // ms for ball to reach target
  const elapsed = state.timeMs - state.ballThrowTime;
  const progress = Math.min(1, elapsed / flightDuration);

  // Parabolic arc
  const startX = qb.x;
  const startY = qb.y;
  const arcHeight = 8;

  state.ball.x = startX + (state.ball.targetX - startX) * progress;
  state.ball.y = startY + (state.ball.targetY - startY) * progress - arcHeight * Math.sin(progress * Math.PI);

  // Ball arrived
  if (progress >= 1) {
    state.ballCatchTime = state.timeMs;

    // Check if receiver can catch
    const receiver = state.offensePlayers.find(p => p.positionSlot === state.targetReceiver);
    if (receiver) {
      const catchDistance = Math.sqrt(
        Math.pow(receiver.x - state.ball.x, 2) +
        Math.pow(receiver.y - state.ball.y, 2)
      );

      if (catchDistance < config.catchRadius) {
        // Caught!
        receiver.hasBall = true;
        state.ballCarrier = receiver.positionSlot;
        state.ballInAir = false;
        state.ball.isInFlight = false;
        state.phase = 'CATCH';
      } else {
        // Incomplete
        state.playEnded = true;
        state.endReason = 'INCOMPLETE';
        state.ballInAir = false;
      }
    } else {
      // No targeted receiver (throw-away or stray ball) → land incomplete.
      state.playEnded = true;
      state.endReason = 'INCOMPLETE';
      state.ballInAir = false;
      state.ball.isInFlight = false;
    }
  }
}

/**
 * Check for pass defense (interception or breakup)
 */
function checkPassDefense(
  state: SimulationState,
  _defenseCard: DefensiveCard,
  _defenseRatings: DefenseRatings,
  config: SimulationConfig
): void {
  // Find defenders near the ball
  for (const defender of state.defenders) {
    const distance = Math.sqrt(
      Math.pow(defender.x - state.ball.x, 2) +
      Math.pow(defender.y - state.ball.y, 2)
    );

    if (distance < config.coverageRadius) {
      // Defender has a chance at the ball
      // Higher coverage rating = higher INT chance
      const intChance = (defender.coverage / 100) * 0.3;  // Max 30% INT chance

      if (Math.random() < intChance) {
        // Interception!
        state.playEnded = true;
        state.endReason = 'INTERCEPTION';
        state.tackledBy = defender.positionSlot;
        state.ballInAir = false;
        return;
      }

      // Otherwise, could break up the pass
      const breakupChance = (defender.coverage / 100) * 0.5;
      if (Math.random() < breakupChance) {
        state.playEnded = true;
        state.endReason = 'INCOMPLETE';
        state.ballInAir = false;
        return;
      }
    }
  }
}

/**
 * Check for tackles
 */
function checkTackles(
  state: SimulationState,
  _defenseCard: DefensiveCard,
  config: SimulationConfig
): void {
  if (!state.ballCarrier) return;

  const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
  if (!ballCarrier) return;

  for (const defender of state.defenders) {
    if (defender.isBlocked || defender.hasMadeTackle) continue;

    const distance = Math.sqrt(
      Math.pow(defender.x - ballCarrier.x, 2) +
      Math.pow(defender.y - ballCarrier.y, 2)
    );

    if (distance < config.tackleRadius) {
      // Tackle attempt!
      // Higher tackling rating = higher success
      const tackleChance = 0.6 + (defender.tackling / 100) * 0.4;  // 60-100%

      if (Math.random() < tackleChance) {
        // Tackle successful!
        defender.hasMadeTackle = true;
        state.playEnded = true;
        state.endReason = 'TACKLE';
        state.tackledBy = defender.positionSlot;
        return;
      } else {
        // Broken tackle - defender stumbles
        defender.isEngaged = true;
      }
    }
  }
}

/**
 * Handle OL blocking
 */
function handleBlocking(state: SimulationState, _play: Play): void {
  // Proper blocking assignments - tackles block ends, guards block tackles
  const blockingAssignments: Record<string, DefensePositionSlot[]> = {
    'LT': ['DE_L', 'OLB_L'],           // Left Tackle blocks Left End
    'LG': ['DT_L', 'NT'],              // Left Guard blocks Left DT or Nose
    'C':  ['NT', 'MIKE'],              // Center blocks Nose or Mike LB
    'RG': ['DT_R', 'NT'],              // Right Guard blocks Right DT or Nose
    'RT': ['DE_R', 'OLB_R'],           // Right Tackle blocks Right End
  };

  const oLinemen = state.offensePlayers.filter(p =>
    ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.positionSlot)
  );

  // Process each lineman
  for (const lineman of oLinemen) {
    // Skip if already blocking
    if (lineman.isBlocked) continue;

    const assignments = blockingAssignments[lineman.positionSlot] || [];

    // Find assigned rusher (first unblocked one in priority order)
    let targetRusher: DefenderState | null = null;
    for (const slot of assignments) {
      const rusher = state.defenders.find(d =>
        d.positionSlot === slot && !d.isBlocked
      );
      if (rusher) {
        targetRusher = rusher;
        break;
      }
    }

    // If no assigned rusher found, find nearest unblocked pass rusher
    if (!targetRusher) {
      let closestDist = Infinity;
      for (const defender of state.defenders) {
        if (!isPassRusher(defender.positionSlot)) continue;
        if (defender.isBlocked) continue;
        const dist = Math.sqrt(
          Math.pow(defender.x - lineman.x, 2) +
          Math.pow(defender.y - lineman.y, 2)
        );
        if (dist < closestDist) {
          closestDist = dist;
          targetRusher = defender;
        }
      }
    }

    if (targetRusher) {
      const distance = Math.sqrt(
        Math.pow(targetRusher.x - lineman.x, 2) +
        Math.pow(targetRusher.y - lineman.y, 2)
      );

      // ALWAYS engage block immediately - lineman will move to maintain it
      // This ensures pass rushers are blocked from the start
      targetRusher.isBlocked = true;
      lineman.isBlocked = true;

      // Move lineman toward their blocked rusher to stay engaged
      if (distance > 2) {
        const dx = targetRusher.x - lineman.x;
        const dy = targetRusher.y - lineman.y;
        // Move quickly to catch up
        const moveSpeed = Math.min(distance * 0.3, 2.0);
        lineman.x += (dx / distance) * moveSpeed;
        if (lineman.y > 45) {
          lineman.y += (dy / distance) * moveSpeed * 0.5;
        }
      }
    }
  }

  // Blocking degrades over time based on pass rush vs. block ratings
  for (const defender of state.defenders) {
    if (defender.isBlocked) {
      // Pass rush rating vs. average OL blocking (assume 75)
      const passRushRating = defender.passRush ?? 70;
      const olBlockRating = 75;  // TODO: Get actual OL rating

      // Base shed chance: 0.5-3% per tick
      // Higher pass rush = more likely to shed
      // Rating difference of +20 doubles shed chance
      const ratingAdvantage = (passRushRating - olBlockRating) / 40;
      const baseShedChance = 0.01;  // 1% base per tick (60 ticks/sec = ~1.5s average)
      const shedChance = baseShedChance * (1 + ratingAdvantage);

      if (Math.random() < Math.max(0.005, Math.min(0.05, shedChance))) {
        defender.isBlocked = false;
      }
    }
  }
}

/**
 * Check if ball carrier is out of bounds
 */
function checkBoundaries(state: SimulationState): void {
  if (!state.ballCarrier) return;

  const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
  if (!ballCarrier) return;

  if (ballCarrier.x < 0 || ballCarrier.x > 100) {
    state.playEnded = true;
    state.endReason = 'OUT_OF_BOUNDS';
  }
}

/**
 * Check for touchdown
 */
function checkTouchdown(state: SimulationState): void {
  if (!state.ballCarrier) return;

  const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
  if (!ballCarrier) return;

  // Y < 0 means end zone (offense going "up" the field)
  if (ballCarrier.y < 0) {
    state.playEnded = true;
    state.endReason = 'TOUCHDOWN';
  }
}

/**
 * Generate frame for current state
 */
function generateSimulationFrame(
  state: SimulationState,
  _play: Play,
  _defenseCard: DefensiveCard
): AnimationFrame {
  const players: AnimatedPlayerState[] = [];

  // Add offense players
  for (const player of state.offensePlayers) {
    players.push({
      playerId: player.positionSlot,
      positionSlot: player.positionSlot,
      label: player.positionSlot,
      x: player.x,
      y: player.y,
      role: player.role as AnimatedPlayerState['role'],
      hasBall: player.hasBall,
      isBlocking: player.isBlocked,
      isRunningRoute: false,
      isTackled: false,
      pathHistory: [],
      isTargetReceiver: player.positionSlot === state.targetReceiver,
    });
  }

  // Add defenders
  for (const defender of state.defenders) {
    players.push({
      playerId: defender.positionSlot,
      positionSlot: defender.positionSlot,
      label: defender.positionSlot,
      x: defender.x,
      y: defender.y,
      role: 'DEFENDER',
      hasBall: false,
      isBlocking: false,
      isRunningRoute: false,
      isTackled: false,
      pathHistory: [],
    });
  }

  return {
    timeMs: state.timeMs,
    phase: state.phase,
    players,
    ball: { ...state.ball },
  };
}

/**
 * Calculate yards gained from final position
 */
function calculateYardsFromPosition(state: SimulationState, _play: Play): number {
  if (!state.ballCarrier) {
    if (state.endReason === 'INCOMPLETE') return 0;
    if (state.endReason === 'INTERCEPTION') return 0;
    return 0;
  }

  const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
  if (!ballCarrier) return 0;

  // Line of scrimmage is at Y=50
  // Going "up" (negative Y) is gaining yards
  const yardsGained = (50 - ballCarrier.y) / YARDS_TO_UNITS;

  // Sacks lose yards
  if (state.endReason === 'SACK') {
    const qb = state.offensePlayers.find(p => p.positionSlot === 'QB');
    if (qb) {
      return Math.floor((50 - qb.y) / YARDS_TO_UNITS);
    }
  }

  // Touchdown
  if (state.endReason === 'TOUCHDOWN') {
    // Return remaining yards to goal (assuming we know field position)
    // For now, just return the calculated yards
    return Math.ceil(yardsGained);
  }

  return Math.floor(yardsGained);
}

/**
 * Determine outcome result type
 */
function determineOutcomeResult(state: SimulationState, play: Play): PlayOutcome['result'] {
  switch (state.endReason) {
    case 'TOUCHDOWN':
      return 'TOUCHDOWN';
    case 'INTERCEPTION':
      return 'INTERCEPTION';
    case 'FUMBLE':
      return 'FUMBLE';
    case 'SACK':
      return 'SACK';
    case 'INCOMPLETE':
      return 'INCOMPLETE';
    default:
      return play.playType === 'PASS' ? 'COMPLETE' : 'RUSH';
  }
}

// Helper functions

function selectTargetReceiver(play: Play, _defenders: DefenderState[]): string {
  // Find receivers and evaluate openness
  const receivers = play.assignments.filter(a =>
    a.route && a.route !== 'BLOCK' && a.positionSlot !== 'QB'
  );

  if (receivers.length === 0) return 'X';  // Default

  // Pick based on position priority - WR1 > WR2 > TE > RB
  const wr1 = receivers.find(r => r.positionSlot === 'X' || r.positionSlot === 'WR1');
  if (wr1) return wr1.positionSlot;

  const wr2 = receivers.find(r => r.positionSlot === 'Z' || r.positionSlot === 'WR2');
  if (wr2) return wr2.positionSlot;

  return receivers[0].positionSlot;
}

function getManCoverageTarget(assignment: CoverageAssignment): string {
  switch (assignment) {
    case 'MAN_WR1': return 'WR1';
    case 'MAN_WR2': return 'WR2';
    case 'MAN_SLOT': return 'H';
    case 'MAN_TE': return 'TE';
    case 'MAN_RB': return 'RB';
    default: return '';
  }
}

function matchesManTarget(positionSlot: string, target: string): boolean {
  if (positionSlot === target) return true;
  if (target === 'WR1' && positionSlot === 'X') return true;
  if (target === 'WR2' && positionSlot === 'Z') return true;
  if (target === 'H' && (positionSlot === 'H' || positionSlot === 'SLOT')) return true;
  if (target === 'TE' && positionSlot === 'Y') return true;
  return false;
}

function getZoneBounds(assignment: CoverageAssignment): { xMin: number; xMax: number; yMin: number; yMax: number } | null {
  switch (assignment) {
    case 'ZONE_FLAT_L': return ZONE_BOUNDARIES.FLAT_L;
    case 'ZONE_FLAT_R': return ZONE_BOUNDARIES.FLAT_R;
    case 'ZONE_HOOK_L': return ZONE_BOUNDARIES.HOOK_L;
    case 'ZONE_HOOK_R': return ZONE_BOUNDARIES.HOOK_R;
    case 'ZONE_DEEP_THIRD_L': return ZONE_BOUNDARIES.DEEP_THIRD_L;
    case 'ZONE_DEEP_THIRD_M': return ZONE_BOUNDARIES.DEEP_THIRD_M;
    case 'ZONE_DEEP_THIRD_R': return ZONE_BOUNDARIES.DEEP_THIRD_R;
    case 'ZONE_DEEP_HALF_L': return ZONE_BOUNDARIES.DEEP_HALF_L;
    case 'ZONE_DEEP_HALF_R': return ZONE_BOUNDARIES.DEEP_HALF_R;
    case 'ZONE_MIDDLE': return ZONE_BOUNDARIES.MIDDLE;
    default: return null;
  }
}

function isPassRusher(slot: DefensePositionSlot): boolean {
  return ['DE_L', 'DE_R', 'DT_L', 'DT_R', 'NT'].includes(slot);
}

function getDefenderBaseSpeed(slot: DefensePositionSlot): number {
  if (slot.startsWith('CB')) return DEFENDER_SPEEDS.CB;
  if (slot === 'FS') return DEFENDER_SPEEDS.FS;
  if (slot === 'SS' || slot === 'DB') return DEFENDER_SPEEDS.SS;
  if (slot.includes('LB') || slot === 'WILL' || slot === 'MIKE' || slot === 'SAM') return DEFENDER_SPEEDS.LB;
  if (slot.includes('DT') || slot === 'NT') return DEFENDER_SPEEDS.DT;
  return DEFENDER_SPEEDS.DE;
}

function getOffenseSpeed(assignment: PlayerAssignment): number {
  if (assignment.positionSlot === 'QB') return 7.5;
  if (!assignment.canRunRoutes) return 5.0;  // OL
  if (assignment.positionSlot === 'RB' || assignment.positionSlot === 'FB') return 8.5;
  if (assignment.positionSlot === 'TE' || assignment.positionSlot === 'Y') return 7.5;
  return PLAYER_SPEEDS.WR_ROUTE;  // WRs
}

function determineRole(assignment: PlayerAssignment): string {
  if (assignment.positionSlot === 'QB') return 'QB';
  if (!assignment.canRunRoutes) return 'BLOCKER';
  if (assignment.route && assignment.route !== 'BLOCK') return 'RECEIVER';
  if (assignment.isBallCarrier || assignment.runAssignment) return 'BALL_CARRIER';
  return 'BLOCKER';
}

function getClosestDefender(
  defenders: DefenderState[],
  x: number,
  y: number
): { defender: DefenderState; distance: number } | null {
  let closest: { defender: DefenderState; distance: number } | null = null;

  for (const defender of defenders) {
    if (defender.isBlocked) continue;

    const distance = Math.sqrt(Math.pow(defender.x - x, 2) + Math.pow(defender.y - y, 2));
    if (!closest || distance < closest.distance) {
      closest = { defender, distance };
    }
  }

  return closest;
}

function findPlayerPosition(state: SimulationState, positionSlot: string): { x: number; y: number } | null {
  const player = state.offensePlayers.find(p => p.positionSlot === positionSlot);
  if (player) return { x: player.x, y: player.y };
  return null;
}

function getDefenderRatings(
  slot: DefensePositionSlot,
  ratings: DefenseRatings
): { speed: number; tackling: number; coverage: number; passRush: number; awareness: number } {
  // Map position slot to rating category
  if (slot.startsWith('CB')) {
    return {
      speed: ratings.cbSpeed || 80,
      tackling: ratings.cbTackling || 65,
      coverage: ratings.cbCoverage || 80,
      passRush: 40,
      awareness: ratings.cbAwareness || 75,
    };
  }
  if (slot === 'FS' || slot === 'SS' || slot === 'DB') {
    return {
      speed: ratings.sSpeed || 78,
      tackling: ratings.sTackling || 70,
      coverage: ratings.sCoverage || 75,
      passRush: 45,
      awareness: ratings.sAwareness || 78,
    };
  }
  if (slot.includes('LB') || slot === 'WILL' || slot === 'MIKE' || slot === 'SAM') {
    return {
      speed: ratings.lbSpeed || 72,
      tackling: ratings.lbTackling || 80,
      coverage: ratings.lbCoverage || 60,
      passRush: ratings.lbPassRush || 70,
      awareness: ratings.lbAwareness || 75,
    };
  }
  // DL
  return {
    speed: ratings.dlSpeed || 65,
    tackling: ratings.dlTackling || 75,
    coverage: 40,
    passRush: ratings.dlPassRush || 80,
    awareness: ratings.dlAwareness || 70,
  };
}

// Type definitions for ratings passed in
export interface OffenseRatings {
  qbAccuracy?: number;
  qbThrowPower?: number;
  olBlocking?: number;
  wrSpeed?: number;
  wrCatch?: number;
  rbSpeed?: number;
  rbPower?: number;
}

export interface DefenseRatings {
  dlPassRush?: number;
  dlRunStop?: number;
  dlSpeed?: number;
  dlTackling?: number;
  dlAwareness?: number;
  lbSpeed?: number;
  lbTackling?: number;
  lbCoverage?: number;
  lbPassRush?: number;
  lbAwareness?: number;
  cbSpeed?: number;
  cbTackling?: number;
  cbCoverage?: number;
  cbAwareness?: number;
  sSpeed?: number;
  sTackling?: number;
  sCoverage?: number;
  sAwareness?: number;
}
