/**
 * Substitution Engine (Simplified)
 *
 * With the simplified roster (5 skill players + 1 bench each per side),
 * substitutions are straightforward: swap starter for bench at each position.
 */

import type {
  DepthChart,
  DepthChartEntry,
  LineupState,
  RosterPlayer,
  SubstitutionAction,
  AutoSubSettings,
  PlayerFatigueDisplay,
  PositionSlot,
} from '../types/Substitution';
import {
  OFFENSIVE_SLOTS,
  DEFENSIVE_SLOTS,
  DEFAULT_LINEUP,
  getOffensePositions,
  getDefensePositions,
} from '../types/Substitution';
import type { OffenseRosterPosition, DefenseRosterPosition } from '../types/Player';
import { fatigueEngine, type FatigueEngine } from './FatigueEngine';

export class SubstitutionEngine {
  private roster: Map<string, RosterPlayer> = new Map();
  private depthChart: DepthChart;
  private currentLineup: LineupState;
  private autoSubSettings: AutoSubSettings;
  private fatigueEngine: FatigueEngine;
  private onSubstitution?: (action: SubstitutionAction) => void;

  constructor(fatigueEngineInstance: FatigueEngine = fatigueEngine) {
    this.fatigueEngine = fatigueEngineInstance;
    this.depthChart = { offense: [], defense: [] };
    this.currentLineup = { ...DEFAULT_LINEUP };
    this.autoSubSettings = {
      enabled: true,
      fatigueThreshold: 70,
      respectStarters: true,
    };
  }

  // Initialize roster
  setRoster(players: RosterPlayer[]): void {
    this.roster.clear();
    players.forEach(p => this.roster.set(p.id, p));
  }

  getPlayer(playerId: string): RosterPlayer | undefined {
    return this.roster.get(playerId);
  }

  getRoster(): RosterPlayer[] {
    return Array.from(this.roster.values());
  }

  // Initialize depth chart with default assignments
  initializeDepthChart(): void {
    const players = Array.from(this.roster.values());

    // Group players by position
    const byPosition: Map<string, RosterPlayer[]> = new Map();
    players.forEach(p => {
      const list = byPosition.get(p.position) || [];
      list.push(p);
      byPosition.set(p.position, list);
    });

    // Sort each position group by overall rating
    byPosition.forEach((list) => {
      list.sort((a, b) => b.overall - a.overall);
    });

    // Assign to offensive slots
    this.depthChart.offense = OFFENSIVE_SLOTS.map(slot => {
      const candidates = byPosition.get(slot.id) || [];
      return {
        slot: slot.id,
        starters: candidates.slice(0, 2).map(p => p.id), // Starter + 1 bench
      };
    });

    // Assign to defensive slots
    this.depthChart.defense = DEFENSIVE_SLOTS.map(slot => {
      const candidates = byPosition.get(slot.id) || [];
      return {
        slot: slot.id,
        starters: candidates.slice(0, 2).map(p => p.id), // Starter + 1 bench
      };
    });

    // Set initial lineup to starters
    this.resetLineupToStarters();
  }

  // Reset current lineup to depth chart starters
  resetLineupToStarters(): void {
    // Reset to all starters (offense only - defense uses captain+unit system)
    this.currentLineup = {
      offense: {
        QB: 'starter',
        RB: 'starter',
        WR1: 'starter',
        WR2: 'starter',
        FB_TE: 'starter',
        SLOT: 'starter',
      },
    };
  }

  // Get depth chart
  getDepthChart(): DepthChart {
    return this.depthChart;
  }

  // Set depth chart (e.g., from saved data)
  setDepthChart(depthChart: DepthChart): void {
    this.depthChart = depthChart;
  }

  // Get current lineup
  getCurrentLineup(): LineupState {
    return this.currentLineup;
  }

  // Get player currently at a slot
  getPlayerAtSlot(slot: string, side: 'offense' | 'defense'): RosterPlayer | undefined {
    const depthEntry = this.getDepthEntry(slot, side);

    if (!depthEntry || depthEntry.starters.length === 0) return undefined;

    // Get which player (starter or bench) is currently in
    let lineupValue: 'starter' | 'bench';
    if (side === 'offense') {
      lineupValue = this.currentLineup.offense[slot as OffenseRosterPosition];
    } else {
      lineupValue = this.currentLineup.defense[slot as DefenseRosterPosition];
    }
    const playerIndex = lineupValue === 'starter' ? 0 : 1;
    const playerId = depthEntry.starters[playerIndex];

    return playerId ? this.roster.get(playerId) : undefined;
  }

  // Get depth chart entry for a slot
  getDepthEntry(slot: string, side: 'offense' | 'defense'): DepthChartEntry | undefined {
    const chart = side === 'offense' ? this.depthChart.offense : this.depthChart.defense;
    return chart.find(e => e.slot === slot);
  }

  // Update depth chart order for a slot
  updateDepthOrder(slot: string, side: 'offense' | 'defense', playerIds: string[]): boolean {
    const chart = side === 'offense' ? this.depthChart.offense : this.depthChart.defense;
    const entry = chart.find(e => e.slot === slot);

    if (!entry) return false;

    entry.starters = playerIds.slice(0, 2); // Max 2: starter + bench
    return true;
  }

  // Swap player in a depth chart position
  swapInDepthChart(
    slot: string,
    side: 'offense' | 'defense',
    depthIndex: number,
    newPlayerId: string
  ): boolean {
    const chart = side === 'offense' ? this.depthChart.offense : this.depthChart.defense;
    const entry = chart.find(e => e.slot === slot);

    if (!entry) return false;

    // Ensure array is large enough
    while (entry.starters.length <= depthIndex) {
      entry.starters.push('');
    }

    entry.starters[depthIndex] = newPlayerId;
    return true;
  }

  // Substitute a player in a slot (swap starter/bench)
  substitute(slot: string, side: 'offense' | 'defense'): boolean {
    if (side === 'offense') {
      const pos = slot as OffenseRosterPosition;
      if (this.currentLineup.offense[pos]) {
        const current = this.currentLineup.offense[pos];
        this.currentLineup.offense[pos] = current === 'starter' ? 'bench' : 'starter';

        // Fire callback
        if (this.onSubstitution) {
          this.onSubstitution({
            position: pos,
            from: current,
            to: this.currentLineup.offense[pos],
            reason: 'MANUAL',
          });
        }
        return true;
      }
    } else {
      const pos = slot as DefenseRosterPosition;
      if (this.currentLineup.defense[pos]) {
        const current = this.currentLineup.defense[pos];
        this.currentLineup.defense[pos] = current === 'starter' ? 'bench' : 'starter';

        // Fire callback
        if (this.onSubstitution) {
          this.onSubstitution({
            position: pos,
            from: current,
            to: this.currentLineup.defense[pos],
            reason: 'MANUAL',
          });
        }
        return true;
      }
    }
    return false;
  }

  // Auto-sub settings
  getAutoSubSettings(): AutoSubSettings {
    return this.autoSubSettings;
  }

  setAutoSubSettings(settings: AutoSubSettings): void {
    this.autoSubSettings = settings;
  }

  toggleAutoSub(): void {
    this.autoSubSettings.enabled = !this.autoSubSettings.enabled;
  }

  // Set substitution callback
  setOnSubstitution(callback: (action: SubstitutionAction) => void): void {
    this.onSubstitution = callback;
  }

  // Get fatigue for all active players
  getFatigueData(): Map<string, PlayerFatigueDisplay> {
    const result = new Map<string, PlayerFatigueDisplay>();

    // Get fatigue for all roster players
    this.roster.forEach((player, playerId) => {
      const fatigue = this.fatigueEngine.getPlayerFatigue(playerId);
      if (fatigue) {
        result.set(playerId, fatigue);
      }
    });

    return result;
  }

  // Check if auto-sub is recommended for a position
  shouldAutoSub(slot: string, side: 'offense' | 'defense'): boolean {
    if (!this.autoSubSettings.enabled) return false;

    const player = this.getPlayerAtSlot(slot, side);
    if (!player) return false;

    const fatigue = this.fatigueEngine.getPlayerFatigue(player.id);
    return fatigue ? fatigue.percentage >= this.autoSubSettings.fatigueThreshold : false;
  }

  // Auto-sub all tired players
  autoSubAll(side: 'offense' | 'defense'): void {
    const slots = side === 'offense' ? OFFENSIVE_SLOTS : DEFENSIVE_SLOTS;

    slots.forEach(slot => {
      if (this.shouldAutoSub(slot.id, side)) {
        this.substitute(slot.id, side);
      }
    });
  }
}

// Singleton instance
export const substitutionEngine = new SubstitutionEngine();
