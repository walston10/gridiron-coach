// src/stores/simpleCardGameStore.ts
// Card game store with fixed playbook + rating modifiers system

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FULL_PLAYBOOK, type BasePlay } from '../data/playbook';
import { OFFENSIVE_MODIFIERS, DIRTY_MODIFIERS, type ModifierCard } from '../data/modifiers';
import { getUnlockedSignatures, type SignatureCard } from '../data/signatureCards';
import {
  calculatePlaySuccess,
  resolvePlay,
  type RosterRatings,
  type PlaySuccessResult,
  type PlayResolutionResult,
} from '../engine/playCalculator';

// ============================================
// TYPES
// ============================================

export interface DefenseCard {
  id: string;
  name: string;
  type: 'coverage' | 'adjustment';
  cost: number;
  description: string;
  vsRun: number;
  vsPass: number;
  sackBonus?: number;
  scrambleCounter?: boolean;
}

export interface GameState {
  playerScore: number;
  opponentScore: number;
  quarter: number;
  clock: number;
  down: number;
  distance: number;
  fieldPosition: number;
  possession: 'player' | 'opponent';
  playerTimeouts: number;
  opponentTimeouts: number;
  isGameOver: boolean;
  heat: number; // Investigation heat from dirty plays
}

export interface Momentum {
  offense: number;
  defense: number;
  max: number;
}

export interface Tendencies {
  runRate: number;
  passRate: number;
  recentPlays: string[];
  opponentRunRate: number;
}

export interface PlayResult {
  success: boolean;
  yards: number;
  touchdown: boolean;
  firstDown: boolean;
  turnover: boolean;
  interception: boolean;
  fumble: boolean;
  sack: boolean;
  breakaway: boolean;
  clockUsed: number;
  momentumChange: number;
  description: string;
  penalty?: { type: string; yards: number };
  freePlay?: boolean;
}

// Re-export types for CardGameView
export type { BasePlay, ModifierCard, SignatureCard };

interface SimpleCardGameState {
  // Game state
  gameState: GameState;

  // Playbook (fixed, everyone has same plays)
  playbook: {
    short: BasePlay[];
    medium: BasePlay[];
    deep: BasePlay[];
    run: BasePlay[];
    trick: BasePlay[];
    signature: (BasePlay | SignatureCard)[];
  };

  // Modifiers
  offensiveModifiers: ModifierCard[];
  dirtyModifiers: ModifierCard[];

  // Roster ratings (for success calculation)
  rosterRatings: RosterRatings | null;

  // Momentum
  momentum: Momentum;

  // Tendencies
  tendencies: Tendencies;

  // Defense intel
  defenseIntel: {
    coordinator: string;
    personality: string;
    showing: string;
    coverage: string;
    adjustment: string | null;
  } | null;

  // Current selections
  selectedCategory: 'short' | 'medium' | 'deep' | 'run' | 'trick' | 'signature';
  selectedPlay: BasePlay | SignatureCard | null;
  selectedModifier: ModifierCard | null;
  calculatedSuccess: PlaySuccessResult | null;

  // Defense selections
  selectedCoverage: DefenseCard | null;
  selectedAdjustment: DefenseCard | null;

  // Game flow
  isPlayerOnOffense: boolean;
  lastPlayResult: PlayResult | null;
  showingResult: boolean;

  // Actions
  initializeGame: (roster: any) => void;
  setCategory: (category: 'short' | 'medium' | 'deep' | 'run' | 'trick' | 'signature') => void;
  selectPlay: (play: BasePlay | SignatureCard | null) => void;
  selectModifier: (modifier: ModifierCard | null) => void;
  selectCoverage: (coverage: DefenseCard) => void;
  selectAdjustment: (adjustment: DefenseCard | null) => void;
  snapBall: () => Promise<PlayResult | null>;
  setDefense: () => Promise<PlayResult | null>;
  dismissResult: () => void;
  useTimeout: (team: 'player' | 'opponent') => void;
  canAffordPlay: () => boolean;
  getTotalCost: () => number;
}

// ============================================
// INITIAL STATE
// ============================================

const initialGameState: GameState = {
  playerScore: 0,
  opponentScore: 0,
  quarter: 1,
  clock: 360,
  down: 1,
  distance: 10,
  fieldPosition: 25,
  possession: 'player',
  playerTimeouts: 3,
  opponentTimeouts: 3,
  isGameOver: false,
  heat: 0,
};

const initialMomentum: Momentum = {
  offense: 4,
  defense: 4,
  max: 6,
};

const initialTendencies: Tendencies = {
  runRate: 0.5,
  passRate: 0.5,
  recentPlays: [],
  opponentRunRate: 0.5,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractRosterRatings(roster: any): RosterRatings {
  // Extract ratings from roster object into the format needed for calculations
  const defaultRatings = {
    shortAccuracy: 75,
    mediumAccuracy: 75,
    deepAccuracy: 75,
    armStrength: 75,
    speed: 75,
    elusiveness: 75,
    awareness: 75,
    power: 75,
    accuracy: 75,
    catching: 75,
    routeRunning: 75,
    vision: 75,
    toughness: 75,
    jumping: 75,
    blocking: 75,
    passBlock: 75,
    runBlock: 75,
  };

  const getPlayerRatings = (player: any) => {
    if (!player?.ratings) return defaultRatings;
    const r = player.ratings;
    return {
      shortAccuracy: r.throwing ?? r.accuracy ?? 75,
      mediumAccuracy: r.throwing ?? r.accuracy ?? 75,
      deepAccuracy: r.throwing ?? r.accuracy ?? 75,
      armStrength: r.throwing ?? 75,
      speed: r.speed ?? 75,
      elusiveness: r.agility ?? r.elusiveness ?? 75,
      awareness: r.awareness ?? 75,
      power: r.strength ?? 75,
      accuracy: r.throwing ?? r.accuracy ?? 75,
      catching: r.catching ?? 75,
      routeRunning: r.routeRunning ?? r.agility ?? 75,
      vision: r.awareness ?? 75,
      toughness: r.toughness ?? 75,
      jumping: r.jumping ?? r.agility ?? 75,
      blocking: r.blocking ?? 75,
      passBlock: r.blocking ?? r.passBlock ?? 75,
      runBlock: r.blocking ?? r.runBlock ?? 75,
    };
  };

  return {
    QB: getPlayerRatings(roster?.offense?.QB),
    RB: getPlayerRatings(roster?.offense?.RB),
    WR1: getPlayerRatings(roster?.offense?.WR?.[0]),
    WR2: getPlayerRatings(roster?.offense?.WR?.[1]),
    TE: getPlayerRatings(roster?.offense?.TE),
    OL: {
      passBlock: roster?.offense?.OL?.passBlockRating ?? 75,
      runBlock: roster?.offense?.OL?.runBlockRating ?? 75,
    },
  };
}

function calculateClockUsed(result: PlayResolutionResult): number {
  let base = 30;

  if (result.success && !result.touchdown) {
    base = result.yards > 10 ? 35 : 30;
  } else if (!result.success && !result.sack) {
    base = 8; // Incomplete = clock stops
  }

  if (result.sack) base = 40;
  if (result.touchdown) base = 0;
  if (result.turnover) base = 15;

  return base;
}

function calculateMomentumChange(result: PlayResolutionResult): number {
  if (result.touchdown) return 2;
  if (result.turnover) return -3;
  if (result.firstDown) return 1;
  if (result.sack) return -1;
  if (result.breakaway) return 1;
  return 0;
}

// ============================================
// STORE
// ============================================

export const useSimpleCardGameStore = create<SimpleCardGameState>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: initialGameState,
      playbook: {
        short: FULL_PLAYBOOK.short,
        medium: FULL_PLAYBOOK.medium,
        deep: FULL_PLAYBOOK.deep,
        run: FULL_PLAYBOOK.run,
        trick: FULL_PLAYBOOK.trick,
        signature: [],
      },
      offensiveModifiers: OFFENSIVE_MODIFIERS,
      dirtyModifiers: DIRTY_MODIFIERS,
      rosterRatings: null,
      momentum: initialMomentum,
      tendencies: initialTendencies,
      defenseIntel: null,
      selectedCategory: 'short',
      selectedPlay: null,
      selectedModifier: null,
      calculatedSuccess: null,
      selectedCoverage: null,
      selectedAdjustment: null,
      isPlayerOnOffense: true,
      lastPlayResult: null,
      showingResult: false,

      // Initialize game
      initializeGame: (roster) => {
        const rosterRatings = extractRosterRatings(roster);

        // Get unlocked signature cards based on roster
        const unlockedSignatures = getUnlockedSignatures(rosterRatings);

        set({
          gameState: { ...initialGameState },
          playbook: {
            short: FULL_PLAYBOOK.short,
            medium: FULL_PLAYBOOK.medium,
            deep: FULL_PLAYBOOK.deep,
            run: FULL_PLAYBOOK.run,
            trick: FULL_PLAYBOOK.trick,
            signature: unlockedSignatures,
          },
          rosterRatings,
          momentum: { ...initialMomentum },
          tendencies: { ...initialTendencies },
          defenseIntel: {
            coordinator: 'Mike Blitzhauer',
            personality: 'AGGRESSIVE',
            showing: 'Nickel - Cover 1',
            coverage: 'cover1',
            adjustment: null,
          },
          selectedCategory: 'short',
          selectedPlay: null,
          selectedModifier: null,
          calculatedSuccess: null,
          selectedCoverage: null,
          selectedAdjustment: null,
          isPlayerOnOffense: true,
          lastPlayResult: null,
          showingResult: false,
        });
      },

      // Set play category
      setCategory: (category) => {
        set({
          selectedCategory: category,
          selectedPlay: null,
          calculatedSuccess: null,
        });
      },

      // Select a play
      selectPlay: (play) => {
        const state = get();
        if (!play || !state.rosterRatings || !state.defenseIntel) {
          set({ selectedPlay: null, calculatedSuccess: null });
          return;
        }

        // Calculate success rate
        const success = calculatePlaySuccess(
          play,
          state.rosterRatings,
          state.selectedModifier,
          state.tendencies,
          {
            coverage: state.defenseIntel.coverage,
            adjustment: state.defenseIntel.adjustment,
          },
          state.gameState
        );

        set({
          selectedPlay: play,
          calculatedSuccess: success,
        });
      },

      // Select a modifier
      selectModifier: (modifier) => {
        const state = get();
        set({ selectedModifier: modifier });

        // Recalculate success if play is selected
        if (state.selectedPlay && state.rosterRatings && state.defenseIntel) {
          const success = calculatePlaySuccess(
            state.selectedPlay,
            state.rosterRatings,
            modifier,
            state.tendencies,
            {
              coverage: state.defenseIntel.coverage,
              adjustment: state.defenseIntel.adjustment,
            },
            state.gameState
          );
          set({ calculatedSuccess: success });
        }
      },

      selectCoverage: (coverage) => {
        set({ selectedCoverage: coverage });
      },

      selectAdjustment: (adjustment) => {
        set({ selectedAdjustment: adjustment });
      },

      // Get total cost of play + modifier
      getTotalCost: () => {
        const state = get();
        let cost = 0;
        if (state.selectedPlay) {
          cost += state.selectedPlay.baseCost;
        }
        if (state.selectedModifier) {
          cost += state.selectedModifier.cost;
        }
        return cost;
      },

      // Check if can afford current selection
      canAffordPlay: () => {
        const state = get();
        const cost = get().getTotalCost();
        return state.momentum.offense >= cost;
      },

      // Snap the ball
      snapBall: async () => {
        const state = get();

        if (!state.selectedPlay || !state.rosterRatings || !state.calculatedSuccess) {
          return null;
        }

        if (!get().canAffordPlay()) {
          return null;
        }

        const play = state.selectedPlay;
        const modifier = state.selectedModifier;
        const successRate = state.calculatedSuccess.finalSuccess;

        // Resolve the play
        const resolution = resolvePlay(play, successRate, modifier, state.gameState);
        const clockUsed = calculateClockUsed(resolution);
        const momentumChange = calculateMomentumChange(resolution);

        // Build play result
        const result: PlayResult = {
          ...resolution,
          clockUsed,
          momentumChange,
        };

        // Update tendencies
        const newRecentPlays = [...state.tendencies.recentPlays, play.type].slice(-10);
        const runCount = newRecentPlays.filter((p) => p === 'run').length;
        const newRunRate = newRecentPlays.length > 0 ? runCount / newRecentPlays.length : 0.5;

        // Calculate new game state
        const newGameState = { ...state.gameState };
        let staysOnOffense = true;

        // Apply heat from dirty modifiers
        if (modifier?.effect.heatGain) {
          newGameState.heat = Math.min(100, newGameState.heat + modifier.effect.heatGain);
        }

        if (result.penalty && !result.freePlay) {
          // Penalty - move back, replay down
          newGameState.fieldPosition = Math.max(1, newGameState.fieldPosition - result.penalty.yards);
        } else if (result.touchdown) {
          newGameState.playerScore += 7;
          newGameState.fieldPosition = 25;
          newGameState.down = 1;
          newGameState.distance = 10;
          staysOnOffense = false;
        } else if (result.turnover) {
          newGameState.fieldPosition = 100 - (state.gameState.fieldPosition + result.yards);
          newGameState.down = 1;
          newGameState.distance = 10;
          staysOnOffense = false;
        } else {
          newGameState.fieldPosition += result.yards;

          if (result.firstDown) {
            newGameState.down = 1;
            newGameState.distance = Math.min(10, 100 - newGameState.fieldPosition);
          } else {
            newGameState.down += 1;
            newGameState.distance = Math.max(1, newGameState.distance - result.yards);

            if (newGameState.down > 4) {
              newGameState.fieldPosition = 100 - newGameState.fieldPosition;
              newGameState.down = 1;
              newGameState.distance = 10;
              staysOnOffense = false;
            }
          }
        }

        // Update clock
        newGameState.clock -= clockUsed;
        if (newGameState.clock <= 0) {
          newGameState.quarter += 1;
          newGameState.clock = 360;
          if (newGameState.quarter > 4) {
            newGameState.isGameOver = true;
          }
        }

        // Calculate new momentum
        const cost = get().getTotalCost();
        let newOffenseMomentum = Math.max(
          0,
          Math.min(state.momentum.max, state.momentum.offense - cost + momentumChange)
        );

        // Regen +1 if staying on offense
        if (staysOnOffense) {
          newOffenseMomentum = Math.min(state.momentum.max, newOffenseMomentum + 1);
        }

        set({
          gameState: newGameState,
          momentum: {
            ...state.momentum,
            offense: newOffenseMomentum,
          },
          tendencies: {
            ...state.tendencies,
            recentPlays: newRecentPlays,
            runRate: newRunRate,
            passRate: 1 - newRunRate,
          },
          selectedPlay: null,
          selectedModifier: null,
          calculatedSuccess: null,
          isPlayerOnOffense: staysOnOffense,
          lastPlayResult: result,
          showingResult: true,
        });

        return result;
      },

      // Set defense
      setDefense: async () => {
        const state = get();

        if (!state.selectedCoverage) {
          return null;
        }

        // AI picks a play
        const aiPlayType = Math.random() < state.tendencies.opponentRunRate ? 'run' : 'pass';

        // Calculate defense effectiveness
        let defenseRating =
          aiPlayType === 'run' ? state.selectedCoverage.vsRun : state.selectedCoverage.vsPass;
        if (state.selectedAdjustment) {
          defenseRating +=
            aiPlayType === 'run'
              ? state.selectedAdjustment.vsRun
              : state.selectedAdjustment.vsPass;
        }

        // AI success rate
        const aiSuccessRate = (100 - defenseRating) / 100;
        const aiSuccess = Math.random() < aiSuccessRate;

        let yards = 0;
        let touchdown = false;
        let firstDown = false;
        let turnover = false;
        let interception = false;
        let sack = false;

        if (aiSuccess) {
          if (aiPlayType === 'run') {
            yards = Math.floor(Math.random() * 8) + 2;
          } else {
            yards = Math.floor(Math.random() * 15) + 5;
          }

          if (state.gameState.fieldPosition - yards <= 0) {
            touchdown = true;
            yards = state.gameState.fieldPosition;
          }

          if (yards >= state.gameState.distance) {
            firstDown = true;
          }
        } else {
          if (aiPlayType === 'pass') {
            if (Math.random() < 0.1) {
              interception = true;
              turnover = true;
            }
            if (state.selectedAdjustment?.id === 'blitz' && Math.random() < 0.25) {
              sack = true;
              yards = -(Math.floor(Math.random() * 8) + 3);
            }
          } else {
            yards = Math.floor(Math.random() * 2);
          }
        }

        let momentumChange = 0;
        if (turnover) momentumChange = 2;
        else if (sack) momentumChange = 1;
        else if (touchdown) momentumChange = -2;

        let description = '';
        if (interception) description = 'INTERCEPTION! Turnover!';
        else if (sack) description = `SACK! ${Math.abs(yards)} yard loss!`;
        else if (touchdown) description = 'Opponent TOUCHDOWN...';
        else if (firstDown) description = `Opponent gains ${yards} for first down`;
        else description = `Opponent held to ${yards} yards`;

        const result: PlayResult = {
          success: !aiSuccess,
          yards,
          touchdown,
          firstDown,
          turnover,
          interception,
          fumble: false,
          sack,
          breakaway: false,
          clockUsed: 30,
          momentumChange,
          description,
        };

        // Update game state
        const newGameState = { ...state.gameState };
        let goesOnOffense = false;

        if (result.touchdown) {
          newGameState.opponentScore += 7;
          newGameState.fieldPosition = 25;
          newGameState.down = 1;
          newGameState.distance = 10;
          goesOnOffense = true;
        } else if (result.turnover) {
          newGameState.fieldPosition = 100 - (state.gameState.fieldPosition - result.yards);
          newGameState.down = 1;
          newGameState.distance = 10;
          goesOnOffense = true;
        } else {
          newGameState.fieldPosition -= result.yards;

          if (result.firstDown) {
            newGameState.down = 1;
            newGameState.distance = Math.min(10, newGameState.fieldPosition);
          } else {
            newGameState.down += 1;
            newGameState.distance = Math.max(1, newGameState.distance - result.yards);

            if (newGameState.down > 4) {
              newGameState.fieldPosition = 100 - newGameState.fieldPosition;
              newGameState.down = 1;
              newGameState.distance = 10;
              goesOnOffense = true;
            }
          }
        }

        // Update clock
        newGameState.clock -= result.clockUsed;
        if (newGameState.clock <= 0) {
          newGameState.quarter += 1;
          newGameState.clock = 360;
          if (newGameState.quarter > 4) {
            newGameState.isGameOver = true;
          }
        }

        const cost = state.selectedAdjustment?.cost || 0;
        const newDefenseMomentum = Math.max(
          0,
          Math.min(state.momentum.max, state.momentum.defense - cost + result.momentumChange)
        );

        set({
          gameState: newGameState,
          momentum: {
            ...state.momentum,
            defense: newDefenseMomentum,
          },
          selectedCoverage: null,
          selectedAdjustment: null,
          isPlayerOnOffense: goesOnOffense,
          lastPlayResult: result,
          showingResult: true,
        });

        return result;
      },

      // Dismiss result overlay
      dismissResult: () => {
        set({ showingResult: false, lastPlayResult: null });
      },

      // Use timeout
      useTimeout: (team) => {
        const state = get();

        if (team === 'player' && state.gameState.playerTimeouts > 0) {
          set({
            gameState: {
              ...state.gameState,
              playerTimeouts: state.gameState.playerTimeouts - 1,
            },
          });
        } else if (team === 'opponent' && state.gameState.opponentTimeouts > 0) {
          set({
            gameState: {
              ...state.gameState,
              opponentTimeouts: state.gameState.opponentTimeouts - 1,
            },
          });
        }
      },
    }),
    {
      name: 'illegal-motion-game',
    }
  )
);

export default useSimpleCardGameStore;
