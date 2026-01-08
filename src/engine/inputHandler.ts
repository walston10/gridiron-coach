/**
 * Unified Input Handler
 *
 * Normalizes touch and mouse input into a common gesture system.
 * Mobile-first design that also works seamlessly with desktop.
 *
 * Touch events → GestureEvent
 * Mouse events → GestureEvent (click = tap, click-drag = swipe)
 */

import type {
  GestureEvent,
  GestureType,
  SwipeDirection,
  Point,
  InputState,
  InputHandlerConfig,
  GestureCallback,
  InputStateCallback,
  GestureTarget,
} from '../types/input.types';

const THRESHOLDS = {
  TAP_MAX_DURATION: 150,
  TAP_MAX_MOVEMENT: 10,
  SWIPE_MIN_MOVEMENT: 10,
  HOLD_MIN_DURATION: 300,
  GESTURE_DEBOUNCE: 50,
};

interface GestureState {
  isActive: boolean;
  startPos: Point;
  currentPos: Point;
  startTime: number;
  holdTimeout: number | null;
  lastGestureTime: number;
}

export class InputHandler {
  private canvas: HTMLElement;
  private onGesture?: GestureCallback;
  private onInputState?: InputStateCallback;
  private screenToField?: (pos: Point) => Point;
  private findPlayerAtPos?: (pos: Point) => GestureTarget | undefined;

  private gestureState: GestureState = {
    isActive: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    startTime: 0,
    holdTimeout: null,
    lastGestureTime: 0,
  };

  private inputState: InputState = {
    direction: { x: 0, y: 0 },
    fieldPosition: undefined,
    sprinting: false,
    isActive: false,
  };

  // Bound event handlers for cleanup
  private boundHandlers: {
    touchStart: (e: TouchEvent) => void;
    touchMove: (e: TouchEvent) => void;
    touchEnd: (e: TouchEvent) => void;
    mouseDown: (e: MouseEvent) => void;
    mouseMove: (e: MouseEvent) => void;
    mouseUp: (e: MouseEvent) => void;
    contextMenu: (e: Event) => void;
  };

  constructor(config: InputHandlerConfig) {
    this.canvas = config.canvas;
    this.onGesture = config.onGesture;
    this.onInputState = config.onInputState;
    this.screenToField = config.screenToField;
    this.findPlayerAtPos = config.findPlayerAtPos;

    // Bind handlers
    this.boundHandlers = {
      touchStart: this.handleTouchStart.bind(this),
      touchMove: this.handleTouchMove.bind(this),
      touchEnd: this.handleTouchEnd.bind(this),
      mouseDown: this.handleMouseDown.bind(this),
      mouseMove: this.handleMouseMove.bind(this),
      mouseUp: this.handleMouseUp.bind(this),
      contextMenu: (e: Event) => e.preventDefault(),
    };

    this.attachListeners();
  }

  private attachListeners(): void {
    // Touch events
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.boundHandlers.touchEnd, { passive: false });

    // Mouse events
    this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseUp);

    // Prevent context menu on long press
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextMenu);
  }

  destroy(): void {
    this.canvas.removeEventListener('touchstart', this.boundHandlers.touchStart);
    this.canvas.removeEventListener('touchmove', this.boundHandlers.touchMove);
    this.canvas.removeEventListener('touchend', this.boundHandlers.touchEnd);
    this.canvas.removeEventListener('touchcancel', this.boundHandlers.touchEnd);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseUp);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextMenu);

    if (this.gestureState.holdTimeout) {
      clearTimeout(this.gestureState.holdTimeout);
    }
  }

  // =========================================================================
  // TOUCH HANDLERS
  // =========================================================================

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const pos = this.getTouchPos(touch);
    this.startGesture(pos);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const pos = this.getTouchPos(touch);
    this.updateGesture(pos);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.endGesture();
  }

  private getTouchPos(touch: Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  // =========================================================================
  // MOUSE HANDLERS
  // =========================================================================

  private handleMouseDown(e: MouseEvent): void {
    // Only handle left click
    if (e.button !== 0) return;

    const pos = this.getMousePos(e);
    this.startGesture(pos);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.gestureState.isActive) return;

    const pos = this.getMousePos(e);
    this.updateGesture(pos);
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (!this.gestureState.isActive) return;
    this.endGesture();
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // =========================================================================
  // UNIFIED GESTURE HANDLING
  // =========================================================================

  private startGesture(pos: Point): void {
    const now = Date.now();

    // Debounce rapid gestures
    if (now - this.gestureState.lastGestureTime < THRESHOLDS.GESTURE_DEBOUNCE) {
      return;
    }

    // Clear any existing hold timeout
    if (this.gestureState.holdTimeout) {
      clearTimeout(this.gestureState.holdTimeout);
    }

    this.gestureState = {
      isActive: true,
      startPos: { ...pos },
      currentPos: { ...pos },
      startTime: now,
      holdTimeout: null,
      lastGestureTime: this.gestureState.lastGestureTime,
    };

    // Set up hold detection
    this.gestureState.holdTimeout = window.setTimeout(() => {
      if (this.gestureState.isActive) {
        const movement = this.getMovement();
        if (movement < THRESHOLDS.TAP_MAX_MOVEMENT) {
          // It's a hold!
          this.emitGesture('hold');
        }
      }
    }, THRESHOLDS.HOLD_MIN_DURATION);

    // Update input state
    this.inputState.isActive = true;
    // Set field position immediately on click/touch
    if (this.screenToField) {
      this.inputState.fieldPosition = this.screenToField(pos);
    }
    this.emitInputState();
  }

  private updateGesture(pos: Point): void {
    if (!this.gestureState.isActive) return;

    this.gestureState.currentPos = { ...pos };

    // Convert current position to field coordinates for "move toward" controls
    if (this.screenToField) {
      this.inputState.fieldPosition = this.screenToField(pos);
    }

    // Calculate direction for continuous movement (legacy - kept for compatibility)
    const delta = {
      x: pos.x - this.gestureState.startPos.x,
      y: pos.y - this.gestureState.startPos.y,
    };

    const magnitude = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

    if (magnitude > THRESHOLDS.SWIPE_MIN_MOVEMENT) {
      // Normalize direction
      this.inputState.direction = {
        x: delta.x / magnitude,
        y: delta.y / magnitude,
      };

      // Cancel hold detection if we're moving
      if (this.gestureState.holdTimeout) {
        clearTimeout(this.gestureState.holdTimeout);
        this.gestureState.holdTimeout = null;
      }
    } else {
      this.inputState.direction = { x: 0, y: 0 };
    }

    this.emitInputState();
  }

  private endGesture(): void {
    if (!this.gestureState.isActive) return;

    const now = Date.now();
    const duration = now - this.gestureState.startTime;
    const movement = this.getMovement();

    // Clear hold timeout
    if (this.gestureState.holdTimeout) {
      clearTimeout(this.gestureState.holdTimeout);
      this.gestureState.holdTimeout = null;
    }

    // Determine gesture type
    if (movement < THRESHOLDS.TAP_MAX_MOVEMENT && duration < THRESHOLDS.TAP_MAX_DURATION) {
      this.emitGesture('tap');
    } else if (movement >= THRESHOLDS.SWIPE_MIN_MOVEMENT) {
      this.emitGesture('swipe');
    }
    // Hold is already emitted via timeout

    // Reset state
    this.gestureState.isActive = false;
    this.gestureState.lastGestureTime = now;

    this.inputState.isActive = false;
    this.inputState.direction = { x: 0, y: 0 };
    this.inputState.fieldPosition = undefined;
    this.emitInputState();
  }

  private getMovement(): number {
    const dx = this.gestureState.currentPos.x - this.gestureState.startPos.x;
    const dy = this.gestureState.currentPos.y - this.gestureState.startPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getSwipeDirection(): SwipeDirection {
    const dx = this.gestureState.currentPos.x - this.gestureState.startPos.x;
    const dy = this.gestureState.currentPos.y - this.gestureState.startPos.y;

    // Determine primary direction
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private emitGesture(type: GestureType): void {
    if (!this.onGesture) return;

    const delta = {
      x: this.gestureState.currentPos.x - this.gestureState.startPos.x,
      y: this.gestureState.currentPos.y - this.gestureState.startPos.y,
    };

    // Convert to field coordinates if function provided
    let target: GestureTarget | undefined;
    if (this.screenToField && this.findPlayerAtPos) {
      const fieldPos = this.screenToField(this.gestureState.startPos);
      target = this.findPlayerAtPos(fieldPos);
      if (!target) {
        target = { type: 'field', fieldPos };
      }
    }

    const event: GestureEvent = {
      type,
      startPos: { ...this.gestureState.startPos },
      endPos: { ...this.gestureState.currentPos },
      direction: type === 'swipe' ? this.getSwipeDirection() : undefined,
      duration: Date.now() - this.gestureState.startTime,
      target,
      timestamp: this.gestureState.startTime,
      delta,
    };

    this.onGesture(event);
  }

  private emitInputState(): void {
    if (!this.onInputState) return;
    this.onInputState({ ...this.inputState });
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /** Update the selected player (for defense) */
  setSelectedPlayer(playerId: string | undefined): void {
    this.inputState.selectedPlayer = playerId;
  }

  /** Toggle sprint mode */
  setSprinting(sprinting: boolean): void {
    this.inputState.sprinting = sprinting;
    this.emitInputState();
  }

  /** Get current input state */
  getInputState(): InputState {
    return { ...this.inputState };
  }

  /** Check if input is currently active */
  isActive(): boolean {
    return this.gestureState.isActive;
  }

  /** Update screen-to-field converter (useful when canvas resizes) */
  setScreenToField(converter: (pos: Point) => Point): void {
    this.screenToField = converter;
  }

  /** Update player finder function */
  setFindPlayerAtPos(finder: (pos: Point) => GestureTarget | undefined): void {
    this.findPlayerAtPos = finder;
  }

  /** Update gesture callback */
  setOnGesture(callback: GestureCallback | undefined): void {
    this.onGesture = callback;
  }

  /** Update input state callback */
  setOnInputState(callback: InputStateCallback | undefined): void {
    this.onInputState = callback;
  }
}

/** Singleton factory for easy access */
let instance: InputHandler | null = null;

export function createInputHandler(config: InputHandlerConfig): InputHandler {
  if (instance) {
    instance.destroy();
  }
  instance = new InputHandler(config);
  return instance;
}

export function getInputHandler(): InputHandler | null {
  return instance;
}

export function destroyInputHandler(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
