/**
 * Substitution Engine
 *
 * Manages depth chart and player substitutions during gameplay.
 * Integrates with FatigueEngine for auto-substitution recommendations.
 */

import type {
  DepthChart,
  DepthChartEntry,
  LineupState,
  RosterPlayer,
  SubstitutionAction,
  AutoSubSettings,
  PlayerFatigueDisplay,
  FatigueLevel,
  PositionSlot,
} from '../types/Substitution';
import { OFFENSIVE_SLOTS, DEFENSIVE_SLOTS, validateStarterAssignment, canPlayPosition } from '../types/Substitution';
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
    this.currentLineup = {
      offense: new Map(),
      defense: new Map(),
    };
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
      const candidates = byPosition.get(slot.position) || [];
      return {
        slot: slot.slot,
        starters: candidates.slice(0, 3).map(p => p.id),
      };
    });

    // Assign to defensive slots
    this.depthChart.defense = DEFENSIVE_SLOTS.map(slot => {
      const candidates = byPosition.get(slot.position) || [];
      return {
        slot: slot.slot,
        starters: candidates.slice(0, 3).map(p => p.id),
      };
    });

    // Set initial lineup to starters
    this.resetLineupToStarters();
  }

  // Reset current lineup to depth chart starters
  resetLineupToStarters(): void {
    this.currentLineup.offense.clear();
    this.currentLineup.defense.clear();

    this.depthChart.offense.forEach(entry => {
      if (entry.starters.length > 0) {
        this.currentLineup.offense.set(entry.slot, entry.starters[0]);
      }
    });

    this.depthChart.defense.forEach(entry => {
      if (entry.starters.length > 0) {
        this.currentLineup.defense.set(entry.slot, entry.starters[0]);
      }
    });
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
    const lineup = side === 'offense' ? this.currentLineup.offense : this.currentLineup.defense;
    const playerId = lineup.get(slot);
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

    // Validate starter assignment (first player in list becomes starter)
    if (playerIds.length > 0) {
      const validation = validateStarterAssignment(this.depthChart, playerIds[0], slot);
      if (!validation.valid) {
        console.warn(`Cannot set ${playerIds[0]} as starter at ${slot} - already starting at ${validation.conflictSlot}`);
        return false;
      }
    }

    entry.starters = playerIds;
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
    const slots = side === 'offense' ? OFFENSIVE_SLOTS : DEFENSIVE_SLOTS;
    const entry = chart.find(e => e.slot === slot);
    const slotDef = slots.find(s => s.slot === slot);

    if (!entry || !slotDef) return false;

    // Validate player can play this position
    const player = this.roster.get(newPlayerId);
    if (!player || !canPlayPosition(player, slotDef.position)) {
      console.warn(`Player ${newPlayerId} cannot play position ${slotDef.position}`);
      return false;
    }

    // If setting as starter, validate no conflicts
    if (depthIndex === 0) {
      const validation = validateStarterAssignment(this.depthChart, newPlayerId, slot);
      if (!validation.valid) {
        console.warn(`Cannot set ${newPlayerId} as starter - already starting at ${validation.conflictSlot}`);
        return false;
      }
    }

    // Ensure array is large enough
    while (entry.starters.length <= depthIndex) {
      entry.starters.push('');
    }

    entry.starters[depthIndex] = newPlayerId;
    return true;
  }

  // Make an in-game substitution
  substitute(slot: string, side: 'offense' | 'defense', newPlayerId: string, reason: SubstitutionAction['reason'] = 'MANUAL'): boolean {
    const lineup = side === 'offense' ? this.currentLineup.offense : this.currentLineup.defense;
    const oldPlayerId = lineup.get(slot);

    if (!oldPlayerId || oldPlayerId === newPlayerId) return false;

    // Validate new player exists and can play position
    const slots = side === 'offense' ? OFFENSIVE_SLOTS : DEFENSIVE_SLOTS;
    const slotDef = slots.find(s => s.slot === slot);
    const player = this.roster.get(newPlayerId);

    if (!player || !slotDef || !canPlayPosition(player, slotDef.position)) {
      return false;
    }

    lineup.set(slot, newPlayerId);

    const action: SubstitutionAction = {
      slot,
      outPlayerId: oldPlayerId,
      inPlayerId: newPlayerId,
      reason,
    };

    this.onSubstitution?.(action);
    return true;
  }

  // Get fatigue display for all players in current lineup
  getLineupFatigue(side: 'offense' | 'defense'): PlayerFatigueDisplay[] {
    const lineup = side === 'offense' ? this.currentLineup.offense : this.currentLineup.defense;
    const displays: PlayerFatigueDisplay[] = [];

    lineup.forEach((playerId) => {
      const fatigue = this.fatigueEngine.getFatigue(playerId);
      const status = this.fatigueEngine.getFatigueStatus(playerId);

      displays.push({
        playerId,
        level: status as FatigueLevel,
        percentage: fatigue,
        shouldSub: this.fatigueEngine.shouldSubstitute(playerId),
      });
    });

    return displays;
  }

  // Get recommended substitutions based on fatigue
  getAutoSubRecommendations(side: 'offense' | 'defense'): SubstitutionAction[] {
    if (!this.autoSubSettings.enabled) return [];

    const lineup = side === 'offense' ? this.currentLineup.offense : this.currentLineup.defense;
    const chart = side === 'offense' ? this.depthChart.offense : this.depthChart.defense;
    const recommendations: SubstitutionAction[] = [];

    lineup.forEach((currentPlayerId, slot) => {
      const fatigue = this.fatigueEngine.getFatigue(currentPlayerId);

      if (fatigue >= this.autoSubSettings.fatigueThreshold) {
        // Find backup who is more rested
        const entry = chart.find(e => e.slot === slot);
        if (!entry) return;

        for (const backupId of entry.starters) {
          if (backupId === currentPlayerId) continue;

          const backupFatigue = this.fatigueEngine.getFatigue(backupId);
          if (backupFatigue < fatigue - 20) {
            recommendations.push({
              slot,
              outPlayerId: currentPlayerId,
              inPlayerId: backupId,
              reason: 'FATIGUE',
            });
            break;
          }
        }
      } else if (this.autoSubSettings.respectStarters && fatigue < 30) {
        // Check if starter should come back in
        const entry = chart.find(e => e.slot === slot);
        if (!entry || entry.starters.length === 0) return;

        const starterId = entry.starters[0];
        if (starterId !== currentPlayerId) {
          const starterFatigue = this.fatigueEngine.getFatigue(starterId);
          if (starterFatigue < 40) {
            recommendations.push({
              slot,
              outPlayerId: currentPlayerId,
              inPlayerId: starterId,
              reason: 'FATIGUE',
            });
          }
        }
      }
    });

    return recommendations;
  }

  // Execute all recommended auto-subs
  executeAutoSubs(side: 'offense' | 'defense'): SubstitutionAction[] {
    const recommendations = this.getAutoSubRecommendations(side);
    const executed: SubstitutionAction[] = [];

    recommendations.forEach(rec => {
      if (this.substitute(rec.slot, side, rec.inPlayerId, 'FATIGUE')) {
        executed.push(rec);
      }
    });

    return executed;
  }

  // Settings
  getAutoSubSettings(): AutoSubSettings {
    return { ...this.autoSubSettings };
  }

  setAutoSubSettings(settings: Partial<AutoSubSettings>): void {
    this.autoSubSettings = { ...this.autoSubSettings, ...settings };
  }

  toggleAutoSub(): boolean {
    this.autoSubSettings.enabled = !this.autoSubSettings.enabled;
    return this.autoSubSettings.enabled;
  }

  // Get available players for a slot (for dropdown selection)
  getAvailablePlayers(slot: string, side: 'offense' | 'defense'): RosterPlayer[] {
    const slots = side === 'offense' ? OFFENSIVE_SLOTS : DEFENSIVE_SLOTS;
    const slotDef = slots.find(s => s.slot === slot);

    if (!slotDef) return [];

    return Array.from(this.roster.values()).filter(p =>
      canPlayPosition(p, slotDef.position)
    ).sort((a, b) => b.overall - a.overall);
  }

  // Get position slot definition
  getSlotDefinition(slot: string, side: 'offense' | 'defense'): PositionSlot | undefined {
    const slots = side === 'offense' ? OFFENSIVE_SLOTS : DEFENSIVE_SLOTS;
    return slots.find(s => s.slot === slot);
  }

  // Event handler
  setOnSubstitution(handler: (action: SubstitutionAction) => void): void {
    this.onSubstitution = handler;
  }
}

// Singleton instance
export const substitutionEngine = new SubstitutionEngine();
