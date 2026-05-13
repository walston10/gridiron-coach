/**
 * useDriveState — React state wrapper around the drive engine.
 *
 * Caller pumps outcomes in via applyOutcome(); hook exposes the live state
 * plus end-of-drive actions (newDrive, punt, kickFieldGoal).
 */

import { useCallback, useState } from 'react';
import type { PlayOutcome } from '../types/PlayAnimation';
import {
  startDrive,
  applyPlayOutcome,
  punt as puntDrive,
  attemptFieldGoal,
  type DriveState,
} from '../engine/driveState';

export interface UseDriveStateReturn {
  state: DriveState;
  applyOutcome: (outcome: PlayOutcome) => void;
  /** Start a fresh drive (default own 25). */
  newDrive: (startingYardline?: number) => void;
  /** Voluntary punt on 4th down. */
  punt: () => void;
  /** Voluntary field goal attempt on 4th down. */
  kickFieldGoal: () => void;
}

export function useDriveState(startingYardline: number = 25): UseDriveStateReturn {
  const [state, setState] = useState<DriveState>(() => startDrive(startingYardline));

  const applyOutcome = useCallback((outcome: PlayOutcome) => {
    setState(prev => applyPlayOutcome(prev, outcome));
  }, []);

  const newDrive = useCallback((from: number = 25) => {
    // Carry score forward across drives so the slice tracks cumulative points.
    setState(prev => ({
      ...startDrive(from),
      score: prev.score,
    }));
  }, []);

  const punt = useCallback(() => {
    setState(prev => puntDrive(prev));
  }, []);

  const kickFieldGoal = useCallback(() => {
    setState(prev => attemptFieldGoal(prev));
  }, []);

  return { state, applyOutcome, newDrive, punt, kickFieldGoal };
}
