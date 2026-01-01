import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useControls } from '../../hooks/useControls';
import { GameCanvas } from './GameCanvas';
import { Scoreboard } from './Scoreboard';
import { DownAndDistance } from './DownAndDistance';
import { PlayCallModal } from './PlayCallModal';
import { PostSnapControls } from './PostSnapControls';
import type { Play } from '../../types';
import type { LiveGame, GameState as LiveGameState } from '../../types/Game';
import type { GameState, Vector2 } from '../../types/GameSim';

interface GameDayPageProps {
  onNavigate?: (page: string) => void;
}

// Adapter function to convert engine GameState to LiveGame for UI components
function adaptGameStateToLiveGame(
  engineState: GameState,
  homeTeamId: string,
  awayTeamId: string,
  selectedPlay: Play | null
): LiveGame {
  // Map engine phase to UI state
  const stateMap: Record<string, LiveGameState> = {
    'PRE_SNAP': 'PRE_SNAP',
    'SNAP': 'PLAY_RUNNING',
    'ACTIVE': 'PLAY_RUNNING',
    'TACKLE': 'PLAY_RUNNING',
    'WHISTLE': 'PLAY_DEAD',
  };

  // Convert FieldPlayer[] to simple position format
  const playerPositions = [
    ...engineState.offensivePlayers.map(p => ({
      id: p.id,
      x: p.location.x,
      y: p.location.y,
      role: 'offense' as const,
    })),
    ...engineState.defensivePlayers.map(p => ({
      id: p.id,
      x: p.location.x,
      y: p.location.y,
      role: 'defense' as const,
    })),
  ];

  // Find ball carrier location
  const ballCarrier = engineState.ballCarrier
    ? {
        x: engineState.ballLocation.x,
        y: engineState.ballLocation.y,
        playerId: engineState.ballCarrier,
        hasBall: true,
      }
    : null;

  return {
    id: 'engine-game',
    state: stateMap[engineState.phase] || 'PRE_SNAP',
    clock: {
      quarter: engineState.clock.quarter,
      minutes: engineState.clock.minutes,
      seconds: engineState.clock.seconds,
      isRunning: engineState.clock.isRunning,
    },
    fieldPosition: {
      yardLine: engineState.field.yardLine,
      down: engineState.field.down,
      yardsToGo: engineState.field.yardsToGo,
    },
    possession: engineState.field.possession,
    homeTeam: {
      teamId: homeTeamId,
      score: engineState.score.home,
      timeoutsRemaining: 3,
    },
    awayTeam: {
      teamId: awayTeamId,
      score: engineState.score.away,
      timeoutsRemaining: 3,
    },
    currentPlay: selectedPlay,
    playerPositions,
    ballCarrier,
  };
}

export const GameDayPage: React.FC<GameDayPageProps> = ({ onNavigate }) => {
  const { playbook, teams, userTeamId } = useGameStore();
  const {
    gameState: engineState,
    selectPlay: engineSelectPlay,
    snap,
    moveBallCarrier,
    throwToSpot,
    nextPlay,
    // Evasion moves
    juke,
    spin,
    dive,
    // Kicking
    kickoff,
    punt,
    fieldGoal,
    attemptPAT,
    attemptTwoPoint,
    isPendingKickoff,
    isPendingPAT,
    isInFieldGoalRange,
    lastKickResult,
  } = useGameEngine();
  const controls = useControls();
  const [showPlayCall, setShowPlayCall] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);

  // Use refs to avoid stale closures and prevent effect recreation
  const controlsRef = useRef(controls);
  const moveBallCarrierRef = useRef(moveBallCarrier);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef(engineState?.phase);

  // Keep refs updated
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    moveBallCarrierRef.current = moveBallCarrier;
  }, [moveBallCarrier]);

  useEffect(() => {
    phaseRef.current = engineState?.phase;
  }, [engineState?.phase]);

  const userTeam = teams.find(t => t.info.id === userTeamId);
  const oppTeam = teams.find(t => t.info.id !== userTeamId);

  // Check if user has plays
  const hasPlays = playbook.plays.length > 0;

  // Handle keyboard controls for ball carrier movement using requestAnimationFrame
  useEffect(() => {
    const updateMovement = () => {
      const phase = phaseRef.current;
      if (phase !== 'SNAP' && phase !== 'ACTIVE') {
        animationFrameRef.current = requestAnimationFrame(updateMovement);
        return;
      }

      const ctrl = controlsRef.current;
      const direction: Vector2 = { x: 0, y: 0 };

      // Map controls to direction (up = toward opponent endzone = negative y in field coords)
      if (ctrl.up) direction.y = -1;
      if (ctrl.down) direction.y = 1;
      if (ctrl.left) direction.x = -1;
      if (ctrl.right) direction.x = 1;

      // Normalize diagonal movement to prevent faster diagonal speed
      if (direction.x !== 0 && direction.y !== 0) {
        const diagonalScale = 0.707; // 1/sqrt(2)
        direction.x *= diagonalScale;
        direction.y *= diagonalScale;
      }

      // Sprint multiplier when holding shift (action2)
      if (ctrl.action2 && (direction.x !== 0 || direction.y !== 0)) {
        direction.x *= 1.5;
        direction.y *= 1.5;
      }

      if (direction.x !== 0 || direction.y !== 0) {
        moveBallCarrierRef.current(direction);
      }

      animationFrameRef.current = requestAnimationFrame(updateMovement);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updateMovement);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []); // Empty deps - uses refs for all values

  const handlePlaySelect = useCallback((play: Play) => {
    setSelectedPlay(play);
    engineSelectPlay(play);
    setShowPlayCall(false);
  }, [engineSelectPlay]);

  const handleSnap = useCallback(() => {
    if (engineState?.phase === 'PRE_SNAP' && selectedPlay) {
      snap();
    }
  }, [engineState?.phase, selectedPlay, snap]);

  const handleNextPlay = useCallback(() => {
    nextPlay();
    setSelectedPlay(null);
  }, [nextPlay]);

  // Handle click on canvas to throw
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!engineState || engineState.phase !== 'SNAP') return;
    // Check if QB has the ball (case-insensitive)
    if (engineState.ballCarrier?.toLowerCase() !== 'qb') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 160;
    const y = ((e.clientY - rect.top) / rect.height) * 360;

    throwToSpot({ x, y });
  }, [engineState, throwToSpot]);

  // Kicking handlers
  const handleKickoff = useCallback(() => {
    kickoff();
    setSelectedPlay(null);
  }, [kickoff]);

  const handlePunt = useCallback(() => {
    punt();
    setSelectedPlay(null);
  }, [punt]);

  const handleFieldGoal = useCallback(() => {
    fieldGoal();
    setSelectedPlay(null);
  }, [fieldGoal]);

  const handlePAT = useCallback(() => {
    attemptPAT();
  }, [attemptPAT]);

  const handleTwoPoint = useCallback(() => {
    attemptTwoPoint();
  }, [attemptTwoPoint]);

  // No plays - show message to create plays first
  if (!hasPlays) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🏈</div>
          <h2 className="text-2xl font-bold text-white mb-4">No Plays in Playbook!</h2>
          <p className="text-gray-400 mb-6">
            You need to create at least one play before you can start a game.
          </p>
          <button
            onClick={() => onNavigate?.('designer')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold"
          >
            Go to Play Designer
          </button>
        </div>
      </div>
    );
  }

  if (!engineState || !userTeam || !oppTeam) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  // Adapt engine state for UI components
  const game = adaptGameStateToLiveGame(
    engineState,
    userTeamId!,
    oppTeam.info.id,
    selectedPlay
  );

  const isPreSnap = engineState.phase === 'PRE_SNAP';
  const isPlayRunning = engineState.phase === 'SNAP' || engineState.phase === 'ACTIVE';
  const isPlayDead = engineState.phase === 'WHISTLE';

  // Kicking scenarios
  const pendingKickoff = isPendingKickoff();
  const pendingPAT = isPendingPAT();
  const isFourthDown = engineState.field.down === 4;
  const inFGRange = isInFieldGoalRange();

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-6">Game Day</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-2">
          <Scoreboard
            clock={game.clock}
            homeTeam={{ ...game.homeTeam, name: userTeam.info.name }}
            awayTeam={{ ...game.awayTeam, name: oppTeam.info.name }}
            possession={game.possession}
          />
        </div>
        <div>
          <DownAndDistance fieldPosition={game.fieldPosition} />
        </div>
        <div className="flex items-center justify-center">
          <div className="text-white text-lg font-bold capitalize bg-gray-800 px-4 py-2 rounded">
            {pendingPAT ? 'EXTRA POINT' : pendingKickoff ? 'KICKOFF' : engineState.phase.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1" onClick={handleCanvasClick}>
          <GameCanvas game={game} />
          {isPlayRunning && engineState.ballCarrier?.toLowerCase() === 'qb' && (
            <p className="text-yellow-400 text-sm mt-2 text-center">
              Click on the field to throw the ball
            </p>
          )}
        </div>

        <div className="w-72 space-y-4">
          {/* PAT / 2-Point Choice after TD */}
          {isPreSnap && pendingPAT && (
            <div className="bg-yellow-900 rounded-lg p-4 mb-4">
              <div className="text-yellow-400 font-bold text-lg mb-3">TOUCHDOWN!</div>
              <p className="text-white text-sm mb-4">Choose your extra point attempt:</p>
              <div className="space-y-2">
                <button
                  onClick={handlePAT}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
                >
                  Extra Point (1 pt)
                </button>
                <button
                  onClick={handleTwoPoint}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold"
                >
                  2-Point Conversion
                </button>
              </div>
            </div>
          )}

          {/* Kickoff after scoring */}
          {isPreSnap && pendingKickoff && !pendingPAT && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-2">After the score...</p>
              {lastKickResult && (
                <div className="text-white font-bold mb-3">
                  {lastKickResult.type === 'PAT' && (lastKickResult.success ? 'PAT Good!' : 'PAT Missed!')}
                  {lastKickResult.type === 'TWO_POINT' && (lastKickResult.success ? '2-Point Good!' : '2-Point Failed!')}
                  {lastKickResult.type === 'FIELD_GOAL' && (lastKickResult.success ? `${lastKickResult.distance}yd FG Good!` : 'FG Missed!')}
                </div>
              )}
              <button
                onClick={handleKickoff}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
              >
                Kickoff
              </button>
            </div>
          )}

          {/* Normal play selection */}
          {isPreSnap && !pendingKickoff && !pendingPAT && (
            <>
              <button
                onClick={() => setShowPlayCall(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
              >
                Call Play
              </button>

              {/* 4th Down Options */}
              {isFourthDown && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm font-bold mb-2">4th Down Options:</p>
                  <div className="space-y-2">
                    {inFGRange && (
                      <button
                        onClick={handleFieldGoal}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded font-bold text-sm"
                      >
                        Field Goal ({100 - engineState.field.yardLine + 17}yds)
                      </button>
                    )}
                    <button
                      onClick={handlePunt}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-bold text-sm"
                    >
                      Punt
                    </button>
                  </div>
                </div>
              )}

              {selectedPlay && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Selected Play</div>
                  <div className="text-white font-bold text-lg">{selectedPlay.name}</div>
                  <div className="text-gray-400 text-sm">{selectedPlay.formation}</div>
                </div>
              )}

              <button
                onClick={handleSnap}
                disabled={!selectedPlay}
                className={`w-full py-3 rounded-lg font-bold ${
                  selectedPlay
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Snap Ball
              </button>

              {!selectedPlay && !isFourthDown && (
                <p className="text-yellow-400 text-sm text-center">
                  Select a play first!
                </p>
              )}
            </>
          )}

          {isPlayRunning && (
            <>
              <PostSnapControls
                onJuke={juke}
                onSpin={spin}
                onDive={dive}
              />
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Controls</p>
                <p className="text-white text-sm">WASD or Arrow keys to move</p>
                <p className="text-white text-sm">Shift to sprint</p>
                {engineState.ballCarrier?.toLowerCase() === 'qb' && (
                  <p className="text-white text-sm">Click field to throw</p>
                )}
              </div>
            </>
          )}

          {isPlayDead && (
            <>
              {engineState.lastResult && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="text-gray-400 text-sm">Last Play</div>
                  <div className="text-white font-bold">
                    {engineState.lastResult.touchdown
                      ? 'TOUCHDOWN!'
                      : engineState.lastResult.incomplete
                      ? 'Incomplete Pass'
                      : engineState.lastResult.sack
                      ? `Sack! ${engineState.lastResult.yardsGained} yards`
                      : engineState.lastResult.turnover
                      ? `TURNOVER - ${engineState.lastResult.turnoverType}`
                      : engineState.lastResult.safety
                      ? 'SAFETY!'
                      : `${engineState.lastResult.yardsGained >= 0 ? '+' : ''}${engineState.lastResult.yardsGained} yards`}
                  </div>
                </div>
              )}
              <button
                onClick={handleNextPlay}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
              >
                Next Play
              </button>
            </>
          )}
        </div>
      </div>

      {showPlayCall && (
        <PlayCallModal
          plays={playbook.plays}
          onSelectPlay={handlePlaySelect}
          onClose={() => setShowPlayCall(false)}
        />
      )}
    </div>
  );
};
