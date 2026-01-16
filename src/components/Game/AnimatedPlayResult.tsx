/**
 * Animated Play Result
 *
 * Shows play animation BEFORE the text-based result display.
 * Flow: Animation (circles executing play) -> Then normal PlayResultDisplay
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayAnimationCanvas } from '../PlayAnimation/PlayAnimationCanvas';
import { usePlayAnimation } from '../../hooks/usePlayAnimation';
import { PlayResultDisplay } from './PlayResult';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import type { PlayResult, FourthDownResult } from '../../engine/playResolver';
import type { DefensiveCard, OffensivePlayType } from '../../types/card.types';
import type { TargetPosition, ShadePosition } from '../../types/game.types';
import type { PlayOutcome } from '../../types/PlayAnimation';

interface AnimatedPlayResultProps {
  result: PlayResult | FourthDownResult;
  offensePlayType?: OffensivePlayType;
  targetPosition?: TargetPosition;
  defenseCard?: DefensiveCard;
  defenseShade?: ShadePosition;
  isPlayerOffense: boolean;
  offensePlayerNames?: {
    qb: string;
    rb: string;
    wr1: string;
    wr2: string;
    te: string;
  };
  onContinue: () => void;
  onXPChoice?: (choice: 'XP' | 'TWO_POINT') => void;
}

// Map offensive play types to default plays for animation
const PLAY_TYPE_TO_DEFAULT_PLAY: Record<string, string> = {
  // Runs
  'INSIDE_RUN': 'default-hb-dive',
  'OUTSIDE_RUN': 'default-hb-sweep',
  'POWER_RUN': 'default-power',
  'DRAW': 'default-draw',
  'QB_RUN': 'default-power',
  // Passes
  'SHORT_PASS': 'default-slants',
  'MEDIUM_PASS': 'default-curl-flat',
  'DEEP_PASS': 'default-four-verts',
  'SCREEN': 'default-hb-screen',
  'PLAY_ACTION': 'default-mesh',
};

export const AnimatedPlayResult: React.FC<AnimatedPlayResultProps> = ({
  result,
  offensePlayType,
  targetPosition,
  defenseCard,
  defenseShade,
  isPlayerOffense,
  offensePlayerNames,
  onContinue,
  onXPChoice,
}) => {
  const [phase, setPhase] = useState<'animation' | 'result'>('animation');
  const [animationStarted, setAnimationStarted] = useState(false);

  const {
    currentFrame,
    playbackState,
    loadPlay,
    play,
    isLoaded,
    progress,
  } = usePlayAnimation({
    preSnapDuration: 500, // Shorter pre-snap for game flow
    routeSpeedMultiplier: 1.5, // Slightly faster routes
  });

  // Find a matching play to animate based on the play type
  const playToAnimate = useMemo(() => {
    if (!offensePlayType) return null;
    const playId = PLAY_TYPE_TO_DEFAULT_PLAY[offensePlayType];
    if (!playId) return null;
    return DEFAULT_PLAYS.find(p => p.id === playId) || null;
  }, [offensePlayType]);

  // Determine outcome for the animation based on result
  const animationOutcome = useMemo((): Partial<PlayOutcome> => {
    const isPass = offensePlayType && ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(offensePlayType);
    const yards = 'yardsGained' in result ? (result.yardsGained ?? 0) : 0;

    if (result.turnover) {
      return {
        result: 'turnoverType' in result && result.turnoverType === 'INTERCEPTION'
          ? 'INTERCEPTION'
          : 'FUMBLE',
        yardsGained: yards,
        targetReceiver: mapTargetToSlot(targetPosition),
      };
    }

    if (result.touchdown) {
      return {
        result: 'TOUCHDOWN',
        yardsGained: yards,
        targetReceiver: mapTargetToSlot(targetPosition),
      };
    }

    if ('sack' in result && result.sack) {
      return {
        result: 'SACK',
        yardsGained: yards,
      };
    }

    if (isPass) {
      return {
        result: result.success ? 'COMPLETE' : 'INCOMPLETE',
        yardsGained: yards,
        targetReceiver: mapTargetToSlot(targetPosition),
      };
    }

    return {
      result: 'RUSH',
      yardsGained: yards,
    };
  }, [result, offensePlayType, targetPosition]);

  // Load and start animation on mount
  useEffect(() => {
    if (playToAnimate && !animationStarted) {
      loadPlay(playToAnimate, animationOutcome);
      setAnimationStarted(true);
    }
  }, [playToAnimate, animationOutcome, loadPlay, animationStarted]);

  // Auto-play when loaded
  useEffect(() => {
    if (isLoaded && animationStarted && !playbackState.isPlaying && progress < 0.01) {
      play();
    }
  }, [isLoaded, animationStarted, playbackState.isPlaying, progress, play]);

  // Transition to result when animation completes
  useEffect(() => {
    if (animationStarted && progress >= 0.98 && !playbackState.isPlaying) {
      // Small delay before showing result
      const timer = setTimeout(() => {
        setPhase('result');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [animationStarted, progress, playbackState.isPlaying]);

  // Handle skip animation
  const handleSkip = useCallback(() => {
    setPhase('result');
  }, []);

  // If no play to animate, skip directly to result
  if (!playToAnimate) {
    return (
      <PlayResultDisplay
        result={result}
        offensePlayType={offensePlayType}
        targetPosition={targetPosition}
        defenseCard={defenseCard}
        defenseShade={defenseShade}
        isPlayerOffense={isPlayerOffense}
        offensePlayerNames={offensePlayerNames}
        onContinue={onContinue}
        onXPChoice={onXPChoice}
      />
    );
  }

  // Show animation phase
  if (phase === 'animation') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={handleSkip}>
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-3">
          <div className="flex items-center justify-between">
            <div className="text-amber-400 font-bold">
              {offensePlayType?.replace(/_/g, ' ')}
              {targetPosition && <span className="text-gray-400 ml-2">→ {targetPosition}</span>}
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-white text-sm px-3 py-1 rounded bg-gray-800"
            >
              Skip →
            </button>
          </div>
        </div>

        {/* Animation Canvas - Centered */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-950">
          <PlayAnimationCanvas
            frame={currentFrame}
            width={Math.min(700, window.innerWidth - 32)}
            height={Math.min(450, window.innerHeight - 200)}
            showRouteTrails={true}
            showLabels={true}
          />
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-900 border-t border-gray-800 p-4">
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-500">
              {currentFrame?.phase.replace('_', ' ')}
            </span>
            <span className="text-gray-500">
              Tap anywhere to skip
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show result phase
  return (
    <PlayResultDisplay
      result={result}
      offensePlayType={offensePlayType}
      targetPosition={targetPosition}
      defenseCard={defenseCard}
      defenseShade={defenseShade}
      isPlayerOffense={isPlayerOffense}
      offensePlayerNames={offensePlayerNames}
      onContinue={onContinue}
      onXPChoice={onXPChoice}
    />
  );
};

// Helper to map target position to play slot
function mapTargetToSlot(target?: TargetPosition): string | undefined {
  if (!target) return undefined;
  switch (target) {
    case 'WR1': return 'X';
    case 'WR2': return 'Z';
    case 'TE': return 'Y';
    case 'RB': return 'RB';
    default: return undefined;
  }
}

export default AnimatedPlayResult;
