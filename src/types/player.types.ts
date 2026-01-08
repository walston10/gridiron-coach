/**
 * ILLEGAL MOTION - Player Types
 *
 * Players generate cards for your deck. Better players = better cards.
 * Each position has specific ratings that influence card quality and effects.
 */

// =============================================================================
// POSITIONS
// =============================================================================

/** Offensive skill positions - each generates specific card types */
export type OffensePosition =
  | 'QB'      // Quarterback - pass play cards, scramble cards
  | 'RB'      // Running Back - rush cards, receiving cards
  | 'WR'      // Wide Receiver - route cards, big play potential
  | 'TE'      // Tight End - hybrid route/block cards
  | 'OL';     // Offensive Line (unit) - protection quality on all cards

/** Defensive positions - each generates defensive response cards */
export type DefensePosition =
  | 'DL'      // Defensive Line (unit) - pressure cards
  | 'LB'      // Linebacker - run stop and zone cards
  | 'CB'      // Cornerback - coverage cards
  | 'S';      // Safety - deep coverage and big hit cards

/** Special teams */
export type SpecialTeamsPosition = 'K' | 'P';

export type Position = OffensePosition | DefensePosition | SpecialTeamsPosition;

// =============================================================================
// PLAYER RATINGS
// =============================================================================

/**
 * Core ratings that affect card generation and quality.
 * Scale: 1-99 (50 = average NFL player)
 */
export interface PlayerRatings {
  // === Physical ===
  speed: number;          // Affects big play potential, breakaway ability
  strength: number;       // Blocking, tackling, breaking tackles
  agility: number;        // Route sharpness, elusiveness
  stamina: number;        // How many cards they can contribute per game

  // === Mental ===
  awareness: number;      // Reading defense/offense, card draw quality
  discipline: number;     // Avoiding penalties, staying in assignment
  clutch: number;         // Performance in critical situations

  // === Skills (position-specific relevance) ===
  throwing: number;       // QB only - pass accuracy and power
  catching: number;       // WR, TE, RB - reception success
  carrying: number;       // RB, WR - ball security, yards after contact
  blocking: number;       // OL, TE, RB - protection and run blocking
  passRush: number;       // DL, LB - getting to the QB
  coverage: number;       // CB, S, LB - defending passes
  tackling: number;       // All defense - bringing down ball carrier

  // === Intangibles (hidden drama stats) ===
  ego: number;            // 1-99: Humble (1) to Diva (99) - affects events
  loyalty: number;        // 1-99: Will they leak? Demand trades? Stay quiet?
  vice: number;           // 1-99: Susceptibility to scandals, temptations
}

/** Default ratings for position-based generation */
export const DEFAULT_RATINGS: PlayerRatings = {
  speed: 50,
  strength: 50,
  agility: 50,
  stamina: 50,
  awareness: 50,
  discipline: 50,
  clutch: 50,
  throwing: 50,
  catching: 50,
  carrying: 50,
  blocking: 50,
  passRush: 50,
  coverage: 50,
  tackling: 50,
  ego: 50,
  loyalty: 50,
  vice: 50,
};

// =============================================================================
// PLAYER STATUS
// =============================================================================

/** Current condition affecting availability and performance */
export type PlayerCondition =
  | 'HEALTHY'             // Normal performance
  | 'QUESTIONABLE'        // Minor issue, slight card quality penalty
  | 'INJURED'             // Out - no cards generated
  | 'SUSPENDED'           // League suspension - no cards
  | 'HOLDOUT'             // Contract dispute - no cards until resolved
  | 'HOT_STREAK'          // Bonus to card quality
  | 'SLUMP'               // Penalty to card quality
  | 'MOTIVATED'           // Post-event boost
  | 'DISTRACTED'          // Scandal fallout - reduced card quality
  | 'PLAYING_HURT';       // Available but with penalties (player's choice)

export interface PlayerStatus {
  condition: PlayerCondition;
  weeksRemaining?: number;      // For timed conditions
  reason?: string;              // "Hamstring", "PED Suspension", "Contract Dispute"
  cardQualityModifier: number;  // -20 to +20 on card generation
}

// =============================================================================
// CONTRACT
// =============================================================================

export interface Contract {
  yearsRemaining: number;
  salaryPerYear: number;        // Affects budget
  guaranteed: number;           // Dead cap if cut
  signingBonus: number;         // Already paid
  hasNoTradeClause: boolean;    // Drama potential
  hasOptionYear: boolean;       // Decision point
}

// =============================================================================
// PLAYER ENTITY
// =============================================================================

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;            // "The Bus", "Prime Time" - for flavor

  position: Position;
  age: number;
  experience: number;           // Years in league

  ratings: PlayerRatings;
  overall: number;              // Calculated composite (display purposes)
  potential: number;            // Development ceiling

  status: PlayerStatus;
  contract: Contract | null;    // Null = free agent

  // Card generation
  cardsGenerated: string[];     // IDs of cards this player contributes to deck
  cardContribution: number;     // How many cards per game (based on stamina/role)

  // Drama/Event properties
  personality: PlayerPersonality;
  scandalHistory: string[];     // Past event IDs involving this player
  trustInGM: number;            // 0-100, affects event outcomes

  // Visual
  portraitUrl?: string;
}

// =============================================================================
// PERSONALITY (affects events and card flavor)
// =============================================================================

export type PersonalityTrait =
  | 'TEAM_FIRST'          // Unlikely to cause drama, boosts morale events
  | 'DIVA'                // High ego events, but big play potential
  | 'QUIET_PROFESSIONAL'  // Low event frequency, consistent
  | 'MEDIA_DARLING'       // Frequent media events, image impacts
  | 'TROUBLEMAKER'        // High scandal potential, but "clutch" card bonus
  | 'LEADER'              // Affects team-wide events positively
  | 'PARTY_ANIMAL'        // Vice events, off-field incidents
  | 'DEVOUT'              // Resistant to corruption, but judgmental
  | 'MERCENARY'           // Money-focused events, holdout risk
  | 'LOYAL_SOLDIER';      // Will cover up scandals, takes one for team

export interface PlayerPersonality {
  primary: PersonalityTrait;
  secondary?: PersonalityTrait;
  quirk?: string;               // "Refuses to play on turf", "Superstitious about #13"
}

// =============================================================================
// ROSTER STRUCTURE
// =============================================================================

/**
 * Simplified roster for card game.
 * Smaller than real NFL - manageable deck building.
 */
export interface Roster {
  // Offense (generates offensive cards)
  offense: {
    QB: Player;                 // 1 starter
    RB: Player;                 // 1 starter
    WR: [Player, Player];       // 2 starters
    TE: Player;                 // 1 starter
    OL: OLineUnit;              // Composite unit
  };

  // Defense (generates defensive cards)
  defense: {
    DL: DLineUnit;              // Composite unit
    LB: [Player, Player];       // 2 starters
    CB: [Player, Player];       // 2 starters
    S: Player;                  // 1 starter (represents both safeties)
  };

  // Bench (backups, can be promoted)
  bench: Player[];

  // Practice squad (development, not in deck)
  practiceSquad: Player[];
}

// =============================================================================
// LINE UNITS (Composite players for O-Line and D-Line)
// =============================================================================

/**
 * O-Line is treated as a unit rather than individuals.
 * Affects protection quality on all offensive cards.
 */
export interface OLineUnit {
  id: string;
  name: string;                 // "The Hogs", "The Great Wall", etc.
  overall: number;              // Unit rating
  passBlockRating: number;      // Affects pass play success
  runBlockRating: number;       // Affects run play success
  personality?: string;         // "Blue collar", "Nasty streak"

  // Hidden individual for events (the "face" of the unit)
  captain: {
    firstName: string;
    lastName: string;
    ego: number;
    vice: number;
  };
}

/**
 * D-Line is treated as a unit.
 * Generates pressure-based defensive cards.
 */
export interface DLineUnit {
  id: string;
  name: string;                 // "The Fearsome Foursome", etc.
  overall: number;
  passRushRating: number;       // Affects sack cards
  runStopRating: number;        // Affects run defense cards
  personality?: string;

  captain: {
    firstName: string;
    lastName: string;
    ego: number;
    vice: number;
  };
}

// =============================================================================
// PLAYER HELPERS
// =============================================================================

/** Get display name */
export function getPlayerDisplayName(player: Player): string {
  return player.nickname
    ? `${player.firstName} "${player.nickname}" ${player.lastName}`
    : `${player.firstName} ${player.lastName}`;
}

/** Get short name for cards */
export function getPlayerShortName(player: Player): string {
  return `${player.firstName.charAt(0)}. ${player.lastName}`;
}

/** Check if player is available for deck generation */
export function isPlayerAvailable(player: Player): boolean {
  const unavailable: PlayerCondition[] = ['INJURED', 'SUSPENDED', 'HOLDOUT'];
  return !unavailable.includes(player.status.condition);
}

/** Check if player can be involved in events */
export function canBeInEvent(player: Player): boolean {
  // Only healthy or questionable players appear in events
  return ['HEALTHY', 'QUESTIONABLE', 'HOT_STREAK', 'MOTIVATED'].includes(player.status.condition);
}

/** Calculate card quality modifier from player overall and status */
export function getCardQualityModifier(player: Player): number {
  const baseModifier = Math.floor((player.overall - 50) / 5); // -10 to +10 from skill
  const statusModifier = player.status.cardQualityModifier;
  return baseModifier + statusModifier;
}

/** Position importance for salary calculations */
export const POSITION_VALUE_TIER: Record<Position, number> = {
  QB: 5,    // Most valuable
  WR: 4,
  CB: 4,
  RB: 3,
  TE: 3,
  S: 3,
  LB: 3,
  OL: 2,    // Units are valued differently
  DL: 2,
  K: 1,
  P: 1,
};

// =============================================================================
// DRAFT/SIGNING TYPES
// =============================================================================

export interface DraftProspect {
  player: Omit<Player, 'contract' | 'cardsGenerated' | 'scandalHistory' | 'trustInGM'>;
  scoutingGrade: number;        // What your scouts think (may be wrong)
  actualPotential: number;      // Hidden true potential
  redFlags: string[];           // "Character concerns", "Injury history"
  cost: number;                 // Draft capital or signing bonus
}

export interface FreeAgent {
  player: Omit<Player, 'contract'>;
  askingPrice: number;          // Per year
  yearsWanted: number;
  interest: number;             // 0-100, how interested in your team
  otherOffers: number;          // Competing teams (affects negotiation)
}
