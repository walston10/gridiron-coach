/**
 * ILLEGAL MOTION - Fantasy Draft Store
 *
 * Manages the fantasy draft state: budget, selections, position requirements.
 */

import { create } from 'zustand';
import type { Player, Roster, OLineUnit, DLineUnit } from '../types/player.types';
import type { Deck } from '../types/deck.types';
import type { DraftPlayer, DraftLineUnit, PlayerPool } from '../data/playerPool';
import { generatePlayerPool } from '../data/playerPool';
import { buildDeck } from '../engine/cardGenerator';

// =============================================================================
// CONSTANTS
// =============================================================================

export const DRAFT_BUDGET = 160; // $160M

export interface PositionRequirement {
  min: number;
  max: number;
  label: string;
  description: string;
}

export const POSITION_REQUIREMENTS: Record<string, PositionRequirement> = {
  QB: { min: 1, max: 1, label: 'QB', description: 'Quarterback' },
  RB: { min: 1, max: 2, label: 'RB', description: 'Running Back' },
  WR: { min: 2, max: 3, label: 'WR', description: 'Wide Receiver' },
  TE: { min: 1, max: 2, label: 'TE', description: 'Tight End' },
  OL: { min: 1, max: 1, label: 'OL', description: 'Offensive Line' },
  DL: { min: 1, max: 1, label: 'DL', description: 'Defensive Line' },
  LB: { min: 2, max: 3, label: 'LB', description: 'Linebacker' },
  CB: { min: 2, max: 3, label: 'CB', description: 'Cornerback' },
  S: { min: 1, max: 2, label: 'S', description: 'Safety' },
  ST: { min: 1, max: 1, label: 'ST', description: 'Special Teams' },
};

// =============================================================================
// TYPES
// =============================================================================

export type PositionStatus = 'need' | 'ok' | 'full';

export interface DraftSelection {
  position: string;
  playerId: string;
  salary: number;
  // Reference to the actual data
  playerData?: DraftPlayer;
  unitData?: DraftLineUnit;
}

export interface DraftState {
  // Pool
  playerPool: PlayerPool | null;

  // Selections
  selections: DraftSelection[];
  budget: number;
  spent: number;

  // Returner designation
  kickReturnerId: string | null;
  puntReturnerId: string | null;

  // UI state
  activePosition: string;
  isConfirming: boolean;

  // Actions
  initializeDraft: () => void;
  selectPlayer: (position: string, playerId: string, salary: number, data: DraftPlayer | DraftLineUnit) => void;
  releasePlayer: (playerId: string) => void;
  setKickReturner: (playerId: string) => void;
  setPuntReturner: (playerId: string) => void;
  setActivePosition: (position: string) => void;

  // Computed helpers (as functions)
  getPositionCount: (position: string) => number;
  getPositionStatus: (position: string) => PositionStatus;
  canSelectPosition: (position: string) => boolean;
  getMinimumSpendNeeded: () => number;
  isRosterComplete: () => boolean;
  getRemainingBudget: () => number;
  getSelectedPlayerIds: () => Set<string>;
  getAvailableReturners: () => DraftSelection[];

  // Build roster
  buildRoster: () => Roster | null;
  buildFinalDeck: () => Deck | null;

  // Get final draft results
  getDraftResults: () => DraftResults | null;

  // Reset
  resetDraft: () => void;
}

// Draft completion result
export interface DraftResults {
  roster: Roster;
  deck: Deck;
  totalSpent: number;
  selections: DraftSelection[];
}

// =============================================================================
// STORE
// =============================================================================

export const useDraftStore = create<DraftState>((set, get) => ({
  // Initial state
  playerPool: null,
  selections: [],
  budget: DRAFT_BUDGET,
  spent: 0,
  kickReturnerId: null,
  puntReturnerId: null,
  activePosition: 'QB',
  isConfirming: false,

  // Initialize the draft with a fresh player pool
  initializeDraft: () => {
    const pool = generatePlayerPool();
    set({
      playerPool: pool,
      selections: [],
      spent: 0,
      kickReturnerId: null,
      puntReturnerId: null,
      activePosition: 'QB',
      isConfirming: false,
    });
  },

  // Select a player
  selectPlayer: (position, playerId, salary, data) => {
    const state = get();
    const requirement = POSITION_REQUIREMENTS[position];

    // Check if position is full
    const currentCount = state.getPositionCount(position);
    if (currentCount >= requirement.max) {
      return;
    }

    // Check budget
    if (state.spent + salary > state.budget) {
      return;
    }

    // Check if player already selected
    if (state.selections.some(s => s.playerId === playerId)) {
      return;
    }

    const newSelection: DraftSelection = {
      position,
      playerId,
      salary,
      playerData: 'player' in data ? data as DraftPlayer : undefined,
      unitData: 'unit' in data ? data as DraftLineUnit : undefined,
    };

    set(state => ({
      selections: [...state.selections, newSelection],
      spent: state.spent + salary,
    }));
  },

  // Release a player
  releasePlayer: (playerId) => {
    const state = get();
    const selection = state.selections.find(s => s.playerId === playerId);
    if (!selection) return;

    // Clear returner if this player was a returner
    const updates: Partial<DraftState> = {
      selections: state.selections.filter(s => s.playerId !== playerId),
      spent: state.spent - selection.salary,
    };

    if (state.kickReturnerId === playerId) {
      updates.kickReturnerId = null;
    }
    if (state.puntReturnerId === playerId) {
      updates.puntReturnerId = null;
    }

    set(updates);
  },

  // Set returners
  setKickReturner: (playerId) => set({ kickReturnerId: playerId }),
  setPuntReturner: (playerId) => set({ puntReturnerId: playerId }),

  // UI state
  setActivePosition: (position) => set({ activePosition: position }),

  // Get count of players at position
  getPositionCount: (position) => {
    return get().selections.filter(s => s.position === position).length;
  },

  // Get position status
  getPositionStatus: (position) => {
    const count = get().getPositionCount(position);
    const req = POSITION_REQUIREMENTS[position];
    if (count < req.min) return 'need';
    if (count >= req.max) return 'full';
    return 'ok';
  },

  // Can select more at this position?
  canSelectPosition: (position) => {
    const count = get().getPositionCount(position);
    const req = POSITION_REQUIREMENTS[position];
    return count < req.max;
  },

  // Calculate minimum spend still needed to fill roster
  getMinimumSpendNeeded: () => {
    const state = get();
    let minSpend = 0;

    for (const [position, req] of Object.entries(POSITION_REQUIREMENTS)) {
      const count = state.getPositionCount(position);
      const needed = Math.max(0, req.min - count);

      // Estimate minimum salary for position (depth tier)
      const minSalary = position === 'ST' ? 1 : position === 'QB' ? 1 : 1;
      minSpend += needed * minSalary;
    }

    return minSpend;
  },

  // Is roster complete (minimums met)?
  isRosterComplete: () => {
    const state = get();

    for (const [position, req] of Object.entries(POSITION_REQUIREMENTS)) {
      if (state.getPositionCount(position) < req.min) {
        return false;
      }
    }

    // Also need returners set
    if (!state.kickReturnerId || !state.puntReturnerId) {
      return false;
    }

    return true;
  },

  // Remaining budget
  getRemainingBudget: () => {
    const state = get();
    return state.budget - state.spent;
  },

  // Get set of selected player IDs
  getSelectedPlayerIds: () => {
    return new Set(get().selections.map(s => s.playerId));
  },

  // Get players who can be returners (RB, WR, CB)
  getAvailableReturners: () => {
    return get().selections.filter(
      s => s.position === 'RB' || s.position === 'WR' || s.position === 'CB'
    );
  },

  // Build the final roster from selections
  buildRoster: () => {
    const state = get();

    // Get selections by position
    const getPlayersAt = (pos: string): Player[] => {
      return state.selections
        .filter(s => s.position === pos && s.playerData)
        .map(s => s.playerData!.player);
    };

    const getUnitAt = (pos: 'OL' | 'DL') => {
      const selection = state.selections.find(s => s.position === pos && s.unitData);
      return selection?.unitData?.unit;
    };

    // Get required players
    const qbs = getPlayersAt('QB');
    const rbs = getPlayersAt('RB');
    const wrs = getPlayersAt('WR');
    const tes = getPlayersAt('TE');
    const lbs = getPlayersAt('LB');
    const cbs = getPlayersAt('CB');
    const ss = getPlayersAt('S');
    const sts = getPlayersAt('ST');
    const olUnit = getUnitAt('OL');
    const dlUnit = getUnitAt('DL');

    // Validate minimums
    if (qbs.length < 1 || rbs.length < 1 || wrs.length < 2 || tes.length < 1 ||
        lbs.length < 2 || cbs.length < 2 || ss.length < 1 || sts.length < 1 ||
        !olUnit || !dlUnit) {
      return null;
    }

    // Get returner IDs
    const kickReturnerId = state.kickReturnerId;
    const puntReturnerId = state.puntReturnerId;

    if (!kickReturnerId || !puntReturnerId) {
      return null;
    }

    // Build roster structure
    const roster: Roster = {
      offense: {
        QB: qbs[0],
        RB: rbs[0],
        WR: [wrs[0], wrs[1]],
        TE: tes[0],
        OL: olUnit as OLineUnit,
      },
      defense: {
        DL: dlUnit as DLineUnit,
        LB: [lbs[0], lbs[1]],
        CB: [cbs[0], cbs[1]],
        S: ss[0],
      },
      specialTeams: {
        ST: sts[0],
      },
      returner: {
        kickReturner: kickReturnerId,
        puntReturner: puntReturnerId,
      },
      bench: [
        ...(rbs.length > 1 ? [rbs[1]] : []),
        ...(wrs.length > 2 ? [wrs[2]] : []),
        ...(tes.length > 1 ? [tes[1]] : []),
        ...(lbs.length > 2 ? [lbs[2]] : []),
        ...(cbs.length > 2 ? [cbs[2]] : []),
        ...(ss.length > 1 ? [ss[1]] : []),
      ],
      practiceSquad: [],
    };

    return roster;
  },

  // Build the final deck from roster
  buildFinalDeck: () => {
    const roster = get().buildRoster();
    if (!roster) return null;

    return buildDeck(roster);
  },

  // Get complete draft results for franchise initialization
  getDraftResults: () => {
    const state = get();
    const roster = state.buildRoster();
    if (!roster) return null;

    const deck = buildDeck(roster);

    return {
      roster,
      deck,
      totalSpent: state.spent,
      selections: state.selections,
    };
  },

  // Reset draft
  resetDraft: () => {
    set({
      playerPool: null,
      selections: [],
      spent: 0,
      kickReturnerId: null,
      puntReturnerId: null,
      activePosition: 'QB',
      isConfirming: false,
    });
  },
}));

// =============================================================================
// SELECTORS (for convenience)
// =============================================================================

export const selectRemainingBudget = (state: DraftState) => state.budget - state.spent;
export const selectIsRosterComplete = (state: DraftState) => state.isRosterComplete();
export const selectPositionStatus = (position: string) => (state: DraftState) =>
  state.getPositionStatus(position);
