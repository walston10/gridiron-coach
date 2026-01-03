/**
 * Event System Types
 *
 * Core types for the decision/event drama engine.
 * Players make 3-4 decisions per week across an 8-game season.
 */

import type { RosterPosition } from './Player';

// =============================================================================
// METERS
// =============================================================================

export interface Meters {
  reputation: number;    // 0-100, Clean (100) ↔ Corrupt (0)
  culture: number;       // 0-100, Players-first (100) ↔ Wins-first (0)
  image: number;         // 0-100, Beloved (100) ↔ Villain (0)
  risk: number;          // 0-100, Conservative (0) ↔ Reckless (100)
  playerTrust: number;   // 0-100, Locker room mood
}

export const DEFAULT_METERS: Meters = {
  reputation: 50,
  culture: 50,
  image: 50,
  risk: 50,
  playerTrust: 50,
};

// =============================================================================
// HIDDEN STATE
// =============================================================================

export interface DelayedEvent {
  type: DelayedEventType;
  chance: number;              // 0-1 probability
  triggersAtWeek: number;
  sourceEventId: string;
  sourceChoiceId: string;
}

export type DelayedEventType =
  | 'LEAK'
  | 'INVESTIGATION'
  | 'HOLDOUT'
  | 'LAWSUIT'
  | 'TRADE_DEMAND'
  | 'MORE_ACCUSERS';

export interface HiddenState {
  heat: number;                    // 0-100, FBI interest (starts at 0)
  ownerPatience: number;           // 0-100 (starts at 75)
  slushFund: number;               // $ available for bribes/payoffs
  delayedEvents: DelayedEvent[];
}

export const DEFAULT_HIDDEN_STATE: HiddenState = {
  heat: 0,
  ownerPatience: 75,
  slushFund: 0,  // Set based on owner
  delayedEvents: [],
};

// Heat thresholds
export const HEAT_THRESHOLDS = {
  COMPLIANCE_WARNING: 30,
  FBI_TIP: 50,
  INVESTIGATION: 75,
  INDICTED: 100,
} as const;

// =============================================================================
// PLAYER STATUS
// =============================================================================

export type PlayerStatus =
  | 'HEALTHY'
  | 'UNHAPPY'
  | 'SUSPENDED'
  | 'INJURED'
  | 'HOT_STREAK'
  | 'DISTRACTION'
  | 'UNDER_INVESTIGATION';

export interface PlayerStatusUpdate {
  playerId: string | 'RANDOM' | 'CONTEXT';
  status: PlayerStatus;
  weeks?: number;
}

// =============================================================================
// WEEKLY CALENDAR
// =============================================================================

export type DayOfWeek =
  | 'MONDAY'      // Aftermath - Film review, injury reveals, media fallout
  | 'TUESDAY'     // Practice - Reps decisions, player conflicts
  | 'WEDNESDAY'   // Business - Agent calls, trade offers, league memos
  | 'THURSDAY'    // Preparation - Final injury decisions, locker room
  | 'FRIDAY'      // Media Day - Press conferences, interviews
  | 'SATURDAY'    // Final Prep - Last minute issues, shady offers
  | 'SUNDAY';     // GAME DAY

export const DAYS_IN_ORDER: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
];

export const DAY_DESCRIPTIONS: Record<DayOfWeek, string> = {
  MONDAY: 'Aftermath',
  TUESDAY: 'Practice',
  WEDNESDAY: 'Business',
  THURSDAY: 'Preparation',
  FRIDAY: 'Media Day',
  SATURDAY: 'Final Prep',
  SUNDAY: 'Game Day',
};

// =============================================================================
// EVENT CHARACTER
// =============================================================================

export type EventCharacter =
  | 'OWNER'
  | 'PLAYER'
  | 'AGENT'
  | 'REPORTER'
  | 'SHADY_FIGURE'
  | 'DOCTOR'
  | 'LEAGUE_REP';

// =============================================================================
// SHADY ACTION TYPES
// =============================================================================

export type ShadyActionType =
  | 'BRIBE_REF'
  | 'PAYOFF_ACCUSER'
  | 'PED_PROGRAM'
  | 'POINT_SHAVING'
  | 'KILL_STORY'
  | 'FAKE_INJURY';

export type ShadyActionCounts = Record<ShadyActionType, number>;

export const DEFAULT_SHADY_ACTION_COUNTS: ShadyActionCounts = {
  BRIBE_REF: 0,
  PAYOFF_ACCUSER: 0,
  PED_PROGRAM: 0,
  POINT_SHAVING: 0,
  KILL_STORY: 0,
  FAKE_INJURY: 0,
};

// =============================================================================
// EVENT CONSEQUENCES
// =============================================================================

export interface Consequences {
  reputation?: number;
  culture?: number;
  image?: number;
  risk?: number;
  playerTrust?: number;
  heat?: number;
  ownerPatience?: number;
  playerStatus?: PlayerStatusUpdate;
  slushFund?: number;  // Direct slush fund change (not cost)
  effect?: EffectApplication;  // Apply an effect to a player
}

export interface FailureConsequences extends Consequences {
  description: string;
}

export interface DelayedConsequence {
  type: DelayedEventType;
  chance: number;        // 0-1
  minWeeks: number;
  maxWeeks: number;
}

// =============================================================================
// EVENT PREREQUISITES
// =============================================================================

export interface EventPrerequisites {
  minWeek?: number;
  maxWeek?: number;
  maxHeat?: number;
  minHeat?: number;
  minCorruption?: number;     // reputation below this
  requiresPlayer?: boolean;
  ownerOnly?: string;         // owner id
  requiresStatus?: PlayerStatus;
  minSlushFund?: number;
  dayAfterLoss?: boolean;
  dayAfterWin?: boolean;
}

// =============================================================================
// CHOICE
// =============================================================================

export interface Choice {
  id: string;
  text: string;
  flavorText?: string;

  // Immediate costs
  cost?: number;

  // Success rate (0-1, defaults to 1.0)
  successRate?: number;

  // What type of shady action (for diminishing returns)
  shadyActionType?: ShadyActionType;

  // Consequences on success
  consequences: Consequences;

  // Consequences on failure
  failureConsequences?: FailureConsequences;

  // Delayed consequences
  delayed?: DelayedConsequence;

  // Tags for UI
  tags?: ('SHADY' | 'EXPENSIVE' | 'RISKY' | 'SAFE' | 'MORAL')[];
}

// =============================================================================
// EVENT
// =============================================================================

export type EventRarity = 'COMMON' | 'UNCOMMON' | 'RARE';

export interface GameEvent {
  id: string;
  title: string;
  day: DayOfWeek;
  rarity: EventRarity;
  character: EventCharacter;
  description: string;
  prerequisites?: EventPrerequisites;
  cooldown: number;  // Can't fire again for X weeks
  choices: Choice[];

  // Optional: specific player this event targets
  targetPosition?: RosterPosition;
}

// =============================================================================
// EVENT STATE
// =============================================================================

export interface EventSystemState {
  currentDay: DayOfWeek;
  currentWeek: number;
  meters: Meters;
  hidden: HiddenState;
  shadyActionCounts: ShadyActionCounts;
  usedEventIds: string[];           // Events that have fired
  eventCooldowns: Record<string, number>;  // eventId -> week when available
  didShadyActionThisWeek: boolean;
  hadScandalThisWeek: boolean;
  mediaAppearancesThisWeek: number;
  lastGameWon: boolean | null;
}

export const DEFAULT_EVENT_STATE: Omit<EventSystemState, 'hidden'> = {
  currentDay: 'MONDAY',
  currentWeek: 1,
  meters: DEFAULT_METERS,
  shadyActionCounts: DEFAULT_SHADY_ACTION_COUNTS,
  usedEventIds: [],
  eventCooldowns: {},
  didShadyActionThisWeek: false,
  hadScandalThisWeek: false,
  mediaAppearancesThisWeek: 0,
  lastGameWon: null,
};

// =============================================================================
// CHOICE RESULT
// =============================================================================

export interface ChoiceResult {
  success: boolean;
  reason?: 'INSUFFICIENT_FUNDS' | 'PREREQUISITES_NOT_MET';
  flavorText?: string;
  meterChanges?: Partial<Meters>;
  heatChange?: number;
  patienceChange?: number;
}

// =============================================================================
// PLAYER EFFECTS (Active modifiers from events)
// =============================================================================

/**
 * Duration types for player effects
 * - halves: In-game duration (1 = rest of this half, 2 = full game)
 * - games: Number of games (including current if mid-game)
 * - weeks: Number of weeks (injuries, suspensions)
 * - season: Lasts entire season
 * - permanent: Never expires (rare - trades, career-ending)
 */
export type EffectDuration =
  | { type: 'halves'; remaining: number }
  | { type: 'games'; remaining: number }
  | { type: 'weeks'; remaining: number }
  | { type: 'season' }
  | { type: 'permanent' };

/**
 * Effect types determine how the effect impacts gameplay
 * - INJURY: Player unavailable, may play through with penalties
 * - SUSPENSION: Player unavailable (league/team imposed)
 * - BOOST: Positive stat modifiers (PEDs, hot streak, motivated)
 * - DEBUFF: Negative stat modifiers (fatigue, distraction, playing hurt)
 * - UNAVAILABLE: Benched/held out (coach decision, not injury)
 */
export type EffectType = 'INJURY' | 'SUSPENSION' | 'BOOST' | 'DEBUFF' | 'UNAVAILABLE';

/**
 * Stat modifiers - can be positive or negative
 * Only includes stats that make sense to modify temporarily
 */
export interface StatModifiers {
  speed?: number;
  acceleration?: number;
  strength?: number;
  agility?: number;
  stamina?: number;
  toughness?: number;
  awareness?: number;
  discipline?: number;
  composure?: number;
  catching?: number;
  carrying?: number;
  throwPower?: number;
  throwAccuracy?: number;
  routeRunning?: number;
  passBlock?: number;
  runBlock?: number;
  tackle?: number;
  coverage?: number;
  passRush?: number;
  elusiveness?: number;
}

/**
 * Active effect on a player
 */
export interface PlayerEffect {
  id: string;
  playerId: string;
  type: EffectType;
  source: string;           // Event ID that caused this
  sourceChoice: string;     // Choice ID that was selected
  duration: EffectDuration;
  statModifiers?: StatModifiers;
  description: string;      // "Hamstring strain", "PED boost", "Benched for attitude"
  canPlayThrough?: boolean; // For injuries - can player choose to play hurt?
  playingThrough?: boolean; // Is player currently playing through this?
  severity?: 'MINOR' | 'MODERATE' | 'SEVERE'; // For injuries
  createdAt: {
    week: number;
    day: DayOfWeek;
  };
}

/**
 * Effect to apply from an event choice
 * Used in Consequences to define what effect to create
 */
export interface EffectApplication {
  type: EffectType;
  duration: EffectDuration;
  statModifiers?: StatModifiers;
  description: string;
  canPlayThrough?: boolean;
  severity?: 'MINOR' | 'MODERATE' | 'SEVERE';
  // Target - who gets the effect
  target: 'CONTEXT' | 'RANDOM_STARTER' | 'RANDOM_POSITION' | string; // playerId or special
  targetPosition?: RosterPosition; // If RANDOM_POSITION
}
