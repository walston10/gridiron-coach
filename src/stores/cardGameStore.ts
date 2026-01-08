/**
 * ILLEGAL MOTION - Card Game State Store
 *
 * Central state management for live card-based game play.
 * Manages score, clock, possession, momentum, hand, and game flow.
 *
 * This is the CORE GAME STORE for the Illegal Motion card game mechanics.
 */

import { create } from 'zustand';
import type {
  GamePhase,
  GameClock,
  FieldPosition,
  Down,
  Momentum,
  Tendencies,
  DriveState,
  DriveResult,
  WeatherCondition,
  FourthDownCategory,
  FourthDownDefenseResponse,
  FourthDownState,
  FourthDownPhase,
  PlaySelection,
  GameStats,
} from '../types/game.types';
import type {
  Card,
  OffensiveCard,
  DefensiveCard,
  DirtyCard,
  OffensivePlayType,
} from '../types/card.types';
import type { Deck, Hand, GameDeckState } from '../types/deck.types';
import type { Roster } from '../types/player.types';
import {
  resolveOffensivePlay,
  resolveFourthDown,
  updateTendencies,
  type PlayContext,
  type PlayResult,
  type FourthDownResult,
  type STRatings,
  type ReturnerRatings,
  setRNGSeed,
} from '../engine/playResolver';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Momentum system constants */
export const MOMENTUM_CONFIG = {
  MIN: 0,
  MAX: 6,
  STARTING: 3,
} as const;

/** Momentum recovery/depletion rules */
export const MOMENTUM_RULES = {
  // Recovery (positive events)
  FIRST_DOWN: 1,
  TOUCHDOWN: 2,
  FIELD_GOAL: 1,
  TURNOVER_GAINED: 2,
  SACK: 1,
  BIG_PLAY: 1,
  THIRD_DOWN_STOP: 1,

  // Depletion (negative events)
  TURNOVER_LOST: 3,
  SACK_TAKEN: 1,
  THREE_AND_OUT: 2,
  PENALTY: 1,
  FAILED_FOURTH: 2,
} as const;

/** Hand limits */
export const HAND_LIMITS = {
  MAX_OFFENSIVE: 5,
  MAX_DEFENSIVE: 5,
  MAX_DIRTY: 2,
  STARTING_OFFENSIVE: 4,
  STARTING_DEFENSIVE: 4,
} as const;

/** Quarter settings */
export const QUARTER_CONFIG = {
  DEFAULT_MINUTES: 4, // Quick games
  FULL_MINUTES: 15,
  TWO_MINUTE_WARNING: 2,
  PLAY_CLOCK: 40,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type Possession = 'player' | 'opponent';

export type PossessionChangeReason =
  | 'TOUCHDOWN'
  | 'FIELD_GOAL'
  | 'PUNT'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'TURNOVER_ON_DOWNS'
  | 'SAFETY'
  | 'KICKOFF'
  | 'START_OF_HALF'
  | 'ONSIDE_KICK_RECOVERY';

export interface PossessionState {
  possession: Possession;
  kickoffPending: boolean;
  xpPending: boolean;
  twoPointPending: boolean;
  lastChangeReason: PossessionChangeReason | null;
  receivingNextHalf: Possession | null;
}

export interface PlayLogEntry {
  playNumber: number;
  quarter: number | 'OT';
  timeRemaining: string;
  down: Down;
  yardsToGo: number;
  yardLine: number;
  possession: Possession;
  description: string;
  yardsGained: number;
  result: 'success' | 'failure' | 'turnover' | 'score';
  offenseCard?: string;
  defenseCard?: string;
}

export interface DriveLog {
  driveNumber: number;
  startQuarter: number | 'OT';
  startTime: string;
  startYardLine: number;
  possession: Possession;
  plays: PlayLogEntry[];
  result: DriveResult | null;
  yardsGained: number;
  timeElapsed: number;
}

export interface TransitionScreen {
  type: 'SCORE_UPDATE' | 'POSSESSION_CHANGE' | 'QUARTER_END' | 'HALFTIME' | 'GAME_OVER' | 'XP_CHOICE';
  title: string;
  subtitle?: string;
  showXPChoice?: boolean;
  dismissable: boolean;
}

export interface TeamState {
  score: number;
  timeoutsRemaining: number;
  fatigue: number;
  stats: GameStats;
}

// =============================================================================
// GAME STATE INTERFACE
// =============================================================================

export interface CardGameState {
  // === Core Game State ===
  gameId: string | null;
  phase: GamePhase;
  isInitialized: boolean;

  // === Teams & Rosters ===
  playerRoster: Roster | null;
  opponentRoster: Roster | null;
  playerState: TeamState;
  opponentState: TeamState;

  // === Score & Clock ===
  clock: GameClock;
  playClock: number;

  // === Field Position ===
  fieldPosition: FieldPosition;

  // === Possession ===
  possessionState: PossessionState;

  // === Momentum System (0-6 scale) ===
  offensiveMomentum: number;
  defensiveMomentum: number;
  momentumTracker: Momentum;

  // === Tendencies ===
  playerTendencies: Tendencies;
  opponentTendencies: Tendencies;

  // === Hand & Deck Management ===
  playerDeck: GameDeckState | null;
  opponentDeck: GameDeckState | null;

  // === Current Play Selection ===
  playSelection: PlaySelection;
  fourthDownState: FourthDownState | null;

  // === Drive State ===
  currentDrive: DriveState;
  driveNumber: number;

  // === History ===
  playLog: PlayLogEntry[];
  driveLog: DriveLog[];
  playNumber: number;

  // === UI State ===
  transitionScreen: TransitionScreen | null;
  isPaused: boolean;

  // === Settings ===
  weather: WeatherCondition;
  quarterMinutes: number;
}

// =============================================================================
// INITIAL STATE CREATORS
// =============================================================================

const createInitialTendencies = (): Tendencies => ({
  recentPlays: [],
  runPassRatio: 50,
  shortDeepRatio: 50,
  leftRightRatio: 50,
  thirdDownTendency: 'BALANCED',
  redZoneTendency: 'BALANCED',
  trailingTendency: 'BALANCED',
  predictability: 0,
  lastPredictionCorrect: false,
  predictionStreak: 0,
});

const createInitialFieldPosition = (yardLine: number = 25): FieldPosition => {
  const yardsToEndzone = 100 - yardLine;
  return {
    yardLine,
    down: 1,
    yardsToGo: 10,
    yardsToEndzone,
    inRedZone: yardsToEndzone <= 20,
    inGoalToGo: 10 >= yardsToEndzone,
    backedUp: yardLine <= 10,
  };
};

const createInitialClock = (quarterMinutes: number = QUARTER_CONFIG.DEFAULT_MINUTES): GameClock => ({
  quarter: 1,
  minutes: quarterMinutes,
  seconds: 0,
  isRunning: false,
});

const createInitialMomentum = (): Momentum => ({
  value: 0,
  streak: 0,
  isHot: false,
  isCold: false,
  lastChange: 0,
});

const createInitialDrive = (yardLine: number, quarter: number | 'OT', minutes: number, seconds: number): DriveState => ({
  startingYardLine: yardLine,
  startingTime: { quarter: typeof quarter === 'number' ? quarter : 5, minutes, seconds },
  plays: [],
  yardsGained: 0,
  result: null,
});

const createInitialPlaySelection = (): PlaySelection => ({
  phase: 'DEFENSE_SELECTING',
  defenseCard: null,
  defensePrediction: null,
  offenseCard: null,
  dirtyCard: null,
  dirtyCardSide: null,
  selectionTimeRemaining: 30,
  timedOut: false,
});

const createInitialPossessionState = (): PossessionState => ({
  possession: 'opponent',
  kickoffPending: true,
  xpPending: false,
  twoPointPending: false,
  lastChangeReason: null,
  receivingNextHalf: null,
});

const createInitialStats = (): GameStats => ({
  totalYards: 0,
  passingYards: 0,
  rushingYards: 0,
  turnovers: 0,
  sacks: 0,
  penalties: 0,
  penaltyYards: 0,
  thirdDownConversions: 0,
  thirdDownAttempts: 0,
  redZoneScores: 0,
  redZoneAttempts: 0,
  timeOfPossession: 0,
});

const createInitialTeamState = (): TeamState => ({
  score: 0,
  timeoutsRemaining: 3,
  fatigue: 0,
  stats: createInitialStats(),
});

// =============================================================================
// STORE ACTIONS INTERFACE
// =============================================================================

interface CardGameActions {
  // === Game Flow ===
  startGame: (
    playerRoster: Roster,
    opponentRoster: Roster,
    playerDeck: Deck,
    opponentDeck: Deck,
    playerReceivesFirst: boolean,
    options?: { seed?: number; quarterMinutes?: number }
  ) => void;
  endGame: () => void;
  resetGame: () => void;

  // === Phase Management ===
  setPhase: (phase: GamePhase) => void;
  advanceQuarter: () => void;

  // === Clock Management ===
  tickClock: (seconds: number) => void;
  stopClock: () => void;
  startClock: () => void;

  // === Possession Management ===
  switchPossession: (reason: PossessionChangeReason) => void;
  handleKickoff: (type: 'NORMAL' | 'ONSIDE' | 'SQUIB') => void;
  handleExtraPoint: (type: 'XP' | 'TWO_POINT') => void;

  // === Drive Management ===
  startDrive: (yardLine: number) => void;
  endDrive: (result: DriveResult) => void;

  // === Play Execution ===
  selectOffensiveCard: (card: OffensiveCard, dirtyCard?: DirtyCard) => void;
  selectDefensiveCard: (card: DefensiveCard, prediction?: OffensivePlayType, dirtyCard?: DirtyCard) => void;
  executePlay: () => PlayResult | null;
  executeFourthDown: (
    offenseChoice: FourthDownCategory | 'FAKE_FG' | 'FAKE_PUNT',
    defenseChoice: FourthDownDefenseResponse
  ) => FourthDownResult | null;

  // === Field Position ===
  updateFieldPosition: (yardsGained: number) => void;
  setFieldPosition: (yardLine: number, down: Down, yardsToGo: number) => void;

  // === Scoring ===
  addScore: (team: Possession, points: number) => void;

  // === Momentum System ===
  recoverOffensiveMomentum: (amount: number) => void;
  depleteOffensiveMomentum: (amount: number) => void;
  recoverDefensiveMomentum: (amount: number) => void;
  depleteDefensiveMomentum: (amount: number) => void;
  applyMomentumEvent: (event: keyof typeof MOMENTUM_RULES, forPlayer: boolean) => void;

  // === Hand Management ===
  drawCard: (type: 'OFFENSIVE' | 'DEFENSIVE' | 'DIRTY', forPlayer?: boolean) => Card | null;
  playCard: (cardId: string, forPlayer?: boolean) => void;
  discardCard: (cardId: string, forPlayer?: boolean) => void;
  drawStartingHands: () => void;

  // === Tendencies ===
  updatePlayerTendencies: (playType: OffensivePlayType, wasPredicted: boolean) => void;
  updateOpponentTendencies: (playType: OffensivePlayType, wasPredicted: boolean) => void;

  // === Fourth Down ===
  initiateFourthDown: () => void;
  setFourthDownOffenseChoice: (choice: FourthDownCategory, isFaking?: boolean) => void;
  setFourthDownDefenseResponse: (response: FourthDownDefenseResponse) => void;

  // === UI ===
  showTransition: (screen: TransitionScreen) => void;
  dismissTransition: () => void;
  pauseGame: () => void;
  resumeGame: () => void;

  // === History ===
  logPlay: (entry: Omit<PlayLogEntry, 'playNumber'>) => void;

  // === Selectors (computed getters) ===
  isRedZone: () => boolean;
  isGoalToGo: () => boolean;
  isTwoMinuteWarning: () => boolean;
  isPlayerOnOffense: () => boolean;
  getScoreDifferential: () => number;
  getPlayerHand: () => Hand | null;
  getAvailableOffensiveCards: () => OffensiveCard[];
  getAvailableDefensiveCards: () => DefensiveCard[];
  getCurrentContext: () => PlayContext | null;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: CardGameState = {
  gameId: null,
  phase: 'PREGAME',
  isInitialized: false,
  playerRoster: null,
  opponentRoster: null,
  playerState: createInitialTeamState(),
  opponentState: createInitialTeamState(),
  clock: createInitialClock(),
  playClock: QUARTER_CONFIG.PLAY_CLOCK,
  fieldPosition: createInitialFieldPosition(),
  possessionState: createInitialPossessionState(),
  offensiveMomentum: MOMENTUM_CONFIG.STARTING,
  defensiveMomentum: MOMENTUM_CONFIG.STARTING,
  momentumTracker: createInitialMomentum(),
  playerTendencies: createInitialTendencies(),
  opponentTendencies: createInitialTendencies(),
  playerDeck: null,
  opponentDeck: null,
  playSelection: createInitialPlaySelection(),
  fourthDownState: null,
  currentDrive: createInitialDrive(25, 1, QUARTER_CONFIG.DEFAULT_MINUTES, 0),
  driveNumber: 0,
  playLog: [],
  driveLog: [],
  playNumber: 0,
  transitionScreen: null,
  isPaused: false,
  weather: 'CLEAR',
  quarterMinutes: QUARTER_CONFIG.DEFAULT_MINUTES,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useCardGameStore = create<CardGameState & CardGameActions>((set, get) => ({
  ...initialState,

  // =========================================================================
  // GAME FLOW
  // =========================================================================

  startGame: (playerRoster, opponentRoster, playerDeck, opponentDeck, playerReceivesFirst, options = {}) => {
    const { seed, quarterMinutes = QUARTER_CONFIG.DEFAULT_MINUTES } = options;

    // Set RNG seed for reproducibility
    setRNGSeed(seed ?? Date.now());

    // Initialize deck states
    const playerDeckState = createGameDeckState(playerDeck);
    const opponentDeckState = createGameDeckState(opponentDeck);

    set({
      gameId: `game_${Date.now()}`,
      phase: 'KICKOFF',
      isInitialized: true,
      playerRoster,
      opponentRoster,
      playerState: createInitialTeamState(),
      opponentState: createInitialTeamState(),
      clock: createInitialClock(quarterMinutes),
      fieldPosition: createInitialFieldPosition(),
      possessionState: {
        possession: playerReceivesFirst ? 'player' : 'opponent',
        kickoffPending: true,
        xpPending: false,
        twoPointPending: false,
        lastChangeReason: 'KICKOFF',
        receivingNextHalf: playerReceivesFirst ? 'opponent' : 'player',
      },
      offensiveMomentum: MOMENTUM_CONFIG.STARTING,
      defensiveMomentum: MOMENTUM_CONFIG.STARTING,
      momentumTracker: createInitialMomentum(),
      playerTendencies: createInitialTendencies(),
      opponentTendencies: createInitialTendencies(),
      playerDeck: playerDeckState,
      opponentDeck: opponentDeckState,
      playSelection: createInitialPlaySelection(),
      currentDrive: createInitialDrive(25, 1, quarterMinutes, 0),
      driveNumber: 1,
      playLog: [],
      driveLog: [],
      playNumber: 0,
      quarterMinutes,
    });

    // Draw starting hands
    get().drawStartingHands();
  },

  endGame: () => {
    const state = get();
    const playerWon = state.playerState.score > state.opponentState.score;
    const tied = state.playerState.score === state.opponentState.score;

    set({
      phase: 'GAME_OVER',
      transitionScreen: {
        type: 'GAME_OVER',
        title: tied ? 'TIE GAME' : playerWon ? 'VICTORY!' : 'DEFEAT',
        subtitle: `Final: ${state.playerState.score} - ${state.opponentState.score}`,
        dismissable: true,
      },
    });
  },

  resetGame: () => {
    set(initialState);
  },

  // =========================================================================
  // PHASE MANAGEMENT
  // =========================================================================

  setPhase: (phase) => set({ phase }),

  advanceQuarter: () => {
    const state = get();
    const currentQuarter = state.clock.quarter;

    if (currentQuarter === 4) {
      // Check for overtime or end game
      if (state.playerState.score === state.opponentState.score) {
        set({
          clock: { ...state.clock, quarter: 'OT', minutes: 10, seconds: 0 },
          phase: 'KICKOFF',
          transitionScreen: {
            type: 'QUARTER_END',
            title: 'OVERTIME',
            subtitle: 'Next score wins!',
            dismissable: true,
          },
        });
      } else {
        get().endGame();
      }
      return;
    }

    if (currentQuarter === 2) {
      // Halftime
      const receivingTeam = state.possessionState.receivingNextHalf;
      set({
        clock: { quarter: 3, minutes: state.quarterMinutes, seconds: 0, isRunning: false },
        phase: 'HALFTIME',
        possessionState: {
          ...state.possessionState,
          possession: receivingTeam || 'player',
          kickoffPending: true,
        },
        // Reset timeouts
        playerState: { ...state.playerState, timeoutsRemaining: 3 },
        opponentState: { ...state.opponentState, timeoutsRemaining: 3 },
        transitionScreen: {
          type: 'HALFTIME',
          title: 'HALFTIME',
          subtitle: `${state.playerState.score} - ${state.opponentState.score}`,
          dismissable: true,
        },
      });
      return;
    }

    const nextQuarter = (currentQuarter as number) + 1 as 1 | 2 | 3 | 4;
    set({
      clock: { quarter: nextQuarter, minutes: state.quarterMinutes, seconds: 0, isRunning: false },
      phase: 'END_QUARTER',
      transitionScreen: {
        type: 'QUARTER_END',
        title: `END OF Q${currentQuarter}`,
        subtitle: `${state.playerState.score} - ${state.opponentState.score}`,
        dismissable: true,
      },
    });
  },

  // =========================================================================
  // CLOCK MANAGEMENT
  // =========================================================================

  tickClock: (seconds) => {
    const state = get();
    let { minutes, seconds: secs } = state.clock;

    secs -= seconds;
    while (secs < 0) {
      minutes -= 1;
      secs += 60;
    }

    if (minutes < 0) {
      get().advanceQuarter();
      return;
    }

    // Check for two-minute warning
    const isSecondOrFourth = state.clock.quarter === 2 || state.clock.quarter === 4;
    const crossedTwoMinutes = state.clock.minutes > QUARTER_CONFIG.TWO_MINUTE_WARNING &&
                              minutes <= QUARTER_CONFIG.TWO_MINUTE_WARNING;

    if (isSecondOrFourth && crossedTwoMinutes) {
      set({
        clock: { ...state.clock, minutes, seconds: secs, isRunning: false },
        phase: 'TWO_MINUTE_WARNING',
        transitionScreen: {
          type: 'QUARTER_END',
          title: 'TWO MINUTE WARNING',
          dismissable: true,
        },
      });
      return;
    }

    set({
      clock: { ...state.clock, minutes, seconds: secs },
    });
  },

  stopClock: () => set((state) => ({ clock: { ...state.clock, isRunning: false } })),

  startClock: () => set((state) => ({ clock: { ...state.clock, isRunning: true } })),

  // =========================================================================
  // POSSESSION MANAGEMENT
  // =========================================================================

  switchPossession: (reason) => {
    const state = get();
    const newPossession: Possession = state.possessionState.possession === 'player' ? 'opponent' : 'player';

    const kickoffNeeded = ['TOUCHDOWN', 'FIELD_GOAL', 'SAFETY'].includes(reason);
    const xpNeeded = reason === 'TOUCHDOWN';

    // Calculate new field position
    let newYardLine = 25;
    if (reason === 'INTERCEPTION' || reason === 'FUMBLE' || reason === 'TURNOVER_ON_DOWNS') {
      newYardLine = 100 - state.fieldPosition.yardLine;
    } else if (reason === 'SAFETY') {
      newYardLine = 20;
    }

    // End current drive
    if (!state.currentDrive.result) {
      get().endDrive(reason as DriveResult);
    }

    set({
      possessionState: {
        possession: newPossession,
        kickoffPending: kickoffNeeded,
        xpPending: xpNeeded,
        twoPointPending: false,
        lastChangeReason: reason,
        receivingNextHalf: state.possessionState.receivingNextHalf,
      },
      transitionScreen: {
        type: xpNeeded ? 'XP_CHOICE' : 'POSSESSION_CHANGE',
        title: newPossession === 'player' ? 'YOUR BALL' : 'THEIR BALL',
        subtitle: newPossession === 'player' ? 'OFFENSE' : 'DEFENSE',
        showXPChoice: xpNeeded,
        dismissable: !xpNeeded,
      },
    });

    if (!kickoffNeeded && !xpNeeded) {
      get().startDrive(newYardLine);
    }
  },

  handleKickoff: (type) => {
    const state = get();
    let startYard = 25;

    if (type === 'ONSIDE') {
      const recovered = Math.random() < 0.10;
      if (recovered) {
        startYard = 45;
        // Kicking team recovers - don't switch possession
        get().applyMomentumEvent('TURNOVER_GAINED', state.possessionState.possession !== 'player');
      } else {
        startYard = 45;
      }
    } else if (type === 'SQUIB') {
      startYard = 35;
    }

    set({
      possessionState: { ...state.possessionState, kickoffPending: false },
      phase: get().isPlayerOnOffense() ? 'OFFENSE_SELECT' : 'DEFENSE_SELECT',
    });

    get().startDrive(startYard);
  },

  handleExtraPoint: (type) => {
    const state = get();
    // Scoring team is opposite of current possession (they just scored, other team receives)
    const scoringTeam: Possession = state.possessionState.possession === 'player' ? 'opponent' : 'player';

    if (type === 'XP') {
      if (Math.random() < 0.95) {
        get().addScore(scoringTeam, 1);
      }
    } else {
      if (Math.random() < 0.50) {
        get().addScore(scoringTeam, 2);
      }
    }

    set({
      possessionState: {
        ...state.possessionState,
        xpPending: false,
        twoPointPending: false,
        kickoffPending: true,
      },
      phase: 'KICKOFF',
      transitionScreen: {
        type: 'SCORE_UPDATE',
        title: 'SCORE UPDATE',
        subtitle: `${get().playerState.score} - ${get().opponentState.score}`,
        dismissable: true,
      },
    });
  },

  // =========================================================================
  // DRIVE MANAGEMENT
  // =========================================================================

  startDrive: (yardLine) => {
    const state = get();
    const newDriveNumber = state.driveNumber + 1;

    // Log previous drive if it had plays
    if (state.currentDrive.plays.length > 0 && state.currentDrive.result) {
      const driveLogEntry: DriveLog = {
        driveNumber: state.driveNumber,
        startQuarter: state.currentDrive.startingTime.quarter as number | 'OT',
        startTime: `${state.currentDrive.startingTime.minutes}:${String(state.currentDrive.startingTime.seconds).padStart(2, '0')}`,
        startYardLine: state.currentDrive.startingYardLine,
        possession: state.possessionState.possession === 'player' ? 'opponent' : 'player',
        plays: [],
        result: state.currentDrive.result,
        yardsGained: state.currentDrive.yardsGained,
        timeElapsed: 0,
      };

      set((s) => ({ driveLog: [...s.driveLog, driveLogEntry] }));
    }

    set({
      currentDrive: createInitialDrive(yardLine, state.clock.quarter, state.clock.minutes, state.clock.seconds),
      driveNumber: newDriveNumber,
      fieldPosition: createInitialFieldPosition(yardLine),
      phase: get().isPlayerOnOffense() ? 'OFFENSE_SELECT' : 'DEFENSE_SELECT',
    });
  },

  endDrive: (result) => {
    set((state) => ({
      currentDrive: { ...state.currentDrive, result },
    }));
  },

  // =========================================================================
  // PLAY EXECUTION
  // =========================================================================

  selectOffensiveCard: (card, dirtyCard) => {
    set((state) => ({
      playSelection: {
        ...state.playSelection,
        offenseCard: card,
        dirtyCard: dirtyCard || state.playSelection.dirtyCard,
        dirtyCardSide: dirtyCard ? 'OFFENSE' : state.playSelection.dirtyCardSide,
        phase: state.playSelection.defenseCard ? 'BOTH_SELECTED' : 'OFFENSE_SELECTING',
      },
    }));
  },

  selectDefensiveCard: (card, prediction, dirtyCard) => {
    set((state) => ({
      playSelection: {
        ...state.playSelection,
        defenseCard: card,
        defensePrediction: prediction || null,
        dirtyCard: dirtyCard || state.playSelection.dirtyCard,
        dirtyCardSide: dirtyCard ? 'DEFENSE' : state.playSelection.dirtyCardSide,
        phase: state.playSelection.offenseCard ? 'BOTH_SELECTED' : 'DEFENSE_SELECTING',
      },
    }));
  },

  executePlay: () => {
    const state = get();
    const context = get().getCurrentContext();
    const { offenseCard: rawOffenseCard, defenseCard: rawDefenseCard } = state.playSelection;

    if (!context || !rawOffenseCard || !rawDefenseCard) return null;

    // Cast cards to proper types
    const offenseCard = rawOffenseCard as OffensiveCard;
    const defenseCard = rawDefenseCard as DefensiveCard;

    // Execute play
    const result = resolveOffensivePlay(offenseCard, defenseCard, context);

    const isPlayerOffense = get().isPlayerOnOffense();
    const isThirdDown = state.fieldPosition.down === 3;

    // Update field position
    get().updateFieldPosition(result.yardsGained);

    // Update tendencies
    if (isPlayerOffense) {
      get().updatePlayerTendencies(offenseCard.playType, false);
    } else {
      get().updateOpponentTendencies(offenseCard.playType, false);
    }

    // Apply momentum changes
    if (result.touchdown) {
      get().applyMomentumEvent('TOUCHDOWN', isPlayerOffense);
    } else if (result.bigPlay) {
      get().applyMomentumEvent('BIG_PLAY', isPlayerOffense);
    } else if (result.turnover) {
      get().applyMomentumEvent('TURNOVER_LOST', isPlayerOffense);
      get().applyMomentumEvent('TURNOVER_GAINED', !isPlayerOffense);
    } else if (result.sack) {
      get().applyMomentumEvent('SACK_TAKEN', isPlayerOffense);
      get().applyMomentumEvent('SACK', !isPlayerOffense);
    } else if (result.yardsGained >= state.fieldPosition.yardsToGo) {
      get().applyMomentumEvent('FIRST_DOWN', isPlayerOffense);
    } else if (isThirdDown && result.yardsGained < state.fieldPosition.yardsToGo) {
      get().applyMomentumEvent('THIRD_DOWN_STOP', !isPlayerOffense);
    }

    // Update stats
    const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(offenseCard.playType);
    const teamKey = isPlayerOffense ? 'playerState' : 'opponentState';
    const currentTeam = state[teamKey];

    set({
      [teamKey]: {
        ...currentTeam,
        stats: {
          ...currentTeam.stats,
          totalYards: currentTeam.stats.totalYards + result.yardsGained,
          passingYards: currentTeam.stats.passingYards + (isPass ? result.yardsGained : 0),
          rushingYards: currentTeam.stats.rushingYards + (!isPass ? result.yardsGained : 0),
          turnovers: currentTeam.stats.turnovers + (result.turnover ? 1 : 0),
          sacks: isPlayerOffense ? currentTeam.stats.sacks : currentTeam.stats.sacks + (result.sack ? 1 : 0),
        },
      },
    });

    // Log play
    get().logPlay({
      quarter: state.clock.quarter,
      timeRemaining: `${state.clock.minutes}:${String(state.clock.seconds).padStart(2, '0')}`,
      down: state.fieldPosition.down,
      yardsToGo: state.fieldPosition.yardsToGo,
      yardLine: state.fieldPosition.yardLine,
      possession: state.possessionState.possession,
      description: result.playByPlay,
      yardsGained: result.yardsGained,
      result: result.touchdown ? 'score' : result.turnover ? 'turnover' : result.success ? 'success' : 'failure',
      offenseCard: offenseCard.name,
      defenseCard: defenseCard.name,
    });

    // Update drive
    set((s) => ({
      currentDrive: {
        ...s.currentDrive,
        yardsGained: s.currentDrive.yardsGained + result.yardsGained,
        plays: [...s.currentDrive.plays, {} as never],
      },
    }));

    // Handle special results
    if (result.touchdown) {
      get().addScore(isPlayerOffense ? 'player' : 'opponent', 6);
      get().switchPossession('TOUCHDOWN');
    } else if (result.turnover) {
      const turnoverType = result.turnoverType === 'INTERCEPTION' ? 'INTERCEPTION' : 'FUMBLE';
      get().switchPossession(turnoverType);
    } else if (result.safety) {
      get().addScore(isPlayerOffense ? 'opponent' : 'player', 2);
      get().switchPossession('SAFETY');
    }

    // Reset selection
    set({
      playSelection: createInitialPlaySelection(),
      phase: 'PLAY_RESULT',
    });

    // Tick clock
    get().tickClock(result.success ? 25 : 8);

    // Move cards to discard
    get().playCard(offenseCard.id, isPlayerOffense);
    get().playCard(defenseCard.id, !isPlayerOffense);

    return result;
  },

  executeFourthDown: (offenseChoice, defenseChoice) => {
    const state = get();
    const context = get().getCurrentContext();

    if (!context) return null;

    // ST ratings (would come from roster)
    const stRatings: STRatings = { kickPower: 75, kickAccuracy: 75, clutchKicking: 70, coverageUnit: 70 };
    const returnerRatings: ReturnerRatings = { speed: 80, agility: 75, carrying: 70 };

    const result = resolveFourthDown(offenseChoice, defenseChoice, context, stRatings, returnerRatings);

    const isPlayerOffense = get().isPlayerOnOffense();

    if (result.success) {
      if (offenseChoice === 'FIELD_GOAL') {
        get().addScore(isPlayerOffense ? 'player' : 'opponent', 3);
        get().applyMomentumEvent('FIELD_GOAL', isPlayerOffense);
        get().switchPossession('FIELD_GOAL');
      } else if (offenseChoice === 'PUNT') {
        get().switchPossession('PUNT');
        get().setFieldPosition(100 - result.newFieldPosition, 1, 10);
      }
    } else {
      get().applyMomentumEvent('FAILED_FOURTH', isPlayerOffense);
      get().switchPossession('TURNOVER_ON_DOWNS');
    }

    get().logPlay({
      quarter: state.clock.quarter,
      timeRemaining: `${state.clock.minutes}:${String(state.clock.seconds).padStart(2, '0')}`,
      down: 4,
      yardsToGo: state.fieldPosition.yardsToGo,
      yardLine: state.fieldPosition.yardLine,
      possession: state.possessionState.possession,
      description: result.playByPlay,
      yardsGained: result.yardsGained || 0,
      result: result.success ? 'success' : result.touchdown ? 'score' : 'failure',
    });

    set({ fourthDownState: null, phase: 'PLAY_RESULT' });

    return result;
  },

  // =========================================================================
  // FIELD POSITION
  // =========================================================================

  updateFieldPosition: (yardsGained) => {
    const state = get();
    let { yardLine, down, yardsToGo } = state.fieldPosition;

    yardLine += yardsGained;
    yardsToGo -= yardsGained;

    // Check touchdown
    if (yardLine >= 100) return;

    // Check safety
    if (yardLine <= 0) return;

    // Check first down
    const gotFirstDown = yardsToGo <= 0;
    if (gotFirstDown) {
      down = 1;
      yardsToGo = 10;
    } else {
      down = Math.min(4, down + 1) as Down;
    }

    // Check turnover on downs
    if (down > 4) {
      get().switchPossession('TURNOVER_ON_DOWNS');
      return;
    }

    const yardsToEndzone = 100 - yardLine;

    set({
      fieldPosition: {
        yardLine,
        down,
        yardsToGo: Math.min(yardsToGo, yardsToEndzone),
        yardsToEndzone,
        inRedZone: yardsToEndzone <= 20,
        inGoalToGo: yardsToGo >= yardsToEndzone,
        backedUp: yardLine <= 10,
      },
      phase: down === 4 ? 'FOURTH_DOWN_DECISION' :
             get().isPlayerOnOffense() ? 'OFFENSE_SELECT' : 'DEFENSE_SELECT',
    });
  },

  setFieldPosition: (yardLine, down, yardsToGo) => {
    const yardsToEndzone = 100 - yardLine;
    set({
      fieldPosition: {
        yardLine,
        down,
        yardsToGo: Math.min(yardsToGo, yardsToEndzone),
        yardsToEndzone,
        inRedZone: yardsToEndzone <= 20,
        inGoalToGo: yardsToGo >= yardsToEndzone,
        backedUp: yardLine <= 10,
      },
    });
  },

  // =========================================================================
  // SCORING
  // =========================================================================

  addScore: (team, points) => {
    if (team === 'player') {
      set((state) => ({ playerState: { ...state.playerState, score: state.playerState.score + points } }));
    } else {
      set((state) => ({ opponentState: { ...state.opponentState, score: state.opponentState.score + points } }));
    }
  },

  // =========================================================================
  // MOMENTUM SYSTEM (0-6 scale)
  // =========================================================================

  recoverOffensiveMomentum: (amount) => {
    set((state) => ({
      offensiveMomentum: Math.min(MOMENTUM_CONFIG.MAX, state.offensiveMomentum + amount),
    }));
  },

  depleteOffensiveMomentum: (amount) => {
    set((state) => ({
      offensiveMomentum: Math.max(MOMENTUM_CONFIG.MIN, state.offensiveMomentum - amount),
    }));
  },

  recoverDefensiveMomentum: (amount) => {
    set((state) => ({
      defensiveMomentum: Math.min(MOMENTUM_CONFIG.MAX, state.defensiveMomentum + amount),
    }));
  },

  depleteDefensiveMomentum: (amount) => {
    set((state) => ({
      defensiveMomentum: Math.max(MOMENTUM_CONFIG.MIN, state.defensiveMomentum - amount),
    }));
  },

  applyMomentumEvent: (event, forPlayer) => {
    const amount = MOMENTUM_RULES[event];
    const isPositive = ['FIRST_DOWN', 'TOUCHDOWN', 'FIELD_GOAL', 'TURNOVER_GAINED', 'SACK', 'BIG_PLAY', 'THIRD_DOWN_STOP'].includes(event);

    if (isPositive) {
      if (forPlayer) {
        get().recoverOffensiveMomentum(amount);
      } else {
        get().recoverDefensiveMomentum(amount);
      }
    } else {
      if (forPlayer) {
        get().depleteOffensiveMomentum(amount);
      } else {
        get().depleteDefensiveMomentum(amount);
      }
    }
  },

  // =========================================================================
  // HAND MANAGEMENT
  // =========================================================================

  drawCard: (type, forPlayer = true) => {
    const state = get();
    const deckKey = forPlayer ? 'playerDeck' : 'opponentDeck';
    const deckState = state[deckKey];

    if (!deckState) return null;

    let drawnCard: Card | null = null;
    const newDrawPile = { ...deckState.drawPile };
    const newHand = { ...deckState.hand };

    if (type === 'OFFENSIVE' && newDrawPile.offensiveCards.length > 0) {
      if (newHand.offensiveCards.length >= HAND_LIMITS.MAX_OFFENSIVE) return null;
      drawnCard = newDrawPile.offensiveCards[0];
      newDrawPile.offensiveCards = newDrawPile.offensiveCards.slice(1);
      newHand.offensiveCards = [...newHand.offensiveCards, drawnCard as OffensiveCard];
    } else if (type === 'DEFENSIVE' && newDrawPile.defensiveCards.length > 0) {
      if (newHand.defensiveCards.length >= HAND_LIMITS.MAX_DEFENSIVE) return null;
      drawnCard = newDrawPile.defensiveCards[0];
      newDrawPile.defensiveCards = newDrawPile.defensiveCards.slice(1);
      newHand.defensiveCards = [...newHand.defensiveCards, drawnCard as DefensiveCard];
    } else if (type === 'DIRTY' && newDrawPile.dirtyCards.length > 0) {
      if (newHand.dirtyCards.length >= HAND_LIMITS.MAX_DIRTY) return null;
      drawnCard = newDrawPile.dirtyCards[0];
      newDrawPile.dirtyCards = newDrawPile.dirtyCards.slice(1);
      newHand.dirtyCards = [...newHand.dirtyCards, drawnCard as DirtyCard];
    }

    if (drawnCard) {
      set({
        [deckKey]: {
          ...deckState,
          drawPile: newDrawPile,
          hand: newHand,
          totalDraws: deckState.totalDraws + 1,
        },
      });
    }

    return drawnCard;
  },

  playCard: (cardId, forPlayer = true) => {
    const state = get();
    const deckKey = forPlayer ? 'playerDeck' : 'opponentDeck';
    const deckState = state[deckKey];

    if (!deckState) return;

    let playedCard: Card | null = null;
    const newHand = { ...deckState.hand };

    // Find and remove from offensive cards
    const offIdx = newHand.offensiveCards.findIndex(c => c.id === cardId);
    if (offIdx >= 0) {
      playedCard = newHand.offensiveCards[offIdx];
      newHand.offensiveCards = newHand.offensiveCards.filter((_, i) => i !== offIdx);
    }

    // Find and remove from defensive cards
    const defIdx = newHand.defensiveCards.findIndex(c => c.id === cardId);
    if (defIdx >= 0) {
      playedCard = newHand.defensiveCards[defIdx];
      newHand.defensiveCards = newHand.defensiveCards.filter((_, i) => i !== defIdx);
    }

    // Find and remove from dirty cards
    const dirtyIdx = newHand.dirtyCards.findIndex(c => c.id === cardId);
    if (dirtyIdx >= 0) {
      playedCard = newHand.dirtyCards[dirtyIdx];
      newHand.dirtyCards = newHand.dirtyCards.filter((_, i) => i !== dirtyIdx);
    }

    if (playedCard) {
      set({
        [deckKey]: {
          ...deckState,
          hand: newHand,
          discardPile: {
            ...deckState.discardPile,
            cards: [...deckState.discardPile.cards, playedCard],
            cardsPlayedThisGame: deckState.discardPile.cardsPlayedThisGame + 1,
          },
          totalPlays: deckState.totalPlays + 1,
        },
      });
    }
  },

  discardCard: (cardId, forPlayer = true) => {
    const state = get();
    const deckKey = forPlayer ? 'playerDeck' : 'opponentDeck';
    const deckState = state[deckKey];

    if (!deckState) return;

    let discardedCard: Card | null = null;
    const newHand = { ...deckState.hand };

    const offIdx = newHand.offensiveCards.findIndex(c => c.id === cardId);
    if (offIdx >= 0) {
      discardedCard = newHand.offensiveCards[offIdx];
      newHand.offensiveCards = newHand.offensiveCards.filter((_, i) => i !== offIdx);
    }

    const defIdx = newHand.defensiveCards.findIndex(c => c.id === cardId);
    if (defIdx >= 0) {
      discardedCard = newHand.defensiveCards[defIdx];
      newHand.defensiveCards = newHand.defensiveCards.filter((_, i) => i !== defIdx);
    }

    if (discardedCard) {
      set({
        [deckKey]: {
          ...deckState,
          hand: newHand,
          discardPile: {
            ...deckState.discardPile,
            cards: [...deckState.discardPile.cards, discardedCard],
            cardsDiscardedThisGame: deckState.discardPile.cardsDiscardedThisGame + 1,
          },
          totalDiscards: deckState.totalDiscards + 1,
        },
      });
    }
  },

  drawStartingHands: () => {
    // Draw for both player and opponent
    for (let i = 0; i < HAND_LIMITS.STARTING_OFFENSIVE; i++) {
      get().drawCard('OFFENSIVE', true);
      get().drawCard('OFFENSIVE', false);
    }
    for (let i = 0; i < HAND_LIMITS.STARTING_DEFENSIVE; i++) {
      get().drawCard('DEFENSIVE', true);
      get().drawCard('DEFENSIVE', false);
    }
  },

  // =========================================================================
  // TENDENCIES
  // =========================================================================

  updatePlayerTendencies: (playType, wasPredicted) => {
    set((state) => ({
      playerTendencies: updateTendencies(state.playerTendencies, playType, wasPredicted),
    }));
  },

  updateOpponentTendencies: (playType, wasPredicted) => {
    set((state) => ({
      opponentTendencies: updateTendencies(state.opponentTendencies, playType, wasPredicted),
    }));
  },

  // =========================================================================
  // FOURTH DOWN
  // =========================================================================

  initiateFourthDown: () => {
    const state = get();
    const fgDistance = state.fieldPosition.yardsToEndzone + 17;

    set({
      phase: 'FOURTH_DOWN_DECISION',
      fourthDownState: {
        phase: 'AWAITING_OFFENSE' as FourthDownPhase,
        offenseCategory: null,
        offenseIsFaking: false,
        defenseResponse: null,
        defenseExpectsFake: false,
        fieldGoalDistance: fgDistance,
        fieldGoalSuccessChance: Math.max(0, 100 - (fgDistance - 20) * 2),
        puntExpectedYards: 45,
        conversionChance: Math.max(20, 70 - state.fieldPosition.yardsToGo * 8),
        fakeSuccessBase: 30,
        fakeBonus: 0,
        fakePenalty: 0,
      },
    });
  },

  setFourthDownOffenseChoice: (choice, isFaking = false) => {
    set((state) => ({
      fourthDownState: state.fourthDownState ? {
        ...state.fourthDownState,
        offenseCategory: choice,
        offenseIsFaking: isFaking,
        phase: 'AWAITING_DEFENSE' as FourthDownPhase,
      } : null,
    }));
  },

  setFourthDownDefenseResponse: (response) => {
    set((state) => ({
      fourthDownState: state.fourthDownState ? {
        ...state.fourthDownState,
        defenseResponse: response,
        defenseExpectsFake: response === 'EXPECT_FAKE',
        phase: 'RESOLVED' as FourthDownPhase,
      } : null,
    }));
  },

  // =========================================================================
  // UI
  // =========================================================================

  showTransition: (screen) => set({ transitionScreen: screen }),

  dismissTransition: () => {
    const state = get();

    if (state.possessionState.xpPending) return;

    set({ transitionScreen: null });

    if (state.possessionState.kickoffPending) {
      set({ phase: 'KICKOFF' });
    } else if (['PLAY_RESULT', 'END_QUARTER'].includes(state.phase)) {
      set({ phase: get().isPlayerOnOffense() ? 'OFFENSE_SELECT' : 'DEFENSE_SELECT' });
    }
  },

  pauseGame: () => {
    set({ isPaused: true });
    get().stopClock();
  },

  resumeGame: () => set({ isPaused: false }),

  // =========================================================================
  // HISTORY
  // =========================================================================

  logPlay: (entry) => {
    set((state) => ({
      playLog: [...state.playLog, { ...entry, playNumber: state.playNumber + 1 }],
      playNumber: state.playNumber + 1,
    }));
  },

  // =========================================================================
  // SELECTORS
  // =========================================================================

  isRedZone: () => get().fieldPosition.inRedZone,
  isGoalToGo: () => get().fieldPosition.inGoalToGo,
  isTwoMinuteWarning: () => {
    const { clock } = get();
    return (clock.quarter === 2 || clock.quarter === 4) && clock.minutes <= 2;
  },
  isPlayerOnOffense: () => get().possessionState.possession === 'player',
  getScoreDifferential: () => get().playerState.score - get().opponentState.score,
  getPlayerHand: () => get().playerDeck?.hand || null,
  getAvailableOffensiveCards: () => get().playerDeck?.hand.offensiveCards || [],
  getAvailableDefensiveCards: () => get().playerDeck?.hand.defensiveCards || [],

  getCurrentContext: (): PlayContext | null => {
    const state = get();
    if (!state.playerRoster || !state.opponentRoster) return null;

    const isPlayerOffense = get().isPlayerOnOffense();

    return {
      offenseRoster: isPlayerOffense ? state.playerRoster : state.opponentRoster,
      defenseRoster: isPlayerOffense ? state.opponentRoster : state.playerRoster,
      fieldPosition: state.fieldPosition,
      momentum: state.momentumTracker,
      offenseTendencies: isPlayerOffense ? state.playerTendencies : state.opponentTendencies,
      defenseTendencies: isPlayerOffense ? state.opponentTendencies : state.playerTendencies,
      clock: state.clock,
      weather: state.weather,
      offenseFatigue: isPlayerOffense ? state.playerState.fatigue : state.opponentState.fatigue,
      defenseFatigue: isPlayerOffense ? state.opponentState.fatigue : state.playerState.fatigue,
      scoreDifferential: isPlayerOffense ? get().getScoreDifferential() : -get().getScoreDifferential(),
    };
  },
}));

// =============================================================================
// HELPERS
// =============================================================================

function createGameDeckState(deck: Deck): GameDeckState {
  const shuffledOffensive = shuffleArray([...deck.offensiveCards]);
  const shuffledDefensive = shuffleArray([...deck.defensiveCards]);
  const shuffledDirty = shuffleArray([...deck.dirtyCards]);

  return {
    drawPile: {
      offensiveCards: shuffledOffensive,
      defensiveCards: shuffledDefensive,
      dirtyCards: shuffledDirty,
      isShuffled: true,
      lastShuffled: Date.now(),
    },
    hand: {
      offensiveCards: [],
      defensiveCards: [],
      dirtyCards: [],
      maxOffensiveCards: HAND_LIMITS.MAX_OFFENSIVE,
      maxDefensiveCards: HAND_LIMITS.MAX_DEFENSIVE,
      maxDirtyCards: HAND_LIMITS.MAX_DIRTY,
      canDrawOffensive: true,
      canDrawDefensive: true,
      cardsDrawnThisHalf: 0,
    },
    discardPile: {
      cards: [],
      cardsDiscardedThisGame: 0,
      cardsPlayedThisGame: 0,
    },
    burnedCards: [],
    totalDraws: 0,
    totalPlays: 0,
    totalDiscards: 0,
    isExhausted: false,
    mustReshuffle: false,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { CardGameActions };
