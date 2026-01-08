/**
 * ILLEGAL MOTION - Type Exports
 *
 * Card-based football management game with corruption mechanics.
 * All types re-exported from this barrel file.
 */

// =============================================================================
// PLAYER TYPES
// =============================================================================
export type {
  // Positions
  OffensePosition,
  DefensePosition,
  SpecialTeamsPosition,
  Position,

  // Ratings
  PlayerRatings,

  // Status
  PlayerCondition,
  PlayerStatus,
  Contract,

  // Player Entity
  Player,
  PersonalityTrait,
  PlayerPersonality,

  // Roster
  Roster,
  OLineUnit,
  DLineUnit,

  // Draft/Signing
  DraftProspect,
  FreeAgent,
} from './player.types';

export {
  DEFAULT_RATINGS,
  getPlayerDisplayName,
  getPlayerShortName,
  isPlayerAvailable,
  canBeInEvent,
  getCardQualityModifier,
  POSITION_VALUE_TIER,
} from './player.types';

// =============================================================================
// CARD TYPES
// =============================================================================
export type {
  // Rarity & Categories
  CardRarity,
  CardCategory,

  // Offensive
  OffensivePlayType,
  Formation,
  OffensiveCard,

  // Defensive
  DefensivePlayType,
  DefensiveCard,

  // Dirty
  DirtyPlayType,
  DirtyCard,
  DirtyCardEffect,
  DirtyEffectType,
  DirtyCardTarget,

  // Situations
  SituationBonus,
  GameSituation,

  // Union
  Card,

  // Results
  CardPlayResult,
  PenaltyResult,
  InjuryResult,

  // Generation
  CardTemplate,
  RatingInfluence,
} from './card.types';

export {
  RARITY_DRAW_WEIGHTS,
  isOffensiveCard,
  isDefensiveCard,
  isDirtyCard,
  RARITY_COLORS,
  CATEGORY_COLORS,
} from './card.types';

// =============================================================================
// GAME TYPES
// =============================================================================
export type {
  // Phase & Clock
  GamePhase,
  GameClock,
  PlayClock,

  // Field Position
  Down,
  FieldPosition,

  // Team State
  TeamGameState,
  GameStats,

  // Momentum
  Momentum,
  MomentumEvent,

  // Tendencies
  Tendencies,

  // Play Selection
  PlaySelection,

  // Live Game
  LiveGame,
  DriveState,
  DriveResult,

  // Weather
  WeatherCondition,
  WeatherEffect,

  // Settings
  GameSettings,
  DifficultyLevel,

  // Summary
  GameSummary,
  GameHighlight,
} from './game.types';

export {
  createFieldPosition,
  MOMENTUM_SHIFTS,
  calculatePredictability,
  WEATHER_EFFECTS,
  getSituationDescription,
  isCriticalSituation,
} from './game.types';

// =============================================================================
// DECK TYPES
// =============================================================================
export type {
  // Deck Structure
  Deck,
  DeckComposition,
  DeckSource,

  // Configuration
  DeckConfiguration,

  // Hand
  Hand,

  // Piles
  DrawPile,
  DiscardPile,
  GameDeckState,

  // Draw Mechanics
  DrawOptions,
  DrawFilters,
  DrawResult,

  // Deck Building
  DeckBuildingState,
  DeckProjection,
  DeckWeakness,
  RosterMoveImpact,

  // Special
  SchemeBonus,
  DeckSynergy,
  FatigueEffect,
} from './deck.types';

export {
  DEFAULT_DECK_CONFIG,
  DEFAULT_HAND_LIMITS,
  getHandSize,
  canAddToHand,
  getDeckQualityTier,
  calculateComposition,
  DECK_LIMITS,
  CARDS_PER_POSITION,
  DRAW_RATES,
} from './deck.types';

// =============================================================================
// EVENT TYPES
// =============================================================================
export type {
  // Categories & Characters
  EventCategory,
  EventCharacter,
  EventCharacterProfile,

  // Event Structure
  GameEvent,
  EventRarity,
  EventTag,
  EventPrerequisites,

  // Choices
  EventChoice,

  // Consequences
  EventConsequences,
  PlayerEventEffect,
  PlayerEffect,
  CardEventEffect,

  // Delayed
  DelayedConsequence,
  DelayedEventType,

  // State
  EventSystemState,
  PendingEventChoice,
  CompletedEvent,
  ScheduledDelayedEvent,

  // Specific Events
  ScandalEvent,
  ScandalType,
  CorruptionEvent,
  CorruptionType,
  OwnerDemandEvent,
  OwnerDemandType,
  LeagueActionEvent,
  LeagueActionType,

  // Generation
  EventGenerationConfig,
} from './event.types';

export {
  DEFAULT_EVENT_CONFIG,
  URGENCY_COLORS,
  CATEGORY_ICONS,
  isShadyChoice,
  calculateEventHeat,
} from './event.types';

// =============================================================================
// SEASON TYPES
// =============================================================================
export type {
  // Phase
  SeasonPhase,

  // League
  LeagueStructure,
  LeagueTeam,

  // Season
  Season,
  ScheduledGame,
  GameResult,

  // Standings
  TeamStanding,

  // Playoffs
  PlayoffRound,
  PlayoffBracket,
  PlayoffMatchup,

  // Records
  SeasonRecords,
  PlayoffResult,

  // Events
  SeasonEvent,
  SeasonEventType,

  // Week
  Week,
  WeekPhase,
  RosterMove,
  MeterChange,

  // Offseason
  OffseasonState,
  OffseasonPhase,
  DraftPick,
} from './season.types';

export {
  sortStandings,
  generatePlayoffBracket,
  getCurrentGame,
  getUserStanding,
  hasClinchedPlayoffs,
  isEliminatedFromPlayoffs,
  getPlayoffPictureDescription,
  SEASON_DEFAULTS,
  PLAYOFF_ROUND_NAMES,
} from './season.types';

// =============================================================================
// FRANCHISE TYPES
// =============================================================================
export type {
  // State
  FranchiseState,

  // Finances
  FranchiseFinances,

  // Meters
  ReputationMeters,
  MeterStatus,

  // Hidden State
  HiddenState,
  HeatSource,
  HeatSourceType,
  InvestigationStage,
  Evidence,

  // Owner
  OwnerState,
  OwnerPersonality,
  OwnerRelationship,
  OwnerDemand,

  // Settings
  FranchiseSettings,

  // Game Over
  GameOverReason,
  GameOverState,
} from './franchise.types';

// Re-export DifficultyLevel from franchise (same as game.types)
export type { DifficultyLevel as FranchiseDifficulty } from './franchise.types';

export {
  DEFAULT_FINANCES,
  DEFAULT_METERS,
  METER_THRESHOLDS,
  getMeterStatus,
  DEFAULT_HIDDEN_STATE,
  HEAT_THRESHOLDS,
  getInvestigationStage,
  getOwnerRelationship,
  DEFAULT_SETTINGS,
  isJobInDanger,
  isInvestigationSerious,
  calculateHeatDecay,
  getCorruptionRiskDescription,
  generateEpitaph,
} from './franchise.types';

// =============================================================================
// LEGACY EXPORTS (for migration - prefixed to avoid conflicts)
// =============================================================================

/**
 * MIGRATION NOTE:
 * The old types are being phased out. Use the new types above.
 * Legacy types are available via direct import from their files:
 *
 *   import type { Player as LegacyPlayer } from './types/Player';
 *   import type { Play as LegacyPlay } from './types/Play';
 *
 * Old files that will be removed after migration:
 * - Player.ts (use player.types.ts)
 * - Play.ts (concepts moved to card.types.ts)
 * - Game.ts (use game.types.ts)
 * - Team.ts (integrated into franchise.types.ts)
 * - Season.ts (use season.types.ts)
 * - Events.ts (use event.types.ts)
 *
 * Files still in use by old engine (keep until engine rewrite):
 * - Draft.ts
 * - FreeAgency.ts
 * - CPU.ts
 * - gameplay.types.ts
 * - input.types.ts
 * - Substitution.ts
 * - GameSim.ts
 * - Owner.ts
 */

// Legacy types that don't conflict with new names
export type * from './Draft';
export type * from './FreeAgency';
export type * from './CPU';
