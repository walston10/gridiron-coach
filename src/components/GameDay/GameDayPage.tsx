import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useControls } from '../../hooks/useControls';
import { GameCanvas } from './GameCanvas';
import { Scoreboard } from './Scoreboard';
import { ControlDeck } from './ControlDeck';
import { PlayCallModal } from './PlayCallModal';
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

  // Calculate ball in flight position
  let ballInFlight: { x: number; y: number; progress: number } | undefined;
  if (engineState.passFlight) {
    const { startLocation, landingSpot, airTime, elapsedTime } = engineState.passFlight;
    const progress = Math.min(elapsedTime / airTime, 1);
    ballInFlight = {
      x: startLocation.x + (landingSpot.x - startLocation.x) * progress,
      y: startLocation.y + (landingSpot.y - startLocation.y) * progress,
      progress,
    };
  }

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
    ballInFlight,
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
    // Canvas mapping: screen X → engine Y (field position), screen Y → engine X (sideline position)
    // Field area is inset 50px on each side for yard markers
    const fieldLeft = 50;
    const fieldRight = rect.width - 50;
    const fieldTop = 50;
    const fieldBottom = rect.height - 50;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen coordinates to engine coordinates
    // Screen X (left-right) = field position (engine Y: 0=own endzone, 360=opponent endzone)
    const engineY = ((clickX - fieldLeft) / (fieldRight - fieldLeft)) * 360;
    // Screen Y (top-bottom) = sideline position (engine X: 0-160)
    const engineX = ((clickY - fieldTop) / (fieldBottom - fieldTop)) * 160;

    throwToSpot({ x: engineX, y: engineY });
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl p-10 max-w-md text-center border border-slate-800 shadow-2xl">
          <div className="text-7xl mb-6">🏈</div>
          <h2 className="text-3xl font-black text-white mb-4">No Plays Yet!</h2>
          <p className="text-slate-400 mb-8 text-lg">
            Create your first play in the Play Designer before hitting the field.
          </p>
          <button
            onClick={() => onNavigate?.('designer')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-lg shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
          >
            Go to Play Designer
          </button>
        </div>
      </div>
    );
  }

  if (!engineState || !userTeam || !oppTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-lg">Loading game...</span>
        </div>
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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar - Scoreboard */}
      <div className="p-4 pb-0">
        <Scoreboard
          clock={game.clock}
          homeTeam={{ ...game.homeTeam, name: userTeam.info.name }}
          awayTeam={{ ...game.awayTeam, name: oppTeam.info.name }}
          possession={game.possession}
          down={game.fieldPosition.down}
          yardsToGo={game.fieldPosition.yardsToGo}
          yardLine={game.fieldPosition.yardLine}
        />
      </div>

      {/* Main Content - Field */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="relative cursor-crosshair"
          onClick={handleCanvasClick}
        >
          <GameCanvas game={game} width={960} height={540} />

          {/* Throw instruction overlay */}
          {isPlayRunning && engineState.ballCarrier?.toLowerCase() === 'qb' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/30">
              <span className="text-yellow-400 text-sm font-semibold">
                Click anywhere to throw the ball
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar - Control Deck */}
      <ControlDeck
        phase={engineState.phase}
        isPreSnap={isPreSnap}
        isPlayRunning={isPlayRunning}
        isPlayDead={isPlayDead}
        selectedPlayName={selectedPlay?.name}
        down={game.fieldPosition.down}
        yardsToGo={game.fieldPosition.yardsToGo}
        yardLine={game.fieldPosition.yardLine}
        pendingPAT={pendingPAT}
        pendingKickoff={pendingKickoff}
        isFourthDown={isFourthDown}
        inFGRange={inFGRange}
        fieldGoalDistance={100 - engineState.field.yardLine + 17}
        lastResult={engineState.lastResult}
        userTeamName={userTeam.info.name}
        oppTeamName={oppTeam.info.name}
        lastKickResult={lastKickResult ? {
          type: lastKickResult.type,
          success: lastKickResult.success,
          distance: lastKickResult.distance,
        } : undefined}
        onCallPlay={() => setShowPlayCall(true)}
        onSnap={handleSnap}
        onNextPlay={handleNextPlay}
        onPAT={handlePAT}
        onTwoPoint={handleTwoPoint}
        onKickoff={handleKickoff}
        onPunt={handlePunt}
        onFieldGoal={handleFieldGoal}
        onJuke={juke}
        onSpin={spin}
        onDive={dive}
        ballCarrier={engineState.ballCarrier}
      />

      {/* Play Call Modal */}
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
