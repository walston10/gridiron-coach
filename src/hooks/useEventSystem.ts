/**
 * Event System Hook
 *
 * Manages the event system state and provides methods for:
 * - Selecting events for each day
 * - Resolving player choices
 * - Advancing through the week
 * - Tracking meters and hidden state
 *
 * Uses persisted eventStore for state that survives page refreshes.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  GameEvent,
  Choice,
  EventSystemState,
  ChoiceResult,
  DayOfWeek,
  PlayerStatusUpdate,
  EffectApplication,
  PlayerEffect,
} from '../types/Events';
import type { Owner } from '../types/Owner';
import { OWNERS, OWNER_LIST } from '../types/Owner';
import { useEventStore } from '../stores/eventStore';
import { useEffectsStore } from '../stores/effectsStore';
import {
  selectEventForDay,
  resolveChoice,
  updatePatienceForGame,
  updatePatienceWeekly,
  isFired,
  isIndicted,
  isUnderInvestigation,
  checkDelayedEvents,
} from '../engine/EventEngine';
import { STARTER_EVENTS, getDelayedEventContent } from '../data/events';

export interface UseEventSystemOptions {
  ownerId?: string;
  onPlayerStatusChange?: (update: PlayerStatusUpdate) => void;
  onGameOver?: (reason: 'FIRED' | 'INDICTED') => void;
}

export interface EventSystemHook {
  // State
  state: EventSystemState;
  owner: Owner;
  currentEvent: GameEvent | null;
  lastResult: ChoiceResult | null;

  // Status flags
  isUnderInvestigation: boolean;
  gameOver: { fired: boolean; indicted: boolean };

  // Actions
  startNewSeason: (ownerId?: string) => void;
  selectEvent: () => GameEvent | null;
  makeChoice: (choice: Choice) => ChoiceResult;
  advanceToNextDay: () => { newDay: DayOfWeek; newWeek: boolean };
  recordGameResult: (won: boolean) => void;
  dismissEvent: () => void;

  // Helpers
  getAvailableEvents: () => GameEvent[];
}

export function useEventSystem(options: UseEventSystemOptions = {}): EventSystemHook {
  const { onPlayerStatusChange, onGameOver } = options;

  // Get persisted state from eventStore
  const eventStore = useEventStore();
  const effectsStore = useEffectsStore();

  // Ephemeral state (doesn't need persistence)
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastResult, setLastResult] = useState<ChoiceResult | null>(null);

  // Get owner from store
  const owner = useMemo(() => {
    return OWNERS[eventStore.ownerId] || OWNER_LIST[0];
  }, [eventStore.ownerId]);

  // Build EventSystemState from store (for compatibility)
  const state = useMemo((): EventSystemState => {
    return eventStore.getEventSystemState();
  }, [
    eventStore.currentDay,
    eventStore.currentWeek,
    eventStore.meters,
    eventStore.hidden,
    eventStore.shadyActionCounts,
    eventStore.usedEventIds,
    eventStore.eventCooldowns,
    eventStore.didShadyActionThisWeek,
    eventStore.hadScandalThisWeek,
    eventStore.mediaAppearancesThisWeek,
    eventStore.lastGameWon,
  ]);

  // Initialize store if not yet initialized
  useEffect(() => {
    if (!eventStore.isInitialized) {
      eventStore.initialize(options.ownerId || 'tex');
    }
  }, [eventStore.isInitialized, options.ownerId]);

  // Restore pending event on mount (for mid-session resume)
  useEffect(() => {
    if (eventStore.pendingEventId && !currentEvent) {
      const event = STARTER_EVENTS.find(e => e.id === eventStore.pendingEventId);
      if (event) {
        setCurrentEvent(event);
      }
    }
  }, [eventStore.pendingEventId, currentEvent]);

  // Start a new season with optional owner selection
  const startNewSeason = useCallback((ownerId?: string) => {
    const newOwnerId = ownerId || eventStore.ownerId;
    eventStore.initialize(newOwnerId);
    effectsStore.reset();
    setCurrentEvent(null);
    setLastResult(null);
  }, [eventStore, effectsStore]);

  // Get all eligible events for the current day
  const getAvailableEvents = useCallback((): GameEvent[] => {
    return STARTER_EVENTS.filter(event => {
      if (event.day !== state.currentDay) return false;
      return true;
    });
  }, [state.currentDay]);

  // Select an event for the current day
  const selectEvent = useCallback((): GameEvent | null => {
    // First check for delayed events
    const delayed = checkDelayedEvents(state);
    if (delayed) {
      const delayedEvent = getDelayedEventContent(delayed.type, delayed.sourceEventId);
      setCurrentEvent(delayedEvent);
      eventStore.setPendingEvent(delayedEvent.id);
      return delayedEvent;
    }

    // Then try to select a regular event
    const event = selectEventForDay(
      state.currentDay,
      STARTER_EVENTS,
      state,
      owner.id
    );

    setCurrentEvent(event);
    eventStore.setPendingEvent(event?.id || null);
    return event;
  }, [state, owner.id, eventStore]);

  // Effect application handler
  const handleEffectApplied = useCallback((
    effect: EffectApplication,
    playerId: string
  ): PlayerEffect | null => {
    return effectsStore.applyEffect(
      effect,
      playerId,
      currentEvent?.id || 'unknown',
      'unknown', // Choice ID would be passed in actual implementation
      state.currentWeek,
      state.currentDay
    );
  }, [effectsStore, currentEvent, state.currentWeek, state.currentDay]);

  // Make a choice for the current event
  const makeChoice = useCallback((choice: Choice): ChoiceResult => {
    if (!currentEvent) {
      return {
        success: false,
        reason: 'PREREQUISITES_NOT_MET',
        flavorText: 'No event to respond to.',
      };
    }

    // Create a mutable copy of state for the engine
    const mutableState = { ...state };

    const result = resolveChoice({
      event: currentEvent,
      choice,
      owner,
      state: mutableState,
      onPlayerStatusChange,
      onEffectApplied: handleEffectApplied,
    });

    // Apply state changes to the persisted store
    if (result.meterChanges) {
      eventStore.updateMeters(result.meterChanges);
    }
    if (result.heatChange) {
      eventStore.updateHeat(result.heatChange);
    }
    if (result.patienceChange) {
      eventStore.updateOwnerPatience(result.patienceChange);
    }

    // Mark event as used
    eventStore.markEventUsed(currentEvent.id);

    // Set cooldown if applicable
    if (currentEvent.cooldown > 0) {
      eventStore.setEventCooldown(currentEvent.id, state.currentWeek + currentEvent.cooldown);
    }

    // Track shady action
    if (choice.shadyActionType) {
      eventStore.incrementShadyActionCount(choice.shadyActionType);
    }

    // Record the decision
    eventStore.recordDecision({
      week: state.currentWeek,
      day: state.currentDay,
      eventId: currentEvent.id,
      eventTitle: currentEvent.title,
      choiceId: choice.id,
      choiceText: choice.text,
      success: result.success,
      meterChanges: result.meterChanges,
      heatChange: result.heatChange,
      patienceChange: result.patienceChange,
    });

    setLastResult(result);

    // Check for game over conditions
    const updatedState = eventStore.getEventSystemState();
    if (isFired(updatedState)) {
      onGameOver?.('FIRED');
    } else if (isIndicted(updatedState)) {
      onGameOver?.('INDICTED');
    }

    return result;
  }, [currentEvent, owner, state, onPlayerStatusChange, onGameOver, eventStore, handleEffectApplied]);

  // Advance to the next day
  const advanceToNextDay = useCallback(() => {
    const result = eventStore.advanceDay();

    // Handle weekly patience update on new week
    if (result.newWeek) {
      const updatedState = eventStore.getEventSystemState();
      // Calculate patience change based on owner expectations
      const patienceChange = owner.winExpectation === 'REBUILD' ? 2 :
                             owner.winExpectation === 'CONTEND' ? -2 : 0;
      if (patienceChange !== 0) {
        eventStore.updateOwnerPatience(patienceChange);
      }

      // Process weekly effect expirations
      effectsStore.onEndOfWeek();
    }

    setCurrentEvent(null);
    setLastResult(null);
    eventStore.setPendingEvent(null);

    // Check for game over
    const updatedState = eventStore.getEventSystemState();
    if (isFired(updatedState)) {
      onGameOver?.('FIRED');
    }

    return { newDay: result.newDay, newWeek: result.newWeek };
  }, [eventStore, effectsStore, owner, onGameOver]);

  // Record game result (called after Sunday's game)
  const recordGameResult = useCallback((won: boolean) => {
    eventStore.setLastGameResult(won);

    // Update patience based on game result and owner
    const patienceChange = won
      ? (owner.winExpectation === 'REBUILD' ? 3 : 1)
      : (owner.winExpectation === 'CONTEND' ? -5 : -2);

    eventStore.updateOwnerPatience(patienceChange);

    // Process end of game effects
    effectsStore.onEndOfGame();

    const updatedState = eventStore.getEventSystemState();
    if (isFired(updatedState)) {
      onGameOver?.('FIRED');
    }
  }, [eventStore, effectsStore, owner, onGameOver]);

  // Dismiss current event without making a choice (for continue after result)
  const dismissEvent = useCallback(() => {
    setCurrentEvent(null);
    setLastResult(null);
    eventStore.setPendingEvent(null);
  }, [eventStore]);

  // Computed values
  const gameOver = useMemo(() => ({
    fired: isFired(state),
    indicted: isIndicted(state),
  }), [state]);

  const underInvestigation = useMemo(
    () => isUnderInvestigation(state),
    [state]
  );

  return {
    state,
    owner,
    currentEvent,
    lastResult,
    isUnderInvestigation: underInvestigation,
    gameOver,
    startNewSeason,
    selectEvent,
    makeChoice,
    advanceToNextDay,
    recordGameResult,
    dismissEvent,
    getAvailableEvents,
  };
}

export default useEventSystem;
