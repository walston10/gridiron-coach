/**
 * ILLEGAL MOTION - Card Generation Engine
 *
 * Players generate cards for your deck based on their ratings.
 * Better players = better cards with higher success rates and bigger play potential.
 *
 * Core mechanics:
 * - Each position generates specific card types
 * - Card stats calculated from player ratings using weighted formulas
 * - Card quality tiers based on resulting effectiveness
 */

import type {
  Player,
  PlayerRatings,
  Position,
  Roster,
  OLineUnit,
  DLineUnit,
} from '../types/player.types';

import type {
  Card,
  CardRarity,
  OffensiveCard,
  DefensiveCard,
  SpecialTeamsCard,
  OffensivePlayType,
  DefensivePlayType,
  SpecialTeamsPlayType,
  Formation,
  SituationBonus,
  GameSituation,
} from '../types/card.types';

import type {
  Deck,
  DeckComposition,
  DeckSource,
} from '../types/deck.types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum rating to generate a card type (below this = liability cards) */
const MIN_VIABLE_RATING = 60;

/** Rating thresholds for card quality tiers */
const QUALITY_THRESHOLDS = {
  ELITE: 90,      // Gold border
  STRONG: 80,     // Purple border
  AVERAGE: 65,    // Blue border
  WEAK: 0,        // Gray border
};

/** Rating thresholds for ST special cards */
const ST_THRESHOLDS = {
  ELITE: 90,      // Unlocks premium cards
  STAR: 85,       // Unlocks solid cards
  VIABLE: 80,     // Standard cards
  LIABILITY: 79,  // Adds liability cards
};

// =============================================================================
// HELPER FUNCTIONS - MATH
// =============================================================================

/**
 * Calculate weighted average of ratings
 */
export function weightedAverage(
  ratings: number[],
  weights: number[]
): number {
  if (ratings.length !== weights.length) {
    throw new Error('Ratings and weights must have same length');
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = ratings.reduce((sum, rating, i) => sum + rating * weights[i], 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate success rate from primary rating
 * Formula: Base 50% + (rating - 50) * 0.6
 * Range: ~20% (rating 0) to ~80% (rating 99)
 */
export function calculateSuccessRate(primaryRating: number, modifier: number = 0): number {
  const base = 50 + (primaryRating - 50) * 0.6;
  return Math.max(10, Math.min(95, Math.round(base + modifier)));
}

/**
 * Calculate base yards for a play type
 * Short plays: 3-8 yards, Deep plays: 15-40 yards
 */
export function calculateBaseYards(
  playType: OffensivePlayType,
  speedRating: number,
  secondaryRating: number
): number {
  const baseByType: Record<string, number> = {
    SHORT_PASS: 5,
    MEDIUM_PASS: 12,
    DEEP_PASS: 25,
    SCREEN: 4,
    PLAY_ACTION: 15,
    INSIDE_RUN: 4,
    OUTSIDE_RUN: 5,
    POWER_RUN: 3,
    DRAW: 5,
    TRICK_PLAY: 10,
    QB_RUN: 6,
    SPIKE: 0,
    KNEEL: -1,
  };

  const base = baseByType[playType] || 5;
  const speedBonus = (speedRating - 50) * 0.1;
  const skillBonus = (secondaryRating - 50) * 0.08;

  return Math.max(1, Math.round(base + speedBonus + skillBonus));
}

/**
 * Calculate big play (breakaway) chance
 * Based on speed and elusiveness/route running
 */
export function calculateBigPlayChance(
  speed: number,
  elusiveness: number,
  baseChance: number = 10
): number {
  const speedBonus = (speed - 50) * 0.3;
  const elusiveBonus = (elusiveness - 50) * 0.2;
  return Math.max(0, Math.min(40, Math.round(baseChance + speedBonus + elusiveBonus)));
}

/**
 * Calculate turnover risk
 * Based on discipline, awareness, and play type
 */
export function calculateTurnoverRisk(
  discipline: number,
  awareness: number,
  isHighRisk: boolean = false
): number {
  const base = isHighRisk ? 15 : 5;
  const disciplineMod = (50 - discipline) * 0.15;
  const awarenessMod = (50 - awareness) * 0.1;
  return Math.max(1, Math.min(30, Math.round(base + disciplineMod + awarenessMod)));
}

/**
 * Determine card rarity based on resulting card quality
 */
export function determineRarity(
  successRate: number,
  bigPlayChance: number,
  playerOverall: number
): CardRarity {
  const qualityScore = successRate * 0.5 + bigPlayChance * 0.3 + playerOverall * 0.2;

  if (qualityScore >= 75) return 'LEGENDARY';
  if (qualityScore >= 65) return 'ELITE';
  if (qualityScore >= 55) return 'RARE';
  if (qualityScore >= 45) return 'UNCOMMON';
  return 'COMMON';
}

/**
 * Get card quality tier for UI display
 */
export function getCardQualityTier(
  successRate: number,
  playerOverall: number
): 'ELITE' | 'STRONG' | 'AVERAGE' | 'WEAK' {
  const score = (successRate + playerOverall) / 2;
  if (score >= QUALITY_THRESHOLDS.ELITE) return 'ELITE';
  if (score >= QUALITY_THRESHOLDS.STRONG) return 'STRONG';
  if (score >= QUALITY_THRESHOLDS.AVERAGE) return 'AVERAGE';
  return 'WEAK';
}

/**
 * Generate unique card ID
 */
function generateCardId(playerId: string, cardType: string, index: number): string {
  return `${playerId}-${cardType}-${index}-${Date.now()}`;
}

// =============================================================================
// SITUATION BONUS GENERATORS
// =============================================================================

function createSituationBonus(
  situation: GameSituation,
  modifier: number,
  description: string
): SituationBonus {
  return { situation, modifier, description };
}

function getSpeedBasedBonuses(speed: number): SituationBonus[] {
  const bonuses: SituationBonus[] = [];
  if (speed >= 90) {
    bonuses.push(createSituationBonus('LONG_YARDAGE', 15, 'Burner: +15% on long distance'));
  }
  if (speed >= 85) {
    bonuses.push(createSituationBonus('TWO_MINUTE_WARNING', 10, 'Quick Strike: +10% in hurry-up'));
  }
  return bonuses;
}

function getClutchBonuses(clutch: number): SituationBonus[] {
  const bonuses: SituationBonus[] = [];
  if (clutch >= 85) {
    bonuses.push(createSituationBonus('FOURTH_QUARTER', 15, 'Ice Cold: +15% in 4th quarter'));
    bonuses.push(createSituationBonus('THIRD_DOWN', 10, 'Money: +10% on 3rd down'));
  }
  return bonuses;
}

function getRedZoneBonuses(catching: number, strength: number): SituationBonus[] {
  const bonuses: SituationBonus[] = [];
  if (catching >= 85 && strength >= 80) {
    bonuses.push(createSituationBonus('RED_ZONE', 15, 'TD Machine: +15% in red zone'));
  }
  return bonuses;
}

// =============================================================================
// QB CARD GENERATION
// =============================================================================

function generateQBCards(player: Player): OffensiveCard[] {
  const cards: OffensiveCard[] = [];
  const r = player.ratings;

  // Arm strength tiers determine which passes are available
  const armStrength = r.throwing;
  const accuracy = weightedAverage([r.throwing, r.awareness], [0.6, 0.4]);
  const mobility = weightedAverage([r.speed, r.agility], [0.6, 0.4]);

  // === Short Pass Cards (always available) ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'short-pass', 0),
    name: 'Quick Slant',
    description: 'Fast timing route to the slot',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: accuracy,
    secondaryRating: r.awareness,
    baseYardsOverride: 6,
    situationBonuses: [
      createSituationBonus('THIRD_DOWN', 10, 'Reliable: +10% on 3rd down'),
      ...getClutchBonuses(r.clutch),
    ],
  }));

  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'short-pass', 1),
    name: 'Checkdown',
    description: 'Safety valve to the RB',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: accuracy,
    secondaryRating: r.discipline,
    baseYardsOverride: 4,
    successModifier: 10, // High completion rate
    situationBonuses: [
      createSituationBonus('HIGH_MOMENTUM', -5, 'Conservative: -5% with momentum'),
    ],
  }));

  // === Medium Pass Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'medium-pass', 0),
    name: 'Out Route',
    description: 'Timing throw to the sideline',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: accuracy,
    secondaryRating: armStrength,
    baseYardsOverride: 12,
    situationBonuses: getClutchBonuses(r.clutch),
  }));

  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'medium-pass', 1),
    name: 'Crossing Route',
    description: 'WR runs across the field',
    playType: 'MEDIUM_PASS',
    formation: 'SINGLEBACK',
    player,
    primaryRating: accuracy,
    secondaryRating: r.awareness,
    baseYardsOverride: 14,
    situationBonuses: [
      createSituationBonus('ZONE_COVERAGE' as GameSituation, 10, 'Zone Beater: +10% vs zone'),
    ],
  }));

  // === Deep Pass Cards (require arm strength 70+) ===
  if (armStrength >= 70) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'deep-pass', 0),
      name: 'Go Route',
      description: 'Send the receiver deep',
      playType: 'DEEP_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: armStrength,
      secondaryRating: accuracy,
      baseYardsOverride: 30,
      successModifier: -15, // Harder to complete
      bigPlayModifier: 20,
      situationBonuses: [
        ...getSpeedBasedBonuses(r.speed),
        createSituationBonus('TRAILING', 15, 'Aggressive: +15% when trailing'),
      ],
    }));

    // Elite arm unlocks bomb
    if (armStrength >= 85) {
      cards.push(createOffensiveCard({
        id: generateCardId(player.id, 'deep-pass', 1),
        name: 'The Bomb',
        description: 'Launch it deep downfield',
        playType: 'DEEP_PASS',
        formation: 'SHOTGUN',
        player,
        primaryRating: armStrength,
        secondaryRating: accuracy,
        baseYardsOverride: 45,
        successModifier: -25,
        bigPlayModifier: 35,
        isHighRisk: true,
        situationBonuses: [
          createSituationBonus('TRAILING', 20, 'Hail Mary: +20% when trailing'),
          createSituationBonus('FOURTH_QUARTER', 15, 'Clutch Arm: +15% in 4th'),
        ],
      }));
    }
  }

  // === Play Action Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'play-action', 0),
    name: 'Play Action',
    description: 'Fake the handoff, throw downfield',
    playType: 'PLAY_ACTION',
    formation: 'UNDER_CENTER',
    player,
    primaryRating: accuracy,
    secondaryRating: r.awareness,
    baseYardsOverride: 18,
    situationBonuses: [
      createSituationBonus('SHORT_YARDAGE', 15, 'Sell the Run: +15% in short yardage'),
    ],
  }));

  // === QB Run Cards (require mobility 65+) ===
  if (mobility >= 65) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'qb-run', 0),
      name: 'QB Scramble',
      description: 'Tuck it and run',
      playType: 'QB_RUN',
      formation: 'SHOTGUN',
      player,
      primaryRating: r.speed,
      secondaryRating: r.agility,
      baseYardsOverride: 8,
      situationBonuses: getSpeedBasedBonuses(r.speed),
    }));

    // Dual threat unlocks designed runs
    if (mobility >= 80) {
      cards.push(createOffensiveCard({
        id: generateCardId(player.id, 'qb-run', 1),
        name: 'Designed QB Run',
        description: 'Designed keeper play',
        playType: 'QB_RUN',
        formation: 'PISTOL',
        player,
        primaryRating: r.speed,
        secondaryRating: r.strength,
        baseYardsOverride: 10,
        bigPlayModifier: 15,
        situationBonuses: [
          createSituationBonus('RED_ZONE', 15, 'Goal Line Threat: +15% in red zone'),
          ...getSpeedBasedBonuses(r.speed),
        ],
      }));
    }
  }

  // === Screen Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'screen', 0),
    name: 'RB Screen',
    description: 'Dump it to the back behind blockers',
    playType: 'SCREEN',
    formation: 'SHOTGUN',
    player,
    primaryRating: accuracy,
    secondaryRating: r.awareness,
    baseYardsOverride: 5,
    successModifier: 10,
    situationBonuses: [
      createSituationBonus('OPPONENT_AGGRESSIVE', 25, 'Blitz Beater: +25% vs aggressive D'),
    ],
  }));

  return cards;
}

// =============================================================================
// RB CARD GENERATION
// =============================================================================

function generateRBCards(player: Player): OffensiveCard[] {
  const cards: OffensiveCard[] = [];
  const r = player.ratings;

  const power = weightedAverage([r.strength, r.carrying], [0.5, 0.5]);
  const finesse = weightedAverage([r.speed, r.agility], [0.5, 0.5]);
  const receiving = weightedAverage([r.catching, r.agility], [0.6, 0.4]);

  // === Inside Run Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'inside-run', 0),
    name: 'HB Dive',
    description: 'Straight ahead between the tackles',
    playType: 'INSIDE_RUN',
    formation: 'I_FORM',
    player,
    primaryRating: power,
    secondaryRating: r.carrying,
    baseYardsOverride: 4,
    successModifier: 5,
    situationBonuses: [
      createSituationBonus('SHORT_YARDAGE', 20, 'Reliable: +20% on short yardage'),
      createSituationBonus('RED_ZONE', 10, 'TD Punch: +10% in red zone'),
    ],
  }));

  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'power-run', 0),
    name: 'Power O',
    description: 'Follow the pulling guard',
    playType: 'POWER_RUN',
    formation: 'I_FORM',
    player,
    primaryRating: power,
    secondaryRating: r.strength,
    baseYardsOverride: 4,
    situationBonuses: [
      createSituationBonus('SHORT_YARDAGE', 25, 'Bulldozer: +25% on short yardage'),
      ...getRedZoneBonuses(r.catching, r.strength),
    ],
  }));

  // === Outside Run Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'outside-run', 0),
    name: 'HB Stretch',
    description: 'Zone stretch to the outside',
    playType: 'OUTSIDE_RUN',
    formation: 'SINGLEBACK',
    player,
    primaryRating: finesse,
    secondaryRating: r.agility,
    baseYardsOverride: 5,
    bigPlayModifier: 10,
    situationBonuses: [
      ...getSpeedBasedBonuses(r.speed),
    ],
  }));

  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'outside-run', 1),
    name: 'Toss Sweep',
    description: 'Quick pitch to the outside',
    playType: 'OUTSIDE_RUN',
    formation: 'SHOTGUN',
    player,
    primaryRating: r.speed,
    secondaryRating: r.agility,
    baseYardsOverride: 6,
    bigPlayModifier: 15,
    successModifier: -5,
    situationBonuses: getSpeedBasedBonuses(r.speed),
  }));

  // === Draw Play ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'draw', 0),
    name: 'HB Draw',
    description: 'Delayed handoff after pass fake',
    playType: 'DRAW',
    formation: 'SHOTGUN',
    player,
    primaryRating: finesse,
    secondaryRating: r.awareness,
    baseYardsOverride: 6,
    bigPlayModifier: 10,
    situationBonuses: [
      createSituationBonus('LONG_YARDAGE', 15, 'Surprise: +15% on long yardage'),
      createSituationBonus('OPPONENT_AGGRESSIVE', 20, 'Draw Them In: +20% vs blitz'),
    ],
  }));

  // === Receiving Cards ===
  if (receiving >= 65) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'short-pass', 0),
      name: 'Swing Pass',
      description: 'Quick pass to the flat',
      playType: 'SHORT_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: receiving,
      secondaryRating: r.speed,
      baseYardsOverride: 5,
      successModifier: 5,
      bigPlayModifier: calculateBigPlayChance(r.speed, r.agility, 5),
      situationBonuses: getSpeedBasedBonuses(r.speed),
    }));

    // Good receivers get wheel route
    if (receiving >= 75) {
      cards.push(createOffensiveCard({
        id: generateCardId(player.id, 'medium-pass', 0),
        name: 'Wheel Route',
        description: 'RB releases down the sideline',
        playType: 'MEDIUM_PASS',
        formation: 'SHOTGUN',
        player,
        primaryRating: receiving,
        secondaryRating: r.speed,
        baseYardsOverride: 18,
        bigPlayModifier: 20,
        successModifier: -10,
        situationBonuses: [
          createSituationBonus('OPPONENT_AGGRESSIVE', 15, 'Mismatch: +15% vs blitz'),
        ],
      }));
    }
  }

  // === Goal Line Card (power backs) ===
  if (power >= 80) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'power-run', 1),
      name: 'Goal Line Plunge',
      description: 'Lower the shoulder and punch it in',
      playType: 'POWER_RUN',
      formation: 'GOAL_LINE',
      player,
      primaryRating: power,
      secondaryRating: r.strength,
      baseYardsOverride: 2,
      successModifier: 15,
      situationBonuses: [
        createSituationBonus('RED_ZONE', 25, 'TD Machine: +25% in red zone'),
        createSituationBonus('SHORT_YARDAGE', 20, 'Guaranteed: +20% on short'),
      ],
    }));
  }

  return cards;
}

// =============================================================================
// WR CARD GENERATION
// =============================================================================

function generateWRCards(player: Player): OffensiveCard[] {
  const cards: OffensiveCard[] = [];
  const r = player.ratings;

  const routeRunning = r.catching; // Using catching as proxy for route running
  const separation = weightedAverage([r.speed, r.agility], [0.5, 0.5]);
  const contested = weightedAverage([r.catching, r.strength], [0.7, 0.3]);

  // === Short Route Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'short-pass', 0),
    name: 'Slant Route',
    description: 'Quick inside break',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: routeRunning,
    secondaryRating: r.agility,
    baseYardsOverride: 7,
    successModifier: 5,
    situationBonuses: [
      createSituationBonus('THIRD_DOWN', 10, 'Reliable: +10% on 3rd down'),
    ],
  }));

  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'short-pass', 1),
    name: 'Hitch Route',
    description: 'Stop and turn for the ball',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: routeRunning,
    secondaryRating: contested,
    baseYardsOverride: 6,
    successModifier: 10,
    situationBonuses: [
      createSituationBonus('SHORT_YARDAGE', 15, 'Chain Mover: +15% on short'),
    ],
  }));

  // === Medium Route Cards ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'medium-pass', 0),
    name: 'Out Route',
    description: 'Break to the sideline',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: routeRunning,
    secondaryRating: separation,
    baseYardsOverride: 12,
    situationBonuses: getClutchBonuses(r.clutch),
  }));

  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'medium-pass', 1),
    name: 'Dig Route',
    description: 'Deep in-breaking route',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    player,
    primaryRating: routeRunning,
    secondaryRating: r.speed,
    baseYardsOverride: 15,
    bigPlayModifier: 10,
    situationBonuses: getSpeedBasedBonuses(r.speed),
  }));

  // === Deep Route Cards ===
  if (r.speed >= 80) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'deep-pass', 0),
      name: 'Go Route',
      description: 'Burn the corner deep',
      playType: 'DEEP_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: r.speed,
      secondaryRating: separation,
      baseYardsOverride: 35,
      successModifier: -15,
      bigPlayModifier: 25,
      situationBonuses: [
        createSituationBonus('TRAILING', 15, 'Big Play: +15% when trailing'),
        ...getSpeedBasedBonuses(r.speed),
      ],
    }));

    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'deep-pass', 1),
      name: 'Post Route',
      description: 'Break to the post',
      playType: 'DEEP_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: separation,
      secondaryRating: routeRunning,
      baseYardsOverride: 28,
      successModifier: -10,
      bigPlayModifier: 20,
      situationBonuses: getClutchBonuses(r.clutch),
    }));
  }

  // === Burner Route (elite speed only) ===
  if (r.speed >= 92) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'deep-pass', 2),
      name: 'Fly Route',
      description: 'Take the top off the defense',
      playType: 'DEEP_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: r.speed,
      secondaryRating: r.agility,
      baseYardsOverride: 50,
      successModifier: -25,
      bigPlayModifier: 40,
      isHighRisk: true,
      situationBonuses: [
        createSituationBonus('TRAILING', 20, 'Home Run: +20% when trailing'),
        createSituationBonus('BLOWOUT', -20, 'Covered: -20% in blowout'),
      ],
    }));
  }

  // === Possession Receiver Cards (high catching) ===
  if (contested >= 85) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'medium-pass', 2),
      name: 'Contested Catch',
      description: 'Go up and get it',
      playType: 'MEDIUM_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: contested,
      secondaryRating: r.strength,
      baseYardsOverride: 15,
      successModifier: 5,
      situationBonuses: [
        createSituationBonus('RED_ZONE', 20, 'Jump Ball: +20% in red zone'),
        createSituationBonus('THIRD_DOWN', 15, 'Clutch Hands: +15% on 3rd'),
      ],
    }));
  }

  // === Screen Card ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'screen', 0),
    name: 'WR Screen',
    description: 'Quick pass behind the line',
    playType: 'SCREEN',
    formation: 'SHOTGUN',
    player,
    primaryRating: r.speed,
    secondaryRating: r.agility,
    baseYardsOverride: 5,
    successModifier: 10,
    bigPlayModifier: calculateBigPlayChance(r.speed, r.agility, 10),
    situationBonuses: [
      createSituationBonus('OPPONENT_AGGRESSIVE', 20, 'Blitz Beater: +20% vs blitz'),
    ],
  }));

  return cards;
}

// =============================================================================
// TE CARD GENERATION
// =============================================================================

function generateTECards(player: Player): OffensiveCard[] {
  const cards: OffensiveCard[] = [];
  const r = player.ratings;

  const receiving = weightedAverage([r.catching, r.agility], [0.7, 0.3]);
  const blocking = r.blocking;

  // Determine TE type
  const isReceivingTE = receiving >= blocking;

  // === Seam Route (all TEs) ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'medium-pass', 0),
    name: 'Seam Route',
    description: 'Split the safeties up the seam',
    playType: 'MEDIUM_PASS',
    formation: 'SINGLEBACK',
    player,
    primaryRating: receiving,
    secondaryRating: r.speed,
    baseYardsOverride: 18,
    bigPlayModifier: 15,
    situationBonuses: [
      createSituationBonus('RED_ZONE', 15, 'Seam TD: +15% in red zone'),
    ],
  }));

  // === Flat Route (all TEs) ===
  cards.push(createOffensiveCard({
    id: generateCardId(player.id, 'short-pass', 0),
    name: 'TE Flat',
    description: 'Release to the flat',
    playType: 'SHORT_PASS',
    formation: 'SINGLEBACK',
    player,
    primaryRating: receiving,
    secondaryRating: r.agility,
    baseYardsOverride: 6,
    successModifier: 10,
    situationBonuses: [
      createSituationBonus('THIRD_DOWN', 10, 'Safety Valve: +10% on 3rd'),
    ],
  }));

  // === Receiving TE Cards ===
  if (isReceivingTE && receiving >= 75) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'medium-pass', 1),
      name: 'TE Corner',
      description: 'Run a corner route from the slot',
      playType: 'MEDIUM_PASS',
      formation: 'SHOTGUN',
      player,
      primaryRating: receiving,
      secondaryRating: r.speed,
      baseYardsOverride: 20,
      bigPlayModifier: 15,
      situationBonuses: getClutchBonuses(r.clutch),
    }));

    // Elite receiving TEs get deep option
    if (receiving >= 85) {
      cards.push(createOffensiveCard({
        id: generateCardId(player.id, 'deep-pass', 0),
        name: 'TE Post',
        description: 'Mismatch deep against LB',
        playType: 'DEEP_PASS',
        formation: 'SHOTGUN',
        player,
        primaryRating: receiving,
        secondaryRating: r.speed,
        baseYardsOverride: 25,
        successModifier: -10,
        bigPlayModifier: 20,
        situationBonuses: [
          createSituationBonus('OPPONENT_AGGRESSIVE', 15, 'LB Mismatch: +15% vs blitz'),
        ],
      }));
    }
  }

  // === Blocking TE contributes to run game ===
  // (Passive - affects OL rating for run plays)
  // But we can add a lead blocker specific play
  if (blocking >= 75) {
    cards.push(createOffensiveCard({
      id: generateCardId(player.id, 'power-run', 0),
      name: 'TE Lead',
      description: 'TE leads the way for the RB',
      playType: 'POWER_RUN',
      formation: 'I_FORM',
      player,
      primaryRating: blocking,
      secondaryRating: r.strength,
      baseYardsOverride: 5,
      successModifier: 10,
      situationBonuses: [
        createSituationBonus('SHORT_YARDAGE', 20, 'Road Grader: +20% on short'),
      ],
    }));
  }

  return cards;
}

// =============================================================================
// DEFENSIVE CARD GENERATION - DL
// =============================================================================

function generateDLCards(unit: DLineUnit): DefensiveCard[] {
  const cards: DefensiveCard[] = [];
  const passRush = unit.passRushRating;
  const runStop = unit.runStopRating;

  // === Pass Rush Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(unit.id, 'blitz', 0),
    name: 'Bull Rush',
    description: 'Power move straight into the QB',
    playType: 'BLITZ',
    unit,
    primaryRating: passRush,
    secondaryRating: runStop,
    pressureBonus: 20,
  }));

  cards.push(createDefensiveCard({
    id: generateCardId(unit.id, 'contain', 0),
    name: 'Contain Rush',
    description: 'Keep the QB in the pocket',
    playType: 'CONTAIN',
    unit,
    primaryRating: passRush,
    secondaryRating: runStop,
    pressureBonus: 10,
  }));

  // Elite pass rushers get finesse moves
  if (passRush >= 85) {
    cards.push(createDefensiveCard({
      id: generateCardId(unit.id, 'blitz', 1),
      name: 'Speed Rush',
      description: 'Beat the tackle with speed',
      playType: 'BLITZ',
      unit,
      primaryRating: passRush,
      secondaryRating: passRush,
      pressureBonus: 30,
      situationBonuses: [
        createSituationBonus('LONG_YARDAGE', 15, 'Pin Ears Back: +15% on passing downs'),
      ],
    }));
  }

  // === Run Defense Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(unit.id, 'stack-box', 0),
    name: 'Stuff the Run',
    description: 'Clog the running lanes',
    playType: 'STACK_THE_BOX',
    unit,
    primaryRating: runStop,
    secondaryRating: passRush,
  }));

  // Elite run stoppers get goal line card
  if (runStop >= 85) {
    cards.push(createDefensiveCard({
      id: generateCardId(unit.id, 'goal-line', 0),
      name: 'Goal Line Stand',
      description: 'Maximum run defense',
      playType: 'GOAL_LINE_STAND',
      unit,
      primaryRating: runStop,
      secondaryRating: runStop,
      situationBonuses: [
        createSituationBonus('RED_ZONE', 25, 'Brick Wall: +25% in red zone'),
        createSituationBonus('SHORT_YARDAGE', 20, 'Immovable: +20% on short'),
      ],
    }));
  }

  return cards;
}

// =============================================================================
// DEFENSIVE CARD GENERATION - LB
// =============================================================================

function generateLBCards(player: Player): DefensiveCard[] {
  const cards: DefensiveCard[] = [];
  const r = player.ratings;

  const coverageAbility = weightedAverage([r.coverage, r.speed], [0.6, 0.4]);
  const blitzAbility = weightedAverage([r.passRush, r.speed], [0.5, 0.5]);
  const runDefense = weightedAverage([r.tackling, r.strength], [0.6, 0.4]);

  // === Zone Coverage Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'zone', 0),
    name: 'Zone Drop',
    description: 'Read the QB and cover your zone',
    playType: 'ZONE_COVERAGE',
    player,
    primaryRating: coverageAbility,
    secondaryRating: r.awareness,
  }));

  // Coverage LBs get better zone cards
  if (coverageAbility >= 75) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'zone', 1),
      name: 'Hook Zone',
      description: 'Patrol the middle of the field',
      playType: 'ZONE_COVERAGE',
      player,
      primaryRating: coverageAbility,
      secondaryRating: r.awareness,
      situationBonuses: [
        createSituationBonus('THIRD_DOWN', 10, 'Middle Guard: +10% on 3rd'),
      ],
    }));
  }

  // === Blitz Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'blitz', 0),
    name: 'LB Blitz',
    description: 'Attack the A-gap',
    playType: 'BLITZ',
    player,
    primaryRating: blitzAbility,
    secondaryRating: r.passRush,
    pressureBonus: 15,
    situationBonuses: [
      createSituationBonus('LONG_YARDAGE', 10, 'Green Dog: +10% on passing downs'),
    ],
  }));

  // Elite blitzers get zone blitz
  if (blitzAbility >= 80) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'zone-blitz', 0),
      name: 'Zone Blitz',
      description: 'Blitz with zone coverage behind',
      playType: 'ZONE_BLITZ',
      player,
      primaryRating: blitzAbility,
      secondaryRating: coverageAbility,
      pressureBonus: 20,
    }));
  }

  // === Spy Card (athletic LBs) ===
  if (r.speed >= 80 && r.awareness >= 75) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'spy', 0),
      name: 'QB Spy',
      description: 'Shadow the quarterback',
      playType: 'SPY',
      player,
      primaryRating: r.speed,
      secondaryRating: r.awareness,
      situationBonuses: [
        createSituationBonus('OPPONENT_AGGRESSIVE', 20, 'Spy Game: +20% vs mobile QB'),
      ],
    }));
  }

  // === Run Defense ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'stack-box', 0),
    name: 'Fill the Gap',
    description: 'Attack downhill against the run',
    playType: 'STACK_THE_BOX',
    player,
    primaryRating: runDefense,
    secondaryRating: r.tackling,
  }));

  return cards;
}

// =============================================================================
// DEFENSIVE CARD GENERATION - CB
// =============================================================================

function generateCBCards(player: Player): DefensiveCard[] {
  const cards: DefensiveCard[] = [];
  const r = player.ratings;

  const manCoverage = weightedAverage([r.coverage, r.speed, r.agility], [0.4, 0.3, 0.3]);
  const zoneCoverage = weightedAverage([r.coverage, r.awareness], [0.6, 0.4]);
  const pressCoverage = weightedAverage([r.strength, r.agility, r.coverage], [0.3, 0.3, 0.4]);

  // === Man Coverage Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'man', 0),
    name: 'Man Coverage',
    description: 'Lock down your receiver',
    playType: 'MAN_COVERAGE',
    player,
    primaryRating: manCoverage,
    secondaryRating: r.speed,
    situationBonuses: [
      createSituationBonus('RED_ZONE', 10, 'Tight Coverage: +10% in red zone'),
    ],
  }));

  // Elite man corners get lockdown card
  if (manCoverage >= 88) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'man', 1),
      name: 'Island Coverage',
      description: 'Shadow their best receiver',
      playType: 'MAN_COVERAGE',
      player,
      primaryRating: manCoverage,
      secondaryRating: r.speed,
      situationBonuses: [
        createSituationBonus('FOURTH_QUARTER', 15, 'Lockdown: +15% in 4th'),
        createSituationBonus('TRAILING', 10, 'Big Stage: +10% in crunch time'),
      ],
    }));
  }

  // === Zone Coverage Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'zone', 0),
    name: 'Zone Coverage',
    description: 'Read and react in your zone',
    playType: 'ZONE_COVERAGE',
    player,
    primaryRating: zoneCoverage,
    secondaryRating: r.awareness,
  }));

  // === Press Coverage Cards ===
  if (pressCoverage >= 75) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'press', 0),
      name: 'Press Coverage',
      description: 'Jam at the line of scrimmage',
      playType: 'PRESS_COVERAGE',
      player,
      primaryRating: pressCoverage,
      secondaryRating: r.strength,
      situationBonuses: [
        createSituationBonus('SHORT_YARDAGE', 15, 'Physical: +15% on short'),
      ],
    }));
  }

  // === Blitz Card (aggressive corners) ===
  if (r.tackling >= 70) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'blitz', 0),
      name: 'Corner Blitz',
      description: 'Blitz off the edge',
      playType: 'BLITZ',
      player,
      primaryRating: r.speed,
      secondaryRating: r.tackling,
      pressureBonus: 25,
      isHighRisk: true,
      situationBonuses: [
        createSituationBonus('LONG_YARDAGE', 15, 'Sneak Attack: +15% on passing downs'),
      ],
    }));
  }

  return cards;
}

// =============================================================================
// DEFENSIVE CARD GENERATION - SAFETY
// =============================================================================

function generateSCards(player: Player): DefensiveCard[] {
  const cards: DefensiveCard[] = [];
  const r = player.ratings;

  const rangeCoverage = weightedAverage([r.speed, r.coverage, r.awareness], [0.3, 0.4, 0.3]);
  const runSupport = weightedAverage([r.tackling, r.strength], [0.6, 0.4]);
  const ballHawk = weightedAverage([r.coverage, r.awareness, r.agility], [0.4, 0.4, 0.2]);

  // === Deep Zone Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'deep-zone', 0),
    name: 'Cover 1 Deep',
    description: 'Patrol the deep middle',
    playType: 'DEEP_ZONE',
    player,
    primaryRating: rangeCoverage,
    secondaryRating: r.speed,
    situationBonuses: [
      createSituationBonus('LONG_YARDAGE', 10, 'Last Line: +10% on long'),
    ],
  }));

  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'deep-zone', 1),
    name: 'Cover 2 Half',
    description: 'Cover deep half of the field',
    playType: 'DEEP_ZONE',
    player,
    primaryRating: rangeCoverage,
    secondaryRating: r.awareness,
  }));

  // Ball hawk safeties get prevent card
  if (ballHawk >= 85) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'prevent', 0),
      name: 'Prevent Defense',
      description: 'Give up yards, not TDs',
      playType: 'PREVENT',
      player,
      primaryRating: ballHawk,
      secondaryRating: r.speed,
      situationBonuses: [
        createSituationBonus('LEADING', 20, 'Protect Lead: +20% when ahead'),
        createSituationBonus('TWO_MINUTE_WARNING', 15, 'Clock Killer: +15% in 2-min'),
      ],
    }));
  }

  // === Run Support Cards ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'stack-box', 0),
    name: 'Safety Run Support',
    description: 'Come down and fill the box',
    playType: 'STACK_THE_BOX',
    player,
    primaryRating: runSupport,
    secondaryRating: r.tackling,
  }));

  // Hard hitters get enforcer card
  if (runSupport >= 85) {
    cards.push(createDefensiveCard({
      id: generateCardId(player.id, 'stack-box', 1),
      name: 'Enforcer',
      description: 'Punish ball carriers',
      playType: 'STACK_THE_BOX',
      player,
      primaryRating: runSupport,
      secondaryRating: r.strength,
      situationBonuses: [
        createSituationBonus('SHORT_YARDAGE', 20, 'Big Hit: +20% on short'),
        createSituationBonus('RED_ZONE', 15, 'Goal Line D: +15% in red zone'),
      ],
    }));
  }

  // === Blitz Card ===
  cards.push(createDefensiveCard({
    id: generateCardId(player.id, 'blitz', 0),
    name: 'Safety Blitz',
    description: 'Sneak in from the secondary',
    playType: 'BLITZ',
    player,
    primaryRating: r.speed,
    secondaryRating: r.tackling,
    pressureBonus: 20,
    isHighRisk: true,
  }));

  return cards;
}

// =============================================================================
// SPECIAL TEAMS CARD GENERATION
// =============================================================================

function generateSTCards(player: Player): SpecialTeamsCard[] {
  const cards: SpecialTeamsCard[] = [];
  const r = player.ratings;

  const overall = weightedAverage(
    [r.kickPower, r.kickAccuracy, r.clutchKicking],
    [0.35, 0.35, 0.3]
  );

  // === Standard Field Goal Cards ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'fg', 0),
    name: 'Field Goal',
    description: 'Standard field goal attempt',
    playType: 'FIELD_GOAL',
    player,
    primaryRating: r.kickAccuracy,
    secondaryRating: r.kickPower,
    distance: 35 + Math.floor((r.kickPower - 50) * 0.3),
  }));

  cards.push(createSTCard({
    id: generateCardId(player.id, 'xp', 0),
    name: 'Extra Point',
    description: 'PAT attempt',
    playType: 'EXTRA_POINT',
    player,
    primaryRating: r.kickAccuracy,
    secondaryRating: r.clutchKicking,
  }));

  // === Punt Cards ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'punt', 0),
    name: 'Standard Punt',
    description: 'Flip the field',
    playType: 'PUNT',
    player,
    primaryRating: r.kickPower,
    secondaryRating: r.kickAccuracy,
  }));

  // === Kickoff Cards ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'kickoff', 0),
    name: 'Kickoff',
    description: 'Standard kickoff',
    playType: 'KICKOFF',
    player,
    primaryRating: r.kickPower,
    secondaryRating: r.coverageUnit,
  }));

  cards.push(createSTCard({
    id: generateCardId(player.id, 'kickoff-deep', 0),
    name: 'Touchback Kick',
    description: 'Boom it through the endzone',
    playType: 'KICKOFF_DEEP',
    player,
    primaryRating: r.kickPower,
    secondaryRating: r.kickPower,
  }));

  // === STAR Tier Cards (85-89 overall) ===
  if (overall >= ST_THRESHOLDS.STAR) {
    cards.push(createSTCard({
      id: generateCardId(player.id, 'punt-directional', 0),
      name: 'Directional Punt',
      description: 'Pin them inside the 10',
      playType: 'PUNT_COFFIN_CORNER',
      player,
      primaryRating: r.kickAccuracy,
      secondaryRating: r.kickPower,
      situationBonuses: [
        createSituationBonus('LEADING', 15, 'Field Position: +15% when ahead'),
      ],
    }));

    cards.push(createSTCard({
      id: generateCardId(player.id, 'fg-long', 0),
      name: 'Long Field Goal',
      description: 'Push the range',
      playType: 'FIELD_GOAL',
      player,
      primaryRating: r.kickPower,
      secondaryRating: r.kickAccuracy,
      distance: 50 + Math.floor((r.kickPower - 80) * 0.5),
    }));
  }

  // === ELITE Tier Cards (90+ overall) ===
  if (overall >= ST_THRESHOLDS.ELITE) {
    cards.push(createSTCard({
      id: generateCardId(player.id, 'fg-ice', 0),
      name: 'Ice in Veins',
      description: 'Clutch kick when it matters most',
      playType: 'FIELD_GOAL',
      player,
      primaryRating: r.clutchKicking,
      secondaryRating: r.kickAccuracy,
      distance: 55,
      situationBonuses: [
        createSituationBonus('FOURTH_QUARTER', 25, 'Clutch: +25% in 4th quarter'),
        createSituationBonus('TRAILING', 20, 'Money: +20% when trailing'),
        createSituationBonus('CLOSE_GAME', 15, 'Big Moment: +15% in close games'),
      ],
    }));

    cards.push(createSTCard({
      id: generateCardId(player.id, 'punt-coffin', 0),
      name: 'Coffin Corner',
      description: 'Pin them inside the 5',
      playType: 'PUNT_COFFIN_CORNER',
      player,
      primaryRating: r.kickAccuracy,
      secondaryRating: r.kickPower,
      situationBonuses: [
        createSituationBonus('MIDFIELD', 20, 'Precision: +20% from midfield'),
      ],
    }));

    cards.push(createSTCard({
      id: generateCardId(player.id, 'punt-boom', 0),
      name: 'Booming Punt',
      description: 'Launch it 60+ yards',
      playType: 'PUNT_BOOMING',
      player,
      primaryRating: r.kickPower,
      secondaryRating: r.coverageUnit,
      situationBonuses: [
        createSituationBonus('BACKED_UP', 20, 'Escape: +20% when backed up'),
      ],
    }));
  }

  // === LIABILITY Cards (below 80 overall) ===
  if (overall < ST_THRESHOLDS.VIABLE) {
    // Add negative modifier cards that can hurt you
    cards.push(createSTCard({
      id: generateCardId(player.id, 'fg-shank', 0),
      name: 'Shaky Leg',
      description: 'Not confident from distance',
      playType: 'FIELD_GOAL',
      player,
      primaryRating: Math.max(40, r.kickAccuracy - 15),
      secondaryRating: r.clutchKicking,
      distance: 30,
      isLiabilityCard: true,
      situationBonuses: [
        createSituationBonus('FOURTH_QUARTER', -20, 'Nerves: -20% in 4th quarter'),
        createSituationBonus('CLOSE_GAME', -15, 'Yips: -15% in close games'),
      ],
    }));

    cards.push(createSTCard({
      id: generateCardId(player.id, 'punt-shank', 0),
      name: 'Shank Risk',
      description: 'Inconsistent punting',
      playType: 'PUNT',
      player,
      primaryRating: Math.max(40, r.kickPower - 15),
      secondaryRating: r.kickAccuracy,
      isLiabilityCard: true,
      situationBonuses: [
        createSituationBonus('BACKED_UP', -20, 'Shank Zone: -20% when backed up'),
      ],
    }));
  }

  // === Fake Cards (available to all, success based on overall) ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'fake-fg', 0),
    name: 'Fake FG Pass',
    description: 'Holder throws to open receiver',
    playType: 'FAKE_FG_PASS',
    player,
    primaryRating: 50, // Fixed - it's about deception
    secondaryRating: overall,
    isFake: true,
  }));

  cards.push(createSTCard({
    id: generateCardId(player.id, 'fake-punt', 0),
    name: 'Fake Punt Run',
    description: 'Punter keeps it and runs',
    playType: 'FAKE_PUNT_RUN',
    player,
    primaryRating: 50,
    secondaryRating: overall,
    isFake: true,
  }));

  // === Onside Kick ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'onside', 0),
    name: 'Onside Kick',
    description: 'Try to recover the kick',
    playType: 'KICKOFF_ONSIDE',
    player,
    primaryRating: r.kickAccuracy,
    secondaryRating: r.coverageUnit,
    situationBonuses: [
      createSituationBonus('TRAILING', 10, 'Desperation: +10% when trailing'),
      createSituationBonus('FOURTH_QUARTER', 5, 'Last Chance: +5% in 4th'),
    ],
  }));

  return cards;
}

// =============================================================================
// RETURN CARD GENERATION (from returner)
// =============================================================================

function generateReturnCards(player: Player): SpecialTeamsCard[] {
  const cards: SpecialTeamsCard[] = [];
  const r = player.ratings;

  const returnAbility = weightedAverage([r.speed, r.agility, r.carrying], [0.4, 0.3, 0.3]);

  // === Kick Return ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'kick-return', 0),
    name: 'Kick Return',
    description: 'Return the kickoff',
    playType: 'KICK_RETURN',
    player,
    primaryRating: returnAbility,
    secondaryRating: r.speed,
    isReturn: true,
    situationBonuses: getSpeedBasedBonuses(r.speed),
  }));

  // === Punt Return ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'punt-return', 0),
    name: 'Punt Return',
    description: 'Field the punt and return',
    playType: 'PUNT_RETURN',
    player,
    primaryRating: returnAbility,
    secondaryRating: r.agility,
    isReturn: true,
  }));

  // === Fair Catch ===
  cards.push(createSTCard({
    id: generateCardId(player.id, 'fair-catch', 0),
    name: 'Fair Catch',
    description: 'Signal fair catch - no return',
    playType: 'FAIR_CATCH',
    player,
    primaryRating: 99, // Always succeeds
    secondaryRating: 99,
    isReturn: true,
  }));

  // Elite returners get big play return cards
  if (returnAbility >= 88) {
    cards.push(createSTCard({
      id: generateCardId(player.id, 'kick-return-td', 0),
      name: 'House Call',
      description: 'Take it to the house',
      playType: 'KICK_RETURN',
      player,
      primaryRating: r.speed,
      secondaryRating: r.agility,
      isReturn: true,
      isBigPlayReturn: true,
      situationBonuses: [
        createSituationBonus('TRAILING', 20, 'Spark: +20% when trailing'),
        ...getSpeedBasedBonuses(r.speed),
      ],
    }));
  }

  return cards;
}

// =============================================================================
// CARD CREATION HELPERS
// =============================================================================

interface OffensiveCardParams {
  id: string;
  name: string;
  description: string;
  playType: OffensivePlayType;
  formation: Formation;
  player: Player;
  primaryRating: number;
  secondaryRating: number;
  baseYardsOverride?: number;
  successModifier?: number;
  bigPlayModifier?: number;
  isHighRisk?: boolean;
  situationBonuses?: SituationBonus[];
}

function createOffensiveCard(params: OffensiveCardParams): OffensiveCard {
  const {
    id,
    name,
    description,
    playType,
    formation,
    player,
    primaryRating,
    secondaryRating,
    baseYardsOverride,
    successModifier = 0,
    bigPlayModifier = 0,
    isHighRisk = false,
    situationBonuses = [],
  } = params;

  const successChance = calculateSuccessRate(primaryRating, successModifier);
  const baseYards = baseYardsOverride ?? calculateBaseYards(playType, player.ratings.speed, secondaryRating);
  const bigPlayChance = calculateBigPlayChance(player.ratings.speed, secondaryRating, 10) + bigPlayModifier;
  const turnoverRisk = calculateTurnoverRisk(player.ratings.discipline, player.ratings.awareness, isHighRisk);
  const rarity = determineRarity(successChance, bigPlayChance, player.overall);

  return {
    id,
    category: 'OFFENSIVE',
    name,
    description,
    playType,
    formation,
    rarity,
    baseYards,
    successChance,
    bigPlayChance: Math.max(0, Math.min(50, bigPlayChance)),
    turnoverRisk,
    situationBonuses,
    staminaCost: playType === 'DEEP_PASS' ? 3 : playType === 'POWER_RUN' ? 2 : 1,
    requiresLead: false,
    requiresDeficit: playType === 'DEEP_PASS' && name.includes('Bomb'),
    strongAgainst: getStrongAgainst(playType),
    weakAgainst: getWeakAgainst(playType),
    generatedBy: player.id,
    playerBonus: player.overall >= 90 ? `${player.lastName}: Elite execution` : undefined,
  };
}

interface DefensiveCardParams {
  id: string;
  name: string;
  description: string;
  playType: DefensivePlayType;
  player?: Player;
  unit?: DLineUnit;
  primaryRating: number;
  secondaryRating: number;
  pressureBonus?: number;
  isHighRisk?: boolean;
  situationBonuses?: SituationBonus[];
}

function createDefensiveCard(params: DefensiveCardParams): DefensiveCard {
  const {
    id,
    name,
    description,
    playType,
    player,
    unit,
    primaryRating,
    secondaryRating,
    pressureBonus = 0,
    isHighRisk = false,
    situationBonuses = [],
  } = params;

  const baseEffectiveness = calculateSuccessRate(primaryRating);
  const runStopRating = playType === 'STACK_THE_BOX' || playType === 'GOAL_LINE_STAND'
    ? baseEffectiveness + 10
    : baseEffectiveness - 10;
  const passDefenseRating = playType === 'MAN_COVERAGE' || playType === 'ZONE_COVERAGE' || playType === 'DEEP_ZONE'
    ? baseEffectiveness + 10
    : baseEffectiveness - 10;
  const pressureRating = playType === 'BLITZ' || playType === 'ZONE_BLITZ'
    ? baseEffectiveness + pressureBonus
    : 20;

  const bigPlayAllowed = isHighRisk ? 25 : playType === 'PREVENT' ? 5 : 15;

  const overall = player?.overall ?? unit?.overall ?? 70;
  const rarity = determineRarity(baseEffectiveness, 100 - bigPlayAllowed, overall);

  return {
    id,
    category: 'DEFENSIVE',
    name,
    description,
    playType,
    rarity,
    runStopRating: Math.max(10, Math.min(99, runStopRating)),
    passDefenseRating: Math.max(10, Math.min(99, passDefenseRating)),
    pressureRating: Math.max(0, Math.min(99, pressureRating)),
    bigPlayAllowed: Math.max(5, Math.min(40, bigPlayAllowed)),
    situationBonuses,
    predictionBonus: playType === 'GUESS_PLAY' ? 30 : 15,
    strongAgainst: getDefenseStrongAgainst(playType),
    weakAgainst: getDefenseWeakAgainst(playType),
    generatedBy: player?.id ?? unit?.id ?? 'unknown',
    playerBonus: overall >= 90 ? `Elite defender` : undefined,
  };
}

interface STCardParams {
  id: string;
  name: string;
  description: string;
  playType: SpecialTeamsPlayType;
  player: Player;
  primaryRating: number;
  secondaryRating: number;
  distance?: number;
  isFake?: boolean;
  isReturn?: boolean;
  isBigPlayReturn?: boolean;
  isLiabilityCard?: boolean;
  situationBonuses?: SituationBonus[];
}

function createSTCard(params: STCardParams): SpecialTeamsCard {
  const {
    id,
    name,
    description,
    playType,
    player,
    primaryRating,
    secondaryRating,
    distance,
    isFake = false,
    isReturn = false,
    isBigPlayReturn = false,
    isLiabilityCard = false,
    situationBonuses = [],
  } = params;

  const r = player.ratings;
  const successChance = calculateSuccessRate(primaryRating, isFake ? -20 : 0);

  // Determine rarity
  let rarity: CardRarity = 'COMMON';
  if (name.includes('Ice in Veins') || name.includes('Coffin Corner') || name.includes('House Call')) {
    rarity = 'LEGENDARY';
  } else if (name.includes('Booming') || name.includes('Long Field Goal')) {
    rarity = 'ELITE';
  } else if (name.includes('Directional')) {
    rarity = 'RARE';
  } else if (isLiabilityCard) {
    rarity = 'COMMON';
  } else if (successChance >= 80) {
    rarity = 'UNCOMMON';
  }

  return {
    id,
    category: 'SPECIAL_TEAMS',
    name,
    description,
    playType,
    rarity,
    successChance,
    distance: distance ?? (playType.includes('PUNT') ? 45 + (r.kickPower - 50) * 0.3 : undefined),
    hangTime: playType.includes('PUNT') ? 50 + (r.kickPower - 50) * 0.2 : undefined,
    returnYards: isReturn ? 20 + (r.speed - 50) * 0.3 : undefined,
    blockChance: playType === 'FIELD_GOAL' ? 5 : playType.includes('PUNT') ? 3 : 0,
    fumbleChance: isReturn ? 5 + (50 - r.carrying) * 0.1 : 0,
    bigReturnChance: isBigPlayReturn ? 25 : isReturn ? 10 + (r.speed - 70) * 0.5 : 0,
    fakeSuccessChance: isFake ? successChance - 20 : undefined,
    fakeYardsGained: isFake ? 10 : undefined,
    fakeTurnoverRisk: isFake ? 25 : undefined,
    situationBonuses,
    affectedByKPW: playType.includes('KICK') || playType.includes('PUNT') || playType === 'FIELD_GOAL',
    affectedByKAC: playType === 'FIELD_GOAL' || playType.includes('COFFIN'),
    affectedByCLT: playType === 'FIELD_GOAL',
    affectedByCOV: playType.includes('KICK') && !isReturn,
    affectedByReturnerSpeed: isReturn,
    affectedByReturnerCarrying: isReturn,
    generatedBy: player.id,
    playerBonus: player.overall >= 90 ? `${player.lastName}: Elite specialist` : undefined,
  };
}

// =============================================================================
// MATCHUP HELPERS
// =============================================================================

function getStrongAgainst(playType: OffensivePlayType): DefensivePlayType[] {
  const matchups: Partial<Record<OffensivePlayType, DefensivePlayType[]>> = {
    SHORT_PASS: ['BLITZ', 'DEEP_ZONE'],
    MEDIUM_PASS: ['STACK_THE_BOX', 'GOAL_LINE_STAND'],
    DEEP_PASS: ['ZONE_COVERAGE', 'STACK_THE_BOX'],
    SCREEN: ['BLITZ', 'MAN_COVERAGE'],
    PLAY_ACTION: ['STACK_THE_BOX', 'ZONE_COVERAGE'],
    INSIDE_RUN: ['DEEP_ZONE', 'PREVENT'],
    OUTSIDE_RUN: ['CONTAIN', 'ZONE_COVERAGE'],
    POWER_RUN: ['BLITZ', 'DEEP_ZONE'],
    DRAW: ['BLITZ', 'MAN_COVERAGE'],
    QB_RUN: ['ZONE_COVERAGE', 'DEEP_ZONE'],
    TRICK_PLAY: ['MAN_COVERAGE', 'ZONE_COVERAGE'],
  };
  return matchups[playType] ?? [];
}

function getWeakAgainst(playType: OffensivePlayType): DefensivePlayType[] {
  const matchups: Partial<Record<OffensivePlayType, DefensivePlayType[]>> = {
    SHORT_PASS: ['PRESS_COVERAGE', 'MAN_COVERAGE'],
    MEDIUM_PASS: ['ZONE_BLITZ', 'BLITZ'],
    DEEP_PASS: ['DEEP_ZONE', 'PREVENT'],
    SCREEN: ['ZONE_COVERAGE', 'SPY'],
    PLAY_ACTION: ['SPY', 'CONTAIN'],
    INSIDE_RUN: ['STACK_THE_BOX', 'GOAL_LINE_STAND'],
    OUTSIDE_RUN: ['CONTAIN', 'STACK_THE_BOX'],
    POWER_RUN: ['GOAL_LINE_STAND', 'STACK_THE_BOX'],
    DRAW: ['CONTAIN', 'SPY'],
    QB_RUN: ['SPY', 'CONTAIN'],
    TRICK_PLAY: ['SPY', 'CONTAIN'],
  };
  return matchups[playType] ?? [];
}

function getDefenseStrongAgainst(playType: DefensivePlayType): OffensivePlayType[] {
  const matchups: Partial<Record<DefensivePlayType, OffensivePlayType[]>> = {
    MAN_COVERAGE: ['SHORT_PASS', 'MEDIUM_PASS'],
    ZONE_COVERAGE: ['SCREEN', 'DRAW'],
    DEEP_ZONE: ['DEEP_PASS'],
    PRESS_COVERAGE: ['SHORT_PASS', 'SCREEN'],
    BLITZ: ['DEEP_PASS', 'PLAY_ACTION'],
    ZONE_BLITZ: ['MEDIUM_PASS'],
    CONTAIN: ['OUTSIDE_RUN', 'QB_RUN'],
    SPY: ['QB_RUN', 'DRAW', 'TRICK_PLAY'],
    STACK_THE_BOX: ['INSIDE_RUN', 'POWER_RUN'],
    GOAL_LINE_STAND: ['POWER_RUN', 'INSIDE_RUN'],
    PREVENT: ['DEEP_PASS'],
  };
  return matchups[playType] ?? [];
}

function getDefenseWeakAgainst(playType: DefensivePlayType): OffensivePlayType[] {
  const matchups: Partial<Record<DefensivePlayType, OffensivePlayType[]>> = {
    MAN_COVERAGE: ['TRICK_PLAY', 'SCREEN'],
    ZONE_COVERAGE: ['DEEP_PASS', 'PLAY_ACTION'],
    DEEP_ZONE: ['INSIDE_RUN', 'SHORT_PASS'],
    PRESS_COVERAGE: ['DEEP_PASS', 'PLAY_ACTION'],
    BLITZ: ['SCREEN', 'DRAW'],
    ZONE_BLITZ: ['INSIDE_RUN', 'SHORT_PASS'],
    CONTAIN: ['INSIDE_RUN', 'DEEP_PASS'],
    SPY: ['DEEP_PASS', 'OUTSIDE_RUN'],
    STACK_THE_BOX: ['DEEP_PASS', 'PLAY_ACTION'],
    GOAL_LINE_STAND: ['PLAY_ACTION', 'MEDIUM_PASS'],
    PREVENT: ['INSIDE_RUN', 'SHORT_PASS'],
  };
  return matchups[playType] ?? [];
}

// =============================================================================
// MAIN GENERATION FUNCTIONS
// =============================================================================

/**
 * Generate all cards for a single player based on their position
 */
export function generatePlayerCards(player: Player): Card[] {
  switch (player.position) {
    case 'QB':
      return generateQBCards(player);
    case 'RB':
      return generateRBCards(player);
    case 'WR':
      return generateWRCards(player);
    case 'TE':
      return generateTECards(player);
    case 'LB':
      return generateLBCards(player);
    case 'CB':
      return generateCBCards(player);
    case 'S':
      return generateSCards(player);
    case 'ST':
      return generateSTCards(player);
    case 'OL':
    case 'DL':
      // Line units handled separately
      return [];
    default:
      return [];
  }
}

/**
 * Generate cards for a line unit
 */
export function generateLineUnitCards(unit: DLineUnit | OLineUnit, type: 'OL' | 'DL'): Card[] {
  if (type === 'DL') {
    return generateDLCards(unit as DLineUnit);
  }
  // OL doesn't generate cards directly - it modifies offensive cards
  return [];
}

/**
 * Build a complete deck from a roster
 */
export function buildDeck(roster: Roster): Deck {
  const offensiveCards: OffensiveCard[] = [];
  const defensiveCards: DefensiveCard[] = [];
  const specialTeamsCards: SpecialTeamsCard[] = [];
  const sources: DeckSource[] = [];

  // Helper to track sources
  const trackSource = (playerId: string, name: string, position: string, cards: Card[]) => {
    if (cards.length > 0) {
      const avgRarity = cards.reduce((sum, c) => {
        const rarityValues: Record<CardRarity, number> = {
          COMMON: 1,
          UNCOMMON: 2,
          RARE: 3,
          ELITE: 4,
          LEGENDARY: 5,
        };
        return sum + rarityValues[c.rarity];
      }, 0) / cards.length;

      let avgRarityLabel: CardRarity = 'COMMON';
      if (avgRarity >= 4.5) avgRarityLabel = 'LEGENDARY';
      else if (avgRarity >= 3.5) avgRarityLabel = 'ELITE';
      else if (avgRarity >= 2.5) avgRarityLabel = 'RARE';
      else if (avgRarity >= 1.5) avgRarityLabel = 'UNCOMMON';

      sources.push({
        playerId,
        playerName: name,
        position,
        cardsContributed: cards.length,
        averageRarity: avgRarityLabel,
      });
    }
  };

  // === Generate Offensive Cards ===
  const qbCards = generateQBCards(roster.offense.QB);
  offensiveCards.push(...qbCards);
  trackSource(roster.offense.QB.id, `${roster.offense.QB.firstName} ${roster.offense.QB.lastName}`, 'QB', qbCards);

  const rbCards = generateRBCards(roster.offense.RB);
  offensiveCards.push(...rbCards);
  trackSource(roster.offense.RB.id, `${roster.offense.RB.firstName} ${roster.offense.RB.lastName}`, 'RB', rbCards);

  roster.offense.WR.forEach((wr, i) => {
    const wrCards = generateWRCards(wr);
    offensiveCards.push(...wrCards);
    trackSource(wr.id, `${wr.firstName} ${wr.lastName}`, `WR${i + 1}`, wrCards);
  });

  const teCards = generateTECards(roster.offense.TE);
  offensiveCards.push(...teCards);
  trackSource(roster.offense.TE.id, `${roster.offense.TE.firstName} ${roster.offense.TE.lastName}`, 'TE', teCards);

  // OL affects card quality but doesn't generate cards
  // Apply OL modifier to all offensive cards
  const olModifier = (roster.offense.OL.overall - 70) / 100; // -0.3 to +0.29
  offensiveCards.forEach(card => {
    card.successChance = Math.round(card.successChance * (1 + olModifier * 0.15));
    card.turnoverRisk = Math.round(card.turnoverRisk * (1 - olModifier * 0.2));
  });

  // === Generate Defensive Cards ===
  const dlCards = generateDLCards(roster.defense.DL);
  defensiveCards.push(...dlCards);
  trackSource(roster.defense.DL.id, roster.defense.DL.name, 'DL', dlCards);

  roster.defense.LB.forEach((lb, i) => {
    const lbCards = generateLBCards(lb);
    defensiveCards.push(...lbCards);
    trackSource(lb.id, `${lb.firstName} ${lb.lastName}`, `LB${i + 1}`, lbCards);
  });

  roster.defense.CB.forEach((cb, i) => {
    const cbCards = generateCBCards(cb);
    defensiveCards.push(...cbCards);
    trackSource(cb.id, `${cb.firstName} ${cb.lastName}`, `CB${i + 1}`, cbCards);
  });

  const sCards = generateSCards(roster.defense.S);
  defensiveCards.push(...sCards);
  trackSource(roster.defense.S.id, `${roster.defense.S.firstName} ${roster.defense.S.lastName}`, 'S', sCards);

  // === Generate Special Teams Cards ===
  const stCards = generateSTCards(roster.specialTeams.ST);
  specialTeamsCards.push(...stCards);
  trackSource(roster.specialTeams.ST.id, `${roster.specialTeams.ST.firstName} ${roster.specialTeams.ST.lastName}`, 'ST', stCards);

  // Generate return cards from designated returner
  // Find the returner player from roster
  const kickReturner = findPlayerById(roster, roster.returner.kickReturner);
  const puntReturner = findPlayerById(roster, roster.returner.puntReturner);

  if (kickReturner) {
    const returnCards = generateReturnCards(kickReturner);
    specialTeamsCards.push(...returnCards);
    trackSource(kickReturner.id, `${kickReturner.firstName} ${kickReturner.lastName}`, 'KR', returnCards);
  }

  if (puntReturner && puntReturner.id !== kickReturner?.id) {
    const puntReturnCards = generateReturnCards(puntReturner).filter(c => c.playType.includes('PUNT') || c.playType === 'FAIR_CATCH');
    specialTeamsCards.push(...puntReturnCards);
    trackSource(puntReturner.id, `${puntReturner.firstName} ${puntReturner.lastName}`, 'PR', puntReturnCards);
  }

  // === Calculate composition ===
  const composition = calculateDeckComposition(offensiveCards, defensiveCards, specialTeamsCards);

  // === Calculate average quality ===
  const allCards = [...offensiveCards, ...defensiveCards, ...specialTeamsCards];
  const avgQuality = allCards.reduce((sum, card) => {
    if ('successChance' in card) return sum + (card as OffensiveCard | SpecialTeamsCard).successChance;
    if ('passDefenseRating' in card) return sum + (card as DefensiveCard).passDefenseRating;
    return sum + 50;
  }, 0) / allCards.length;

  return {
    id: `deck-${Date.now()}`,
    teamId: 'user-team', // Will be set by caller
    offensiveCards,
    defensiveCards,
    dirtyCards: [], // Dirty cards added separately based on franchise state
    totalCards: allCards.length,
    averageQuality: Math.round(avgQuality),
    composition,
    generatedFrom: sources,
    generatedAt: Date.now(),
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function findPlayerById(roster: Roster, playerId: string): Player | undefined {
  // Check offense
  if (roster.offense.QB.id === playerId) return roster.offense.QB;
  if (roster.offense.RB.id === playerId) return roster.offense.RB;
  const wr = roster.offense.WR.find(p => p.id === playerId);
  if (wr) return wr;
  if (roster.offense.TE.id === playerId) return roster.offense.TE;

  // Check defense
  const lb = roster.defense.LB.find(p => p.id === playerId);
  if (lb) return lb;
  const cb = roster.defense.CB.find(p => p.id === playerId);
  if (cb) return cb;
  if (roster.defense.S.id === playerId) return roster.defense.S;

  // Check ST
  if (roster.specialTeams.ST.id === playerId) return roster.specialTeams.ST;

  // Check bench
  return roster.bench.find(p => p.id === playerId);
}

function calculateDeckComposition(
  offensiveCards: OffensiveCard[],
  defensiveCards: DefensiveCard[],
  stCards: SpecialTeamsCard[]
): DeckComposition {
  const composition: DeckComposition = {
    passPlays: 0,
    runPlays: 0,
    trickPlays: 0,
    byRarity: {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      ELITE: 0,
      LEGENDARY: 0,
    },
    coveragePlays: 0,
    blitzPlays: 0,
    runDefense: 0,
    shortYardageOptions: 0,
    redZoneOptions: 0,
    twoMinuteOptions: 0,
  };

  // Count offensive cards
  offensiveCards.forEach(card => {
    composition.byRarity[card.rarity]++;

    if (['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(card.playType)) {
      composition.passPlays++;
    } else if (['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(card.playType)) {
      composition.runPlays++;
    } else if (card.playType === 'TRICK_PLAY') {
      composition.trickPlays++;
    }

    // Check situation bonuses
    card.situationBonuses.forEach(bonus => {
      if (bonus.situation === 'SHORT_YARDAGE') composition.shortYardageOptions++;
      if (bonus.situation === 'RED_ZONE') composition.redZoneOptions++;
      if (bonus.situation === 'TWO_MINUTE_WARNING') composition.twoMinuteOptions++;
    });
  });

  // Count defensive cards
  defensiveCards.forEach(card => {
    composition.byRarity[card.rarity]++;

    if (['MAN_COVERAGE', 'ZONE_COVERAGE', 'DEEP_ZONE', 'PRESS_COVERAGE', 'PREVENT'].includes(card.playType)) {
      composition.coveragePlays++;
    } else if (['BLITZ', 'ZONE_BLITZ'].includes(card.playType)) {
      composition.blitzPlays++;
    } else if (['STACK_THE_BOX', 'GOAL_LINE_STAND', 'CONTAIN'].includes(card.playType)) {
      composition.runDefense++;
    }
  });

  // Count ST cards
  stCards.forEach(card => {
    composition.byRarity[card.rarity]++;
  });

  return composition;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  generateQBCards,
  generateRBCards,
  generateWRCards,
  generateTECards,
  generateDLCards,
  generateLBCards,
  generateCBCards,
  generateSCards,
  generateSTCards,
  generateReturnCards,
  getCardQualityTier,
  QUALITY_THRESHOLDS,
  ST_THRESHOLDS,
};
