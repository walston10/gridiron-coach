/**
 * Player Fatigue System
 *
 * Fatigue affects player performance:
 * - Speed reduction when tired
 * - Lower acceleration
 * - Reduced effectiveness in blocks/tackles
 * - Increased fumble chance when exhausted
 *
 * Fatigue builds up during plays and recovers between plays
 */

export interface PlayerFatigue {
  playerId: string;
  fatigue: number;        // 0-100: 0 = fresh, 100 = exhausted
  playsWithoutRest: number;
  isStarter: boolean;
}

export interface FatigueModifiers {
  speedMultiplier: number;
  accelerationMultiplier: number;
  strengthMultiplier: number;
  awarenessMultiplier: number;
  fumbleChanceIncrease: number;
}

// Position-based fatigue rates (some positions tire faster)
const POSITION_FATIGUE_RATES: Record<string, number> = {
  // Skill positions - tire moderately
  QB: 0.8,
  RB: 1.2,  // RBs tire faster from carrying
  WR: 1.0,
  TE: 1.0,
  FB: 1.1,

  // Offensive line - tire from constant blocking
  LT: 1.1,
  LG: 1.1,
  C: 1.0,
  RG: 1.1,
  RT: 1.1,

  // Defensive line - most intense exertion
  DE: 1.3,
  DT: 1.4,
  NT: 1.4,

  // Linebackers
  OLB: 1.2,
  MLB: 1.1,
  ILB: 1.1,

  // Secondary - lots of running
  CB: 1.2,
  FS: 1.0,
  SS: 1.1,
};

// Recovery rates (per second of rest between plays)
const BASE_RECOVERY_RATE = 2.0;  // Fatigue points recovered per second
const SIDELINE_RECOVERY_RATE = 5.0;  // If player is subbed out
const HALFTIME_RECOVERY = 50;  // Flat recovery during halftime

export class FatigueEngine {
  private playerFatigue: Map<string, PlayerFatigue> = new Map();
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  // Initialize fatigue tracking for a player
  initPlayer(playerId: string, position: string, isStarter: boolean = true): void {
    if (!this.playerFatigue.has(playerId)) {
      this.playerFatigue.set(playerId, {
        playerId,
        fatigue: 0,
        playsWithoutRest: 0,
        isStarter,
      });
    }
  }

  // Add fatigue after a play
  addPlayFatigue(playerId: string, position: string, wasInvolved: boolean = true): void {
    if (!this.enabled) return;

    const player = this.playerFatigue.get(playerId);
    if (!player) {
      this.initPlayer(playerId, position);
      return this.addPlayFatigue(playerId, position, wasInvolved);
    }

    const positionRate = POSITION_FATIGUE_RATES[position] || 1.0;

    // Base fatigue per play
    let fatigueGain = 5 * positionRate;

    // Ball carriers get extra fatigue
    if (wasInvolved) {
      fatigueGain *= 1.3;
    }

    // Consecutive plays without rest compound fatigue
    if (player.playsWithoutRest > 3) {
      fatigueGain *= 1.1;
    }
    if (player.playsWithoutRest > 6) {
      fatigueGain *= 1.2;
    }
    if (player.playsWithoutRest > 10) {
      fatigueGain *= 1.3;
    }

    player.fatigue = Math.min(100, player.fatigue + fatigueGain);
    player.playsWithoutRest++;
  }

  // Recover fatigue between plays (based on time elapsed)
  recoverFatigue(playerId: string, secondsElapsed: number, isOnField: boolean = true): void {
    if (!this.enabled) return;

    const player = this.playerFatigue.get(playerId);
    if (!player) return;

    const recoveryRate = isOnField ? BASE_RECOVERY_RATE : SIDELINE_RECOVERY_RATE;
    const recovery = secondsElapsed * recoveryRate;

    player.fatigue = Math.max(0, player.fatigue - recovery);

    // Reset consecutive play counter if rested enough
    if (player.fatigue < 30 || !isOnField) {
      player.playsWithoutRest = 0;
    }
  }

  // Recover all players during halftime
  halftimeRecovery(): void {
    this.playerFatigue.forEach(player => {
      player.fatigue = Math.max(0, player.fatigue - HALFTIME_RECOVERY);
      player.playsWithoutRest = 0;
    });
  }

  // Get fatigue level for a player
  getFatigue(playerId: string): number {
    return this.playerFatigue.get(playerId)?.fatigue || 0;
  }

  // Get performance modifiers based on fatigue
  getModifiers(playerId: string): FatigueModifiers {
    if (!this.enabled) {
      return {
        speedMultiplier: 1.0,
        accelerationMultiplier: 1.0,
        strengthMultiplier: 1.0,
        awarenessMultiplier: 1.0,
        fumbleChanceIncrease: 0,
      };
    }

    const fatigue = this.getFatigue(playerId);

    // Fatigue thresholds and effects
    // 0-30: Fresh, no penalty
    // 30-50: Slightly tired, minor penalties
    // 50-70: Tired, noticeable penalties
    // 70-85: Very tired, significant penalties
    // 85-100: Exhausted, severe penalties

    let speedMult = 1.0;
    let accelMult = 1.0;
    let strengthMult = 1.0;
    let awarenessMult = 1.0;
    let fumbleIncrease = 0;

    if (fatigue >= 30 && fatigue < 50) {
      speedMult = 0.97;
      accelMult = 0.95;
      strengthMult = 0.98;
      awarenessMult = 0.98;
    } else if (fatigue >= 50 && fatigue < 70) {
      speedMult = 0.93;
      accelMult = 0.90;
      strengthMult = 0.94;
      awarenessMult = 0.94;
      fumbleIncrease = 0.005;  // +0.5% fumble chance
    } else if (fatigue >= 70 && fatigue < 85) {
      speedMult = 0.87;
      accelMult = 0.83;
      strengthMult = 0.88;
      awarenessMult = 0.88;
      fumbleIncrease = 0.015;  // +1.5% fumble chance
    } else if (fatigue >= 85) {
      speedMult = 0.80;
      accelMult = 0.75;
      strengthMult = 0.80;
      awarenessMult = 0.80;
      fumbleIncrease = 0.03;  // +3% fumble chance
    }

    return {
      speedMultiplier: speedMult,
      accelerationMultiplier: accelMult,
      strengthMultiplier: strengthMult,
      awarenessMultiplier: awarenessMult,
      fumbleChanceIncrease: fumbleIncrease,
    };
  }

  // Get fatigue status description
  getFatigueStatus(playerId: string): 'FRESH' | 'GOOD' | 'TIRED' | 'VERY_TIRED' | 'EXHAUSTED' {
    const fatigue = this.getFatigue(playerId);
    if (fatigue < 30) return 'FRESH';
    if (fatigue < 50) return 'GOOD';
    if (fatigue < 70) return 'TIRED';
    if (fatigue < 85) return 'VERY_TIRED';
    return 'EXHAUSTED';
  }

  // Get player fatigue display info (for SubstitutionPanel)
  getPlayerFatigue(playerId: string): { playerId: string; position: string; level: 'FRESH' | 'GOOD' | 'TIRED' | 'VERY_TIRED' | 'EXHAUSTED'; percentage: number; shouldSub: boolean } | undefined {
    const player = this.playerFatigue.get(playerId);
    if (!player) return undefined;

    return {
      playerId,
      position: 'FLEX', // Position is not tracked per player in simplified roster
      level: this.getFatigueStatus(playerId),
      percentage: player.fatigue,
      shouldSub: this.shouldSubstitute(playerId),
    };
  }

  // Check if player should be subbed out
  shouldSubstitute(playerId: string): boolean {
    const fatigue = this.getFatigue(playerId);
    const player = this.playerFatigue.get(playerId);

    // Sub out if exhausted
    if (fatigue >= 85) return true;

    // Consider subbing if very tired and many consecutive plays
    if (fatigue >= 70 && player && player.playsWithoutRest >= 8) return true;

    return false;
  }

  // Get all players who need rest
  getPlayerNeedingRest(): string[] {
    const needRest: string[] = [];
    this.playerFatigue.forEach((player, id) => {
      if (this.shouldSubstitute(id)) {
        needRest.push(id);
      }
    });
    return needRest;
  }

  // Reset all fatigue (start of game)
  reset(): void {
    this.playerFatigue.clear();
  }

  // Enable/disable fatigue system
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Get all fatigue data (for UI display)
  getAllFatigue(): Map<string, PlayerFatigue> {
    return new Map(this.playerFatigue);
  }

  // Apply fatigue modifier to a stat
  applyFatigueToStat(playerId: string, baseStat: number, statType: 'speed' | 'acceleration' | 'strength' | 'awareness'): number {
    const modifiers = this.getModifiers(playerId);
    switch (statType) {
      case 'speed':
        return baseStat * modifiers.speedMultiplier;
      case 'acceleration':
        return baseStat * modifiers.accelerationMultiplier;
      case 'strength':
        return baseStat * modifiers.strengthMultiplier;
      case 'awareness':
        return baseStat * modifiers.awarenessMultiplier;
      default:
        return baseStat;
    }
  }
}

export const fatigueEngine = new FatigueEngine();
