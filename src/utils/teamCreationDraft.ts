/**
 * Team Creation Draft System
 *
 * Budget-based team building where you pick 10 positions.
 * Each position has 3-5 options at different cost/quality tiers.
 */

import type { DraftSlot, DraftPlayer, DraftPool } from '../types/Player';

// =============================================================================
// NAME GENERATION
// =============================================================================

const FIRST_NAMES = [
  'Marcus', 'Jaylen', 'DeShawn', 'Terrell', 'Darius', 'Khalil', 'Javon', 'Tyrell',
  'Malik', 'Jamal', 'DeAndre', 'Tremaine', 'Jalen', 'Quincy', 'Davon', 'Trayvon',
  'Cameron', 'Dante', 'Kendrick', 'Lamar', 'Rashad', 'Isaiah', 'Devonte', 'Tyreke',
  'Mike', 'Tom', 'Josh', 'Chris', 'Ryan', 'Jake', 'Cole', 'Trey', 'Hunter', 'Brett',
  'Zach', 'Matt', 'Tyler', 'Kyle', 'Eric', 'Drew', 'Chad', 'Blake', 'Luke', 'Austin'
];

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Davis', 'Jackson', 'Thomas', 'Robinson', 'Harris',
  'Martin', 'Thompson', 'Moore', 'Taylor', 'Anderson', 'White', 'Lewis', 'Walker',
  'Green', 'Adams', 'Nelson', 'Hill', 'King', 'Wright', 'Scott', 'Mitchell', 'Roberts',
  'Smith', 'Jones', 'Miller', 'Wilson', 'Clark', 'Hall', 'Allen', 'Young', 'Turner',
  'Carter', 'Phillips', 'Evans', 'Morris', 'Murphy', 'Cook', 'Rogers', 'Brooks'
];

// =============================================================================
// PERSONALITY GENERATION
// =============================================================================

// Personalities by tier (higher overall = better personalities)
const ELITE_PERSONALITIES = [
  'Franchise cornerstone',
  'Generational talent',
  'Future Hall of Famer',
  'Captain and leader',
  'Game-changing playmaker',
  'The complete package',
  'Born winner',
  'Immaculate work ethic',
  'Film room junkie',
  'Clutch performer',
];

const GOOD_PERSONALITIES = [
  'Solid pro',
  'Blue-collar grinder',
  'Reliable starter',
  'Gets the job done',
  'High motor',
  'Team-first mentality',
  'Underrated gem',
  'Steady performer',
  'Dependable veteran',
  'Quiet leader',
];

const MID_PERSONALITIES = [
  'Inconsistent but talented',
  'Flashes brilliance',
  'Needs coaching',
  'Raw potential',
  'Boom or bust',
  'Sometimes disappears',
  'Hot and cold',
  'System player',
  'Adequate backup',
  'Serviceable starter',
];

const LOW_PERSONALITIES = [
  'Roster filler',
  'Practice squad body',
  'Journeyman',
  'Street free agent',
  'Probably your cousin',
  'Found on Craigslist',
  'Still learning the playbook',
  'Enthusiasm exceeds ability',
  'Shows up... usually',
  'Warm body',
];

const DIVA_TRAITS = [
  ' (diva)',
  ' (locker room issue)',
  ' (me-first attitude)',
  ' (Twitter warrior)',
  ' (questionable effort)',
  ' (party animal)',
];

function getPersonality(overall: number, seed: number): string {
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  let personalities: string[];
  if (overall >= 85) {
    personalities = ELITE_PERSONALITIES;
  } else if (overall >= 75) {
    personalities = GOOD_PERSONALITIES;
  } else if (overall >= 65) {
    personalities = MID_PERSONALITIES;
  } else {
    personalities = LOW_PERSONALITIES;
  }

  let personality = personalities[Math.floor(rand() * personalities.length)];

  // Small chance of diva trait on higher overall players
  if (overall >= 75 && rand() < 0.15) {
    personality += DIVA_TRAITS[Math.floor(rand() * DIVA_TRAITS.length)];
  }

  return personality;
}

// =============================================================================
// COST CALCULATION
// =============================================================================

// Cost is based on overall rating
// Budget is 100, and you need 10 players, so average cost should be ~10
function calculateCost(overall: number): number {
  if (overall >= 90) return 18;
  if (overall >= 85) return 15;
  if (overall >= 80) return 12;
  if (overall >= 75) return 10;
  if (overall >= 70) return 8;
  if (overall >= 65) return 6;
  return 4;
}

// =============================================================================
// PLAYER GENERATION
// =============================================================================

function generatePlayer(position: DraftSlot, tier: 'elite' | 'good' | 'mid' | 'low' | 'budget', index: number): DraftPlayer {
  // Seed based on position and tier for consistency
  const seed = position.charCodeAt(0) * 1000 + tier.charCodeAt(0) * 100 + index;
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Overall ranges by tier
  let minOvr: number, maxOvr: number;
  switch (tier) {
    case 'elite':
      minOvr = 88; maxOvr = 95;
      break;
    case 'good':
      minOvr = 78; maxOvr = 87;
      break;
    case 'mid':
      minOvr = 68; maxOvr = 77;
      break;
    case 'low':
      minOvr = 58; maxOvr = 67;
      break;
    case 'budget':
      minOvr = 50; maxOvr = 59;
      break;
  }

  const overall = Math.floor(minOvr + rand() * (maxOvr - minOvr + 1));
  const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];

  return {
    id: `draft_${position}_${tier}_${index}`,
    name: `${firstName} ${lastName}`,
    position,
    overall,
    cost: calculateCost(overall),
    personality: getPersonality(overall, seed + 999),
  };
}

// =============================================================================
// POOL GENERATION
// =============================================================================

const DRAFT_SLOTS: DraftSlot[] = [
  'QB', 'RB', 'WR1', 'WR2', 'FB_TE', 'SLOT',
  'HOGS',
  'D_LINE', 'LINEBACKERS', 'SECONDARY'
];

export function generateDraftPool(): DraftPool {
  const pool: Partial<DraftPool> = {};

  for (const slot of DRAFT_SLOTS) {
    // Generate 4 options per position: elite, good, mid, budget
    pool[slot] = [
      generatePlayer(slot, 'elite', 0),
      generatePlayer(slot, 'good', 1),
      generatePlayer(slot, 'mid', 2),
      generatePlayer(slot, 'budget', 3),
    ];
  }

  return pool as DraftPool;
}

// =============================================================================
// BUDGET CONSTANTS
// =============================================================================

export const STARTING_BUDGET = 100;

// Calculate remaining budget after picks
export function calculateRemainingBudget(
  picks: Map<DraftSlot, DraftPlayer>,
  startingBudget: number = STARTING_BUDGET
): number {
  let spent = 0;
  picks.forEach(player => {
    spent += player.cost;
  });
  return startingBudget - spent;
}

// Check if a pick is affordable
export function canAffordPick(
  picks: Map<DraftSlot, DraftPlayer>,
  player: DraftPlayer,
  remainingSlots: number
): boolean {
  const currentBudget = calculateRemainingBudget(picks);
  const afterPick = currentBudget - player.cost;

  // Need to leave at least 4 budget per remaining slot (minimum cost)
  const minBudgetNeeded = (remainingSlots - 1) * 4;

  return afterPick >= minBudgetNeeded;
}

// Get all draft slots
export function getDraftSlots(): DraftSlot[] {
  return DRAFT_SLOTS;
}

// Get display name for a slot
export function getSlotDisplayName(slot: DraftSlot): string {
  const names: Record<DraftSlot, string> = {
    'QB': 'Quarterback',
    'RB': 'Running Back',
    'WR1': 'Wide Receiver 1',
    'WR2': 'Wide Receiver 2',
    'FB_TE': 'Fullback/Tight End',
    'SLOT': 'Slot Receiver',
    'HOGS': 'Offensive Line',
    'D_LINE': 'Defensive Line',
    'LINEBACKERS': 'Linebackers',
    'SECONDARY': 'Secondary',
  };
  return names[slot];
}

// Get position category (for grouping in UI)
export function getSlotCategory(slot: DraftSlot): 'offense' | 'oline' | 'defense' {
  if (slot === 'HOGS') return 'oline';
  if (['D_LINE', 'LINEBACKERS', 'SECONDARY'].includes(slot)) return 'defense';
  return 'offense';
}
