/**
 * useSimulatedPlay - Hook that runs play simulation and provides animation frames
 *
 * This hook replaces the old animation system with a real simulation where
 * defenders react to the offense and the outcome is determined by what happens.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Play } from '../types/Play';
import type { DefensiveCard } from '../types/card.types';
import type { AnimationFrame, PlaybackState } from '../types/PlayAnimation';
import {
  simulatePlay,
  type SimulationResult,
  type OffenseRatings,
  type DefenseRatings,
} from '../engine/PlaySimulator';

export interface SimulatedPlayResult {
  yardsGained: number;
  success: boolean;
  touchdown: boolean;
  turnover: boolean;
  turnoverType?: 'INTERCEPTION' | 'FUMBLE';
  sack: boolean;
  incomplete: boolean;
  bigPlay: boolean;
  tackledBy?: string;
}

export interface UseSimulatedPlayReturn {
  // Current state
  currentFrame: AnimationFrame | null;
  playbackState: PlaybackState;
  simulationResult: SimulatedPlayResult | null;

  // Controls
  runSimulation: (
    play: Play,
    defenseCard: DefensiveCard,
    offenseRatings?: OffenseRatings,
    defenseRatings?: DefenseRatings
  ) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;

  // Status
  isLoaded: boolean;
  isSimulating: boolean;
  progress: number;
}

/**
 * Hook for running play simulation with animation playback
 */
export function useSimulatedPlay(): UseSimulatedPlayReturn {
  const [frames, setFrames] = useState<AnimationFrame[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulatedPlayResult | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTimeMs: 0,
    playbackSpeed: 1.5,  // Default slightly faster
    currentFrameIndex: 0,
  });

  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const currentTimeMsRef = useRef(0);
  const playbackSpeedRef = useRef(1.5);

  // Keep refs in sync
  useEffect(() => {
    currentTimeMsRef.current = playbackState.currentTimeMs;
    playbackSpeedRef.current = playbackState.playbackSpeed;
  }, [playbackState.currentTimeMs, playbackState.playbackSpeed]);

  /**
   * Run the simulation and generate frames
   */
  const runSimulation = useCallback((
    play: Play,
    defenseCard: DefensiveCard,
    offenseRatings: OffenseRatings = {},
    defenseRatings: DefenseRatings = {}
  ) => {
    setIsSimulating(true);

    // Run simulation (this happens synchronously for now)
    const result = simulatePlay(play, defenseCard, offenseRatings, defenseRatings);

    // Convert simulation result to game-compatible format
    const gameResult = convertToGameResult(result);

    setFrames(result.frames);
    setSimulationResult(gameResult);
    setCurrentFrameIndex(0);
    setPlaybackState({
      isPlaying: false,
      isPaused: false,
      currentTimeMs: 0,
      playbackSpeed: 1.5,
      currentFrameIndex: 0,
    });
    currentTimeMsRef.current = 0;
    setIsSimulating(false);
  }, []);

  /**
   * Start playback
   */
  const play = useCallback(() => {
    if (frames.length === 0) return;

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
  }, [frames.length]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
  }, []);

  /**
   * Reset to beginning
   */
  const reset = useCallback(() => {
    setCurrentFrameIndex(0);
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTimeMs: 0,
      currentFrameIndex: 0,
    }));
    currentTimeMsRef.current = 0;
    lastTimestampRef.current = null;
  }, []);

  /**
   * Set playback speed
   */
  const setSpeed = useCallback((speed: number) => {
    setPlaybackState(prev => ({
      ...prev,
      playbackSpeed: speed,
    }));
  }, []);

  /**
   * Animation loop
   */
  useEffect(() => {
    if (!playbackState.isPlaying || frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const totalDuration = frames[frames.length - 1]?.timeMs || 0;

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaMs = (timestamp - lastTimestampRef.current) * playbackSpeedRef.current;
      lastTimestampRef.current = timestamp;

      const newTimeMs = currentTimeMsRef.current + deltaMs;
      currentTimeMsRef.current = newTimeMs;

      // Find the frame at this time
      let newIndex = 0;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].timeMs <= newTimeMs) {
          newIndex = i;
        } else {
          break;
        }
      }

      // Check if animation is complete
      const isComplete = newIndex >= frames.length - 1;

      setCurrentFrameIndex(newIndex);
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: !isComplete,
        isPaused: false,
        currentTimeMs: isComplete ? totalDuration : newTimeMs,
        currentFrameIndex: newIndex,
      }));

      if (!isComplete) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playbackState.isPlaying, frames]);

  // Reset timestamp when pausing
  useEffect(() => {
    if (!playbackState.isPlaying) {
      lastTimestampRef.current = null;
    }
  }, [playbackState.isPlaying]);

  const currentFrame = frames[currentFrameIndex] || null;
  const totalDuration = frames[frames.length - 1]?.timeMs || 1;
  const progress = playbackState.currentTimeMs / totalDuration;

  return {
    currentFrame,
    playbackState,
    simulationResult,
    runSimulation,
    play,
    pause,
    reset,
    setSpeed,
    isLoaded: frames.length > 0,
    isSimulating,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

/**
 * Convert simulation result to game-compatible format
 */
function convertToGameResult(result: SimulationResult): SimulatedPlayResult {
  const { outcome } = result;

  return {
    yardsGained: outcome.yardsGained,
    success: outcome.yardsGained > 0 && outcome.result !== 'SACK',
    touchdown: outcome.result === 'TOUCHDOWN',
    turnover: outcome.result === 'INTERCEPTION' || outcome.result === 'FUMBLE',
    turnoverType: outcome.result === 'INTERCEPTION' ? 'INTERCEPTION' :
                  outcome.result === 'FUMBLE' ? 'FUMBLE' : undefined,
    sack: outcome.result === 'SACK',
    incomplete: outcome.result === 'INCOMPLETE',
    bigPlay: outcome.yardsGained >= 15,
    tackledBy: outcome.tackledBy,
  };
}
