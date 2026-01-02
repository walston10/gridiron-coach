/**
 * Substitution and Depth Chart Types
 *
 * Rules:
 * - A player can only START at ONE position
 * - A player CAN be a backup at MULTIPLE positions
 * - Starters are depth chart position 1
 * - Backups are positions 2, 3, etc.
 */

import type { Position } from './GameSim';

// Position slots with display names for the UI
export interface PositionSlot {
  slot: string;           // Internal key: 'WR1', 'WR2', 'SLOT1', etc.
  position: Position;     // Base position type
  displayName: string;    // UI display: 'WR1 (X)', 'WR2 (Z)', etc.
  side?: 'left' | 'right' | 'center';
}

// Offensive position slots
export const OFFENSIVE_SLOTS: PositionSlot[] = [
  // Quarterback
  { slot: 'QB', position: 'QB', displayName: 'QB' },

  // Backfield
  { slot: 'RB', position: 'RB', displayName: 'RB' },
  { slot: 'FB', position: 'FB', displayName: 'FB' },

  // Receivers
  { slot: 'WR1', position: 'WR', displayName: 'WR1 (X)', side: 'left' },
  { slot: 'WR2', position: 'WR', displayName: 'WR2 (Z)', side: 'right' },
  { slot: 'SLOT1', position: 'WR', displayName: 'Slot' },
  { slot: 'TE', position: 'TE', displayName: 'TE' },

  // Offensive Line
  { slot: 'LT', position: 'LT', displayName: 'LT', side: 'left' },
  { slot: 'LG', position: 'LG', displayName: 'LG', side: 'left' },
  { slot: 'C', position: 'C', displayName: 'C', side: 'center' },
  { slot: 'RG', position: 'RG', displayName: 'RG', side: 'right' },
  { slot: 'RT', position: 'RT', displayName: 'RT', side: 'right' },
];

// Defensive position slots (4-3 base)
export const DEFENSIVE_SLOTS: PositionSlot[] = [
  // Defensive Line
  { slot: 'LDE', position: 'DE', displayName: 'LDE', side: 'left' },
  { slot: 'DT1', position: 'DT', displayName: 'DT', side: 'left' },
  { slot: 'DT2', position: 'DT', displayName: 'DT', side: 'right' },
  { slot: 'RDE', position: 'DE', displayName: 'RDE', side: 'right' },

  // Linebackers
  { slot: 'LOLB', position: 'OLB', displayName: 'LOLB', side: 'left' },
  { slot: 'MLB', position: 'MLB', displayName: 'MLB', side: 'center' },
  { slot: 'ROLB', position: 'OLB', displayName: 'ROLB', side: 'right' },

  // Secondary
  { slot: 'CB1', position: 'CB', displayName: 'CB1', side: 'left' },
  { slot: 'CB2', position: 'CB', displayName: 'CB2', side: 'right' },
  { slot: 'FS', position: 'FS', displayName: 'FS' },
  { slot: 'SS', position: 'SS', displayName: 'SS' },
];

// Player on the roster (minimal info for depth chart)
export interface RosterPlayer {
  id: string;
  name: string;
  position: Position;        // Primary position
  positions: Position[];     // All positions they can play
  overall: number;           // Overall rating 1-99
  speed: number;
  acceleration: number;
  // Position-specific attributes
  attributes: Record<string, number>;
}

// Depth chart entry - who plays at each slot
export interface DepthChartEntry {
  slot: string;              // Position slot key
  starters: string[];        // Player IDs in order (index 0 = starter)
}

// Full depth chart for a team
export interface DepthChart {
  offense: DepthChartEntry[];
  defense: DepthChartEntry[];
}

// Current lineup state (who's actually on the field)
export interface LineupState {
  offense: Map<string, string>;  // slot -> playerId currently on field
  defense: Map<string, string>;  // slot -> playerId currently on field
}

// Substitution action
export interface SubstitutionAction {
  slot: string;
  outPlayerId: string;
  inPlayerId: string;
  reason: 'MANUAL' | 'FATIGUE' | 'INJURY';
}

// Fatigue status for UI display
export type FatigueLevel = 'FRESH' | 'GOOD' | 'TIRED' | 'VERY_TIRED' | 'EXHAUSTED';

export interface PlayerFatigueDisplay {
  playerId: string;
  level: FatigueLevel;
  percentage: number;  // 0-100
  shouldSub: boolean;  // Auto-sub recommendation
}

// Settings for auto-substitution
export interface AutoSubSettings {
  enabled: boolean;
  fatigueThreshold: number;  // Fatigue % to trigger auto-sub (default 70)
  respectStarters: boolean;  // Put starters back when rested
}

// Validate that a player can be assigned to a position
export function canPlayPosition(player: RosterPlayer, targetPosition: Position): boolean {
  return player.position === targetPosition || player.positions.includes(targetPosition);
}

// Validate starter assignment (only one starting position per player)
export function validateStarterAssignment(
  depthChart: DepthChart,
  playerId: string,
  targetSlot: string
): { valid: boolean; conflictSlot?: string } {
  // Check all offensive slots
  for (const entry of depthChart.offense) {
    if (entry.slot !== targetSlot && entry.starters[0] === playerId) {
      return { valid: false, conflictSlot: entry.slot };
    }
  }

  // Check all defensive slots
  for (const entry of depthChart.defense) {
    if (entry.slot !== targetSlot && entry.starters[0] === playerId) {
      return { valid: false, conflictSlot: entry.slot };
    }
  }

  return { valid: true };
}

// Get fatigue color for UI
export function getFatigueColor(level: FatigueLevel): string {
  switch (level) {
    case 'FRESH': return '#22c55e';      // Green
    case 'GOOD': return '#84cc16';       // Lime
    case 'TIRED': return '#eab308';      // Yellow
    case 'VERY_TIRED': return '#f97316'; // Orange
    case 'EXHAUSTED': return '#ef4444';  // Red
  }
}
