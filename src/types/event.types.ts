/**
 * ILLEGAL MOTION - Event Types
 *
 * Weekly event system for the satirical management layer.
 * GTA-style tone with corruption, scandals, and drama.
 *
 * Structure:
 * - 1-2 events per week (between games)
 * - Events present choices with consequences
 * - Choices affect meters, heat, players, and deck
 */

// =============================================================================
// EVENT CATEGORIES
// =============================================================================

/**
 * Main event categories.
 * Each category has a distinct tone and consequence type.
 */
export type EventCategory =
  | 'SCANDAL'             // Player misconduct, off-field incidents
  | 'CORRUPTION'          // Bribes, fixes, shady deals
  | 'OWNER_DEMAND'        // Owner wants something (win, fire someone, etc.)
  | 'MEDIA'               // Press conferences, interviews, rumors
  | 'PLAYER_ISSUE'        // Holdouts, disputes, distractions
  | 'LEAGUE_ACTION'       // Suspensions, investigations, fines
  | 'OPPORTUNITY'         // Positive events (endorsements, trades)
  | 'RANDOM';             // Chaos events (weather, injuries, etc.)

// =============================================================================
// EVENT CHARACTERS
// =============================================================================

/**
 * Who is presenting the event.
 * Affects tone and visuals.
 */
export type EventCharacter =
  | 'OWNER'               // Team owner - demands, threats, praise
  | 'PLAYER'              // A specific player - complaints, requests
  | 'AGENT'               // Player's agent - contract issues
  | 'REPORTER'            // Media member - questions, rumors
  | 'FIXER'               // Shady contact - corruption opportunities
  | 'LEAGUE_OFFICIAL'     // Commissioner's office - discipline
  | 'LAWYER'              // Legal issues - settlements, lawsuits
  | 'DOCTOR'              // Injury news, PED questions
  | 'DETECTIVE'           // Investigation progress
  | 'ANONYMOUS';          // Unknown source - leaks, tips

export interface EventCharacterProfile {
  type: EventCharacter;
  name: string;
  title?: string;
  portraitUrl?: string;
  relationship: number;     // -100 to 100, how they feel about GM
}

// =============================================================================
// EVENT STRUCTURE
// =============================================================================

export interface GameEvent {
  id: string;
  category: EventCategory;
  character: EventCharacter;

  // Content
  title: string;                  // "STAR WR CAUGHT AT NIGHTCLUB"
  headline: string;               // Newspaper-style headline
  description: string;            // Full event description
  flavorText?: string;            // Satirical commentary

  // Involved parties
  involvedPlayerId?: string;      // Player this is about (if any)
  involvedTeamId?: string;        // Other team involved (if any)

  // Choices
  choices: EventChoice[];

  // Requirements to trigger
  prerequisites?: EventPrerequisites;

  // Timing
  rarity: EventRarity;
  cooldownWeeks: number;          // Can't trigger again for X weeks

  // Tags for filtering/UI
  tags: EventTag[];

  // Visual
  imageUrl?: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export type EventRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'UNIQUE';

export type EventTag =
  | 'SHADY'               // Involves corruption
  | 'LEGAL'               // Legal implications
  | 'MONEY'               // Financial impact
  | 'PLAYER_HEALTH'       // Injury/substance related
  | 'MORALE'              // Affects team chemistry
  | 'MEDIA_CIRCUS'        // High profile
  | 'TIME_SENSITIVE'      // Must respond quickly
  | 'OWNER_INVOLVED'      // Owner is watching
  | 'CAREER_DEFINING';    // Major consequences

// =============================================================================
// EVENT PREREQUISITES
// =============================================================================

export interface EventPrerequisites {
  // Week requirements
  minWeek?: number;
  maxWeek?: number;

  // Meter requirements
  minReputation?: number;
  maxReputation?: number;
  minHeat?: number;
  maxHeat?: number;
  minOwnerPatience?: number;
  maxOwnerPatience?: number;

  // Record requirements
  requiresWinStreak?: number;
  requiresLossStreak?: number;
  minWins?: number;
  maxWins?: number;

  // Player requirements
  requiresSpecificPlayer?: string;   // Player ID
  requiresPosition?: string;         // Any player at position
  requiresHighEgo?: boolean;         // Player with ego > 70
  requiresVice?: boolean;            // Player with vice > 60

  // Situation requirements
  requiresPlayoffs?: boolean;
  requiresLastPlace?: boolean;
  requiresFirstPlace?: boolean;
  afterLoss?: boolean;
  afterWin?: boolean;
  afterBlowout?: boolean;

  // Previous event requirements
  requiresPreviousEvent?: string;    // Must have seen this event first
  excludeIfEventSeen?: string;       // Can't trigger if this was seen
}

// =============================================================================
// EVENT CHOICES
// =============================================================================

export interface EventChoice {
  id: string;
  text: string;                       // "Pay them off" / "Let it leak"
  description: string;                // What this choice entails
  buttonText: string;                 // Short button label

  // Costs
  moneyCost?: number;                 // Salary cap / slush fund cost
  slushFundCost?: number;             // Specifically from slush fund

  // Success rate (some choices aren't guaranteed)
  successRate?: number;               // 0-100, default 100

  // Consequences
  consequences: EventConsequences;
  failureConsequences?: EventConsequences;

  // Requirements to show this choice
  requiresSlushFund?: number;         // Need this much in slush fund
  requiresReputation?: number;        // Need this reputation level
  requiresHeat?: number;              // Max heat to attempt

  // Tags
  tags?: ('SHADY' | 'EXPENSIVE' | 'RISKY' | 'SAFE' | 'MORAL' | 'IMMORAL')[];

  // Follow-up
  triggersEvent?: string;             // Event ID to trigger later
  delayedConsequences?: DelayedConsequence;
}

// =============================================================================
// CONSEQUENCES
// =============================================================================

export interface EventConsequences {
  // Meter changes (-100 to +100)
  reputation?: number;
  playerMorale?: number;
  fanApproval?: number;
  mediaPerception?: number;
  ownerPatience?: number;

  // Hidden meter changes
  heat?: number;                      // Investigation heat
  slushFund?: number;                 // Money change

  // Player effects
  playerEffects?: PlayerEventEffect[];

  // Card effects
  cardEffects?: CardEventEffect[];

  // Special effects
  suspensionWeeks?: number;           // Player suspension
  fineAmount?: number;
  firingRisk?: boolean;               // Owner considers firing you

  // Flavor
  newsHeadline?: string;              // What the media says
  resultText: string;                 // What happened
}

export interface PlayerEventEffect {
  playerId: string | 'INVOLVED' | 'RANDOM' | 'STAR';
  effect: PlayerEffect;
}

export type PlayerEffect =
  | { type: 'INJURY'; weeks: number; severity: string }
  | { type: 'SUSPENSION'; weeks: number; reason: string }
  | { type: 'HOLDOUT'; reason: string }
  | { type: 'BOOST'; stat: string; amount: number; weeks: number }
  | { type: 'DEBUFF'; stat: string; amount: number; weeks: number }
  | { type: 'MORALE'; change: number }
  | { type: 'TRUST_CHANGE'; change: number }
  | { type: 'TRADE_DEMAND' }
  | { type: 'RETIRE' };

export interface CardEventEffect {
  type: 'ADD_CARD' | 'REMOVE_CARD' | 'UPGRADE_CARD' | 'DOWNGRADE_CARD';
  cardId?: string;
  cardType?: string;
  quantity?: number;
  duration?: 'GAME' | 'WEEK' | 'SEASON';
}

// =============================================================================
// DELAYED CONSEQUENCES
// =============================================================================

export interface DelayedConsequence {
  type: DelayedEventType;
  triggerWeek: number;                // Which week it triggers
  chance: number;                     // 0-100 probability
  consequences: EventConsequences;
  description: string;                // "The story might leak..."
}

export type DelayedEventType =
  | 'STORY_LEAK'            // Paid-off story surfaces
  | 'INVESTIGATION'         // Heat builds into investigation
  | 'LAWSUIT'               // Legal action
  | 'RELAPSE'               // Player problem resurfaces
  | 'REVENGE'               // Wronged party strikes back
  | 'WITNESS'               // Someone talks
  | 'AUDIT'                 // Financial review
  | 'EXPOSE';               // Media exposé

// =============================================================================
// EVENT STATE
// =============================================================================

export interface EventSystemState {
  // Current week's events
  currentEvents: GameEvent[];
  pendingChoices: PendingEventChoice[];

  // Event history
  completedEvents: CompletedEvent[];
  declinedEvents: string[];           // Event IDs skipped

  // Tracking
  eventsThisWeek: number;
  totalEventsThisSeason: number;
  shadyChoicesMade: number;

  // Cooldowns
  eventCooldowns: Map<string, number>;  // Event ID -> week available

  // Delayed events
  pendingDelayedEvents: ScheduledDelayedEvent[];

  // Relationships
  characterRelationships: Map<EventCharacter, number>;
}

export interface PendingEventChoice {
  eventId: string;
  choiceId: string;
  expiresAt?: number;                 // Some choices expire
}

export interface CompletedEvent {
  eventId: string;
  choiceId: string;
  week: number;
  success: boolean;
  consequencesApplied: EventConsequences;
  newsGenerated?: string;
}

export interface ScheduledDelayedEvent {
  id: string;
  sourceEventId: string;
  sourceChoiceId: string;
  triggerWeek: number;
  type: DelayedEventType;
  chance: number;
  consequences: EventConsequences;
}

// =============================================================================
// SPECIFIC EVENT TYPES
// =============================================================================

// --- Scandal Events ---
export interface ScandalEvent extends GameEvent {
  category: 'SCANDAL';
  scandalType: ScandalType;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CATASTROPHIC';
  canBeCoveredUp: boolean;
  coverUpCost?: number;
}

export type ScandalType =
  | 'DUI'
  | 'ASSAULT'
  | 'SUBSTANCE_ABUSE'
  | 'GAMBLING'
  | 'DOMESTIC'
  | 'SOCIAL_MEDIA'
  | 'NIGHTCLUB_INCIDENT'
  | 'FINANCIAL_FRAUD'
  | 'ACADEMIC_FRAUD'
  | 'PED_USE';

// --- Corruption Events ---
export interface CorruptionEvent extends GameEvent {
  category: 'CORRUPTION';
  corruptionType: CorruptionType;
  payoff: number;                     // What you gain
  risk: number;                       // Heat if caught
  fixerName?: string;
}

export type CorruptionType =
  | 'BRIBE_OFFICIAL'          // Pay off ref/league official
  | 'POINT_SHAVING'           // Manipulate final score
  | 'INJURY_BOUNTY'           // Incentivize injuring opponent
  | 'SIGNAL_STEALING'         // Get opponent's plays
  | 'RECRUIT_TAMPERING'       // Illegal contact with players
  | 'SALARY_CAP_CHEAT'        // Hide money
  | 'PED_PROGRAM'             // Systematic doping
  | 'WITNESS_TAMPERING'       // Shut someone up
  | 'EVIDENCE_DESTRUCTION';   // Cover tracks

// --- Owner Demand Events ---
export interface OwnerDemandEvent extends GameEvent {
  category: 'OWNER_DEMAND';
  demandType: OwnerDemandType;
  deadline?: number;                  // Week to complete by
  patienceCost: number;               // Owner patience lost if failed
  rewardPatience?: number;            // Patience gained if successful
}

export type OwnerDemandType =
  | 'WIN_GAMES'               // Win X games
  | 'MAKE_PLAYOFFS'           // Make playoffs
  | 'CUT_PLAYER'              // Get rid of someone
  | 'SIGN_STAR'               // Sign a specific type of player
  | 'REDUCE_PAYROLL'          // Cut costs
  | 'WIN_DIVISION'            // Division title
  | 'CHAMPIONSHIP'            // Win it all
  | 'FIRE_STAFF'              // Fire coordinator
  | 'MEDIA_APPEARANCE'        // Do press
  | 'APPEASE_SPONSORS';       // Marketing demand

// --- League Action Events ---
export interface LeagueActionEvent extends GameEvent {
  category: 'LEAGUE_ACTION';
  actionType: LeagueActionType;
  targetPlayerId?: string;
  suspensionLength?: number;
  fineAmount?: number;
  canAppeal: boolean;
  appealCost?: number;
  appealSuccessRate?: number;
}

export type LeagueActionType =
  | 'PLAYER_SUSPENSION'
  | 'TEAM_FINE'
  | 'DRAFT_PICK_LOSS'
  | 'INVESTIGATION_OPENED'
  | 'INVESTIGATION_CLOSED'
  | 'SALARY_CAP_PENALTY'
  | 'EQUIPMENT_VIOLATION'
  | 'CONDUCT_REVIEW';

// =============================================================================
// EVENT GENERATION
// =============================================================================

export interface EventGenerationConfig {
  minEventsPerWeek: number;           // Default 1
  maxEventsPerWeek: number;           // Default 2
  scandalWeight: number;              // Likelihood of scandal
  corruptionWeight: number;           // Likelihood of corruption offer
  ownerDemandWeight: number;
  mediaWeight: number;
  playerIssueWeight: number;

  // Modifiers based on state
  heatCorruptionMultiplier: number;   // More heat = fewer corruption offers
  losingStreakDramaMultiplier: number;// Losing = more drama
  winningBonus: boolean;              // Good events when winning
}

export const DEFAULT_EVENT_CONFIG: EventGenerationConfig = {
  minEventsPerWeek: 1,
  maxEventsPerWeek: 2,
  scandalWeight: 25,
  corruptionWeight: 15,
  ownerDemandWeight: 20,
  mediaWeight: 20,
  playerIssueWeight: 15,
  heatCorruptionMultiplier: 0.8,
  losingStreakDramaMultiplier: 1.5,
  winningBonus: true,
};

// =============================================================================
// HELPERS
// =============================================================================

/** Get urgency color */
export const URGENCY_COLORS: Record<string, string> = {
  LOW: '#6B7280',       // Gray
  MEDIUM: '#F59E0B',    // Amber
  HIGH: '#EF4444',      // Red
  CRITICAL: '#DC2626',  // Dark red
};

/** Get category icon */
export const CATEGORY_ICONS: Record<EventCategory, string> = {
  SCANDAL: '🚨',
  CORRUPTION: '💰',
  OWNER_DEMAND: '👔',
  MEDIA: '📰',
  PLAYER_ISSUE: '😤',
  LEAGUE_ACTION: '⚖️',
  OPPORTUNITY: '✨',
  RANDOM: '🎲',
};

/** Check if choice is shady */
export function isShadyChoice(choice: EventChoice): boolean {
  return choice.tags?.includes('SHADY') || choice.slushFundCost !== undefined;
}

/** Calculate total heat from event */
export function calculateEventHeat(
  event: GameEvent,
  choice: EventChoice,
  success: boolean
): number {
  let heat = 0;

  if (success) {
    heat += choice.consequences.heat || 0;
  } else if (choice.failureConsequences) {
    heat += choice.failureConsequences.heat || 0;
  }

  // Bonus heat for certain event types
  if (event.category === 'CORRUPTION') heat *= 1.5;
  if (event.tags.includes('SHADY')) heat *= 1.2;

  return Math.round(heat);
}
