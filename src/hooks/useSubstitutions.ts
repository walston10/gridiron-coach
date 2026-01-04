/**
 * useSubstitutions Hook (Simplified Roster)
 *
 * Manages substitution state during gameplay, integrating with
 * FatigueEngine for fatigue-based recommendations.
 * Uses simplified roster with 5 skill players + 1 bench each per side.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { fatigueEngine } from '../engine/FatigueEngine';
import { useGameStore } from '../stores/gameStore';
import type {
  RosterPlayer,
  AutoSubSettings,
  PlayerFatigueDisplay,
  FatigueLevel,
  PositionSlot,
} from '../types/Substitution';
import { OFFENSIVE_SLOTS, DEFENSIVE_SLOTS } from '../types/Substitution';
import type { Player, Position } from '../types/Player';

// Valid positions for substitution system (game positions)
const VALID_POSITIONS: Position[] = [
  'QB', 'RB', 'FB', 'WR', 'TE',
  'CB', 'FS', 'SS', 'OLB', 'MLB', 'ILB'
];

// Map legacy roster positions to simplified slot IDs
// WR -> WR1, WR2; CB -> CB1, CB2; Safeties -> S; Linebackers -> LB1, LB2
// Line positions map to unit slots (HOGS for O-line, FRONT for D-line)
const POSITION_TO_SLOTS: Record<string, string[]> = {
  'QB': ['QB'],
  'RB': ['RB'],
  'WR': ['WR1', 'WR2'],
  'TE': ['FLEX'],
  'FB': ['FLEX'],
  'CB': ['CB1', 'CB2'],
  'FS': ['S'],
  'SS': ['S'],
  'MLB': ['LB1', 'LB2'],
  'OLB': ['LB1', 'LB2'],
  'ILB': ['LB1', 'LB2'],
  // Line positions (if they exist in roster, map to unit slots)
  'LT': ['HOGS'], 'LG': ['HOGS'], 'C': ['HOGS'], 'RG': ['HOGS'], 'RT': ['HOGS'],
  'DE': ['FRONT'], 'DT': ['FRONT'], 'NT': ['FRONT'],
};

// Reverse mapping: slot ID -> which legacy positions can fill it
const SLOT_TO_POSITIONS: Record<string, string[]> = {
  'QB': ['QB'],
  'RB': ['RB'],
  'WR1': ['WR'],
  'WR2': ['WR'],
  'FLEX': ['TE', 'FB', 'WR'],  // FLEX can be TE, FB, or extra WR
  'CB1': ['CB'],
  'CB2': ['CB'],
  'S': ['FS', 'SS'],
  'LB1': ['MLB', 'ILB', 'OLB'],
  'LB2': ['MLB', 'ILB', 'OLB'],
  // Line unit slots - these are units, not individual positions
  'HOGS': [],  // Special unit - no individual subs
  'FRONT': [], // Special unit - no individual subs
};

// Check if a slot is a line unit (no substitution allowed)
function isLineUnit(slot: string): boolean {
  return slot === 'HOGS' || slot === 'FRONT';
}

// Convert game store Player to RosterPlayer for substitution system
function convertToRosterPlayer(player: Player): RosterPlayer | null {
  // Skip players with positions not used in games (linemen, K, P)
  if (!VALID_POSITIONS.includes(player.position as Position)) {
    return null;
  }

  return {
    id: player.id,
    name: player.lastName,
    position: player.position,
    isStarter: player.isStarter ?? true,
    overall: player.overall,
  };
}

// Build initial depth chart from roster
function buildInitialDepthChart(
  roster: RosterPlayer[],
  slots: PositionSlot[]
): { slot: string; starters: string[] }[] {
  // Group players by their legacy position
  const byPosition: Map<string, RosterPlayer[]> = new Map();
  roster.forEach(p => {
    const list = byPosition.get(p.position) || [];
    list.push(p);
    byPosition.set(p.position, list);
  });

  // Sort each position group by overall rating (best first)
  byPosition.forEach(list => {
    list.sort((a, b) => b.overall - a.overall);
  });

  // Track used players to prevent duplicates across slots
  const usedPlayers = new Set<string>();

  return slots.map(slot => {
    // Line units (HOGS, FRONT) don't have individual players
    if (isLineUnit(slot.id)) {
      return {
        slot: slot.id,
        starters: [`unit_${slot.id.toLowerCase()}`],  // Placeholder ID for the unit
      };
    }

    // Get the legacy positions that can fill this slot
    const validPositions = SLOT_TO_POSITIONS[slot.id] || [];

    // Collect all candidates from valid positions
    const candidates: RosterPlayer[] = [];
    validPositions.forEach(pos => {
      const players = byPosition.get(pos) || [];
      candidates.push(...players);
    });

    // Sort all candidates by overall
    candidates.sort((a, b) => b.overall - a.overall);

    // Find first unused player for starter, second for bench
    const starters: string[] = [];
    candidates.forEach(player => {
      if (starters.length < 2 && !usedPlayers.has(player.id)) {
        starters.push(player.id);
        if (starters.length === 1) {
          usedPlayers.add(player.id); // Only mark starter as used
        }
      }
    });

    return {
      slot: slot.id,
      starters,
    };
  });
}

interface UseSubstitutionsReturn {
  roster: RosterPlayer[];
  offenseDepthChart: { slot: string; starters: string[] }[];
  defenseDepthChart: { slot: string; starters: string[] }[];
  offenseLineup: Map<string, string>;
  defenseLineup: Map<string, string>;
  offenseFatigue: Map<string, PlayerFatigueDisplay>;
  defenseFatigue: Map<string, PlayerFatigueDisplay>;
  autoSubSettings: AutoSubSettings;
  substituteOffense: (slot: string, newPlayerId: string) => void;
  substituteDefense: (slot: string, newPlayerId: string) => void;
  toggleAutoSub: () => void;
  autoSubOffense: () => number;
  autoSubDefense: () => number;
  refreshFatigue: () => void;
}

export function useSubstitutions(): UseSubstitutionsReturn {
  // Get team roster from game store
  const { teams, userTeamId } = useGameStore();
  const userTeam = teams.find(t => t.info.id === userTeamId);

  // Convert actual roster to RosterPlayer format
  const roster = useMemo(() => {
    if (!userTeam?.roster) return [];
    return userTeam.roster
      .map(convertToRosterPlayer)
      .filter((p): p is RosterPlayer => p !== null);
  }, [userTeam?.roster]);

  // Build initial depth charts
  const offenseDepthChart = useMemo(() =>
    buildInitialDepthChart(roster, OFFENSIVE_SLOTS), [roster]
  );
  const defenseDepthChart = useMemo(() =>
    buildInitialDepthChart(roster, DEFENSIVE_SLOTS), [roster]
  );

  // Current lineups (who's actually on the field)
  const [offenseLineup, setOffenseLineup] = useState<Map<string, string>>(new Map());
  const [defenseLineup, setDefenseLineup] = useState<Map<string, string>>(new Map());

  // Initialize lineups when depth chart is ready
  useEffect(() => {
    const offMap = new Map<string, string>();
    offenseDepthChart.forEach(entry => {
      if (entry.starters.length > 0) {
        offMap.set(entry.slot, entry.starters[0]);
      }
    });
    setOffenseLineup(offMap);

    const defMap = new Map<string, string>();
    defenseDepthChart.forEach(entry => {
      if (entry.starters.length > 0) {
        defMap.set(entry.slot, entry.starters[0]);
      }
    });
    setDefenseLineup(defMap);
  }, [offenseDepthChart, defenseDepthChart]);

  // Auto-sub settings
  const [autoSubSettings, setAutoSubSettings] = useState<AutoSubSettings>({
    enabled: true,
    fatigueThreshold: 70,
    respectStarters: true,
  });

  // Fatigue data - refreshed periodically
  const [offenseFatigue, setOffenseFatigue] = useState<Map<string, PlayerFatigueDisplay>>(new Map());
  const [defenseFatigue, setDefenseFatigue] = useState<Map<string, PlayerFatigueDisplay>>(new Map());

  // Refresh fatigue data from engine
  const refreshFatigue = useCallback(() => {
    const buildFatigueMap = (lineup: Map<string, string>): Map<string, PlayerFatigueDisplay> => {
      const map = new Map<string, PlayerFatigueDisplay>();
      lineup.forEach((playerId) => {
        const fatigue = fatigueEngine.getFatigue(playerId);
        const status = fatigueEngine.getFatigueStatus(playerId);
        const shouldSub = fatigueEngine.shouldSubstitute(playerId);

        map.set(playerId, {
          playerId,
          position: 'QB', // Position tracked separately
          level: status as FatigueLevel,
          percentage: fatigue,
          shouldSub,
        });
      });
      return map;
    };

    setOffenseFatigue(buildFatigueMap(offenseLineup));
    setDefenseFatigue(buildFatigueMap(defenseLineup));
  }, [offenseLineup, defenseLineup]);

  // Refresh fatigue on mount and when lineup changes
  useEffect(() => {
    refreshFatigue();
    const interval = setInterval(refreshFatigue, 500);
    return () => clearInterval(interval);
  }, [refreshFatigue]);

  // Substitute on offense
  const substituteOffense = useCallback((slot: string, newPlayerId: string) => {
    setOffenseLineup(prev => {
      const next = new Map(prev);
      next.set(slot, newPlayerId);
      return next;
    });
  }, []);

  // Substitute on defense
  const substituteDefense = useCallback((slot: string, newPlayerId: string) => {
    setDefenseLineup(prev => {
      const next = new Map(prev);
      next.set(slot, newPlayerId);
      return next;
    });
  }, []);

  // Toggle auto-sub
  const toggleAutoSub = useCallback(() => {
    setAutoSubSettings(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, []);

  // Execute auto-subs for offense
  const autoSubOffense = useCallback((): number => {
    let count = 0;
    const newLineup = new Map(offenseLineup);

    offenseLineup.forEach((currentPlayerId, slot) => {
      const fatigue = fatigueEngine.getFatigue(currentPlayerId);

      if (fatigue >= autoSubSettings.fatigueThreshold) {
        const entry = offenseDepthChart.find(e => e.slot === slot);
        if (!entry) return;

        // Find a rested backup (the bench player)
        for (const backupId of entry.starters) {
          if (backupId === currentPlayerId) continue;
          const backupFatigue = fatigueEngine.getFatigue(backupId);
          if (backupFatigue < fatigue - 20) {
            newLineup.set(slot, backupId);
            count++;
            break;
          }
        }
      }
    });

    if (count > 0) {
      setOffenseLineup(newLineup);
    }
    return count;
  }, [offenseLineup, offenseDepthChart, autoSubSettings.fatigueThreshold]);

  // Execute auto-subs for defense
  const autoSubDefense = useCallback((): number => {
    let count = 0;
    const newLineup = new Map(defenseLineup);

    defenseLineup.forEach((currentPlayerId, slot) => {
      const fatigue = fatigueEngine.getFatigue(currentPlayerId);

      if (fatigue >= autoSubSettings.fatigueThreshold) {
        const entry = defenseDepthChart.find(e => e.slot === slot);
        if (!entry) return;

        // Find a rested backup (the bench player)
        for (const backupId of entry.starters) {
          if (backupId === currentPlayerId) continue;
          const backupFatigue = fatigueEngine.getFatigue(backupId);
          if (backupFatigue < fatigue - 20) {
            newLineup.set(slot, backupId);
            count++;
            break;
          }
        }
      }
    });

    if (count > 0) {
      setDefenseLineup(newLineup);
    }
    return count;
  }, [defenseLineup, defenseDepthChart, autoSubSettings.fatigueThreshold]);

  return {
    roster,
    offenseDepthChart,
    defenseDepthChart,
    offenseLineup,
    defenseLineup,
    offenseFatigue,
    defenseFatigue,
    autoSubSettings,
    substituteOffense,
    substituteDefense,
    toggleAutoSub,
    autoSubOffense,
    autoSubDefense,
    refreshFatigue,
  };
}
