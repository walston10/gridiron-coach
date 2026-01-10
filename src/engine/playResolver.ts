/**
 * ILLEGAL MOTION - Play Resolution Engine
 *
 * The CORE MATH of the game. When cards are played, this determines outcomes.
 *
 * Key concepts:
 * - Seeded randomness for reproducibility
 * - Counter system (rock-paper-scissors with plays)
 * - Tendency tracking for prediction bonuses
 * - Synergy bonuses from play patterns
 * - 4th down special resolution (FG, punt, fake, return)
 */

import type {
  OffensiveCard,
  DefensiveCard,
  SpecialTeamsCard,
  DirtyCard,
  OffensivePlayType,
  DefensivePlayType,
  PenaltyResult,
  InjuryResult,
  GameSituation,
} from '../types/card.types';

import type {
  FieldPosition,
  Momentum,
  Tendencies,
  WeatherCondition,
  GameClock,
  FourthDownCategory,
  FourthDownDefenseResponse,
  TargetPosition,
  ShadePosition,
  OffensiveModifier,
  PenaltyType,
  RefereeStyle,
  CombinedPregameEffects,
} from '../types/game.types';
import {
  DEFAULT_PLAY_TARGETS,
  MODIFIER_EFFECTS,
  HARD_COUNT_ODDS,
  QUICK_COUNT_BONUS,
  PENALTY_CONFIG,
  REFEREE_STYLES,
  getApplicablePenalties,
  DEAD_BALL_PENALTIES,
} from '../types/game.types';

import type { Roster, OLineUnit, DLineUnit } from '../types/player.types';

// =============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// =============================================================================

/**
 * Simple seeded RNG using mulberry32 algorithm
 * Allows reproducible game results for replays/debugging
 */
export class SeededRNG {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  /** Get next random number between 0 and 1 */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Get random int between min and max (inclusive) */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Roll against a percentage (0-100) */
  rollPercent(chance: number): boolean {
    return this.next() * 100 < chance;
  }

  /** Get random with variance (value +/- variance%) */
  withVariance(value: number, variancePercent: number): number {
    const variance = value * (variancePercent / 100);
    return value + (this.next() * 2 - 1) * variance;
  }

  /** Get current seed for saving */
  getSeed(): number {
    return this.seed;
  }
}

// Global RNG instance (can be replaced with seeded version)
let rng = new SeededRNG();

export function setRNGSeed(seed: number): void {
  rng = new SeededRNG(seed);
}

export function getRNG(): SeededRNG {
  return rng;
}

// =============================================================================
// TYPES
// =============================================================================

export interface PlayContext {
  offenseRoster: Roster;
  defenseRoster: Roster;
  fieldPosition: FieldPosition;
  momentum: Momentum;
  offenseTendencies: Tendencies;
  defenseTendencies: Tendencies;
  clock: GameClock;
  weather?: WeatherCondition;
  offenseFatigue: number;
  defenseFatigue: number;
  scoreDifferential: number; // Positive = offense leading
  offenseTarget?: TargetPosition;  // Who offense is targeting
  defenseShade?: ShadePosition;    // Who defense is shading
  offenseStaminaModifier?: number; // Stamina effect modifier for targeted player (-0.1 to 1.0)
  offenseModifier?: OffensiveModifier; // Pre-snap modifier (motion, hard count, etc.)
  // Penalty system
  refereeStyle?: RefereeStyle;       // Current referee style
  isUserHome?: boolean;              // Is user playing as home team
  lastPenaltyAgainst?: 'OFFENSE' | 'DEFENSE' | null; // For makeup calls
  // Pregame effects
  pregameEffects?: CombinedPregameEffects; // Combined stadium/weather/referee effects
  isHomeTeamOnOffense?: boolean;    // Is the home team currently on offense
}

export interface PlayResult {
  success: boolean;
  yardsGained: number;
  bigPlay: boolean;
  turnover: boolean;
  turnoverType?: 'INTERCEPTION' | 'FUMBLE' | 'DOWNS' | 'MUFFED_PUNT' | 'FAILED_ONSIDE';
  touchdown: boolean;
  safety: boolean;
  sack: boolean;
  sackYards: number;
  penalty?: PenaltyResult;
  injury?: InjuryResult;
  momentumShift: number;
  playByPlay: string;
  breakdown: PlayBreakdown;
  // Shade result information
  shadeResult?: ShadeResult;
}

export interface ShadeResult {
  defenseShade: ShadePosition;
  offenseTarget: TargetPosition;
  shadeMatched: boolean;           // Exact match
  runShadeBonus: boolean;          // RB shade on run play
  bonusApplied: number;            // Total bonus (negative for offense)
  message: string;                 // Display message
}

export interface PlayBreakdown {
  baseSuccessChance: number;
  counterModifier: number;
  situationModifier: number;
  tendencyModifier: number;
  synergyModifier: number;
  weatherModifier: number;
  fatigueModifier: number;
  momentumModifier: number;
  shadeModifier: number;
  staminaModifier: number;
  modifierBonus: number;        // Pre-snap modifier effect
  pregameModifier: number;      // Stadium/weather/referee combined effects
  matchupModifier: number;      // Individual player matchup result
  matchupDetails?: MatchupDetails; // Detailed matchup info for display
  finalSuccessChance: number;
  rolls: { name: string; target: number; result: number; success: boolean }[];
}

/** Individual player matchup details for display */
export interface MatchupDetails {
  // Offensive player in the matchup
  offensePlayer: {
    position: TargetPosition | 'QB';
    rating: number;       // Primary rating used
    ratingName: string;   // e.g., "Throwing", "Catching", "Power"
  };
  // Defensive player in the matchup
  defensePlayer: {
    position: string;     // e.g., "CB1", "LB", "S"
    rating: number;       // Primary rating used
    ratingName: string;   // e.g., "Coverage", "Tackling"
  };
  // Matchup result
  advantageTeam: 'OFFENSE' | 'DEFENSE' | 'EVEN';
  differential: number;   // Rating difference
  modifier: number;       // Applied modifier to success chance
  description: string;    // e.g., "WR1 (92 SPD) vs CB1 (78 COV) = +7%"
}

export interface FourthDownResult {
  type: 'FIELD_GOAL' | 'PUNT' | 'FAKE' | 'CONVERSION';
  success: boolean;
  yardsGained?: number;
  blocked: boolean;
  returnYards?: number;
  turnover: boolean;
  touchdown: boolean;
  newFieldPosition: number;
  playByPlay: string;
}

export interface Synergy {
  name: string;
  description: string;
  modifier: number;
  source: string;
}

// =============================================================================
// COUNTER SYSTEM - THE ROCK-PAPER-SCISSORS OF PLAYS
// =============================================================================

/**
 * Counter matrix: How offensive plays perform against defensive plays
 * Positive = offense advantage, Negative = defense advantage
 * Values are percentage modifiers to success chance
 */
const COUNTER_MATRIX: Record<OffensivePlayType, Partial<Record<DefensivePlayType, number>>> = {
  // === Pass Plays ===
  SHORT_PASS: {
    MAN_COVERAGE: -15,
    ZONE_COVERAGE: 5,
    DEEP_ZONE: 20,
    PRESS_COVERAGE: -20,
    BLITZ: 25,           // Quick pass beats blitz
    ZONE_BLITZ: 10,
    CONTAIN: 10,
    SPY: 5,
    STACK_THE_BOX: 20,
    GOAL_LINE_STAND: 25,
    PREVENT: 15,
  },
  MEDIUM_PASS: {
    MAN_COVERAGE: -10,
    ZONE_COVERAGE: -5,
    DEEP_ZONE: 10,
    PRESS_COVERAGE: 10,
    BLITZ: 15,
    ZONE_BLITZ: -15,     // Zone blitz designed for this
    CONTAIN: 5,
    SPY: 0,
    STACK_THE_BOX: 25,
    GOAL_LINE_STAND: 30,
    PREVENT: 10,
  },
  DEEP_PASS: {
    MAN_COVERAGE: 5,
    ZONE_COVERAGE: 10,
    DEEP_ZONE: -30,      // Deep zone specifically counters this
    PRESS_COVERAGE: 20,  // If you beat press, you're gone
    BLITZ: -10,          // No time for deep routes
    ZONE_BLITZ: -5,
    CONTAIN: 15,
    SPY: 10,
    STACK_THE_BOX: 35,   // Empty box = deep shots
    GOAL_LINE_STAND: 40,
    PREVENT: -40,        // Prevent prevents big plays
  },
  SCREEN: {
    MAN_COVERAGE: -10,
    ZONE_COVERAGE: -15,  // Zone reads screen
    DEEP_ZONE: 20,
    PRESS_COVERAGE: 15,
    BLITZ: 35,           // Screen kills blitz
    ZONE_BLITZ: 20,
    CONTAIN: -20,        // Contain stops outside plays
    SPY: -25,            // Spy reads screen
    STACK_THE_BOX: 10,
    GOAL_LINE_STAND: 15,
    PREVENT: 25,
  },
  PLAY_ACTION: {
    MAN_COVERAGE: 10,
    ZONE_COVERAGE: -5,
    DEEP_ZONE: 5,
    PRESS_COVERAGE: 15,
    BLITZ: -10,          // Blitz doesn't bite on fake
    ZONE_BLITZ: -5,
    CONTAIN: -15,        // Contain reads the play
    SPY: -20,            // Spy sees the fake
    STACK_THE_BOX: 30,   // Box bites hard on PA
    GOAL_LINE_STAND: 35,
    PREVENT: 0,
  },

  // === Run Plays ===
  INSIDE_RUN: {
    MAN_COVERAGE: 15,
    ZONE_COVERAGE: 10,
    DEEP_ZONE: 30,       // Empty secondary
    PRESS_COVERAGE: 20,
    BLITZ: -15,          // Extra defenders in the way
    ZONE_BLITZ: -10,
    CONTAIN: 5,
    SPY: -5,
    STACK_THE_BOX: -35,  // Designed to stop this
    GOAL_LINE_STAND: -40,
    PREVENT: 35,
  },
  OUTSIDE_RUN: {
    MAN_COVERAGE: 20,
    ZONE_COVERAGE: 15,
    DEEP_ZONE: 25,
    PRESS_COVERAGE: 10,
    BLITZ: 5,
    ZONE_BLITZ: 0,
    CONTAIN: -30,        // Contain forces back inside
    SPY: -10,
    STACK_THE_BOX: -20,
    GOAL_LINE_STAND: -25,
    PREVENT: 30,
  },
  POWER_RUN: {
    MAN_COVERAGE: 10,
    ZONE_COVERAGE: 10,
    DEEP_ZONE: 25,
    PRESS_COVERAGE: 15,
    BLITZ: -20,          // Power struggles vs extra men
    ZONE_BLITZ: -15,
    CONTAIN: 0,
    SPY: 0,
    STACK_THE_BOX: -30,
    GOAL_LINE_STAND: -35,
    PREVENT: 30,
  },
  DRAW: {
    MAN_COVERAGE: 15,
    ZONE_COVERAGE: 5,
    DEEP_ZONE: 20,
    PRESS_COVERAGE: 10,
    BLITZ: 30,           // Draw fools the blitz
    ZONE_BLITZ: 20,
    CONTAIN: -10,
    SPY: -25,            // Spy reads draw
    STACK_THE_BOX: -15,
    GOAL_LINE_STAND: -20,
    PREVENT: 25,
  },

  // === Special Plays ===
  TRICK_PLAY: {
    MAN_COVERAGE: 10,
    ZONE_COVERAGE: 5,
    DEEP_ZONE: 15,
    PRESS_COVERAGE: 20,
    BLITZ: 0,
    ZONE_BLITZ: 0,
    CONTAIN: -25,        // Disciplined defense
    SPY: -30,            // Spy sniffs it out
    STACK_THE_BOX: 5,
    GOAL_LINE_STAND: 10,
    PREVENT: 20,
  },
  QB_RUN: {
    MAN_COVERAGE: 20,
    ZONE_COVERAGE: 15,
    DEEP_ZONE: 30,
    PRESS_COVERAGE: 10,
    BLITZ: 15,           // Gap created by blitzing
    ZONE_BLITZ: 10,
    CONTAIN: -35,        // Contain specifically for this
    SPY: -40,            // Spy directly counters QB runs
    STACK_THE_BOX: -15,
    GOAL_LINE_STAND: -20,
    PREVENT: 25,
  },
  SPIKE: {
    // Spike always succeeds
    MAN_COVERAGE: 0,
    ZONE_COVERAGE: 0,
    DEEP_ZONE: 0,
  },
  KNEEL: {
    // Kneel always succeeds
    MAN_COVERAGE: 0,
    ZONE_COVERAGE: 0,
    DEEP_ZONE: 0,
  },
};

/**
 * Get counter modifier for offense vs defense matchup
 */
export function getCounterModifier(
  offensePlayType: OffensivePlayType,
  defensePlayType: DefensivePlayType
): number {
  return COUNTER_MATRIX[offensePlayType]?.[defensePlayType] ?? 0;
}

/**
 * Get prediction bonus if defense correctly guessed the play type category
 */
export function getPredictionBonus(
  offensePlayType: OffensivePlayType,
  defensePrediction: OffensivePlayType | null,
  predictionStreak: number
): number {
  if (!defensePrediction) return 0;

  // Categorize play types
  const isPass = (t: OffensivePlayType) =>
    ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(t);
  const isRun = (t: OffensivePlayType) =>
    ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(t);

  // Exact match = big bonus
  if (offensePlayType === defensePrediction) {
    return 25 + Math.min(predictionStreak * 5, 15); // Up to +40%
  }

  // Category match = smaller bonus
  if ((isPass(offensePlayType) && isPass(defensePrediction)) ||
      (isRun(offensePlayType) && isRun(defensePrediction))) {
    return 10 + Math.min(predictionStreak * 2, 10); // Up to +20%
  }

  return 0;
}

/**
 * Calculate shade bonus for defense
 * Returns a ShadeResult with bonus and message
 *
 * Rules:
 * - Exact match (shade = target): +15% defense bonus
 * - RB shade on run play: +10% defense bonus
 * - Miss: 0 bonus (no penalty)
 */
export function calculateShadeBonus(
  defenseShade: ShadePosition,
  offenseTarget: TargetPosition,
  offensePlayType: OffensivePlayType
): ShadeResult {
  // No shade selected - no bonus
  if (defenseShade === 'NONE') {
    return {
      defenseShade,
      offenseTarget,
      shadeMatched: false,
      runShadeBonus: false,
      bonusApplied: 0,
      message: '',
    };
  }

  // Check if it's a run play
  const isRun = ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(offensePlayType);

  // Exact match - defense correctly shaded the target
  if (defenseShade === offenseTarget) {
    return {
      defenseShade,
      offenseTarget,
      shadeMatched: true,
      runShadeBonus: false,
      bonusApplied: 15,
      message: `Defense shaded ${defenseShade} - CORRECT!`,
    };
  }

  // RB shade on run play - defense gets partial bonus
  if (defenseShade === 'RB' && isRun) {
    return {
      defenseShade,
      offenseTarget,
      shadeMatched: false,
      runShadeBonus: true,
      bonusApplied: 10,
      message: `Defense shaded RB on run play - good read!`,
    };
  }

  // Shade missed - no bonus or penalty
  return {
    defenseShade,
    offenseTarget,
    shadeMatched: false,
    runShadeBonus: false,
    bonusApplied: 0,
    message: `Defense shaded ${defenseShade} - wrong read`,
  };
}

// =============================================================================
// SITUATION MODIFIERS
// =============================================================================

/**
 * Get active game situations based on context
 */
export function getActiveSituations(context: PlayContext): GameSituation[] {
  const situations: GameSituation[] = [];
  const { fieldPosition, clock, scoreDifferential, momentum } = context;

  // Field position
  if (fieldPosition.inRedZone) situations.push('RED_ZONE');
  if (fieldPosition.backedUp) situations.push('BACKED_UP');
  if (fieldPosition.yardLine >= 40 && fieldPosition.yardLine <= 60) situations.push('MIDFIELD');

  // Down and distance
  if (fieldPosition.yardsToGo <= 3) situations.push('SHORT_YARDAGE');
  if (fieldPosition.yardsToGo >= 10) situations.push('LONG_YARDAGE');
  if (fieldPosition.down === 1) situations.push('FIRST_DOWN');
  if (fieldPosition.down === 3) situations.push('THIRD_DOWN');
  if (fieldPosition.down === 4) situations.push('FOURTH_DOWN');

  // Score
  if (scoreDifferential > 0) situations.push('LEADING');
  if (scoreDifferential < 0) situations.push('TRAILING');
  if (Math.abs(scoreDifferential) <= 7) situations.push('CLOSE_GAME');
  if (Math.abs(scoreDifferential) >= 21) situations.push('BLOWOUT');

  // Time
  if (clock.quarter === 4) situations.push('FOURTH_QUARTER');
  if (clock.quarter === 4 && clock.minutes <= 2) situations.push('TWO_MINUTE_WARNING');
  if (clock.quarter === 'OT') situations.push('OVERTIME');

  // Momentum
  if (momentum.value >= 50) situations.push('HIGH_MOMENTUM');
  if (momentum.value <= -50) situations.push('LOW_MOMENTUM');

  // Tendencies
  if (context.defenseTendencies.predictability >= 70) situations.push('OPPONENT_PREDICTABLE');
  // Check if opponent has been aggressive (many passes suggest aggression)
  const passPlays = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'] as const;
  if (context.defenseTendencies.recentPlays.filter(p => passPlays.includes(p as typeof passPlays[number])).length >= 7) {
    situations.push('OPPONENT_AGGRESSIVE');
  }

  return situations;
}

/**
 * Calculate total situation modifier from card bonuses
 */
export function calculateSituationModifier(
  card: OffensiveCard | DefensiveCard | SpecialTeamsCard,
  activeSituations: GameSituation[]
): number {
  let modifier = 0;

  for (const bonus of card.situationBonuses) {
    if (activeSituations.includes(bonus.situation)) {
      modifier += bonus.modifier;
    }
  }

  return modifier;
}

// =============================================================================
// TENDENCY TRACKING
// =============================================================================

/**
 * Update tendencies after a play
 */
export function updateTendencies(
  tendencies: Tendencies,
  playType: OffensivePlayType,
  wasPredictionCorrect: boolean
): Tendencies {
  const newRecentPlays = [...tendencies.recentPlays, playType].slice(-10);

  // Calculate run/pass ratio (0 = all run, 100 = all pass)
  const passPlays = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'];
  const passCount = newRecentPlays.filter(p => passPlays.includes(p)).length;
  const runPassRatio = Math.round((passCount / newRecentPlays.length) * 100);

  // Calculate short/deep ratio
  const deepPlays = ['DEEP_PASS', 'PLAY_ACTION'];
  const deepCount = newRecentPlays.filter(p => deepPlays.includes(p)).length;
  const shortDeepRatio = Math.round((deepCount / Math.max(passCount, 1)) * 100);

  // Calculate predictability
  const predictability = calculateTendencyPredictability(newRecentPlays);

  // Update prediction streak
  const predictionStreak = wasPredictionCorrect
    ? tendencies.predictionStreak + 1
    : 0;

  return {
    recentPlays: newRecentPlays,
    runPassRatio,
    shortDeepRatio,
    leftRightRatio: tendencies.leftRightRatio, // Not tracked per play
    thirdDownTendency: calculateSituationalTendency(newRecentPlays, 'third') as 'RUN' | 'PASS' | 'BALANCED',
    redZoneTendency: calculateSituationalTendency(newRecentPlays, 'redzone') as 'RUN' | 'PASS' | 'BALANCED',
    trailingTendency: calculateSituationalTendency(newRecentPlays, 'trailing') as 'AGGRESSIVE' | 'CONSERVATIVE' | 'BALANCED',
    predictability,
    lastPredictionCorrect: wasPredictionCorrect,
    predictionStreak,
  };
}

function calculateTendencyPredictability(plays: OffensivePlayType[]): number {
  if (plays.length < 5) return 0;

  const counts = new Map<OffensivePlayType, number>();
  plays.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));

  let maxCount = 0;
  counts.forEach(count => {
    if (count > maxCount) maxCount = count;
  });

  // If they're running the same play category 60%+ of the time, they're predictable
  return Math.round((maxCount / plays.length) * 100);
}

function calculateSituationalTendency(
  plays: OffensivePlayType[],
  situation: string
): 'RUN' | 'PASS' | 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE' {
  // Simplified - in full implementation would track by situation
  const passPlays = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'];
  const passCount = plays.filter(p => passPlays.includes(p)).length;
  const ratio = passCount / plays.length;

  // For trailing tendency, return aggression level
  if (situation === 'trailing') {
    if (ratio > 0.7) return 'AGGRESSIVE';
    if (ratio < 0.3) return 'CONSERVATIVE';
    return 'BALANCED';
  }

  // For other situations, return run/pass tendency
  if (ratio > 0.65) return 'PASS';
  if (ratio < 0.35) return 'RUN';
  return 'BALANCED';
}

// =============================================================================
// SYNERGY CALCULATION
// =============================================================================

/**
 * Get active synergies based on tendencies and current play
 */
export function getActiveSynergies(
  tendencies: Tendencies,
  card: OffensiveCard
): Synergy[] {
  const synergies: Synergy[] = [];

  // Minimum plays required for tendency-based synergies
  const MIN_PLAYS_FOR_SYNERGY = 5;
  const hasSufficientPlays = tendencies.recentPlays.length >= MIN_PLAYS_FOR_SYNERGY;

  // Play Action synergy - bonus if you've been running (requires play history)
  if (card.playType === 'PLAY_ACTION' && hasSufficientPlays) {
    if (tendencies.runPassRatio < 40) {
      // Heavy run = PA bonus
      const bonus = Math.round((40 - tendencies.runPassRatio) * 0.5);
      synergies.push({
        name: 'Run Setup',
        description: 'Play action more effective after establishing the run',
        modifier: bonus,
        source: 'tendencies',
      });
    }
  }

  // Screen synergy - bonus if opponent has been blitzing
  if (card.playType === 'SCREEN') {
    const blitzCount = tendencies.recentPlays.filter(() => false).length; // Would check defense tendencies
    if (blitzCount >= 3) {
      synergies.push({
        name: 'Blitz Buster',
        description: 'Screen effective against aggressive defense',
        modifier: 15,
        source: 'opponent_tendencies',
      });
    }
  }

  // Deep shot synergy - bonus after short pass heavy (requires play history)
  if (card.playType === 'DEEP_PASS' && hasSufficientPlays) {
    if (tendencies.shortDeepRatio < 20) {
      synergies.push({
        name: 'Caught Sleeping',
        description: 'Deep shot catches defense off guard after short passes',
        modifier: 10,
        source: 'tendencies',
      });
    }
  }

  // Draw synergy - bonus against aggressive pass rush
  if (card.playType === 'DRAW') {
    // Would check if defense has been passing rushing heavy
    // Placeholder logic
    synergies.push({
      name: 'Patience',
      description: 'Draw play timing',
      modifier: 5,
      source: 'play_design',
    });
  }

  return synergies;
}

// =============================================================================
// OFFENSIVE PLAY RESOLUTION
// =============================================================================

/**
 * Resolve an offensive play
 */
export function resolveOffensivePlay(
  offenseCard: OffensiveCard,
  defenseCard: DefensiveCard,
  context: PlayContext,
  _dirtyCard?: DirtyCard
): PlayResult {
  // Determine if this is a pass play (used for penalty checking)
  const isPassPlay = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(
    offenseCard.playType
  );

  // === PRE-SNAP: Check for dead ball penalties ===
  // These prevent the play from happening entirely
  const preSnapPenalty = checkForPenalty(isPassPlay, context, 0);
  if (preSnapPenalty.hasPenalty && preSnapPenalty.isDeadBall && preSnapPenalty.penalty) {
    const breakdown: PlayBreakdown = {
      baseSuccessChance: 0,
      counterModifier: 0,
      situationModifier: 0,
      tendencyModifier: 0,
      synergyModifier: 0,
      weatherModifier: 0,
      fatigueModifier: 0,
      momentumModifier: 0,
      shadeModifier: 0,
      staminaModifier: 0,
      modifierBonus: 0,
      pregameModifier: 0,
      matchupModifier: 0,
      finalSuccessChance: 0,
      rolls: [],
    };

    // Dead ball penalty - play never happened
    return {
      success: false,
      yardsGained: 0,
      bigPlay: false,
      turnover: false,
      touchdown: false,
      safety: false,
      sack: false,
      sackYards: 0,
      penalty: preSnapPenalty.penalty,
      momentumShift: preSnapPenalty.penalty.team === 'OFFENSE' ? -3 : 3,
      playByPlay: `${getPenaltyFlavorText()} ${preSnapPenalty.penalty.description}`,
      breakdown,
    };
  }

  const breakdown: PlayBreakdown = {
    baseSuccessChance: offenseCard.successChance,
    counterModifier: 0,
    situationModifier: 0,
    tendencyModifier: 0,
    synergyModifier: 0,
    weatherModifier: 0,
    fatigueModifier: 0,
    momentumModifier: 0,
    shadeModifier: 0,
    staminaModifier: 0,
    modifierBonus: 0,
    pregameModifier: 0,
    matchupModifier: 0,
    finalSuccessChance: 0,
    rolls: [],
  };

  // === Step 1: Calculate base success chance ===
  let successChance = offenseCard.successChance;

  // === Step 2: Apply counter modifier ===
  const counterMod = getCounterModifier(offenseCard.playType, defenseCard.playType);
  breakdown.counterModifier = counterMod;
  successChance += counterMod;

  // === Step 3: Apply situation bonuses ===
  const activeSituations = getActiveSituations(context);
  const situationMod = calculateSituationModifier(offenseCard, activeSituations);
  breakdown.situationModifier = situationMod;
  successChance += situationMod;

  // === Step 4: Apply prediction penalty (if defense guessed right) ===
  // Only apply tendency-based prediction after 5+ plays to establish pattern
  const MIN_PLAYS_FOR_TENDENCY = 5;
  let predictionMod = 0;
  if (context.offenseTendencies.recentPlays.length >= MIN_PLAYS_FOR_TENDENCY) {
    predictionMod = getPredictionBonus(
      offenseCard.playType,
      context.defenseTendencies.recentPlays[0] || null, // Last play as proxy for prediction
      context.defenseTendencies.predictionStreak
    );
  }
  breakdown.tendencyModifier = -predictionMod; // Negative for offense
  successChance -= predictionMod;

  // === Step 5: Apply synergies ===
  const synergies = getActiveSynergies(context.offenseTendencies, offenseCard);
  const synergyMod = synergies.reduce((sum, s) => sum + s.modifier, 0);
  breakdown.synergyModifier = synergyMod;
  successChance += synergyMod;

  // === Step 6: Apply weather modifier ===
  if (context.weather) {
    const weatherEffect = getWeatherEffect(context.weather);
    const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(
      offenseCard.playType
    );
    const weatherMod = isPass ? weatherEffect.passModifier : weatherEffect.runModifier;
    breakdown.weatherModifier = weatherMod;
    successChance += weatherMod;
  }

  // === Step 6.5: Apply pregame effects (Stadium + home/away) ===
  if (context.pregameEffects) {
    const effects = context.pregameEffects;
    const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(
      offenseCard.playType
    );
    const isHomeOnOffense = context.isHomeTeamOnOffense ?? false;

    // Apply home/away bonuses from stadium
    let pregameMod = 0;
    if (isHomeOnOffense) {
      pregameMod = isPass ? effects.homePassBonus : effects.homeRunBonus;
    } else {
      pregameMod = isPass ? effects.awayPassBonus : effects.awayRunBonus;
    }

    // Note: Weather effects are already included in homePassBonus/etc in calculateCombinedEffects
    // But we still want to apply the raw stadium bonus here (weather handled in Step 6)
    // So subtract weather to avoid double-counting
    if (context.weather) {
      const weatherEffect = getWeatherEffect(context.weather);
      const weatherMod = isPass ? weatherEffect.passModifier : weatherEffect.runModifier;
      pregameMod -= weatherMod; // Remove weather since it's already applied
    }

    breakdown.pregameModifier = pregameMod;
    successChance += pregameMod;
  }

  // === Step 7: Apply fatigue modifier ===
  const fatiguePenalty = Math.floor(context.offenseFatigue / 20) * -2;
  breakdown.fatigueModifier = fatiguePenalty;
  successChance += fatiguePenalty;

  // === Step 8: Apply momentum modifier ===
  const momentumMod = Math.floor(context.momentum.value / 10);
  breakdown.momentumModifier = momentumMod;
  successChance += momentumMod;

  // === Step 9: Apply stamina modifier ===
  // Stamina modifier ranges from -0.1 (exhausted, penalty) to 1.0 (fresh, full bonus)
  // Convert to success chance modifier: -0.1 = -5%, 0 = 0%, 0.5 = +2.5%, 1.0 = +5%
  const staminaModifier = context.offenseStaminaModifier ?? 1.0;
  const staminaMod = Math.round(staminaModifier * 5); // -0.5 to +5 range
  breakdown.staminaModifier = staminaMod;
  successChance += staminaMod;

  // === Step 10: Calculate shade result ===
  // Determine effective target (use context or default based on play type)
  const effectiveTarget: TargetPosition = context.offenseTarget ||
    DEFAULT_PLAY_TARGETS[offenseCard.playType] || 'WR1';
  const defenseShade: ShadePosition = context.defenseShade || 'NONE';

  const shadeResult = calculateShadeBonus(defenseShade, effectiveTarget, offenseCard.playType);
  const shadePenalty = -shadeResult.bonusApplied; // Negative for offense (helps defense)
  breakdown.shadeModifier = shadePenalty;
  successChance += shadePenalty;

  // === Step 11: Apply pre-snap modifier effects ===
  const modifier = context.offenseModifier || 'NONE';
  let modifierBonus = 0;

  if (modifier !== 'NONE') {
    const modEffect = MODIFIER_EFFECTS[modifier];

    // Handle special modifiers
    if (modEffect.specialEffect === 'HARD_COUNT') {
      // Roll for hard count outcome
      const hardCountRoll = rng.next() * 100;
      if (hardCountRoll < HARD_COUNT_ODDS.OFFSIDES) {
        // Defense jumped offsides - free play bonus!
        modifierBonus = 15;
        breakdown.rolls.push({
          name: 'Hard Count',
          target: HARD_COUNT_ODDS.OFFSIDES,
          result: Math.round(hardCountRoll),
          success: true,
        });
      } else if (hardCountRoll < HARD_COUNT_ODDS.OFFSIDES + HARD_COUNT_ODDS.FALSE_START) {
        // Offense false started - this would be a penalty (handled separately)
        // For now, just apply a penalty
        modifierBonus = -10;
        breakdown.rolls.push({
          name: 'Hard Count',
          target: HARD_COUNT_ODDS.OFFSIDES,
          result: Math.round(hardCountRoll),
          success: false,
        });
      }
      // Otherwise normal snap, no bonus
    } else if (modEffect.specialEffect === 'QUICK_COUNT') {
      // Roll to see if defense was caught off guard
      if (rng.rollPercent(QUICK_COUNT_BONUS.CHANCE)) {
        modifierBonus = QUICK_COUNT_BONUS.SUCCESS_BONUS;
        breakdown.rolls.push({
          name: 'Quick Count',
          target: QUICK_COUNT_BONUS.CHANCE,
          result: Math.round(rng.next() * 100),
          success: true,
        });
      }
    } else {
      // Standard modifier - apply directly
      modifierBonus = modEffect.successBonus;
      // TODO: Apply yardsBonus and turnoverRisk in yards/turnover calculations
    }
  }

  breakdown.modifierBonus = modifierBonus;
  successChance += modifierBonus;

  // === Step 11.5: Apply individual player matchups ===
  const isDeepPass = offenseCard.playType === 'DEEP_PASS';
  const isRunPlay = ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(offenseCard.playType);
  const isPowerRun = offenseCard.playType === 'POWER_RUN' || offenseCard.playType === 'INSIDE_RUN';

  let matchupResult: { modifier: number; details: MatchupDetails } | null = null;

  if (isRunPlay) {
    // Run play: RB vs Front 7 matchup
    matchupResult = resolveRunMatchup(context.offenseRoster, context.defenseRoster, isPowerRun);
  } else if (isPassPlay && context.offenseTarget) {
    // Pass play with target: Receiver vs Coverage matchup
    matchupResult = resolvePassMatchup(
      context.offenseRoster,
      context.defenseRoster,
      context.offenseTarget,
      isDeepPass
    );

    // Also factor in QB accuracy
    const qbMod = resolveQBAccuracy(
      context.offenseRoster.offense.QB,
      isDeepPass,
      false // Will be set to true if under pressure later
    );
    if (matchupResult) {
      matchupResult.modifier += qbMod;
      matchupResult.details.description += ` | QB: ${qbMod >= 0 ? '+' : ''}${qbMod}%`;
    }
  } else if (isPassPlay) {
    // Pass play without specific target - use default WR1
    matchupResult = resolvePassMatchup(
      context.offenseRoster,
      context.defenseRoster,
      'WR1',
      isDeepPass
    );

    const qbMod = resolveQBAccuracy(
      context.offenseRoster.offense.QB,
      isDeepPass,
      false
    );
    if (matchupResult) {
      matchupResult.modifier += qbMod;
      matchupResult.details.description += ` | QB: ${qbMod >= 0 ? '+' : ''}${qbMod}%`;
    }
  }

  if (matchupResult) {
    breakdown.matchupModifier = matchupResult.modifier;
    breakdown.matchupDetails = matchupResult.details;
    successChance += matchupResult.modifier;
  }

  // Clamp success chance
  breakdown.finalSuccessChance = Math.max(5, Math.min(95, successChance));

  // === Step 12: Check for sack (pass plays only) ===
  // (isPassPlay was determined at the start of the function)

  let sack = false;
  let sackYards = 0;

  if (isPassPlay) {
    const sackResult = resolvePocketTime(
      context.offenseRoster.offense.OL,
      context.defenseRoster.defense.DL,
      defenseCard
    );

    if (sackResult.sacked) {
      sack = true;
      sackYards = sackResult.sackYards;

      breakdown.rolls.push({
        name: 'Pocket Time',
        target: sackResult.protectionRating,
        result: sackResult.pressureRoll,
        success: false,
      });
    }
  }

  if (sack) {
    // Sack result
    const newYardLine = context.fieldPosition.yardLine - sackYards;
    const safety = newYardLine <= 0;

    return {
      success: false,
      yardsGained: -sackYards,
      bigPlay: false,
      turnover: false,
      touchdown: false,
      safety,
      sack: true,
      sackYards,
      momentumShift: -10,
      playByPlay: `SACK! ${safety ? 'SAFETY!' : `Loss of ${sackYards} yards.`}`,
      breakdown,
      shadeResult: shadeResult.bonusApplied > 0 ? shadeResult : undefined,
    };
  }

  // === Step 11: Main success roll ===
  const successRoll = rng.next() * 100;
  const success = successRoll < breakdown.finalSuccessChance;

  breakdown.rolls.push({
    name: 'Success',
    target: breakdown.finalSuccessChance,
    result: Math.round(successRoll),
    success,
  });

  if (!success) {
    // Failed play
    const incompleteResult = resolveIncompletionOrStop(offenseCard, defenseCard, context);
    return {
      ...incompleteResult,
      sack: false,
      sackYards: 0,
      breakdown,
      shadeResult: shadeResult.bonusApplied > 0 ? shadeResult : undefined,
    };
  }

  // === Step 12: Calculate yards gained ===
  let yardsGained = calculateYardsGained(offenseCard, defenseCard, context);

  // === Step 13: Check for big play ===
  const bigPlayRoll = rng.next() * 100;
  const bigPlay = bigPlayRoll < offenseCard.bigPlayChance;

  if (bigPlay) {
    const bonusYards = rng.nextInt(10, 25);
    yardsGained += bonusYards;

    breakdown.rolls.push({
      name: 'Big Play',
      target: offenseCard.bigPlayChance,
      result: Math.round(bigPlayRoll),
      success: true,
    });
  }

  // === Step 14: Check for fumble ===
  const fumbleChance = offenseCard.turnoverRisk * 0.3; // 30% of turnover risk is fumble
  const fumbleRoll = rng.next() * 100;
  const fumble = fumbleRoll < fumbleChance;

  if (fumble) {
    breakdown.rolls.push({
      name: 'Fumble',
      target: fumbleChance,
      result: Math.round(fumbleRoll),
      success: false,
    });

    return {
      success: false,
      yardsGained: Math.floor(yardsGained / 2),
      bigPlay: false,
      turnover: true,
      turnoverType: 'FUMBLE',
      touchdown: false,
      safety: false,
      sack: false,
      sackYards: 0,
      momentumShift: -20,
      playByPlay: `Fumble! The ball is loose and recovered by the defense!`,
      breakdown,
      shadeResult: shadeResult.bonusApplied > 0 ? shadeResult : undefined,
    };
  }

  // === Step 15: Calculate final field position ===
  const newYardLine = context.fieldPosition.yardLine + yardsGained;
  const touchdown = newYardLine >= 100;
  const safety = newYardLine <= 0;

  // Final yards if TD
  if (touchdown) {
    yardsGained = context.fieldPosition.yardsToEndzone;
  }

  // Momentum shift
  let momentumShift = 0;
  if (touchdown) momentumShift = 25;
  else if (bigPlay) momentumShift = 15;
  else if (yardsGained >= context.fieldPosition.yardsToGo) momentumShift = 5;
  else if (yardsGained < 0) momentumShift = -5;

  // === Step 16: Check for live ball penalties ===
  const liveBallPenalty = checkForPenalty(isPassPlay, context, yardsGained);

  if (liveBallPenalty.hasPenalty && liveBallPenalty.penalty && !liveBallPenalty.isDeadBall) {
    // Determine if penalty should be declined
    const decline = shouldDeclinePenalty(
      liveBallPenalty.penalty,
      yardsGained,
      context.fieldPosition.yardsToGo,
      false, // not a turnover at this point
      touchdown
    );

    if (decline) {
      // Penalty declined - use play result
      liveBallPenalty.penalty.declined = true;
    }

    // Generate play by play with penalty
    let penaltyPlayByPlay = generatePlayByPlay(offenseCard, yardsGained, touchdown, bigPlay);

    if (!decline) {
      // Penalty accepted - override play result
      penaltyPlayByPlay = `${penaltyPlayByPlay} ${getPenaltyFlavorText()} ${liveBallPenalty.penalty.description}`;

      // Adjust momentum for penalty
      if (liveBallPenalty.penalty.team === 'OFFENSE') {
        momentumShift = Math.min(momentumShift, -3);
      } else {
        momentumShift = Math.max(momentumShift, 3);
      }

      return {
        success: false, // Play negated by penalty
        yardsGained: 0, // Penalty yards handled separately
        bigPlay: false,
        turnover: false,
        touchdown: false, // TD negated by offensive penalty if applicable
        safety: false,
        sack: false,
        sackYards: 0,
        penalty: liveBallPenalty.penalty,
        momentumShift,
        playByPlay: penaltyPlayByPlay,
        breakdown,
        shadeResult: shadeResult.bonusApplied > 0 ? shadeResult : undefined,
      };
    }

    // Penalty declined - include it in result but use play result
    const playByPlay = `${generatePlayByPlay(offenseCard, yardsGained, touchdown, bigPlay)} (Penalty declined)`;

    return {
      success: true,
      yardsGained,
      bigPlay,
      turnover: false,
      touchdown,
      safety,
      sack: false,
      sackYards: 0,
      penalty: liveBallPenalty.penalty, // Include declined penalty for display
      momentumShift,
      playByPlay,
      breakdown,
      shadeResult: shadeResult.bonusApplied > 0 ? shadeResult : undefined,
    };
  }

  const playByPlay = generatePlayByPlay(offenseCard, yardsGained, touchdown, bigPlay);

  return {
    success: true,
    yardsGained,
    bigPlay,
    turnover: false,
    touchdown,
    safety,
    sack: false,
    sackYards: 0,
    momentumShift,
    playByPlay,
    breakdown,
    shadeResult: shadeResult.bonusApplied > 0 ? shadeResult : undefined,
  };
}

// =============================================================================
// SUB-RESOLUTION FUNCTIONS
// =============================================================================

// =============================================================================
// PLAYER MATCHUP RESOLUTION
// =============================================================================

/**
 * Resolve pass play matchup: Receiver vs Coverage defender
 * Returns modifier and details for the play breakdown
 */
function resolvePassMatchup(
  offenseRoster: Roster,
  defenseRoster: Roster,
  target: TargetPosition,
  isDeepPass: boolean
): { modifier: number; details: MatchupDetails } {
  // Get the receiver
  const receiver = getTargetPlayer(offenseRoster, target);
  const receiverSpeed = receiver.ratings.speed;
  const receiverCatching = receiver.ratings.catching;
  const receiverAgility = receiver.ratings.agility;

  // Primary receiver rating: blend of speed and catching
  const receiverRating = isDeepPass
    ? Math.round(receiverSpeed * 0.7 + receiverCatching * 0.3)  // Deep passes favor speed
    : Math.round(receiverCatching * 0.5 + receiverSpeed * 0.3 + receiverAgility * 0.2);  // Short/medium favor hands

  // Get the coverage defender based on target
  let defender: { rating: number; position: string; ratingName: string };

  if (target === 'WR1') {
    defender = {
      rating: defenseRoster.defense.CB1.ratings.coverage,
      position: 'CB1',
      ratingName: 'Coverage',
    };
  } else if (target === 'WR2') {
    defender = {
      rating: defenseRoster.defense.CB2.ratings.coverage,
      position: 'CB2',
      ratingName: 'Coverage',
    };
  } else if (target === 'TE') {
    // TE is covered by LB or S depending on situation
    const lbCoverage = defenseRoster.defense.LB.ratings.coverage;
    const sCoverage = defenseRoster.defense.S.ratings.coverage;
    if (isDeepPass) {
      defender = { rating: sCoverage, position: 'S', ratingName: 'Coverage' };
    } else {
      defender = { rating: lbCoverage, position: 'LB', ratingName: 'Coverage' };
    }
  } else {
    // RB - covered by LB
    defender = {
      rating: defenseRoster.defense.LB.ratings.coverage,
      position: 'LB',
      ratingName: 'Coverage',
    };
  }

  // Calculate matchup differential
  const differential = receiverRating - defender.rating;

  // Convert to modifier: every 10 points = ~5% modifier
  const modifier = Math.round(differential * 0.5);

  // Determine advantage
  let advantageTeam: 'OFFENSE' | 'DEFENSE' | 'EVEN' = 'EVEN';
  if (differential >= 5) advantageTeam = 'OFFENSE';
  else if (differential <= -5) advantageTeam = 'DEFENSE';

  const details: MatchupDetails = {
    offensePlayer: {
      position: target,
      rating: receiverRating,
      ratingName: isDeepPass ? 'Speed' : 'Catching',
    },
    defensePlayer: defender,
    advantageTeam,
    differential,
    modifier,
    description: `${target} (${receiverRating}) vs ${defender.position} (${defender.rating} ${defender.ratingName}) = ${modifier >= 0 ? '+' : ''}${modifier}%`,
  };

  return { modifier, details };
}

/**
 * Resolve run play matchup: RB vs front seven
 * Returns modifier and details for the play breakdown
 */
function resolveRunMatchup(
  offenseRoster: Roster,
  defenseRoster: Roster,
  isPowerRun: boolean
): { modifier: number; details: MatchupDetails } {
  const rb = offenseRoster.offense.RB;
  const ol = offenseRoster.offense.OL;
  const dl = defenseRoster.defense.DL;
  const lb = defenseRoster.defense.LB;

  // RB rating: power for inside/power runs, agility for outside runs
  const rbPower = rb.ratings.strength;
  const rbAgility = rb.ratings.agility;
  const rbSpeed = rb.ratings.speed;

  const rbRating = isPowerRun
    ? Math.round(rbPower * 0.6 + rbAgility * 0.2 + rbSpeed * 0.2)
    : Math.round(rbAgility * 0.4 + rbSpeed * 0.4 + rbPower * 0.2);

  // Defense run stopping: DL run stop + LB tackling + OL run blocking factor
  const olRunBlock = ol.runBlockRating;
  const dlRunStop = dl.runStopRating;
  const lbTackling = lb.ratings.tackling;

  // Offensive line vs DL
  const lineMatchup = olRunBlock - dlRunStop;

  // Second level: RB vs LB
  const secondLevelMatchup = rbRating - lbTackling;

  // Combined: 60% line play, 40% second level
  const totalDifferential = Math.round(lineMatchup * 0.6 + secondLevelMatchup * 0.4);

  // Convert to modifier
  const modifier = Math.round(totalDifferential * 0.4);

  let advantageTeam: 'OFFENSE' | 'DEFENSE' | 'EVEN' = 'EVEN';
  if (totalDifferential >= 5) advantageTeam = 'OFFENSE';
  else if (totalDifferential <= -5) advantageTeam = 'DEFENSE';

  const details: MatchupDetails = {
    offensePlayer: {
      position: 'RB',
      rating: rbRating,
      ratingName: isPowerRun ? 'Power' : 'Agility',
    },
    defensePlayer: {
      position: 'Front 7',
      rating: Math.round((dlRunStop + lbTackling) / 2),
      ratingName: 'Run Stop',
    },
    advantageTeam,
    differential: totalDifferential,
    modifier,
    description: `RB (${rbRating} ${isPowerRun ? 'PWR' : 'AGI'}) + OL (${olRunBlock}) vs DL (${dlRunStop}) + LB (${lbTackling} TKL) = ${modifier >= 0 ? '+' : ''}${modifier}%`,
  };

  return { modifier, details };
}

/**
 * QB accuracy check - affects pass completion chance
 * Returns modifier based on QB throwing + accuracy
 */
function resolveQBAccuracy(
  qb: Roster['offense']['QB'],
  isDeepPass: boolean,
  isPressured: boolean
): number {
  const throwing = qb.ratings.throwing;
  const awareness = qb.ratings.awareness;
  // clutch rating available for future pressure situations

  // Base accuracy: throwing + awareness blend
  let accuracy = Math.round(throwing * 0.6 + awareness * 0.4);

  // Deep passes require more arm strength
  if (isDeepPass) {
    accuracy = Math.round(throwing * 0.8 + awareness * 0.2);
  }

  // Pressure hurts accuracy (awareness helps mitigate)
  if (isPressured) {
    const pressurePenalty = Math.max(5, 15 - Math.round(awareness * 0.1));
    accuracy -= pressurePenalty;
  }

  // Convert to modifier: 75 = neutral, every 5 points = ~2.5%
  return Math.round((accuracy - 75) * 0.5);
}

/**
 * Get the targeted player from the roster
 */
function getTargetPlayer(roster: Roster, target: TargetPosition) {
  switch (target) {
    case 'WR1': return roster.offense.WR1;
    case 'WR2': return roster.offense.WR2;
    case 'TE': return roster.offense.TE;
    case 'RB': return roster.offense.RB;
    default: return roster.offense.WR1;
  }
}

// =============================================================================
// EXISTING SUB-RESOLUTION FUNCTIONS
// =============================================================================

interface PocketResult {
  sacked: boolean;
  sackYards: number;
  protectionRating: number;
  pressureRoll: number;
}

function resolvePocketTime(
  oLine: OLineUnit,
  dLine: DLineUnit,
  defenseCard: DefensiveCard
): PocketResult {
  // Base protection from OL rating
  let protectionRating = oLine.passBlockRating;

  // DL pass rush subtracts from it
  const pressureRating = dLine.passRushRating;

  // Blitz increases pressure
  if (defenseCard.playType === 'BLITZ') {
    protectionRating -= 15;
  } else if (defenseCard.playType === 'ZONE_BLITZ') {
    protectionRating -= 8;
  }

  // Defense pressure rating on card
  protectionRating -= Math.floor(defenseCard.pressureRating / 5);

  // Roll to see if sack
  const sackThreshold = Math.max(5, Math.min(30, (pressureRating - protectionRating + 50) / 3));
  const sackRoll = rng.next() * 100;
  const sacked = sackRoll < sackThreshold;

  return {
    sacked,
    sackYards: sacked ? rng.nextInt(3, 10) : 0,
    protectionRating,
    pressureRoll: Math.round(sackRoll),
  };
}

function resolveIncompletionOrStop(
  offenseCard: OffensiveCard,
  defenseCard: DefensiveCard,
  context: PlayContext
): Omit<PlayResult, 'sack' | 'sackYards' | 'breakdown'> {
  const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(
    offenseCard.playType
  );

  // Check for interception on pass plays
  if (isPass) {
    const intChance = offenseCard.turnoverRisk * 0.7; // 70% of turnover risk is INT
    const intBonus = defenseCard.playType === 'ZONE_COVERAGE' ? 5 : 0;
    const intRoll = rng.next() * 100;

    if (intRoll < intChance + intBonus) {
      return {
        success: false,
        yardsGained: 0,
        bigPlay: false,
        turnover: true,
        turnoverType: 'INTERCEPTION',
        touchdown: false,
        safety: false,
        momentumShift: -20,
        playByPlay: 'INTERCEPTED! The defense comes away with the ball!',
      };
    }

    return {
      success: false,
      yardsGained: 0,
      bigPlay: false,
      turnover: false,
      touchdown: false,
      safety: false,
      momentumShift: -2,
      playByPlay: 'Incomplete pass.',
    };
  }

  // Run stopped for minimal gain
  const minYards = rng.nextInt(-2, 2);
  return {
    success: false,
    yardsGained: minYards,
    bigPlay: false,
    turnover: false,
    touchdown: false,
    safety: minYards < 0 && context.fieldPosition.yardLine + minYards <= 0,
    momentumShift: -3,
    playByPlay: `Run stuffed for ${minYards <= 0 ? 'no gain' : `${minYards} yard${minYards !== 1 ? 's' : ''}`}.`,
  };
}

function calculateYardsGained(
  offenseCard: OffensiveCard,
  defenseCard: DefensiveCard,
  _context: PlayContext
): number {
  // Start with base yards
  let yards = offenseCard.baseYards;

  // Apply variance (+/- 30%)
  yards = Math.round(rng.withVariance(yards, 30));

  // Defense effectiveness reduces yards
  const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(
    offenseCard.playType
  );

  const defenseRating = isPass ? defenseCard.passDefenseRating : defenseCard.runStopRating;
  const defenseMod = (50 - defenseRating) / 5; // -10 to +10 based on defense
  yards += Math.round(defenseMod);

  // Ensure at least 0 yards on success (can't lose yards on completed plays)
  return Math.max(0, yards);
}

function generatePlayByPlay(
  card: OffensiveCard,
  yards: number,
  touchdown: boolean,
  bigPlay: boolean
): string {
  const playTypeDescriptions: Record<OffensivePlayType, string> = {
    SHORT_PASS: 'Quick pass complete',
    MEDIUM_PASS: 'Pass complete over the middle',
    DEEP_PASS: 'Deep ball',
    SCREEN: 'Screen pass',
    PLAY_ACTION: 'Play action pass',
    INSIDE_RUN: 'Handoff up the middle',
    OUTSIDE_RUN: 'Sweep to the outside',
    POWER_RUN: 'Power run',
    DRAW: 'Draw play',
    TRICK_PLAY: 'Trick play!',
    QB_RUN: 'QB keeper',
    SPIKE: 'Ball spiked to stop the clock',
    KNEEL: 'Quarterback kneels',
  };

  const base = playTypeDescriptions[card.playType] || 'Play';

  if (touchdown) {
    return `${base} - TOUCHDOWN! ${yards} yards!`;
  }

  if (bigPlay) {
    return `${base} - BIG PLAY! ${yards} yards!`;
  }

  return `${base} for ${yards} yard${yards !== 1 ? 's' : ''}.`;
}

// =============================================================================
// WEATHER EFFECTS
// =============================================================================

interface WeatherEffect {
  passModifier: number;
  runModifier: number;
  kickModifier: number;
  staminaDrain: number;
}

function getWeatherEffect(weather: WeatherCondition): WeatherEffect {
  const effects: Record<WeatherCondition, WeatherEffect> = {
    CLEAR: { passModifier: 0, runModifier: 0, kickModifier: 0, staminaDrain: 0 },
    RAIN: { passModifier: -10, runModifier: -5, kickModifier: -10, staminaDrain: 5 },
    SNOW: { passModifier: -15, runModifier: 5, kickModifier: -15, staminaDrain: 10 },
    WIND: { passModifier: -10, runModifier: 0, kickModifier: -20, staminaDrain: 0 },
    EXTREME_COLD: { passModifier: -5, runModifier: 0, kickModifier: -5, staminaDrain: 20 },
    EXTREME_HEAT: { passModifier: 0, runModifier: -5, kickModifier: 0, staminaDrain: 30 },
    DOME: { passModifier: 0, runModifier: 0, kickModifier: 0, staminaDrain: 0 },
  };

  return effects[weather];
}

// =============================================================================
// 4TH DOWN RESOLUTION
// =============================================================================

export interface STRatings {
  kickPower: number;
  kickAccuracy: number;
  clutchKicking: number;
  coverageUnit: number;
}

export interface ReturnerRatings {
  speed: number;
  agility: number;
  carrying: number;
}

/**
 * Resolve a field goal attempt
 */
export function resolveFieldGoal(
  distance: number,
  stRatings: STRatings,
  defenseChoice: FourthDownDefenseResponse,
  isCriticalMoment: boolean
): FourthDownResult {
  // Base rate formula: KAC - ((distance - 25) * 1.5)
  let baseRate = stRatings.kickAccuracy - ((distance - 25) * 1.5);

  // Range penalty if beyond comfortable range
  const comfortableRange = 35 + Math.floor((stRatings.kickPower - 50) / 3);
  if (distance > comfortableRange) {
    baseRate -= (distance - comfortableRange) * 2;
  }

  // Clutch modifier
  if (isCriticalMoment) {
    baseRate += (stRatings.clutchKicking - 50) * 0.4;
  }

  // Block chance based on defense choice
  let blockChance = 5; // Base
  if (defenseChoice === 'BLOCK_ATTEMPT') {
    blockChance = 18; // High risk block attempt
  } else if (defenseChoice === 'EXPECT_FAKE') {
    blockChance = 3; // Not rushing, focused on fake
  }

  // Roll for block first
  const blockRoll = rng.next() * 100;
  if (blockRoll < blockChance) {
    const returnYards = rng.nextInt(0, 30);
    const returnTD = returnYards >= 30 && rng.rollPercent(20);

    return {
      type: 'FIELD_GOAL',
      success: false,
      blocked: true,
      returnYards,
      turnover: true,
      touchdown: returnTD,
      newFieldPosition: returnTD ? 0 : 100 - returnYards,
      playByPlay: `BLOCKED! ${returnTD ? 'Returned for a TOUCHDOWN!' : `Returned ${returnYards} yards.`}`,
    };
  }

  // Roll for make/miss
  const successChance = Math.max(5, Math.min(99, baseRate));
  const makeRoll = rng.next() * 100;
  const made = makeRoll < successChance;

  return {
    type: 'FIELD_GOAL',
    success: made,
    blocked: false,
    turnover: !made,
    touchdown: false,
    newFieldPosition: made ? -1 : Math.max(20, 100 - distance - 7), // Touchback or spot of kick
    playByPlay: made
      ? `GOOD! The ${distance}-yard field goal is up and it's GOOD!`
      : `No good. The ${distance}-yard attempt misses ${rng.rollPercent(50) ? 'wide left' : 'wide right'}.`,
  };
}

/**
 * Resolve a punt
 */
export function resolvePunt(
  stRatings: STRatings,
  returnerRatings: ReturnerRatings,
  defenseChoice: FourthDownDefenseResponse,
  currentYardLine: number,
  isCoffinCorner: boolean
): FourthDownResult {
  // Base distance formula: 30 + (KPW / 3)
  let baseDistance = 30 + Math.floor(stRatings.kickPower / 3);

  // Variance based on accuracy
  const variance = 15 - Math.floor(stRatings.kickAccuracy / 10);
  baseDistance = Math.round(rng.withVariance(baseDistance, variance));

  // Coffin corner reduces distance but improves placement
  if (isCoffinCorner) {
    baseDistance = Math.round(baseDistance * 0.7);
  }

  // Block chance
  let blockChance = 3;
  if (defenseChoice === 'BLOCK_PUNT') {
    blockChance = 12;
  }

  // Roll for block
  const blockRoll = rng.next() * 100;
  if (blockRoll < blockChance) {
    const returnYards = rng.nextInt(0, 15);
    const returnTD = currentYardLine - returnYards <= 0;

    return {
      type: 'PUNT',
      success: false,
      blocked: true,
      returnYards,
      turnover: true,
      touchdown: returnTD,
      newFieldPosition: returnTD ? 0 : currentYardLine - returnYards,
      playByPlay: `BLOCKED! ${returnTD ? 'TOUCHDOWN!' : 'The defense recovers!'}`,
    };
  }

  // Calculate landing spot
  let landingSpot = currentYardLine + baseDistance;

  // Check for touchback
  if (landingSpot >= 100) {
    return {
      type: 'PUNT',
      success: true,
      blocked: false,
      turnover: false,
      touchdown: false,
      newFieldPosition: 25, // Touchback
      playByPlay: `Punt into the end zone. Touchback, ball at the 25.`,
    };
  }

  // Coffin corner success
  if (isCoffinCorner && landingSpot >= 90) {
    const coffinSuccess = rng.rollPercent(stRatings.kickAccuracy);
    if (coffinSuccess) {
      const pinYard = 100 - rng.nextInt(1, 5);
      return {
        type: 'PUNT',
        success: true,
        blocked: false,
        returnYards: 0,
        turnover: false,
        touchdown: false,
        newFieldPosition: pinYard,
        playByPlay: `Beautiful coffin corner punt! Downed at the ${100 - pinYard}-yard line.`,
      };
    }
  }

  // Return yards based on defense choice and returner
  let returnYards = 0;
  if (defenseChoice === 'SAFE_FAIR_CATCH') {
    returnYards = 0;
  } else if (defenseChoice === 'AGGRESSIVE_RETURN') {
    const returnAbility = (returnerRatings.speed + returnerRatings.agility) / 2;
    const coverageAbility = stRatings.coverageUnit;

    returnYards = Math.round(
      rng.withVariance(8 + (returnAbility - coverageAbility) / 5, 50)
    );
    returnYards = Math.max(0, returnYards);

    // Big return chance
    if (rng.rollPercent(10 + (returnerRatings.speed - 70) / 3)) {
      returnYards += rng.nextInt(15, 40);
    }

    // Fumble risk on aggressive return
    const fumbleChance = 5 + (50 - returnerRatings.carrying) / 5;
    if (rng.rollPercent(fumbleChance)) {
      return {
        type: 'PUNT',
        success: true,
        blocked: false,
        returnYards: Math.floor(returnYards / 2),
        turnover: true,
        touchdown: false,
        newFieldPosition: landingSpot - Math.floor(returnYards / 2),
        playByPlay: `MUFFED PUNT! The kicking team recovers!`,
      };
    }
  } else {
    // Normal return
    returnYards = rng.nextInt(3, 12);
  }

  const finalPosition = landingSpot - returnYards;
  const returnTD = finalPosition <= 0;

  return {
    type: 'PUNT',
    success: true,
    blocked: false,
    returnYards,
    turnover: false,
    touchdown: returnTD,
    newFieldPosition: returnTD ? 0 : Math.max(1, finalPosition),
    playByPlay: returnTD
      ? `PUNT RETURN TOUCHDOWN! ${returnYards} yards!`
      : `Punt for ${baseDistance} yards${returnYards > 0 ? `, returned ${returnYards} yards` : ''}. Ball at the ${100 - finalPosition}.`,
  };
}

/**
 * Resolve a fake play (fake FG or fake punt)
 */
export function resolveFake(
  fakeType: 'FAKE_FG' | 'FAKE_PUNT',
  playType: 'PASS' | 'RUN',
  defenseChoice: FourthDownDefenseResponse,
  yardsToGo: number,
  _stRatings: STRatings
): FourthDownResult {
  // Base success rate
  let baseSuccess = fakeType === 'FAKE_FG' ? 30 : 25;

  // If defense called block, they're not expecting it
  if (defenseChoice === 'BLOCK_ATTEMPT' || defenseChoice === 'BLOCK_PUNT') {
    baseSuccess += 30;
  }

  // If defense expected fake, big penalty
  if (defenseChoice === 'EXPECT_FAKE') {
    baseSuccess -= 35;
  }

  // Roll for success
  const fakeRoll = rng.next() * 100;
  const success = fakeRoll < baseSuccess;

  if (!success) {
    // Turnover on downs or interception
    const isTurnover = playType === 'PASS' ? rng.rollPercent(30) : false;

    return {
      type: 'FAKE',
      success: false,
      yardsGained: 0,
      blocked: false,
      turnover: true,
      touchdown: false,
      newFieldPosition: -1, // Handled by caller
      playByPlay: defenseChoice === 'EXPECT_FAKE'
        ? 'They sniffed out the fake! Stopped for no gain!'
        : `The fake ${fakeType === 'FAKE_FG' ? 'field goal' : 'punt'} fails!${isTurnover ? ' INTERCEPTION!' : ''}`,
    };
  }

  // Success - calculate yards
  let yardsGained = playType === 'PASS' ? rng.nextInt(8, 20) : rng.nextInt(5, 15);

  // Big play chance (lower than normal plays)
  if (rng.rollPercent(15)) {
    yardsGained += rng.nextInt(10, 25);
  }

  const firstDown = yardsGained >= yardsToGo;

  return {
    type: 'FAKE',
    success: true,
    yardsGained,
    blocked: false,
    turnover: false,
    touchdown: false, // Would need field position to determine
    newFieldPosition: -1, // Handled by caller
    playByPlay: `FAKE! The ${fakeType === 'FAKE_FG' ? 'holder' : 'punter'} ${playType === 'PASS' ? 'throws' : 'runs'} for ${yardsGained} yards! ${firstDown ? 'FIRST DOWN!' : ''}`,
  };
}

/**
 * Resolve a kickoff return
 */
export function resolveKickoffReturn(
  stRatings: STRatings,
  returnerRatings: ReturnerRatings,
  kickType: 'NORMAL' | 'DEEP' | 'ONSIDE' | 'SQUIB'
): FourthDownResult {
  if (kickType === 'DEEP') {
    // Touchback
    const isTouchback = rng.rollPercent(60 + (stRatings.kickPower - 50) / 2);
    if (isTouchback) {
      return {
        type: 'CONVERSION', // Using for kickoff
        success: true,
        blocked: false,
        turnover: false,
        touchdown: false,
        newFieldPosition: 25,
        playByPlay: 'Kickoff through the end zone. Touchback, ball at the 25.',
      };
    }
  }

  if (kickType === 'ONSIDE') {
    // Onside kick success rate
    const onsideSuccess = 10 + (stRatings.kickAccuracy - 50) / 5;
    if (rng.rollPercent(onsideSuccess)) {
      return {
        type: 'CONVERSION',
        success: true,
        blocked: false,
        turnover: false,
        touchdown: false,
        newFieldPosition: 45 + rng.nextInt(-5, 5),
        playByPlay: 'ONSIDE KICK RECOVERED! The kicking team gets the ball!',
      };
    }

    return {
      type: 'CONVERSION',
      success: false,
      blocked: false,
      turnover: false,
      touchdown: false,
      newFieldPosition: 45,
      playByPlay: 'Onside kick recovered by the receiving team.',
    };
  }

  // Normal/Squib kick return
  const returnAbility = (returnerRatings.speed * 0.5 + returnerRatings.agility * 0.3 + returnerRatings.carrying * 0.2);
  const coverageAbility = stRatings.coverageUnit;

  let returnYards = 20 + Math.round((returnAbility - coverageAbility) / 3);
  returnYards = Math.round(rng.withVariance(returnYards, 40));

  if (kickType === 'SQUIB') {
    returnYards = Math.max(5, returnYards - 10); // Less return room
  }

  // Big return chance
  if (rng.rollPercent(8 + (returnerRatings.speed - 75) / 3)) {
    returnYards += rng.nextInt(20, 50);
  }

  // Fumble check
  const fumbleChance = 3 + (50 - returnerRatings.carrying) / 8;
  if (rng.rollPercent(fumbleChance)) {
    return {
      type: 'CONVERSION',
      success: false,
      blocked: false,
      returnYards: Math.floor(returnYards / 2),
      turnover: true,
      touchdown: false,
      newFieldPosition: 25 + Math.floor(returnYards / 2),
      playByPlay: `FUMBLE on the return! Recovered by the kicking team!`,
    };
  }

  const startYard = kickType === 'SQUIB' ? 15 : 0; // Squib lands around 15
  const finalPosition = Math.min(99, startYard + returnYards);
  const touchdown = finalPosition >= 100;

  return {
    type: 'CONVERSION',
    success: true,
    blocked: false,
    returnYards,
    turnover: false,
    touchdown,
    newFieldPosition: touchdown ? 75 : finalPosition, // Scored from 75
    playByPlay: touchdown
      ? `KICK RETURN TOUCHDOWN! ${returnYards} yards!`
      : `Kickoff return of ${returnYards} yards to the ${finalPosition}.`,
  };
}

/**
 * Full 4th down resolution
 */
export function resolveFourthDown(
  offenseChoice: FourthDownCategory | 'FAKE_FG' | 'FAKE_PUNT',
  defenseChoice: FourthDownDefenseResponse,
  context: PlayContext,
  stRatings: STRatings,
  returnerRatings: ReturnerRatings
): FourthDownResult {
  const { fieldPosition, clock } = context;
  const isCritical = clock.quarter === 4 && clock.minutes <= 2;

  switch (offenseChoice) {
    case 'FIELD_GOAL': {
      const distance = fieldPosition.yardsToEndzone + 17; // Add end zone + hold spot
      return resolveFieldGoal(distance, stRatings, defenseChoice, isCritical);
    }

    case 'PUNT': {
      const isCoffin = fieldPosition.yardLine >= 50; // Try coffin corner from own 50+
      return resolvePunt(
        stRatings,
        returnerRatings,
        defenseChoice,
        fieldPosition.yardLine,
        isCoffin
      );
    }

    case 'FAKE_FG':
      return resolveFake(
        'FAKE_FG',
        rng.rollPercent(60) ? 'PASS' : 'RUN',
        defenseChoice,
        fieldPosition.yardsToGo,
        stRatings
      );

    case 'FAKE_PUNT':
      return resolveFake(
        'FAKE_PUNT',
        rng.rollPercent(40) ? 'PASS' : 'RUN',
        defenseChoice,
        fieldPosition.yardsToGo,
        stRatings
      );

    case 'GO_FOR_IT':
      // This would use normal play resolution
      return {
        type: 'CONVERSION',
        success: false,
        blocked: false,
        turnover: false,
        touchdown: false,
        newFieldPosition: fieldPosition.yardLine,
        playByPlay: 'Going for it on 4th down...',
      };

    default:
      throw new Error(`Unknown 4th down choice: ${offenseChoice}`);
  }
}

// =============================================================================
// DIRTY CARD RESOLUTION
// =============================================================================

export interface DirtyPlayResult {
  success: boolean;
  caught: boolean;
  penaltyYards: number;
  ejection: boolean;
  heatGained: number;
  effect: string;
  playByPlay: string;
}

/**
 * Resolve a dirty card play
 */
export function resolveDirtyCard(
  dirtyCard: DirtyCard,
  _context: PlayContext
): DirtyPlayResult {
  const { penaltyChance, ejectionChance, heatGenerated } = dirtyCard;

  // Roll for caught
  const caughtRoll = rng.next() * 100;
  const caught = caughtRoll < penaltyChance;

  // If caught, check for ejection
  const ejection = caught && rng.rollPercent(ejectionChance);

  // Heat is always generated (even if not caught, adds suspicion)
  const heat = caught ? heatGenerated * 1.5 : heatGenerated * 0.5;

  if (caught) {
    return {
      success: false,
      caught: true,
      penaltyYards: dirtyCard.penaltyYards,
      ejection,
      heatGained: Math.round(heat),
      effect: '',
      playByPlay: ejection
        ? `FLAG! ${dirtyCard.name}! PLAYER EJECTED!`
        : `FLAG! ${dirtyCard.name}! ${dirtyCard.penaltyYards} yard penalty!`,
    };
  }

  // Success - apply effect
  return {
    success: true,
    caught: false,
    penaltyYards: 0,
    ejection: false,
    heatGained: Math.round(heat),
    effect: dirtyCard.effect.type,
    playByPlay: `${dirtyCard.flavorText}`,
  };
}

// =============================================================================
// PENALTY RESOLUTION
// =============================================================================

export interface PenaltyCheckResult {
  hasPenalty: boolean;
  penalty: PenaltyResult | null;
  isDeadBall: boolean;       // If true, play never happened
}

/**
 * Check for penalties during a play.
 * Returns null if no penalty, or a PenaltyResult if one occurred.
 *
 * Total penalty rate is ~5% per play by default, adjusted by referee style.
 */
export function checkForPenalty(
  isPassPlay: boolean,
  context: PlayContext,
  playYards: number = 0
): PenaltyCheckResult {
  const refereeStyle = context.refereeStyle || 'NORMAL';
  const refereeConfig = REFEREE_STYLES[refereeStyle];
  const applicablePenalties = getApplicablePenalties(isPassPlay);

  // Calculate total penalty chance
  let totalChance = 0;
  const penaltyChances: { type: PenaltyType; chance: number; cumulative: number }[] = [];

  for (const penaltyType of applicablePenalties) {
    const config = PENALTY_CONFIG[penaltyType];
    let chance = config.baseChance * refereeConfig.penaltyMultiplier;

    // Apply home team bias for HOME_COOKING style
    if (refereeConfig.homeTeamBias !== 0) {
      const isOffensivePenalty = config.team === 'OFFENSE';
      const userIsOnOffense = context.isUserHome !== undefined;

      // If user is home and this is an offensive penalty, reduce chance
      // If user is away and this is a defensive penalty, reduce chance
      if (context.isUserHome && isOffensivePenalty) {
        chance *= (1 - refereeConfig.homeTeamBias);
      } else if (context.isUserHome && !isOffensivePenalty) {
        chance *= (1 + refereeConfig.homeTeamBias);
      } else if (!context.isUserHome && isOffensivePenalty) {
        chance *= (1 + refereeConfig.homeTeamBias);
      } else if (!context.isUserHome && !isOffensivePenalty && userIsOnOffense) {
        chance *= (1 - refereeConfig.homeTeamBias);
      }
    }

    // Apply makeup call logic
    if (refereeConfig.makeupCallChance > 0 && context.lastPenaltyAgainst) {
      if (rng.rollPercent(refereeConfig.makeupCallChance * 100)) {
        // Makeup call: increase chance of penalty against opposite team
        if (context.lastPenaltyAgainst === 'OFFENSE' && config.team === 'DEFENSE') {
          chance *= 2; // Double chance of defensive penalty
        } else if (context.lastPenaltyAgainst === 'DEFENSE' && config.team === 'OFFENSE') {
          chance *= 2; // Double chance of offensive penalty
        }
      }
    }

    // Increase holding chance on long gains (offense tried hard to block)
    if (config.type === 'OFFENSIVE_HOLDING' && playYards > 10) {
      chance *= 1.5;
    }

    // Increase DPI chance on deep passes
    if (config.type === 'DEFENSIVE_PASS_INTERFERENCE' && isPassPlay && playYards > 15) {
      chance *= 1.3;
    }

    totalChance += chance;
    penaltyChances.push({
      type: penaltyType,
      chance,
      cumulative: totalChance,
    });
  }

  // Roll to see if any penalty occurs
  const penaltyRoll = rng.next() * 100;

  if (penaltyRoll >= totalChance) {
    // No penalty
    return { hasPenalty: false, penalty: null, isDeadBall: false };
  }

  // Determine which penalty occurred
  for (const entry of penaltyChances) {
    if (penaltyRoll < entry.cumulative) {
      const config = PENALTY_CONFIG[entry.type];
      const isDeadBall = DEAD_BALL_PENALTIES.includes(entry.type);

      // Calculate actual penalty yards
      let penaltyYards = config.yards;

      // Spot foul for DPI - use yards to the target or max 15
      if (config.isSpotFoul && entry.type === 'DEFENSIVE_PASS_INTERFERENCE') {
        penaltyYards = Math.min(playYards + 10, 40); // Cap at 40 yards
      }

      // Check if penalty would result in safety
      const newYardLine = context.fieldPosition.yardLine - penaltyYards;
      if (newYardLine <= 0 && config.team === 'OFFENSE') {
        // Safety situation - handled by caller
      }

      const penalty: PenaltyResult = {
        type: config.description,
        team: config.team,
        yards: penaltyYards,
        description: generatePenaltyDescription(entry.type, config.team, penaltyYards),
        declined: false, // Can be changed by caller
        offsetting: false,
      };

      return {
        hasPenalty: true,
        penalty,
        isDeadBall,
      };
    }
  }

  return { hasPenalty: false, penalty: null, isDeadBall: false };
}

/**
 * Generate descriptive text for a penalty.
 */
function generatePenaltyDescription(
  type: PenaltyType,
  team: 'OFFENSE' | 'DEFENSE',
  yards: number
): string {
  const config = PENALTY_CONFIG[type];
  let desc = `FLAG! ${config.description}`;

  if (team === 'OFFENSE') {
    desc += `, on the offense. ${yards} yard penalty`;
  } else {
    desc += `, on the defense. ${yards} yard penalty`;
    if (config.automaticFirstDown) {
      desc += ', automatic first down';
    }
  }

  return desc + '.';
}

/**
 * Determine if offense should decline a defensive penalty.
 * Offense declines if the play result was better than the penalty.
 */
export function shouldDeclinePenalty(
  penalty: PenaltyResult,
  playYards: number,
  yardsToGo: number,
  wasTurnover: boolean,
  wasTouchdown: boolean
): boolean {
  // Never decline if turnover (take the penalty)
  if (wasTurnover) return false;

  // Always take a touchdown over penalty
  if (wasTouchdown) return true;

  // Defensive penalty
  if (penalty.team === 'DEFENSE') {
    const config = Object.values(PENALTY_CONFIG).find(c => c.description === penalty.type);

    // If play gained more yards than penalty would give
    if (playYards > penalty.yards) {
      // But if it's automatic first down and we didn't get first down...
      if (config?.automaticFirstDown && playYards < yardsToGo) {
        return false; // Take the penalty for the first down
      }
      return true; // Decline, play result was better
    }

    return false; // Accept penalty
  }

  // Offensive penalty - defense chooses
  // Defense would decline if the play lost yards anyway
  if (playYards < 0) {
    return true; // Decline the penalty, they lost yards
  }

  return false; // Accept penalty
}

/**
 * Apply penalty to field position and down/distance.
 * Returns the new field state after penalty is applied.
 */
export function applyPenalty(
  penalty: PenaltyResult,
  currentYardLine: number,
  currentDown: number,
  currentYardsToGo: number
): {
  newYardLine: number;
  newDown: number;
  newYardsToGo: number;
  isSafety: boolean;
  playByPlay: string;
} {
  const config = Object.values(PENALTY_CONFIG).find(c => c.description === penalty.type);

  let newYardLine = currentYardLine;
  let newDown = currentDown;
  let newYardsToGo = currentYardsToGo;
  let isSafety = false;

  if (penalty.team === 'OFFENSE') {
    // Offensive penalty - move back
    newYardLine = Math.max(1, currentYardLine - penalty.yards);

    // Check for safety
    if (newYardLine <= penalty.yards && currentYardLine <= penalty.yards) {
      // Penalty would put them in their own end zone
      newYardLine = 1;
      // Half the distance to goal in this case
      if (currentYardLine <= penalty.yards) {
        newYardLine = Math.max(1, Math.floor(currentYardLine / 2));
      }
    }

    if (newYardLine <= 0) {
      isSafety = true;
      newYardLine = 1;
    }

    // Add penalty yards to distance
    newYardsToGo = currentYardsToGo + (currentYardLine - newYardLine);

    // Loss of down for certain penalties
    if (config?.lossOfDown) {
      newDown = Math.min(4, currentDown + 1);
    }
    // Otherwise replay the down
  } else {
    // Defensive penalty - move forward
    newYardLine = Math.min(99, currentYardLine + penalty.yards);

    // Automatic first down
    if (config?.automaticFirstDown) {
      newDown = 1;
      newYardsToGo = 10;
      // Cap yards to go at the end zone
      if (newYardLine + 10 > 100) {
        newYardsToGo = 100 - newYardLine;
      }
    } else {
      // Subtract from yards to go
      newYardsToGo = Math.max(1, currentYardsToGo - penalty.yards);
      // Check for first down
      if (newYardsToGo <= 0 || penalty.yards >= currentYardsToGo) {
        newDown = 1;
        newYardsToGo = Math.min(10, 100 - newYardLine);
      }
    }
  }

  // Generate play by play text
  let playByPlay = penalty.description;
  if (isSafety) {
    playByPlay = `${penalty.description} SAFETY!`;
  } else if (newDown === 1 && config?.automaticFirstDown) {
    playByPlay = `${penalty.description} Automatic first down!`;
  }

  return {
    newYardLine,
    newDown,
    newYardsToGo,
    isSafety,
    playByPlay,
  };
}

/**
 * Check for offsetting penalties (both teams penalized).
 * Returns true if penalties offset, false otherwise.
 * Rare occurrence (~0.5% of penalized plays).
 */
export function checkOffsettingPenalties(): boolean {
  return rng.rollPercent(0.5);
}

/**
 * Get a random penalty play-by-play string for flavor.
 */
const PENALTY_FLAVOR_TEXT = [
  'The yellow flag comes flying in...',
  'Wait, there\'s a flag on the play.',
  'Flag down! Let\'s see what we have here...',
  'And here comes the laundry...',
  'The ref is reaching for his flag...',
  'There\'s a marker on the field.',
];

export function getPenaltyFlavorText(): string {
  return PENALTY_FLAVOR_TEXT[Math.floor(rng.next() * PENALTY_FLAVOR_TEXT.length)];
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  COUNTER_MATRIX,
  calculateTendencyPredictability,
  getWeatherEffect,
};
