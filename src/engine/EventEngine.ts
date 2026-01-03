/**
 * Event Engine
 *
 * Core engine for the decision/event drama system.
 * Handles choice resolution, meter updates, and event selection.
 */

import type {
  GameEvent,
  Choice,
  EventSystemState,
  Meters,
  HiddenState,
  DelayedEvent,
  ChoiceResult,
  DayOfWeek,
  ShadyActionType,
  PlayerStatus,
  PlayerStatusUpdate,
  Consequences,
} from '../types/Events';
import {
  DAYS_IN_ORDER,
  DEFAULT_METERS,
  DEFAULT_HIDDEN_STATE,
  DEFAULT_SHADY_ACTION_COUNTS,
  HEAT_THRESHOLDS,
} from '../types/Events';
import type { Owner } from '../types/Owner';
import { getOwnerMood } from '../types/Owner';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp all meter values to 0-100
 */
function clampMeters(meters: Meters): Meters {
  return {
    reputation: clamp(meters.reputation, 0, 100),
    culture: clamp(meters.culture, 0, 100),
    image: clamp(meters.image, 0, 100),
    risk: clamp(meters.risk, 0, 100),
    playerTrust: clamp(meters.playerTrust, 0, 100),
  };
}

/**
 * Clamp hidden state values
 */
function clampHiddenState(hidden: HiddenState): HiddenState {
  return {
    ...hidden,
    heat: clamp(hidden.heat, 0, 100),
    ownerPatience: clamp(hidden.ownerPatience, 0, 100),
    slushFund: Math.max(0, hidden.slushFund),
  };
}

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Weighted random selection
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

// =============================================================================
// DIMINISHING RETURNS
// =============================================================================

/**
 * Calculate diminished success rate based on action usage
 */
export function getDiminishedSuccessRate(
  baseRate: number,
  actionType: ShadyActionType,
  counts: Record<ShadyActionType, number>
): number {
  const timesUsed = counts[actionType] || 0;
  return baseRate * Math.pow(0.8, timesUsed);
}

/**
 * Calculate escalating cost based on action usage
 */
export function getEscalatingCost(
  baseCost: number,
  actionType: ShadyActionType,
  counts: Record<ShadyActionType, number>
): number {
  const timesUsed = counts[actionType] || 0;
  return Math.floor(baseCost * Math.pow(1.5, timesUsed));
}

// =============================================================================
// APPLY CONSEQUENCES
// =============================================================================

/**
 * Apply meter changes with owner multipliers
 */
export function applyConsequences(
  state: EventSystemState,
  consequences: Consequences,
  owner: Owner
): { meterChanges: Partial<Meters>; heatChange: number; patienceChange: number } {
  const meterChanges: Partial<Meters> = {};

  // Apply with owner multipliers
  if (consequences.reputation !== undefined) {
    const change = consequences.reputation * owner.reputationMod;
    state.meters.reputation += change;
    meterChanges.reputation = change;
  }

  if (consequences.culture !== undefined) {
    const change = consequences.culture * owner.cultureMod;
    state.meters.culture += change;
    meterChanges.culture = change;
  }

  if (consequences.image !== undefined) {
    const change = consequences.image * owner.imageMod;
    state.meters.image += change;
    meterChanges.image = change;
  }

  if (consequences.risk !== undefined) {
    const change = consequences.risk * owner.riskMod;
    state.meters.risk += change;
    meterChanges.risk = change;
  }

  if (consequences.playerTrust !== undefined) {
    state.meters.playerTrust += consequences.playerTrust;
    meterChanges.playerTrust = consequences.playerTrust;
  }

  // Heat doesn't get multiplied
  const heatChange = consequences.heat || 0;
  state.hidden.heat += heatChange;

  // Direct owner patience hit
  const patienceChange = consequences.ownerPatience || 0;
  state.hidden.ownerPatience += patienceChange;

  // Direct slush fund change
  if (consequences.slushFund !== undefined) {
    state.hidden.slushFund += consequences.slushFund;
  }

  // Clamp values
  state.meters = clampMeters(state.meters);
  state.hidden = clampHiddenState(state.hidden);

  return { meterChanges, heatChange, patienceChange };
}

// =============================================================================
// RESOLVE CHOICE
// =============================================================================

export interface ResolveChoiceParams {
  event: GameEvent;
  choice: Choice;
  owner: Owner;
  state: EventSystemState;
  targetPlayerId?: string;
  onPlayerStatusChange?: (update: PlayerStatusUpdate) => void;
}

/**
 * Resolve a player's choice for an event
 */
export function resolveChoice(params: ResolveChoiceParams): ChoiceResult {
  const { event, choice, owner, state, onPlayerStatusChange } = params;

  // 1. Calculate actual cost with escalation
  let actualCost = choice.cost || 0;
  if (choice.shadyActionType && choice.cost) {
    actualCost = getEscalatingCost(choice.cost, choice.shadyActionType, state.shadyActionCounts);
  }

  // 2. Check if player can afford it
  if (actualCost > 0 && state.hidden.slushFund < actualCost) {
    return {
      success: false,
      reason: 'INSUFFICIENT_FUNDS',
      flavorText: "You don't have enough in the slush fund.",
    };
  }

  // 3. Deduct cost
  if (actualCost > 0) {
    state.hidden.slushFund -= actualCost;
  }

  // 4. Check success rate with diminishing returns
  let success = true;
  if (choice.successRate !== undefined && choice.successRate < 1) {
    let adjustedRate = choice.successRate;

    if (choice.shadyActionType) {
      adjustedRate = getDiminishedSuccessRate(
        choice.successRate,
        choice.shadyActionType,
        state.shadyActionCounts
      );

      // Increment shady action counter
      state.shadyActionCounts[choice.shadyActionType]++;
      state.didShadyActionThisWeek = true;
    }

    success = Math.random() < adjustedRate;
  }

  // 5. Mark if this was a shady action
  if (choice.shadyActionType) {
    state.didShadyActionThisWeek = true;
  }

  // 6. Apply consequences
  const consequences = success ? choice.consequences : choice.failureConsequences;
  let changes = { meterChanges: {}, heatChange: 0, patienceChange: 0 };

  if (consequences) {
    changes = applyConsequences(state, consequences, owner);

    // Handle player status change
    if (consequences.playerStatus && onPlayerStatusChange) {
      onPlayerStatusChange(consequences.playerStatus);
    }
  }

  // 7. Queue delayed consequence
  if (success && choice.delayed) {
    if (Math.random() < choice.delayed.chance) {
      const triggersAt = state.currentWeek +
        randomBetween(choice.delayed.minWeeks, choice.delayed.maxWeeks);

      state.hidden.delayedEvents.push({
        type: choice.delayed.type,
        chance: 1, // Already rolled, guaranteed to fire
        triggersAtWeek: triggersAt,
        sourceEventId: event.id,
        sourceChoiceId: choice.id,
      });
    }
  }

  // 8. Add cooldown for this event
  if (event.cooldown > 0) {
    state.eventCooldowns[event.id] = state.currentWeek + event.cooldown;
  }

  return {
    success,
    flavorText: success
      ? choice.flavorText
      : (choice.failureConsequences?.description || 'It didn\'t work out.'),
    meterChanges: changes.meterChanges,
    heatChange: changes.heatChange,
    patienceChange: changes.patienceChange,
  };
}

// =============================================================================
// EVENT SELECTION
// =============================================================================

/**
 * Check if an event's prerequisites are met
 */
export function checkPrerequisites(
  event: GameEvent,
  state: EventSystemState,
  ownerId: string
): boolean {
  const prereqs = event.prerequisites;
  if (!prereqs) return true;

  if (prereqs.minWeek && state.currentWeek < prereqs.minWeek) return false;
  if (prereqs.maxWeek && state.currentWeek > prereqs.maxWeek) return false;
  if (prereqs.maxHeat && state.hidden.heat > prereqs.maxHeat) return false;
  if (prereqs.minHeat && state.hidden.heat < prereqs.minHeat) return false;
  if (prereqs.minCorruption && state.meters.reputation > (100 - prereqs.minCorruption)) return false;
  if (prereqs.ownerOnly && prereqs.ownerOnly !== ownerId) return false;
  if (prereqs.minSlushFund && state.hidden.slushFund < prereqs.minSlushFund) return false;
  if (prereqs.dayAfterLoss && state.lastGameWon !== false) return false;
  if (prereqs.dayAfterWin && state.lastGameWon !== true) return false;

  return true;
}

/**
 * Check if event is on cooldown
 */
export function isEventOnCooldown(eventId: string, state: EventSystemState): boolean {
  const cooldownUntil = state.eventCooldowns[eventId];
  if (!cooldownUntil) return false;
  return state.currentWeek < cooldownUntil;
}

/**
 * Select an event for a specific day
 */
export function selectEventForDay(
  day: DayOfWeek,
  allEvents: GameEvent[],
  state: EventSystemState,
  ownerId: string
): GameEvent | null {
  // Filter eligible events
  const eligible = allEvents.filter(event => {
    // Must be for this day
    if (event.day !== day) return false;

    // Must not be on cooldown
    if (isEventOnCooldown(event.id, state)) return false;

    // Must meet prerequisites
    if (!checkPrerequisites(event, state, ownerId)) return false;

    return true;
  });

  if (eligible.length === 0) return null;

  // Weight by rarity
  const weights = eligible.map(event => {
    switch (event.rarity) {
      case 'COMMON': return 10;
      case 'UNCOMMON': return 4;
      case 'RARE': return 1;
      default: return 5;
    }
  });

  return weightedRandom(eligible, weights);
}

// =============================================================================
// DAY ADVANCEMENT
// =============================================================================

/**
 * Get the next day in the week
 */
export function getNextDay(currentDay: DayOfWeek): DayOfWeek {
  const index = DAYS_IN_ORDER.indexOf(currentDay);
  if (index === DAYS_IN_ORDER.length - 1) {
    return 'MONDAY'; // Wrap to next week
  }
  return DAYS_IN_ORDER[index + 1];
}

/**
 * Check for triggered delayed events
 */
export function checkDelayedEvents(state: EventSystemState): DelayedEvent | null {
  const due = state.hidden.delayedEvents.filter(
    e => e.triggersAtWeek <= state.currentWeek
  );

  for (const delayed of due) {
    // Already determined it will fire when queued
    // Remove from queue
    state.hidden.delayedEvents = state.hidden.delayedEvents.filter(e => e !== delayed);
    return delayed;
  }

  return null;
}

/**
 * Advance to the next day and handle weekly resets
 */
export function advanceDay(state: EventSystemState): {
  newDay: DayOfWeek;
  newWeek: boolean;
  delayedEvent: DelayedEvent | null;
} {
  const previousDay = state.currentDay;
  const newDay = getNextDay(previousDay);
  const newWeek = newDay === 'MONDAY';

  state.currentDay = newDay;

  if (newWeek) {
    state.currentWeek++;

    // Decay heat if no shady actions this week
    if (!state.didShadyActionThisWeek) {
      state.hidden.heat = Math.max(0, state.hidden.heat - 2);
    }

    // Reset weekly trackers
    state.didShadyActionThisWeek = false;
    state.hadScandalThisWeek = false;
    state.mediaAppearancesThisWeek = 0;
  }

  // Check for delayed events
  const delayedEvent = checkDelayedEvents(state);

  // Clamp values
  state.hidden = clampHiddenState(state.hidden);

  return { newDay, newWeek, delayedEvent };
}

// =============================================================================
// OWNER PATIENCE
// =============================================================================

/**
 * Update owner patience after a game
 */
export function updatePatienceForGame(
  state: EventSystemState,
  owner: Owner,
  won: boolean
): void {
  state.lastGameWon = won;

  if (!won) {
    state.hidden.ownerPatience -= owner.recordWeight * 5;
  } else {
    state.hidden.ownerPatience += owner.patienceRecovery.win || 5;
    state.hidden.slushFund += owner.winBonus;
  }

  state.hidden = clampHiddenState(state.hidden);
}

/**
 * Update owner patience weekly based on owner-specific conditions
 */
export function updatePatienceWeekly(
  state: EventSystemState,
  owner: Owner
): number {
  let patienceGain = 0;

  switch (owner.id) {
    case 'tex':
      if (state.mediaAppearancesThisWeek > 0) {
        patienceGain += owner.patienceRecovery.mediaAppearance || 0;
      }
      if (state.hadScandalThisWeek) {
        patienceGain += owner.patienceRecovery.controversy || 0;
      }
      break;

    case 'hale':
      if (!state.hadScandalThisWeek) {
        patienceGain += owner.patienceRecovery.cleanWeek || 0;
      }
      break;

    case 'kessler':
      if (state.hidden.slushFund > owner.annualBudget * 0.5) {
        patienceGain += owner.patienceRecovery.underBudget || 0;
      }
      break;
  }

  state.hidden.ownerPatience += patienceGain;
  state.hidden = clampHiddenState(state.hidden);

  return patienceGain;
}

// =============================================================================
// GAME STATE CHECKS
// =============================================================================

/**
 * Check if player is fired (owner patience at 0)
 */
export function isFired(state: EventSystemState): boolean {
  return state.hidden.ownerPatience <= 0;
}

/**
 * Check if player is indicted (heat at 100)
 */
export function isIndicted(state: EventSystemState): boolean {
  return state.hidden.heat >= HEAT_THRESHOLDS.INDICTED;
}

/**
 * Check if under investigation (limits shady options)
 */
export function isUnderInvestigation(state: EventSystemState): boolean {
  return state.hidden.heat >= HEAT_THRESHOLDS.INVESTIGATION;
}

/**
 * Get current heat warning level
 */
export function getHeatWarning(heat: number): string | null {
  if (heat >= HEAT_THRESHOLDS.INVESTIGATION) {
    return 'Under federal investigation. Shady activities are off the table.';
  }
  if (heat >= HEAT_THRESHOLDS.FBI_TIP) {
    return 'An anonymous tip has been filed with the FBI.';
  }
  if (heat >= HEAT_THRESHOLDS.COMPLIANCE_WARNING) {
    return 'League compliance wants to have a chat.';
  }
  return null;
}

// =============================================================================
// INITIALIZE STATE
// =============================================================================

/**
 * Create initial event system state for a new season
 */
export function createEventSystemState(owner: Owner): EventSystemState {
  return {
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
  };
}
