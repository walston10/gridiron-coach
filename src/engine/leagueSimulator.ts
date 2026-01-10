/**
 * League Simulator
 *
 * Simulates AI vs AI games based on team identity and ratings.
 * Generates realistic scores and stats without play-by-play.
 */

import type { GameResult, TeamGameStats, TeamIdentity, OffenseStyle, DefenseStyle } from '../types/league.types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Home field advantage in expected points */
const HOME_FIELD_ADVANTAGE = 3;

/** Base expected points for an average team (overall 70) */
const BASE_EXPECTED_POINTS = 21;

/** Points per overall rating point above/below 70 */
const POINTS_PER_OVERALL = 0.35;

/** Random variance range for scores (± this value) */
const SCORE_VARIANCE = 10;

/** Minimum score a team can get */
const MIN_SCORE = 3;

/** Maximum score a team can get */
const MAX_SCORE = 56;

// =============================================================================
// MATCHUP MODIFIERS
// =============================================================================

/**
 * How offense styles fare against defense styles
 * Positive = offense advantage, Negative = defense advantage
 */
const STYLE_MATCHUPS: Record<OffenseStyle, Record<DefenseStyle, number>> = {
  RUN_HEAVY: {
    AGGRESSIVE: 2,       // Aggressive D can be gashed by runs
    CONSERVATIVE: -1,    // Conservative D stacks the box
    BALANCED: 0,
    BLITZ_HEAVY: 3,      // Blitzing leaves holes for runs
  },
  PASS_HEAVY: {
    AGGRESSIVE: -2,      // Aggressive D gets pressure
    CONSERVATIVE: 2,     // Conservative gives up underneath
    BALANCED: 0,
    BLITZ_HEAVY: -1,     // High risk both ways
  },
  BALANCED: {
    AGGRESSIVE: 0,
    CONSERVATIVE: 0,
    BALANCED: 0,
    BLITZ_HEAVY: 1,
  },
  EXPLOSIVE: {
    AGGRESSIVE: -3,      // Aggressive D disrupts big plays
    CONSERVATIVE: 4,     // Conservative D gives up explosives
    BALANCED: 1,
    BLITZ_HEAVY: 2,      // Blitz can backfire on deep plays
  },
  TRICK_HEAVY: {
    AGGRESSIVE: 1,       // Tricks work vs aggressive
    CONSERVATIVE: -2,    // Conservative D doesn't bite
    BALANCED: 0,
    BLITZ_HEAVY: 3,      // Blitzes are vulnerable to tricks
  },
};

// =============================================================================
// SIMULATION FUNCTIONS
// =============================================================================

/**
 * Simulate a game between two AI teams
 */
export function simulateAIGame(
  homeIdentity: TeamIdentity,
  awayIdentity: TeamIdentity
): GameResult {
  // Calculate base expected points
  let homeExpected = calculateExpectedPoints(homeIdentity.overall, true);
  let awayExpected = calculateExpectedPoints(awayIdentity.overall, false);

  // Apply style matchups
  const homeOffenseVsAwayDefense = getStyleMatchupBonus(
    homeIdentity.offenseStyle,
    awayIdentity.defenseStyle
  );
  const awayOffenseVsHomeDefense = getStyleMatchupBonus(
    awayIdentity.offenseStyle,
    homeIdentity.defenseStyle
  );

  homeExpected += homeOffenseVsAwayDefense;
  awayExpected += awayOffenseVsHomeDefense;

  // Defense quality affects opponent's scoring
  const homeDefenseImpact = (homeIdentity.overall - 70) * 0.2;
  const awayDefenseImpact = (awayIdentity.overall - 70) * 0.2;

  awayExpected -= homeDefenseImpact;
  homeExpected -= awayDefenseImpact;

  // Add variance
  const homeVariance = (Math.random() - 0.5) * 2 * SCORE_VARIANCE;
  const awayVariance = (Math.random() - 0.5) * 2 * SCORE_VARIANCE;

  // Calculate final scores
  let homeScore = Math.round(homeExpected + homeVariance);
  let awayScore = Math.round(awayExpected + awayVariance);

  // Clamp scores
  homeScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, homeScore));
  awayScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, awayScore));

  // Round to realistic football scores (multiples of 3 or 7 preferred)
  homeScore = roundToFootballScore(homeScore);
  awayScore = roundToFootballScore(awayScore);

  // Ensure no ties (OT simulation)
  if (homeScore === awayScore) {
    // Home team wins ~55% of OT games
    if (Math.random() < 0.55) {
      homeScore += 3;  // FG win
    } else {
      awayScore += Math.random() < 0.5 ? 3 : 7;  // FG or TD win
    }
  }

  // Generate stats based on identity and score
  const homeStats = generateGameStats(homeIdentity, homeScore);
  const awayStats = generateGameStats(awayIdentity, awayScore);

  return {
    homeScore,
    awayScore,
    homeStats,
    awayStats,
  };
}

/**
 * Calculate expected points for a team
 */
function calculateExpectedPoints(overall: number, isHome: boolean): number {
  const basePoints = BASE_EXPECTED_POINTS + (overall - 70) * POINTS_PER_OVERALL;
  return isHome ? basePoints + HOME_FIELD_ADVANTAGE : basePoints;
}

/**
 * Get the matchup bonus/penalty based on offensive/defensive styles
 */
function getStyleMatchupBonus(offenseStyle: OffenseStyle, defenseStyle: DefenseStyle): number {
  return STYLE_MATCHUPS[offenseStyle]?.[defenseStyle] ?? 0;
}

/**
 * Round a score to a realistic football score
 * Favors multiples of 7, 3, and common scores
 */
function roundToFootballScore(raw: number): number {
  // Common football scores: 0, 3, 6, 7, 10, 13, 14, 17, 20, 21, 24, 27, 28, 31, 34, 35, 38, 42, 45, 49
  const commonScores = [0, 3, 6, 7, 10, 13, 14, 17, 20, 21, 24, 27, 28, 31, 34, 35, 38, 41, 42, 45, 48, 49, 52, 55, 56];

  // Find the closest common score
  let closest = commonScores[0];
  let minDiff = Math.abs(raw - closest);

  for (const score of commonScores) {
    const diff = Math.abs(raw - score);
    if (diff < minDiff) {
      minDiff = diff;
      closest = score;
    }
  }

  return closest;
}

/**
 * Generate plausible game stats based on team identity and final score
 */
function generateGameStats(identity: TeamIdentity, score: number): TeamGameStats {
  // Base total yards correlates with score
  const baseYards = 200 + score * 8 + Math.floor(Math.random() * 100);

  // Split yards based on offense style
  let passPercent: number;
  switch (identity.offenseStyle) {
    case 'PASS_HEAVY':
      passPercent = 0.65 + Math.random() * 0.1;  // 65-75%
      break;
    case 'RUN_HEAVY':
      passPercent = 0.35 + Math.random() * 0.1;  // 35-45%
      break;
    case 'EXPLOSIVE':
      passPercent = 0.55 + Math.random() * 0.15; // 55-70%
      break;
    case 'TRICK_HEAVY':
      passPercent = 0.50 + Math.random() * 0.15; // 50-65%
      break;
    case 'BALANCED':
    default:
      passPercent = 0.50 + Math.random() * 0.1;  // 50-60%
      break;
  }

  const passYards = Math.round(baseYards * passPercent);
  const rushYards = Math.round(baseYards * (1 - passPercent));

  // Turnovers (inverse correlation with overall and score)
  const turnoverBase = 3 - (identity.overall - 70) * 0.05;
  const turnoverChance = Math.max(0.1, turnoverBase - score * 0.03);
  const turnovers = Math.floor(Math.random() * 3 * turnoverChance);

  // Sacks allowed (inverse correlation with overall)
  const sackBase = 2 + (70 - identity.overall) * 0.05;
  const sacks = Math.max(0, Math.round(sackBase + (Math.random() - 0.5) * 2));

  return {
    passYards: Math.max(50, passYards),
    rushYards: Math.max(20, rushYards),
    turnovers: Math.min(5, turnovers),
    sacks: Math.min(8, sacks),
  };
}

// =============================================================================
// BATCH SIMULATION
// =============================================================================

/**
 * Simulate multiple games at once (for AI vs AI matchups in a week)
 */
export function simulateMultipleGames(
  matchups: Array<{
    homeIdentity: TeamIdentity;
    awayIdentity: TeamIdentity;
  }>
): GameResult[] {
  return matchups.map(({ homeIdentity, awayIdentity }) =>
    simulateAIGame(homeIdentity, awayIdentity)
  );
}

// =============================================================================
// PREDICTION (for display purposes)
// =============================================================================

/**
 * Get a simple win probability for display
 * Based on overall ratings and home field
 */
export function getWinProbability(
  homeOverall: number,
  awayOverall: number
): { home: number; away: number } {
  const diff = homeOverall - awayOverall + 3;  // +3 for home field
  const homeProb = 0.5 + diff * 0.02;  // ~2% per point difference
  const clampedHome = Math.max(0.1, Math.min(0.9, homeProb));

  return {
    home: Math.round(clampedHome * 100),
    away: Math.round((1 - clampedHome) * 100),
  };
}
