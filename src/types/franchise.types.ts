/**
 * ILLEGAL MOTION - Franchise Types
 *
 * The meta-game layer: budget, reputation, corruption, and investigation.
 * This is where the GTA-style satirical management happens.
 */

import type { Roster } from './player.types';
import type { Deck } from './deck.types';
import type { Season } from './season.types';
import type { EventSystemState } from './event.types';

// =============================================================================
// FRANCHISE STATE
// =============================================================================

/**
 * The complete franchise state.
 * This is the "save game" - everything about your team and career.
 */
export interface FranchiseState {
  // Identity
  id: string;
  teamId: string;
  gmName: string;
  gmNickname?: string;            // "The Fixer", "Mr. Clean"

  // Team
  roster: Roster;
  currentDeck: Deck;

  // Season
  season: Season;
  careerSeasons: number;
  careerRecord: { wins: number; losses: number };
  championships: number;

  // Finances
  finances: FranchiseFinances;

  // Reputation & Public Perception
  meters: ReputationMeters;

  // Hidden State (corruption/investigation)
  hidden: HiddenState;

  // Owner relationship
  owner: OwnerState;

  // Event system
  events: EventSystemState;

  // Settings
  settings: FranchiseSettings;

  // Meta
  createdAt: number;
  lastPlayedAt: number;
  totalPlayTime: number;          // Minutes
}

// =============================================================================
// FINANCES
// =============================================================================

export interface FranchiseFinances {
  // Official money (public)
  salaryCap: number;              // League cap
  currentPayroll: number;         // What you're paying players
  capSpace: number;               // Room to sign players
  deadMoney: number;              // Committed to cut players

  // Unofficial money (hidden)
  slushFund: number;              // For bribes, payoffs, etc.
  slushFundMax: number;           // Owner sets this limit

  // Revenue (affects what owner provides)
  ticketRevenue: number;
  merchandiseRevenue: number;
  sponsorRevenue: number;

  // History
  finesThisSeason: number;
  bribesThisSeason: number;
  payoffsThisSeason: number;
}

export const DEFAULT_FINANCES: FranchiseFinances = {
  salaryCap: 100,                 // 100 "units" for simplicity
  currentPayroll: 0,
  capSpace: 100,
  deadMoney: 0,
  slushFund: 10,                  // Starting bribe money
  slushFundMax: 50,
  ticketRevenue: 0,
  merchandiseRevenue: 0,
  sponsorRevenue: 0,
  finesThisSeason: 0,
  bribesThisSeason: 0,
  payoffsThisSeason: 0,
};

// =============================================================================
// REPUTATION METERS
// =============================================================================

/**
 * Public-facing meters that affect gameplay and events.
 * All meters 0-100, with different meanings for low vs high.
 */
export interface ReputationMeters {
  // Public perception
  fanApproval: number;            // 0=Hated, 100=Beloved
  mediaPerception: number;        // 0=Villain, 100=Media Darling
  leagueStanding: number;         // 0=Pariah, 100=Respected

  // Team culture
  playerMorale: number;           // 0=Mutiny, 100=United
  lockerRoomChemistry: number;    // 0=Toxic, 100=Brotherhood

  // Your approach
  integrity: number;              // 0=Corrupt, 100=Clean
  riskTolerance: number;          // 0=Conservative, 100=Reckless
}

export const DEFAULT_METERS: ReputationMeters = {
  fanApproval: 50,
  mediaPerception: 50,
  leagueStanding: 50,
  playerMorale: 60,
  lockerRoomChemistry: 50,
  integrity: 50,
  riskTolerance: 50,
};

/** Meter thresholds for game effects */
export const METER_THRESHOLDS = {
  CRITICAL_LOW: 20,               // Severe penalties
  LOW: 35,                        // Minor penalties
  NEUTRAL_LOW: 45,
  NEUTRAL_HIGH: 55,
  HIGH: 65,                       // Minor bonuses
  CRITICAL_HIGH: 80,              // Major bonuses
};

/** Get meter status description */
export function getMeterStatus(value: number): MeterStatus {
  if (value <= METER_THRESHOLDS.CRITICAL_LOW) return 'CRITICAL_LOW';
  if (value <= METER_THRESHOLDS.LOW) return 'LOW';
  if (value <= METER_THRESHOLDS.NEUTRAL_LOW) return 'NEUTRAL_LOW';
  if (value <= METER_THRESHOLDS.NEUTRAL_HIGH) return 'NEUTRAL';
  if (value <= METER_THRESHOLDS.HIGH) return 'NEUTRAL_HIGH';
  if (value <= METER_THRESHOLDS.CRITICAL_HIGH) return 'HIGH';
  return 'CRITICAL_HIGH';
}

export type MeterStatus =
  | 'CRITICAL_LOW'
  | 'LOW'
  | 'NEUTRAL_LOW'
  | 'NEUTRAL'
  | 'NEUTRAL_HIGH'
  | 'HIGH'
  | 'CRITICAL_HIGH';

// =============================================================================
// HIDDEN STATE (Corruption & Investigation)
// =============================================================================

/**
 * Hidden state - the FBI is watching.
 * This is the core "risk" mechanic of the corruption system.
 */
export interface HiddenState {
  // Investigation heat (0-100)
  heat: number;                   // 0=Clean, 100=Indicted
  heatSources: HeatSource[];      // What's adding heat

  // Investigation stages
  investigationStage: InvestigationStage;
  investigatorName?: string;      // Named investigator (appears in events)

  // Evidence
  evidenceAgainstYou: Evidence[];
  witnessesCompromised: string[]; // Player IDs who won't talk
  documentsBuried: number;

  // Tracking
  totalShadyActions: number;
  shadyActionsThisSeason: number;
  consecutiveCleanWeeks: number;  // Heat decays if you stay clean
}

export interface HeatSource {
  type: HeatSourceType;
  amount: number;
  week: number;
  description: string;
  decaying: boolean;              // Does this heat decay over time?
}

export type HeatSourceType =
  | 'BRIBE'                       // Paid someone off
  | 'COVER_UP'                    // Buried a story
  | 'SIGNAL_STEALING'             // Cheating
  | 'PED_PROGRAM'                 // Doping
  | 'POINT_SHAVING'               // Gambling manipulation
  | 'WITNESS_TAMPERING'           // Silencing people
  | 'TAX_EVASION'                 // Slush fund issues
  | 'LEAGUE_VIOLATION'            // Breaking rules
  | 'SCANDAL_FALLOUT'             // Public scandal
  | 'ANONYMOUS_TIP';              // Someone ratted

export type InvestigationStage =
  | 'NONE'                        // No investigation
  | 'RUMORS'                      // Heat 20-39: Whispers
  | 'INQUIRY'                     // Heat 40-59: Informal questions
  | 'INVESTIGATION'               // Heat 60-79: Formal investigation
  | 'GRAND_JURY'                  // Heat 80-89: Serious trouble
  | 'INDICTMENT'                  // Heat 90+: Game over incoming
  | 'ARRESTED';                   // Heat 100: Game over

export interface Evidence {
  id: string;
  type: string;
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'DAMNING';
  discoveredWeek: number;
  canBeDestroyed: boolean;
  destructionCost?: number;
}

export const DEFAULT_HIDDEN_STATE: HiddenState = {
  heat: 0,
  heatSources: [],
  investigationStage: 'NONE',
  evidenceAgainstYou: [],
  witnessesCompromised: [],
  documentsBuried: 0,
  totalShadyActions: 0,
  shadyActionsThisSeason: 0,
  consecutiveCleanWeeks: 0,
};

/** Heat thresholds */
export const HEAT_THRESHOLDS = {
  SAFE: 0,
  RUMORS: 20,
  INQUIRY: 40,
  INVESTIGATION: 60,
  GRAND_JURY: 80,
  INDICTMENT: 90,
  ARRESTED: 100,
};

/** Get investigation stage from heat */
export function getInvestigationStage(heat: number): InvestigationStage {
  if (heat >= HEAT_THRESHOLDS.ARRESTED) return 'ARRESTED';
  if (heat >= HEAT_THRESHOLDS.INDICTMENT) return 'INDICTMENT';
  if (heat >= HEAT_THRESHOLDS.GRAND_JURY) return 'GRAND_JURY';
  if (heat >= HEAT_THRESHOLDS.INVESTIGATION) return 'INVESTIGATION';
  if (heat >= HEAT_THRESHOLDS.INQUIRY) return 'INQUIRY';
  if (heat >= HEAT_THRESHOLDS.RUMORS) return 'RUMORS';
  return 'NONE';
}

// =============================================================================
// OWNER STATE
// =============================================================================

/**
 * Your relationship with the team owner.
 * They have demands, patience, and resources.
 */
export interface OwnerState {
  // Identity
  ownerId: string;
  name: string;
  nickname?: string;              // "Big Money Mike"
  personality: OwnerPersonality;

  // Relationship
  patience: number;               // 0-100: How close to firing you
  trust: number;                  // 0-100: Do they believe in you
  relationshipTier: OwnerRelationship;

  // Current demands
  currentDemands: OwnerDemand[];
  demandDeadlines: Map<string, number>;  // Demand ID -> week deadline

  // Resources
  willingToSpend: number;         // Affects salary cap
  slushFundProvided: number;      // How much "dark money" they give
  toleratesCorruption: boolean;   // Will they fire you for being shady?
  corruptionThreshold: number;    // Heat level before they intervene

  // History
  demandsMet: number;
  demandsFailed: number;
  yearsEmployed: number;
  previousWarnings: number;
}

export type OwnerPersonality =
  | 'PATIENT'                     // Long leash, low demands
  | 'DEMANDING'                   // High expectations, short leash
  | 'HANDS_OFF'                   // Doesn't interfere much
  | 'MEDDLING'                    // Always in your business
  | 'CORRUPT'                     // Encourages shady behavior
  | 'CLEAN'                       // Zero tolerance for corruption
  | 'CHEAP'                       // Won't spend money
  | 'SPENDER'                     // Money is no object
  | 'LEGACY'                      // Cares about reputation
  | 'WIN_NOW';                    // Only cares about championships

export type OwnerRelationship =
  | 'HOSTILE'                     // About to be fired
  | 'STRAINED'                    // In trouble
  | 'NEUTRAL'                     // Standard relationship
  | 'TRUSTED'                     // Good standing
  | 'GOLDEN_BOY';                 // Can do no wrong

export interface OwnerDemand {
  id: string;
  type: OwnerDemandType;
  description: string;
  deadline: number;               // Week to complete by
  patienceCost: number;           // Lost if failed
  patienceReward: number;         // Gained if met
  isRequired: boolean;            // Failure = fired
}

export type OwnerDemandType =
  | 'WIN_GAMES'                   // Win X games this season
  | 'MAKE_PLAYOFFS'               // Make the playoffs
  | 'WIN_CHAMPIONSHIP'            // Win it all
  | 'IMPROVE_RECORD'              // Better than last year
  | 'STAY_CLEAN'                  // No scandals
  | 'REDUCE_PAYROLL'              // Cut salary
  | 'SIGN_STAR'                   // Sign a marquee player
  | 'DEVELOP_YOUTH'               // Play young players
  | 'SELL_TICKETS'                // Fan engagement
  | 'MEDIA_FRIENDLY';             // Good press

/** Get relationship tier from patience and trust */
export function getOwnerRelationship(patience: number, trust: number): OwnerRelationship {
  const combined = (patience + trust) / 2;
  if (combined <= 20) return 'HOSTILE';
  if (combined <= 40) return 'STRAINED';
  if (combined <= 60) return 'NEUTRAL';
  if (combined <= 80) return 'TRUSTED';
  return 'GOLDEN_BOY';
}

// =============================================================================
// FRANCHISE SETTINGS
// =============================================================================

export interface FranchiseSettings {
  // Difficulty
  difficulty: DifficultyLevel;
  aiAggressiveness: 'LOW' | 'MEDIUM' | 'HIGH';

  // Game length
  quarterLength: number;          // Minutes
  seasonLength: 'SHORT' | 'STANDARD' | 'LONG';  // 6/8/12 games

  // Features
  enableCorruption: boolean;      // Can use dirty cards/bribes
  enableInvestigation: boolean;   // Heat system active
  enableOwnerDemands: boolean;    // Owner can fire you
  enablePlayerDrama: boolean;     // Player events

  // UI
  autoSave: boolean;
  showTutorials: boolean;
  skipAnimations: boolean;
}

export type DifficultyLevel =
  | 'EASY'                        // Forgiving, more resources
  | 'NORMAL'                      // Balanced
  | 'HARD'                        // Demanding owner, less money
  | 'LEGENDARY';                  // Maximum difficulty

export const DEFAULT_SETTINGS: FranchiseSettings = {
  difficulty: 'NORMAL',
  aiAggressiveness: 'MEDIUM',
  quarterLength: 4,
  seasonLength: 'STANDARD',
  enableCorruption: true,
  enableInvestigation: true,
  enableOwnerDemands: true,
  enablePlayerDrama: true,
  autoSave: true,
  showTutorials: true,
  skipAnimations: false,
};

// =============================================================================
// GAME OVER CONDITIONS
// =============================================================================

export type GameOverReason =
  | 'FIRED'                       // Owner lost patience
  | 'ARRESTED'                    // Heat reached 100
  | 'RESIGNED'                    // Player quit
  | 'RETIRED'                     // Chose to retire
  | 'BANNED'                      // League banned you
  | 'BANKRUPT';                   // Ran out of money

export interface GameOverState {
  reason: GameOverReason;
  finalSeason: number;
  careerRecord: { wins: number; losses: number };
  championships: number;
  finalHeat: number;
  epitaph: string;                // Summary of career
  canContinue: boolean;           // Some endings allow continue
}

/** Generate career epitaph */
export function generateEpitaph(
  reason: GameOverReason,
  championships: number,
  heat: number,
  integrity: number
): string {
  if (reason === 'ARRESTED') {
    return 'Your empire of corruption came crashing down. The feds got their man.';
  }
  if (reason === 'FIRED') {
    if (championships > 0) {
      return 'You won championships, but even champions can wear out their welcome.';
    }
    return 'The owner\'s patience ran out. Pack your desk.';
  }
  if (championships >= 3) {
    return 'A dynasty builder. Your legacy is cemented in history.';
  }
  if (championships > 0 && integrity > 70) {
    return 'A champion who did it the right way. Rare in this league.';
  }
  if (championships > 0 && heat > 50) {
    return 'You won, but at what cost? The whispers will follow you.';
  }
  if (integrity < 30) {
    return 'You played the game better than anyone... just not on the field.';
  }
  return 'Another coach in a long line of coaches. Forgettable.';
}

// =============================================================================
// HELPERS
// =============================================================================

/** Check if you're in danger of being fired */
export function isJobInDanger(owner: OwnerState): boolean {
  return owner.patience <= 30 || owner.relationshipTier === 'HOSTILE';
}

/** Check if investigation is serious */
export function isInvestigationSerious(hidden: HiddenState): boolean {
  return ['INVESTIGATION', 'GRAND_JURY', 'INDICTMENT'].includes(hidden.investigationStage);
}

/** Calculate heat decay */
export function calculateHeatDecay(hidden: HiddenState): number {
  // Heat decays if you stay clean
  if (hidden.consecutiveCleanWeeks >= 3) {
    return Math.min(5, hidden.heat * 0.1); // 10% or 5, whichever is less
  }
  return 0;
}

/** Get corruption risk description */
export function getCorruptionRiskDescription(heat: number): string {
  if (heat >= 80) return 'The feds are closing in. One more slip and it\'s over.';
  if (heat >= 60) return 'You\'re under investigation. Tread carefully.';
  if (heat >= 40) return 'People are asking questions. Maybe lay low.';
  if (heat >= 20) return 'There are whispers. Nothing concrete... yet.';
  return 'Clean as a whistle. For now.';
}
