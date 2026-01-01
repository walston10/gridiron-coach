// Core game types

export type Position =
  | 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT'  // Offense
  | 'DE' | 'DT' | 'NT' | 'OLB' | 'MLB' | 'ILB' | 'CB' | 'FS' | 'SS';    // Defense

export type Formation =
  | 'I_FORM' | 'SHOTGUN' | 'SINGLEBACK' | 'PISTOL'           // Offense
  | '4_3' | '3_4' | 'NICKEL' | 'DIME' | '4_4';               // Defense

export type RouteType =
  | 'STREAK' | 'POST' | 'CORNER' | 'OUT' | 'IN' | 'SLANT'
  | 'CURL' | 'COMEBACK' | 'FLAT' | 'WHEEL' | 'DRAG' | 'BLOCK';

export type CoverageType =
  | 'COVER_0' | 'COVER_1' | 'COVER_2' | 'COVER_3' | 'COVER_4'
  | 'COVER_2_MAN' | 'TAMPA_2' | 'MAN_FREE';

export type BlitzType = 'NONE' | 'MLB' | 'OLB' | 'CB' | 'SAFETY' | 'ZONE';

export interface Vector2 {
  x: number;
  y: number;
}

// Player on field during play
export interface FieldPlayer {
  id: string;
  position: Position;
  location: Vector2;
  velocity: Vector2;
  speed: number;        // 1-99
  acceleration: number; // 1-99
  route?: RouteType;
  assignment?: 'BLOCK' | 'RUSH' | 'ZONE' | 'MAN';
  targetId?: string;    // For man coverage - who they're covering
  // Position-specific stats
  accuracy?: number;    // QB only: 1-99
  armStrength?: number; // QB only: 1-99
  catch?: number;       // WR/TE/RB/DB: 1-99
}

// Pass in flight tracking
export interface PassFlight {
  startLocation: Vector2;
  landingSpot: Vector2;
  airTime: number;      // Total time in seconds
  elapsedTime: number;  // Current elapsed time
  intendedTarget?: string; // Player ID of intended receiver
}

// Offensive play definition
export interface OffensivePlay {
  id: string;
  name: string;
  formation: Formation;
  type: 'RUN' | 'PASS' | 'PLAY_ACTION' | 'SCREEN';
  routes: Record<string, RouteType>;        // position -> route
  runGap?: 'LEFT_END' | 'LEFT_TACKLE' | 'LEFT_GUARD' | 'CENTER' | 'RIGHT_GUARD' | 'RIGHT_TACKLE' | 'RIGHT_END';
  rollout?: 'LEFT' | 'RIGHT' | 'NONE';
  description: string;
}

// Defensive play definition
export interface DefensivePlay {
  id: string;
  name: string;
  formation: Formation;
  coverage: CoverageType;
  blitz: BlitzType;
  blitzers?: Position[];
  description: string;
}

// Game clock and state
export interface GameClock {
  quarter: 1 | 2 | 3 | 4;
  minutes: number;
  seconds: number;
  playClock: number;
  isRunning: boolean;
}

export interface FieldPosition {
  yardLine: number;      // 0-100 (0 = own endzone, 100 = opponent endzone)
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  possession: 'home' | 'away';
}

export interface GameScore {
  home: number;
  away: number;
}

export type PlayPhase =
  | 'PRE_SNAP'      // Selecting play, reading defense
  | 'SNAP'          // Ball snapped, routes developing
  | 'ACTIVE'        // Ball in play (pass thrown or handoff)
  | 'TACKLE'        // Play ending
  | 'WHISTLE';      // Play dead, calculating result

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
}

// Full game state
export interface GameState {
  phase: PlayPhase;
  clock: GameClock;
  field: FieldPosition;
  score: GameScore;
  offensivePlayers: FieldPlayer[];
  defensivePlayers: FieldPlayer[];
  ballCarrier?: string;        // Player ID
  ballLocation: Vector2;
  passFlight?: PassFlight;     // Ball in air tracking
  selectedPlay?: OffensivePlay | DefensivePlay;
  lastResult?: PlayResult;
}

// Stats tracking
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
