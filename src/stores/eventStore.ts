/**
 * Event Store
 *
 * Persisted Zustand store for the event/drama system.
 * Saves meters, heat, owner patience, decisions, and week/day progress.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EventSystemState,
  Meters,
  HiddenState,
  DayOfWeek,
  ShadyActionType,
  ShadyActionCounts,
  GameEvent,
  Choice,
  ChoiceResult,
  DelayedEvent,
} from '../types/Events';
import {
  DEFAULT_METERS,
  DEFAULT_HIDDEN_STATE,
  DEFAULT_SHADY_ACTION_COUNTS,
} from '../types/Events';
import type { Owner } from '../types/Owner';
import { OWNERS } from '../types/Owner';

// =============================================================================
// DECISION HISTORY
// =============================================================================

export interface DecisionRecord {
  week: number;
  day: DayOfWeek;
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceText: string;
  success: boolean;
  meterChanges?: Partial<Meters>;
  heatChange?: number;
  patienceChange?: number;
  timestamp: number;
}

// =============================================================================
// STORE STATE
// =============================================================================

interface EventStoreState {
  // Core event system state
  ownerId: string;
  currentDay: DayOfWeek;
  currentWeek: number;
  meters: Meters;
  hidden: HiddenState;
  shadyActionCounts: ShadyActionCounts;

  // Event tracking
  usedEventIds: string[];
  eventCooldowns: Record<string, number>;

  // Weekly flags
  didShadyActionThisWeek: boolean;
  hadScandalThisWeek: boolean;
  mediaAppearancesThisWeek: number;
  lastGameWon: boolean | null;

  // Decision history
  decisionHistory: DecisionRecord[];

  // Current event (for mid-session resume)
  pendingEventId: string | null;

  // Initialization flag
  isInitialized: boolean;
}

interface EventStoreActions {
  // Initialization
  initialize: (ownerId: string) => void;
  reset: () => void;

  // State getters (computed)
  getOwner: () => Owner;
  getEventSystemState: () => EventSystemState;

  // Day/Week management
  setCurrentDay: (day: DayOfWeek) => void;
  advanceDay: () => { newDay: DayOfWeek; newWeek: boolean };

  // Meter updates
  updateMeters: (changes: Partial<Meters>) => void;
  updateHeat: (delta: number) => void;
  updateOwnerPatience: (delta: number) => void;
  updateSlushFund: (delta: number) => void;

  // Event tracking
  markEventUsed: (eventId: string) => void;
  setEventCooldown: (eventId: string, untilWeek: number) => void;
  isEventOnCooldown: (eventId: string) => boolean;
  setPendingEvent: (eventId: string | null) => void;

  // Weekly flags
  setDidShadyAction: (value: boolean) => void;
  setHadScandal: (value: boolean) => void;
  incrementMediaAppearances: () => void;
  setLastGameResult: (won: boolean) => void;
  resetWeeklyFlags: () => void;

  // Shady action counts
  incrementShadyActionCount: (actionType: ShadyActionType) => void;

  // Decision history
  recordDecision: (record: Omit<DecisionRecord, 'timestamp'>) => void;
  getDecisionHistory: () => DecisionRecord[];

  // Delayed events
  addDelayedEvent: (event: DelayedEvent) => void;
  removeDelayedEvent: (eventId: string) => void;
  getTriggeredDelayedEvents: () => DelayedEvent[];
}

type EventStore = EventStoreState & EventStoreActions;

// =============================================================================
// HELPERS
// =============================================================================

const DAYS_IN_ORDER: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getInitialState(): EventStoreState {
  return {
    ownerId: 'tex',
    currentDay: 'MONDAY',
    currentWeek: 1,
    meters: { ...DEFAULT_METERS },
    hidden: { ...DEFAULT_HIDDEN_STATE },
    shadyActionCounts: { ...DEFAULT_SHADY_ACTION_COUNTS },
    usedEventIds: [],
    eventCooldowns: {},
    didShadyActionThisWeek: false,
    hadScandalThisWeek: false,
    mediaAppearancesThisWeek: 0,
    lastGameWon: null,
    decisionHistory: [],
    pendingEventId: null,
    isInitialized: false,
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      // Initialize with owner
      initialize: (ownerId: string) => {
        const owner = OWNERS[ownerId];
        if (!owner) return;

        set({
          ownerId,
          currentDay: 'MONDAY',
          currentWeek: 1,
          meters: { ...DEFAULT_METERS },
          hidden: {
            ...DEFAULT_HIDDEN_STATE,
            slushFund: owner.annualBudget,
          },
          shadyActionCounts: { ...DEFAULT_SHADY_ACTION_COUNTS },
          usedEventIds: [],
          eventCooldowns: {},
          didShadyActionThisWeek: false,
          hadScandalThisWeek: false,
          mediaAppearancesThisWeek: 0,
          lastGameWon: null,
          decisionHistory: [],
          pendingEventId: null,
          isInitialized: true,
        });
      },

      reset: () => {
        set(getInitialState());
      },

      // Get owner object
      getOwner: () => {
        const { ownerId } = get();
        return OWNERS[ownerId] || OWNERS['tex'];
      },

      // Get event system state (for compatibility with existing code)
      getEventSystemState: (): EventSystemState => {
        const state = get();
        return {
          currentDay: state.currentDay,
          currentWeek: state.currentWeek,
          meters: state.meters,
          hidden: state.hidden,
          shadyActionCounts: state.shadyActionCounts,
          usedEventIds: state.usedEventIds,
          eventCooldowns: state.eventCooldowns,
          didShadyActionThisWeek: state.didShadyActionThisWeek,
          hadScandalThisWeek: state.hadScandalThisWeek,
          mediaAppearancesThisWeek: state.mediaAppearancesThisWeek,
          lastGameWon: state.lastGameWon,
        };
      },

      // Day/Week management
      setCurrentDay: (day: DayOfWeek) => {
        set({ currentDay: day });
      },

      advanceDay: () => {
        const { currentDay, currentWeek, didShadyActionThisWeek, hidden } = get();
        const currentIndex = DAYS_IN_ORDER.indexOf(currentDay);
        const isEndOfWeek = currentIndex === DAYS_IN_ORDER.length - 1;

        const newDay = isEndOfWeek ? 'MONDAY' : DAYS_IN_ORDER[currentIndex + 1];
        const newWeek = isEndOfWeek ? currentWeek + 1 : currentWeek;

        // If new week, handle weekly resets
        if (isEndOfWeek) {
          // Decay heat if no shady actions
          const newHeat = didShadyActionThisWeek
            ? hidden.heat
            : Math.max(0, hidden.heat - 2);

          set({
            currentDay: newDay,
            currentWeek: newWeek,
            hidden: { ...hidden, heat: newHeat },
            didShadyActionThisWeek: false,
            hadScandalThisWeek: false,
            mediaAppearancesThisWeek: 0,
          });
        } else {
          set({ currentDay: newDay });
        }

        return { newDay, newWeek: isEndOfWeek };
      },

      // Meter updates
      updateMeters: (changes: Partial<Meters>) => {
        const { meters } = get();
        const newMeters = { ...meters };

        for (const [key, delta] of Object.entries(changes)) {
          const meterKey = key as keyof Meters;
          if (delta !== undefined) {
            newMeters[meterKey] = clamp(meters[meterKey] + delta, 0, 100);
          }
        }

        set({ meters: newMeters });
      },

      updateHeat: (delta: number) => {
        const { hidden } = get();
        set({
          hidden: {
            ...hidden,
            heat: clamp(hidden.heat + delta, 0, 100),
          },
        });
      },

      updateOwnerPatience: (delta: number) => {
        const { hidden } = get();
        set({
          hidden: {
            ...hidden,
            ownerPatience: clamp(hidden.ownerPatience + delta, 0, 100),
          },
        });
      },

      updateSlushFund: (delta: number) => {
        const { hidden } = get();
        set({
          hidden: {
            ...hidden,
            slushFund: Math.max(0, hidden.slushFund + delta),
          },
        });
      },

      // Event tracking
      markEventUsed: (eventId: string) => {
        const { usedEventIds } = get();
        if (!usedEventIds.includes(eventId)) {
          set({ usedEventIds: [...usedEventIds, eventId] });
        }
      },

      setEventCooldown: (eventId: string, untilWeek: number) => {
        const { eventCooldowns } = get();
        set({
          eventCooldowns: { ...eventCooldowns, [eventId]: untilWeek },
        });
      },

      isEventOnCooldown: (eventId: string) => {
        const { eventCooldowns, currentWeek } = get();
        const cooldownUntil = eventCooldowns[eventId];
        return cooldownUntil !== undefined && currentWeek < cooldownUntil;
      },

      setPendingEvent: (eventId: string | null) => {
        set({ pendingEventId: eventId });
      },

      // Weekly flags
      setDidShadyAction: (value: boolean) => {
        set({ didShadyActionThisWeek: value });
      },

      setHadScandal: (value: boolean) => {
        set({ hadScandalThisWeek: value });
      },

      incrementMediaAppearances: () => {
        const { mediaAppearancesThisWeek } = get();
        set({ mediaAppearancesThisWeek: mediaAppearancesThisWeek + 1 });
      },

      setLastGameResult: (won: boolean) => {
        set({ lastGameWon: won });
      },

      resetWeeklyFlags: () => {
        set({
          didShadyActionThisWeek: false,
          hadScandalThisWeek: false,
          mediaAppearancesThisWeek: 0,
        });
      },

      // Shady action counts
      incrementShadyActionCount: (actionType: ShadyActionType) => {
        const { shadyActionCounts } = get();
        set({
          shadyActionCounts: {
            ...shadyActionCounts,
            [actionType]: (shadyActionCounts[actionType] || 0) + 1,
          },
          didShadyActionThisWeek: true,
        });
      },

      // Decision history
      recordDecision: (record: Omit<DecisionRecord, 'timestamp'>) => {
        const { decisionHistory } = get();
        set({
          decisionHistory: [
            ...decisionHistory,
            { ...record, timestamp: Date.now() },
          ],
        });
      },

      getDecisionHistory: () => {
        return get().decisionHistory;
      },

      // Delayed events
      addDelayedEvent: (event: DelayedEvent) => {
        const { hidden } = get();
        set({
          hidden: {
            ...hidden,
            delayedEvents: [...hidden.delayedEvents, event],
          },
        });
      },

      removeDelayedEvent: (sourceEventId: string) => {
        const { hidden } = get();
        set({
          hidden: {
            ...hidden,
            delayedEvents: hidden.delayedEvents.filter(
              e => e.sourceEventId !== sourceEventId
            ),
          },
        });
      },

      getTriggeredDelayedEvents: () => {
        const { hidden, currentWeek } = get();
        return hidden.delayedEvents.filter(e => e.triggersAtWeek <= currentWeek);
      },
    }),
    {
      name: 'gridiron-event-storage',
    }
  )
);
