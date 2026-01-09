/**
 * ILLEGAL MOTION - Event Generator
 *
 * Generates weekly events based on franchise state, roster, and week number.
 * Events are the heart of the management layer - creating drama and forcing choices.
 */

import type { FranchiseState, ReputationMeters } from '../types/franchise.types';
import type {
  GameEvent,
  EventCategory,
  EventChoice,
  EventConsequences,
  EventPrerequisites,
  EventRarity,
  ScheduledDelayedEvent,
  CompletedEvent,
  PlayerEventEffect,
} from '../types/event.types';
import type { Player, TeamRoster } from '../types/Player';
import type { Owner } from '../types/Owner';
import { ALL_EVENT_TEMPLATES, getEventById } from '../data/eventTemplates';
import { canBeInEvent, getAllPlayers } from '../types/Player';

// =============================================================================
// TYPES
// =============================================================================

export interface EventGeneratorConfig {
  minEventsPerWeek: number;
  maxEventsPerWeek: number;
  baseWeights: Record<EventCategory, number>;
  heatCorruptionMultiplier: number;   // High heat = fewer corruption offers
  losingStreakDramaMultiplier: number; // Losing = more drama events
  winningBonusEnabled: boolean;       // Good events when winning
}

export interface GeneratedEvent extends GameEvent {
  // Resolved template variables
  resolvedTitle: string;
  resolvedHeadline: string;
  resolvedDescription: string;
  resolvedPlayerName?: string;
  resolvedPlayerId?: string;
  resolvedPosition?: string;
}

export interface EventResult {
  success: boolean;
  choiceId: string;
  consequencesApplied: EventConsequences;
  meterChanges: Partial<ReputationMeters>;
  heatChange: number;
  patienceChange: number;
  slushFundChange: number;
  playerEffectsApplied: PlayerEventEffect[];
  newsHeadline?: string;
  resultText: string;
  triggeredDelayedEvent?: ScheduledDelayedEvent;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_GENERATOR_CONFIG: EventGeneratorConfig = {
  minEventsPerWeek: 1,
  maxEventsPerWeek: 2,
  baseWeights: {
    SCANDAL: 20,
    CORRUPTION: 15,
    OWNER_DEMAND: 20,
    MEDIA: 25,
    PLAYER_ISSUE: 20,
    LEAGUE_ACTION: 10,
    OPPORTUNITY: 15,
    RANDOM: 10,
  },
  heatCorruptionMultiplier: 0.7,
  losingStreakDramaMultiplier: 1.5,
  winningBonusEnabled: true,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandomSelect<T>(items: T[], weights: number[]): T | null {
  if (items.length === 0) return null;

  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return items[0];

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
// TEMPLATE VARIABLE RESOLUTION
// =============================================================================

/**
 * Select a valid player for an event based on prerequisites
 */
function selectEventPlayer(
  roster: TeamRoster,
  prerequisites?: EventPrerequisites
): Player | null {
  const allPlayers = getAllPlayers(roster);

  // Filter to players that can be in events (excludes emergency backups)
  const eligiblePlayers = allPlayers.filter(p => canBeInEvent(p));

  if (eligiblePlayers.length === 0) return null;

  // Filter by position if required
  let candidates = eligiblePlayers;

  if (prerequisites?.requiresPosition) {
    candidates = candidates.filter(
      p => p.rosterSlot === prerequisites.requiresPosition ||
           p.position === prerequisites.requiresPosition
    );
  }

  // Filter by high ego if required
  if (prerequisites?.requiresHighEgo) {
    candidates = candidates.filter(p => p.stats.ego > 70);
  }

  // Filter by vice if required (using low discipline as proxy)
  if (prerequisites?.requiresVice) {
    candidates = candidates.filter(p => p.stats.discipline < 40);
  }

  // Filter by specific player if required
  if (prerequisites?.requiresSpecificPlayer) {
    candidates = candidates.filter(p => p.id === prerequisites.requiresSpecificPlayer);
  }

  if (candidates.length === 0) return null;

  // Random selection from candidates
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Resolve template variables in a string
 */
function resolveTemplateString(
  template: string,
  player?: Player | null
): string {
  if (!player) return template;

  return template
    .replace(/\{playerName\}/g, `${player.firstName} ${player.lastName}`)
    .replace(/\{playerFirstName\}/g, player.firstName)
    .replace(/\{playerLastName\}/g, player.lastName)
    .replace(/\{position\}/g, player.rosterSlot || player.position);
}

/**
 * Convert a GameEvent template to a GeneratedEvent with resolved variables
 */
function resolveEventTemplate(
  event: GameEvent,
  roster: TeamRoster,
): GeneratedEvent {
  // Select player if needed
  const player = selectEventPlayer(roster, event.prerequisites);

  return {
    ...event,
    resolvedTitle: resolveTemplateString(event.title, player),
    resolvedHeadline: resolveTemplateString(event.headline, player),
    resolvedDescription: resolveTemplateString(event.description, player),
    resolvedPlayerName: player ? `${player.firstName} ${player.lastName}` : undefined,
    resolvedPlayerId: player?.id,
    resolvedPosition: player?.rosterSlot || player?.position,
    involvedPlayerId: player?.id,
  };
}

// =============================================================================
// PREREQUISITE CHECKING
// =============================================================================

/**
 * Check if an event's prerequisites are met
 */
function checkEventPrerequisites(
  event: GameEvent,
  state: FranchiseState,
  weekNumber: number,
  roster: TeamRoster
): boolean {
  const prereqs = event.prerequisites;
  if (!prereqs) return true;

  // Week requirements
  if (prereqs.minWeek !== undefined && weekNumber < prereqs.minWeek) return false;
  if (prereqs.maxWeek !== undefined && weekNumber > prereqs.maxWeek) return false;

  // Meter requirements
  const avgReputation = (
    state.meters.fanApproval +
    state.meters.mediaPerception +
    state.meters.leagueStanding
  ) / 3;

  if (prereqs.minReputation !== undefined && avgReputation < prereqs.minReputation) return false;
  if (prereqs.maxReputation !== undefined && avgReputation > prereqs.maxReputation) return false;

  // Heat requirements
  if (prereqs.minHeat !== undefined && state.hidden.heat < prereqs.minHeat) return false;
  if (prereqs.maxHeat !== undefined && state.hidden.heat > prereqs.maxHeat) return false;

  // Owner patience requirements
  if (prereqs.minOwnerPatience !== undefined && state.owner.patience < prereqs.minOwnerPatience) return false;
  if (prereqs.maxOwnerPatience !== undefined && state.owner.patience > prereqs.maxOwnerPatience) return false;

  // Record requirements - get from standings for user's team
  const userStanding = state.season.standings?.find(s => s.teamId === state.teamId);
  const wins = userStanding?.wins ?? 0;
  const losses = userStanding?.losses ?? 0;

  if (prereqs.minWins !== undefined && wins < prereqs.minWins) return false;
  if (prereqs.maxWins !== undefined && wins > prereqs.maxWins) return false;

  // Win/loss streak - would need to track this in season state
  // For now, approximate with recent record

  // Position requirements - check if a valid player exists
  if (prereqs.requiresPosition) {
    const allPlayers = getAllPlayers(roster);
    const hasPosition = allPlayers.some(
      p => canBeInEvent(p) &&
           (p.rosterSlot === prereqs.requiresPosition || p.position === prereqs.requiresPosition)
    );
    if (!hasPosition) return false;
  }

  // High ego requirement
  if (prereqs.requiresHighEgo) {
    const allPlayers = getAllPlayers(roster);
    const hasHighEgo = allPlayers.some(p => canBeInEvent(p) && p.stats.ego > 70);
    if (!hasHighEgo) return false;
  }

  // Situation requirements
  if (prereqs.afterLoss) {
    // Would need last game result from state
    // For now, check if losses > wins this season as approximation
    if (losses <= wins) return false;
  }

  if (prereqs.afterWin) {
    if (wins <= losses) return false;
  }

  // Previous event requirements
  if (prereqs.requiresPreviousEvent) {
    const hasSeenEvent = state.events.completedEvents.some(
      e => e.eventId === prereqs.requiresPreviousEvent
    );
    if (!hasSeenEvent) return false;
  }

  if (prereqs.excludeIfEventSeen) {
    const hasSeenEvent = state.events.completedEvents.some(
      e => e.eventId === prereqs.excludeIfEventSeen
    );
    if (hasSeenEvent) return false;
  }

  return true;
}

/**
 * Check if an event is on cooldown
 */
function isEventOnCooldown(
  eventId: string,
  cooldowns: Map<string, number> | Record<string, number>,
  currentWeek: number
): boolean {
  // Handle both Map and Record types
  const cooldownUntil = cooldowns instanceof Map
    ? cooldowns.get(eventId)
    : cooldowns[eventId];

  if (!cooldownUntil) return false;
  return currentWeek < cooldownUntil;
}

/**
 * Check if an event was already seen this season (for one-time events)
 */
function wasEventSeenThisSeason(
  eventId: string,
  completedEvents: CompletedEvent[]
): boolean {
  return completedEvents.some(e => e.eventId === eventId);
}

// =============================================================================
// EVENT WEIGHTING
// =============================================================================

/**
 * Calculate category weights based on current state
 */
function calculateCategoryWeights(
  state: FranchiseState,
  config: EventGeneratorConfig
): Record<EventCategory, number> {
  const weights = { ...config.baseWeights };

  // High heat reduces corruption opportunities
  if (state.hidden.heat > 40) {
    weights.CORRUPTION *= Math.pow(config.heatCorruptionMultiplier, state.hidden.heat / 40);
  }

  // Under investigation? No corruption events
  if (state.hidden.investigationStage !== 'NONE' &&
      state.hidden.investigationStage !== 'RUMORS') {
    weights.CORRUPTION = 0;
  }

  // Losing increases drama - get from standings for user's team
  const userStanding = state.season.standings?.find(s => s.teamId === state.teamId);
  const losses = userStanding?.losses ?? 0;
  const wins = userStanding?.wins ?? 0;
  if (losses > wins + 2) {
    weights.SCANDAL *= config.losingStreakDramaMultiplier;
    weights.PLAYER_ISSUE *= config.losingStreakDramaMultiplier;
    weights.OWNER_DEMAND *= config.losingStreakDramaMultiplier;
  }

  // Winning increases opportunities
  if (config.winningBonusEnabled && wins > losses + 2) {
    weights.OPPORTUNITY *= 1.5;
    weights.MEDIA *= 1.3;
  }

  // Low owner patience increases owner demands
  if (state.owner.patience < 40) {
    weights.OWNER_DEMAND *= 1.5;
  }

  return weights;
}

/**
 * Get weight for an event based on rarity
 */
function getRarityWeight(rarity: EventRarity): number {
  switch (rarity) {
    case 'COMMON': return 10;
    case 'UNCOMMON': return 5;
    case 'RARE': return 2;
    case 'UNIQUE': return 1;
    default: return 5;
  }
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate weekly events based on franchise state
 */
export function generateWeeklyEvents(
  state: FranchiseState,
  roster: TeamRoster,
  weekNumber: number,
  config: EventGeneratorConfig = DEFAULT_GENERATOR_CONFIG
): GeneratedEvent[] {
  // Determine number of events this week
  const numEvents = randomBetween(config.minEventsPerWeek, config.maxEventsPerWeek);

  // Get cooldowns - handle both Map and object
  const cooldowns = state.events.eventCooldowns;

  // Calculate category weights
  const categoryWeights = calculateCategoryWeights(state, config);

  // Filter eligible events
  const eligibleEvents = ALL_EVENT_TEMPLATES.filter(event => {
    // Check cooldown
    if (isEventOnCooldown(event.id, cooldowns, weekNumber)) return false;

    // Check if one-time event already seen
    if (event.rarity === 'UNIQUE' && wasEventSeenThisSeason(event.id, state.events.completedEvents)) {
      return false;
    }

    // Check prerequisites
    if (!checkEventPrerequisites(event, state, weekNumber, roster)) return false;

    // Check category weight (skip if 0)
    if (categoryWeights[event.category] <= 0) return false;

    return true;
  });

  if (eligibleEvents.length === 0) {
    return [];
  }

  // Calculate weights for each eligible event
  const eventWeights = eligibleEvents.map(event => {
    const categoryWeight = categoryWeights[event.category];
    const rarityWeight = getRarityWeight(event.rarity);
    return categoryWeight * rarityWeight;
  });

  // Select events (avoid duplicates)
  const selectedEvents: GeneratedEvent[] = [];
  const selectedIds = new Set<string>();

  // Create mutable copies for selection
  let remainingEvents = [...eligibleEvents];
  let remainingWeights = [...eventWeights];

  for (let i = 0; i < numEvents && remainingEvents.length > 0; i++) {
    const selected = weightedRandomSelect(remainingEvents, remainingWeights);

    if (selected && !selectedIds.has(selected.id)) {
      selectedIds.add(selected.id);

      // Resolve template and add to selected
      const resolved = resolveEventTemplate(selected, roster);
      selectedEvents.push(resolved);

      // Remove from remaining pool
      const index = remainingEvents.indexOf(selected);
      if (index > -1) {
        remainingEvents.splice(index, 1);
        remainingWeights.splice(index, 1);
      }
    }
  }

  return selectedEvents;
}

// =============================================================================
// EVENT RESOLUTION
// =============================================================================

/**
 * Check if a choice's requirements are met
 */
export function canSelectChoice(
  choice: EventChoice,
  state: FranchiseState
): { canSelect: boolean; reason?: string } {
  // Check slush fund requirement
  if (choice.requiresSlushFund !== undefined) {
    if (state.finances.slushFund < choice.requiresSlushFund) {
      return {
        canSelect: false,
        reason: `Need $${choice.requiresSlushFund.toLocaleString()} in slush fund`
      };
    }
  }

  // Check slush fund cost
  if (choice.slushFundCost !== undefined) {
    if (state.finances.slushFund < choice.slushFundCost) {
      return {
        canSelect: false,
        reason: `Can't afford $${choice.slushFundCost.toLocaleString()}`
      };
    }
  }

  // Check reputation requirement
  if (choice.requiresReputation !== undefined) {
    const avgRep = (
      state.meters.fanApproval +
      state.meters.mediaPerception +
      state.meters.leagueStanding
    ) / 3;
    if (avgRep < choice.requiresReputation) {
      return {
        canSelect: false,
        reason: `Reputation too low (need ${choice.requiresReputation})`
      };
    }
  }

  // Check heat requirement (max heat to attempt)
  if (choice.requiresHeat !== undefined) {
    if (state.hidden.heat > choice.requiresHeat) {
      return {
        canSelect: false,
        reason: 'Too much heat - too risky'
      };
    }
  }

  return { canSelect: true };
}

/**
 * Resolve an event with a chosen option
 */
export function resolveEvent(
  event: GameEvent,
  choiceId: string,
  state: FranchiseState,
  owner: Owner,
  weekNumber: number
): EventResult {
  // Find the choice
  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) {
    throw new Error(`Choice ${choiceId} not found in event ${event.id}`);
  }

  // Check if choice can be made
  const canSelect = canSelectChoice(choice, state);
  if (!canSelect.canSelect) {
    return {
      success: false,
      choiceId,
      consequencesApplied: { resultText: canSelect.reason || 'Cannot make this choice' },
      meterChanges: {},
      heatChange: 0,
      patienceChange: 0,
      slushFundChange: 0,
      playerEffectsApplied: [],
      resultText: canSelect.reason || 'Cannot make this choice',
    };
  }

  // Deduct costs
  let slushFundChange = 0;

  if (choice.slushFundCost) {
    slushFundChange -= choice.slushFundCost;
  }

  if (choice.moneyCost) {
    slushFundChange -= choice.moneyCost;
  }

  // Roll for success if applicable
  let success = true;
  if (choice.successRate !== undefined && choice.successRate < 100) {
    success = Math.random() * 100 < choice.successRate;
  }

  // Get consequences based on success/failure
  const consequences = success ? choice.consequences : (choice.failureConsequences || choice.consequences);

  // Apply consequences to meters
  const meterChanges: Partial<ReputationMeters> = {};

  if (consequences.reputation) {
    const change = consequences.reputation * (owner.reputationMod || 1);
    meterChanges.leagueStanding = change;
  }

  if (consequences.fanApproval) {
    meterChanges.fanApproval = consequences.fanApproval;
  }

  if (consequences.mediaPerception) {
    const change = consequences.mediaPerception * (owner.imageMod || 1);
    meterChanges.mediaPerception = change;
  }

  if (consequences.playerMorale) {
    const change = consequences.playerMorale * (owner.cultureMod || 1);
    meterChanges.playerMorale = change;
  }

  // Calculate heat change
  let heatChange = consequences.heat || 0;
  heatChange = Math.round(heatChange * (owner.riskMod || 1));

  // Owner patience change
  const patienceChange = consequences.ownerPatience || 0;

  // Slush fund from consequences
  if (consequences.slushFund) {
    slushFundChange += consequences.slushFund;
  }

  // Handle player effects
  const playerEffectsApplied: PlayerEventEffect[] = consequences.playerEffects || [];

  // Handle delayed consequences
  let triggeredDelayedEvent: ScheduledDelayedEvent | undefined;

  if (success && choice.delayedConsequences) {
    const delayed = choice.delayedConsequences;
    if (Math.random() * 100 < delayed.chance) {
      triggeredDelayedEvent = {
        id: `delayed_${event.id}_${choiceId}_${Date.now()}`,
        sourceEventId: event.id,
        sourceChoiceId: choiceId,
        triggerWeek: weekNumber + delayed.triggerWeek,
        type: delayed.type,
        chance: 100, // Already rolled
        consequences: delayed.consequences,
      };
    }
  }

  return {
    success,
    choiceId,
    consequencesApplied: consequences,
    meterChanges,
    heatChange,
    patienceChange,
    slushFundChange,
    playerEffectsApplied,
    newsHeadline: consequences.newsHeadline,
    resultText: consequences.resultText,
    triggeredDelayedEvent,
  };
}

/**
 * Apply event result to franchise state
 * Returns the modified state (mutates in place for simplicity)
 */
export function applyEventResult(
  state: FranchiseState,
  result: EventResult,
  eventId: string,
  weekNumber: number
): FranchiseState {
  // Apply meter changes
  if (result.meterChanges.fanApproval) {
    state.meters.fanApproval = clamp(
      state.meters.fanApproval + result.meterChanges.fanApproval, 0, 100
    );
  }
  if (result.meterChanges.mediaPerception) {
    state.meters.mediaPerception = clamp(
      state.meters.mediaPerception + result.meterChanges.mediaPerception, 0, 100
    );
  }
  if (result.meterChanges.leagueStanding) {
    state.meters.leagueStanding = clamp(
      state.meters.leagueStanding + result.meterChanges.leagueStanding, 0, 100
    );
  }
  if (result.meterChanges.playerMorale) {
    state.meters.playerMorale = clamp(
      state.meters.playerMorale + result.meterChanges.playerMorale, 0, 100
    );
  }

  // Apply heat change
  state.hidden.heat = clamp(state.hidden.heat + result.heatChange, 0, 100);

  // Apply owner patience change
  state.owner.patience = clamp(state.owner.patience + result.patienceChange, 0, 100);

  // Apply slush fund change
  state.finances.slushFund = Math.max(0, state.finances.slushFund + result.slushFundChange);

  // Track completed event
  const completedEvent: CompletedEvent = {
    eventId,
    choiceId: result.choiceId,
    week: weekNumber,
    success: result.success,
    consequencesApplied: result.consequencesApplied,
    newsGenerated: result.newsHeadline,
  };

  state.events.completedEvents.push(completedEvent);

  // Add delayed event if triggered
  if (result.triggeredDelayedEvent) {
    state.events.pendingDelayedEvents.push(result.triggeredDelayedEvent);
  }

  // Update event cooldown
  const event = getEventById(eventId);
  if (event && event.cooldownWeeks > 0) {
    if (state.events.eventCooldowns instanceof Map) {
      state.events.eventCooldowns.set(eventId, weekNumber + event.cooldownWeeks);
    } else {
      (state.events.eventCooldowns as Record<string, number>)[eventId] = weekNumber + event.cooldownWeeks;
    }
  }

  // Track shady choices
  const choice = event?.choices.find(c => c.id === result.choiceId);
  if (choice?.tags?.includes('SHADY')) {
    state.events.shadyChoicesMade++;
  }

  return state;
}

// =============================================================================
// DELAYED EVENT PROCESSING
// =============================================================================

/**
 * Check for and trigger delayed events
 */
export function checkDelayedEvents(
  state: FranchiseState,
  weekNumber: number
): ScheduledDelayedEvent[] {
  const triggered: ScheduledDelayedEvent[] = [];

  state.events.pendingDelayedEvents = state.events.pendingDelayedEvents.filter(delayed => {
    if (delayed.triggerWeek <= weekNumber) {
      // Check if it fires (already rolled when queued, but double check)
      if (Math.random() * 100 < delayed.chance) {
        triggered.push(delayed);
      }
      return false; // Remove from pending
    }
    return true; // Keep in pending
  });

  return triggered;
}

/**
 * Apply a delayed event's consequences
 */
export function applyDelayedEvent(
  state: FranchiseState,
  delayed: ScheduledDelayedEvent
): FranchiseState {
  const consequences = delayed.consequences;

  // Apply meter changes
  if (consequences.reputation) {
    state.meters.leagueStanding = clamp(
      state.meters.leagueStanding + consequences.reputation, 0, 100
    );
  }
  if (consequences.mediaPerception) {
    state.meters.mediaPerception = clamp(
      state.meters.mediaPerception + consequences.mediaPerception, 0, 100
    );
  }
  if (consequences.playerMorale) {
    state.meters.playerMorale = clamp(
      state.meters.playerMorale + consequences.playerMorale, 0, 100
    );
  }

  // Apply heat
  if (consequences.heat) {
    state.hidden.heat = clamp(state.hidden.heat + consequences.heat, 0, 100);
  }

  // Apply owner patience
  if (consequences.ownerPatience) {
    state.owner.patience = clamp(state.owner.patience + consequences.ownerPatience, 0, 100);
  }

  // Apply slush fund
  if (consequences.slushFund) {
    state.finances.slushFund = Math.max(0, state.finances.slushFund + consequences.slushFund);
  }

  return state;
}

// =============================================================================
// HEAT & INVESTIGATION MANAGEMENT
// =============================================================================

/**
 * Update investigation stage based on heat level
 */
export function updateInvestigationStage(state: FranchiseState): FranchiseState {
  const heat = state.hidden.heat;

  if (heat >= 100) {
    state.hidden.investigationStage = 'ARRESTED';
  } else if (heat >= 90) {
    state.hidden.investigationStage = 'INDICTMENT';
  } else if (heat >= 80) {
    state.hidden.investigationStage = 'GRAND_JURY';
  } else if (heat >= 60) {
    state.hidden.investigationStage = 'INVESTIGATION';
  } else if (heat >= 40) {
    state.hidden.investigationStage = 'INQUIRY';
  } else if (heat >= 20) {
    state.hidden.investigationStage = 'RUMORS';
  } else {
    state.hidden.investigationStage = 'NONE';
  }

  return state;
}

/**
 * Apply weekly heat decay if no shady actions taken
 */
export function applyWeeklyHeatDecay(
  state: FranchiseState,
  didShadyAction: boolean
): FranchiseState {
  if (!didShadyAction) {
    state.hidden.consecutiveCleanWeeks++;

    // Heat decays after 2+ clean weeks
    if (state.hidden.consecutiveCleanWeeks >= 2) {
      const decay = Math.min(3, Math.floor(state.hidden.heat * 0.05));
      state.hidden.heat = Math.max(0, state.hidden.heat - decay);
    }
  } else {
    state.hidden.consecutiveCleanWeeks = 0;
  }

  return state;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  resolveTemplateString,
  selectEventPlayer,
  checkEventPrerequisites,
  isEventOnCooldown,
  calculateCategoryWeights,
  getRarityWeight,
};
