import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useEventStore } from '../../stores/eventStore';
import { useGameEngine, type GameEndResult } from '../../hooks/useGameEngine';
import { useControls } from '../../hooks/useControls';
import { useSubstitutions } from '../../hooks/useSubstitutions';
import { PixiGameCanvas } from './PixiGameCanvas';
import { Scoreboard } from './Scoreboard';
import { ControlDeck } from './ControlDeck';
import { PlayCallModal } from './PlayCallModal';
import { SubstitutionPanel } from './SubstitutionPanel';
import type { Play } from '../../types';
import type { LiveGame, GameState as LiveGameState } from '../../types/Game';
import type { GameState, Vector2 } from '../../types/GameSim';

interface GameDayPageProps {
  onNavigate?: (page: string) => void;
  onGameEnd?: () => void;
}

// Adapter function to convert engine GameState to LiveGame for UI components
function adaptGameStateToLiveGame(
  engineState: GameState,
  homeTeamId: string,
  awayTeamId: string,
  selectedPlay: Play | null,
  coverageOverlay?: import('../../engine/DefenseAI').CoverageOverlayData,
  showCoverageOverlay?: boolean
): LiveGame {
  // Map engine phase to UI state
  const stateMap: Record<string, LiveGameState> = {
    'HUDDLE': 'PRE_SNAP',
    'BREAKING_HUDDLE': 'PRE_SNAP',
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

  // Calculate handoff effect (flash animation for 0.4 seconds)
  let handoffEffect: { x: number; y: number; progress: number } | undefined;
  if (engineState.handoffEffect && engineState.currentTime !== undefined) {
    const elapsed = engineState.currentTime - engineState.handoffEffect.startTime;
    const HANDOFF_DURATION = 0.4; // 0.4 seconds flash
    if (elapsed < HANDOFF_DURATION) {
      handoffEffect = {
        x: engineState.handoffEffect.x,
        y: engineState.handoffEffect.y,
        progress: elapsed / HANDOFF_DURATION,
      };
    }
  }

  // Convert play result for UI
  const playResult = engineState.lastResult ? {
    yardsGained: engineState.lastResult.yardsGained,
    touchdown: engineState.lastResult.touchdown,
    sack: engineState.lastResult.sack,
    turnover: engineState.lastResult.turnover,
  } : undefined;

  return {
    id: 'engine-game',
    state: stateMap[engineState.phase] || 'PRE_SNAP',
    clock: {
      quarter: engineState.clock.quarter,
      minutes: engineState.clock.minutes,
      seconds: engineState.clock.seconds,
      playClock: engineState.clock.playClock,
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
    handoffEffect,
    playResult,
    coverageOverlay,
    showCoverageOverlay,
  };
}

export const GameDayPage: React.FC<GameDayPageProps> = ({ onNavigate, onGameEnd }) => {
  const { playbook, teams, userTeamId, recordGameResult, saveCheckpoint, season } = useGameStore();
  const eventStore = useEventStore();

  // Get current week from event store
  const currentWeek = eventStore.currentWeek;

  // Game end handler - record result to store
  const handleGameEnd = useCallback((result: GameEndResult) => {
    if (!userTeamId || !teams.length) return;

    const oppTeam = teams.find(t => t.info.id !== userTeamId);
    if (!oppTeam) return;

    // Record the game result
    recordGameResult({
      week: currentWeek,
      homeTeamId: userTeamId,
      awayTeamId: oppTeam.info.id,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      userTeamId: userTeamId,
      userWon: result.homeWon,
      quarterScores: result.quarterScores,
    });

    // Notify event system of game result
    eventStore.setLastGameResult(result.homeWon);

    // Trigger parent callback
    onGameEnd?.();
  }, [userTeamId, teams, currentWeek, recordGameResult, eventStore, onGameEnd]);

  // Quarter end handler - save checkpoint
  const handleQuarterEnd = useCallback((quarter: number, homeScore: number, awayScore: number) => {
    if (!userTeamId || !teams.length) return;

    const oppTeam = teams.find(t => t.info.id !== userTeamId);
    if (!oppTeam) return;

    // Save checkpoint at end of each quarter
    saveCheckpoint({
      gameId: `week-${currentWeek}-game`,
      quarter: quarter as 1 | 2 | 3 | 4,
      timeRemaining: 0,
      homeScore,
      awayScore,
      homeTeamId: userTeamId,
      awayTeamId: oppTeam.info.id,
      possession: 'home', // Will be updated with actual value
      down: 1,
      yardsToGo: 10,
      ballPosition: 25,
    });
  }, [userTeamId, teams, currentWeek, saveCheckpoint]);

  const {
    gameState: engineState,
    selectPlay: engineSelectPlay,
    snap,
    moveBallCarrier,
    throwToSpot,
    nextPlay,
    simulateCPUPlay, // For when user is on defense
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
    getCoverageOverlay,
    isGameOver,
  } = useGameEngine({
    onGameEnd: handleGameEnd,
    onQuarterEnd: handleQuarterEnd,
  });
  const controls = useControls();
  const substitutions = useSubstitutions();
  const [showPlayCall, setShowPlayCall] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [showSubPanel, setShowSubPanel] = useState(true);
  const [showCoverageOverlay, setShowCoverageOverlay] = useState(false);

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

  // Use refs for snap handler to avoid stale closures
  const snapRef = useRef(snap);
  const selectedPlayRef = useRef(selectedPlay);

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  useEffect(() => {
    selectedPlayRef.current = selectedPlay;
  }, [selectedPlay]);

  // Spacebar to snap the ball
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phaseRef.current === 'PRE_SNAP' && selectedPlayRef.current) {
        e.preventDefault();
        snapRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tab key to show coverage overlay (like Madden R2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowCoverageOverlay(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setShowCoverageOverlay(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  // Handle click on canvas to throw (isometric view)
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!engineState || engineState.phase !== 'SNAP') return;
    // Check if QB has the ball (case-insensitive)
    if (engineState.ballCarrier?.toLowerCase() !== 'qb') return;

    const rect = e.currentTarget.getBoundingClientRect();

    // Isometric view settings - must match GameCanvas
    const ENGINE_WIDTH = 160;
    const VISIBLE_YARDS = 50;
    const YARDS_TO_UNITS = 3;
    const HORIZON_Y = 80;
    const fieldMarginX = 50;
    const fieldTop = HORIZON_Y;
    const fieldBottom = rect.height - 40;
    const fieldHeight = fieldBottom - fieldTop;

    // Coordinate conversion - matches GameEngine exactly
    const yardLineToEngineY = (yardLine: number) => (yardLine + 10) * 3;

    // Calculate viewport bounds (same as GameCanvas)
    const losEngineY = yardLineToEngineY(engineState.field.yardLine);
    const viewportStartY = losEngineY - 12 * YARDS_TO_UNITS;
    const minViewport = yardLineToEngineY(-10);
    const maxViewport = yardLineToEngineY(110) - VISIBLE_YARDS * YARDS_TO_UNITS;
    const clampedStartY = Math.max(minViewport, Math.min(viewportStartY, maxViewport));
    const clampedEndY = clampedStartY + VISIBLE_YARDS * YARDS_TO_UNITS;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Reverse the isometric transform
    // Screen Y -> depth -> engine Y
    const depth = (fieldBottom - clickY) / fieldHeight;
    const engineY = clampedStartY + depth * (clampedEndY - clampedStartY);

    // Screen X -> engine X (accounting for perspective narrowing)
    const perspectiveScale = 1 - depth * 0.6;
    const centerX = rect.width / 2;
    const fieldWidthAtDepth = (rect.width - fieldMarginX * 2) * perspectiveScale;
    const normalizedX = (clickX - centerX) / fieldWidthAtDepth + 0.5;
    const engineX = normalizedX * ENGINE_WIDTH;

    // Clamp to field bounds
    const clampedEngineX = Math.max(0, Math.min(ENGINE_WIDTH, engineX));
    const clampedEngineY = Math.max(clampedStartY, Math.min(clampedEndY, engineY));

    throwToSpot({ x: clampedEngineX, y: clampedEngineY });
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
  const coverageData = showCoverageOverlay ? getCoverageOverlay() : undefined;
  const game = adaptGameStateToLiveGame(
    engineState,
    userTeamId!,
    oppTeam.info.id,
    selectedPlay,
    coverageData,
    showCoverageOverlay
  );

  const isHuddle = engineState.phase === 'HUDDLE';
  const isBreakingHuddle = engineState.phase === 'BREAKING_HUDDLE';
  const isPreSnap = engineState.phase === 'PRE_SNAP';
  const isPlayRunning = engineState.phase === 'SNAP' || engineState.phase === 'ACTIVE';
  const isPlayDead = engineState.phase === 'WHISTLE';

  // User is on offense when their team (home) has possession
  const isUserOffense = game.possession === 'home';

  // Kicking scenarios
  const pendingKickoff = isPendingKickoff();
  const pendingPAT = isPendingPAT();
  const isFourthDown = engineState.field.down === 4;
  const inFGRange = isInFieldGoalRange();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar - Scoreboard */}
      <div className="p-4 pb-0 flex items-center justify-between">
        <Scoreboard
          clock={game.clock}
          homeTeam={{ ...game.homeTeam, name: userTeam.info.name }}
          awayTeam={{ ...game.awayTeam, name: oppTeam.info.name }}
          possession={game.possession}
          down={game.fieldPosition.down}
          yardsToGo={game.fieldPosition.yardsToGo}
          yardLine={game.fieldPosition.yardLine}
        />
        {/* Toggle sub panel button */}
        <button
          onClick={() => setShowSubPanel(!showSubPanel)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            showSubPanel
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
          }`}
          title="Toggle depth chart"
        >
          Roster
        </button>
      </div>

      {/* Main Content - Field + Substitution Panel */}
      <div className="flex-1 flex">
        {/* Left sidebar - Game Controls */}
        <div className="w-48 p-4 flex flex-col gap-3">
          {/* Coverage overlay toggle */}
          <button
            onMouseDown={() => setShowCoverageOverlay(true)}
            onMouseUp={() => setShowCoverageOverlay(false)}
            onMouseLeave={() => setShowCoverageOverlay(false)}
            className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
              showCoverageOverlay
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
            title="Hold to show defensive coverage zones"
          >
            {showCoverageOverlay ? 'Coverage ON' : 'Show Coverage'}
          </button>

          {/* Game controls info */}
          <div className="bg-gray-800/60 rounded-lg p-3 text-xs">
            <div className="text-gray-400 mb-2 font-medium">Controls</div>
            <div className="space-y-1.5 text-gray-500">
              <div><span className="text-gray-400">WASD/Arrows:</span> Move</div>
              <div><span className="text-gray-400">Shift:</span> Sprint</div>
              <div><span className="text-gray-400">Space:</span> Snap ball</div>
              <div><span className="text-gray-400">Click:</span> Throw</div>
            </div>
          </div>

          {/* Field position info */}
          {engineState && (
            <div className="bg-gray-800/60 rounded-lg p-3 text-xs mt-auto">
              <div className="text-gray-400 mb-2 font-medium">Drive</div>
              <div className="space-y-1 text-gray-300">
                <div>Ball on: <span className="text-white font-medium">{engineState.field.yardLine}</span></div>
                <div>To go: <span className="text-white font-medium">{100 - engineState.field.yardLine} yds</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Field area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="relative cursor-crosshair"
            onClick={handleCanvasClick}
          >
            <PixiGameCanvas game={game} width={showSubPanel ? 700 : 860} height={showSubPanel ? 400 : 490} />

            {/* Spacebar snap instruction overlay - only on offense */}
            {isPreSnap && selectedPlay && isUserOffense && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-green-500/30">
                <span className="text-green-400 text-sm font-semibold">
                  Press SPACE to snap the ball
                </span>
              </div>
            )}

            {/* Breaking huddle indicator */}
            {isBreakingHuddle && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/30">
                <span className="text-blue-400 text-sm font-semibold">
                  Breaking huddle...
                </span>
              </div>
            )}

            {/* Throw instruction overlay - only on offense */}
            {isPlayRunning && isUserOffense && engineState.ballCarrier?.toLowerCase() === 'qb' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/30">
                <span className="text-yellow-400 text-sm font-semibold">
                  Click anywhere to throw the ball
                </span>
              </div>
            )}

            {/* Defense mode indicator */}
            {isPlayRunning && !isUserOffense && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-red-500/30">
                <span className="text-red-400 text-sm font-semibold">
                  CPU is running the play...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Substitution Panel - Right sidebar */}
        {showSubPanel && (
          <SubstitutionPanel
            side={isUserOffense ? 'offense' : 'defense'}
            roster={substitutions.roster}
            currentLineup={isUserOffense ? substitutions.offenseLineup : substitutions.defenseLineup}
            depthChart={isUserOffense ? substitutions.offenseDepthChart : substitutions.defenseDepthChart}
            fatigueData={isUserOffense ? substitutions.offenseFatigue : substitutions.defenseFatigue}
            autoSubSettings={substitutions.autoSubSettings}
            onSubstitute={(slot, playerId) => {
              if (isUserOffense) {
                substitutions.substituteOffense(slot, playerId);
              } else {
                substitutions.substituteDefense(slot, playerId);
              }
            }}
            onToggleAutoSub={substitutions.toggleAutoSub}
            onAutoSubAll={() => {
              if (isUserOffense) {
                substitutions.autoSubOffense();
              } else {
                substitutions.autoSubDefense();
              }
            }}
            showPanel={showSubPanel}
          />
        )}
      </div>

      {/* Bottom Bar - Control Deck */}
      <ControlDeck
        phase={engineState.phase}
        isPreSnap={isHuddle || isBreakingHuddle || isPreSnap}
        isPlayRunning={isPlayRunning}
        isPlayDead={isPlayDead}
        selectedPlayName={selectedPlay?.name}
        isUserOffense={isUserOffense}
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
        onSimulateCPU={simulateCPUPlay}
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
