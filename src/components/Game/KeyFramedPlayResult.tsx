/**
 * KeyFramedPlayResult — drop-in replacement for SimulatedPlayResult that
 * adds the Key Frame slo-mo tap moment to the existing card-game flow.
 *
 * Same props, same onResult callback shape. The internal flow is:
 *   1. Map offensePlayType -> Play
 *   2. Pre-compute branches via useKeyFramedPlay (loadPlay)
 *   3. play() -> animate up to the KF tick -> pause
 *   4. KeyFrameOverlay shows tap targets at receiver / lane positions
 *   5. Tap (or timeout) selects a branch
 *   6. Playback resumes through the rest of the branch
 *   7. Convert branch outcome -> SimResult -> call onResult
 *
 * For play types not supported by the KF system (e.g. PLAY_ACTION or
 * trick plays), fall back to a default result so the game doesn't stall.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PlayAnimationCanvas } from '../PlayAnimation/PlayAnimationCanvas';
import { KeyFrameOverlay } from '../PlayAnimation/KeyFrameOverlay';
import { OutcomePunch, classifyPunch } from '../PlayAnimation/OutcomePunch';
import { useKeyFramedPlay } from '../../hooks/useKeyFramedPlay';
import { playStinger, type StingerKind } from '../../utils/audio';
import type { SimulatedPlayResult as SimResult } from '../../hooks/useSimulatedPlay';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import type { DefensiveCard, OffensivePlayType } from '../../types/card.types';
import type { TargetPosition } from '../../types/game.types';
import type { OffenseRatings, DefenseRatings } from '../../engine/PlaySimulator';
import type { PlayOutcome } from '../../types/PlayAnimation';

interface KeyFramedPlayResultProps {
  offensePlayType: OffensivePlayType;
  targetPosition?: TargetPosition;
  defenseCard: DefensiveCard;
  offenseRatings?: OffenseRatings;
  defenseRatings?: DefenseRatings;
  /**
   * True when the human player called the offense on this snap. When false
   * (opponent on offense, player on defense), the Key Frame slo-mo decision
   * auto-resolves to the AI's default branch — the player watches without
   * the tap overlay since the offensive read isn't theirs to make.
   */
  isPlayerOffense?: boolean;
  onResult: (result: SimResult) => void;
}

/** Map an offensive play-type bucket to a concrete Play in DEFAULT_PLAYS. */
const PLAY_TYPE_TO_DEFAULT_PLAY: Record<string, string> = {
  INSIDE_RUN:  'default-hb-dive',
  OUTSIDE_RUN: 'default-hb-sweep',
  POWER_RUN:   'default-power',
  DRAW:        'default-draw',
  QB_RUN:      'default-power',
  SHORT_PASS:  'default-slants',
  MEDIUM_PASS: 'default-curl-flat',
  DEEP_PASS:   'default-four-verts',
  SCREEN:      'default-hb-screen',
  PLAY_ACTION: 'default-mesh',
};

/** Convert simulator outcome → SimResult shape the card game expects. */
function outcomeToSimResult(outcome: PlayOutcome): SimResult {
  return {
    yardsGained: outcome.yardsGained,
    success: outcome.yardsGained > 0 && outcome.result !== 'SACK',
    touchdown: outcome.result === 'TOUCHDOWN',
    turnover: outcome.result === 'INTERCEPTION' || outcome.result === 'FUMBLE',
    turnoverType: outcome.result === 'INTERCEPTION' ? 'INTERCEPTION'
      : outcome.result === 'FUMBLE' ? 'FUMBLE'
      : undefined,
    sack: outcome.result === 'SACK',
    incomplete: outcome.result === 'INCOMPLETE',
    bigPlay: outcome.yardsGained >= 15,
    tackledBy: outcome.tackledBy,
  };
}

function pickCanvasSize() {
  if (typeof window === 'undefined') return { width: 700, height: 450 };
  const w = Math.min(window.innerWidth - 32, 700);
  const h = Math.min(window.innerHeight - 200, Math.round(w * 0.7));
  return { width: w, height: h };
}

export const KeyFramedPlayResult: React.FC<KeyFramedPlayResultProps> = ({
  offensePlayType,
  targetPosition,
  defenseCard,
  offenseRatings = {},
  defenseRatings = {},
  isPlayerOffense = true,
  onResult,
}) => {
  const [canvasSize, setCanvasSize] = useState(pickCanvasSize);
  useEffect(() => {
    const onResize = () => setCanvasSize(pickCanvasSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const {
    phase,
    currentFrame,
    keyFramedPlay,
    options,
    decisionTimeRemaining,
    chosenOption,
    loadPlay,
    play,
    decide,
  } = useKeyFramedPlay();

  // Find the play to simulate based on offensive card playType.
  const playToSimulate = useMemo(() => {
    const playId = PLAY_TYPE_TO_DEFAULT_PLAY[offensePlayType];
    if (!playId) return null;
    return DEFAULT_PLAYS.find(p => p.id === playId) ?? null;
  }, [offensePlayType]);

  // Bridge: if there's no mapping for this play type, fall back to a default
  // 3-yard result so the card game keeps moving. (PLAY_ACTION and other rare
  // types currently land here.)
  const fellBackRef = React.useRef(false);
  useEffect(() => {
    if (!playToSimulate && !fellBackRef.current) {
      fellBackRef.current = true;
      onResult({
        yardsGained: 3,
        success: true,
        touchdown: false,
        turnover: false,
        sack: false,
        incomplete: false,
        bigPlay: false,
      });
    }
  }, [playToSimulate, onResult]);

  // Load + start the play once on mount.
  const hasStartedRef = React.useRef(false);
  useEffect(() => {
    if (!playToSimulate || hasStartedRef.current) return;
    hasStartedRef.current = true;
    loadPlay(playToSimulate, defenseCard, offenseRatings, defenseRatings);
  }, [playToSimulate, defenseCard, offenseRatings, defenseRatings, loadPlay]);

  // Once branches are built (phase='ready'), kick off playback. The hook
  // currently inserts a pre-snap window between 'ready' and 'pre-kf'; for
  // the card game we want playback to start immediately.
  useEffect(() => {
    if (phase === 'ready') {
      play();
    }
  }, [phase, play]);

  // The pre-snap audible window doesn't make sense from inside the card-game
  // flow — the card was already picked. Auto-snap as soon as we hit pre-snap.
  useEffect(() => {
    if (phase === 'pre-snap') {
      // Brief delay so the formation is visible for a beat before snap.
      const t = setTimeout(() => play(), 600);
      return () => clearTimeout(t);
    }
  }, [phase, play]);

  // When opponent is on offense, auto-resolve the Key Frame to the AI's
  // default branch. The player doesn't make the offensive read on this snap.
  useEffect(() => {
    if (phase === 'awaiting-decision' && !isPlayerOffense && keyFramedPlay) {
      decide(keyFramedPlay.defaultOptionId);
    }
  }, [phase, isPlayerOffense, keyFramedPlay, decide]);

  // When the play resolves (phase='done'), convert the branch outcome and
  // hand it back to CardGameController.
  const handedOffRef = React.useRef(false);
  useEffect(() => {
    if (phase !== 'done' || !chosenOption || handedOffRef.current) return;
    handedOffRef.current = true;
    const outcome = chosenOption.branch.outcome;
    const sim = outcomeToSimResult(outcome);
    // Fire stinger + brief beat so the punch overlay has time to play
    // before the card-game result screen takes over.
    const kind = classifyPunch(outcome, false);
    if (kind && kind !== 'GAIN') playStinger(kind as StingerKind);
    const t = setTimeout(() => onResult(sim), 1400);
    return () => clearTimeout(t);
  }, [phase, chosenOption, onResult]);

  const skip = useCallback(() => {
    // If the player taps Skip, jump straight to the default branch's outcome.
    if (chosenOption) {
      onResult(outcomeToSimResult(chosenOption.branch.outcome));
      return;
    }
    if (keyFramedPlay?.options[0]) {
      onResult(outcomeToSimResult(keyFramedPlay.options[0].branch.outcome));
    }
  }, [chosenOption, keyFramedPlay, onResult]);

  if (!playToSimulate) return null;

  const showOverlay = phase === 'awaiting-decision';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" >
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-amber-400 font-bold">
              {offensePlayType?.replace(/_/g, ' ')}
              {targetPosition && <span className="text-gray-400 ml-2">→ {targetPosition}</span>}
            </div>
            <div className="text-red-400 text-sm">
              vs {defenseCard.playType.replace(/_/g, ' ')}
            </div>
          </div>
          <button
            onClick={skip}
            className="text-gray-500 hover:text-white text-sm px-3 py-1 rounded bg-gray-800"
          >
            Skip →
          </button>
        </div>
      </div>

      {/* Canvas + KF overlay + outcome punch */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-950">
        <div
          style={{
            position: 'relative',
            width: canvasSize.width,
            height: canvasSize.height,
            transform: phase === 'awaiting-decision' ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 220ms ease-out',
            transformOrigin: 'center center',
          }}
        >
          <PlayAnimationCanvas
            frame={currentFrame}
            width={canvasSize.width}
            height={canvasSize.height}
            showRouteTrails={true}
            showLabels={true}
          />
          {showOverlay && keyFramedPlay && isPlayerOffense && (
            <KeyFrameOverlay
              options={options}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              windowMs={keyFramedPlay.windowMs}
              timeRemainingMs={decisionTimeRemaining}
              onDecide={decide}
            />
          )}
          {phase === 'done' && chosenOption && (
            <OutcomePunch
              outcome={chosenOption.branch.outcome}
              isFirstDown={false}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              onDismiss={() => { /* noop — auto-hands off via effect */ }}
            />
          )}
        </div>
      </div>

      {/* Status bar — minimal compared to the full slice; the card game's
          own result screen takes over after onResult fires. */}
      <div className="bg-gray-900 border-t border-gray-800 p-3 text-center">
        <span className="text-xs text-gray-500 tracking-widest">
          {phase === 'awaiting-decision' && isPlayerOffense
            ? 'TAP A TARGET'
            : phase === 'awaiting-decision' && !isPlayerOffense
            ? 'OPPONENT IS READING…'
            : phase === 'pre-kf' || phase === 'pre-snap'
            ? 'PLAY DEVELOPING…'
            : phase === 'done'
            ? 'PLAY RESOLVED'
            : 'SETTING UP…'}
        </span>
      </div>
    </div>
  );
};

export default KeyFramedPlayResult;
