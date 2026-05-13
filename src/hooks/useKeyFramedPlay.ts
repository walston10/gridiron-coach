/**
 * useKeyFramedPlay — animation hook with a Key Frame decision pause.
 *
 * Flow:
 *   1. Caller calls loadPlay(play, defense, ratings).
 *   2. Hook pre-simulates all branches via buildKeyFramedPassPlay.
 *   3. Caller calls play(): playback starts from the canonical branch's frames.
 *   4. When playback reaches keyFrameTickMs, hook pauses and sets
 *      `awaitingDecision = true`, exposing the options + the freeze frame.
 *   5. Caller calls decide(optionId). The active frame buffer swaps to that
 *      branch's frames; playback resumes from the same timeMs.
 *   6. If the slo-mo window expires without a decision, the default option fires.
 *
 * The pre-decision frames are deterministic across branches (defenders don't
 * react to QB intent until ball-in-air), so the swap at keyFrameTickMs is
 * visually seamless.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Play } from '../types/Play';
import type { DefensiveCard } from '../types/card.types';
import type { AnimationFrame, PlaybackState } from '../types/PlayAnimation';
import type { OffenseRatings, DefenseRatings } from '../engine/PlaySimulator';
import { buildKeyFramedPlay } from '../engine/keyFrame';
import type { KFOption, KeyFramedPlay } from '../types/keyFrame.types';

export type KFPhase =
  | 'idle'                // Nothing loaded
  | 'ready'               // Branches built, waiting for play()
  | 'pre-snap'            // Formation visible; audible/snap window open
  | 'pre-kf'              // Playback running, before Key Frame
  | 'awaiting-decision'   // Paused at Key Frame; waiting for tap or timeout
  | 'post-kf'             // Playback running after a decision
  | 'done';               // Play resolved

export interface UseKeyFramedPlayReturn {
  // State
  phase: KFPhase;
  currentFrame: AnimationFrame | null;
  playbackState: PlaybackState;
  keyFramedPlay: KeyFramedPlay | null;
  options: KFOption[];
  /** Remaining ms in the decision window (counts down only during awaiting-decision). */
  decisionTimeRemaining: number;
  /** Remaining ms in the pre-snap window (counts down only during pre-snap). */
  preSnapTimeRemaining: number;
  /** Total length of the pre-snap window (for rendering the countdown bar). */
  preSnapWindowMs: number;
  /** The chosen option, set after decide() or timeout. */
  chosenOption: KFOption | null;
  /** The current play loaded for the snap (changes when audible() is called). */
  activePlay: Play | null;

  // Controls
  loadPlay: (
    play: Play,
    defenseCard: DefensiveCard,
    offenseRatings?: OffenseRatings,
    defenseRatings?: DefenseRatings
  ) => void;
  /** Move from 'ready' into the pre-snap audible window. */
  play: () => void;
  /** Commit the snap — transitions from 'pre-snap' to 'pre-kf' and starts playback. */
  snap: () => void;
  /** Swap the play during pre-snap. Rebuilds branches and resets the pre-snap timer. */
  audible: (play: Play) => void;
  decide: (optionId: string) => void;
  reset: () => void;
}

const DEFAULT_PLAYBACK_SPEED = 1.5;
const PRE_SNAP_WINDOW_MS = 3500;

export function useKeyFramedPlay(): UseKeyFramedPlayReturn {
  const [phase, setPhase] = useState<KFPhase>('idle');
  const [keyFramedPlay, setKeyFramedPlay] = useState<KeyFramedPlay | null>(null);
  const [activeFrames, setActiveFrames] = useState<AnimationFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [chosenOption, setChosenOption] = useState<KFOption | null>(null);
  const [decisionTimeRemaining, setDecisionTimeRemaining] = useState(0);
  const [preSnapTimeRemaining, setPreSnapTimeRemaining] = useState(0);
  const [activePlay, setActivePlay] = useState<Play | null>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTimeMs: 0,
    playbackSpeed: DEFAULT_PLAYBACK_SPEED,
    currentFrameIndex: 0,
  });

  // Refs for the rAF loop
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const currentTimeMsRef = useRef(0);
  const phaseRef = useRef<KFPhase>('idle');
  const kfTickRef = useRef<number>(Infinity);
  const framesRef = useRef<AnimationFrame[]>([]);
  const decisionDeadlineRef = useRef<number | null>(null);
  const kfRef = useRef<KeyFramedPlay | null>(null);

  // Refs for audible support — we keep the most recent defense/ratings so the
  // audible() call can re-run the pre-compute without the caller re-supplying them.
  const defenseRef = useRef<DefensiveCard | null>(null);
  const offenseRatingsRef = useRef<OffenseRatings>({});
  const defenseRatingsRef = useRef<DefenseRatings>({});
  const preSnapDeadlineRef = useRef<number | null>(null);

  // Keep refs in sync with state.
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { framesRef.current = activeFrames; }, [activeFrames]);
  useEffect(() => { kfRef.current = keyFramedPlay; }, [keyFramedPlay]);

  /**
   * Internal: pre-compute branches for a play and seat them as the active state.
   * Used by both loadPlay() and audible() — keeps the rebuild logic in one place.
   */
  const buildAndSeat = useCallback((
    play: Play,
    defenseCard: DefensiveCard,
    offenseRatings: OffenseRatings,
    defenseRatings: DefenseRatings
  ): boolean => {
    const kfp = buildKeyFramedPlay(play, defenseCard, offenseRatings, defenseRatings);
    if (!kfp) return false;
    const defaultOption = kfp.options.find(o => o.id === kfp.defaultOptionId) ?? kfp.options[0];

    setKeyFramedPlay(kfp);
    setActiveFrames(defaultOption.branch.frames);
    setCurrentFrameIndex(0);
    setChosenOption(null);
    setDecisionTimeRemaining(0);
    kfTickRef.current = kfp.keyFrameTickMs;
    currentTimeMsRef.current = 0;
    decisionDeadlineRef.current = null;
    setActivePlay(play);
    setPlaybackState({
      isPlaying: false,
      isPaused: false,
      currentTimeMs: 0,
      playbackSpeed: DEFAULT_PLAYBACK_SPEED,
      currentFrameIndex: 0,
    });
    return true;
  }, []);

  /**
   * Pre-simulate all branches and prepare playback.
   */
  const loadPlay = useCallback((
    play: Play,
    defenseCard: DefensiveCard,
    offenseRatings: OffenseRatings = {},
    defenseRatings: DefenseRatings = {}
  ) => {
    // Cache for later audible() calls.
    defenseRef.current = defenseCard;
    offenseRatingsRef.current = offenseRatings;
    defenseRatingsRef.current = defenseRatings;

    const ok = buildAndSeat(play, defenseCard, offenseRatings, defenseRatings);
    if (!ok) {
      // Play type doesn't have a Key Frame mechanic yet.
      setKeyFramedPlay(null);
      setActiveFrames([]);
      setActivePlay(null);
      setPhase('idle');
      return;
    }
    setPhase('ready');
  }, [buildAndSeat]);

  /**
   * Move from 'ready' into the pre-snap audible window.
   * Starts a countdown; when it expires, snap() fires automatically.
   */
  const play = useCallback(() => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'awaiting-decision') return;
    // If we're already mid-play, resume playback normally.
    if (phaseRef.current === 'pre-kf' || phaseRef.current === 'post-kf') {
      setPlaybackState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      return;
    }
    if (phaseRef.current !== 'ready') return;
    // Open the pre-snap audible window.
    preSnapDeadlineRef.current = performance.now() + PRE_SNAP_WINDOW_MS;
    setPreSnapTimeRemaining(PRE_SNAP_WINDOW_MS);
    setPhase('pre-snap');
  }, []);

  /**
   * Commit the snap — close the audible window and start the simulator playback.
   * Called manually by the user or automatically when the pre-snap window expires.
   */
  const snap = useCallback(() => {
    if (phaseRef.current !== 'pre-snap') return;
    preSnapDeadlineRef.current = null;
    setPreSnapTimeRemaining(0);
    setPhase('pre-kf');
    setPlaybackState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  }, []);

  /**
   * Swap the play during the pre-snap audible window. Rebuilds branches with
   * the new play and resets the pre-snap timer. Ignored outside 'pre-snap'.
   */
  const audible = useCallback((newPlay: Play) => {
    if (phaseRef.current !== 'pre-snap') return;
    const defense = defenseRef.current;
    if (!defense) return;
    const ok = buildAndSeat(newPlay, defense, offenseRatingsRef.current, defenseRatingsRef.current);
    if (!ok) return;
    // Reset the pre-snap window so the player gets a fresh look at the new call.
    preSnapDeadlineRef.current = performance.now() + PRE_SNAP_WINDOW_MS;
    setPreSnapTimeRemaining(PRE_SNAP_WINDOW_MS);
    setPhase('pre-snap');
  }, [buildAndSeat]);

  /**
   * Resolve the Key Frame decision. Swaps active frames to the chosen branch
   * and resumes playback. Idempotent — extra calls after the first are ignored.
   */
  const decide = useCallback((optionId: string) => {
    if (phaseRef.current !== 'awaiting-decision') return;
    const kfp = kfRef.current;
    if (!kfp) return;
    const opt = kfp.options.find(o => o.id === optionId);
    if (!opt) return;

    setChosenOption(opt);
    setActiveFrames(opt.branch.frames);
    framesRef.current = opt.branch.frames;
    decisionDeadlineRef.current = null;
    setDecisionTimeRemaining(0);
    setPhase('post-kf');
    setPlaybackState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  }, []);

  /**
   * Reset everything.
   */
  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTimestampRef.current = null;
    currentTimeMsRef.current = 0;
    decisionDeadlineRef.current = null;
    preSnapDeadlineRef.current = null;
    setActiveFrames([]);
    setKeyFramedPlay(null);
    setActivePlay(null);
    setCurrentFrameIndex(0);
    setChosenOption(null);
    setDecisionTimeRemaining(0);
    setPreSnapTimeRemaining(0);
    setPlaybackState({
      isPlaying: false,
      isPaused: false,
      currentTimeMs: 0,
      playbackSpeed: DEFAULT_PLAYBACK_SPEED,
      currentFrameIndex: 0,
    });
    setPhase('idle');
  }, []);

  /**
   * Animation loop. Drives currentFrameIndex from real time.
   * Pauses at keyFrameTickMs (transitions phase to awaiting-decision).
   * If the decision window expires, fires the default option.
   */
  useEffect(() => {
    if (!playbackState.isPlaying || activeFrames.length === 0) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const totalDuration = activeFrames[activeFrames.length - 1]?.timeMs ?? 0;
    const speed = playbackState.playbackSpeed;

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
      const deltaMs = (timestamp - lastTimestampRef.current) * speed;
      lastTimestampRef.current = timestamp;

      let newTimeMs = currentTimeMsRef.current + deltaMs;

      // ---- Key Frame pause check ----
      // Only fire while in pre-kf phase. Cap the time at keyFrameTickMs so the
      // freeze frame is exactly the option-positioning frame.
      if (phaseRef.current === 'pre-kf' && newTimeMs >= kfTickRef.current) {
        newTimeMs = kfTickRef.current;
        currentTimeMsRef.current = newTimeMs;

        // Find frame index at the KF tick.
        let idx = 0;
        for (let i = 0; i < framesRef.current.length; i++) {
          if (framesRef.current[i].timeMs <= newTimeMs) idx = i;
          else break;
        }
        setCurrentFrameIndex(idx);
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: true,
          currentTimeMs: newTimeMs,
          currentFrameIndex: idx,
        }));

        // Open the decision window.
        const windowMs = kfRef.current?.windowMs ?? 500;
        decisionDeadlineRef.current = performance.now() + windowMs;
        setDecisionTimeRemaining(windowMs);
        setPhase('awaiting-decision');
        return;
      }

      currentTimeMsRef.current = newTimeMs;

      // Find the frame at this time.
      let newIndex = 0;
      for (let i = 0; i < framesRef.current.length; i++) {
        if (framesRef.current[i].timeMs <= newTimeMs) newIndex = i;
        else break;
      }

      const isComplete = newIndex >= framesRef.current.length - 1;
      setCurrentFrameIndex(newIndex);
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: !isComplete,
        currentTimeMs: isComplete ? totalDuration : newTimeMs,
        currentFrameIndex: newIndex,
      }));

      if (isComplete) {
        setPhase('done');
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playbackState.isPlaying, playbackState.playbackSpeed, activeFrames]);

  // Reset rAF timestamp baseline whenever we pause/resume.
  useEffect(() => {
    if (!playbackState.isPlaying) lastTimestampRef.current = null;
  }, [playbackState.isPlaying]);

  /**
   * Decision-window countdown. While awaiting, tick the remaining ms
   * down to zero, then auto-fire the default option.
   */
  useEffect(() => {
    if (phase !== 'awaiting-decision') return;
    const interval = setInterval(() => {
      const deadline = decisionDeadlineRef.current;
      if (deadline === null) return;
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        clearInterval(interval);
        const kfp = kfRef.current;
        if (kfp) decide(kfp.defaultOptionId);
      } else {
        setDecisionTimeRemaining(remaining);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase, decide]);

  /**
   * Pre-snap countdown. While in 'pre-snap', tick toward zero and auto-snap
   * on expiry. Reset whenever audible() pushes the deadline back.
   */
  useEffect(() => {
    if (phase !== 'pre-snap') return;
    const interval = setInterval(() => {
      const deadline = preSnapDeadlineRef.current;
      if (deadline === null) return;
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        clearInterval(interval);
        snap();
      } else {
        setPreSnapTimeRemaining(remaining);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase, snap]);

  const currentFrame = activeFrames[currentFrameIndex] ?? null;

  return {
    phase,
    currentFrame,
    playbackState,
    keyFramedPlay,
    options: keyFramedPlay?.options ?? [],
    decisionTimeRemaining,
    preSnapTimeRemaining,
    preSnapWindowMs: PRE_SNAP_WINDOW_MS,
    chosenOption,
    activePlay,
    loadPlay,
    play,
    snap,
    audible,
    decide,
    reset,
  };
}
