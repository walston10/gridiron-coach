/**
 * Event System Hook
 *
 * Manages the event system state and provides methods for:
 * - Selecting events for each day
 * - Resolving player choices
 * - Advancing through the week
 * - Tracking meters and hidden state
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  GameEvent,
  Choice,
  EventSystemState,
  ChoiceResult,
  DayOfWeek,
  PlayerStatusUpdate,
} from '../types/Events';
import type { Owner } from '../types/Owner';
import { OWNERS } from '../types/Owner';
import {
  createEventSystemState,
  selectEventForDay,
  resolveChoice,
  advanceDay,
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

  // Initialize with default owner
  const initialOwner = OWNERS.find(o => o.id === (options.ownerId || 'tex')) || OWNERS[0];
  const [owner, setOwner] = useState<Owner>(initialOwner);
  const [state, setState] = useState<EventSystemState>(() => createEventSystemState(initialOwner));
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastResult, setLastResult] = useState<ChoiceResult | null>(null);

  // Start a new season with optional owner selection
  const startNewSeason = useCallback((ownerId?: string) => {
    const newOwner = ownerId
      ? OWNERS.find(o => o.id === ownerId) || OWNERS[0]
      : owner;

    setOwner(newOwner);
    setState(createEventSystemState(newOwner));
    setCurrentEvent(null);
    setLastResult(null);
  }, [owner]);

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
    return event;
  }, [state, owner.id]);

  // Make a choice for the current event
  const makeChoice = useCallback((choice: Choice): ChoiceResult => {
    if (!currentEvent) {
      return {
        success: false,
        reason: 'PREREQUISITES_NOT_MET',
        flavorText: 'No event to respond to.',
      };
    }

    const result = resolveChoice({
      event: currentEvent,
      choice,
      owner,
      state,
      onPlayerStatusChange,
    });

    // Update state immutably
    setState({ ...state });
    setLastResult(result);

    // Check for game over conditions
    if (isFired(state)) {
      onGameOver?.('FIRED');
    } else if (isIndicted(state)) {
      onGameOver?.('INDICTED');
    }

    return result;
  }, [currentEvent, owner, state, onPlayerStatusChange, onGameOver]);

  // Advance to the next day
  const advanceToNextDay = useCallback(() => {
    const result = advanceDay(state);

    // Handle weekly patience update on new week
    if (result.newWeek) {
      updatePatienceWeekly(state, owner);
    }

    setState({ ...state });
    setCurrentEvent(null);
    setLastResult(null);

    // Check for game over
    if (isFired(state)) {
      onGameOver?.('FIRED');
    }

    return { newDay: result.newDay, newWeek: result.newWeek };
  }, [state, owner, onGameOver]);

  // Record game result (called after Sunday's game)
  const recordGameResult = useCallback((won: boolean) => {
    updatePatienceForGame(state, owner, won);
    setState({ ...state });

    if (isFired(state)) {
      onGameOver?.('FIRED');
    }
  }, [state, owner, onGameOver]);

  // Dismiss current event without making a choice (for continue after result)
  const dismissEvent = useCallback(() => {
    setCurrentEvent(null);
    setLastResult(null);
  }, []);

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
