/**
 * Effects Store
 *
 * Zustand store for managing player effects state.
 * Persists effects across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlayerEffect,
  EffectApplication,
  DayOfWeek
} from '../types/Events';
import type { Player, PlayerStats } from '../types/Player';
import {
  createEffect,
  addEffect as addEffectToState,
  removeEffect as removeEffectFromState,
  getPlayerEffects,
  setPlayingThrough as setPlayingThroughState,
  processEndOfHalf,
  processEndOfGame,
  processEndOfWeek,
  processEndOfSeason,
  isPlayerAvailable as checkPlayerAvailable,
  getUnavailableReason as getUnavailableReasonFromState,
  hasPlayThroughOption as hasPlayThroughOptionFromState,
  getEffectiveStats as calculateEffectiveStats,
  getModifierSummary as calculateModifierSummary,
  DEFAULT_EFFECTS_STATE,
  type EffectsState,
} from '../engine/EffectsEngine';

interface EffectsStore extends EffectsState {
  // Effect management
  applyEffect: (
    application: EffectApplication,
    playerId: string,
    eventId: string,
    choiceId: string,
    currentWeek: number,
    currentDay: DayOfWeek
  ) => PlayerEffect;
  removeEffect: (effectId: string) => void;
  clearPlayerEffects: (playerId: string) => void;

  // Play through injury
  setPlayingThrough: (effectId: string, playingThrough: boolean) => void;

  // Duration processing
  onEndOfHalf: () => void;
  onEndOfGame: () => void;
  onEndOfWeek: () => void;
  onEndOfSeason: () => void;

  // Queries (these don't modify state, just read)
  getPlayerEffects: (playerId: string) => PlayerEffect[];
  isPlayerAvailable: (playerId: string) => boolean;
  getUnavailableReason: (playerId: string) => string | null;
  hasPlayThroughOption: (playerId: string) => PlayerEffect | null;
  getEffectiveStats: (player: Player) => PlayerStats;
  getModifierSummary: (playerId: string) => { stat: string; total: number }[];

  // Reset
  reset: () => void;
}

export const useEffectsStore = create<EffectsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_EFFECTS_STATE,

      // Apply a new effect
      applyEffect: (application, playerId, eventId, choiceId, currentWeek, currentDay) => {
        const effect = createEffect(
          application,
          playerId,
          eventId,
          choiceId,
          currentWeek,
          currentDay
        );

        set(state => addEffectToState(state, effect));
        return effect;
      },

      // Remove an effect
      removeEffect: (effectId) => {
        set(state => removeEffectFromState(state, effectId));
      },

      // Clear all effects for a player
      clearPlayerEffects: (playerId) => {
        set(state => ({
          activeEffects: state.activeEffects.filter(e => e.playerId !== playerId),
        }));
      },

      // Toggle playing through injury
      setPlayingThrough: (effectId, playingThrough) => {
        set(state => setPlayingThroughState(state, effectId, playingThrough));
      },

      // Duration processing
      onEndOfHalf: () => {
        set(state => processEndOfHalf(state));
      },

      onEndOfGame: () => {
        set(state => processEndOfGame(state));
      },

      onEndOfWeek: () => {
        set(state => processEndOfWeek(state));
      },

      onEndOfSeason: () => {
        set(state => processEndOfSeason(state));
      },

      // Query functions
      getPlayerEffects: (playerId) => {
        return getPlayerEffects(get(), playerId);
      },

      isPlayerAvailable: (playerId) => {
        return checkPlayerAvailable(get(), playerId);
      },

      getUnavailableReason: (playerId) => {
        return getUnavailableReasonFromState(get(), playerId);
      },

      hasPlayThroughOption: (playerId) => {
        return hasPlayThroughOptionFromState(get(), playerId);
      },

      getEffectiveStats: (player) => {
        return calculateEffectiveStats(get(), player);
      },

      getModifierSummary: (playerId) => {
        return calculateModifierSummary(get(), playerId);
      },

      // Reset all effects
      reset: () => {
        set(DEFAULT_EFFECTS_STATE);
      },
    }),
    {
      name: 'gridiron-effects-storage',
    }
  )
);
