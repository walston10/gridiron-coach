/**
 * useGameClock — React wrapper around the game clock engine.
 *
 * Caller burns time via burn(seconds) after each play and after opponent
 * drives. Halftime / end-game flags surface from state for the UI to act on.
 */

import { useCallback, useState } from 'react';
import {
  startGameClock,
  tickClock,
  refundClock,
  clearHalftime,
  type GameClockState,
} from '../engine/gameClock';

export interface UseGameClockReturn {
  state: GameClockState;
  /** Advance the clock by N seconds; handles quarter / halftime / game-over rollover. */
  burn: (seconds: number) => void;
  /** Add seconds back to the clock — used by timeouts. Capped at quarter length. */
  refund: (seconds: number) => void;
  /** Caller acknowledges halftime (e.g. user dismissed the halftime card). */
  ackHalftime: () => void;
  /** Reset to a fresh game. */
  newGame: (quarterLengthSec?: number) => void;
}

export function useGameClock(quarterLengthSec?: number): UseGameClockReturn {
  const [state, setState] = useState<GameClockState>(() => startGameClock(quarterLengthSec));

  const burn = useCallback((seconds: number) => {
    setState(prev => tickClock(prev, seconds));
  }, []);

  const refund = useCallback((seconds: number) => {
    setState(prev => refundClock(prev, seconds));
  }, []);

  const ackHalftime = useCallback(() => {
    setState(prev => clearHalftime(prev));
  }, []);

  const newGame = useCallback((qLen?: number) => {
    setState(startGameClock(qLen ?? quarterLengthSec));
  }, [quarterLengthSec]);

  return { state, burn, refund, ackHalftime, newGame };
}
