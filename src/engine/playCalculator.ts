// src/engine/playCalculator.ts
// Calculates play success based on base play, roster ratings, modifiers, tendencies, and defense

import type { BasePlay } from '../data/playbook';
import type { ModifierCard } from '../data/modifiers';
import type { SignatureCard } from '../data/signatureCards';

// ============================================
// TYPES
// ============================================

export interface RosterRatings {
  QB: {
    shortAccuracy: number;
    mediumAccuracy: number;
    deepAccuracy: number;
    armStrength: number;
    speed: number;
    elusiveness: number;
    awareness: number;
    power: number;
    accuracy: number;
    catching: number;
  };
  RB: {
    speed: number;
    power: number;
    elusiveness: number;
    vision: number;
    catching: number;
    awareness: number;
    toughness: number;
  };
  WR1: {
    speed: number;
    catching: number;
    routeRunning: number;
    jumping: number;
  };
  WR2: {
    speed: number;
    catching: number;
    routeRunning: number;
  };
  TE: {
    catching: number;
    speed: number;
    blocking: number;
    awareness: number;
  };
  OL: {
    passBlock: number;
    runBlock: number;
  };
}

export interface Tendencies {
  runRate: number;
  passRate: number;
  recentPlays: string[];
}

export interface DefenseCall {
  coverage: string;
  adjustment: string | null;
}

export interface GameState {
  down: number;
  distance: number;
  fieldPosition: number;
  quarter: number;
  clock: number;
}

export interface PlaySuccessResult {
  finalSuccess: number;
  baseSuccess: number;
  ratingMod: number;
  modifierMod: number;
  tendencyMod: number;
  defenseMod: number;
  situationalMod: number;
  breakdown: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPlayerRating(roster: RosterRatings, role: string, stat: string): number {
  const defaultRating = 75;

  switch (role) {
    case 'qb':
    case 'qbSecondary':
      return (roster.QB as Record<string, number>)[stat] ?? defaultRating;
    case 'rb':
    case 'rbSecondary':
      return (roster.RB as Record<string, number>)[stat] ?? defaultRating;
    case 'target':
    case 'wr':
    case 'wr1':
      return (roster.WR1 as Record<string, number>)[stat] ?? defaultRating;
    case 'wr2':
    case 'wrSecondary':
      return (roster.WR2 as Record<string, number>)[stat] ?? defaultRating;
    case 'te':
      return (roster.TE as Record<string, number>)[stat] ?? defaultRating;
    case 'oline':
      return (roster.OL as Record<string, number>)[stat] ?? defaultRating;
    case 'targetSecondary':
      // For secondary target stats, check RB/TE
      return (roster.RB as Record<string, number>)[stat] ?? defaultRating;
    default:
      return defaultRating;
  }
}

function evaluateCondition(condition: string, tendencies: Tendencies): boolean {
  // Parse simple conditions like "runRate > 0.4"
  const match = condition.match(/(\w+)\s*(>|<|>=|<=|==)\s*([\d.]+)/);
  if (!match) return false;

  const [, variable, operator, valueStr] = match;
  const value = parseFloat(valueStr);

  let actualValue = 0;
  if (variable === 'runRate') {
    actualValue = tendencies.runRate;
  } else if (variable === 'passRate') {
    actualValue = tendencies.passRate;
  }

  switch (operator) {
    case '>': return actualValue > value;
    case '<': return actualValue < value;
    case '>=': return actualValue >= value;
    case '<=': return actualValue <= value;
    case '==': return actualValue === value;
    default: return false;
  }
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

export function calculatePlaySuccess(
  play: BasePlay | SignatureCard,
  roster: RosterRatings,
  modifier: ModifierCard | null,
  tendencies: Tendencies,
  defenseCall: DefenseCall,
  gameState: GameState
): PlaySuccessResult {
  const breakdown: string[] = [];

  // =========================================
  // STEP 1: Start with base success rate
  // =========================================
  const baseSuccess = play.baseSuccess ?? 50;
  let success = baseSuccess;
  breakdown.push(`Base: ${baseSuccess}%`);

  // =========================================
  // STEP 2: Apply player rating modifiers
  // =========================================
  let ratingMod = 0;

  if (play.ratingFactors) {
    for (const [role, factor] of Object.entries(play.ratingFactors)) {
      const playerRating = getPlayerRating(roster, role, factor.stat);
      // Rating 75 = baseline (0 modifier)
      // Each point above/below 75 = +/- 0.4% per weight
      const contribution = (playerRating - 75) * 0.4 * factor.weight;
      ratingMod += contribution;

      if (Math.abs(contribution) >= 0.5) {
        const sign = contribution >= 0 ? '+' : '';
        breakdown.push(`${role} ${factor.stat}: ${sign}${contribution.toFixed(1)}%`);
      }
    }
  }

  success += ratingMod;

  // =========================================
  // STEP 3: Apply modifier card effects
  // =========================================
  let modifierMod = 0;

  if (modifier) {
    // Check if modifier applies to this play type/category
    const playType = play.type;
    const playCategory = 'category' in play ? play.category : undefined;

    let modifierApplies = true;

    if (modifier.effect.appliesToType && (playType === 'pass' || playType === 'run') && !modifier.effect.appliesToType.includes(playType)) {
      modifierApplies = false;
    }

    if (modifier.effect.appliesToCategory && playCategory &&
        !modifier.effect.appliesToCategory.includes(playCategory)) {
      modifierApplies = false;
    }

    if (modifierApplies) {
      // Base modifier bonus
      if (modifier.effect.successMod) {
        modifierMod += modifier.effect.successMod;
        breakdown.push(`${modifier.name}: +${modifier.effect.successMod}%`);
      }

      // Conditional modifiers
      if (modifier.effect.conditionalMod) {
        const { condition, bonus } = modifier.effect.conditionalMod;
        if (evaluateCondition(condition, tendencies)) {
          modifierMod += bonus;
          breakdown.push(`${modifier.name} (conditional): +${bonus}%`);
        }
      }

      // Vs specific defenses
      if (modifier.effect.vsBlitz && defenseCall.adjustment === 'blitz') {
        modifierMod += modifier.effect.vsBlitz;
        breakdown.push(`${modifier.name} vs Blitz: +${modifier.effect.vsBlitz}%`);
      }
    }
  }

  success += modifierMod;

  // =========================================
  // STEP 4: Apply tendency bonuses/penalties
  // =========================================
  let tendencyMod = 0;

  // Play action bonus (if modifier used OR play has built-in)
  const hasPlayAction = modifier?.id === 'play-action';
  const playRequiresTendency = 'requiresTendency' in play && play.requiresTendency?.runRate;

  if ((hasPlayAction || playRequiresTendency) && tendencies.runRate > 0.4) {
    const paBonus = Math.min(20, (tendencies.runRate - 0.4) * 50);
    tendencyMod += paBonus;
    breakdown.push(`Play Action (${Math.round(tendencies.runRate * 100)}% run rate): +${paBonus.toFixed(1)}%`);
  }

  // Predictability penalty
  if (play.type === 'run' && tendencies.runRate > 0.6) {
    tendencyMod -= 10;
    breakdown.push('Too predictable (run heavy): -10%');
  }
  if (play.type === 'pass' && tendencies.runRate < 0.35) {
    tendencyMod -= 8;
    breakdown.push('Too predictable (pass heavy): -8%');
  }

  success += tendencyMod;

  // =========================================
  // STEP 5: Apply counter system (defense vs play)
  // =========================================
  let defenseMod = 0;

  if ('counters' in play && play.counters) {
    // Check if defense counters this play
    if (play.counters.includes(defenseCall.coverage)) {
      defenseMod -= 18;
      breakdown.push(`Countered by ${defenseCall.coverage}: -18%`);
    }
  }

  if ('bonusVs' in play && play.bonusVs) {
    // Check if play beats this defense
    if (play.bonusVs.includes(defenseCall.coverage)) {
      defenseMod += 12;
      breakdown.push(`Beats ${defenseCall.coverage}: +12%`);
    }
    if (defenseCall.adjustment && play.bonusVs.includes(defenseCall.adjustment)) {
      defenseMod += 15;
      breakdown.push(`Beats ${defenseCall.adjustment}: +15%`);
    }
  }

  if ('penaltyVs' in play && play.penaltyVs) {
    // Check penalties
    if (play.penaltyVs.includes(defenseCall.coverage)) {
      defenseMod -= 12;
      breakdown.push(`Weak vs ${defenseCall.coverage}: -12%`);
    }
    if (defenseCall.adjustment && play.penaltyVs.includes(defenseCall.adjustment)) {
      defenseMod -= 15;
      breakdown.push(`Weak vs ${defenseCall.adjustment}: -15%`);
    }
  }

  success += defenseMod;

  // =========================================
  // STEP 6: Situational modifiers
  // =========================================
  let situationalMod = 0;

  // Red zone adjustments
  if (gameState.fieldPosition >= 80) {
    const playCategory = 'category' in play ? play.category : undefined;
    if (playCategory === 'deep') {
      situationalMod -= 10;
      breakdown.push('Red zone (less room): -10%');
    }
  }

  // 3rd/4th down pressure
  if (gameState.down >= 3) {
    situationalMod -= 3;
    breakdown.push(`${gameState.down === 3 ? '3rd' : '4th'} down pressure: -3%`);
  }

  success += situationalMod;

  // =========================================
  // STEP 7: Clamp final value
  // =========================================
  const finalSuccess = Math.max(5, Math.min(95, Math.round(success)));

  return {
    finalSuccess,
    baseSuccess,
    ratingMod: Math.round(ratingMod),
    modifierMod: Math.round(modifierMod),
    tendencyMod: Math.round(tendencyMod),
    defenseMod: Math.round(defenseMod),
    situationalMod: Math.round(situationalMod),
    breakdown,
  };
}

// ============================================
// PLAY RESOLUTION
// ============================================

export interface PlayResolutionResult {
  success: boolean;
  yards: number;
  touchdown: boolean;
  firstDown: boolean;
  turnover: boolean;
  interception: boolean;
  fumble: boolean;
  sack: boolean;
  breakaway: boolean;
  description: string;
  penalty?: { type: string; yards: number };
  freePlay?: boolean;
}

export function resolvePlay(
  play: BasePlay | SignatureCard,
  successRate: number,
  modifier: ModifierCard | null,
  gameState: GameState
): PlayResolutionResult {
  const roll = Math.random() * 100;
  const success = roll < successRate;

  let yards = 0;
  let touchdown = false;
  let firstDown = false;
  let turnover = false;
  let interception = false;
  let fumble = false;
  let sack = false;
  let breakaway = false;
  let description = '';
  let penalty: { type: string; yards: number } | undefined;
  let freePlay = false;

  // Check for hard count free play
  if (modifier?.effect.freePlayChance) {
    if (Math.random() * 100 < modifier.effect.freePlayChance) {
      freePlay = true;
    }
  }

  // Check for penalty from dirty modifier
  if (modifier?.effect.penaltyRisk) {
    if (Math.random() * 100 < modifier.effect.penaltyRisk) {
      const penaltyType = modifier.id === 'hold-em' ? 'Holding' :
                         modifier.id === 'pick-play' ? 'Offensive Pass Interference' : 'Penalty';
      penalty = { type: penaltyType, yards: 10 };
    }
  }

  // If penalty was called (and no free play), play is nullified
  if (penalty && !freePlay) {
    return {
      success: false,
      yards: -penalty.yards,
      touchdown: false,
      firstDown: false,
      turnover: false,
      interception: false,
      fumble: false,
      sack: false,
      breakaway: false,
      description: `FLAG! ${penalty.type}. ${penalty.yards} yard penalty.`,
      penalty,
      freePlay: false,
    };
  }

  const yardRange = play.yardRange ?? { min: 0, max: 10 };
  const baseBreakaway = play.baseBreakaway ?? 10;
  const baseIntRisk = play.baseIntRisk ?? 5;
  const baseFumbleRisk = play.baseFumbleRisk ?? 2;

  // Apply breakaway modifier from modifier cards
  let breakawayChance = baseBreakaway;
  if (modifier?.effect.breakawayMod) {
    breakawayChance = Math.max(0, breakawayChance + modifier.effect.breakawayMod);
  }

  if (success) {
    // Calculate yards
    const range = yardRange.max - yardRange.min;
    yards = yardRange.min + Math.floor(Math.random() * (range + 1));

    // Breakaway check
    if (Math.random() * 100 < breakawayChance) {
      breakaway = true;
      yards = Math.min(yards + 20 + Math.floor(Math.random() * 30), 100 - gameState.fieldPosition);
    }

    // Check for touchdown
    if (gameState.fieldPosition + yards >= 100) {
      touchdown = true;
      yards = 100 - gameState.fieldPosition;
    }

    // Check for first down
    if (yards >= gameState.distance) {
      firstDown = true;
    }
  } else {
    // Failed play
    if (play.type === 'pass') {
      // Check for INT
      const intChance = baseIntRisk;
      if (Math.random() * 100 < intChance) {
        interception = true;
        turnover = true;
        yards = 0;
      }

      // Sack check (if not intercepted)
      if (!interception && Math.random() < 0.15) {
        sack = true;
        yards = -(Math.floor(Math.random() * 8) + 3);
      }
    } else {
      // Run stuffed
      yards = Math.floor(Math.random() * 3) - 1;
    }
  }

  // Fumble check (unless fumble protection)
  if (!turnover && !modifier?.effect.fumbleProtection) {
    if (Math.random() * 100 < baseFumbleRisk) {
      fumble = true;
      turnover = Math.random() < 0.5;
      if (modifier?.effect.fumbleProtection) {
        // Convert fumble to incomplete if protected
        fumble = false;
        turnover = false;
        if (play.type === 'run') {
          yards = 0;
        }
      }
    }
  }

  // Build description
  if (touchdown) {
    description = `TOUCHDOWN! ${play.name} for ${yards} yards!`;
  } else if (interception) {
    description = `INTERCEPTED! ${play.name} picked off!`;
  } else if (fumble && turnover) {
    description = `FUMBLE LOST on ${play.name}!`;
  } else if (sack) {
    description = `SACKED for ${Math.abs(yards)} yard loss!`;
  } else if (play.type === 'pass') {
    if (success) {
      const extra = breakaway ? ' BREAKAWAY!' : '';
      description = `${play.name} - ${yards} yard gain${extra}`;
    } else {
      description = `${play.name} - Incomplete`;
    }
  } else {
    // Run plays
    if (success) {
      const extra = breakaway ? ' BREAKAWAY!' : '';
      description = `${play.name} - ${yards} yard gain${extra}`;
    } else if (yards < 0) {
      description = `${play.name} - Stuffed for ${Math.abs(yards)} yard loss`;
    } else if (yards === 0) {
      description = `${play.name} - Stuffed for no gain`;
    } else {
      description = `${play.name} - Limited to ${yards} yard${yards !== 1 ? 's' : ''}`;
    }
  }

  // Add free play note
  if (freePlay && penalty) {
    description = `FREE PLAY! ${description} (Decline ${penalty.type})`;
  }

  return {
    success,
    yards,
    touchdown,
    firstDown,
    turnover,
    interception,
    fumble,
    sack,
    breakaway,
    description,
    penalty: freePlay ? undefined : penalty,
    freePlay,
  };
}

export default { calculatePlaySuccess, resolvePlay };
