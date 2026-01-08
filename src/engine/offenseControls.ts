/**
 * Offense Controls
 *
 * Translates gestures into offensive game actions.
 * Handles pre-snap (play selection, snap) and post-snap (passing, running, evasion).
 */

import type { GestureEvent, InputState, Point } from '../types/input.types';
import type { OffenseAction, ControlPhase, ControlledPlayer } from '../types/gameplay.types';
import type { GameEngine } from './GameEngine';

/** Threshold for detecting quick reverse swipe (juke) */
const JUKE_DIRECTION_CHANGE_THRESHOLD = 0.8; // cos(~37 degrees)

/** Minimum speed for truck attempt */
const TRUCK_PROXIMITY_THRESHOLD = 15; // ~5 yards in engine units

export class OffenseControls {
  private engine: GameEngine;
  private lastSwipeDirection: Point = { x: 0, y: 0 };
  private lastSwipeTime: number = 0;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * Handle a gesture event and return the appropriate action
   */
  handleGesture(
    gesture: GestureEvent,
    phase: ControlPhase,
    controlled: ControlledPlayer | null
  ): OffenseAction | null {
    switch (phase) {
      case 'pre-snap-offense':
        return this.handlePreSnapGesture(gesture);

      case 'live-offense':
        return this.handleLiveGesture(gesture, controlled);

      case 'ball-in-air':
        // No offensive actions while ball is in flight
        return null;

      default:
        return null;
    }
  }

  /**
   * Handle continuous input state (for movement)
   * Uses "move toward" logic: carrier moves toward the touch/click position
   */
  handleInputState(
    state: InputState,
    phase: ControlPhase,
    controlled: ControlledPlayer | null
  ): OffenseAction | null {
    if (phase !== 'live-offense' || !controlled?.hasBall) {
      return null;
    }

    // Only process if input is active
    if (!state.isActive) {
      return null;
    }

    // Prefer "move toward" using field position (simpler and more intuitive)
    if (state.fieldPosition) {
      const gameState = this.engine.getState();
      const carrier = gameState.offensivePlayers.find(p => p.id === gameState.ballCarrier);

      if (carrier) {
        // Calculate direction from carrier to touch/click point
        const dx = state.fieldPosition.x - carrier.location.x;
        const dy = state.fieldPosition.y - carrier.location.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);

        // Dead zone - don't move if already near the target (prevents jittery movement)
        if (magnitude < 8) {
          return null;
        }

        // Normalize and apply sprint modifier
        const speed = state.sprinting ? 1.5 : 1.0;
        return {
          type: 'move',
          direction: {
            x: (dx / magnitude) * speed,
            y: (dy / magnitude) * speed,
          },
        };
      }
    }

    // Fallback to legacy direction-based movement (shouldn't normally be used)
    if (state.direction.x !== 0 || state.direction.y !== 0) {
      const speed = state.sprinting ? 1.5 : 1.0;
      return {
        type: 'move',
        direction: {
          x: state.direction.x * speed,
          y: -state.direction.y * speed,
        },
      };
    }

    return null;
  }

  // ===========================================================================
  // PRE-SNAP HANDLERS
  // ===========================================================================

  private handlePreSnapGesture(gesture: GestureEvent): OffenseAction | null {
    if (gesture.type === 'tap') {
      // Tap on UI element (playbook) handled elsewhere
      if (gesture.target?.type === 'ui') {
        return null; // Let UI handle it
      }

      // Tap anywhere on field = snap
      if (gesture.target?.type === 'field' || gesture.target?.type === 'player') {
        return { type: 'snap' };
      }
    }

    return null;
  }

  // ===========================================================================
  // LIVE PLAY HANDLERS
  // ===========================================================================

  private handleLiveGesture(
    gesture: GestureEvent,
    controlled: ControlledPlayer | null
  ): OffenseAction | null {
    if (!controlled) return null;

    // QB with ball - can throw
    if (controlled.role === 'qb' && controlled.hasBall) {
      return this.handleQBGesture(gesture);
    }

    // Runner with ball - can evade
    if (controlled.hasBall) {
      return this.handleRunnerGesture(gesture);
    }

    return null;
  }

  private handleQBGesture(gesture: GestureEvent): OffenseAction | null {
    if (gesture.type === 'tap') {
      // Tap on receiver = throw to them
      if (gesture.target?.type === 'player' && gesture.target.team === 'offense') {
        return { type: 'throw', targetPlayerId: gesture.target.playerId };
      }

      // Tap on field = throw to spot
      if (gesture.target?.type === 'field') {
        return { type: 'throw-spot', location: gesture.target.fieldPos };
      }
    }

    if (gesture.type === 'swipe') {
      // Swipe = scramble in that direction
      return this.createMoveAction(gesture);
    }

    return null;
  }

  private handleRunnerGesture(gesture: GestureEvent): OffenseAction | null {
    if (gesture.type === 'tap') {
      // Tap while running = dive
      return { type: 'dive' };
    }

    if (gesture.type === 'swipe') {
      return this.handleRunnerSwipe(gesture);
    }

    return null;
  }

  private handleRunnerSwipe(gesture: GestureEvent): OffenseAction | null {
    const now = Date.now();
    const delta = gesture.delta || { x: 0, y: 0 };

    // Normalize swipe direction
    const magnitude = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    if (magnitude < 1) {
      return this.createMoveAction(gesture);
    }

    const normalizedDir = {
      x: delta.x / magnitude,
      y: delta.y / magnitude,
    };

    // Check for quick reverse swipe (juke)
    if (now - this.lastSwipeTime < 300) {
      const dot =
        this.lastSwipeDirection.x * normalizedDir.x +
        this.lastSwipeDirection.y * normalizedDir.y;

      if (dot < -JUKE_DIRECTION_CHANGE_THRESHOLD) {
        // Quick reverse = juke/spin
        this.lastSwipeDirection = normalizedDir;
        this.lastSwipeTime = now;

        // Perpendicular to original direction = spin, opposite = juke
        if (Math.abs(dot) > 0.9) {
          return { type: 'juke' };
        } else {
          return { type: 'spin' };
        }
      }
    }

    // Check for truck attempt (swipe toward nearby defender)
    const truckTarget = this.findTruckTarget(gesture);
    if (truckTarget) {
      return { type: 'truck', targetDefenderId: truckTarget };
    }

    // Regular movement
    this.lastSwipeDirection = normalizedDir;
    this.lastSwipeTime = now;

    return this.createMoveAction(gesture);
  }

  private createMoveAction(gesture: GestureEvent): OffenseAction {
    // Convert swipe direction to movement
    // Note: Screen Y is inverted (down = positive), but field Y might be too
    const delta = gesture.delta || {
      x: gesture.endPos.x - gesture.startPos.x,
      y: gesture.endPos.y - gesture.startPos.y,
    };

    const magnitude = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    if (magnitude < 1) {
      return { type: 'move', direction: { x: 0, y: 0 } };
    }

    return {
      type: 'move',
      direction: {
        x: delta.x / magnitude,
        y: -delta.y / magnitude, // Invert Y for field coordinates
      },
    };
  }

  private findTruckTarget(gesture: GestureEvent): string | null {
    const state = this.engine.getState();
    const ballCarrier = state.offensivePlayers.find(
      (p) => p.id === state.ballCarrier
    );

    if (!ballCarrier) return null;

    // Swipe direction in field coordinates
    const delta = gesture.delta || { x: 0, y: 0 };
    const magnitude = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    if (magnitude < 1) return null;

    const swipeDir = {
      x: delta.x / magnitude,
      y: -delta.y / magnitude,
    };

    // Find defender in swipe direction within truck range
    for (const defender of state.defensivePlayers) {
      const toDefender = {
        x: defender.location.x - ballCarrier.location.x,
        y: defender.location.y - ballCarrier.location.y,
      };

      const distance = Math.sqrt(
        toDefender.x * toDefender.x + toDefender.y * toDefender.y
      );

      if (distance > TRUCK_PROXIMITY_THRESHOLD) continue;

      // Check if swipe is toward this defender
      const toDefNorm = {
        x: toDefender.x / distance,
        y: toDefender.y / distance,
      };

      const dot = swipeDir.x * toDefNorm.x + swipeDir.y * toDefNorm.y;

      if (dot > 0.7) {
        // Swiping toward this defender
        return defender.id;
      }
    }

    return null;
  }

  // ===========================================================================
  // ACTION EXECUTION
  // ===========================================================================

  /**
   * Execute an offense action on the game engine
   */
  executeAction(action: OffenseAction): boolean {
    switch (action.type) {
      case 'snap':
        this.engine.snap();
        return true;

      case 'move':
        this.engine.moveBallCarrier(action.direction);
        return true;

      case 'throw':
        return this.throwToReceiver(action.targetPlayerId);

      case 'throw-spot':
        this.engine.throwToSpot(action.location);
        return true;

      case 'juke':
        this.engine.juke();
        return true;

      case 'spin':
        this.engine.spin();
        return true;

      case 'truck':
        // Truck is just a power move toward defender
        // Engine handles collision/tackle logic
        return this.executeTruck(action.targetDefenderId);

      case 'dive':
        this.engine.dive();
        return true;

      case 'select-play':
        // Handled by UI
        return false;

      default:
        return false;
    }
  }

  private throwToReceiver(receiverId: string): boolean {
    const state = this.engine.getState();
    const receiver = state.offensivePlayers.find(
      (p) => p.id === receiverId || p.playerId === receiverId
    );

    if (receiver) {
      // Lead the receiver slightly based on their velocity
      const leadTime = 0.3; // seconds
      const targetPos = {
        x: receiver.location.x + (receiver.velocity?.x || 0) * leadTime * 60,
        y: receiver.location.y + (receiver.velocity?.y || 0) * leadTime * 60,
      };
      this.engine.throwToSpot(targetPos);
      return true;
    }

    return false;
  }

  private executeTruck(defenderId: string): boolean {
    const state = this.engine.getState();
    const defender = state.defensivePlayers.find((p) => p.id === defenderId);
    const carrier = state.offensivePlayers.find(
      (p) => p.id === state.ballCarrier
    );

    if (!defender || !carrier) return false;

    // Move directly toward defender (the "truck" attempt)
    const toDefender = {
      x: defender.location.x - carrier.location.x,
      y: defender.location.y - carrier.location.y,
    };

    const magnitude = Math.sqrt(
      toDefender.x * toDefender.x + toDefender.y * toDefender.y
    );

    if (magnitude > 0) {
      this.engine.moveBallCarrier({
        x: (toDefender.x / magnitude) * 1.5, // Extra power
        y: (toDefender.y / magnitude) * 1.5,
      });
    }

    return true;
  }
}
