/**
 * ILLEGAL MOTION - Offseason Types
 *
 * Multi-season progression through awards, contracts, free agency, draft, and camp.
 */

import type { Player, Position, Contract, PlayerRatings, PlayerPersonality, FreeAgent } from './player.types';

// =============================================================================
// OFFSEASON PHASES
// =============================================================================

export type OffseasonPhase =
  | 'SEASON_END'          // Awards, final stats, owner evaluation
  | 'PLAYER_CHANGES'      // Retirements, expirations, development
  | 'RESIGNING'           // Re-sign your expiring contracts
  | 'FREE_AGENCY_WAVE_1'  // Big names
  | 'FREE_AGENCY_WAVE_2'  // Solid starters
  | 'FREE_AGENCY_WAVE_3'  // Depth and bargains
  | 'PRE_DRAFT'           // Scouting period
  | 'DRAFT'               // Draft day
  | 'UDFA'                // Undrafted free agent signing
  | 'TRAINING_CAMP'       // Final roster cuts, development
  | 'COMPLETE';           // Ready for new season

// =============================================================================
// SEASON END TYPES
// =============================================================================

export interface SeasonAward {
  id: string;
  name: string;
  description: string;
  winnerId: string;        // Player or team ID
  winnerName: string;
  stat?: string;           // "4,500 yards", "45 TDs"
  isUserTeam: boolean;
}

export type AwardType =
  | 'MVP'
  | 'OFFENSIVE_PLAYER'
  | 'DEFENSIVE_PLAYER'
  | 'ROOKIE'
  | 'COMEBACK'
  | 'COACH'
  | 'EXECUTIVE';

export interface SeasonSummary {
  year: number;
  record: { wins: number; losses: number };
  playoffResult: string;
  awards: SeasonAward[];
  topPerformers: {
    passing: { playerId: string; name: string; yards: number };
    rushing: { playerId: string; name: string; yards: number };
    receiving: { playerId: string; name: string; yards: number };
    sacks: { playerId: string; name: string; count: number };
  };
  notableEvents: string[];
  ownerSatisfaction: number;   // 0-100
  jobSecure: boolean;
}

export interface OwnerEvaluation {
  satisfaction: number;        // 0-100
  message: string;
  demands: string[];           // Next season expectations
  budgetChange: number;        // +/- to slush fund
  trustChange: number;         // +/- to owner trust
  isFired: boolean;
  firingReason?: string;
}

// =============================================================================
// PLAYER CHANGES TYPES
// =============================================================================

export interface RetirementDecision {
  playerId: string;
  playerName: string;
  position: Position;
  age: number;
  overall: number;
  yearsPlayed: number;
  reason: 'AGE' | 'INJURY' | 'PERSONAL' | 'SCANDAL';
  announcement: string;
}

export interface ExpiringContract {
  playerId: string;
  playerName: string;
  position: Position;
  age: number;
  overall: number;
  previousSalary: number;
  marketValue: number;         // Estimated new contract value
  willingness: number;         // 0-100, how willing to re-sign
  otherInterest: number;       // How many other teams want them
}

export interface DevelopmentChange {
  playerId: string;
  playerName: string;
  position: Position;
  type: 'GROWTH' | 'REGRESSION' | 'BREAKOUT' | 'DECLINE';
  overallChange: number;       // +/- to overall
  ratingChanges: Partial<PlayerRatings>;
  reason: string;              // "Age decline", "Hard work", "Injury lingering"
}

// =============================================================================
// RE-SIGNING TYPES
// =============================================================================

export interface ResigningOffer {
  playerId: string;
  years: number;
  salaryPerYear: number;
  guaranteed: number;
  signingBonus: number;
}

export interface ResigningResult {
  playerId: string;
  playerName: string;
  accepted: boolean;
  reason?: string;             // If rejected: "Wanted more money", "Wants to test market"
  finalContract?: Contract;
}

// =============================================================================
// FREE AGENCY TYPES
// =============================================================================

export interface FreeAgentPool {
  wave: 1 | 2 | 3;
  available: OffseasonFreeAgent[];
  signed: string[];            // Player IDs already signed
  passed: string[];            // Player IDs you passed on
}

export interface OffseasonFreeAgent extends FreeAgent {
  tier: 'ELITE' | 'STARTER' | 'SOLID' | 'DEPTH' | 'CAMP_BODY';
  wave: 1 | 2 | 3;             // Which wave they become available
  daysOnMarket: number;        // How long available (urgency)
  competingOffers: number;     // Other teams interested
  isExPlayer: boolean;         // Was on your team last year
}

export interface FreeAgentOffer {
  playerId: string;
  years: number;
  salaryPerYear: number;
  guaranteed: number;
  signingBonus: number;
  role: 'STARTER' | 'BACKUP' | 'DEPTH';
}

export interface FreeAgentResult {
  playerId: string;
  playerName: string;
  signed: boolean;
  signedWith?: string;         // Team ID (could be you or another team)
  reason?: string;             // "Wanted more money", "Preferred other team"
  contract?: Contract;
}

// =============================================================================
// DRAFT TYPES
// =============================================================================

export interface DraftClass {
  year: number;
  prospects: DraftProspect[];
  scoutedPlayers: string[];    // Player IDs you've scouted
}

export interface DraftProspect {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  college: string;

  // Scouting info (revealed by spending resources)
  projectedRound: number;      // 1-5
  scoutingGrade: number;       // What scouts think (may be wrong)
  trueOverall: number;         // Actual rating (hidden until drafted)
  truePotential: number;       // Actual ceiling (hidden)

  ratings: Partial<PlayerRatings>;  // Partially revealed based on scouting

  // Flags
  redFlags: string[];          // "Character concerns", "Injury history"
  greenFlags: string[];        // "High motor", "Team captain"

  // Draft board
  isScounted: boolean;
  scoutingCost: number;        // How much to fully scout

  // Personality (partially revealed)
  personality?: PlayerPersonality;

  // Comparisons
  playerComparison?: string;   // "Plays like a young [famous player]"
}

export interface DraftPick {
  round: number;
  pick: number;
  overall: number;             // Overall pick number
  teamId: string;
  originalTeamId: string;      // In case of trade
  selectedPlayerId?: string;
  isTradeable: boolean;
}

export interface DraftSelection {
  pick: DraftPick;
  prospectId: string;
  teamId: string;
  prospect: DraftProspect;
}

// =============================================================================
// TRAINING CAMP TYPES
// =============================================================================

export interface TrainingCampPlayer {
  player: Player;
  isRookie: boolean;
  isBubble: boolean;           // On roster bubble
  campGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  development: number;         // +/- to ratings
  injuries: boolean;
  notes: string;
}

export interface RosterCut {
  playerId: string;
  playerName: string;
  position: Position;
  reason: 'PERFORMANCE' | 'CAP' | 'INJURY' | 'CHARACTER';
  severanceCost: number;       // Dead cap
}

export interface CampReport {
  standouts: TrainingCampPlayer[];
  disappointments: TrainingCampPlayer[];
  injuries: TrainingCampPlayer[];
  rosterDecisions: RosterCut[];
  teamChemistry: number;       // 0-100
  readyForSeason: boolean;
}

// =============================================================================
// OFFSEASON STATE
// =============================================================================

export interface OffseasonState {
  isActive: boolean;
  phase: OffseasonPhase;
  year: number;

  // Season End
  seasonSummary?: SeasonSummary;
  ownerEvaluation?: OwnerEvaluation;

  // Player Changes
  retirements: RetirementDecision[];
  expiringContracts: ExpiringContract[];
  developmentChanges: DevelopmentChange[];

  // Re-signing
  resigningDecisions: Map<string, 'SIGNED' | 'RELEASED' | 'PENDING'>;

  // Free Agency
  freeAgentPool: OffseasonFreeAgent[];
  currentWave: 1 | 2 | 3;
  signings: FreeAgentResult[];
  freeAgencyBudget: number;

  // Draft
  draftClass: DraftClass | null;
  draftOrder: DraftPick[];
  userPicks: DraftPick[];
  draftResults: DraftSelection[];
  scoutingBudget: number;

  // Training Camp
  campReport: CampReport | null;
  rosterFinalized: boolean;

  // Tracking
  capSpace: number;
  deadMoney: number;
  totalSpent: number;
}

// =============================================================================
// OFFSEASON HELPERS
// =============================================================================

export const PHASE_ORDER: OffseasonPhase[] = [
  'SEASON_END',
  'PLAYER_CHANGES',
  'RESIGNING',
  'FREE_AGENCY_WAVE_1',
  'FREE_AGENCY_WAVE_2',
  'FREE_AGENCY_WAVE_3',
  'PRE_DRAFT',
  'DRAFT',
  'UDFA',
  'TRAINING_CAMP',
  'COMPLETE',
];

export function getNextPhase(current: OffseasonPhase): OffseasonPhase {
  const index = PHASE_ORDER.indexOf(current);
  if (index === -1 || index === PHASE_ORDER.length - 1) {
    return 'COMPLETE';
  }
  return PHASE_ORDER[index + 1];
}

export function getPhaseName(phase: OffseasonPhase): string {
  const names: Record<OffseasonPhase, string> = {
    SEASON_END: 'Season End',
    PLAYER_CHANGES: 'Roster Changes',
    RESIGNING: 'Re-Signing Period',
    FREE_AGENCY_WAVE_1: 'Free Agency - Wave 1',
    FREE_AGENCY_WAVE_2: 'Free Agency - Wave 2',
    FREE_AGENCY_WAVE_3: 'Free Agency - Wave 3',
    PRE_DRAFT: 'Draft Scouting',
    DRAFT: 'Draft Day',
    UDFA: 'Undrafted Signings',
    TRAINING_CAMP: 'Training Camp',
    COMPLETE: 'Offseason Complete',
  };
  return names[phase];
}

export function getPhaseDescription(phase: OffseasonPhase): string {
  const descriptions: Record<OffseasonPhase, string> = {
    SEASON_END: 'Review your season performance and owner evaluation.',
    PLAYER_CHANGES: 'Handle retirements and see who developed or declined.',
    RESIGNING: 'Decide which expiring players to keep.',
    FREE_AGENCY_WAVE_1: 'Big-name free agents hit the market.',
    FREE_AGENCY_WAVE_2: 'Quality starters still available.',
    FREE_AGENCY_WAVE_3: 'Find depth pieces and bargains.',
    PRE_DRAFT: 'Scout prospects before draft day.',
    DRAFT: 'Select the future of your franchise.',
    UDFA: 'Sign undrafted players as camp bodies.',
    TRAINING_CAMP: 'Final roster cuts and preseason prep.',
    COMPLETE: 'Ready to start the new season!',
  };
  return descriptions[phase];
}

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

/** Calculate retirement probability based on age */
export function getRetirementChance(age: number, overall: number): number {
  if (age < 30) return 0;
  if (age < 32) return 0.05;
  if (age < 34) return 0.15;
  if (age < 36) return 0.30;
  if (age < 38) return 0.50;
  if (age < 40) return 0.70;
  return 0.90;
}

/** Calculate development change based on age and potential */
export function getDevelopmentType(
  age: number,
  overall: number,
  potential: number
): 'GROWTH' | 'REGRESSION' | 'BREAKOUT' | 'DECLINE' | 'STABLE' {
  const room = potential - overall;

  // Young players can grow
  if (age < 26 && room > 5) {
    return Math.random() > 0.3 ? 'GROWTH' : 'STABLE';
  }

  // Breakout years
  if (age >= 24 && age <= 27 && room > 10 && Math.random() > 0.8) {
    return 'BREAKOUT';
  }

  // Prime years - stable
  if (age >= 26 && age <= 30) {
    return Math.random() > 0.85 ? 'REGRESSION' : 'STABLE';
  }

  // Older players decline
  if (age > 30) {
    const declineChance = (age - 30) * 0.15;
    return Math.random() < declineChance ? 'DECLINE' : 'REGRESSION';
  }

  return 'STABLE';
}

/** Calculate development amount */
export function getDevelopmentAmount(
  type: 'GROWTH' | 'REGRESSION' | 'BREAKOUT' | 'DECLINE' | 'STABLE',
  age: number
): number {
  switch (type) {
    case 'BREAKOUT': return 5 + Math.floor(Math.random() * 5); // +5 to +10
    case 'GROWTH': return 1 + Math.floor(Math.random() * 3);   // +1 to +4
    case 'STABLE': return 0;
    case 'REGRESSION': return -(1 + Math.floor(Math.random() * 2)); // -1 to -3
    case 'DECLINE': return -(3 + Math.floor(Math.random() * 4) + Math.max(0, age - 32)); // -3 to -7+
    default: return 0;
  }
}

// =============================================================================
// CONTRACT VALUE HELPERS
// =============================================================================

/** Estimate market value for a player */
export function estimateMarketValue(
  position: Position,
  overall: number,
  age: number
): number {
  // Base value from overall
  let baseValue = (overall / 99) * 20_000_000;

  // Position multiplier
  const positionMultipliers: Record<Position, number> = {
    QB: 2.5,
    WR: 1.4,
    CB: 1.3,
    RB: 1.0,
    TE: 1.1,
    S: 1.0,
    LB: 1.0,
    OL: 0.8,
    DL: 0.9,
    ST: 0.3,
  };

  baseValue *= positionMultipliers[position] || 1.0;

  // Age adjustment (younger = more valuable)
  if (age < 26) baseValue *= 1.2;
  else if (age > 30) baseValue *= 0.7;
  else if (age > 32) baseValue *= 0.5;

  return Math.round(baseValue);
}
