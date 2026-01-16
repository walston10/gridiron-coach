import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Play } from '../types/Play';
import type {
  AnimationFrame,
  PlayAnimationResult,
  PlaybackState,
  PlayExecutorConfig,
  PlayOutcome,
} from '../types/PlayAnimation';
import { DEFAULT_EXECUTOR_CONFIG } from '../types/PlayAnimation';
import { executePlay, getDefaultTargetReceiver } from '../engine/PlayExecutor';

export type UsePlayAnimationReturn = {
  // Current state
  currentFrame: AnimationFrame | null;
  playbackState: PlaybackState;
  animationResult: PlayAnimationResult | null;

  // Controls
  loadPlay: (play: Play, outcome?: Partial<PlayOutcome>) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  seekTo: (timeMs: number) => void;

  // Status
  isLoaded: boolean;
  progress: number; // 0-1
};

/**
 * Hook for managing play animation playback
 */
export function usePlayAnimation(
  config: Partial<PlayExecutorConfig> = {}
): UsePlayAnimationReturn {
  const [animationResult, setAnimationResult] = useState<PlayAnimationResult | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTimeMs: 0,
    playbackSpeed: 1,
    currentFrameIndex: 0,
  });

  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Memoize config to prevent unnecessary re-renders
  const cfg = useMemo(() => ({
    ...DEFAULT_EXECUTOR_CONFIG,
    ...config
  }), [config.preSnapDuration, config.snapDuration, config.routeSpeedMultiplier, config.dropbackTime, config.showRouteTrails, config.showBlockingEngagements]);

  /**
   * Load a play and generate all animation frames
   */
  const loadPlay = useCallback((play: Play, outcome?: Partial<PlayOutcome>) => {
    // If no target receiver specified for pass plays, pick one
    const finalOutcome = { ...outcome };
    if (play.playType === 'PASS' && !finalOutcome.targetReceiver) {
      finalOutcome.targetReceiver = getDefaultTargetReceiver(play);
    }

    const result = executePlay(play, cfg, finalOutcome);
    setAnimationResult(result);
    setCurrentFrameIndex(0);
    setPlaybackState({
      isPlaying: false,
      isPaused: false,
      currentTimeMs: 0,
      playbackSpeed: 1,
      currentFrameIndex: 0,
    });
  }, [cfg]);

  /**
   * Start playback
   */
  const play = useCallback(() => {
    if (!animationResult) return;

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
  }, [animationResult]);

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
    lastTimestampRef.current = null;
  }, []);

  /**
   * Set playback speed (0.5, 1, 2)
   */
  const setSpeed = useCallback((speed: number) => {
    setPlaybackState(prev => ({
      ...prev,
      playbackSpeed: speed,
    }));
  }, []);

  /**
   * Seek to a specific time
   */
  const seekTo = useCallback((timeMs: number) => {
    if (!animationResult) return;

    // Find the frame closest to this time
    const targetIndex = animationResult.frames.findIndex(
      (f, i, arr) => {
        const nextFrame = arr[i + 1];
        if (!nextFrame) return true;
        return f.timeMs <= timeMs && nextFrame.timeMs > timeMs;
      }
    );

    const clampedIndex = Math.max(0, Math.min(targetIndex, animationResult.frames.length - 1));
    setCurrentFrameIndex(clampedIndex);
    setPlaybackState(prev => ({
      ...prev,
      currentTimeMs: timeMs,
      currentFrameIndex: clampedIndex,
    }));
  }, [animationResult]);

  // Use ref to track current time to avoid stale closure issues
  const currentTimeMsRef = useRef(0);
  const playbackSpeedRef = useRef(1);

  // Keep refs in sync with state
  useEffect(() => {
    currentTimeMsRef.current = playbackState.currentTimeMs;
    playbackSpeedRef.current = playbackState.playbackSpeed;
  }, [playbackState.currentTimeMs, playbackState.playbackSpeed]);

  /**
   * Animation loop
   */
  useEffect(() => {
    if (!playbackState.isPlaying || !animationResult) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

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
      for (let i = 0; i < animationResult.frames.length; i++) {
        if (animationResult.frames[i].timeMs <= newTimeMs) {
          newIndex = i;
        } else {
          break;
        }
      }

      // Check if animation is complete
      const isComplete = newIndex >= animationResult.frames.length - 1;

      setCurrentFrameIndex(newIndex);
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: !isComplete,
        isPaused: false,
        currentTimeMs: isComplete ? animationResult.totalDurationMs : newTimeMs,
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
  }, [playbackState.isPlaying, animationResult]);

  // Reset timestamp when pausing
  useEffect(() => {
    if (!playbackState.isPlaying) {
      lastTimestampRef.current = null;
    }
  }, [playbackState.isPlaying]);

  const currentFrame = animationResult?.frames[currentFrameIndex] || null;
  const progress = animationResult
    ? playbackState.currentTimeMs / animationResult.totalDurationMs
    : 0;

  return {
    currentFrame,
    playbackState,
    animationResult,
    loadPlay,
    play,
    pause,
    reset,
    setSpeed,
    seekTo,
    isLoaded: animationResult !== null,
    progress: Math.min(1, Math.max(0, progress)),
  };
}
