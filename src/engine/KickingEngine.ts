import type { Vector2 } from '../types/GameSim';

// Kicking play types
export type KickType = 'KICKOFF' | 'PUNT' | 'FIELD_GOAL' | 'PAT' | 'TWO_POINT';

export interface KickingRatings {
  kickPower: number;      // 1-99: distance
  kickAccuracy: number;   // 1-99: FG %, direction control
  puntPower: number;      // 1-99: punt distance
  puntAccuracy: number;   // 1-99: hang time, coffin corners
}

export interface KickResult {
  type: KickType;
  success: boolean;           // FG made, PAT made
  distance?: number;          // Yards kicked
  netYards?: number;          // After return (or touchback)
  newYardLine: number;        // Where ball is spotted
  touchback: boolean;
  returnYards?: number;       // For future return gameplay
  blocked: boolean;
  possession: 'home' | 'away';
}

export interface KickPlayState {
  type: KickType;
  phase: 'SETUP' | 'KICK' | 'FLIGHT' | 'RETURN' | 'RESOLVED';
  kickerLocation: Vector2;
  ballLocation: Vector2;
  targetLocation?: Vector2;   // For FG - the uprights
  landingSpot?: Vector2;      // Where ball will land
  hangTime?: number;          // Seconds in air
  result?: KickResult;
}

// Default kicker ratings (will come from roster later)
const DEFAULT_KICKER: KickingRatings = {
  kickPower: 75,
  kickAccuracy: 75,
  puntPower: 70,
  puntAccuracy: 70,
};

export class KickingEngine {
  private autoResolve: boolean = true; // Flip to false for full return gameplay

  constructor(autoResolve: boolean = true) {
    this.autoResolve = autoResolve;
  }

  // KICKOFF
  resolveKickoff(
    kickingTeam: 'home' | 'away',
    kicker: KickingRatings = DEFAULT_KICKER
  ): KickResult {
    // Kick distance based on power (55-75 yards typical)
    const baseDistance = 55 + (kicker.kickPower / 99) * 20;
    const variance = (Math.random() - 0.5) * 10;
    const kickDistance = Math.round(baseDistance + variance);

    // Kickoff from 35, so landing spot is 35 + distance into opponent territory
    const landingYardLine = Math.min(kickDistance - 35, 100); // Cap at endzone

    // Touchback if into endzone (for now, auto-touchback on deep kicks)
    if (landingYardLine >= 100 || (landingYardLine >= 95 && Math.random() < 0.7)) {
      return {
        type: 'KICKOFF',
        success: true,
        distance: kickDistance,
        netYards: kickDistance - 35 - 25, // Net vs touchback spot
        newYardLine: 25, // Touchback to 25
        touchback: true,
        blocked: false,
        possession: kickingTeam === 'home' ? 'away' : 'home',
      };
    }

    if (this.autoResolve) {
      // Auto-resolve return: average ~22 yards
      const returnYards = 15 + Math.random() * 15;
      const newYardLine = Math.round(100 - landingYardLine + returnYards);

      return {
        type: 'KICKOFF',
        success: true,
        distance: kickDistance,
        netYards: 100 - newYardLine,
        newYardLine: Math.min(Math.max(newYardLine, 1), 99),
        touchback: false,
        returnYards: Math.round(returnYards),
        blocked: false,
        possession: kickingTeam === 'home' ? 'away' : 'home',
      };
    }

    // Future: return full KickPlayState for animated return
    throw new Error('Full return gameplay not yet implemented');
  }

  // PUNT
  resolvePunt(
    puntingTeam: 'home' | 'away',
    yardLine: number, // Current field position (0-100)
    punter: KickingRatings = DEFAULT_KICKER
  ): KickResult {
    // Punt distance based on power (35-55 yards typical)
    const baseDistance = 35 + (punter.puntPower / 99) * 20;
    const variance = (Math.random() - 0.5) * 10;
    const puntDistance = Math.round(baseDistance + variance);

    // Landing spot
    const landingYardLine = Math.min(yardLine + puntDistance, 100);

    // Touchback if into endzone
    if (landingYardLine >= 100) {
      return {
        type: 'PUNT',
        success: true,
        distance: puntDistance,
        netYards: 100 - yardLine - 20, // Net gain (touchback to 20)
        newYardLine: 20,
        touchback: true,
        blocked: false,
        possession: puntingTeam === 'home' ? 'away' : 'home',
      };
    }

    // Coffin corner / downed inside 10
    if (landingYardLine >= 90 && punter.puntAccuracy > 70) {
      const downedAt = 90 + Math.random() * (100 - punter.puntAccuracy / 10);
      return {
        type: 'PUNT',
        success: true,
        distance: puntDistance,
        netYards: Math.round(downedAt - yardLine),
        newYardLine: Math.round(100 - downedAt),
        touchback: false,
        returnYards: 0,
        blocked: false,
        possession: puntingTeam === 'home' ? 'away' : 'home',
      };
    }

    if (this.autoResolve) {
      // Auto-resolve return: average ~8 yards
      const returnYards = 5 + Math.random() * 8;
      const newYardLine = 100 - landingYardLine + returnYards;

      return {
        type: 'PUNT',
        success: true,
        distance: puntDistance,
        netYards: Math.round(landingYardLine - yardLine - returnYards),
        newYardLine: Math.round(Math.min(Math.max(newYardLine, 1), 99)),
        touchback: false,
        returnYards: Math.round(returnYards),
        blocked: false,
        possession: puntingTeam === 'home' ? 'away' : 'home',
      };
    }

    throw new Error('Full return gameplay not yet implemented');
  }

  // FIELD GOAL
  resolveFieldGoal(
    kickingTeam: 'home' | 'away',
    yardLine: number, // Current field position
    kicker: KickingRatings = DEFAULT_KICKER
  ): KickResult {
    // FG distance = 100 - yardLine + 17 (endzone + 7 yard snap)
    const fgDistance = 100 - yardLine + 17;

    // Success probability based on distance and accuracy
    // 20 yards = ~95%, 40 yards = ~80%, 50 yards = ~60%, 60 yards = ~30%
    const basePct = Math.max(0, 100 - (fgDistance - 20) * 2);
    const accuracyBonus = (kicker.kickAccuracy - 70) / 2;
    const successPct = Math.min(98, Math.max(5, basePct + accuracyBonus));

    const made = Math.random() * 100 < successPct;

    if (made) {
      return {
        type: 'FIELD_GOAL',
        success: true,
        distance: fgDistance,
        newYardLine: 35, // Kickoff after FG
        touchback: false,
        blocked: false,
        possession: kickingTeam, // Same team kicks off
      };
    }

    // Miss - other team gets ball at spot of kick (or 20 if in endzone)
    const spotYardLine = Math.max(20, 100 - yardLine);

    return {
      type: 'FIELD_GOAL',
      success: false,
      distance: fgDistance,
      newYardLine: spotYardLine,
      touchback: false,
      blocked: Math.random() < 0.05, // 5% block chance
      possession: kickingTeam === 'home' ? 'away' : 'home',
    };
  }

  // PAT (Extra Point)
  resolvePAT(
    kickingTeam: 'home' | 'away',
    kicker: KickingRatings = DEFAULT_KICKER
  ): KickResult {
    // PAT is 33 yards (15 yard line + 10 endzone + 7 snap + 1 hold)
    // ~94% success rate in NFL, modified by accuracy
    const basePct = 94;
    const accuracyMod = (kicker.kickAccuracy - 75) / 5;
    const successPct = Math.min(99, Math.max(80, basePct + accuracyMod));

    const made = Math.random() * 100 < successPct;

    return {
      type: 'PAT',
      success: made,
      distance: 33,
      newYardLine: 35, // Kickoff spot
      touchback: false,
      blocked: !made && Math.random() < 0.15, // If missed, 15% was blocked
      possession: kickingTeam,
    };
  }

  // TWO POINT CONVERSION (placeholder - this will use regular play engine)
  resolveTwoPoint(
    attemptingTeam: 'home' | 'away'
  ): KickResult {
    // Simple 48% success rate for now
    // Later: actually run a play from the 2 yard line
    const success = Math.random() < 0.48;

    return {
      type: 'TWO_POINT',
      success,
      newYardLine: 35,
      touchback: false,
      blocked: false,
      possession: attemptingTeam,
    };
  }

  // Field goal range check (for CPU decision making)
  isInFieldGoalRange(yardLine: number, kicker: KickingRatings = DEFAULT_KICKER): boolean {
    const fgDistance = 100 - yardLine + 17;
    const maxRange = 35 + (kicker.kickPower / 99) * 25; // 35-60 yard range
    return fgDistance <= maxRange;
  }

  // Should punt? (for CPU decision making)
  shouldPunt(down: number, yardsToGo: number, yardLine: number): boolean {
    if (down !== 4) return false;
    if (yardLine >= 60 && yardsToGo <= 3) return false; // Go for it in opponent territory
    if (yardLine <= 35) return true; // Always punt in own territory
    return yardsToGo > 5; // Punt if long yardage
  }

  setAutoResolve(auto: boolean): void {
    this.autoResolve = auto;
  }
}

export const kickingEngine = new KickingEngine();
