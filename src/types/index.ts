/**
 * ILLEGAL MOTION - Type Exports
 *
 * Card-based football management game with corruption mechanics.
 *
 * NOTE: This codebase has two type systems in transition:
 * - Legacy types (Player.ts, Game.ts, etc.) - used by existing components
 * - New card-game types (player.types.ts, game.types.ts) - for future card system
 *
 * For compatibility, legacy types are exported as defaults.
 * New card-game types are aliased with "Card" prefix.
 */

// =============================================================================
// LEGACY PLAYER TYPES (from Player.ts - used by existing components)
// =============================================================================
export type {
  // Position types (detailed: LT, LG, DE, DT, OLB, MLB, etc.)
  Position,
  OffensePosition,
  DefensePosition,
  SpecialTeamsPosition,
  // Roster types
  OffenseRosterPosition,
  DefenseRosterPosition,
  RosterPosition,
  LineUnit,
  RosterSlot,
  // Field roles
  OffenseFieldRole,
  DefenseFieldRole,
  FieldRole,
  // Formation types
  OffenseFormation,
  DefenseFormation,
  Formation,
  // Role mapping
  OffenseRoleMapping,
  // Stats
  PlayerStats,
  OLineUnitStats,
  DefenseUnitStats,
  LineUnitStats,
  // Contract (has years, yearlySalary)
  Contract,
  // Injury
  InjuryStatus,
  // Player entity (has stats, injuryStatus, teamId)
  Player,
  // Unit types
  OLineEntity,
  DefenseCaptainEntity,
  // Roster structure
  TeamRoster,
  // Draft types
  DraftSlot,
  DraftPlayer,
  DraftPool,
} from './Player';

export {
  OFFENSE_FORMATION_ROLES,
  getOffenseFieldRole,
  isOffensePosition,
  isDefensePosition,
  isOffenseFormation,
  isDefenseFormation,
  getAllPlayers,
  calculateOverall,
  isEmergencyBackup,
  canBeTradedOrCut,
  canBeInEvent,
  canBeInjured,
} from './Player';


// =============================================================================
// LEGACY TEAM TYPES (from Team.ts)
// =============================================================================
export type {
  Team,
  TeamInfo,
  Coordinator,
  DepthChart,
  LegacyTeam,
} from './Team';

// =============================================================================
// LEGACY PLAY TYPES (from Play.ts - used by Playbook, PlayDesigner)
// =============================================================================
export type {
  Play,
  PlayFolder,
  Playbook,
  FormationType,
  PersonnelPackage,
  FieldSide,
  RouteType,
  ReceiverBlockType,
  OLBlockingAssignment,
  BlockingAssignment,
  PassAction,
  QBRunType,
  RunAssignment,
  RunGap,
  ProtectionScheme,
  RunBlockingScheme,
  MotionType,
  MotionTiming,
  MotionAssignment,
  PlayerAssignment,
  PlayTag,
  ConceptTemplate,
  ReceiverPosition,
} from './Play';

// =============================================================================
// LEGACY DRAFT TYPES (from Draft.ts)
// =============================================================================
export type {
  DraftProspect,
  Draft,
  DraftPick,
} from './Draft';

// =============================================================================
// LEGACY FREE AGENCY TYPES (from FreeAgency.ts)
// =============================================================================
export type {
  FreeAgent,
  ContractOffer,
  FreeAgencyPeriod,
} from './FreeAgency';

// =============================================================================
// LEGACY SEASON TYPES (from Season.ts)
// =============================================================================
export type {
  SeasonPhase as LegacySeasonPhase,
  ScheduleGame,
  Standings,
  Season,
} from './Season';

// =============================================================================
// CPU TYPES
// =============================================================================
export type * from './CPU';

// =============================================================================
// OTHER LEGACY TYPES
// =============================================================================

// Gameplay types (used by engine)
export type * from './gameplay.types';

// Substitution types
export type * from './Substitution';

// Owner types
export type * from './Owner';

// Input types
export type * from './input.types';

// Offseason types
export type * from './offseason.types';

// Save types
export type * from './save.types';

// =============================================================================
// NEW CARD-GAME TYPES (aliased to avoid conflicts)
// =============================================================================

// Card Player types (from player.types.ts)
export type {
  OffensePosition as CardOffensePosition,
  DefensePosition as CardDefensePosition,
  SpecialTeamsPosition as CardSpecialTeamsPosition,
  Position as CardPosition,
  PlayerRatings,
  PlayerCondition,
  PlayerStatus,
  Contract as CardContract,
  Player as CardPlayer,
  PersonalityTrait,
  PlayerPersonality,
  Roster as CardRoster,
  OLineUnit as CardOLineUnit,
  DLineUnit as CardDLineUnit,
  ReturnerDesignation,
  DraftProspect as CardDraftProspect,
  FreeAgent as CardFreeAgent,
} from './player.types';

export {
  DEFAULT_RATINGS,
  getPlayerDisplayName,
  getPlayerShortName,
  isPlayerAvailable,
  canBeInEvent as cardCanBeInEvent,
  getCardQualityModifier,
  POSITION_VALUE_TIER,
} from './player.types';

// =============================================================================
// CARD TYPES (from card.types.ts)
// =============================================================================
export type {
  // Rarity & Categories
  CardRarity,
  CardCategory,

  // Offensive
  OffensivePlayType,
  Formation as CardFormation,
  OffensiveCard,

  // Defensive
  DefensivePlayType,
  DefensiveCard,

  // Special Teams
  SpecialTeamsPlayType,
  SpecialTeamsCard,

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
  isSpecialTeamsCard,
  isDirtyCard,
  RARITY_COLORS,
  CATEGORY_COLORS,
} from './card.types';

// =============================================================================
// CARD GAME TYPES (from game.types.ts - aliased)
// =============================================================================
export type {
  // Phase & Clock
  GamePhase,
  GameClock as CardGameClock,
  PlayClock,

  // Field Position
  Down as CardDown,
  FieldPosition as CardFieldPosition,

  // Team State
  TeamGameState as CardTeamGameState,
  GameStats,

  // Momentum
  Momentum,
  MomentumEvent,

  // Tendencies
  Tendencies,

  // Play Selection
  PlaySelection,

  // Fourth Down
  FourthDownCategory,
  FourthDownDefenseResponse,
  FourthDownState,
  FourthDownPhase,

  // Live Game
  LiveGame as CardLiveGame,
  DriveState,
  DriveResult,

  // Weather
  WeatherCondition,
  WeatherEffect,

  // Settings
  GameSettings as CardGameSettings,
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
  // Fourth Down helpers
  calculateFGSuccessChance,
  calculatePuntDistance,
  getRecommended4thDownDecision,
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
// SEASON TYPES (from season.types.ts)
// =============================================================================
export type {
  // Phase
  SeasonPhase,

  // League
  LeagueStructure,
  LeagueTeam,

  // Season (aliased to avoid conflict with Season.ts)
  Season as CardSeason,
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
  DraftPick as SeasonDraftPick,
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
