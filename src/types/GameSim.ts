/**
 * Game Simulation Types
 *
 * These types define what happens on the field during gameplay.
 * Uses the simplified roster system from Player.ts
 */

import type {
  RosterPosition,
  FieldRole,
  OffenseFormation,
  DefenseFormation,
  LineUnitStats,
} from './Player';

// Re-export formations for convenience
export type { OffenseFormation, DefenseFormation };
export type Formation = OffenseFormation | DefenseFormation;

// =============================================================================
// LEGACY POSITION TYPE (for backward compatibility during transition)
// =============================================================================

// This maps to field roles during gameplay
export type Position =
  | 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT'  // Offense
  | 'DE' | 'DT' | 'NT' | 'OLB' | 'MLB' | 'ILB' | 'CB' | 'FS' | 'SS';    // Defense

// =============================================================================
// PLAY TYPES
// =============================================================================

export type RouteType =
  | 'STREAK' | 'POST' | 'CORNER' | 'OUT' | 'IN' | 'SLANT'
  | 'CURL' | 'COMEBACK' | 'FLAT' | 'WHEEL' | 'DRAG' | 'BLOCK'
  | 'SCREEN' | 'SWING' | 'DELAY' | 'RELEASE_BLOCK';

export type CoverageType =
  | 'COVER_0' | 'COVER_1' | 'COVER_2' | 'COVER_3' | 'COVER_4'
  | 'COVER_2_MAN' | 'TAMPA_2' | 'MAN_FREE';

export type BlitzType = 'NONE' | 'MLB' | 'OLB' | 'CB' | 'SAFETY' | 'ZONE';

// =============================================================================
// VECTOR / SPATIAL
// =============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

// =============================================================================
// FIELD PLAYER (during gameplay)
// =============================================================================

// =============================================================================
// BLOCKING / ENGAGEMENT STATE
// =============================================================================

export type EngagementState = 'FREE' | 'ENGAGED' | 'BEATEN' | 'WINNING';

export interface BlockEngagement {
  engagedWith: string;                  // ID of the player we're engaged with
  progress: number;                     // -100 (blocker dominating) to +100 (rusher winning)
  startTime: number;                    // When engagement started
}

/**
 * A player on the field during a play.
 *
 * Key distinction:
 * - `rosterPosition` is their position on the team (QB, WR1, FLEX, etc.)
 * - `fieldRole` is their role in THIS play (QB, WR_X, SLOT, TE, FB, etc.)
 * - `id` is the field position ID used for routes/assignments (WR1, SLOT, RB, etc.)
 */
export interface FieldPlayer {
  id: string;                           // Field position ID (for routes: 'WR1', 'SLOT', 'RB')
  playerId: string;                     // Reference to actual Player.id in roster
  rosterPosition: RosterPosition;       // Their roster position
  fieldRole: FieldRole;                 // Their role in this formation
  location: Vector2;
  velocity: Vector2;

  // Physical attributes (copied from player stats)
  speed: number;
  acceleration: number;
  strength?: number;
  agility?: number;

  // Assignments
  route?: RouteType;
  assignment?: 'BLOCK' | 'RUSH' | 'ZONE' | 'MAN';
  targetId?: string;                    // For man coverage - who they're covering
  formationTarget?: Vector2;            // Target position for huddle-to-formation animation

  // Blocking/Engagement state
  engagementState?: EngagementState;
  blockEngagement?: BlockEngagement;

  // Position-specific stats (copied from player)
  accuracy?: number;                    // QB
  armStrength?: number;                 // QB
  catch?: number;                       // Receivers
  tackle?: number;
  elusiveness?: number;
  coverage?: number;
  routeRunning?: number;
  passRush?: number;
  awareness?: number;
  passBlock?: number;
  runBlock?: number;
  carrying?: number;
}

/**
 * Line unit on the field (O-LINE or D-LINE)
 * Represented as a single entity with aggregate behavior
 */
export interface FieldLineUnit {
  id: 'OLINE' | 'DLINE';
  location: Vector2;                    // Center point of the line
  stats: LineUnitStats;
  // Line unit doesn't have velocity - it's more of a zone
}

// =============================================================================
// PASS TRACKING
// =============================================================================

export interface PassFlight {
  startLocation: Vector2;
  landingSpot: Vector2;
  airTime: number;
  elapsedTime: number;
  intendedTarget?: string;              // Field position ID of intended receiver
}

// =============================================================================
// PLAY DEFINITIONS
// =============================================================================

/**
 * Offensive play definition
 * Routes now reference roster positions, which get mapped to field roles
 */
export interface OffensivePlay {
  id: string;
  name: string;
  formation: OffenseFormation;
  type: 'RUN' | 'PASS' | 'PLAY_ACTION' | 'SCREEN';

  // Routes keyed by roster position (QB, RB, WR1, WR2, FLEX)
  routes: Partial<Record<RosterPosition, RouteType>>;

  runGap?: 'LEFT_END' | 'LEFT_TACKLE' | 'LEFT_GUARD' | 'CENTER' | 'RIGHT_GUARD' | 'RIGHT_TACKLE' | 'RIGHT_END';
  rollout?: 'LEFT' | 'RIGHT' | 'NONE';
  description: string;
}

export interface DefensivePlay {
  id: string;
  name: string;
  formation: DefenseFormation;
  coverage: CoverageType;
  blitz: BlitzType;
  blitzers?: RosterPosition[];          // Which roster positions blitz
  description: string;
}

// =============================================================================
// GAME STATE
// =============================================================================

export interface GameClock {
  quarter: 1 | 2 | 3 | 4;
  minutes: number;
  seconds: number;
  playClock: number;
  isRunning: boolean;
}

export interface FieldPosition {
  yardLine: number;                     // 0-100 (0 = own endzone, 100 = opponent endzone)
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  possession: 'home' | 'away';
}

export interface GameScore {
  home: number;
  away: number;
}

export type PlayPhase =
  | 'HUDDLE'
  | 'BREAKING_HUDDLE'
  | 'PRE_SNAP'
  | 'SNAP'
  | 'ACTIVE'
  | 'TACKLE'
  | 'WHISTLE';

export interface PlayResult {
  yardsGained: number;
  turnover: boolean;
  turnoverType?: 'FUMBLE' | 'INTERCEPTION';
  touchdown: boolean;
  outOfBounds: boolean;
  incomplete: boolean;
  sack: boolean;
  safety?: boolean;
  tackledBy?: string;
  clockStops: boolean;
  delayOfGame?: boolean;
  penalty?: {
    type: string;
    team: 'offense' | 'defense';
    yards: number;
    description: string;
    accepted: boolean;
    automaticFirstDown: boolean;
  };
}

/**
 * Full game state during simulation
 */
export interface GameState {
  phase: PlayPhase;
  clock: GameClock;
  field: FieldPosition;
  score: GameScore;

  // Players on field (5 skill players each side)
  offensivePlayers: FieldPlayer[];
  defensivePlayers: FieldPlayer[];

  // Line units (aggregate stats, not individual players)
  offensiveLine: FieldLineUnit;
  defensiveLine: FieldLineUnit;

  // Ball state
  ballCarrier?: string;                 // Field position ID (e.g., 'RB', 'WR1')
  ballLocation: Vector2;
  passFlight?: PassFlight;

  // Play info
  selectedPlay?: OffensivePlay | DefensivePlay;
  lastResult?: PlayResult;

  // Visual effects
  handoffEffect?: { x: number; y: number; startTime: number };
  currentTime?: number;
}

// =============================================================================
// STATS TRACKING
// =============================================================================

export interface GameStats {
  passingYards: number;
  rushingYards: number;
  passingTDs: number;
  rushingTDs: number;
  interceptions: number;
  fumbles: number;
  completions: number;
  attempts: number;
  sacks: number;
  firstDowns: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  timeOfPossession: number;
}

// =============================================================================
// HELPER: Convert roster position to field ID for routes
// =============================================================================

/**
 * Get the field ID used for routes based on roster position and formation.
 * This is what the engine uses to assign routes to players.
 */
export function getFieldId(rosterPosition: RosterPosition, _formation: OffenseFormation): string {
  // Most positions keep their roster position as field ID
  // (FLEX handling removed - no longer a valid RosterPosition)
  return rosterPosition;
}
