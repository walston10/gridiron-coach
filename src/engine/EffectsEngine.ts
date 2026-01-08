/**
 * Effects Engine
 *
 * Manages active player effects from events.
 * Handles stat modifications, availability checks, and duration tracking.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PlayerEffect,
  EffectApplication,
  EffectDuration,
  DayOfWeek
} from '../types/Events';
import type { Player, PlayerStats } from '../types/Player';

// =============================================================================
// EFFECTS STATE
// =============================================================================

export interface EffectsState {
  activeEffects: PlayerEffect[];
}

export const DEFAULT_EFFECTS_STATE: EffectsState = {
  activeEffects: [],
};

// =============================================================================
// EFFECT CREATION
// =============================================================================

/**
 * Create a new player effect from an EffectApplication
 */
export function createEffect(
  application: EffectApplication,
  playerId: string,
  eventId: string,
  choiceId: string,
  currentWeek: number,
  currentDay: DayOfWeek
): PlayerEffect {
  return {
    id: uuidv4(),
    playerId,
    type: application.type,
    source: eventId,
    sourceChoice: choiceId,
    duration: { ...application.duration }, // Clone to avoid mutation
    statModifiers: application.statModifiers,
    description: application.description,
    canPlayThrough: application.canPlayThrough,
    playingThrough: false,
    severity: application.severity,
    createdAt: {
      week: currentWeek,
      day: currentDay,
    },
  };
}

// =============================================================================
// EFFECT MANAGEMENT
// =============================================================================

/**
 * Add a new effect to the state
 */
export function addEffect(
  state: EffectsState,
  effect: PlayerEffect
): EffectsState {
  return {
    ...state,
    activeEffects: [...state.activeEffects, effect],
  };
}

/**
 * Remove an effect by ID
 */
export function removeEffect(
  state: EffectsState,
  effectId: string
): EffectsState {
  return {
    ...state,
    activeEffects: state.activeEffects.filter(e => e.id !== effectId),
  };
}

/**
 * Remove all effects for a player
 */
export function clearPlayerEffects(
  state: EffectsState,
  playerId: string
): EffectsState {
  return {
    ...state,
    activeEffects: state.activeEffects.filter(e => e.playerId !== playerId),
  };
}

/**
 * Get all effects for a specific player
 */
export function getPlayerEffects(
  state: EffectsState,
  playerId: string
): PlayerEffect[] {
  return state.activeEffects.filter(e => e.playerId === playerId);
}

/**
 * Toggle "playing through" for an injury effect
 */
export function setPlayingThrough(
  state: EffectsState,
  effectId: string,
  playingThrough: boolean
): EffectsState {
  return {
    ...state,
    activeEffects: state.activeEffects.map(e =>
      e.id === effectId ? { ...e, playingThrough } : e
    ),
  };
}

// =============================================================================
// DURATION MANAGEMENT
// =============================================================================

/**
 * Process end of half - decrement halves-based durations
 */
export function processEndOfHalf(state: EffectsState): EffectsState {
  const updatedEffects = state.activeEffects
    .map(effect => {
      if (effect.duration.type !== 'halves') return effect;

      const newRemaining = effect.duration.remaining - 1;
      if (newRemaining <= 0) return null; // Effect expired

      return {
        ...effect,
        duration: { type: 'halves' as const, remaining: newRemaining },
      };
    })
    .filter((e): e is PlayerEffect => e !== null);

  return { ...state, activeEffects: updatedEffects };
}

/**
 * Process end of game - decrement games-based durations
 */
export function processEndOfGame(state: EffectsState): EffectsState {
  const updatedEffects = state.activeEffects
    .map(effect => {
      if (effect.duration.type !== 'games') return effect;

      const newRemaining = effect.duration.remaining - 1;
      if (newRemaining <= 0) return null; // Effect expired

      return {
        ...effect,
        duration: { type: 'games' as const, remaining: newRemaining },
      };
    })
    .filter((e): e is PlayerEffect => e !== null);

  return { ...state, activeEffects: updatedEffects };
}

/**
 * Process end of week - decrement weeks-based durations
 */
export function processEndOfWeek(state: EffectsState): EffectsState {
  const updatedEffects = state.activeEffects
    .map(effect => {
      if (effect.duration.type !== 'weeks') return effect;

      const newRemaining = effect.duration.remaining - 1;
      if (newRemaining <= 0) return null; // Effect expired

      return {
        ...effect,
        duration: { type: 'weeks' as const, remaining: newRemaining },
      };
    })
    .filter((e): e is PlayerEffect => e !== null);

  return { ...state, activeEffects: updatedEffects };
}

/**
 * Process end of season - remove season-based effects
 */
export function processEndOfSeason(state: EffectsState): EffectsState {
  const updatedEffects = state.activeEffects
    .filter(effect => effect.duration.type !== 'season');

  return { ...state, activeEffects: updatedEffects };
}

// =============================================================================
// AVAILABILITY CHECKS
// =============================================================================

/**
 * Check if a player is available to play
 * Returns false if player has an INJURY (not playing through), SUSPENSION, or UNAVAILABLE effect
 */
export function isPlayerAvailable(
  state: EffectsState,
  playerId: string
): boolean {
  const effects = getPlayerEffects(state, playerId);

  for (const effect of effects) {
    // Suspended or benched = unavailable
    if (effect.type === 'SUSPENSION' || effect.type === 'UNAVAILABLE') {
      return false;
    }

    // Injured but NOT playing through = unavailable
    if (effect.type === 'INJURY' && !effect.playingThrough) {
      return false;
    }
  }

  return true;
}

/**
 * Get the reason a player is unavailable (for UI display)
 */
export function getUnavailableReason(
  state: EffectsState,
  playerId: string
): string | null {
  const effects = getPlayerEffects(state, playerId);

  for (const effect of effects) {
    if (effect.type === 'SUSPENSION') {
      return `Suspended: ${effect.description}`;
    }
    if (effect.type === 'UNAVAILABLE') {
      return `Out: ${effect.description}`;
    }
    if (effect.type === 'INJURY' && !effect.playingThrough) {
      return `Injured: ${effect.description}`;
    }
  }

  return null;
}

/**
 * Check if player has an injury they could play through
 */
export function hasPlayThroughOption(
  state: EffectsState,
  playerId: string
): PlayerEffect | null {
  const effects = getPlayerEffects(state, playerId);
  return effects.find(e =>
    e.type === 'INJURY' &&
    e.canPlayThrough &&
    !e.playingThrough
  ) || null;
}

// =============================================================================
// STAT CALCULATIONS
// =============================================================================

/**
 * Calculate effective stats for a player with all active effects applied
 */
export function getEffectiveStats(
  state: EffectsState,
  player: Player
): PlayerStats {
  const effects = getPlayerEffects(state, player.id);

  // Start with base stats
  const effectiveStats = { ...player.stats };

  // Apply all stat modifiers from active effects
  for (const effect of effects) {
    if (!effect.statModifiers) continue;

    // Skip injury effects unless player is playing through
    if (effect.type === 'INJURY' && !effect.playingThrough) continue;

    // Apply each modifier
    for (const [stat, modifier] of Object.entries(effect.statModifiers)) {
      const key = stat as keyof PlayerStats;
      if (key in effectiveStats && modifier !== undefined) {
        // Apply modifier, clamp to 1-99
        effectiveStats[key] = Math.max(1, Math.min(99, effectiveStats[key] + modifier));
      }
    }
  }

  return effectiveStats;
}

/**
 * Get a summary of all active modifiers on a player
 * Useful for UI display
 */
export function getModifierSummary(
  state: EffectsState,
  playerId: string
): { stat: string; total: number }[] {
  const effects = getPlayerEffects(state, playerId);
  const totals: Record<string, number> = {};

  for (const effect of effects) {
    if (!effect.statModifiers) continue;
    if (effect.type === 'INJURY' && !effect.playingThrough) continue;

    for (const [stat, modifier] of Object.entries(effect.statModifiers)) {
      if (modifier !== undefined) {
        totals[stat] = (totals[stat] || 0) + modifier;
      }
    }
  }

  return Object.entries(totals)
    .filter(([_, total]) => total !== 0)
    .map(([stat, total]) => ({ stat, total }));
}

// =============================================================================
// DURATION DISPLAY HELPERS
// =============================================================================

/**
 * Format duration for display
 */
export function formatDuration(duration: EffectDuration): string {
  switch (duration.type) {
    case 'halves':
      return duration.remaining === 1 ? 'Rest of half' : `${duration.remaining} halves`;
    case 'games':
      return duration.remaining === 1 ? '1 game' : `${duration.remaining} games`;
    case 'weeks':
      return duration.remaining === 1 ? '1 week' : `${duration.remaining} weeks`;
    case 'season':
      return 'Season';
    case 'permanent':
      return 'Permanent';
  }
}

/**
 * Get effect icon for UI
 */
export function getEffectIcon(type: PlayerEffect['type']): string {
  switch (type) {
    case 'INJURY': return '🏥';
    case 'SUSPENSION': return '⛔';
    case 'BOOST': return '⬆️';
    case 'DEBUFF': return '⬇️';
    case 'UNAVAILABLE': return '🚫';
  }
}
