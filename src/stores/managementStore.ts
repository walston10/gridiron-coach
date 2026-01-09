/**
 * ILLEGAL MOTION - Management Store
 *
 * State management for weekly team management between games.
 * Tracks events, prep choices, investigations, and corruption.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export type EventType =
  | 'PLAYER_INCIDENT'      // Player got in trouble
  | 'CORRUPTION_OFFER'     // Someone offering dirty deal
  | 'OWNER_DEMAND'         // Owner wants something
  | 'MEDIA_ATTENTION'      // Press asking questions
  | 'TRADE_OPPORTUNITY'    // Trade proposal
  | 'INJURY_SITUATION'     // Player injury decision
  | 'MORALE_CRISIS'        // Team chemistry issue
  | 'CONTRACT_DISPUTE'     // Player wants more money
  | 'INVESTIGATION_HEAT'   // Feds sniffing around
  | 'OPPORTUNITY';         // Random good opportunity

export type EventPriority = 'CRITICAL' | 'URGENT' | 'NORMAL' | 'OPPORTUNITY';

export type EventCategory = 'MANDATORY' | 'OPTIONAL';

export interface EventChoice {
  id: string;
  text: string;
  consequences: EventConsequence[];
  hiddenConsequences: boolean;  // Some consequences are "???"
  requiresCorruption?: number;  // Min corruption level to see this option
  lockedReason?: string;        // Why it's locked
}

export interface EventConsequence {
  type: 'REPUTATION' | 'TRUST' | 'MONEY' | 'HEAT' | 'MORALE' | 'PLAYER_STAT' | 'CARD_BONUS' | 'DELAYED';
  value: number;
  description: string;
  hidden?: boolean;
  delayedWeeks?: number;  // When delayed consequence triggers
  playerId?: string;      // For player-specific effects
}

export interface ManagementEvent {
  id: string;
  type: EventType;
  priority: EventPriority;
  category: EventCategory;
  title: string;
  description: string;
  detailedDescription: string;
  icon: string;
  imageUrl?: string;     // Optional event image (place in /public/images/events/)
  choices: EventChoice[];
  resolved: boolean;
  chosenOption?: string;
  week: number;
  expiresWeek?: number;  // Some events expire
  playerId?: string;     // Associated player
  sourceId?: string;     // Who/what triggered this
}

export interface EventResult {
  eventId: string;
  choiceId: string;
  immediateEffects: string[];
  delayedEffects: DelayedEffect[];
  timestamp: number;
}

export interface DelayedEffect {
  triggersWeek: number;
  type: string;
  description: string;
  value: number;
  resolved: boolean;
}

export interface PrepChoice {
  type: 'SCOUT' | 'FILM_REVIEW' | 'PRACTICE_FOCUS';
  selected: boolean;
  target?: string;  // Position group for practice, opponent for scout
  completed: boolean;
  bonus?: string;
}

export interface PassiveAlert {
  id: string;
  type: 'INJURY' | 'TRADE' | 'CONTRACT' | 'INVESTIGATION' | 'NEWS';
  title: string;
  description: string;
  urgent: boolean;
  actionable: boolean;
  week: number;
  dismissed: boolean;
}

export interface Investigation {
  heat: number;           // 0-100, 100 = busted
  activeInvestigators: number;
  recentActions: string[];
  warningLevel: 'NONE' | 'RUMOR' | 'INQUIRY' | 'INVESTIGATION' | 'IMMINENT';
}

// =============================================================================
// STATE INTERFACE
// =============================================================================

interface ManagementState {
  // Current week
  currentWeek: number;
  gameResolved: boolean;

  // Events
  events: ManagementEvent[];
  eventHistory: EventResult[];
  delayedEffects: DelayedEffect[];

  // Prep
  prepChoices: PrepChoice[];
  maxPrepPerWeek: number;

  // Alerts
  alerts: PassiveAlert[];

  // Team State
  teamMorale: number;      // 0-100
  reputation: number;      // 0-100 (public standing)
  ownerTrust: number;      // 0-100
  corruptionLevel: number; // 0-100 (how dirty you are)

  // Investigation
  investigation: Investigation;

  // Resources
  availableFunds: number;  // Extra funds for bribes, bonuses, etc.
}

interface ManagementActions {
  // Week Management
  advanceWeek: () => void;
  setWeek: (week: number) => void;

  // Events
  generateWeeklyEvents: (seasonState: { week: number; record: string; corruptionLevel: number }) => void;
  resolveEvent: (eventId: string, choiceId: string) => EventResult;
  dismissEvent: (eventId: string) => void;
  getMandatoryEvents: () => ManagementEvent[];
  getOptionalEvents: () => ManagementEvent[];

  // Prep
  togglePrepChoice: (type: PrepChoice['type'], target?: string) => void;
  canSelectMorePrep: () => boolean;
  getSelectedPrep: () => PrepChoice[];
  completePrepForWeek: () => void;

  // Alerts
  addAlert: (alert: Omit<PassiveAlert, 'id' | 'dismissed'>) => void;
  dismissAlert: (alertId: string) => void;
  getActiveAlerts: () => PassiveAlert[];

  // Team State
  adjustMorale: (amount: number) => void;
  adjustReputation: (amount: number) => void;
  adjustOwnerTrust: (amount: number) => void;
  adjustCorruption: (amount: number) => void;
  addHeat: (amount: number) => void;

  // Investigation
  updateInvestigation: () => void;
  getInvestigationWarning: () => string | null;

  // Delayed Effects
  processDelayedEffects: () => void;

  // Game Ready
  canPlayGame: () => boolean;
  markGameResolved: () => void;

  // Reset
  resetWeek: () => void;
  resetSeason: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialInvestigation: Investigation = {
  heat: 0,
  activeInvestigators: 0,
  recentActions: [],
  warningLevel: 'NONE',
};

const initialPrepChoices: PrepChoice[] = [
  { type: 'SCOUT', selected: false, completed: false },
  { type: 'FILM_REVIEW', selected: false, completed: false },
  { type: 'PRACTICE_FOCUS', selected: false, completed: false },
];

const initialState: ManagementState = {
  currentWeek: 1,
  gameResolved: false,
  events: [],
  eventHistory: [],
  delayedEffects: [],
  prepChoices: [...initialPrepChoices],
  maxPrepPerWeek: 2,
  alerts: [],
  teamMorale: 70,
  reputation: 50,
  ownerTrust: 50,
  corruptionLevel: 0,
  investigation: initialInvestigation,
  availableFunds: 100000,
};

// =============================================================================
// EVENT TEMPLATES
// =============================================================================

const EVENT_TEMPLATES: Partial<ManagementEvent>[] = [
  // Player Incidents
  {
    type: 'PLAYER_INCIDENT',
    priority: 'URGENT',
    category: 'MANDATORY',
    title: 'Star Player Caught at Club',
    description: 'Your starting QB was photographed at a nightclub past curfew.',
    detailedDescription: 'Local media has photos of your starting quarterback at Club Velvet at 2 AM on a Tuesday. They\'re asking for comment. How do you handle this?',
    icon: '🌙',
    choices: [
      {
        id: 'fine',
        text: 'Fine him and issue public apology',
        consequences: [
          { type: 'REPUTATION', value: 5, description: 'Media appreciates accountability' },
          { type: 'MORALE', value: -5, description: 'Player is upset' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'ignore',
        text: 'Ignore it - boys will be boys',
        consequences: [
          { type: 'REPUTATION', value: -10, description: 'Public sees lack of discipline' },
          { type: 'TRUST', value: 5, description: 'Players appreciate loyalty' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'coverup',
        text: 'Pay off the photographer',
        consequences: [
          { type: 'MONEY', value: -25000, description: 'Bribe cost' },
          { type: 'HEAT', value: 15, description: 'Suspicious activity' },
        ],
        hiddenConsequences: true,
        requiresCorruption: 20,
      },
    ],
  },

  // Corruption Offers
  {
    type: 'CORRUPTION_OFFER',
    priority: 'URGENT',
    category: 'MANDATORY',
    title: 'A Friendly Offer',
    description: 'A "business associate" wants to discuss an opportunity.',
    detailedDescription: 'A man in an expensive suit approaches you after practice. "Mr. Kessler sends his regards. We could help each other out. There\'s a game next week that certain... parties... have an interest in the point spread."',
    icon: '💼',
    choices: [
      {
        id: 'refuse',
        text: 'Refuse firmly',
        consequences: [
          { type: 'REPUTATION', value: 5, description: 'Maintaining integrity' },
          { type: 'TRUST', value: -5, description: 'Owner disappointed', hidden: true },
        ],
        hiddenConsequences: true,
      },
      {
        id: 'listen',
        text: 'Hear him out...',
        consequences: [
          { type: 'HEAT', value: 10, description: 'You\'re on their radar now' },
          { type: 'DELAYED', value: 0, description: 'More offers will come', delayedWeeks: 2 },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'accept',
        text: 'How much are we talking?',
        consequences: [
          { type: 'MONEY', value: 50000, description: 'Cash payment' },
          { type: 'HEAT', value: 25, description: 'Deep involvement' },
        ],
        hiddenConsequences: true,
        requiresCorruption: 0,
      },
    ],
  },

  // Owner Demands
  {
    type: 'OWNER_DEMAND',
    priority: 'CRITICAL',
    category: 'MANDATORY',
    title: 'Owner Wants a Meeting',
    description: 'The boss is not happy with recent performance.',
    detailedDescription: '"I didn\'t buy this team to lose," the owner growls. "I need results. I don\'t care how you get them. Find a way to win, or I\'ll find someone who can."',
    icon: '👔',
    choices: [
      {
        id: 'promise',
        text: 'Promise to turn things around (clean)',
        consequences: [
          { type: 'TRUST', value: -5, description: 'He\'s heard this before' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'excuse',
        text: 'Blame injuries and schedule',
        consequences: [
          { type: 'TRUST', value: -15, description: 'Excuses won\'t cut it' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'dirty',
        text: '"I know some people who can... help"',
        consequences: [
          { type: 'TRUST', value: 10, description: 'Owner approves' },
          { type: 'HEAT', value: 20, description: 'Deeper corruption' },
        ],
        hiddenConsequences: true,
        requiresCorruption: 30,
      },
    ],
  },

  // Media Attention
  {
    type: 'MEDIA_ATTENTION',
    priority: 'NORMAL',
    category: 'MANDATORY',
    title: 'Press Conference Questions',
    description: 'Reporters are asking about team chemistry.',
    detailedDescription: 'At your weekly press conference, a reporter asks: "There are rumors of discord in the locker room. Some players reportedly aren\'t happy. Care to comment?"',
    icon: '📺',
    choices: [
      {
        id: 'deny',
        text: '"We\'re a united team"',
        consequences: [
          { type: 'REPUTATION', value: 3, description: 'Standard PR response' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'deflect',
        text: '"Let\'s talk about the game"',
        consequences: [
          { type: 'REPUTATION', value: 0, description: 'Neutral response' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'call_out',
        text: 'Call out the complainers publicly',
        consequences: [
          { type: 'MORALE', value: -20, description: 'Players feel betrayed' },
          { type: 'REPUTATION', value: -5, description: 'Seen as poor leadership' },
        ],
        hiddenConsequences: false,
      },
    ],
  },

  // Opportunity
  {
    type: 'OPPORTUNITY',
    priority: 'OPPORTUNITY',
    category: 'OPTIONAL',
    title: 'Local Charity Event',
    description: 'A children\'s hospital wants you to visit.',
    detailedDescription: 'The local children\'s hospital has invited the team for a meet-and-greet. It would take most of the day but could be great PR.',
    icon: '❤️',
    choices: [
      {
        id: 'go',
        text: 'Send key players',
        consequences: [
          { type: 'REPUTATION', value: 15, description: 'Great community impact' },
          { type: 'MORALE', value: 10, description: 'Players feel good' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'skip',
        text: 'Politely decline - too busy',
        consequences: [
          { type: 'REPUTATION', value: -3, description: 'Missed opportunity' },
        ],
        hiddenConsequences: false,
      },
    ],
  },

  // Investigation Heat
  {
    type: 'INVESTIGATION_HEAT',
    priority: 'CRITICAL',
    category: 'MANDATORY',
    title: 'Investigators Asking Questions',
    description: 'Someone from the league office wants to talk.',
    detailedDescription: 'A league investigator has requested a "voluntary" meeting. They\'re asking about some unusual betting patterns on recent games.',
    icon: '🔍',
    choices: [
      {
        id: 'cooperate',
        text: 'Cooperate fully',
        consequences: [
          { type: 'HEAT', value: -10, description: 'Appear transparent' },
          { type: 'REPUTATION', value: 5, description: 'Nothing to hide' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'lawyer',
        text: 'Bring your lawyer, say nothing',
        consequences: [
          { type: 'HEAT', value: 5, description: 'Looks suspicious' },
        ],
        hiddenConsequences: false,
      },
      {
        id: 'destroy',
        text: 'Time to destroy some evidence',
        consequences: [
          { type: 'HEAT', value: -30, description: 'Evidence gone... for now' },
          { type: 'DELAYED', value: 50, description: 'If discovered, it\'s over', delayedWeeks: 4 },
        ],
        hiddenConsequences: true,
        requiresCorruption: 50,
      },
    ],
  },
];

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useManagementStore = create<ManagementState & ManagementActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // WEEK MANAGEMENT
      // =========================================================================

      advanceWeek: () => {
        const state = get();
        get().processDelayedEffects();
        get().updateInvestigation();

        set({
          currentWeek: state.currentWeek + 1,
          gameResolved: false,
          prepChoices: initialPrepChoices.map(p => ({ ...p, selected: false, completed: false })),
        });

        // Generate new events for the week
        get().generateWeeklyEvents({
          week: state.currentWeek + 1,
          record: '0-0', // Would come from game store
          corruptionLevel: state.corruptionLevel,
        });
      },

      setWeek: (week) => set({ currentWeek: week }),

      // =========================================================================
      // EVENTS
      // =========================================================================

      generateWeeklyEvents: (seasonState) => {
        const state = get();
        const newEvents: ManagementEvent[] = [];

        // Always generate 1-2 mandatory events
        const mandatoryCount = Math.random() > 0.4 ? 2 : 1;

        // Filter available templates based on corruption level
        const availableTemplates = EVENT_TEMPLATES.filter(t => {
          // High corruption = more corruption events
          if (state.corruptionLevel > 30 && t.type === 'INVESTIGATION_HEAT') {
            return Math.random() > 0.5;
          }
          return true;
        });

        for (let i = 0; i < mandatoryCount; i++) {
          const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
          if (template) {
            newEvents.push({
              ...template,
              id: `event_${seasonState.week}_${i}_${Date.now()}`,
              week: seasonState.week,
              resolved: false,
            } as ManagementEvent);
          }
        }

        // Maybe add an optional opportunity
        if (Math.random() > 0.6) {
          const opportunity = EVENT_TEMPLATES.find(t => t.category === 'OPTIONAL');
          if (opportunity) {
            newEvents.push({
              ...opportunity,
              id: `event_${seasonState.week}_opt_${Date.now()}`,
              week: seasonState.week,
              resolved: false,
            } as ManagementEvent);
          }
        }

        set({ events: [...state.events.filter(e => !e.resolved || e.week === seasonState.week), ...newEvents] });
      },

      resolveEvent: (eventId, choiceId) => {
        const state = get();
        const event = state.events.find(e => e.id === eventId);
        if (!event) throw new Error('Event not found');

        const choice = event.choices.find(c => c.id === choiceId);
        if (!choice) throw new Error('Choice not found');

        const immediateEffects: string[] = [];
        const delayedEffects: DelayedEffect[] = [];

        // Apply consequences
        choice.consequences.forEach(consequence => {
          switch (consequence.type) {
            case 'REPUTATION':
              get().adjustReputation(consequence.value);
              immediateEffects.push(consequence.description);
              break;
            case 'TRUST':
              get().adjustOwnerTrust(consequence.value);
              immediateEffects.push(consequence.description);
              break;
            case 'MORALE':
              get().adjustMorale(consequence.value);
              immediateEffects.push(consequence.description);
              break;
            case 'MONEY':
              set(s => ({ availableFunds: s.availableFunds + consequence.value }));
              immediateEffects.push(consequence.description);
              break;
            case 'HEAT':
              get().addHeat(consequence.value);
              immediateEffects.push(consequence.description);
              break;
            case 'DELAYED':
              delayedEffects.push({
                triggersWeek: state.currentWeek + (consequence.delayedWeeks || 2),
                type: consequence.type,
                description: consequence.description,
                value: consequence.value,
                resolved: false,
              });
              break;
          }
        });

        // Check if this was a corrupt choice
        if (choice.requiresCorruption !== undefined) {
          get().adjustCorruption(10);
        }

        const result: EventResult = {
          eventId,
          choiceId,
          immediateEffects,
          delayedEffects,
          timestamp: Date.now(),
        };

        set(s => ({
          events: s.events.map(e =>
            e.id === eventId ? { ...e, resolved: true, chosenOption: choiceId } : e
          ),
          eventHistory: [...s.eventHistory, result],
          delayedEffects: [...s.delayedEffects, ...delayedEffects],
        }));

        return result;
      },

      dismissEvent: (eventId) => {
        set(s => ({
          events: s.events.filter(e => e.id !== eventId),
        }));
      },

      getMandatoryEvents: () => {
        const state = get();
        return state.events.filter(
          e => e.category === 'MANDATORY' && !e.resolved && e.week === state.currentWeek
        );
      },

      getOptionalEvents: () => {
        const state = get();
        return state.events.filter(
          e => e.category === 'OPTIONAL' && !e.resolved && e.week === state.currentWeek
        );
      },

      // =========================================================================
      // PREP
      // =========================================================================

      togglePrepChoice: (type, target) => {
        const state = get();
        const currentSelected = state.prepChoices.filter(p => p.selected).length;
        const prep = state.prepChoices.find(p => p.type === type);

        if (!prep) return;

        if (prep.selected) {
          // Deselect
          set(s => ({
            prepChoices: s.prepChoices.map(p =>
              p.type === type ? { ...p, selected: false, target: undefined } : p
            ),
          }));
        } else if (currentSelected < state.maxPrepPerWeek) {
          // Select
          set(s => ({
            prepChoices: s.prepChoices.map(p =>
              p.type === type ? { ...p, selected: true, target } : p
            ),
          }));
        }
      },

      canSelectMorePrep: () => {
        const state = get();
        return state.prepChoices.filter(p => p.selected).length < state.maxPrepPerWeek;
      },

      getSelectedPrep: () => {
        return get().prepChoices.filter(p => p.selected);
      },

      completePrepForWeek: () => {
        set(s => ({
          prepChoices: s.prepChoices.map(p =>
            p.selected ? { ...p, completed: true } : p
          ),
        }));
      },

      // =========================================================================
      // ALERTS
      // =========================================================================

      addAlert: (alert) => {
        set(s => ({
          alerts: [
            ...s.alerts,
            {
              ...alert,
              id: `alert_${Date.now()}`,
              dismissed: false,
            },
          ],
        }));
      },

      dismissAlert: (alertId) => {
        set(s => ({
          alerts: s.alerts.map(a =>
            a.id === alertId ? { ...a, dismissed: true } : a
          ),
        }));
      },

      getActiveAlerts: () => {
        const state = get();
        return state.alerts.filter(a => !a.dismissed && a.week === state.currentWeek);
      },

      // =========================================================================
      // TEAM STATE
      // =========================================================================

      adjustMorale: (amount) => {
        set(s => ({
          teamMorale: Math.max(0, Math.min(100, s.teamMorale + amount)),
        }));
      },

      adjustReputation: (amount) => {
        set(s => ({
          reputation: Math.max(0, Math.min(100, s.reputation + amount)),
        }));
      },

      adjustOwnerTrust: (amount) => {
        set(s => ({
          ownerTrust: Math.max(0, Math.min(100, s.ownerTrust + amount)),
        }));
      },

      adjustCorruption: (amount) => {
        set(s => ({
          corruptionLevel: Math.max(0, Math.min(100, s.corruptionLevel + amount)),
        }));
      },

      addHeat: (amount) => {
        set(s => ({
          investigation: {
            ...s.investigation,
            heat: Math.max(0, Math.min(100, s.investigation.heat + amount)),
          },
        }));
        get().updateInvestigation();
      },

      // =========================================================================
      // INVESTIGATION
      // =========================================================================

      updateInvestigation: () => {
        const state = get();
        const { heat } = state.investigation;

        let warningLevel: Investigation['warningLevel'] = 'NONE';
        let investigators = 0;

        if (heat >= 80) {
          warningLevel = 'IMMINENT';
          investigators = 3;
        } else if (heat >= 60) {
          warningLevel = 'INVESTIGATION';
          investigators = 2;
        } else if (heat >= 40) {
          warningLevel = 'INQUIRY';
          investigators = 1;
        } else if (heat >= 20) {
          warningLevel = 'RUMOR';
          investigators = 0;
        }

        set(s => ({
          investigation: {
            ...s.investigation,
            warningLevel,
            activeInvestigators: investigators,
          },
        }));
      },

      getInvestigationWarning: () => {
        const { warningLevel, heat } = get().investigation;

        switch (warningLevel) {
          case 'IMMINENT':
            return `DANGER: Investigation imminent! (${heat}% heat)`;
          case 'INVESTIGATION':
            return `WARNING: Active investigation (${heat}% heat)`;
          case 'INQUIRY':
            return `CAUTION: League inquiry active (${heat}% heat)`;
          case 'RUMOR':
            return `NOTICE: Rumors circulating (${heat}% heat)`;
          default:
            return null;
        }
      },

      // =========================================================================
      // DELAYED EFFECTS
      // =========================================================================

      processDelayedEffects: () => {
        const state = get();
        const triggeredEffects = state.delayedEffects.filter(
          e => e.triggersWeek === state.currentWeek && !e.resolved
        );

        triggeredEffects.forEach(effect => {
          // Process the effect
          if (effect.type === 'HEAT' || effect.value > 0) {
            get().addHeat(effect.value);
          }

          // Generate an event about it
          get().addAlert({
            type: 'NEWS',
            title: 'Past Actions Catching Up',
            description: effect.description,
            urgent: effect.value > 30,
            actionable: false,
            week: state.currentWeek,
          });
        });

        set(s => ({
          delayedEffects: s.delayedEffects.map(e =>
            e.triggersWeek === state.currentWeek ? { ...e, resolved: true } : e
          ),
        }));
      },

      // =========================================================================
      // GAME READY
      // =========================================================================

      canPlayGame: () => {
        const mandatoryEvents = get().getMandatoryEvents();
        return mandatoryEvents.length === 0;
      },

      markGameResolved: () => {
        set({ gameResolved: true });
      },

      // =========================================================================
      // RESET
      // =========================================================================

      resetWeek: () => {
        set(s => ({
          events: s.events.filter(e => e.week !== s.currentWeek),
          prepChoices: initialPrepChoices.map(p => ({ ...p, selected: false, completed: false })),
          gameResolved: false,
        }));
      },

      resetSeason: () => {
        set(initialState);
      },
    }),
    {
      name: 'illegal-motion-management',
      partialize: (state) => ({
        currentWeek: state.currentWeek,
        events: state.events,
        eventHistory: state.eventHistory,
        delayedEffects: state.delayedEffects,
        alerts: state.alerts,
        teamMorale: state.teamMorale,
        reputation: state.reputation,
        ownerTrust: state.ownerTrust,
        corruptionLevel: state.corruptionLevel,
        investigation: state.investigation,
        availableFunds: state.availableFunds,
      }),
    }
  )
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPriorityColor(priority: EventPriority): string {
  switch (priority) {
    case 'CRITICAL': return 'text-red-500';
    case 'URGENT': return 'text-orange-500';
    case 'NORMAL': return 'text-yellow-500';
    case 'OPPORTUNITY': return 'text-green-500';
  }
}

export function getPriorityIcon(priority: EventPriority): string {
  switch (priority) {
    case 'CRITICAL': return '🔴';
    case 'URGENT': return '🟠';
    case 'NORMAL': return '🟡';
    case 'OPPORTUNITY': return '🟢';
  }
}

export function getHeatColor(heat: number): string {
  if (heat >= 80) return 'text-red-500';
  if (heat >= 60) return 'text-orange-500';
  if (heat >= 40) return 'text-yellow-500';
  if (heat >= 20) return 'text-blue-500';
  return 'text-green-500';
}
