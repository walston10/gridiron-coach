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

  // If the loop exited because of maxDuration (not a real tackle / TD /
  // turnover / boundary), the play has no visible cause for ending — the
  // RB just runs forever in the abstract. Force the nearest defender into
  // tackler position so the result and the icons agree. Without this, the
  // user sees "tackled for X yards" but no defender anywhere near the RB.
  if (!state.playEnded && state.ballCarrier) {
    const carrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
    if (carrier) {
      let nearest: DefenderState | null = null;
      let nearestDist = Infinity;
      for (const d of state.defenders) {
        if (d.hasMadeTackle) continue;
        const dist = Math.hypot(d.x - carrier.x, d.y - carrier.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = d;
        }
      }
      if (nearest) {
        // Drag the defender into contact over a few frames so it doesn't
        // look like a teleport. Target position is just inside tackleRadius
        // of the ball carrier, on the line between them.
        const dx = carrier.x - nearest.x;
        const dy = carrier.y - nearest.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;
        const targetX = carrier.x - ux * 1.5;  // 1.5 units short of contact
        const targetY = carrier.y - uy * 1.5;
        // 8 frames of drag-in interpolation (~128ms at 60fps).
        const startX = nearest.x;
        const startY = nearest.y;
        for (let i = 1; i <= 8; i++) {
          const t = i / 8;
          nearest.x = startX + (targetX - startX) * t;
          nearest.y = startY + (targetY - startY) * t;
          state.timeMs += cfg.tickIntervalMs;
          frames.push(generateSimulationFrame(state, play, defenseCard));
        }
        nearest.hasMadeTackle = true;
        state.playEnded = true;
        state.endReason = 'TACKLE';
        state.tackledBy = nearest.positionSlot;
      }
    }
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
/**
 * Append a far-downfield extension waypoint so the ball carrier keeps
 * running past the last designed waypoint instead of stopping (which used
 * to look like a phantom tackle with no defender nearby). Extrapolates
 * direction from the last two waypoints.
 */
function withExtension(
  path: { x: number; y: number; delay: number }[]
): { x: number; y: number; delay: number }[] {
  if (path.length < 2) return path;
  const last = path[path.length - 1];
  const prev = path[path.length - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  // Scale to a 3× last segment; clamp to field bounds.
  const extX = Math.max(2, Math.min(98, last.x + dx * 3));
  const extY = Math.max(0, last.y + dy * 3);
  return [...path, { x: extX, y: extY, delay: 1500 }];
}

function generateRunPath(
  assignment: PlayerAssignment,
  _play: Play
): { x: number; y: number; delay: number }[] {
  const startX = assignment.startX;
  const startY = assignment.startY;

  switch (assignment.runAssignment) {
    case 'DIVE':
    case 'INSIDE_ZONE':
      return withExtension([
        { x: startX, y: startY - 5, delay: 200 },
        { x: startX, y: startY - 15, delay: 400 },
        { x: startX, y: startY - 30, delay: 600 },
      ]);

    case 'POWER':
      return withExtension([
        { x: startX, y: startY - 3, delay: 300 },
        { x: startX + 8, y: startY - 12, delay: 500 },
        { x: startX + 10, y: startY - 28, delay: 700 },
      ]);

    case 'SWEEP':
    case 'OUTSIDE_ZONE':
    case 'TOSS': {
      const dir = assignment.runGap?.includes('LEFT') ? -1 : 1;
      return withExtension([
        { x: startX + (12 * dir), y: startY, delay: 250 },
        { x: startX + (25 * dir), y: startY - 8, delay: 500 },
        { x: startX + (30 * dir), y: startY - 20, delay: 700 },
      ]);
    }

    default:
      return withExtension([
        { x: startX, y: startY - 10, delay: 400 },
        { x: startX, y: startY - 25, delay: 700 },
      ]);
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

  // Override OL positions with tick-based tracking toward their target
  // defender. Now scheme-aware (Phase 3.1): on POWER / COUNTER, the
  // backside guard pulls to the playside LB instead of base-blocking.
  moveOffensiveLine(state, play);

  // Drive blocked defenders backward slightly each tick — Phase 3.1
  // sustained-block effect. Visually OL is "pushing" the defender.
  applyDriveBlocks(state);

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

  // Run fit - go to gap assignment then pursue ball.
  if (isRun || state.phase === 'AFTER_CATCH') {
    const ballCarrier = state.offensePlayers.find(p => p.positionSlot === state.ballCarrier);
    if (ballCarrier) {
      // CBs hold contain — they don't crash inside on run plays. They sit on
      // their side of the field at the LOS until the ball carrier breaks
      // toward their boundary. Prevents the "CB slices through the line"
      // bug where unblocked CBs blow up inside runs.
      const isCB = defender.positionSlot.startsWith('CB');
      if (isCB) {
        const onLeft = defender.positionSlot === 'CB_L';
        const containX = onLeft ? 8 : 92;       // Sit on the boundary
        const containY = 50;                    // At the LOS
        // Only crash toward the ball carrier if they've gotten past the LOS
        // AND headed to this CB's side.
        const ballPastLOS = ballCarrier.y < 50;
        const ballOnMySide = onLeft ? ballCarrier.x < 40 : ballCarrier.x > 60;
        if (ballPastLOS && ballOnMySide) {
          return {
            x: ballCarrier.x, y: ballCarrier.y,
            predictedX: ballCarrier.x, predictedY: ballCarrier.y - 3,
          };
        }
        return { x: containX, y: containY };
      }
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

/** Position slots for offensive linemen. */
const OL_SLOTS = ['LT', 'LG', 'C', 'RG', 'RT'] as const;

/**
 * Blocking assignment priority per OL slot: each lineman tries the first
 * unblocked defender in this list. Tackles block ends, guards block tackles,
 * center blocks nose or Mike LB. Generic across schemes for Phase 2; Phase 3
 * adds scheme-specific overrides (pulls, doubles, traps).
 */
const OL_BLOCK_ASSIGNMENTS: Record<string, DefensePositionSlot[]> = {
  LT: ['DE_L', 'OLB_L'],
  LG: ['DT_L', 'NT'],
  C:  ['NT', 'MIKE'],
  RG: ['DT_R', 'NT'],
  RT: ['DE_R', 'OLB_R'],
};

/**
 * Distance (field units) at which an OL is "in contact" with their target
 * defender. Below this, handleBlocking engages the block.
 */
const BLOCK_ENGAGE_RADIUS = 3.0;

/**
 * OL travel speed per simulation tick. ~24 field units/sec — faster than
 * real-football fire-out (~6 yards/sec) but tuned for visual clarity at
 * mobile zoom and 0.6× playback speed.
 */
const OL_SPEED_PER_TICK = 0.4;

/** Speed multiplier when an OL is pulling — pullers are skill-fast. */
const OL_PULL_SPEED_MULT = 1.5;

/** Phase 3.1: drive-block parameters. */
const DRIVE_PUSH_PER_TICK = 0.06;  // ~3.6 units/sec, gentle but visible
const DRIVE_MAX_DRIFT     = 2.5;   // cap on how far a blocked defender can be driven

/** Per-OL behavior for a specific play. */
type OLRole = 'BASE' | 'PULL_LEFT' | 'PULL_RIGHT';

/**
 * Determine an OL's role for the current play. Phase 3.1 implements PULL
 * for POWER and COUNTER schemes (backside guard pulls to the playside).
 * Everyone else stays BASE (the Phase 2 track-to-target behavior).
 *
 * Phase 4 will add: reach blocks (OZ/sweep), pulling tackle on COUNTER,
 * combo/double blocks (DUO), trap blocks.
 */
function getOLRole(
  positionSlot: string,
  scheme: string | undefined,
  runGap: string | undefined
): OLRole {
  if (!scheme || !runGap) return 'BASE';
  const goesLeft = runGap.includes('LEFT');

  switch (scheme) {
    case 'POWER':
    case 'COUNTER':
      // Backside guard pulls to the playside.
      if (goesLeft && positionSlot === 'RG') return 'PULL_LEFT';
      if (!goesLeft && positionSlot === 'LG') return 'PULL_RIGHT';
      return 'BASE';
    default:
      return 'BASE';
  }
}

/**
 * Find a target defender for a pulling lineman. Picks the first unblocked
 * second-level defender (LB / OLB) on the playside relative to the pull
 * direction. Falls back to any unblocked LB if none match.
 */
function findPullTarget(
  role: 'PULL_LEFT' | 'PULL_RIGHT',
  defenders: DefenderState[]
): DefenderState | null {
  const playside = role === 'PULL_RIGHT' ? 1 : -1;
  const lbSlots = ['WILL', 'MIKE', 'SAM', 'OLB_L', 'OLB_R'];
  const lbs = defenders.filter(d => lbSlots.includes(d.positionSlot) && !d.isBlocked);
  if (lbs.length === 0) return null;
  const playsideLBs = lbs.filter(d => playside > 0 ? d.x >= 45 : d.x <= 55);
  return playsideLBs[0] ?? lbs[0];
}

/**
 * Find the first unblocked defender from a lineman's assignment priority.
 * Returns null if every assigned target is already engaged.
 */
function findOLTarget(
  lineman: { positionSlot: string },
  defenders: DefenderState[]
): DefenderState | null {
  const assignments = OL_BLOCK_ASSIGNMENTS[lineman.positionSlot];
  if (!assignments) return null;
  for (const slot of assignments) {
    const d = defenders.find(def => def.positionSlot === slot && !def.isBlocked);
    if (d) return d;
  }
  return null;
}

/**
 * Phase 2a: tick-based OL movement. Each unblocked lineman tracks toward
 * their target defender's current position, overriding the static waypoint
 * "move forward 2 yards and freeze" behavior. Lineman stops when in
 * BLOCK_ENGAGE_RADIUS — handleBlocking takes over from there.
 */
/**
 * Phase 3.1 drive blocking: blocked defenders drift slowly toward the
 * defense's end zone (y decreasing) over the course of the play — the
 * OL is "driving" them backward. Capped at DRIVE_MAX_DRIFT units from
 * the defender's original spawn so a hot block doesn't ride the rusher
 * out of the play entirely.
 */
function applyDriveBlocks(state: SimulationState): void {
  for (const defender of state.defenders) {
    if (!defender.isBlocked) continue;
    const initialY = defender.assignment.startY;  // already flipped in initializeSimulation
    const drift = initialY - defender.y;
    if (drift >= DRIVE_MAX_DRIFT) continue;
    defender.y -= DRIVE_PUSH_PER_TICK;
  }
}

function moveOffensiveLine(state: SimulationState, play: Play): void {
  // Read the play's scheme + direction once per tick. Run plays declare
  // their blocking scheme; the RB's runGap tells us which way the play
  // is going so we can identify the backside (pulling) lineman.
  const scheme = play.runBlockingScheme;
  const rbAssignment = play.assignments.find(a => a.isBallCarrier || a.runAssignment);
  const runGap = rbAssignment?.runGap;

  for (const lineman of state.offensePlayers) {
    if (!(OL_SLOTS as readonly string[]).includes(lineman.positionSlot)) continue;
    if (lineman.isBlocked) continue;  // engaged, hold position

    const role = getOLRole(lineman.positionSlot, scheme, runGap);

    // Pullers ignore their priority defender and head for the playside LB.
    // Base linemen track their assigned man as before.
    const target = role === 'BASE'
      ? findOLTarget(lineman, state.defenders)
      : findPullTarget(role, state.defenders);
    if (!target) continue;

    const dx = target.x - lineman.x;
    const dy = target.y - lineman.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= BLOCK_ENGAGE_RADIUS) continue;  // close enough; let handleBlocking fire

    const baseSpeed = role === 'BASE' ? OL_SPEED_PER_TICK : OL_SPEED_PER_TICK * OL_PULL_SPEED_MULT;
    const step = Math.min(baseSpeed, dist - BLOCK_ENGAGE_RADIUS);
    lineman.x += (dx / dist) * step;
    lineman.y += (dy / dist) * step;
  }
}

/**
 * Handle OL blocking — proximity-gated engagement.
 *
 * Previously this fired immediately on assignment match, which meant
 * blocks "teleported" the moment the sim started. Now an OL has to
 * actually be within BLOCK_ENGAGE_RADIUS of their target before
 * isBlocked flips. Pairs with moveOffensiveLine: OL tracks to defender,
 * gets close, engages.
 */
function handleBlocking(state: SimulationState, _play: Play): void {
  const oLinemen = state.offensePlayers.filter(p =>
    (OL_SLOTS as readonly string[]).includes(p.positionSlot)
  );

  // Process each lineman. Engagement is proximity-gated: only set isBlocked
  // when the lineman is actually in contact with their target. Track-to-
  // target movement happens in moveOffensiveLine each tick before this runs.
  for (const lineman of oLinemen) {
    if (lineman.isBlocked) continue;

    // Find a target — first unblocked in priority list, else nearest unblocked
    // pass rusher (fallback for unusual fronts / blitz packages).
    let target = findOLTarget(lineman, state.defenders);
    if (!target) {
      let closestDist = Infinity;
      for (const defender of state.defenders) {
        if (!isPassRusher(defender.positionSlot)) continue;
        if (defender.isBlocked) continue;
        const dist = Math.hypot(defender.x - lineman.x, defender.y - lineman.y);
        if (dist < closestDist) {
          closestDist = dist;
          target = defender;
        }
      }
    }
    if (!target) continue;

    // Proximity gate — only engage on actual contact.
    const distance = Math.hypot(target.x - lineman.x, target.y - lineman.y);
    if (distance > BLOCK_ENGAGE_RADIUS) continue;

    target.isBlocked = true;
    lineman.isBlocked = true;
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
        // The lineman blocking this defender is also free now — let them
        // re-acquire a target (likely the same one, but the tracking
        // function will re-engage on proximity).
        const blocker = state.offensePlayers.find(p =>
          p.isBlocked &&
          OL_BLOCK_ASSIGNMENTS[p.positionSlot]?.includes(defender.positionSlot)
        );
        if (blocker) blocker.isBlocked = false;
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
