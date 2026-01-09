// src/stores/simpleCardGameStore.ts
// Simplified card game store for immediate gameplay

import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

export interface Card {
  id: string;
  name: string;
  type: 'pass' | 'run' | 'dirty' | 'special';
  cost: number;
  playerId?: string;
  target?: string;
  successRate: number;
  yardRange: { min: number; max: number };
  breakawayChance: number;
  intRisk?: number;
  fumbleRisk?: number;
  counters?: string[];
  synergyType?: string;
}

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
  clock: number; // seconds remaining in quarter
  down: number;
  distance: number;
  fieldPosition: number; // yards from own end zone
  possession: 'player' | 'opponent';
  playerTimeouts: number;
  opponentTimeouts: number;
  isGameOver: boolean;
  clockMode: 'normal' | 'hurryUp' | 'chewClock';
}

export interface Momentum {
  offense: number;
  defense: number;
  max: number;
}

export interface Tendencies {
  runRate: number;
  passRate: number;
  favoredTarget: string;
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
}

interface SimpleCardGameState {
  // Game state
  gameState: GameState;

  // Decks
  offenseDeck: Card[];
  defenseDeck: Card[];
  hand: Card[];
  discardPile: Card[];

  // Momentum
  momentum: Momentum;

  // Tendencies
  tendencies: Tendencies;
  activeBonuses: Array<{ name: string; value: number }>;

  // Defense intel
  defenseIntel: {
    coordinator: string;
    personality: string;
    showing: string;
  } | null;

  // Selections
  selectedCard: Card | null;
  selectedCoverage: DefenseCard | null;
  selectedAdjustment: DefenseCard | null;

  // Derived
  isPlayerOnOffense: boolean;

  // Actions
  initializeGame: (roster: any, deck: Card[]) => void;
  selectCard: (card: Card) => void;
  selectCoverage: (coverage: DefenseCard) => void;
  selectAdjustment: (adjustment: DefenseCard | null) => void;
  snapBall: (card: Card) => Promise<PlayResult>;
  setDefense: (coverage: DefenseCard, adjustment: DefenseCard | null) => Promise<PlayResult>;
  drawCards: (count: number) => void;
  useTimeout: (team: 'player' | 'opponent') => void;
  canAffordCard: (card: Card) => boolean;
  advanceGame: (result: PlayResult) => void;
}

// ============================================
// ZERO-COST SAFETY CARDS
// ============================================

const ZERO_COST_CARDS: Card[] = [
  {
    id: 'checkdown',
    name: 'Checkdown',
    type: 'pass',
    cost: 0,
    successRate: 65,
    yardRange: { min: 2, max: 5 },
    breakawayChance: 3,
    intRisk: 2,
  },
  {
    id: 'qb-sneak',
    name: 'QB Sneak',
    type: 'run',
    cost: 0,
    successRate: 75,
    yardRange: { min: 0, max: 2 },
    breakawayChance: 1,
    fumbleRisk: 2,
  },
];

// ============================================
// INITIAL STATE
// ============================================

const initialGameState: GameState = {
  playerScore: 0,
  opponentScore: 0,
  quarter: 1,
  clock: 360, // 6:00 per quarter
  down: 1,
  distance: 10,
  fieldPosition: 25, // Own 25
  possession: 'player',
  playerTimeouts: 3,
  opponentTimeouts: 3,
  isGameOver: false,
  clockMode: 'normal',
};

const initialMomentum: Momentum = {
  offense: 4,
  defense: 4,
  max: 6,
};

const initialTendencies: Tendencies = {
  runRate: 0.5,
  passRate: 0.5,
  favoredTarget: 'WR1',
  recentPlays: [],
  opponentRunRate: 0.5,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateClockUsed(result: PlayResult, clockMode: string): number {
  let base = 30; // Base seconds

  if (result.success && !result.touchdown) {
    base = result.yards > 10 ? 35 : 30;
  } else if (!result.success) {
    base = 8; // Incomplete = clock stops
  }

  if (result.sack) base = 40;
  if (result.touchdown) base = 0; // Clock stops
  if (result.turnover) base = 15;

  // Clock mode modifiers
  if (clockMode === 'hurryUp') base = Math.max(8, base - 15);
  if (clockMode === 'chewClock') base += 15;

  return base;
}

function resolveOffensivePlay(
  card: Card,
  gameState: GameState,
  tendencies: Tendencies
): PlayResult {
  const baseSuccess = card.successRate / 100;

  // Tendency adjustments
  let successMod = 0;
  if (card.type === 'run' && tendencies.runRate > 0.6) {
    successMod = -0.1; // Defense expecting run
  } else if (card.type === 'pass' && tendencies.runRate < 0.4) {
    successMod = -0.1; // Defense expecting pass
  } else if (card.type === 'pass' && tendencies.runRate > 0.55) {
    successMod = 0.15; // Play action bonus!
  }

  const finalSuccess = Math.min(0.95, Math.max(0.05, baseSuccess + successMod));
  const roll = Math.random();
  const success = roll < finalSuccess;

  let yards = 0;
  let touchdown = false;
  let firstDown = false;
  let turnover = false;
  let interception = false;
  let fumble = false;
  let sack = false;
  let breakaway = false;

  if (success) {
    // Calculate yards
    const range = card.yardRange.max - card.yardRange.min;
    yards = card.yardRange.min + Math.floor(Math.random() * range);

    // Breakaway check
    if (Math.random() * 100 < card.breakawayChance) {
      breakaway = true;
      yards = Math.min(yards + 20 + Math.floor(Math.random() * 30), 100 - gameState.fieldPosition);
    }

    // Check for touchdown
    if (gameState.fieldPosition + yards >= 100) {
      touchdown = true;
      yards = 100 - gameState.fieldPosition;
    }

    // Check for first down
    if (yards >= gameState.distance) {
      firstDown = true;
    }
  } else {
    // Failed play
    if (card.type === 'pass') {
      // Check for INT
      const intChance = (card.intRisk || 3) / 100;
      if (Math.random() < intChance) {
        interception = true;
        turnover = true;
        yards = 0;
      }
      // Otherwise incomplete
    } else {
      // Run stuffed
      yards = Math.floor(Math.random() * 3) - 1; // -1 to 2 yards
    }

    // Sack check (pass plays only)
    if (card.type === 'pass' && !interception && Math.random() < 0.15) {
      sack = true;
      yards = -(Math.floor(Math.random() * 8) + 3); // -3 to -10
    }
  }

  // Fumble check
  if (!turnover && Math.random() < (card.fumbleRisk || 2) / 100) {
    fumble = true;
    turnover = Math.random() < 0.5; // 50% recovery
  }

  // Calculate momentum change
  let momentumChange = 0;
  if (touchdown) momentumChange = 2;
  else if (turnover) momentumChange = -3;
  else if (firstDown) momentumChange = 1;
  else if (sack) momentumChange = -1;
  else if (breakaway) momentumChange = 1;

  // Build description - runs NEVER say "incomplete"!
  let description = '';
  if (touchdown) {
    description = `TOUCHDOWN! ${card.name} for ${yards} yards!`;
  } else if (interception) {
    description = `INTERCEPTED! ${card.name} picked off!`;
  } else if (fumble && turnover) {
    description = `FUMBLE LOST on ${card.name}!`;
  } else if (sack) {
    description = `SACKED for ${Math.abs(yards)} yard loss!`;
  } else if (card.type === 'pass') {
    // Pass plays
    if (success) {
      const extra = breakaway ? ' BREAKAWAY!' : '';
      description = `${card.name} - ${yards} yard gain${extra}`;
    } else if (yards === 0) {
      description = `${card.name} - Incomplete`;
    } else {
      description = `${card.name} - Incomplete`;
    }
  } else {
    // Run plays - NEVER say "incomplete"
    if (success) {
      const extra = breakaway ? ' BREAKAWAY!' : '';
      description = `${card.name} - ${yards} yard gain${extra}`;
    } else if (yards < 0) {
      description = `${card.name} - Stuffed for ${Math.abs(yards)} yard loss`;
    } else if (yards === 0) {
      description = `${card.name} - Stuffed for no gain`;
    } else {
      description = `${card.name} - Limited to ${yards} yard${yards !== 1 ? 's' : ''}`;
    }
  }

  return {
    success,
    yards,
    touchdown,
    firstDown,
    turnover,
    interception,
    fumble,
    sack,
    breakaway,
    clockUsed: calculateClockUsed({ success, yards, touchdown, turnover, sack } as PlayResult, gameState.clockMode),
    momentumChange,
    description,
  };
}

function resolveDefensivePlay(
  coverage: DefenseCard,
  adjustment: DefenseCard | null,
  gameState: GameState,
  tendencies: Tendencies
): PlayResult {
  // AI picks a play
  const aiPlayType = Math.random() < tendencies.opponentRunRate ? 'run' : 'pass';

  // Calculate defense effectiveness
  let defenseRating = aiPlayType === 'run' ? coverage.vsRun : coverage.vsPass;
  if (adjustment) {
    defenseRating += aiPlayType === 'run' ? adjustment.vsRun : adjustment.vsPass;
  }

  // AI success rate (inverse of defense rating)
  const aiSuccessRate = (100 - defenseRating) / 100;
  const roll = Math.random();
  const aiSuccess = roll < aiSuccessRate;

  let yards = 0;
  let touchdown = false;
  let firstDown = false;
  let turnover = false;
  let interception = false;
  let sack = false;

  if (aiSuccess) {
    // AI gains yards
    if (aiPlayType === 'run') {
      yards = Math.floor(Math.random() * 8) + 2; // 2-10 yards
    } else {
      yards = Math.floor(Math.random() * 15) + 5; // 5-20 yards
    }

    // TD check
    if (gameState.fieldPosition - yards <= 0) {
      touchdown = true;
      yards = gameState.fieldPosition;
    }

    if (yards >= gameState.distance) {
      firstDown = true;
    }
  } else {
    // Defense wins
    if (aiPlayType === 'pass') {
      // Incomplete or INT
      if (Math.random() < 0.1) {
        interception = true;
        turnover = true;
      }
      // Sack check if blitzing
      if (adjustment?.id === 'blitz' && Math.random() < 0.25) {
        sack = true;
        yards = -(Math.floor(Math.random() * 8) + 3);
      }
    } else {
      // Stuffed run
      yards = Math.floor(Math.random() * 2); // 0-1 yards
    }
  }

  // Momentum change (from defensive perspective)
  let momentumChange = 0;
  if (turnover) momentumChange = 2;
  else if (sack) momentumChange = 1;
  else if (!firstDown && !touchdown) momentumChange = 0;
  else if (touchdown) momentumChange = -2;

  let description = '';
  if (interception) description = 'INTERCEPTION! Turnover!';
  else if (sack) description = `SACK! ${Math.abs(yards)} yard loss!`;
  else if (touchdown) description = 'Opponent TOUCHDOWN...';
  else if (firstDown) description = `Opponent gains ${yards} for first down`;
  else description = `Opponent held to ${yards} yards`;

  return {
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
}

// ============================================
// STORE
// ============================================

export const useSimpleCardGameStore = create<SimpleCardGameState>((set, get) => ({
  // Initial state
  gameState: initialGameState,
  offenseDeck: [],
  defenseDeck: [],
  hand: [],
  discardPile: [],
  momentum: initialMomentum,
  tendencies: initialTendencies,
  activeBonuses: [],
  defenseIntel: null,
  selectedCard: null,
  selectedCoverage: null,
  selectedAdjustment: null,
  isPlayerOnOffense: true,

  // Initialize game with drafted roster/deck
  initializeGame: (_roster, deck) => {
    // Ensure deck has 0-cost cards
    let gameDeck = [...deck];
    if (!gameDeck.some(c => c.cost === 0)) {
      gameDeck.push(
        { ...ZERO_COST_CARDS[0], id: `${ZERO_COST_CARDS[0].id}-${Date.now()}` },
        { ...ZERO_COST_CARDS[1], id: `${ZERO_COST_CARDS[1].id}-${Date.now()}` }
      );
    }

    // Shuffle deck
    gameDeck = gameDeck.sort(() => Math.random() - 0.5);

    // Draw initial hand
    let hand = gameDeck.slice(0, 5);
    let remainingDeck = gameDeck.slice(5);

    // ENSURE hand has at least one 0-cost card
    if (!hand.some(c => c.cost === 0)) {
      const zeroCost = ZERO_COST_CARDS[0];
      hand.push({ ...zeroCost, id: `${zeroCost.id}-init-${Date.now()}` });
    }

    set({
      gameState: { ...initialGameState },
      offenseDeck: remainingDeck,
      defenseDeck: [], // Would generate from defensive roster
      hand,
      discardPile: [],
      momentum: { ...initialMomentum },
      tendencies: { ...initialTendencies },
      activeBonuses: [],
      defenseIntel: {
        coordinator: 'Mike Blitzhauer',
        personality: 'AGGRESSIVE',
        showing: 'Nickel - Cover 1',
      },
      selectedCard: null,
      selectedCoverage: null,
      selectedAdjustment: null,
      isPlayerOnOffense: true,
    });
  },

  selectCard: (card) => {
    set({ selectedCard: card });
  },

  selectCoverage: (coverage) => {
    set({ selectedCoverage: coverage });
  },

  selectAdjustment: (adjustment) => {
    set({ selectedAdjustment: adjustment });
  },

  canAffordCard: (card) => {
    const { momentum, isPlayerOnOffense } = get();
    const currentMomentum = isPlayerOnOffense ? momentum.offense : momentum.defense;
    return currentMomentum >= card.cost;
  },

  snapBall: async (card) => {
    const { gameState, tendencies, momentum, hand, offenseDeck } = get();

    // Resolve play
    const result = resolveOffensivePlay(card, gameState, tendencies);

    // Update tendencies
    const newRecentPlays = [...tendencies.recentPlays, card.type].slice(-10);
    const runCount = newRecentPlays.filter(p => p === 'run').length;
    const newRunRate = newRecentPlays.length > 0 ? runCount / newRecentPlays.length : 0.5;

    // Update hand - remove played card, draw new one
    let newHand = hand.filter(c => c.id !== card.id);
    let newDeck = [...offenseDeck];
    if (newDeck.length > 0) {
      const idx = Math.floor(Math.random() * newDeck.length);
      newHand.push(newDeck[idx]);
      newDeck.splice(idx, 1);
    }

    // Update game state
    const newGameState = { ...gameState };
    let staysOnOffense = true;

    if (result.touchdown) {
      newGameState.playerScore += 7; // Assume XP made for now
      newGameState.fieldPosition = 25;
      newGameState.down = 1;
      newGameState.distance = 10;
      staysOnOffense = false;
    } else if (result.turnover) {
      newGameState.fieldPosition = 100 - (gameState.fieldPosition + result.yards);
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
        newGameState.distance -= result.yards;

        // Turnover on downs
        if (newGameState.down > 4) {
          newGameState.fieldPosition = 100 - newGameState.fieldPosition;
          newGameState.down = 1;
          newGameState.distance = 10;
          staysOnOffense = false;
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

    // Calculate new momentum: cost deducted + bonuses applied
    let newOffenseMomentum = Math.max(0, Math.min(momentum.max, momentum.offense - card.cost + result.momentumChange));

    // If staying on offense, regen +1 momentum for NEXT play
    if (staysOnOffense) {
      newOffenseMomentum = Math.min(momentum.max, newOffenseMomentum + 1);

      // SAFETY NET: Ensure hand has at least one playable card
      const cheapestInHand = Math.min(...newHand.map(c => c.cost));
      if (cheapestInHand > newOffenseMomentum) {
        // Add a free checkdown card
        newHand.push({ ...ZERO_COST_CARDS[0], id: `checkdown-${Date.now()}` });
      }
    }

    const newMomentum = {
      ...momentum,
      offense: newOffenseMomentum,
    };

    // Calculate active bonuses
    const newBonuses: Array<{ name: string; value: number }> = [];
    if (newRunRate > 0.55) {
      newBonuses.push({ name: 'Play Action', value: Math.round((newRunRate - 0.5) * 50) });
    }

    set({
      gameState: newGameState,
      momentum: newMomentum,
      hand: newHand,
      offenseDeck: newDeck,
      tendencies: {
        ...tendencies,
        recentPlays: newRecentPlays,
        runRate: newRunRate,
        passRate: 1 - newRunRate,
      },
      activeBonuses: newBonuses,
      selectedCard: null,
      isPlayerOnOffense: staysOnOffense,
    });

    return result;
  },

  setDefense: async (coverage, adjustment) => {
    const { gameState, tendencies, momentum } = get();

    // Resolve defensive play
    const result = resolveDefensivePlay(coverage, adjustment, gameState, tendencies);

    // Calculate momentum cost
    const cost = adjustment?.cost || 0;

    // Update game state
    const newGameState = { ...gameState };

    if (result.touchdown) {
      newGameState.opponentScore += 7;
      newGameState.fieldPosition = 25;
      newGameState.down = 1;
      newGameState.distance = 10;
      set({ isPlayerOnOffense: true });
    } else if (result.turnover) {
      newGameState.fieldPosition = 100 - (gameState.fieldPosition - result.yards);
      newGameState.down = 1;
      newGameState.distance = 10;
      set({ isPlayerOnOffense: true });
    } else {
      newGameState.fieldPosition -= result.yards;

      if (result.firstDown) {
        newGameState.down = 1;
        newGameState.distance = Math.min(10, newGameState.fieldPosition);
      } else {
        newGameState.down += 1;
        newGameState.distance -= result.yards;

        // Turnover on downs
        if (newGameState.down > 4) {
          newGameState.fieldPosition = 100 - newGameState.fieldPosition;
          newGameState.down = 1;
          newGameState.distance = 10;
          set({ isPlayerOnOffense: true });
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

    // Update momentum
    const newMomentum = {
      ...momentum,
      defense: Math.max(0, Math.min(momentum.max, momentum.defense - cost + result.momentumChange)),
    };

    set({
      gameState: newGameState,
      momentum: newMomentum,
      selectedCoverage: null,
      selectedAdjustment: null,
    });

    return result;
  },

  drawCards: (count) => {
    const { hand, offenseDeck, momentum } = get();

    if (momentum.offense < 2) return; // Can't afford

    const newCards: Card[] = [];
    const deckCopy = [...offenseDeck];

    for (let i = 0; i < count && deckCopy.length > 0; i++) {
      const idx = Math.floor(Math.random() * deckCopy.length);
      newCards.push(deckCopy.splice(idx, 1)[0]);
    }

    set({
      hand: [...hand, ...newCards],
      offenseDeck: deckCopy,
      momentum: { ...momentum, offense: momentum.offense - 2 },
    });
  },

  useTimeout: (team) => {
    const { gameState } = get();

    if (team === 'player' && gameState.playerTimeouts > 0) {
      set({
        gameState: { ...gameState, playerTimeouts: gameState.playerTimeouts - 1 },
      });
    } else if (team === 'opponent' && gameState.opponentTimeouts > 0) {
      set({
        gameState: { ...gameState, opponentTimeouts: gameState.opponentTimeouts - 1 },
      });
    }
  },

  advanceGame: (_result) => {
    // Handle end of game, transitions, etc.
  },
}));

export default useSimpleCardGameStore;
