/**
 * SimulatedPlayResult
 *
 * Runs a full play simulation with defense AI, shows the animation,
 * and returns the result when complete. The animation IS the game -
 * what you see is what happened.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayAnimationCanvas } from '../PlayAnimation/PlayAnimationCanvas';
import { useSimulatedPlay, type SimulatedPlayResult as SimResult } from '../../hooks/useSimulatedPlay';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import type { DefensiveCard, OffensivePlayType } from '../../types/card.types';
import type { TargetPosition } from '../../types/game.types';
import type { OffenseRatings, DefenseRatings } from '../../engine/PlaySimulator';

interface SimulatedPlayResultProps {
  // What play was called
  offensePlayType: OffensivePlayType;
  targetPosition?: TargetPosition;
  defenseCard: DefensiveCard;

  // Player ratings for simulation
  offenseRatings?: OffenseRatings;
  defenseRatings?: DefenseRatings;

  // Callback when simulation completes
  onResult: (result: SimResult) => void;

  // Optional: skip animation and just get result
  skipAnimation?: boolean;
}

// Map offensive play types to default plays for simulation
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

export const SimulatedPlayResult: React.FC<SimulatedPlayResultProps> = ({
  offensePlayType,
  targetPosition,
  defenseCard,
  offenseRatings = {},
  defenseRatings = {},
  onResult,
  skipAnimation = false,
}) => {
  const [phase, setPhase] = useState<'simulating' | 'animation' | 'done'>('simulating');
  const [hasStarted, setHasStarted] = useState(false);

  const {
    currentFrame,
    playbackState,
    simulationResult,
    runSimulation,
    play,
    isLoaded,
    progress,
  } = useSimulatedPlay();

  // Find the play to simulate
  const playToSimulate = useMemo(() => {
    const playId = PLAY_TYPE_TO_DEFAULT_PLAY[offensePlayType];
    if (!playId) return null;
    return DEFAULT_PLAYS.find(p => p.id === playId) || null;
  }, [offensePlayType]);

  // Run simulation on mount
  useEffect(() => {
    if (playToSimulate && defenseCard && !hasStarted) {
      setHasStarted(true);
      runSimulation(playToSimulate, defenseCard, offenseRatings, defenseRatings);
    }
  }, [playToSimulate, defenseCard, offenseRatings, defenseRatings, runSimulation, hasStarted]);

  // Auto-play when simulation is ready
  useEffect(() => {
    if (isLoaded && phase === 'simulating') {
      if (skipAnimation) {
        // Skip straight to result
        setPhase('done');
      } else {
        setPhase('animation');
        play();
      }
    }
  }, [isLoaded, phase, skipAnimation, play]);

  // Call onResult when animation completes
  useEffect(() => {
    if (phase === 'animation' && progress >= 0.98 && !playbackState.isPlaying && simulationResult) {
      const timer = setTimeout(() => {
        setPhase('done');
        onResult(simulationResult);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, progress, playbackState.isPlaying, simulationResult, onResult]);

  // Skip animation immediately returns result
  useEffect(() => {
    if (phase === 'done' && simulationResult) {
      onResult(simulationResult);
    }
  }, [phase, simulationResult, onResult]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (simulationResult) {
      setPhase('done');
      onResult(simulationResult);
    }
  }, [simulationResult, onResult]);

  // No play found
  if (!playToSimulate) {
    // Immediately call onResult with a default result
    useEffect(() => {
      onResult({
        yardsGained: 3,
        success: true,
        touchdown: false,
        turnover: false,
        sack: false,
        incomplete: false,
        bigPlay: false,
      });
    }, [onResult]);
    return null;
  }

  // Simulating phase
  if (phase === 'simulating') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-white text-lg">Setting up play...</div>
        </div>
      </div>
    );
  }

  // Animation phase
  if (phase === 'animation') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={handleSkip}>
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
              onClick={handleSkip}
              className="text-gray-500 hover:text-white text-sm px-3 py-1 rounded bg-gray-800"
            >
              Skip →
            </button>
          </div>
        </div>

        {/* Animation Canvas */}
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

  // Done - will trigger onResult callback
  return null;
};

export default SimulatedPlayResult;
