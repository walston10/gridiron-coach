/**
 * useSubstitutions Hook
 *
 * Manages substitution state during gameplay, integrating with
 * FatigueEngine for fatigue-based recommendations.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { fatigueEngine } from '../engine/FatigueEngine';
import type {
  RosterPlayer,
  AutoSubSettings,
  PlayerFatigueDisplay,
  FatigueLevel,
  PositionSlot,
} from '../types/Substitution';
import { OFFENSIVE_SLOTS, DEFENSIVE_SLOTS } from '../types/Substitution';

// Generate demo roster players
function generateDemoRoster(): RosterPlayer[] {
  const players: RosterPlayer[] = [];

  const names = {
    QB: ['Patrick Mahomes', 'Aaron Rodgers', 'Josh Allen'],
    RB: ['Derrick Henry', 'Saquon Barkley', 'Nick Chubb', 'Austin Ekeler'],
    FB: ['Kyle Juszczyk', 'Alec Ingold'],
    WR: ['Tyreek Hill', 'Justin Jefferson', 'Davante Adams', 'Jamarr Chase', 'Stefon Diggs', 'CeeDee Lamb'],
    TE: ['Travis Kelce', 'Mark Andrews', 'George Kittle'],
    LT: ['Trent Williams', 'Laremy Tunsil'],
    LG: ['Quenton Nelson', 'Joel Bitonio'],
    C: ['Jason Kelce', 'Frank Ragnow'],
    RG: ['Zack Martin', 'Chris Lindstrom'],
    RT: ['Penei Sewell', 'Lane Johnson'],
    DE: ['Myles Garrett', 'Nick Bosa', 'Maxx Crosby', 'TJ Watt'],
    DT: ['Aaron Donald', 'Chris Jones', 'Quinnen Williams', 'Dexter Lawrence'],
    OLB: ['Micah Parsons', 'Khalil Mack', 'Matt Judon', 'Von Miller'],
    MLB: ['Fred Warner', 'Bobby Wagner', 'Roquan Smith'],
    CB: ['Jalen Ramsey', 'Sauce Gardner', 'Patrick Surtain', 'Derek Stingley'],
    FS: ['Jessie Bates', 'Minkah Fitzpatrick'],
    SS: ['Derwin James', 'Budda Baker'],
  };

  let id = 1;
  Object.entries(names).forEach(([pos, playerNames]) => {
    playerNames.forEach((name, idx) => {
      players.push({
        id: `player_${id}`,
        name: name.split(' ').pop() || name, // Last name only
        position: pos as RosterPlayer['position'],
        positions: [pos as RosterPlayer['position']],
        overall: 90 - idx * 5 + Math.floor(Math.random() * 5),
        speed: 70 + Math.floor(Math.random() * 25),
        acceleration: 70 + Math.floor(Math.random() * 25),
        attributes: {},
      });
      id++;
    });
  });

  return players;
}

// Build initial depth chart
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
    const candidates = byPosition.get(slot.position) || [];

    // Find first unused player for starter, allow repeats for backups
    const starters: string[] = [];
    candidates.forEach(player => {
      if (starters.length === 0 && !usedStarters.has(player.id)) {
        starters.push(player.id);
        usedStarters.add(player.id);
      } else if (starters.length > 0 && starters.length < 3) {
        starters.push(player.id);
      }
    });

    return {
      slot: slot.slot,
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
  // Initialize roster (memoized to persist across renders)
  const roster = useMemo(() => generateDemoRoster(), []);

  // Build initial depth charts (memoized - changes would need roster edit)
  const offenseDepthChart = useMemo(() =>
    buildInitialDepthChart(roster, OFFENSIVE_SLOTS), [roster]
  );
  const defenseDepthChart = useMemo(() =>
    buildInitialDepthChart(roster, DEFENSIVE_SLOTS), [roster]
  );

  // Current lineups (who's actually on the field)
  const [offenseLineup, setOffenseLineup] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    offenseDepthChart.forEach(entry => {
      if (entry.starters.length > 0) {
        map.set(entry.slot, entry.starters[0]);
      }
    });
    return map;
  });

  const [defenseLineup, setDefenseLineup] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    defenseDepthChart.forEach(entry => {
      if (entry.starters.length > 0) {
        map.set(entry.slot, entry.starters[0]);
      }
    });
    return map;
  });

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
    // Set up periodic refresh
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

        // Find a rested backup
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

        // Find a rested backup
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
