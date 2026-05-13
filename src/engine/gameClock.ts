/**
 * Game clock — pure logic.
 *
 * Tracks quarters, time remaining, halftime, end-of-game. Per-play clock
 * burn is computed from the play outcome (incompletions stop the clock,
 * complete passes run it, etc), with two-minute drill rules in the last
 * 2:00 of each half that stop the clock on more results.
 *
 * Defaults to 4 × 5:00 quarters = 20:00 game clock total. Average per-play
 * burn lands around 22–25 seconds, producing roughly 25 player + 25 opponent
 * plays per game.
 */

import type { PlayOutcome } from '../types/PlayAnimation';

export type Quarter = 1 | 2 | 3 | 4;

export interface GameClockState {
  quarter: Quarter;
  /** Seconds remaining in the current quarter (60..0). */
  secondsRemaining: number;
  /** Quarter length in seconds (game clock), used when advancing quarters. */
  quarterLengthSec: number;
  /** Set when the clock crosses 0 in Q2 — caller shows halftime ceremony. */
  isHalftime: boolean;
  /** Set when Q4 expires (and clock <= 0). */
  isGameOver: boolean;
}

export const DEFAULT_QUARTER_LENGTH_SEC = 5 * 60;  // 5:00

/** Start a fresh game with N-second quarters. */
export function startGameClock(quarterLengthSec: number = DEFAULT_QUARTER_LENGTH_SEC): GameClockState {
  return {
    quarter: 1,
    secondsRemaining: quarterLengthSec,
    quarterLengthSec,
    isHalftime: false,
    isGameOver: false,
  };
}

/**
 * Are we in the last 2:00 of a half (Q2 or Q4)? Triggers clock-stopping
 * behavior on more play results.
 */
export function isTwoMinuteDrill(state: GameClockState): boolean {
  return (state.quarter === 2 || state.quarter === 4) && state.secondsRemaining <= 120;
}

/**
 * Compute the seconds burned on the game clock for a given play outcome,
 * honoring two-minute drill rules.
 */
export function clockBurnFor(outcome: PlayOutcome, state: GameClockState): number {
  const twoMin = isTwoMinuteDrill(state);

  switch (outcome.result) {
    case 'INCOMPLETE':
      return 5;  // Always stops the clock
    case 'SACK':
      // In bounds — clock runs. 2-min drill: same (sack is in bounds).
      return 30;
    case 'COMPLETE':
      // Real football: clock runs unless out of bounds. We don't model OOB
      // explicitly. In 2-min drill, treat completions as slightly faster
      // (hurry-up snapping) but they still burn time unless OOB.
      return twoMin ? 25 : 32;
    case 'RUSH':
      return twoMin ? 30 : 35;
    case 'INTERCEPTION':
    case 'FUMBLE':
    case 'TOUCHDOWN':
      return 0;  // Drive over; clock doesn't burn meaningfully for our purposes
    default:
      return 25;
  }
}

/**
 * Advance the clock by N seconds. Handles quarter rollover, halftime,
 * and game end. Caller should not call this past game-over.
 *
 * Returns the new state. Sets isHalftime when transitioning to Q3.
 * Sets isGameOver when Q4 expires.
 */
export function tickClock(state: GameClockState, seconds: number): GameClockState {
  if (state.isGameOver) return state;

  let remaining = state.secondsRemaining - seconds;
  let quarter: Quarter = state.quarter;
  let isHalftime = false;
  let isGameOver = false;

  // Roll into the next quarter(s) if we burned past zero.
  while (remaining <= 0) {
    if (quarter === 4) {
      remaining = 0;
      isGameOver = true;
      break;
    }
    const overflow = -remaining;
    // Q2 → halftime → Q3
    if (quarter === 2) {
      isHalftime = true;
      remaining = state.quarterLengthSec;
      // Halftime "consumes" overflow — clock resets cleanly to start of Q3.
      // (If we ever model halftime as taking real time, that'd happen here.)
    } else {
      remaining = state.quarterLengthSec - overflow;
    }
    quarter = (quarter + 1) as Quarter;
  }

  return {
    ...state,
    quarter,
    secondsRemaining: remaining,
    isHalftime: state.isHalftime || isHalftime,
    isGameOver,
  };
}

/**
 * Refund time onto the clock — used by timeouts. Capped at the current
 * quarter length (can't refund past the start of the quarter). Does not
 * roll back from one quarter to the previous one; if a play crossed a
 * quarter boundary, the refund stays in the new quarter.
 *
 * Refunding into a game-over state is a no-op (timeout can't un-end a game).
 */
export function refundClock(state: GameClockState, seconds: number): GameClockState {
  if (state.isGameOver) return state;
  const newRemaining = Math.min(state.quarterLengthSec, state.secondsRemaining + seconds);
  return {
    ...state,
    secondsRemaining: newRemaining,
  };
}

/**
 * Clear the halftime flag once the UI has acknowledged it (e.g. user tapped
 * "Start 2nd Half"). The clock keeps its current Q3 / time values.
 */
export function clearHalftime(state: GameClockState): GameClockState {
  return { ...state, isHalftime: false };
}

/** Format "M:SS" for display. */
export function formatClock(secondsRemaining: number): string {
  const s = Math.max(0, Math.floor(secondsRemaining));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Format quarter as ordinal ("1st", "2nd", "3rd", "4th"). */
export function formatQuarter(q: Quarter): string {
  return q === 1 ? '1st' : q === 2 ? '2nd' : q === 3 ? '3rd' : '4th';
}

/**
 * Compute a coarse per-play clock burn estimate for the opponent's abstracted
 * drive, given just the number of plays and a rough mix. Used so the opponent's
 * drive burns the right amount of game clock when its play-by-play streams.
 */
export function estimateOpponentBurn(plays: { yardsGained: number; result: string }[], state: GameClockState): number {
  let total = 0;
  // We can't fully reconstruct state per-play because the opponent runs through
  // its own miniature drive state internally, but it's a reasonable approximation
  // to treat each play independently using the state at the START of the feed.
  for (const p of plays) {
    total += clockBurnFor({ result: p.result as PlayOutcome['result'], yardsGained: p.yardsGained }, state);
  }
  return total;
}
