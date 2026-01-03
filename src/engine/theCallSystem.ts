/**
 * The Call System
 *
 * "I got the ref." - Tex
 *
 * A bribe mechanic that lets you influence officials mid-play.
 * Costs slush fund money and builds Heat. Get caught = scandal.
 */

import type { TheCallState } from '../types/gameplay.types';

/** Base cost to make a call */
const BASE_CALL_COST = 5000;

/** Cost multiplier based on impact */
const IMPACT_MULTIPLIERS = {
  turnSackToRoughing: 2.5,
  turnFumbleToIncomplete: 3.0,
  turnTDToHolding: 4.0,
  turnBigGainToPenalty: 2.0,
};

/** Heat increase per call */
const HEAT_PER_CALL = 15;

/** Heat threshold where refs stop taking calls */
const HEAT_DISABLED_THRESHOLD = 80;

/** Heat decay per game */
const HEAT_DECAY_PER_GAME = 5;

/** Chance of getting caught (scales with heat and usage) */
const BASE_CATCH_CHANCE = 0.02; // 2% base
const HEAT_CATCH_MULTIPLIER = 0.005; // +0.5% per heat point
const USAGE_CATCH_MULTIPLIER = 0.01; // +1% per previous use this season

/** Tex voice lines */
const TEX_LINES = {
  success: [
    "I got the ref.",
    "That's my guy in stripes.",
    "Consider it handled.",
    "The zebra owes me a favor.",
    "Money talks, son.",
  ],
  highHeat: [
    "They're getting suspicious...",
    "This one's gonna cost extra.",
    "We're pushing our luck here.",
  ],
  disabled: [
    "Can't help you. Too much heat.",
    "Refs are watching. Lay low.",
    "Not this time. We're burned.",
  ],
  caught: [
    "We got a problem...",
    "They found the money.",
    "Someone talked. This is bad.",
  ],
};

export type CallType =
  | 'turn-sack-to-roughing'
  | 'turn-fumble-to-incomplete'
  | 'turn-td-to-holding'
  | 'turn-gain-to-penalty';

export interface CallResult {
  success: boolean;
  cost: number;
  heatIncrease: number;
  caught: boolean;
  texLine: string;
}

export class TheCallSystem {
  private state: TheCallState = {
    available: true,
    heatLevel: 0,
    currentCost: BASE_CALL_COST,
    disabled: false,
    usageCount: 0,
  };

  private usedThisDrive: boolean = false;

  /**
   * Check if The Call is available
   */
  isAvailable(): boolean {
    return (
      this.state.available &&
      !this.state.disabled &&
      !this.usedThisDrive &&
      this.state.heatLevel < HEAT_DISABLED_THRESHOLD
    );
  }

  /**
   * Get current state (for UI)
   */
  getState(): TheCallState {
    return { ...this.state };
  }

  /**
   * Calculate cost for a specific call type
   */
  calculateCost(callType: CallType): number {
    let multiplier = 1;

    switch (callType) {
      case 'turn-sack-to-roughing':
        multiplier = IMPACT_MULTIPLIERS.turnSackToRoughing;
        break;
      case 'turn-fumble-to-incomplete':
        multiplier = IMPACT_MULTIPLIERS.turnFumbleToIncomplete;
        break;
      case 'turn-td-to-holding':
        multiplier = IMPACT_MULTIPLIERS.turnTDToHolding;
        break;
      case 'turn-gain-to-penalty':
        multiplier = IMPACT_MULTIPLIERS.turnBigGainToPenalty;
        break;
    }

    // Heat increases cost
    const heatMultiplier = 1 + this.state.heatLevel / 100;

    return Math.floor(BASE_CALL_COST * multiplier * heatMultiplier);
  }

  /**
   * Attempt to make a call
   */
  makeCall(callType: CallType, slushFundBalance: number): CallResult {
    const cost = this.calculateCost(callType);

    // Check if we can afford it
    if (slushFundBalance < cost) {
      return {
        success: false,
        cost: 0,
        heatIncrease: 0,
        caught: false,
        texLine: "Not enough in the slush fund.",
      };
    }

    // Check if available
    if (!this.isAvailable()) {
      const line =
        TEX_LINES.disabled[Math.floor(Math.random() * TEX_LINES.disabled.length)];
      return {
        success: false,
        cost: 0,
        heatIncrease: 0,
        caught: false,
        texLine: line,
      };
    }

    // Make the call
    this.usedThisDrive = true;
    this.state.usageCount++;

    // Check if caught
    const catchChance =
      BASE_CATCH_CHANCE +
      this.state.heatLevel * HEAT_CATCH_MULTIPLIER +
      this.state.usageCount * USAGE_CATCH_MULTIPLIER;

    const caught = Math.random() < catchChance;

    if (caught) {
      // Disaster!
      const line =
        TEX_LINES.caught[Math.floor(Math.random() * TEX_LINES.caught.length)];
      this.state.disabled = true;

      return {
        success: false,
        cost: cost, // Still pay, but it didn't work
        heatIncrease: HEAT_PER_CALL * 3, // Triple heat for getting caught
        caught: true,
        texLine: line,
      };
    }

    // Success!
    const heatIncrease = HEAT_PER_CALL;
    this.state.heatLevel = Math.min(100, this.state.heatLevel + heatIncrease);

    // Check if we hit the threshold
    if (this.state.heatLevel >= HEAT_DISABLED_THRESHOLD) {
      this.state.disabled = true;
    }

    // Pick appropriate voice line
    let texLine: string;
    if (this.state.heatLevel >= 60) {
      texLine =
        TEX_LINES.highHeat[Math.floor(Math.random() * TEX_LINES.highHeat.length)];
    } else {
      texLine =
        TEX_LINES.success[Math.floor(Math.random() * TEX_LINES.success.length)];
    }

    return {
      success: true,
      cost,
      heatIncrease,
      caught: false,
      texLine,
    };
  }

  /**
   * Convert a play outcome using The Call
   * Returns the modified outcome
   */
  convertOutcome(
    callType: CallType,
    originalOutcome: PlayOutcome
  ): PlayOutcome {
    switch (callType) {
      case 'turn-sack-to-roughing':
        return {
          ...originalOutcome,
          sack: false,
          penalty: {
            type: 'roughing-the-passer',
            yards: 15,
            automatic_first_down: true,
            on: 'defense',
          },
        };

      case 'turn-fumble-to-incomplete':
        return {
          ...originalOutcome,
          fumble: false,
          turnover: false,
          incomplete: true,
        };

      case 'turn-td-to-holding':
        return {
          ...originalOutcome,
          touchdown: false,
          yardsGained: 0,
          penalty: {
            type: 'holding',
            yards: 10,
            automatic_first_down: false,
            on: 'offense',
          },
        };

      case 'turn-gain-to-penalty':
        return {
          ...originalOutcome,
          yardsGained: 0,
          penalty: {
            type: 'block-in-the-back',
            yards: 10,
            automatic_first_down: false,
            on: 'offense',
          },
        };

      default:
        return originalOutcome;
    }
  }

  /**
   * Reset availability for new drive
   */
  onDriveEnd(): void {
    this.usedThisDrive = false;
  }

  /**
   * Decay heat at end of game
   */
  onGameEnd(): void {
    this.state.heatLevel = Math.max(0, this.state.heatLevel - HEAT_DECAY_PER_GAME);

    // Re-enable if heat dropped below threshold
    if (this.state.heatLevel < HEAT_DISABLED_THRESHOLD && !this.wasCaught()) {
      this.state.disabled = false;
    }
  }

  /**
   * Reset for new season
   */
  onSeasonEnd(): void {
    this.state = {
      available: true,
      heatLevel: 0,
      currentCost: BASE_CALL_COST,
      disabled: false,
      usageCount: 0,
    };
    this.usedThisDrive = false;
  }

  /**
   * Check if we were caught this season (for scandal events)
   */
  private caughtThisSeason: boolean = false;

  wasCaught(): boolean {
    return this.caughtThisSeason;
  }

  /**
   * Trigger investigation (called when caught)
   */
  triggerInvestigation(): void {
    this.caughtThisSeason = true;
    this.state.disabled = true;
    this.state.heatLevel = 100;
  }

  /**
   * Get current heat level as a percentage (for UI)
   */
  getHeatPercentage(): number {
    return this.state.heatLevel;
  }

  /**
   * Get a random Tex line for current state (for UI)
   */
  getTexLine(): string {
    if (this.state.disabled) {
      return TEX_LINES.disabled[
        Math.floor(Math.random() * TEX_LINES.disabled.length)
      ];
    }
    if (this.state.heatLevel >= 60) {
      return TEX_LINES.highHeat[
        Math.floor(Math.random() * TEX_LINES.highHeat.length)
      ];
    }
    return TEX_LINES.success[
      Math.floor(Math.random() * TEX_LINES.success.length)
    ];
  }
}

/** Play outcome type (simplified) */
interface PlayOutcome {
  yardsGained: number;
  touchdown?: boolean;
  sack?: boolean;
  fumble?: boolean;
  turnover?: boolean;
  incomplete?: boolean;
  penalty?: {
    type: string;
    yards: number;
    automatic_first_down: boolean;
    on: 'offense' | 'defense';
  };
}

// Singleton instance
export const theCallSystem = new TheCallSystem();
