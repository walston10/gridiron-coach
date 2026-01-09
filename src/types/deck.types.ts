/**
 * ILLEGAL MOTION - Deck Types
 *
 * Deck building and hand management for the card-based football game.
 * Players on your roster generate cards for your deck.
 * During games, you draw from your deck and manage your hand.
 */

import type { Card, CardRarity, OffensiveCard, DefensiveCard, DirtyCard } from './card.types';

// =============================================================================
// DECK COMPOSITION
// =============================================================================

/**
 * A deck is generated from your roster before each game.
 * Better players = better cards.
 * Deck size is fixed but composition varies.
 */
export interface Deck {
  id: string;
  teamId: string;

  // All cards in deck
  offensiveCards: OffensiveCard[];
  defensiveCards: DefensiveCard[];
  dirtyCards: DirtyCard[];        // Optional, based on franchise corruption

  // Deck stats
  totalCards: number;
  averageQuality: number;         // Average rarity/power level
  composition: DeckComposition;

  // Source tracking
  generatedFrom: DeckSource[];    // Which players contributed
  generatedAt: number;            // Timestamp
}

export interface DeckComposition {
  // Play type breakdown
  passPlays: number;
  runPlays: number;
  trickPlays: number;

  // Rarity breakdown
  byRarity: Record<CardRarity, number>;

  // Defense breakdown
  coveragePlays: number;
  blitzPlays: number;
  runDefense: number;

  // Situational coverage
  shortYardageOptions: number;
  redZoneOptions: number;
  twoMinuteOptions: number;
}

export interface DeckSource {
  playerId: string;
  playerName: string;
  position: string;
  cardsContributed: number;
  averageRarity: CardRarity;
}

// =============================================================================
// DECK CONFIGURATION (Pre-game)
// =============================================================================

/**
 * Before a game, you can configure your deck within limits.
 * This is like setting a game plan.
 */
export interface DeckConfiguration {
  // Emphasis (affects draw probabilities)
  offensiveEmphasis: 'BALANCED' | 'PASS_HEAVY' | 'RUN_HEAVY' | 'AGGRESSIVE';
  defensiveEmphasis: 'BALANCED' | 'COVERAGE' | 'PRESSURE' | 'CONSERVATIVE';

  // Dirty card inclusion
  includeDirtyCards: boolean;
  dirtyCardLimit: number;         // Max dirty cards in deck

  // Situational tuning
  redZoneFocus: boolean;          // More red zone cards
  twoMinuteFocus: boolean;        // More clock management cards

  // Star player focus
  featuredPlayer?: string;        // Player ID to feature (more of their cards)
}

export const DEFAULT_DECK_CONFIG: DeckConfiguration = {
  offensiveEmphasis: 'BALANCED',
  defensiveEmphasis: 'BALANCED',
  includeDirtyCards: false,
  dirtyCardLimit: 3,
  redZoneFocus: false,
  twoMinuteFocus: false,
};

// =============================================================================
// HAND MANAGEMENT
// =============================================================================

/**
 * During a game, you draw cards into your hand.
 * Hand size is limited - you must manage what you keep.
 */
export interface Hand {
  // Current cards in hand
  offensiveCards: OffensiveCard[];
  defensiveCards: DefensiveCard[];
  dirtyCards: DirtyCard[];

  // Limits
  maxOffensiveCards: number;      // Typically 5
  maxDefensiveCards: number;      // Typically 5
  maxDirtyCards: number;          // Typically 2

  // Draw state
  canDrawOffensive: boolean;      // Space available
  canDrawDefensive: boolean;
  cardsDrawnThisHalf: number;
}

export const DEFAULT_HAND_LIMITS = {
  maxOffensiveCards: 5,
  maxDefensiveCards: 5,
  maxDirtyCards: 2,
};

// =============================================================================
// DRAW PILE & DISCARD
// =============================================================================

export interface DrawPile {
  offensiveCards: OffensiveCard[];
  defensiveCards: DefensiveCard[];
  dirtyCards: DirtyCard[];

  // Shuffle state
  isShuffled: boolean;
  lastShuffled: number;
}

export interface DiscardPile {
  cards: Card[];

  // Tracking
  cardsDiscardedThisGame: number;
  cardsPlayedThisGame: number;
}

// =============================================================================
// GAME DECK STATE (During game)
// =============================================================================

/**
 * Complete deck state during a game.
 */
export interface GameDeckState {
  drawPile: DrawPile;
  hand: Hand;
  discardPile: DiscardPile;

  // Burned cards (removed from game - penalties, etc.)
  burnedCards: Card[];

  // Stats
  totalDraws: number;
  totalPlays: number;
  totalDiscards: number;

  // Special states
  isExhausted: boolean;           // Draw pile empty (bad situation)
  mustReshuffle: boolean;         // Discard back into draw
}

// =============================================================================
// DRAW MECHANICS
// =============================================================================

/** Draw options */
export interface DrawOptions {
  type: 'OFFENSIVE' | 'DEFENSIVE' | 'DIRTY' | 'ANY';
  count: number;
  filters?: DrawFilters;
}

export interface DrawFilters {
  minRarity?: CardRarity;
  playType?: string;              // Specific play type
  situationTag?: string;          // RED_ZONE, SHORT_YARDAGE, etc.
}

/** Result of a draw action */
export interface DrawResult {
  cardsDrawn: Card[];
  fromExhaustedDeck: boolean;     // Had to reshuffle first
  bonusDraw: boolean;             // Got extra draw from effect
}

// =============================================================================
// DECK BUILDING (Pre-season/Management)
// =============================================================================

/**
 * Long-term deck building through roster management.
 * Your deck quality depends entirely on your players.
 */
export interface DeckBuildingState {
  // Current potential deck (if game started now)
  projectedDeck: DeckProjection;

  // Weaknesses to address
  weaknesses: DeckWeakness[];

  // Recent changes
  recentRosterMoves: RosterMoveImpact[];
}

export interface DeckProjection {
  estimatedQuality: number;       // 0-100
  passGameRating: number;
  runGameRating: number;
  defenseRating: number;
  depthRating: number;            // How well you handle fatigue/injuries

  // Card counts by type
  estimatedCards: DeckComposition;

  // Notable cards
  signatureCards: Card[];         // Star player's best cards
}

export interface DeckWeakness {
  area: 'PASS_OFFENSE' | 'RUN_OFFENSE' | 'PASS_DEFENSE' | 'RUN_DEFENSE' | 'DIRTY' | 'DEPTH';
  severity: 'MINOR' | 'MODERATE' | 'CRITICAL';
  description: string;            // "Lacking deep threat", "No pressure cards"
  suggestedFix: string;           // "Sign a speedy WR", "Draft edge rusher"
}

export interface RosterMoveImpact {
  moveType: 'SIGNED' | 'CUT' | 'TRADED' | 'INJURED';
  playerName: string;
  cardImpact: number;             // Net change in cards
  qualityImpact: number;          // Change in average quality
  areaAffected: string;           // What part of deck changed
}

// =============================================================================
// SPECIAL DECK MECHANICS
// =============================================================================

/**
 * Scheme bonuses - coordinators can buff certain card types.
 */
export interface SchemeBonus {
  schemeName: string;             // "Air Raid", "Power Run", "Tampa 2"
  affectedPlayTypes: string[];
  bonusPercentage: number;        // +10%, +15%, etc.
  description: string;
}

/**
 * Synergy bonuses - certain player combinations create bonus cards.
 */
export interface DeckSynergy {
  id: string;
  name: string;                   // "Dynamic Duo", "Legion of Boom"
  requiredPlayers: string[];      // Player IDs or positions
  bonusCard: Card;                // Special card unlocked
  description: string;
}

/**
 * Fatigue effects on deck.
 * As players tire, card quality decreases.
 */
export interface FatigueEffect {
  playerId: string;
  fatigueLevel: number;           // 0-100
  cardQualityPenalty: number;     // Percentage reduction
  cardsAffected: string[];        // Card IDs with reduced quality
}

// =============================================================================
// HELPERS
// =============================================================================

/** Calculate total hand size */
export function getHandSize(hand: Hand): number {
  return (
    hand.offensiveCards.length +
    hand.defensiveCards.length +
    hand.dirtyCards.length
  );
}

/** Check if hand has room for a card type */
export function canAddToHand(hand: Hand, cardType: 'OFFENSIVE' | 'DEFENSIVE' | 'DIRTY'): boolean {
  switch (cardType) {
    case 'OFFENSIVE':
      return hand.offensiveCards.length < hand.maxOffensiveCards;
    case 'DEFENSIVE':
      return hand.defensiveCards.length < hand.maxDefensiveCards;
    case 'DIRTY':
      return hand.dirtyCards.length < hand.maxDirtyCards;
  }
}

/** Get deck quality description */
export function getDeckQualityTier(averageQuality: number): string {
  if (averageQuality >= 90) return 'ELITE';
  if (averageQuality >= 75) return 'EXCELLENT';
  if (averageQuality >= 60) return 'SOLID';
  if (averageQuality >= 45) return 'AVERAGE';
  if (averageQuality >= 30) return 'BELOW AVERAGE';
  return 'POOR';
}

/** Calculate deck composition from card list */
export function calculateComposition(cards: Card[]): DeckComposition {
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

  cards.forEach(card => {
    composition.byRarity[card.rarity]++;

    if (card.category === 'OFFENSIVE') {
      const offCard = card as OffensiveCard;
      if (['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(offCard.playType)) {
        composition.passPlays++;
      } else if (['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW'].includes(offCard.playType)) {
        composition.runPlays++;
      } else if (offCard.playType === 'TRICK_PLAY') {
        composition.trickPlays++;
      }

      // Check situational bonuses
      offCard.situationBonuses?.forEach(bonus => {
        if (bonus.situation === 'SHORT_YARDAGE') composition.shortYardageOptions++;
        if (bonus.situation === 'RED_ZONE') composition.redZoneOptions++;
        if (bonus.situation === 'TWO_MINUTE_WARNING') composition.twoMinuteOptions++;
      });
    }

    if (card.category === 'DEFENSIVE') {
      const defCard = card as DefensiveCard;
      if (['MAN_COVERAGE', 'ZONE_COVERAGE', 'DEEP_ZONE', 'PRESS_COVERAGE'].includes(defCard.playType)) {
        composition.coveragePlays++;
      } else if (['BLITZ', 'ZONE_BLITZ'].includes(defCard.playType)) {
        composition.blitzPlays++;
      } else if (['STACK_THE_BOX', 'GOAL_LINE_STAND', 'CONTAIN'].includes(defCard.playType)) {
        composition.runDefense++;
      }
    }
  });

  return composition;
}

// =============================================================================
// DECK CONSTANTS
// =============================================================================

export const DECK_LIMITS = {
  MIN_OFFENSIVE_CARDS: 20,
  MAX_OFFENSIVE_CARDS: 40,
  MIN_DEFENSIVE_CARDS: 20,
  MAX_DEFENSIVE_CARDS: 40,
  MAX_DIRTY_CARDS: 10,
  MIN_TOTAL_DECK_SIZE: 50,
  MAX_TOTAL_DECK_SIZE: 80,
};

export const CARDS_PER_POSITION: Record<string, number> = {
  QB: 8,      // Lots of pass plays
  RB: 6,      // Run and receiving
  WR: 5,      // Per receiver
  TE: 4,
  OL: 3,      // Blocking quality affects all cards
  DL: 4,      // Pass rush and run stuff
  LB: 4,      // Per linebacker
  CB: 4,      // Per corner
  S: 4,
};

export const DRAW_RATES = {
  CARDS_PER_QUARTER: 6,           // New cards drawn per quarter
  BONUS_DRAW_ON_TURNOVER: 2,      // Extra draws after forcing turnover
  PENALTY_DRAW_ON_TURNOVER: -1,   // Lose a draw slot after turnover
};
