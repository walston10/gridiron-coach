/**
 * Defense Controls
 *
 * Translates gestures into defensive game actions.
 * Handles pre-snap (defender selection) and post-snap (pursuit, block shedding).
 */

import type { GestureEvent, InputState, Point } from '../types/input.types';
import type {
  DefenseAction,
  ControlPhase,
  ControlledPlayer,
  BlockShedPrompt,
} from '../types/gameplay.types';
import type { GameEngine } from './GameEngine';
import type { FieldPlayer } from '../types/GameSim';

/** Distance at which tackle auto-triggers */
const TACKLE_PROXIMITY = 6; // ~2 yards

/** Window for block shed input (scales with rating) */
const BASE_SHED_WINDOW = 0.8; // seconds
const RATING_SHED_BONUS = 0.4; // bonus at 99 rating

export class DefenseControls {
  private engine: GameEngine;
  private selectedDefenderId: string | null = null;
  private blockShedPrompt: BlockShedPrompt | null = null;
  private blockShedStartTime: number = 0;

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
  ): DefenseAction | null {
    switch (phase) {
      case 'pre-snap-defense':
        return this.handlePreSnapGesture(gesture);

      case 'live-defense':
        return this.handleLiveGesture(gesture, controlled);

      case 'ball-in-air':
        return this.handleBallInAirGesture(gesture, controlled);

      default:
        return null;
    }
  }

  /**
   * Handle continuous input state (for movement)
   */
  handleInputState(
    state: InputState,
    phase: ControlPhase,
    controlled: ControlledPlayer | null
  ): DefenseAction | null {
    if (phase !== 'live-defense' || !controlled) {
      return null;
    }

    // Can't move while engaged in block
    if (controlled.isBlocked) {
      return null;
    }

    // Continuous movement while input is active
    if (state.isActive && (state.direction.x !== 0 || state.direction.y !== 0)) {
      const speed = state.sprinting ? 1.5 : 1.0;
      return {
        type: 'move',
        direction: {
          x: state.direction.x * speed,
          y: state.direction.y * speed,
        },
      };
    }

    return null;
  }

  // ===========================================================================
  // PRE-SNAP HANDLERS
  // ===========================================================================

  private handlePreSnapGesture(gesture: GestureEvent): DefenseAction | null {
    if (gesture.type === 'tap') {
      // Tap on defender = select them
      if (gesture.target?.type === 'player' && gesture.target.team === 'defense') {
        this.selectedDefenderId = gesture.target.playerId;
        return { type: 'select-defender', playerId: gesture.target.playerId };
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
  ): DefenseAction | null {
    if (!controlled) return null;

    // If blocked, check for block shed attempt
    if (controlled.isBlocked && this.blockShedPrompt) {
      return this.handleBlockShedGesture(gesture);
    }

    if (gesture.type === 'swipe') {
      return this.handlePursuitSwipe(gesture);
    }

    if (gesture.type === 'tap') {
      // Tap near ball carrier = dive tackle
      if (this.isNearBallCarrier(controlled.playerId)) {
        return { type: 'dive-tackle' };
      }
    }

    return null;
  }

  private handleBallInAirGesture(
    gesture: GestureEvent,
    controlled: ControlledPlayer | null
  ): DefenseAction | null {
    if (!controlled) return null;

    if (gesture.type === 'tap') {
      // Tap while ball is in air = attempt swat/interception
      return { type: 'swat-ball' };
    }

    if (gesture.type === 'swipe') {
      // Still allow movement to get into position
      return this.handlePursuitSwipe(gesture);
    }

    return null;
  }

  private handlePursuitSwipe(gesture: GestureEvent): DefenseAction {
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

  // ===========================================================================
  // BLOCK SHED SYSTEM
  // ===========================================================================

  private handleBlockShedGesture(gesture: GestureEvent): DefenseAction | null {
    if (!this.blockShedPrompt || gesture.type !== 'swipe') {
      return null;
    }

    // Check if swipe matches required direction
    if (gesture.direction === this.blockShedPrompt.requiredDirection) {
      // Check timing
      const elapsed = (Date.now() - this.blockShedStartTime) / 1000;
      if (elapsed <= this.blockShedPrompt.windowSize) {
        // Successful shed!
        const direction = this.getDirectionVector(gesture.direction);
        this.clearBlockShedPrompt();
        return { type: 'shed-block', direction };
      }
    }

    // Wrong direction or too late - stay blocked
    return null;
  }

  /**
   * Start a block shed prompt for a defender
   */
  startBlockShedPrompt(defenderId: string, defenderRating: number): void {
    // Random direction
    const directions: ('up' | 'down' | 'left' | 'right')[] = [
      'up',
      'down',
      'left',
      'right',
    ];
    const requiredDirection =
      directions[Math.floor(Math.random() * directions.length)];

    // Window size scales with rating (50-99 rating)
    const ratingFactor = (defenderRating - 50) / 49;
    const windowSize = BASE_SHED_WINDOW + RATING_SHED_BONUS * ratingFactor;

    this.blockShedPrompt = {
      defenderId,
      requiredDirection,
      timeRemaining: windowSize,
      windowSize,
    };
    this.blockShedStartTime = Date.now();
  }

  /**
   * Update block shed timing (call each frame)
   */
  updateBlockShedPrompt(deltaTime: number): void {
    if (!this.blockShedPrompt) return;

    this.blockShedPrompt.timeRemaining -= deltaTime;

    if (this.blockShedPrompt.timeRemaining <= 0) {
      // Window expired - failed to shed
      this.clearBlockShedPrompt();
    }
  }

  /**
   * Get current block shed prompt (for UI)
   */
  getBlockShedPrompt(): BlockShedPrompt | null {
    return this.blockShedPrompt;
  }

  private clearBlockShedPrompt(): void {
    this.blockShedPrompt = null;
  }

  private getDirectionVector(
    direction: 'up' | 'down' | 'left' | 'right'
  ): Point {
    switch (direction) {
      case 'up':
        return { x: 0, y: -1 };
      case 'down':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'right':
        return { x: 1, y: 0 };
    }
  }

  // ===========================================================================
  // TACKLE DETECTION
  // ===========================================================================

  private isNearBallCarrier(defenderId: string): boolean {
    const state = this.engine.getState();
    const defender = state.defensivePlayers.find((p) => p.id === defenderId);
    const ballCarrier = state.offensivePlayers.find(
      (p) => p.id === state.ballCarrier
    );

    if (!defender || !ballCarrier) return false;

    const dx = ballCarrier.location.x - defender.location.x;
    const dy = ballCarrier.location.y - defender.location.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= TACKLE_PROXIMITY;
  }

  // ===========================================================================
  // ACTION EXECUTION
  // ===========================================================================

  /**
   * Execute a defense action on the game engine
   */
  executeAction(action: DefenseAction): boolean {
    const state = this.engine.getState();

    switch (action.type) {
      case 'select-defender':
        this.selectedDefenderId = action.playerId;
        // Visual selection is handled by UI
        return true;

      case 'move':
        return this.moveSelectedDefender(action.direction);

      case 'shed-block':
        return this.shedBlock(action.direction);

      case 'dive-tackle':
        return this.diveTackle();

      case 'swat-ball':
        // Swat is automatically calculated based on position/timing
        // This just signals intent
        return true;

      case 'select-play':
        // Handled by UI
        return false;

      default:
        return false;
    }
  }

  private moveSelectedDefender(direction: Point): boolean {
    if (!this.selectedDefenderId) return false;

    // Sync with engine's controlled defender
    if (this.engine.getControlledDefender() !== this.selectedDefenderId) {
      this.engine.setControlledDefender(this.selectedDefenderId);
    }

    // Use engine's moveDefender method - this properly bypasses AI control
    this.engine.moveDefender({ x: direction.x, y: direction.y });

    return true;
  }

  private shedBlock(direction: Point): boolean {
    if (!this.selectedDefenderId) return false;

    const state = this.engine.getState();
    const defender = state.defensivePlayers.find(
      (p) => p.id === this.selectedDefenderId
    );

    if (!defender) return false;

    // Clear engagement state
    if (defender.engagementState === 'ENGAGED') {
      defender.engagementState = 'FREE';
      defender.blockEngagement = undefined;

      // Give burst of speed in shed direction
      const burstSpeed = 1.5;
      defender.velocity = {
        x: direction.x * burstSpeed,
        y: direction.y * burstSpeed,
      };

      return true;
    }

    return false;
  }

  private diveTackle(): boolean {
    if (!this.selectedDefenderId) return false;

    const state = this.engine.getState();
    const defender = state.defensivePlayers.find(
      (p) => p.id === this.selectedDefenderId
    );
    const ballCarrier = state.offensivePlayers.find(
      (p) => p.id === state.ballCarrier
    );

    if (!defender || !ballCarrier) return false;

    // Lunge toward ball carrier
    const dx = ballCarrier.location.x - defender.location.x;
    const dy = ballCarrier.location.y - defender.location.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      // Dive in direction of ball carrier
      const diveSpeed = 3;
      defender.velocity = {
        x: (dx / dist) * diveSpeed,
        y: (dy / dist) * diveSpeed,
      };
    }

    return true;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /** Get currently selected defender ID */
  getSelectedDefender(): string | null {
    return this.selectedDefenderId;
  }

  /** Set selected defender (can be called externally) */
  setSelectedDefender(defenderId: string | null): void {
    this.selectedDefenderId = defenderId;
  }

  /** Auto-select best defender based on play situation */
  autoSelectDefender(): string | null {
    const state = this.engine.getState();
    const ballCarrier = state.offensivePlayers.find(
      (p) => p.id === state.ballCarrier
    );

    if (!ballCarrier) {
      // Pre-snap or ball in air - select someone near the action
      // Default to a linebacker or safety (secondary)
      const goodDefenders = state.defensivePlayers.filter(
        (p) =>
          p.rosterPosition === 'LINEBACKERS' ||
          p.rosterPosition === 'SECONDARY' ||
          p.id.includes('LB') ||
          p.id.includes('CB') ||
          p.id.includes('FS') ||
          p.id.includes('SS')
      );

      if (goodDefenders.length > 0) {
        this.selectedDefenderId = goodDefenders[0].id;
        return this.selectedDefenderId;
      }
    } else {
      // Select closest defender to ball carrier
      let closest: FieldPlayer | null = null;
      let closestDist = Infinity;

      for (const defender of state.defensivePlayers) {
        const dx = ballCarrier.location.x - defender.location.x;
        const dy = ballCarrier.location.y - defender.location.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < closestDist) {
          closestDist = dist;
          closest = defender;
        }
      }

      if (closest) {
        this.selectedDefenderId = closest.id;
        return this.selectedDefenderId;
      }
    }

    // Fallback: first defender
    if (state.defensivePlayers.length > 0) {
      this.selectedDefenderId = state.defensivePlayers[0].id;
      return this.selectedDefenderId;
    }

    return null;
  }
}
