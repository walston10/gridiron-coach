/**
 * Substitution Types for Simplified Roster
 *
 * With only 5 skill players + 1 bench each per side,
 * substitutions are straightforward: swap starter for bench.
 */

import type {
  OffenseRosterPosition,
  DefenseRosterPosition,
  RosterPosition,
  Position,
} from './Player';

// =============================================================================
// FATIGUE
// =============================================================================

export type FatigueLevel = 'FRESH' | 'GOOD' | 'TIRED' | 'VERY_TIRED' | 'EXHAUSTED';

export interface PlayerFatigue {
  playerId: string;
  position: RosterPosition | string;  // Position or placeholder
  level: FatigueLevel;
  percentage: number;         // 0-100 (100 = fully exhausted)
  shouldSub: boolean;         // Auto-sub recommendation
}

// =============================================================================
// LINEUP STATE
// =============================================================================

/**
 * Which players are currently on the field
 * For each position, either the starter or bench player
 */
export interface LineupState {
  offense: Record<OffenseRosterPosition, 'starter' | 'bench'>;
  defense: Record<DefenseRosterPosition, 'starter' | 'bench'>;
}

/**
 * Default lineup (all starters)
 */
export const DEFAULT_LINEUP: LineupState = {
  offense: {
    QB: 'starter',
    RB: 'starter',
    WR1: 'starter',
    WR2: 'starter',
    FLEX: 'starter',
  },
  defense: {
    CB1: 'starter',
    CB2: 'starter',
    S: 'starter',
    LB1: 'starter',
    LB2: 'starter',
  },
};

// =============================================================================
// SUBSTITUTION ACTIONS
// =============================================================================

export interface SubstitutionAction {
  position: RosterPosition;
  from: 'starter' | 'bench';
  to: 'starter' | 'bench';
  reason: 'MANUAL' | 'FATIGUE' | 'INJURY';
}

// =============================================================================
// AUTO-SUB SETTINGS
// =============================================================================

export interface AutoSubSettings {
  enabled: boolean;
  fatigueThreshold: number;   // 0-100, sub when fatigue exceeds this (default: 70)
  respectStarters: boolean;   // Put starters back when rested (default: true)
}

export const DEFAULT_AUTO_SUB_SETTINGS: AutoSubSettings = {
  enabled: true,
  fatigueThreshold: 70,
  respectStarters: true,
};

// =============================================================================
// HELPERS
// =============================================================================

export function getFatigueColor(level: FatigueLevel): string {
  switch (level) {
    case 'FRESH': return '#22c55e';       // Green
    case 'GOOD': return '#84cc16';        // Lime
    case 'TIRED': return '#eab308';       // Yellow
    case 'VERY_TIRED': return '#f97316';  // Orange
    case 'EXHAUSTED': return '#ef4444';   // Red
  }
}

export function getFatigueLevel(percentage: number): FatigueLevel {
  if (percentage < 20) return 'FRESH';
  if (percentage < 40) return 'GOOD';
  if (percentage < 60) return 'TIRED';
  if (percentage < 80) return 'VERY_TIRED';
  return 'EXHAUSTED';
}

/**
 * Get all offensive positions
 */
export function getOffensePositions(): OffenseRosterPosition[] {
  return ['QB', 'RB', 'WR1', 'WR2', 'FLEX'];
}

/**
 * Get all defensive positions
 */
export function getDefensePositions(): DefenseRosterPosition[] {
  return ['CB1', 'CB2', 'S', 'LB1', 'LB2'];
}

// =============================================================================
// LEGACY COMPATIBILITY TYPES
// These are for SubstitutionEngine/SubstitutionPanel that use the old model
// =============================================================================

/**
 * Position slot definition for display
 */
export interface PositionSlot {
  id: string;
  name: string;
  abbreviation: string;
  side: 'offense' | 'defense';
}

/**
 * Roster player with position slot
 */
export interface RosterPlayer {
  id: string;
  name: string;
  position: Position | RosterPosition;  // Full Position or simplified RosterPosition
  isStarter: boolean;
  overall: number;
  isEmergencyBackup?: boolean;  // McBum players - can never be injured/suspended
}

/**
 * Fatigue display (alias for PlayerFatigue)
 */
export type PlayerFatigueDisplay = PlayerFatigue;

/**
 * Depth chart entry
 */
export interface DepthChartEntry {
  slot: string;
  starters: string[];  // Player IDs in depth order
}

/**
 * Full depth chart
 */
export interface DepthChart {
  offense: DepthChartEntry[];
  defense: DepthChartEntry[];
}

/**
 * Offensive position slots
 */
export const OFFENSIVE_SLOTS: PositionSlot[] = [
  { id: 'QB', name: 'Quarterback', abbreviation: 'QB', side: 'offense' },
  { id: 'RB', name: 'Running Back', abbreviation: 'RB', side: 'offense' },
  { id: 'WR1', name: 'Wide Receiver 1', abbreviation: 'WR1', side: 'offense' },
  { id: 'WR2', name: 'Wide Receiver 2', abbreviation: 'WR2', side: 'offense' },
  { id: 'FLEX', name: 'Flex (TE/FB/Slot)', abbreviation: 'FLEX', side: 'offense' },
  { id: 'HOGS', name: 'Offensive Line (The Hogs)', abbreviation: 'HOGS', side: 'offense' },
];

/**
 * Defensive position slots
 */
export const DEFENSIVE_SLOTS: PositionSlot[] = [
  { id: 'CB1', name: 'Cornerback 1', abbreviation: 'CB1', side: 'defense' },
  { id: 'CB2', name: 'Cornerback 2', abbreviation: 'CB2', side: 'defense' },
  { id: 'S', name: 'Safety', abbreviation: 'S', side: 'defense' },
  { id: 'LB1', name: 'Linebacker 1 (MLB)', abbreviation: 'LB1', side: 'defense' },
  { id: 'LB2', name: 'Linebacker 2 (OLB)', abbreviation: 'LB2', side: 'defense' },
  { id: 'FRONT', name: 'Defensive Line (The Front)', abbreviation: 'FRONT', side: 'defense' },
];

/**
 * Validate that a player can be assigned to a position
 */
export function validateStarterAssignment(
  playerPosition: RosterPosition,
  slot: string
): boolean {
  // With simplified roster, players are assigned to their positions
  return playerPosition === slot;
}

/**
 * Check if a player can play a position (for subs)
 */
export function canPlayPosition(
  playerPosition: RosterPosition,
  slot: string
): boolean {
  // With simplified roster, players are assigned to their positions
  return playerPosition === slot;
}
