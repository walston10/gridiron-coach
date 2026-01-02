import type { Vector2, RouteType, FieldPlayer } from '../types/GameSim';

/**
 * Route phases:
 * STEM - Initial straight run off the line
 * BREAK - The cut/break point of the route
 * FINAL - The final direction after the break
 * SETTLE - Route complete, find open space (for timing routes)
 * SCRAMBLE - QB extended play, work back to QB
 */
export type RoutePhase = 'STEM' | 'BREAK' | 'FINAL' | 'SETTLE' | 'SCRAMBLE';

export interface RouteState {
  phase: RoutePhase;
  startLocation: Vector2;
  currentTarget: Vector2;
  phaseStartTime: number;
  routeStartTime: number;
  stemDistance: number;
  breakDistance: number;
}

export interface RouteDefinition {
  stemDirection: Vector2;     // Initial direction off the line
  stemDistance: number;       // How far to run before break (yards * 3 for field units)
  breakDirection: Vector2;    // Direction after the break
  breakDuration: number;      // How long the break lasts (seconds)
  finalDirection: Vector2;    // Final route direction
  settleTime: number;         // When to settle and find space (seconds from snap)
  isTimingRoute: boolean;     // Does this route have a specific timing window?
}

// Route definitions with realistic football concepts
const ROUTE_DEFINITIONS: Record<RouteType, RouteDefinition> = {
  // STREAK/GO - straight up the field
  STREAK: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 999, // Never breaks, just runs
    breakDirection: { x: 0, y: 1 },
    breakDuration: 0,
    finalDirection: { x: 0, y: 1 },
    settleTime: 4.0,
    isTimingRoute: false,
  },

  // POST - stem 10-12 yards, break inside at 45 degrees
  POST: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 36, // ~12 yards
    breakDirection: { x: 0.7, y: 0.7 }, // 45 degree inside
    breakDuration: 0.3,
    finalDirection: { x: 0.5, y: 0.87 }, // Continue on post angle
    settleTime: 3.5,
    isTimingRoute: false,
  },

  // CORNER - stem 10-12 yards, break outside at 45 degrees
  CORNER: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 36,
    breakDirection: { x: -0.7, y: 0.7 }, // 45 degree outside (negative x = toward sideline)
    breakDuration: 0.3,
    finalDirection: { x: -0.5, y: 0.87 },
    settleTime: 3.5,
    isTimingRoute: false,
  },

  // OUT - stem 8-10 yards, sharp break to sideline
  OUT: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 27, // ~9 yards
    breakDirection: { x: -1, y: 0 }, // 90 degree to sideline
    breakDuration: 0.2,
    finalDirection: { x: -1, y: 0 },
    settleTime: 2.0,
    isTimingRoute: true,
  },

  // IN/DIG - stem 8-10 yards, sharp break inside
  IN: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 27,
    breakDirection: { x: 1, y: 0 }, // 90 degree inside
    breakDuration: 0.2,
    finalDirection: { x: 1, y: 0 },
    settleTime: 2.0,
    isTimingRoute: true,
  },

  // SLANT - quick inside break at 45 degrees
  SLANT: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 6, // ~2 yards, very quick
    breakDirection: { x: 0.7, y: 0.7 },
    breakDuration: 0.15,
    finalDirection: { x: 0.6, y: 0.8 },
    settleTime: 1.5,
    isTimingRoute: true,
  },

  // CURL/HITCH - stem 8-10 yards, turn back to QB
  CURL: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 27,
    breakDirection: { x: 0, y: -0.3 }, // Turn back slightly
    breakDuration: 0.3,
    finalDirection: { x: 0, y: -0.2 }, // Settle facing QB
    settleTime: 2.2,
    isTimingRoute: true,
  },

  // COMEBACK - stem 12-15 yards, come back toward sideline
  COMEBACK: {
    stemDirection: { x: 0, y: 1 },
    stemDistance: 42, // ~14 yards
    breakDirection: { x: -0.5, y: -0.87 }, // Back toward sideline
    breakDuration: 0.4,
    finalDirection: { x: -0.7, y: -0.7 },
    settleTime: 3.0,
    isTimingRoute: true,
  },

  // FLAT - quick out to the flat, stay shallow
  FLAT: {
    stemDirection: { x: -0.3, y: 0.2 },
    stemDistance: 9, // ~3 yards
    breakDirection: { x: -1, y: 0.1 },
    breakDuration: 0.2,
    finalDirection: { x: -0.9, y: 0.1 },
    settleTime: 1.2,
    isTimingRoute: true,
  },

  // DRAG - shallow cross, run across the field
  DRAG: {
    stemDirection: { x: 0, y: 0.5 },
    stemDistance: 6,
    breakDirection: { x: 1, y: 0.1 },
    breakDuration: 0.1,
    finalDirection: { x: 1, y: 0.05 },
    settleTime: 2.5,
    isTimingRoute: false,
  },

  // WHEEL - start flat, then wheel up the sideline
  WHEEL: {
    stemDirection: { x: -0.8, y: 0.2 },
    stemDistance: 12,
    breakDirection: { x: -0.3, y: 0.95 },
    breakDuration: 0.4,
    finalDirection: { x: -0.1, y: 1 },
    settleTime: 3.5,
    isTimingRoute: false,
  },

  // BLOCK - no route, stay and block
  BLOCK: {
    stemDirection: { x: 0, y: 0 },
    stemDistance: 0,
    breakDirection: { x: 0, y: 0 },
    breakDuration: 0,
    finalDirection: { x: 0, y: 0 },
    settleTime: 999,
    isTimingRoute: false,
  },
};

export class RouteRunner {
  private routeStates: Map<string, RouteState> = new Map();
  private snapTime: number = 0;
  private qbInPocket: boolean = true;
  private qbLocation: Vector2 = { x: 0, y: 0 };
  private scrambleStartTime: number | null = null;

  // Time thresholds
  private static readonly SCRAMBLE_TRIGGER_TIME = 3.5; // Seconds before scramble drill kicks in
  private static readonly QB_POCKET_RADIUS = 15; // Units - if QB moves beyond this, receivers adjust

  reset(): void {
    this.routeStates.clear();
    this.snapTime = 0;
    this.qbInPocket = true;
    this.scrambleStartTime = null;
  }

  initializeRoute(player: FieldPlayer, currentTime: number): void {
    if (!player.route || player.route === 'BLOCK') return;

    this.snapTime = currentTime;

    const routeState: RouteState = {
      phase: 'STEM',
      startLocation: { ...player.location },
      currentTarget: this.calculateStemTarget(player),
      phaseStartTime: currentTime,
      routeStartTime: currentTime,
      stemDistance: 0,
      breakDistance: 0,
    };

    this.routeStates.set(player.id, routeState);
  }

  private calculateStemTarget(player: FieldPlayer): Vector2 {
    const def = ROUTE_DEFINITIONS[player.route!];
    // Flip X direction based on which side of field the player is on
    const sideMultiplier = player.location.x < 80 ? 1 : -1; // 80 is center of 160-wide field

    return {
      x: player.location.x + def.stemDirection.x * def.stemDistance * sideMultiplier,
      y: player.location.y + def.stemDirection.y * def.stemDistance,
    };
  }

  updateQBStatus(qbLocation: Vector2, pocketCenter: Vector2, currentTime: number): void {
    this.qbLocation = qbLocation;
    const distFromPocket = Math.sqrt(
      (qbLocation.x - pocketCenter.x) ** 2 + (qbLocation.y - pocketCenter.y) ** 2
    );

    const wasInPocket = this.qbInPocket;
    this.qbInPocket = distFromPocket < RouteRunner.QB_POCKET_RADIUS;

    // QB just left pocket - note the time
    if (wasInPocket && !this.qbInPocket && !this.scrambleStartTime) {
      this.scrambleStartTime = currentTime;
    }
  }

  getMovementVector(
    player: FieldPlayer,
    currentTime: number,
    defenders: FieldPlayer[]
  ): Vector2 {
    if (!player.route || player.route === 'BLOCK') {
      return { x: 0, y: 0 };
    }

    let state = this.routeStates.get(player.id);
    if (!state) {
      this.initializeRoute(player, currentTime);
      state = this.routeStates.get(player.id)!;
    }

    const timeSinceSnap = currentTime - this.snapTime;
    const def = ROUTE_DEFINITIONS[player.route];

    // Check for scramble drill trigger
    const shouldScramble = this.shouldEnterScrambleDrill(state, timeSinceSnap, def);
    if (shouldScramble && state.phase !== 'SCRAMBLE') {
      state.phase = 'SCRAMBLE';
      state.phaseStartTime = currentTime;
    }

    // Update phase based on progress
    this.updateRoutePhase(player, state, currentTime, def);

    // Get movement based on current phase
    return this.getPhaseMovement(player, state, def, defenders);
  }

  private shouldEnterScrambleDrill(
    state: RouteState,
    timeSinceSnap: number,
    def: RouteDefinition
  ): boolean {
    // Enter scramble drill if:
    // 1. QB left pocket and has been scrambling for 1+ seconds
    // 2. Route is complete (past settle time) and play is still going
    // 3. Play has gone on very long (4+ seconds)

    if (this.scrambleStartTime !== null) {
      return true;
    }

    if (timeSinceSnap > def.settleTime + 1.5) {
      return true;
    }

    if (timeSinceSnap > 5.0) {
      return true;
    }

    return false;
  }

  private updateRoutePhase(
    player: FieldPlayer,
    state: RouteState,
    currentTime: number,
    def: RouteDefinition
  ): void {
    if (state.phase === 'SCRAMBLE') return; // Don't change from scramble

    const distanceTraveled = this.distance(state.startLocation, player.location);
    const timeSincePhaseStart = currentTime - state.phaseStartTime;

    switch (state.phase) {
      case 'STEM':
        // Check if we've run far enough to break
        if (distanceTraveled >= def.stemDistance * 0.9) {
          state.phase = 'BREAK';
          state.phaseStartTime = currentTime;
          state.stemDistance = distanceTraveled;
        }
        break;

      case 'BREAK':
        // Break phase is time-based, but skilled route runners break faster
        const routeSkill = this.getRouteSkillFactor(player);
        // Elite route runners (0.9+) break 30% faster, poor ones (0.5) 25% slower
        const adjustedBreakDuration = def.breakDuration * (1.25 - routeSkill * 0.55);
        if (timeSincePhaseStart >= adjustedBreakDuration) {
          state.phase = 'FINAL';
          state.phaseStartTime = currentTime;
        }
        break;

      case 'FINAL':
        // Check if it's time to settle
        const totalTime = currentTime - state.routeStartTime;
        if (totalTime >= def.settleTime) {
          state.phase = 'SETTLE';
          state.phaseStartTime = currentTime;
        }
        break;

      case 'SETTLE':
        // Stay in settle until scramble drill
        break;
    }
  }

  /**
   * Get route running skill factor - affects break sharpness and speed
   * Higher skill = sharper cuts, faster through breaks
   */
  private getRouteSkillFactor(player: FieldPlayer): number {
    const routeRunning = player.routeRunning ?? 70;
    const agility = player.agility ?? 70;
    // Route running is primary, agility helps with cuts
    return (routeRunning * 0.7 + agility * 0.3) / 100;
  }

  private getPhaseMovement(
    player: FieldPlayer,
    state: RouteState,
    def: RouteDefinition,
    defenders: FieldPlayer[]
  ): Vector2 {
    // Side multiplier - flip routes for players on right side of field
    const sideMultiplier = state.startLocation.x < 80 ? 1 : -1;

    // Route running skill affects break sharpness (speed during break phase)
    const routeSkill = this.getRouteSkillFactor(player);

    switch (state.phase) {
      case 'STEM':
        return {
          x: def.stemDirection.x * sideMultiplier,
          y: def.stemDirection.y,
        };

      case 'BREAK':
        // Better route runners maintain more speed through breaks (sharper cuts)
        // Elite (0.9+): 1.15x speed, Poor (0.5): 0.85x speed
        const breakSharpness = 0.7 + routeSkill * 0.5;
        return {
          x: def.breakDirection.x * sideMultiplier * breakSharpness,
          y: def.breakDirection.y * breakSharpness,
        };

      case 'FINAL':
        return {
          x: def.finalDirection.x * sideMultiplier,
          y: def.finalDirection.y,
        };

      case 'SETTLE':
        // Find open space near current position
        return this.findOpenSpace(player, defenders, 0.3);

      case 'SCRAMBLE':
        // Scramble drill - work back to QB and find open grass
        return this.scrambleDrillMovement(player, defenders);
    }
  }

  private findOpenSpace(player: FieldPlayer, defenders: FieldPlayer[], intensity: number): Vector2 {
    // Move away from nearest defender while staying in a reasonable area
    const nearestDefender = this.getNearestDefender(player.location, defenders);
    if (!nearestDefender) return { x: 0, y: 0 };

    const awayFromDefender = this.normalize({
      x: player.location.x - nearestDefender.location.x,
      y: player.location.y - nearestDefender.location.y,
    });

    // Add small random drift
    const drift = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
    };

    return {
      x: (awayFromDefender.x + drift.x) * intensity,
      y: (awayFromDefender.y + drift.y) * intensity,
    };
  }

  private scrambleDrillMovement(player: FieldPlayer, defenders: FieldPlayer[]): Vector2 {
    // Scramble drill priorities:
    // 1. Stay within reasonable distance of QB (not too far)
    // 2. Find open grass (away from defenders)
    // 3. Work toward QB's vision (ahead of where QB is looking)
    // 4. Move toward sideline or endzone to give QB easy throw

    const distToQB = this.distance(player.location, this.qbLocation);
    const dirToQB = this.normalize({
      x: this.qbLocation.x - player.location.x,
      y: this.qbLocation.y - player.location.y,
    });

    // Component 1: Stay in range of QB (20-50 units ideal)
    let towardQB = { x: 0, y: 0 };
    if (distToQB > 60) {
      // Too far, move toward QB
      towardQB = { x: dirToQB.x * 0.5, y: dirToQB.y * 0.5 };
    } else if (distToQB < 25) {
      // Too close, drift away
      towardQB = { x: -dirToQB.x * 0.3, y: -dirToQB.y * 0.3 };
    }

    // Component 2: Find open grass
    const openSpace = this.findOpenSpace(player, defenders, 0.4);

    // Component 3: Drift toward sideline or upfield
    const fieldDrift = {
      x: player.location.x < 80 ? -0.2 : 0.2, // Drift toward nearest sideline
      y: 0.2, // Slight upfield drift
    };

    // Combine components
    return {
      x: towardQB.x + openSpace.x + fieldDrift.x,
      y: towardQB.y + openSpace.y + fieldDrift.y,
    };
  }

  private getNearestDefender(location: Vector2, defenders: FieldPlayer[]): FieldPlayer | null {
    let nearest: FieldPlayer | null = null;
    let minDist = Infinity;

    for (const defender of defenders) {
      const dist = this.distance(location, defender.location);
      if (dist < minDist) {
        minDist = dist;
        nearest = defender;
      }
    }

    return nearest;
  }

  private distance(a: Vector2, b: Vector2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private normalize(v: Vector2): Vector2 {
    const len = Math.sqrt(v.x ** 2 + v.y ** 2);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  }

  // Get route state for debugging/visualization
  getRouteState(playerId: string): RouteState | undefined {
    return this.routeStates.get(playerId);
  }
}

export const ROUTE_DEFS = ROUTE_DEFINITIONS;
