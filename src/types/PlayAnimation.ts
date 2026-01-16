// ==================== PLAY ANIMATION TYPES ====================

import type { Play } from './Play';

/**
 * Represents a single player's state at a given point in time during the animation
 */
export type AnimatedPlayerState = {
  playerId: string;
  positionSlot: string;
  label: string;

  // Current position (field coordinates 0-100)
  x: number;
  y: number;

  // Visual state
  hasBall: boolean;
  isBlocking: boolean;
  isRunningRoute: boolean;
  isTackled: boolean;

  // Role info for coloring
  role: 'QB' | 'OL' | 'RECEIVER' | 'RB' | 'BLOCKER' | 'DEFENDER' | 'BALL_CARRIER';

  // For drawing route trails
  pathHistory: { x: number; y: number }[];

  // Optional - used by simulator
  routeHistory?: { x: number; y: number }[];
  isTargetReceiver?: boolean;
};

/**
 * The ball's state during animation
 */
export type AnimatedBallState = {
  x: number;
  y: number;
  isVisible: boolean;
  isInAir: boolean;  // True when ball is being thrown
  carrier: string | null;  // playerId of who has the ball

  // Simulation fields for ball in flight
  targetX?: number;
  targetY?: number;
  isInFlight?: boolean;
};

/**
 * Complete animation frame - state of all players and ball at a point in time
 */
export type AnimationFrame = {
  timeMs: number;  // Time since snap
  players: AnimatedPlayerState[];
  ball: AnimatedBallState;
  phase: AnimationPhase;
  event?: AnimationEvent;
};

/**
 * Phases of play animation
 */
export type AnimationPhase =
  | 'PRE_SNAP'      // Players in formation, ball not snapped
  | 'SNAP'          // Ball being snapped
  | 'DEVELOPING'    // Play developing - routes running, blocks engaging
  | 'THROW'         // QB throwing the ball
  | 'HANDOFF'       // QB handing off
  | 'BALL_IN_AIR'   // Pass in flight
  | 'CATCH'         // Receiver catching
  | 'AFTER_CATCH'   // After catch, running with ball
  | 'RUN_AFTER_CATCH' // RAC yards
  | 'RUNNING'       // Ball carrier running
  | 'TACKLE'        // Play ending
  | 'COMPLETE';     // Animation done

/**
 * Key events during the play
 */
export type AnimationEvent = {
  type: 'SNAP' | 'HANDOFF' | 'THROW' | 'CATCH' | 'DROP' | 'TACKLE' | 'SACK' | 'INCOMPLETE' | 'TOUCHDOWN';
  playerId?: string;
  description: string;
};

/**
 * Configuration for the play executor
 */
export type PlayExecutorConfig = {
  // Timing (in milliseconds)
  preSnapDuration: number;    // Time showing formation before snap
  snapDuration: number;       // Duration of snap animation
  dropbackTime: number;       // QB dropback time based on pass action
  routeSpeedMultiplier: number;  // How fast routes develop (1 = realistic, 2 = faster)

  // Animation settings
  showRouteTrails: boolean;   // Show path history for receivers
  showBlockingEngagements: boolean;
};

/**
 * Defines a movement path for a player
 */
export type MovementPath = {
  playerId: string;
  positionSlot: string;
  waypoints: Waypoint[];
};

/**
 * A single point in a movement path with timing
 */
export type Waypoint = {
  x: number;
  y: number;
  arrivalTimeMs: number;
  action?: 'BLOCK' | 'CATCH' | 'THROW' | 'HANDOFF' | 'TACKLE';
};

/**
 * Result of executing a play animation
 */
export type PlayAnimationResult = {
  play: Play;
  totalDurationMs: number;
  frames: AnimationFrame[];
  outcome: PlayOutcome;
};

/**
 * Outcome data for the play
 */
export type PlayOutcome = {
  result: 'COMPLETE' | 'INCOMPLETE' | 'INTERCEPTION' | 'SACK' | 'RUSH' | 'FUMBLE' | 'TOUCHDOWN';
  yardsGained: number;
  targetReceiver?: string;
  tackledBy?: string;
};

/**
 * Default executor configuration
 */
export const DEFAULT_EXECUTOR_CONFIG: PlayExecutorConfig = {
  preSnapDuration: 1000,
  snapDuration: 300,
  dropbackTime: 1500,
  routeSpeedMultiplier: 1.2,
  showRouteTrails: true,
  showBlockingEngagements: true,
};

/**
 * Player speed constants (yards per second at full speed)
 */
export const PLAYER_SPEEDS = {
  WR_ROUTE: 8,      // WRs run routes at ~8 yards/sec
  RB_RUSH: 7,       // RBs run at ~7 yards/sec
  QB_DROPBACK: 5,   // QB drops back slower
  OL_PULL: 6,       // Pulling linemen
  BALL_IN_AIR: 25,  // Pass travels ~25 yards/sec
};

/**
 * Convert yards to field coordinate units
 * Field is 0-100, representing roughly 50 yards of visible field
 * So 1 yard ≈ 2 units
 */
export const YARDS_TO_UNITS = 2;

/**
 * Animation playback state
 */
export type PlaybackState = {
  isPlaying: boolean;
  isPaused: boolean;
  currentTimeMs: number;
  playbackSpeed: number;  // 0.5x, 1x, 2x
  currentFrameIndex: number;
};
