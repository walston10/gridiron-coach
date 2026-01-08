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
// Note: Defense uses captain+unit system, so individual defense positions are less relevant
const VALID_POSITIONS: Position[] = [
  'QB', 'RB', 'FB', 'WR', 'TE',
  'CB', 'FS', 'SS', 'OLB', 'MLB', 'ILB',
  'DE', 'DT', 'NT'
];

// Reverse mapping: slot ID -> which legacy positions can fill it
const SLOT_TO_POSITIONS: Record<string, string[]> = {
  // Offense skill slots
  'QB': ['QB'],
  'RB': ['RB'],
  'WR1': ['WR'],
  'WR2': ['WR'],
  'FB_TE': ['TE', 'FB', 'WR'],  // FB_TE hybrid can be TE, FB, or extra WR
  'SLOT': ['WR', 'TE'],          // SLOT can be WR or TE
  // Defense slots are captain+unit - no individual substitutions
  'D_LINE': [],      // Unit - no individual subs
  'LINEBACKERS': [], // Unit - no individual subs
  'SECONDARY': [],   // Unit - no individual subs
  // O-Line unit slot
  'HOGS': [],  // Unit - no individual subs
};

// Check if a slot is a unit (no individual substitution allowed)
function isLineUnit(slot: string): boolean {
  return slot === 'HOGS' || slot === 'D_LINE' || slot === 'LINEBACKERS' || slot === 'SECONDARY';
}

// =============================================================================
// EMERGENCY BACKUP SYSTEM - "The McBums"
// =============================================================================
// Every position has a guaranteed backup who can never be injured or suspended.
// These are mediocre players (65 overall) but ensure you always have a body.

const MCBUM_FIRST_NAMES = [
  'Arnold', 'Rusty', 'Dusty', 'Lefty', 'Bucky', 'Scooter', 'Bubba', 'Junior',
  'Tater', 'Boomer', 'Denny', 'Lenny', 'Kenny'
];

const MCBUM_LAST_NAMES = [
  'McBum', 'Scrubbs', 'Benchwarm', 'Tryhard', 'Lastpick', 'Warmseats',
  'Clipboard', 'Tacklebox', 'Waterboy', 'Practisquad'
];

// Generate a consistent McBum name for a slot (deterministic based on slot)
function getMcBumName(slot: string): { firstName: string; lastName: string } {
  // Use slot string to pick names consistently
  const hash = slot.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const firstName = MCBUM_FIRST_NAMES[hash % MCBUM_FIRST_NAMES.length];
  const lastName = MCBUM_LAST_NAMES[(hash * 7) % MCBUM_LAST_NAMES.length];
  return { firstName, lastName };
}

// Create an emergency backup player for a slot
function createEmergencyBackup(slot: string): RosterPlayer {
  const { firstName, lastName } = getMcBumName(slot);

  // Map slot to a reasonable position for display
  const slotToPosition: Record<string, string> = {
    // Offense skill positions
    'QB': 'QB', 'RB': 'RB', 'WR1': 'WR', 'WR2': 'WR',
    'FB_TE': 'TE', 'SLOT': 'WR',
    // Defense captain units
    'D_LINE': 'DE', 'LINEBACKERS': 'MLB', 'SECONDARY': 'CB',
    // O-Line unit
    'HOGS': 'LT',
  };

  // Special names for unit slots
  const unitNames: Record<string, string> = {
    'HOGS': 'The Scrub Squad',
    'D_LINE': 'The Practice Dummies',
    'LINEBACKERS': 'The Tackling Dummies',
    'SECONDARY': 'The Coverage Cones',
  };

  const displayName = unitNames[slot] || `${firstName} ${lastName}`;

  return {
    id: `mcbum_${slot}`,
    name: displayName,
    position: (slotToPosition[slot] || 'RB') as Position,
    isStarter: false,
    overall: 65,
    isEmergencyBackup: true,  // Special flag - can never be injured/suspended
  };
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
// Returns both depth chart and McBum players that were created
function buildInitialDepthChart(
  roster: RosterPlayer[],
  slots: PositionSlot[]
): { depthChart: { slot: string; starters: string[] }[]; mcBums: RosterPlayer[] } {
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

  // Collect McBum players that get created
  const mcBums: RosterPlayer[] = [];

  const depthChart = slots.map(slot => {
    // Line units (HOGS, FRONT) - still create a McBum backup unit
    if (isLineUnit(slot.id)) {
      const mcBum = createEmergencyBackup(slot.id);
      mcBums.push(mcBum);
      return {
        slot: slot.id,
        starters: [`unit_${slot.id.toLowerCase()}`, mcBum.id],  // Unit + McBum backup
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

    // Always ensure there's a McBum backup available
    // McBum is the safety net - can't be injured or suspended
    const mcBum = createEmergencyBackup(slot.id);
    mcBums.push(mcBum);

    // If we don't have 2 players, add McBum as backup
    if (starters.length < 2) {
      starters.push(mcBum.id);
    }

    return {
      slot: slot.id,
      starters,
    };
  });

  return { depthChart, mcBums };
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
  const baseRoster = useMemo(() => {
    if (!userTeam?.roster) return [];
    return userTeam.roster
      .map(convertToRosterPlayer)
      .filter((p): p is RosterPlayer => p !== null);
  }, [userTeam?.roster]);

  // Build initial depth charts (includes creating McBum backups)
  const { depthChart: offenseDepthChartRaw, mcBums: offenseMcBums } = useMemo(() =>
    buildInitialDepthChart(baseRoster, OFFENSIVE_SLOTS), [baseRoster]
  );
  const { depthChart: defenseDepthChartRaw, mcBums: defenseMcBums } = useMemo(() =>
    buildInitialDepthChart(baseRoster, DEFENSIVE_SLOTS), [baseRoster]
  );

  // Combine real roster with McBum emergency backups
  const roster = useMemo(() => [
    ...baseRoster,
    ...offenseMcBums,
    ...defenseMcBums,
  ], [baseRoster, offenseMcBums, defenseMcBums]);

  // Use raw depth charts
  const offenseDepthChart = offenseDepthChartRaw;
  const defenseDepthChart = defenseDepthChartRaw;

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
