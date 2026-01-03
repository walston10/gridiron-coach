/**
 * Gameplay Types - Mobile-first game control interfaces
 */

import type { Point } from './input.types';

/** Current phase of gameplay for controls */
export type ControlPhase =
  | 'pre-snap-offense'   // Selecting play, reading defense
  | 'pre-snap-defense'   // Selecting defender to control, reading offense
  | 'live-offense'       // Controlling ball carrier or QB
  | 'live-defense'       // Controlling selected defender
  | 'ball-in-air'        // Pass is in flight
  | 'play-dead'          // Between plays
  | 'special-teams';     // Kicks, punts

/** Who the player is currently controlling */
export interface ControlledPlayer {
  playerId: string;
  role: 'qb' | 'runner' | 'defender';
  /** Whether this player has the ball */
  hasBall: boolean;
  /** Whether player is engaged in a block */
  isBlocked: boolean;
}

/** Offense control actions */
export type OffenseAction =
  | { type: 'snap' }
  | { type: 'move'; direction: Point }
  | { type: 'throw'; targetPlayerId: string }
  | { type: 'throw-spot'; location: Point }
  | { type: 'juke' }
  | { type: 'spin' }
  | { type: 'truck'; targetDefenderId: string }
  | { type: 'dive' }
  | { type: 'select-play'; playId: string };

/** Defense control actions */
export type DefenseAction =
  | { type: 'select-defender'; playerId: string }
  | { type: 'move'; direction: Point }
  | { type: 'shed-block'; direction: Point }
  | { type: 'dive-tackle' }
  | { type: 'swat-ball' }
  | { type: 'select-play'; playId: string };

/** Combined game action */
export type GameAction =
  | { side: 'offense'; action: OffenseAction }
  | { side: 'defense'; action: DefenseAction }
  | { side: 'special'; action: { type: 'the-call' } };

/** The Call (bribe) system state */
export interface TheCallState {
  /** Is the call button available this drive? */
  available: boolean;
  /** Current heat level (0-100) */
  heatLevel: number;
  /** Cost in slush fund dollars */
  currentCost: number;
  /** Is the button temporarily disabled (high heat)? */
  disabled: boolean;
  /** Number of times used this season */
  usageCount: number;
}

/** Block shed prompt state */
export interface BlockShedPrompt {
  /** Player who needs to shed */
  defenderId: string;
  /** Direction player needs to swipe */
  requiredDirection: 'up' | 'down' | 'left' | 'right';
  /** Time remaining to react (seconds) */
  timeRemaining: number;
  /** Window size based on player rating (seconds) */
  windowSize: number;
}

/** Camera state */
export interface CameraState {
  /** Center point of camera focus */
  focus: Point;
  /** Zoom level (1.0 = normal) */
  zoom: number;
  /** Which side are we on? Affects camera orientation */
  side: 'offense' | 'defense';
}

/** Orientation requirements */
export type DeviceOrientation = 'portrait' | 'landscape';

export interface OrientationState {
  current: DeviceOrientation;
  required: DeviceOrientation;
  showPrompt: boolean;
}
