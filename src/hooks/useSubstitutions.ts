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
  // Group players by position
  const byPosition: Map<string, RosterPlayer[]> = new Map();
  roster.forEach(p => {
    const list = byPosition.get(p.position) || [];
    list.push(p);
    byPosition.set(p.position, list);
  });

  // Sort by overall
  byPosition.forEach(list => {
    list.sort((a, b) => b.overall - a.overall);
  });

  // Track used starters to prevent duplicates
  const usedStarters = new Set<string>();

  return slots.map(slot => {
    const candidates = byPosition.get(slot.id) || [];

    // Find first unused player for starter, allow second for bench
    const starters: string[] = [];
    candidates.forEach(player => {
      if (starters.length === 0 && !usedStarters.has(player.id)) {
        starters.push(player.id);
        usedStarters.add(player.id);
      } else if (starters.length === 1) {
        starters.push(player.id); // Bench player
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
