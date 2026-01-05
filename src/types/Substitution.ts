/**
 * Substitution Types for Simplified Roster
 *
 * Offense: 6 skill players + HOGS (O-Line unit)
 * Defense: 3 captain + unit combos (no individual subs)
 */

import type {
  OffenseRosterPosition,
  DefenseRosterPosition,
  RosterPosition,
  Position,
  RosterSlot,
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
 * For offense, swap between starter and McBum backup
 * Defense doesn't have subs - captain + unit always plays
 */
export interface LineupState {
  offense: Record<OffenseRosterPosition, 'starter' | 'backup'>;
  // Defense doesn't need lineup state - captain + unit always plays
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
    FB_TE: 'starter',
    SLOT: 'starter',
  },
};

// =============================================================================
// SUBSTITUTION ACTIONS
// =============================================================================

export interface SubstitutionAction {
  position: OffenseRosterPosition;  // Only offense has subs
  from: 'starter' | 'backup';
  to: 'starter' | 'backup';
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
 * Get all offensive positions (skill players only, not HOGS)
 */
export function getOffensePositions(): OffenseRosterPosition[] {
  return ['QB', 'RB', 'WR1', 'WR2', 'FB_TE', 'SLOT'];
}

/**
 * Get all defensive positions (captain positions)
 */
export function getDefensePositions(): DefenseRosterPosition[] {
  return ['D_LINE', 'LINEBACKERS', 'SECONDARY'];
}

// =============================================================================
// POSITION SLOT DEFINITIONS
// =============================================================================

/**
 * Position slot definition for display
 */
export interface PositionSlot {
  id: string;
  name: string;
  abbreviation: string;
  side: 'offense' | 'defense';
  isUnit?: boolean;  // True for HOGS and defense captains
}

/**
 * Offensive position slots
 */
export const OFFENSIVE_SLOTS: PositionSlot[] = [
  { id: 'QB', name: 'Quarterback', abbreviation: 'QB', side: 'offense' },
  { id: 'RB', name: 'Running Back', abbreviation: 'RB', side: 'offense' },
  { id: 'WR1', name: 'Wide Receiver 1', abbreviation: 'WR1', side: 'offense' },
  { id: 'WR2', name: 'Wide Receiver 2', abbreviation: 'WR2', side: 'offense' },
  { id: 'FB_TE', name: 'FB/TE Hybrid', abbreviation: 'Y', side: 'offense' },
  { id: 'SLOT', name: 'Slot Receiver', abbreviation: 'F', side: 'offense' },
  { id: 'HOGS', name: 'Offensive Line', abbreviation: 'HOGS', side: 'offense', isUnit: true },
];

/**
 * Defensive position slots (captain + unit combos)
 */
export const DEFENSIVE_SLOTS: PositionSlot[] = [
  { id: 'D_LINE', name: 'Defensive Line', abbreviation: 'DL', side: 'defense', isUnit: true },
  { id: 'LINEBACKERS', name: 'Linebackers', abbreviation: 'LB', side: 'defense', isUnit: true },
  { id: 'SECONDARY', name: 'Secondary', abbreviation: 'DB', side: 'defense', isUnit: true },
];

/**
 * All draft slots in order
 */
export const ALL_DRAFT_SLOTS: PositionSlot[] = [
  ...OFFENSIVE_SLOTS,
  ...DEFENSIVE_SLOTS,
];

// =============================================================================
// ROSTER PLAYER FOR DISPLAY
// =============================================================================

/**
 * Roster player with position slot
 */
export interface RosterPlayer {
  id: string;
  name: string;
  position: Position | RosterSlot;  // Full Position or simplified RosterSlot
  isStarter: boolean;
  overall: number;
  isEmergencyBackup?: boolean;  // McBum players - can never be injured/suspended
  personality?: string;         // Flavor text
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

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a slot is a unit (HOGS or defense captain)
 */
export function isUnitSlot(slot: string): boolean {
  return slot === 'HOGS' || slot === 'D_LINE' || slot === 'LINEBACKERS' || slot === 'SECONDARY';
}

/**
 * Check if a slot can have substitutions
 * Only offense skill players can be subbed (not units)
 */
export function canBeSubstituted(slot: string): boolean {
  return ['QB', 'RB', 'WR1', 'WR2', 'FB_TE', 'SLOT'].includes(slot);
}
