/**
 * Input Types - Unified gesture system for mobile-first controls
 * Works with both touch and mouse input
 */

export type GestureType = 'tap' | 'swipe' | 'hold';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface GestureEvent {
  type: GestureType;
  startPos: Point;
  endPos: Point;
  direction?: SwipeDirection;
  duration: number;
  /** Target player or zone if gesture hit one */
  target?: GestureTarget;
  /** Timestamp when gesture started */
  timestamp: number;
  /** Raw delta for swipe calculations */
  delta?: Point;
}

export type GestureTarget =
  | { type: 'player'; playerId: string; team: 'offense' | 'defense' }
  | { type: 'zone'; zoneId: string }
  | { type: 'field'; fieldPos: Point }
  | { type: 'ui'; elementId: string };

/** Thresholds for gesture detection */
export const GESTURE_THRESHOLDS = {
  /** Max duration for tap (ms) */
  TAP_MAX_DURATION: 150,
  /** Max movement for tap (px) */
  TAP_MAX_MOVEMENT: 10,
  /** Min movement for swipe (px) */
  SWIPE_MIN_MOVEMENT: 10,
  /** Min duration for hold (ms) */
  HOLD_MIN_DURATION: 300,
  /** Debounce time between gestures (ms) */
  GESTURE_DEBOUNCE: 50,
} as const;

/** Normalized input state for continuous movement */
export interface InputState {
  /** Current movement direction (normalized) */
  direction: Point;
  /** Whether sprint/boost is active */
  sprinting: boolean;
  /** Currently selected player ID (for defense) */
  selectedPlayer?: string;
  /** Whether input is currently active (finger down / mouse pressed) */
  isActive: boolean;
}

/** Callback types for input handler */
export type GestureCallback = (event: GestureEvent) => void;
export type InputStateCallback = (state: InputState) => void;

/** Input handler configuration */
export interface InputHandlerConfig {
  /** Canvas element to attach listeners to */
  canvas: HTMLCanvasElement;
  /** Callback for discrete gestures (tap, swipe end, hold) */
  onGesture?: GestureCallback;
  /** Callback for continuous input state updates */
  onInputState?: InputStateCallback;
  /** Function to convert screen coords to field coords */
  screenToField?: (screenPos: Point) => Point;
  /** Function to find player at field position */
  findPlayerAtPos?: (fieldPos: Point) => GestureTarget | undefined;
}
