/**
 * ILLEGAL MOTION - Tutorial Store
 *
 * Manages tutorial state, progress tracking, and hint display.
 * Provides contextual hints based on game state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TUTORIAL STEP DEFINITIONS
// =============================================================================

export type TutorialStep =
  // Intro & Setup
  | 'WELCOME'
  | 'OWNER_INTRO'
  | 'DESK_OVERVIEW'
  | 'CALENDAR_INTRO'
  | 'METERS_INTRO'
  // Draft
  | 'DRAFT_START'
  | 'DRAFT_SCOUTING'
  | 'DRAFT_PICKING'
  | 'DRAFT_COMPLETE'
  // Weekly Management
  | 'FIRST_WEEK'
  | 'WEEKLY_EVENTS'
  | 'PREP_CHOICES'
  | 'PHONE_CALLS'
  // Game Day
  | 'FIRST_GAME'
  | 'PLAY_CALLING'
  | 'OFFENSIVE_PLAY'
  | 'DEFENSIVE_PLAY'
  | 'PLAY_RESULT'
  | 'CLOCK_MANAGEMENT'
  | 'HALFTIME'
  | 'GAME_END'
  // Playbook
  | 'PLAYBOOK_INTRO'
  | 'PLAY_DESIGNER'
  | 'ROUTES_INTRO'
  | 'FORMATIONS'
  // Season
  | 'STANDINGS'
  | 'SCHEDULE'
  | 'PLAYOFFS'
  // Offseason
  | 'SEASON_END'
  | 'FREE_AGENCY'
  | 'CONTRACTS'
  | 'TRAINING_CAMP';

export interface TutorialHint {
  id: TutorialStep;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  targetElement?: string;  // CSS selector for highlight
  dismissible?: boolean;
  nextStep?: TutorialStep;
  showOnce?: boolean;
}

// =============================================================================
// TUTORIAL CONTENT
// =============================================================================

export const TUTORIAL_HINTS: Record<TutorialStep, TutorialHint> = {
  // Intro & Setup
  WELCOME: {
    id: 'WELCOME',
    title: 'Welcome to Illegal Motion',
    content: 'You\'re about to take over a struggling football franchise. Your owner has big expectations, and the media is watching. Make smart decisions to build a dynasty.',
    position: 'center',
    dismissible: true,
    nextStep: 'OWNER_INTRO',
  },
  OWNER_INTRO: {
    id: 'OWNER_INTRO',
    title: 'Meet Your Owner',
    content: 'Your owner has their own personality and expectations. Keep them happy to keep your job. Watch the Owner Patience meter closely.',
    position: 'center',
    dismissible: true,
    nextStep: 'DESK_OVERVIEW',
  },
  DESK_OVERVIEW: {
    id: 'DESK_OVERVIEW',
    title: 'Your Office',
    content: 'This is your desk - the nerve center of operations. Everything you need is within reach. Click on objects to interact with them.',
    position: 'center',
    dismissible: true,
    nextStep: 'CALENDAR_INTRO',
  },
  CALENDAR_INTRO: {
    id: 'CALENDAR_INTRO',
    title: 'The Calendar',
    content: 'Your calendar shows the current week and upcoming events. Games are highlighted in red. Click to advance through the week.',
    targetElement: '[data-tutorial="calendar"]',
    position: 'right',
    dismissible: true,
    nextStep: 'METERS_INTRO',
  },
  METERS_INTRO: {
    id: 'METERS_INTRO',
    title: 'Status Meters',
    content: 'These meters track your standing with the owner, media, and fan base. Keep all three positive to maintain job security.',
    targetElement: '[data-tutorial="meters"]',
    position: 'left',
    dismissible: true,
  },

  // Draft
  DRAFT_START: {
    id: 'DRAFT_START',
    title: 'Draft Day',
    content: 'The draft is your chance to build for the future. You have limited picks, so make them count. Scout prospects before selecting.',
    position: 'center',
    dismissible: true,
    nextStep: 'DRAFT_SCOUTING',
  },
  DRAFT_SCOUTING: {
    id: 'DRAFT_SCOUTING',
    title: 'Scouting Reports',
    content: 'Each prospect has ratings that may be hidden until scouted. Higher draft picks are generally more talented, but hidden gems exist in later rounds.',
    position: 'bottom',
    dismissible: true,
    nextStep: 'DRAFT_PICKING',
  },
  DRAFT_PICKING: {
    id: 'DRAFT_PICKING',
    title: 'Making Your Pick',
    content: 'When it\'s your turn, select a prospect to add them to your roster. Consider team needs and available talent.',
    position: 'center',
    dismissible: true,
  },
  DRAFT_COMPLETE: {
    id: 'DRAFT_COMPLETE',
    title: 'Draft Complete',
    content: 'Your draft class is set! These rookies will compete for roster spots in training camp.',
    position: 'center',
    dismissible: true,
    showOnce: true,
  },

  // Weekly Management
  FIRST_WEEK: {
    id: 'FIRST_WEEK',
    title: 'Your First Week',
    content: 'Each week brings new challenges. Handle events, make prep choices, and prepare for game day.',
    position: 'center',
    dismissible: true,
    nextStep: 'WEEKLY_EVENTS',
  },
  WEEKLY_EVENTS: {
    id: 'WEEKLY_EVENTS',
    title: 'Weekly Events',
    content: 'Events pop up requiring decisions. Your choices affect team morale, media perception, and owner happiness.',
    position: 'center',
    dismissible: true,
    nextStep: 'PREP_CHOICES',
  },
  PREP_CHOICES: {
    id: 'PREP_CHOICES',
    title: 'Game Preparation',
    content: 'Choose how to prepare for the upcoming game. Focus on offense, defense, special teams, or rest your players.',
    position: 'center',
    dismissible: true,
  },
  PHONE_CALLS: {
    id: 'PHONE_CALLS',
    title: 'Phone Calls',
    content: 'Answer the phone to hear from agents, other GMs, and media. These interactions can lead to opportunities or trouble.',
    targetElement: '[data-tutorial="phone"]',
    position: 'left',
    dismissible: true,
  },

  // Game Day
  FIRST_GAME: {
    id: 'FIRST_GAME',
    title: 'Game Day',
    content: 'Time to prove yourself on the field. Call plays, manage the clock, and outcoach your opponent.',
    position: 'center',
    dismissible: true,
    nextStep: 'PLAY_CALLING',
  },
  PLAY_CALLING: {
    id: 'PLAY_CALLING',
    title: 'Calling Plays',
    content: 'Select plays from your playbook. Consider the down, distance, and game situation when choosing.',
    position: 'bottom',
    dismissible: true,
  },
  OFFENSIVE_PLAY: {
    id: 'OFFENSIVE_PLAY',
    title: 'Offensive Plays',
    content: 'On offense, choose from run plays, short passes, or deep shots. Match your personnel to the play type.',
    position: 'bottom',
    dismissible: true,
  },
  DEFENSIVE_PLAY: {
    id: 'DEFENSIVE_PLAY',
    title: 'Defensive Plays',
    content: 'On defense, read the offense and choose your coverage and blitz packages. Guess right to disrupt their plan.',
    position: 'bottom',
    dismissible: true,
  },
  PLAY_RESULT: {
    id: 'PLAY_RESULT',
    title: 'Play Results',
    content: 'Watch the play unfold. Results depend on play call, matchups, and a bit of luck.',
    position: 'center',
    dismissible: true,
  },
  CLOCK_MANAGEMENT: {
    id: 'CLOCK_MANAGEMENT',
    title: 'Clock Management',
    content: 'The clock matters! Know when to hurry up, run the ball, or call timeouts.',
    position: 'top',
    dismissible: true,
  },
  HALFTIME: {
    id: 'HALFTIME',
    title: 'Halftime',
    content: 'Halftime is a chance to adjust your strategy based on first-half performance.',
    position: 'center',
    dismissible: true,
  },
  GAME_END: {
    id: 'GAME_END',
    title: 'Game Over',
    content: 'The final whistle. Your result affects standings, morale, and owner confidence.',
    position: 'center',
    dismissible: true,
    showOnce: true,
  },

  // Playbook
  PLAYBOOK_INTRO: {
    id: 'PLAYBOOK_INTRO',
    title: 'Your Playbook',
    content: 'Your playbook contains all available plays. Organize them into folders for quick access during games.',
    position: 'center',
    dismissible: true,
    nextStep: 'PLAY_DESIGNER',
  },
  PLAY_DESIGNER: {
    id: 'PLAY_DESIGNER',
    title: 'Play Designer',
    content: 'Create custom plays! Set formations, draw routes, and design blocking schemes.',
    position: 'center',
    dismissible: true,
  },
  ROUTES_INTRO: {
    id: 'ROUTES_INTRO',
    title: 'Route Running',
    content: 'Assign routes to receivers. Combine short, medium, and deep routes to create passing concepts.',
    position: 'left',
    dismissible: true,
  },
  FORMATIONS: {
    id: 'FORMATIONS',
    title: 'Formations',
    content: 'Different formations have different strengths. Spread out for passing, bunch up for running.',
    position: 'right',
    dismissible: true,
  },

  // Season
  STANDINGS: {
    id: 'STANDINGS',
    title: 'League Standings',
    content: 'Track your position in the division and conference. Top teams make the playoffs.',
    position: 'center',
    dismissible: true,
  },
  SCHEDULE: {
    id: 'SCHEDULE',
    title: 'Season Schedule',
    content: 'View your upcoming opponents and plan ahead. Some weeks are harder than others.',
    position: 'center',
    dismissible: true,
  },
  PLAYOFFS: {
    id: 'PLAYOFFS',
    title: 'Playoffs',
    content: 'Make the playoffs and win it all to secure your legacy - and your job!',
    position: 'center',
    dismissible: true,
    showOnce: true,
  },

  // Offseason
  SEASON_END: {
    id: 'SEASON_END',
    title: 'Season Complete',
    content: 'The season is over. Time to evaluate your roster and plan for next year.',
    position: 'center',
    dismissible: true,
    nextStep: 'FREE_AGENCY',
  },
  FREE_AGENCY: {
    id: 'FREE_AGENCY',
    title: 'Free Agency',
    content: 'Sign free agents to fill roster holes. Be careful with the salary cap!',
    position: 'center',
    dismissible: true,
  },
  CONTRACTS: {
    id: 'CONTRACTS',
    title: 'Contract Decisions',
    content: 'Decide which players to keep, extend, or release. Salary cap management is crucial.',
    position: 'center',
    dismissible: true,
  },
  TRAINING_CAMP: {
    id: 'TRAINING_CAMP',
    title: 'Training Camp',
    content: 'Players develop (or regress) during camp. Set your depth chart for the new season.',
    position: 'center',
    dismissible: true,
  },
};

// =============================================================================
// STORE STATE
// =============================================================================

interface TutorialState {
  // Progress
  completedSteps: TutorialStep[];
  currentStep: TutorialStep | null;
  isActive: boolean;

  // Settings
  tutorialsEnabled: boolean;
  showHints: boolean;

  // UI State
  isHintVisible: boolean;
  highlightedElement: string | null;

  // Actions
  startTutorial: (startingStep?: TutorialStep) => void;
  completeStep: (step: TutorialStep) => void;
  skipStep: () => void;
  skipAllTutorials: () => void;
  resetTutorials: () => void;

  showStep: (step: TutorialStep) => void;
  hideHint: () => void;

  setTutorialsEnabled: (enabled: boolean) => void;
  setShowHints: (show: boolean) => void;

  // Queries
  hasCompletedStep: (step: TutorialStep) => boolean;
  shouldShowHint: (step: TutorialStep) => boolean;
  getCurrentHint: () => TutorialHint | null;
}

// =============================================================================
// STORE
// =============================================================================

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      // Initial state
      completedSteps: [],
      currentStep: null,
      isActive: false,

      tutorialsEnabled: true,
      showHints: true,

      isHintVisible: false,
      highlightedElement: null,

      // Actions
      startTutorial: (startingStep = 'WELCOME') => {
        const state = get();
        if (!state.tutorialsEnabled) return;

        set({
          isActive: true,
          currentStep: startingStep,
          isHintVisible: true,
          highlightedElement: TUTORIAL_HINTS[startingStep]?.targetElement || null,
        });
      },

      completeStep: (step) => {
        const state = get();
        const hint = TUTORIAL_HINTS[step];

        // Add to completed if not already
        const newCompleted = state.completedSteps.includes(step)
          ? state.completedSteps
          : [...state.completedSteps, step];

        // Auto-advance to next step if defined
        const nextStep = hint?.nextStep;

        set({
          completedSteps: newCompleted,
          currentStep: nextStep || null,
          isHintVisible: !!nextStep,
          highlightedElement: nextStep ? TUTORIAL_HINTS[nextStep]?.targetElement || null : null,
        });

        // If no next step, end tutorial sequence
        if (!nextStep) {
          set({ isActive: false });
        }
      },

      skipStep: () => {
        const state = get();
        if (!state.currentStep) return;

        const hint = TUTORIAL_HINTS[state.currentStep];
        const nextStep = hint?.nextStep;

        set({
          currentStep: nextStep || null,
          isHintVisible: !!nextStep,
          highlightedElement: nextStep ? TUTORIAL_HINTS[nextStep]?.targetElement || null : null,
        });

        if (!nextStep) {
          set({ isActive: false });
        }
      },

      skipAllTutorials: () => {
        set({
          isActive: false,
          currentStep: null,
          isHintVisible: false,
          highlightedElement: null,
          tutorialsEnabled: false,
        });
      },

      resetTutorials: () => {
        set({
          completedSteps: [],
          currentStep: null,
          isActive: false,
          isHintVisible: false,
          highlightedElement: null,
          tutorialsEnabled: true,
          showHints: true,
        });
      },

      showStep: (step) => {
        const state = get();
        if (!state.tutorialsEnabled && !state.showHints) return;

        // Don't show if already completed (and marked showOnce)
        const hint = TUTORIAL_HINTS[step];
        if (hint?.showOnce && state.completedSteps.includes(step)) return;

        set({
          currentStep: step,
          isHintVisible: true,
          highlightedElement: hint?.targetElement || null,
        });
      },

      hideHint: () => {
        set({
          isHintVisible: false,
          highlightedElement: null,
        });
      },

      setTutorialsEnabled: (enabled) => {
        set({ tutorialsEnabled: enabled });
      },

      setShowHints: (show) => {
        set({ showHints: show });
      },

      // Queries
      hasCompletedStep: (step) => {
        return get().completedSteps.includes(step);
      },

      shouldShowHint: (step) => {
        const state = get();
        if (!state.tutorialsEnabled && !state.showHints) return false;

        const hint = TUTORIAL_HINTS[step];
        if (hint?.showOnce && state.completedSteps.includes(step)) return false;

        return true;
      },

      getCurrentHint: () => {
        const state = get();
        if (!state.currentStep || !state.isHintVisible) return null;
        return TUTORIAL_HINTS[state.currentStep] || null;
      },
    }),
    {
      name: 'illegal-motion-tutorials',
      partialize: (state) => ({
        completedSteps: state.completedSteps,
        tutorialsEnabled: state.tutorialsEnabled,
        showHints: state.showHints,
      }),
    }
  )
);
