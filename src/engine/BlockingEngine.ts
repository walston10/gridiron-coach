/**
 * Blocking Engine
 *
 * Handles engagement between offensive linemen (tackles) and edge rushers.
 * Uses a continuous contest system where each tick updates engagement progress.
 *
 * Engagement States:
 * - FREE: Not engaged with anyone, can move freely
 * - ENGAGED: Locked in a blocking battle
 * - BEATEN: Blocker lost, rusher breaks free
 * - WINNING: Blocker dominating, pushing rusher back
 */

import type { FieldPlayer, Vector2, BlockEngagement } from '../types/GameSim';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Distance at which players engage in blocking */
const ENGAGEMENT_RANGE = 6; // ~2 yards

/** Progress threshold for rusher to break free */
const BREAK_FREE_THRESHOLD = 100;

/** Progress threshold for blocker to dominate */
const DOMINATE_THRESHOLD = -80;

/** Base randomness range added to each contest roll */
const RANDOMNESS = 20;

/** How much to scale the contest delta each tick */
const CONTEST_SPEED = 0.8;

/** Speed multiplier when engaged (both players move slower) */
const ENGAGED_SPEED_MULT = 0.15;

/** Speed multiplier when rusher breaks free (burst) */
const BREAK_FREE_SPEED_MULT = 0.7;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// =============================================================================
// BLOCKING ENGINE CLASS
// =============================================================================

export class BlockingEngine {
  private currentTime: number = 0;

  /**
   * Update the blocking engine with current game time
   */
  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  /**
   * Check if two players should engage based on distance
   */
  shouldEngage(blocker: FieldPlayer, rusher: FieldPlayer): boolean {
    // Already engaged with each other
    if (blocker.blockEngagement?.engagedWith === rusher.id) return false;
    if (rusher.blockEngagement?.engagedWith === blocker.id) return false;

    // Check distance
    return distance(blocker.location, rusher.location) < ENGAGEMENT_RANGE;
  }

  /**
   * Start an engagement between a blocker and rusher
   */
  startEngagement(blocker: FieldPlayer, rusher: FieldPlayer): void {
    const engagement: BlockEngagement = {
      engagedWith: rusher.id,
      progress: 0,
      startTime: this.currentTime,
    };

    blocker.engagementState = 'ENGAGED';
    blocker.blockEngagement = { ...engagement, engagedWith: rusher.id };

    rusher.engagementState = 'ENGAGED';
    rusher.blockEngagement = { ...engagement, engagedWith: blocker.id };
  }

  /**
   * Run a single tick of the blocking contest
   * Returns true if engagement continues, false if it ended
   */
  tickEngagement(blocker: FieldPlayer, rusher: FieldPlayer): boolean {
    if (!blocker.blockEngagement || !rusher.blockEngagement) return false;

    // Calculate power for each side
    const blockerPower = this.calculateBlockerPower(blocker);
    const rusherPower = this.calculateRusherPower(rusher);

    // Delta: positive means rusher winning, negative means blocker winning
    const delta = (rusherPower - blockerPower) * CONTEST_SPEED;

    // Update progress
    blocker.blockEngagement.progress += delta;
    rusher.blockEngagement.progress += delta;

    const progress = blocker.blockEngagement.progress;

    // Check for resolution
    if (progress >= BREAK_FREE_THRESHOLD) {
      // Rusher wins! Break free
      this.endEngagement(blocker, rusher, 'rusher');
      return false;
    }

    if (progress <= DOMINATE_THRESHOLD) {
      // Blocker dominating - push rusher back
      blocker.engagementState = 'WINNING';
      rusher.engagementState = 'BEATEN';
      // Keep engaged but blocker is winning - rusher gets pushed back slowly
    }

    return true;
  }

  /**
   * End an engagement between two players
   */
  endEngagement(blocker: FieldPlayer, rusher: FieldPlayer, winner: 'blocker' | 'rusher'): void {
    if (winner === 'rusher') {
      // Rusher breaks free
      rusher.engagementState = 'FREE';
      rusher.blockEngagement = undefined;

      blocker.engagementState = 'BEATEN';
      blocker.blockEngagement = undefined;
    } else {
      // Blocker wins (dominated)
      blocker.engagementState = 'WINNING';
      blocker.blockEngagement = undefined;

      rusher.engagementState = 'BEATEN';
      rusher.blockEngagement = undefined;
    }
  }

  /**
   * Calculate blocker's power for this tick
   */
  private calculateBlockerPower(blocker: FieldPlayer): number {
    const passBlock = blocker.passBlock ?? 70;
    const strength = blocker.strength ?? 70;
    const randomFactor = randomBetween(0, RANDOMNESS);

    // passBlock is primary, strength is secondary
    return passBlock + (strength / 2) + randomFactor;
  }

  /**
   * Calculate rusher's power for this tick
   */
  private calculateRusherPower(rusher: FieldPlayer): number {
    const passRush = rusher.passRush ?? 70;
    const strength = rusher.strength ?? 70;
    const speed = rusher.speed ?? 70;
    const randomFactor = randomBetween(0, RANDOMNESS);

    // passRush is primary, strength and speed are secondary
    return passRush + (strength / 3) + (speed / 6) + randomFactor;
  }

  /**
   * Get movement vector for an engaged blocker
   * Blocker tries to stay between rusher and QB
   */
  getBlockerMovement(
    blocker: FieldPlayer,
    rusher: FieldPlayer,
    qbLocation: Vector2
  ): Vector2 {
    if (blocker.engagementState === 'BEATEN') {
      // Beaten blocker stumbles, minimal movement
      return { x: 0, y: 0 };
    }

    if (blocker.engagementState === 'WINNING') {
      // Push rusher back slightly
      const toRusher = normalize({
        x: rusher.location.x - blocker.location.x,
        y: rusher.location.y - blocker.location.y,
      });
      return {
        x: toRusher.x * ENGAGED_SPEED_MULT * 0.5,
        y: toRusher.y * ENGAGED_SPEED_MULT * 0.5,
      };
    }

    // Engaged: Mirror rusher's lateral movement, stay in front
    const toQB = normalize({
      x: qbLocation.x - rusher.location.x,
      y: qbLocation.y - rusher.location.y,
    });

    // Stay between rusher and QB
    const targetX = rusher.location.x + toQB.x * 3;
    const targetY = rusher.location.y + toQB.y * 3;

    const toTarget = normalize({
      x: targetX - blocker.location.x,
      y: targetY - blocker.location.y,
    });

    return {
      x: toTarget.x * ENGAGED_SPEED_MULT,
      y: toTarget.y * ENGAGED_SPEED_MULT,
    };
  }

  /**
   * Get movement vector for an engaged rusher
   * Rusher tries to get around/through the blocker
   */
  getRusherMovement(
    rusher: FieldPlayer,
    blocker: FieldPlayer,
    qbLocation: Vector2
  ): Vector2 {
    if (rusher.engagementState === 'FREE') {
      // Free rusher - full speed to QB
      const toQB = normalize({
        x: qbLocation.x - rusher.location.x,
        y: qbLocation.y - rusher.location.y,
      });
      return {
        x: toQB.x * BREAK_FREE_SPEED_MULT,
        y: toQB.y * BREAK_FREE_SPEED_MULT,
      };
    }

    if (rusher.engagementState === 'BEATEN') {
      // Being pushed back
      const awayFromBlocker = normalize({
        x: rusher.location.x - blocker.location.x,
        y: rusher.location.y - blocker.location.y,
      });
      return {
        x: awayFromBlocker.x * ENGAGED_SPEED_MULT * 0.3,
        y: awayFromBlocker.y * ENGAGED_SPEED_MULT * 0.3,
      };
    }

    // Engaged: Slow push toward QB while fighting blocker
    const toQB = normalize({
      x: qbLocation.x - rusher.location.x,
      y: qbLocation.y - rusher.location.y,
    });

    // Try to swim/spin around blocker (lateral movement)
    const lateralDir = Math.random() > 0.5 ? 1 : -1;

    return {
      x: toQB.x * ENGAGED_SPEED_MULT + lateralDir * 0.05,
      y: toQB.y * ENGAGED_SPEED_MULT,
    };
  }

  /**
   * Find the best target for a rusher to engage
   */
  findBlockerTarget(
    rusher: FieldPlayer,
    blockers: FieldPlayer[]
  ): FieldPlayer | null {
    // Already engaged
    if (rusher.engagementState === 'ENGAGED') return null;

    let closest: FieldPlayer | null = null;
    let closestDist = Infinity;

    for (const blocker of blockers) {
      // Skip blockers already engaged with someone else
      if (blocker.engagementState === 'ENGAGED' &&
          blocker.blockEngagement?.engagedWith !== rusher.id) {
        continue;
      }

      const dist = distance(rusher.location, blocker.location);
      if (dist < closestDist && dist < ENGAGEMENT_RANGE * 2) {
        closest = blocker;
        closestDist = dist;
      }
    }

    return closest;
  }

  /**
   * Process all engagements for a tick
   */
  processEngagements(
    tackles: FieldPlayer[],
    edgeRushers: FieldPlayer[],
    qbLocation: Vector2
  ): void {
    // Check for new engagements
    for (const rusher of edgeRushers) {
      if (rusher.engagementState === 'ENGAGED') continue;

      const target = this.findBlockerTarget(rusher, tackles);
      if (target && this.shouldEngage(target, rusher)) {
        this.startEngagement(target, rusher);
      }
    }

    // Update existing engagements
    for (const blocker of tackles) {
      if (blocker.engagementState !== 'ENGAGED') continue;

      const rusherId = blocker.blockEngagement?.engagedWith;
      if (!rusherId) continue;

      const rusher = edgeRushers.find(r => r.id === rusherId);
      if (!rusher) {
        // Rusher not found - clear engagement
        blocker.engagementState = 'FREE';
        blocker.blockEngagement = undefined;
        continue;
      }

      this.tickEngagement(blocker, rusher);
    }

    // Update positions based on engagement state
    for (const blocker of tackles) {
      if (blocker.engagementState === 'FREE') continue;

      const rusherId = blocker.blockEngagement?.engagedWith;
      const rusher = rusherId ? edgeRushers.find(r => r.id === rusherId) : null;

      if (rusher) {
        const blockerMove = this.getBlockerMovement(blocker, rusher, qbLocation);
        blocker.location.x += blockerMove.x;
        blocker.location.y += blockerMove.y;
      }
    }

    for (const rusher of edgeRushers) {
      const blockerId = rusher.blockEngagement?.engagedWith;
      const blocker = blockerId ? tackles.find(t => t.id === blockerId) : null;

      if (blocker || rusher.engagementState === 'FREE') {
        const rusherMove = this.getRusherMovement(
          rusher,
          blocker || rusher, // Use self if no blocker
          qbLocation
        );

        // Apply speed scaling based on stats
        const speedMult = (rusher.speed ?? 70) / 100;
        rusher.location.x += rusherMove.x * speedMult;
        rusher.location.y += rusherMove.y * speedMult;
      }
    }
  }

  /**
   * Reset all engagement states (called at play start)
   */
  resetEngagements(players: FieldPlayer[]): void {
    for (const player of players) {
      player.engagementState = 'FREE';
      player.blockEngagement = undefined;
    }
  }
}

// Singleton instance
export const blockingEngine = new BlockingEngine();
