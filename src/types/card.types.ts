/**
 * ILLEGAL MOTION - Card Types
 *
 * Cards are the core gameplay mechanic. Players generate cards.
 * You play cards (not control players) to execute plays.
 *
 * Card Categories:
 * - OFFENSIVE: Plays your offense can run (pass, run, trick)
 * - DEFENSIVE: Responses/predictions (coverage, blitz, contain)
 * - DIRTY: Illegal/shady in-game actions (late hits, bribes, fake injuries)
 */

// =============================================================================
// CARD RARITY
// =============================================================================

/**
 * Card rarity affects draw frequency and power level.
 * Better players generate higher rarity cards.
 */
export type CardRarity =
  | 'COMMON'          // Basic plays, reliable but predictable
  | 'UNCOMMON'        // Solid plays with situational bonuses
  | 'RARE'            // Strong plays, harder to counter
  | 'ELITE'           // Game-changing plays from star players
  | 'LEGENDARY';      // Once-per-game potential, signature moves

export const RARITY_DRAW_WEIGHTS: Record<CardRarity, number> = {
  COMMON: 40,
  UNCOMMON: 30,
  RARE: 20,
  ELITE: 8,
  LEGENDARY: 2,
};

// =============================================================================
// CARD CATEGORIES
// =============================================================================

export type CardCategory = 'OFFENSIVE' | 'DEFENSIVE' | 'DIRTY';

// =============================================================================
// OFFENSIVE CARDS
// =============================================================================

/** Types of offensive plays */
export type OffensivePlayType =
  // Pass plays
  | 'SHORT_PASS'        // Quick, high percentage
  | 'MEDIUM_PASS'       // Standard routes
  | 'DEEP_PASS'         // Big play potential, lower percentage
  | 'SCREEN'            // RB/WR screens
  | 'PLAY_ACTION'       // Fake run, pass
  // Run plays
  | 'INSIDE_RUN'        // Between the tackles
  | 'OUTSIDE_RUN'       // Sweeps, tosses
  | 'POWER_RUN'         // North-south, physical
  | 'DRAW'              // Delayed run
  // Trick plays
  | 'TRICK_PLAY'        // Reverses, flea flickers, etc.
  | 'QB_RUN'            // Designed QB runs
  // Special
  | 'SPIKE'             // Stop clock (no card cost)
  | 'KNEEL';            // Run out clock (no card cost)

/** Formation the card uses */
export type Formation =
  | 'SHOTGUN'
  | 'UNDER_CENTER'
  | 'PISTOL'
  | 'EMPTY'
  | 'I_FORM'
  | 'SINGLEBACK'
  | 'GOAL_LINE'
  | 'WILDCAT';

/** An offensive card */
export interface OffensiveCard {
  id: string;
  category: 'OFFENSIVE';
  name: string;                     // "Slant Route", "Power O", "Hail Mary"
  description: string;              // Flavor text
  playType: OffensivePlayType;
  formation: Formation;
  rarity: CardRarity;

  // Core stats
  baseYards: number;                // Expected yards on success
  successChance: number;            // Base percentage (0-100)
  bigPlayChance: number;            // Chance of bonus yards (0-100)
  turnoverRisk: number;             // INT/fumble risk (0-100)

  // Situational modifiers
  situationBonuses: SituationBonus[];

  // Requirements/costs
  staminaCost: number;              // Fatigue on players
  requiresLead: boolean;            // Some plays only work when ahead
  requiresDeficit: boolean;         // Desperation plays

  // Counters
  strongAgainst: DefensivePlayType[];   // Bonuses vs these defenses
  weakAgainst: DefensivePlayType[];     // Penalties vs these defenses

  // Source
  generatedBy: string;              // Player ID who contributes this card
  playerBonus?: string;             // "Mahomes: +15% deep accuracy"

  // Visual
  artworkUrl?: string;
}

// =============================================================================
// DEFENSIVE CARDS
// =============================================================================

/** Types of defensive plays */
export type DefensivePlayType =
  // Coverage
  | 'MAN_COVERAGE'        // Tight coverage, good vs short/medium
  | 'ZONE_COVERAGE'       // Read and react, balanced
  | 'DEEP_ZONE'           // Prevent, good vs deep balls
  | 'PRESS_COVERAGE'      // Jam at line, risky vs speed
  // Pressure
  | 'BLITZ'               // Extra rushers, high risk/reward
  | 'ZONE_BLITZ'          // Blitz with zone behind
  | 'CONTAIN'             // Prevent outside runs, QB scrambles
  | 'SPY'                 // Defender watches QB
  // Run defense
  | 'STACK_THE_BOX'       // Extra defenders in box, weak vs pass
  | 'GOAL_LINE_STAND'     // Max run defense
  // Special
  | 'PREVENT'             // Ultra-safe, gives up yards
  | 'GUESS_PLAY';         // Risky prediction for big reward

/** A defensive card */
export interface DefensiveCard {
  id: string;
  category: 'DEFENSIVE';
  name: string;                     // "Cover 2", "All-Out Blitz", "Tampa 2"
  description: string;
  playType: DefensivePlayType;
  rarity: CardRarity;

  // Core stats
  runStopRating: number;            // Effectiveness vs run (0-100)
  passDefenseRating: number;        // Effectiveness vs pass (0-100)
  pressureRating: number;           // QB pressure generated (0-100)
  bigPlayAllowed: number;           // Risk of giving up big play (0-100)

  // Situational modifiers
  situationBonuses: SituationBonus[];

  // Prediction bonus (defensive mechanic)
  predictionBonus: number;          // Bonus if you correctly guess play type

  // Counters
  strongAgainst: OffensivePlayType[];
  weakAgainst: OffensivePlayType[];

  // Source
  generatedBy: string;              // Player/unit ID
  playerBonus?: string;             // "Revis Island: +20% vs WR1"

  artworkUrl?: string;
}

// =============================================================================
// DIRTY CARDS
// =============================================================================

/**
 * Dirty cards are illegal/shady in-game actions.
 * High reward but risky - can get caught, add heat.
 */
export type DirtyPlayType =
  // Physical
  | 'LATE_HIT'            // Injure opponent after whistle
  | 'CHEAP_SHOT'          // Target star player
  | 'HOLD'                // Guaranteed blocking, penalty risk
  | 'PASS_INTERFERENCE'   // Break up any pass, penalty risk
  // Deception
  | 'FAKE_INJURY'         // Stop clock, slow momentum
  | 'FLOP'                // Draw penalty on opponent
  | 'HIDDEN_BALL'         // Trick play with misdirection
  // Corruption
  | 'BRIBE_REF'           // Favorable call
  | 'SIGNAL_STEAL'        // Know opponent's play
  | 'TAMPER_BALL'         // Deflated, sticky, etc.
  // Intimidation
  | 'BOUNTY'              // Incentivize injuring opponent
  | 'TAUNT'               // Draw unsportsmanlike, but fires up team
  | 'MIND_GAMES';         // Pre-snap deception

/** A dirty card */
export interface DirtyCard {
  id: string;
  category: 'DIRTY';
  name: string;                     // "The Cheapshot", "Ref's Retirement Fund"
  description: string;              // Satirical flavor text
  playType: DirtyPlayType;
  rarity: CardRarity;

  // Effect
  effect: DirtyCardEffect;

  // Risk
  penaltyChance: number;            // Chance of flag (0-100)
  penaltyYards: number;             // If caught, penalty yards
  ejectionChance: number;           // Chance of player ejection
  heatGenerated: number;            // Investigation heat added
  reputationCost: number;           // Public image damage

  // Cost
  slushFundCost?: number;           // Bribes cost money
  staminaCost: number;

  // Requirements
  requiresPlayer?: string;          // Specific player type needed
  canOnlyUseOnce: boolean;          // Per game limitation

  // Flavor
  flavorText: string;               // "Everyone has a price..."
  artworkUrl?: string;
}

/** What a dirty card actually does */
export interface DirtyCardEffect {
  type: DirtyEffectType;
  value: number;                    // Amount/strength of effect
  target: DirtyCardTarget;
  duration?: number;                // Plays or quarters
}

export type DirtyEffectType =
  | 'BONUS_YARDS'           // Add yards to play
  | 'NEGATE_PLAY'           // Cancel opponent's play
  | 'INJURE_PLAYER'         // Target takes injury check
  | 'STOP_CLOCK'            // Fake injury clock stop
  | 'GUARANTEED_CALL'       // Next close call goes your way
  | 'SEE_OPPONENT_CARD'     // Preview their selection
  | 'DRAW_PENALTY'          // Opponent gets flagged
  | 'MOMENTUM_SHIFT'        // Swing momentum meter
  | 'FATIGUE_OPPONENT';     // Drain opponent stamina

export type DirtyCardTarget =
  | 'SELF'                  // Affects your team
  | 'OPPONENT'              // Affects opponent
  | 'SPECIFIC_PLAYER'       // Target a specific player
  | 'REFEREE'               // Affects officiating
  | 'BALL';                 // Affects the football

// =============================================================================
// SITUATION BONUSES
// =============================================================================

/** Situational modifiers that affect card effectiveness */
export interface SituationBonus {
  situation: GameSituation;
  modifier: number;                 // Positive or negative percentage
  description: string;              // "Red Zone: +15%"
}

export type GameSituation =
  // Field position
  | 'RED_ZONE'              // Inside 20
  | 'BACKED_UP'             // Inside own 10
  | 'MIDFIELD'              // 40-60 yard line
  // Down and distance
  | 'SHORT_YARDAGE'         // 3 or fewer to go
  | 'LONG_YARDAGE'          // 10+ to go
  | 'THIRD_DOWN'
  | 'FOURTH_DOWN'
  | 'FIRST_DOWN'
  // Game state
  | 'LEADING'
  | 'TRAILING'
  | 'CLOSE_GAME'            // Within 7 points
  | 'BLOWOUT'               // 21+ point difference
  // Time
  | 'TWO_MINUTE_WARNING'
  | 'FOURTH_QUARTER'
  | 'OVERTIME'
  // Momentum
  | 'HIGH_MOMENTUM'
  | 'LOW_MOMENTUM'
  // Opponent tendencies
  | 'OPPONENT_PREDICTABLE'  // They've been one-dimensional
  | 'OPPONENT_AGGRESSIVE';  // They've been blitzing a lot

// =============================================================================
// CARD UNION TYPE
// =============================================================================

export type Card = OffensiveCard | DefensiveCard | DirtyCard;

// =============================================================================
// CARD RESULT
// =============================================================================

/** Result of playing a card */
export interface CardPlayResult {
  cardPlayed: Card;
  opponentCard?: Card;              // What they played (defense sees offense, offense sees after)

  // Outcome
  success: boolean;
  yardsGained: number;
  bigPlay: boolean;                 // Significant extra yards
  turnover: boolean;
  turnoverType?: 'INTERCEPTION' | 'FUMBLE' | 'DOWNS';

  // Events
  touchdown: boolean;
  safety: boolean;
  penalty?: PenaltyResult;
  injury?: InjuryResult;

  // Dirty card outcomes
  dirtyCaught: boolean;             // Was the dirty play caught?
  heatGained: number;               // Investigation heat added

  // Aftermath
  newDown: number;
  newYardsToGo: number;
  newFieldPosition: number;
  momentumShift: number;            // -20 to +20 momentum change

  // Commentary
  playByPlay: string;               // "Jones takes the handoff..."
  flavorText?: string;              // Satirical commentary
}

export interface PenaltyResult {
  type: string;                     // "Holding", "Pass Interference"
  team: 'OFFENSE' | 'DEFENSE';
  yards: number;
  description: string;
  declined: boolean;
  offsetting: boolean;
}

export interface InjuryResult {
  playerId: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'SEASON_ENDING';
  bodyPart: string;
  weeksOut: number;
}

// =============================================================================
// CARD GENERATION
// =============================================================================

/** Template for generating cards from players */
export interface CardTemplate {
  id: string;
  name: string;
  category: CardCategory;
  playType: OffensivePlayType | DefensivePlayType | DirtyPlayType;

  // Requirements to generate
  requiredPosition: string;
  minimumOverall: number;           // Player must be this good

  // Base stats (modified by player ratings)
  baseStats: Partial<OffensiveCard | DefensiveCard | DirtyCard>;

  // How player ratings affect card
  ratingInfluences: RatingInfluence[];
}

export interface RatingInfluence {
  playerRating: string;             // "throwing", "speed", etc.
  affectedStat: string;             // Card stat to modify
  multiplier: number;               // How much the rating affects it
}

// =============================================================================
// HELPERS
// =============================================================================

/** Type guards */
export function isOffensiveCard(card: Card): card is OffensiveCard {
  return card.category === 'OFFENSIVE';
}

export function isDefensiveCard(card: Card): card is DefensiveCard {
  return card.category === 'DEFENSIVE';
}

export function isDirtyCard(card: Card): card is DirtyCard {
  return card.category === 'DIRTY';
}

/** Get card color based on rarity */
export const RARITY_COLORS: Record<CardRarity, string> = {
  COMMON: '#9CA3AF',      // Gray
  UNCOMMON: '#10B981',    // Green
  RARE: '#3B82F6',        // Blue
  ELITE: '#8B5CF6',       // Purple
  LEGENDARY: '#F59E0B',   // Gold
};

/** Get category color */
export const CATEGORY_COLORS: Record<CardCategory, string> = {
  OFFENSIVE: '#EF4444',   // Red (offense)
  DEFENSIVE: '#3B82F6',   // Blue (defense)
  DIRTY: '#1F2937',       // Dark (shady)
};
