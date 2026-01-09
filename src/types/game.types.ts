/**
 * ILLEGAL MOTION - Game State Types
 *
 * Live game state for the card-based football game.
 * Tracks score, field position, down/distance, momentum, and tendencies.
 *
 * Key mechanics:
 * - Offense is REACTIVE: sees defense selection, picks card to counter
 * - Defense is PREDICTIVE: guesses what offense will do for bonus
 * - Momentum affects card effectiveness
 * - Tendencies track patterns for prediction bonuses
 */

import type { Card, CardPlayResult, OffensivePlayType } from './card.types';

// =============================================================================
// TARGET/SHADE POSITIONS
// =============================================================================

/**
 * Positions that can be targeted by offense or shaded by defense.
 * WR1, WR2, TE, RB are the primary receiving options.
 * QB is used for QB sneaks/keepers.
 */
export type TargetPosition = 'WR1' | 'WR2' | 'TE' | 'RB' | 'QB';

/**
 * Shade position for defense - who they think offense is targeting.
 * 'NONE' means no shade (no guess).
 */
export type ShadePosition = TargetPosition | 'NONE';

/**
 * Plays that lock to a specific target and cannot be changed.
 */
export const LOCKED_TARGET_PLAYS: Partial<Record<OffensivePlayType, TargetPosition>> = {
  QB_RUN: 'QB',
  KNEEL: 'QB',
  SPIKE: 'QB',
  // Note: TRICK_PLAY with reverse would lock to WR2 but that's handled in card metadata
};

/**
 * Default targets for play types when no explicit selection is made.
 */
export const DEFAULT_PLAY_TARGETS: Partial<Record<OffensivePlayType, TargetPosition>> = {
  INSIDE_RUN: 'RB',
  OUTSIDE_RUN: 'RB',
  POWER_RUN: 'RB',
  DRAW: 'RB',
  QB_RUN: 'QB',
  KNEEL: 'QB',
  SPIKE: 'QB',
  SHORT_PASS: 'WR1',
  MEDIUM_PASS: 'WR1',
  DEEP_PASS: 'WR1',
  SCREEN: 'RB',
  PLAY_ACTION: 'TE',
  TRICK_PLAY: 'WR2',
};

// =============================================================================
// GAME PHASE
// =============================================================================

export type GamePhase =
  | 'PREGAME'               // Coin toss, introductions
  | 'KICKOFF'               // Kicking off
  | 'FOURTH_DOWN_DECISION'  // Offense chooses category (go for it, FG, punt)
  | 'FOURTH_DOWN_DEFENSE'   // Defense responds to 4th down choice
  | 'OFFENSE_SELECT'        // Waiting for offensive card selection
  | 'DEFENSE_SELECT'        // Waiting for defensive card selection
  | 'SPECIAL_TEAMS_SELECT'  // Selecting FG/punt/return card
  | 'REVEAL'                // Cards revealed, showing matchup
  | 'PLAY_RESULT'           // Showing result of play
  | 'TIMEOUT'               // Timeout called
  | 'TWO_MINUTE_WARNING'    // Mandatory TV timeout
  | 'HALFTIME'              // Between halves
  | 'END_QUARTER'           // Quarter ended
  | 'OVERTIME'              // OT rules
  | 'GAME_OVER';            // Final

// =============================================================================
// CLOCK & TIMING
// =============================================================================

export interface GameClock {
  quarter: 1 | 2 | 3 | 4 | 'OT';
  minutes: number;
  seconds: number;
  isRunning: boolean;
}

export interface PlayClock {
  seconds: number;          // 40 or 25 depending on situation
  isRunning: boolean;
  delay: boolean;           // Is offense delaying?
}

// =============================================================================
// FIELD POSITION
// =============================================================================

export type Down = 1 | 2 | 3 | 4;

export interface FieldPosition {
  yardLine: number;         // 1-99, where ball is (from offense's perspective)
  down: Down;
  yardsToGo: number;
  yardsToEndzone: number;   // Distance to score

  // Derived
  inRedZone: boolean;       // Inside 20
  inGoalToGo: boolean;      // Yards to go >= yards to endzone
  backedUp: boolean;        // Inside own 10
}

/** Create field position with derived fields */
export function createFieldPosition(
  yardLine: number,
  down: Down,
  yardsToGo: number
): FieldPosition {
  const yardsToEndzone = 100 - yardLine;
  return {
    yardLine,
    down,
    yardsToGo,
    yardsToEndzone,
    inRedZone: yardsToEndzone <= 20,
    inGoalToGo: yardsToGo >= yardsToEndzone,
    backedUp: yardLine <= 10,
  };
}

// =============================================================================
// SCORE & TEAM STATE
// =============================================================================

export interface TeamGameState {
  teamId: string;
  score: number;
  timeoutsRemaining: number;  // 3 per half
  isOnOffense: boolean;

  // Fatigue (affects card quality as game progresses)
  fatigue: number;            // 0-100, increases through game

  // Cards used this game
  cardsPlayed: Card[];
  dirtyCardsUsed: number;     // Track for heat calculation

  // In-game stats for UI
  stats: GameStats;
}

export interface GameStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  sacks: number;
  penalties: number;
  penaltyYards: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  redZoneScores: number;
  redZoneAttempts: number;
  timeOfPossession: number;   // In seconds
}

// =============================================================================
// MOMENTUM
// =============================================================================

/**
 * Momentum is a key mechanic that swings based on big plays.
 * Affects card effectiveness and can enable special plays.
 */
export interface Momentum {
  value: number;              // -100 to +100 (negative = opponent has momentum)
  streak: number;             // Consecutive positive/negative plays
  isHot: boolean;             // Momentum > 50
  isCold: boolean;            // Momentum < -50
  lastChange: number;         // How much momentum changed last play
}

/** Events that shift momentum */
export type MomentumEvent =
  | 'TOUCHDOWN'               // +25 to scoring team
  | 'TURNOVER'                // +20 to gaining team
  | 'SACK'                    // +10 to defense
  | 'BIG_PLAY'                // +15 for 20+ yard play
  | 'THIRD_DOWN_STOP'         // +10 to defense
  | 'THIRD_DOWN_CONVERSION'   // +10 to offense
  | 'PENALTY_ON_OPPONENT'     // +5
  | 'SCORE_DIFFERENTIAL'      // Momentum drifts toward leading team
  | 'DIRTY_PLAY_CAUGHT'       // -15 if caught cheating
  | 'CLUTCH_PLAY';            // +20 in final 2 minutes

export const MOMENTUM_SHIFTS: Record<MomentumEvent, number> = {
  TOUCHDOWN: 25,
  TURNOVER: 20,
  SACK: 10,
  BIG_PLAY: 15,
  THIRD_DOWN_STOP: 10,
  THIRD_DOWN_CONVERSION: 10,
  PENALTY_ON_OPPONENT: 5,
  SCORE_DIFFERENTIAL: 2,    // Per point difference, gradual
  DIRTY_PLAY_CAUGHT: -15,
  CLUTCH_PLAY: 20,
};

// =============================================================================
// TENDENCIES (Pattern Tracking)
// =============================================================================

/**
 * Tendencies track play-calling patterns.
 * Defense can earn bonuses by correctly predicting offense.
 * If offense becomes predictable, defense gets advantages.
 */
export interface Tendencies {
  // Recent play types (last 10 plays)
  recentPlays: OffensivePlayType[];

  // Aggregated tendencies (0-100, 50 = balanced)
  runPassRatio: number;         // Higher = more pass-heavy
  shortDeepRatio: number;       // Higher = more deep shots
  leftRightRatio: number;       // Higher = more plays to the right

  // Situation-specific tendencies
  thirdDownTendency: 'RUN' | 'PASS' | 'BALANCED';
  redZoneTendency: 'RUN' | 'PASS' | 'BALANCED';
  trailingTendency: 'AGGRESSIVE' | 'CONSERVATIVE' | 'BALANCED';

  // Predictability score (higher = more predictable = defense bonus)
  predictability: number;       // 0-100

  // Last play prediction result
  lastPredictionCorrect: boolean;
  predictionStreak: number;     // Consecutive correct predictions
}

/** Calculate predictability from recent plays */
export function calculatePredictability(recentPlays: OffensivePlayType[]): number {
  if (recentPlays.length < 5) return 0;

  // Count play types
  const typeCounts = new Map<OffensivePlayType, number>();
  recentPlays.forEach(play => {
    typeCounts.set(play, (typeCounts.get(play) || 0) + 1);
  });

  // Find most common play type
  let maxCount = 0;
  typeCounts.forEach(count => {
    if (count > maxCount) maxCount = count;
  });

  // Predictability = percentage of most common play type
  return Math.round((maxCount / recentPlays.length) * 100);
}

// =============================================================================
// PLAY SELECTION STATE
// =============================================================================

/**
 * The current play selection state.
 * Defense selects first (prediction), then offense sees and counters.
 */
export interface PlaySelection {
  phase: 'DEFENSE_SELECTING' | 'OFFENSE_SELECTING' | 'BOTH_SELECTED';

  // Defense selection (hidden from offense until reveal)
  defenseCard: Card | null;
  defensePrediction: OffensivePlayType | null;  // What they think offense will do
  defenseShade: ShadePosition;                  // Who defense thinks offense targets

  // Offense selection (sees defense, picks counter)
  offenseCard: Card | null;
  offenseTarget: TargetPosition | null;         // Who offense is targeting

  // Dirty card (either side can play alongside main card)
  dirtyCard: Card | null;
  dirtyCardSide: 'OFFENSE' | 'DEFENSE' | null;

  // Timer
  selectionTimeRemaining: number;  // Seconds to make selection
  timedOut: boolean;               // Did they run out of time?
}

// =============================================================================
// FOURTH DOWN STATE
// =============================================================================

/**
 * 4th Down Decision Flow:
 * 1. Offense reaches 4th down
 * 2. Offense selects category: GO_FOR_IT, FIELD_GOAL, or PUNT
 * 3. Defense responds with their counter-strategy
 * 4. If offense chose FG/PUNT, they can still FAKE (hidden from defense)
 * 5. Cards are selected and played
 */

/** Offense's initial 4th down category choice */
export type FourthDownCategory =
  | 'GO_FOR_IT'           // Play a regular offensive card
  | 'FIELD_GOAL'          // Attempt FG (can fake)
  | 'PUNT';               // Punt (can fake)

/** Defense's response to the 4th down category */
export type FourthDownDefenseResponse =
  // vs GO_FOR_IT
  | 'AGGRESSIVE_STOP'     // All-out to stop the conversion
  | 'CONSERVATIVE_STOP'   // Prevent big play, contain

  // vs FIELD_GOAL
  | 'BLOCK_ATTEMPT'       // Rush to block the kick
  | 'SAFE_RETURN'         // Set up for return if missed

  // vs PUNT
  | 'BLOCK_PUNT'          // Rush to block
  | 'SAFE_FAIR_CATCH'     // Fair catch, no risk
  | 'AGGRESSIVE_RETURN'   // Set up big return

  // Universal
  | 'EXPECT_FAKE';        // Anticipate a fake (bonus if correct)

/** The complete 4th down state */
export interface FourthDownState {
  // Current phase
  phase: FourthDownPhase;

  // Offense decisions
  offenseCategory: FourthDownCategory | null;
  offenseIsFaking: boolean;           // Hidden from defense until reveal
  fakePlayType?: 'PASS' | 'RUN';      // If faking, what type

  // Defense decisions
  defenseResponse: FourthDownDefenseResponse | null;
  defenseExpectsFake: boolean;        // Did they choose EXPECT_FAKE?

  // Derived info for UI/logic
  fieldGoalDistance: number;          // Yards for FG attempt
  fieldGoalSuccessChance: number;     // Based on distance + ST player
  puntExpectedYards: number;          // Expected punt distance
  conversionChance: number;           // Chance to convert if going for it

  // Fake success modifiers
  fakeSuccessBase: number;            // Base chance fake works (0-100)
  fakeBonus: number;                  // Bonus from tendencies, situation
  fakePenalty: number;                // Penalty if defense expects fake
}

export type FourthDownPhase =
  | 'AWAITING_OFFENSE'      // Waiting for offense category selection
  | 'AWAITING_DEFENSE'      // Waiting for defense response
  | 'OFFENSE_FAKE_CHOICE'   // Offense secretly decides to fake or not
  | 'CARDS_SELECTION'       // Both sides selecting their cards
  | 'RESOLVED';             // Decision made, moving to play execution

/** Calculate FG success chance based on distance and ratings */
export function calculateFGSuccessChance(
  distance: number,
  kickPower: number,
  kickAccuracy: number,
  clutchKicking: number,
  isCriticalMoment: boolean
): number {
  // Base chance decreases with distance
  let baseChance = 100;
  if (distance > 20) baseChance -= (distance - 20) * 2;
  if (distance > 40) baseChance -= (distance - 40) * 3;
  if (distance > 50) baseChance -= (distance - 50) * 5;

  // Modify by ratings (normalized around 50)
  const powerBonus = (kickPower - 50) * 0.3;      // Range affects max distance
  const accuracyBonus = (kickAccuracy - 50) * 0.5; // Accuracy is most important
  const clutchBonus = isCriticalMoment ? (clutchKicking - 50) * 0.3 : 0;

  return Math.max(0, Math.min(100, baseChance + powerBonus + accuracyBonus + clutchBonus));
}

/** Calculate expected punt distance based on ratings */
export function calculatePuntDistance(
  kickPower: number,
  kickAccuracy: number,
  isCoffinCorner: boolean
): { distance: number; hangTime: number } {
  // Base punt is ~45 yards
  const basePunt = 45;
  const powerBonus = (kickPower - 50) * 0.3;
  const distance = Math.round(basePunt + powerBonus);

  // Hang time for coverage
  const hangTime = 50 + (kickPower - 50) * 0.3 + (kickAccuracy - 50) * 0.2;

  // Coffin corner reduces distance but pins opponent
  if (isCoffinCorner) {
    return {
      distance: Math.round(distance * 0.7),
      hangTime: hangTime + 10, // More height
    };
  }

  return { distance, hangTime };
}

/** Get recommended 4th down decision based on situation */
export function getRecommended4thDownDecision(
  yardLine: number,
  yardsToGo: number,
  scoreDifferential: number,  // Positive = winning
  timeRemaining: number,      // Seconds
  fgSuccessChance: number
): FourthDownCategory {
  const yardsToEndzone = 100 - yardLine;

  // In FG range and reasonable chance?
  if (yardsToEndzone <= 45 && fgSuccessChance >= 60) {
    return 'FIELD_GOAL';
  }

  // Short yardage go for it?
  if (yardsToGo <= 2 && yardLine >= 40) {
    return 'GO_FOR_IT';
  }

  // Desperation (losing, little time)?
  if (scoreDifferential < 0 && timeRemaining < 300) {
    if (yardsToEndzone <= 50) return 'FIELD_GOAL';
    if (yardsToGo <= 5) return 'GO_FOR_IT';
  }

  // Default: punt
  return 'PUNT';
}

// =============================================================================
// LIVE GAME STATE
// =============================================================================

export interface LiveGame {
  id: string;
  phase: GamePhase;

  // Teams
  homeTeam: TeamGameState;
  awayTeam: TeamGameState;

  // Current situation
  clock: GameClock;
  playClock: PlayClock;
  fieldPosition: FieldPosition;
  possession: 'HOME' | 'AWAY';

  // Momentum system
  momentum: Momentum;             // Positive = home team momentum

  // Tendencies (tracked per team)
  homeTendencies: Tendencies;
  awayTendencies: Tendencies;

  // Current play
  playSelection: PlaySelection;

  // 4th down decision state (only active on 4th down)
  fourthDownState: FourthDownState | null;

  // Play history
  playHistory: CardPlayResult[];
  currentDrive: DriveState;

  // Flags
  isPaused: boolean;
  isUserHome: boolean;            // Is user playing as home team?

  // Special states
  isClockManagement: boolean;     // Final 2 minutes, different rules
  isGarbageTime: boolean;         // Blowout, reduced importance
  weatherCondition?: WeatherCondition;
}

// =============================================================================
// DRIVE STATE
// =============================================================================

export interface DriveState {
  startingYardLine: number;
  startingTime: { quarter: number; minutes: number; seconds: number };
  plays: CardPlayResult[];
  yardsGained: number;
  result: DriveResult | null;     // Null if drive ongoing
}

export type DriveResult =
  | 'TOUCHDOWN'
  | 'FIELD_GOAL'
  | 'PUNT'
  | 'TURNOVER_DOWNS'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'SAFETY'
  | 'END_OF_HALF'
  | 'END_OF_GAME';

// =============================================================================
// WEATHER (Optional modifier)
// =============================================================================

export type WeatherCondition =
  | 'CLEAR'               // No effect
  | 'RAIN'                // Pass accuracy -10%, fumble +5%
  | 'SNOW'                // Run +10%, deep pass -20%
  | 'WIND'                // Kick accuracy -15%, deep pass -10%
  | 'EXTREME_COLD'        // Stamina drain +20%
  | 'EXTREME_HEAT'        // Stamina drain +30%
  | 'DOME';               // No weather effects

export const WEATHER_EFFECTS: Record<WeatherCondition, WeatherEffect> = {
  CLEAR: { passModifier: 0, runModifier: 0, kickModifier: 0, staminaDrain: 0 },
  RAIN: { passModifier: -10, runModifier: -5, kickModifier: -10, staminaDrain: 5 },
  SNOW: { passModifier: -15, runModifier: 5, kickModifier: -15, staminaDrain: 10 },
  WIND: { passModifier: -10, runModifier: 0, kickModifier: -20, staminaDrain: 0 },
  EXTREME_COLD: { passModifier: -5, runModifier: 0, kickModifier: -5, staminaDrain: 20 },
  EXTREME_HEAT: { passModifier: 0, runModifier: -5, kickModifier: 0, staminaDrain: 30 },
  DOME: { passModifier: 0, runModifier: 0, kickModifier: 0, staminaDrain: 0 },
};

export interface WeatherEffect {
  passModifier: number;
  runModifier: number;
  kickModifier: number;
  staminaDrain: number;         // Extra fatigue per play
}

// =============================================================================
// GAME SETTINGS
// =============================================================================

export interface GameSettings {
  quarterLength: number;        // Minutes (1-15, default 4 for quick games)
  playClockSeconds: number;     // Default 40
  difficultyLevel: DifficultyLevel;
  enableDirtyCards: boolean;    // Can toggle off for "clean" games
  enableWeather: boolean;
  allowReplays: boolean;        // Show replay animations
  cpuAssistance: 'NONE' | 'SUGGESTIONS' | 'AUTO';  // AI help for offense
}

export type DifficultyLevel =
  | 'ROOKIE'              // CPU makes mistakes, forgiving
  | 'VETERAN'             // Balanced
  | 'ALL_PRO'             // CPU reads tendencies well
  | 'LEGENDARY';          // CPU nearly perfect predictions

// =============================================================================
// GAME SUMMARY (Post-game)
// =============================================================================

export interface GameSummary {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;

  finalScore: { home: number; away: number };
  winner: 'HOME' | 'AWAY' | 'TIE';

  stats: {
    home: GameStats;
    away: GameStats;
  };

  // Key moments
  highlights: GameHighlight[];

  // Dirty deeds
  dirtyPlaysAttempted: number;
  dirtyPlaysCaught: number;
  heatGenerated: number;

  // Player of the game
  mvp: { playerId: string; reason: string };

  // Impact on season
  playoffImplications?: string;
  divisionImplications?: string;
}

export interface GameHighlight {
  quarter: number;
  timeRemaining: string;
  description: string;
  playType: 'TOUCHDOWN' | 'TURNOVER' | 'BIG_PLAY' | 'CLUTCH' | 'DIRTY';
  team: 'HOME' | 'AWAY';
  cardPlayed?: string;          // Card name
}

// =============================================================================
// HELPERS
// =============================================================================

/** Get situation description for UI */
export function getSituationDescription(field: FieldPosition): string {
  const { down, yardsToGo, yardLine, inRedZone, backedUp, inGoalToGo } = field;

  const downStr = ['1st', '2nd', '3rd', '4th'][down - 1];
  const toGoStr = inGoalToGo ? 'Goal' : `${yardsToGo}`;

  let positionStr: string;
  if (yardLine === 50) {
    positionStr = 'at the 50';
  } else if (yardLine > 50) {
    positionStr = `at the OPP ${100 - yardLine}`;
  } else {
    positionStr = `at the OWN ${yardLine}`;
  }

  let situationNote = '';
  if (inRedZone) situationNote = ' (Red Zone)';
  else if (backedUp) situationNote = ' (Backed Up)';

  return `${downStr} & ${toGoStr} ${positionStr}${situationNote}`;
}

/** Check if this is a critical situation (affects card bonuses) */
export function isCriticalSituation(field: FieldPosition, clock: GameClock): boolean {
  // Fourth down
  if (field.down === 4) return true;

  // Third and long
  if (field.down === 3 && field.yardsToGo >= 8) return true;

  // Red zone
  if (field.inRedZone) return true;

  // Late game close score (handled elsewhere, but flag it)
  if (clock.quarter === 4 && clock.minutes <= 5) return true;

  return false;
}
