import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useEventStore } from '../../stores/eventStore';
import { useGameEngine, type GameEndResult } from '../../hooks/useGameEngine';
import { useControls } from '../../hooks/useControls';
import { useSubstitutions } from '../../hooks/useSubstitutions';
import { useMobileControls } from '../../hooks/useMobileControls';
import { PixiGameCanvas } from './PixiGameCanvas';
import { Scoreboard } from './Scoreboard';
import { ControlDeck } from './ControlDeck';
import { PlayCallModal } from './PlayCallModal';
import { DefensePlayCallModal } from './DefensePlayCallModal';
import { SubstitutionPanel } from './SubstitutionPanel';
import { OrientationPrompt, TheCallButton } from '../gameplay';
import type { Play } from '../../types';
import type { LiveGame, GameState as LiveGameState } from '../../types/Game';
import type { GameState } from '../../types/GameSim';
import type { Point } from '../../types/input.types';

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
  const { playbook, teams, userTeamId, recordGameResult, saveCheckpoint, season: _season } = useGameStore();
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
    selectDefensivePlay: engineSelectDefensivePlay,
    snap,
    snapDefense,
    moveBallCarrier,
    throwToSpot,
    nextPlay,
    simulateCPUPlay, // For when user is on defense (legacy)
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
    isGameOver: _isGameOver,
    getEngine,
  } = useGameEngine({
    onGameEnd: handleGameEnd,
    onQuarterEnd: handleQuarterEnd,
  });
  const controls = useControls();
  const substitutions = useSubstitutions();

  // Connect roster and lineup data to the game engine
  useEffect(() => {
    const engine = getEngine();
    if (!engine) return;

    // Get user's team roster
    const userTeam = teams.find(t => t.info.id === userTeamId);
    if (!userTeam?.roster) return;

    // Only set roster data if we have lineup data
    if (substitutions.offenseLineup.size > 0 || substitutions.defenseLineup.size > 0) {
      engine.setRosterData(
        userTeam.roster,
        substitutions.offenseLineup,
        substitutions.defenseLineup
      );
    }
  }, [getEngine, teams, userTeamId, substitutions.offenseLineup, substitutions.defenseLineup]);

  const [showPlayCall, setShowPlayCall] = useState(false);
  const [showDefensePlayCall, setShowDefensePlayCall] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [selectedDefensePlay, setSelectedDefensePlay] = useState<import('../../types/GameSim').DefensivePlay | null>(null);
  const [showSubPanel, setShowSubPanel] = useState(true);
  const [showCoverageOverlay, setShowCoverageOverlay] = useState(false);
  const [slushFundBalance] = useState(50000); // TODO: Wire to actual slush fund store

  // Canvas ref for mobile touch controls - use callback ref to trigger re-render when mounted
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null);
  const canvasContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setCanvasElement(node);
    }
  }, []);

  // Responsive canvas sizing - fills available space on mobile
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 480 });

  useLayoutEffect(() => {
    const updateCanvasSize = () => {
      // Get window dimensions
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Reserve space for UI (scoreboard ~80px top, control deck ~100px bottom, sidebars ~200px each side)
      const sidebarWidth = showSubPanel ? 200 : 48; // Sub panel or just left controls
      const availableWidth = screenW - sidebarWidth - 48; // Left sidebar always ~48px
      const availableHeight = screenH - 180; // Top + bottom UI

      // Maintain 5:3 aspect ratio (field-like)
      const aspectRatio = 5 / 3;
      let width = Math.min(availableWidth, 1200); // Cap at 1200px
      let height = width / aspectRatio;

      // If height exceeds available, scale down
      if (height > availableHeight) {
        height = availableHeight;
        width = height * aspectRatio;
      }

      // Minimum sizes for playability
      width = Math.max(width, 600);
      height = Math.max(height, 360);

      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [showSubPanel]);

  // Use refs to avoid stale closures and prevent effect recreation
  const controlsRef = useRef(controls);
  const moveBallCarrierRef = useRef(moveBallCarrier);
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

  // Screen to field coordinate conversion for touch controls
  // MUST be defined before early returns to maintain consistent hook order
  const screenToField = useCallback((screenPos: Point): Point => {
    if (!canvasElement || !engineState) {
      return { x: 0, y: 0 };
    }

    const rect = canvasElement.getBoundingClientRect();
    const ENGINE_WIDTH = 160;
    const VISIBLE_YARDS = 50;
    const YARDS_TO_UNITS = 3;
    const HORIZON_Y = 80;
    const fieldMarginX = 50;
    const fieldTop = HORIZON_Y;
    const fieldBottom = rect.height - 40;
    const fieldHeight = fieldBottom - fieldTop;

    const yardLineToEngineY = (yardLine: number) => (yardLine + 10) * 3;
    const losEngineY = yardLineToEngineY(engineState.field.yardLine);
    const viewportStartY = losEngineY - 12 * YARDS_TO_UNITS;
    const minViewport = yardLineToEngineY(-10);
    const maxViewport = yardLineToEngineY(110) - VISIBLE_YARDS * YARDS_TO_UNITS;
    const clampedStartY = Math.max(minViewport, Math.min(viewportStartY, maxViewport));
    const clampedEndY = clampedStartY + VISIBLE_YARDS * YARDS_TO_UNITS;

    const depth = (fieldBottom - screenPos.y) / fieldHeight;
    const engineY = clampedStartY + depth * (clampedEndY - clampedStartY);

    // Must match GameCanvas perspective: 1 - depth * 0.35 (was 0.6)
    const perspectiveScale = 1 - depth * 0.35;
    const centerX = rect.width / 2;
    const fieldWidthAtDepth = (rect.width - fieldMarginX * 2) * perspectiveScale;
    const normalizedX = (screenPos.x - centerX) / fieldWidthAtDepth + 0.5;
    const engineX = normalizedX * ENGINE_WIDTH;

    return {
      x: Math.max(0, Math.min(ENGINE_WIDTH, engineX)),
      y: Math.max(clampedStartY, Math.min(clampedEndY, engineY)),
    };
  }, [engineState, canvasElement]);

  // Determine if user is on offense (home team has possession)
  const isUserOffenseForControls = engineState?.field.possession === 'home';

  // Wire up mobile touch/drag controls
  useMobileControls({
    engine: getEngine(),
    canvas: canvasElement, // Use state variable, not ref.current (ref would be null on first render)
    side: isUserOffenseForControls ? 'offense' : 'defense',
    screenToField,
    onAction: (action) => {
      // Log actions for debugging
      console.log('[MobileControls]', action);
    },
  });

  // NOTE: Keyboard controls (WASD) removed - using touch/drag controls via useMobileControls hook
  // The mobileControls hook above handles all movement input through touch/drag gestures

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

  const handleDefensePlaySelect = useCallback((play: import('../../types/GameSim').DefensivePlay) => {
    setSelectedDefensePlay(play);
    engineSelectDefensivePlay(play);
    setShowDefensePlayCall(false);
  }, [engineSelectDefensivePlay]);

  const handleSnap = useCallback(() => {
    if (engineState?.phase === 'PRE_SNAP' && selectedPlay) {
      snap();
    }
  }, [engineState?.phase, selectedPlay, snap]);

  const handleSnapDefense = useCallback(() => {
    if (engineState?.phase === 'PRE_SNAP' && selectedDefensePlay) {
      snapDefense();
    }
  }, [engineState?.phase, selectedDefensePlay, snapDefense]);

  const handleNextPlay = useCallback(() => {
    nextPlay();
    setSelectedPlay(null);
    setSelectedDefensePlay(null);
  }, [nextPlay]);

  // Handle click on canvas to throw (isometric view) - ONLY when user is on offense
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!engineState || engineState.phase !== 'SNAP') return;

    // CRITICAL: Only allow throwing when user is on OFFENSE (home has possession)
    if (engineState.field.possession !== 'home') return;

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
    // Must match GameCanvas perspective: 1 - depth * 0.35
    const perspectiveScale = 1 - depth * 0.35;
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

  // Determine play situation for The Call button
  const getPlaySituation = (): 'sack' | 'fumble' | 'touchdown' | 'big-gain' | 'normal' => {
    if (!engineState?.lastResult) return 'normal';
    const result = engineState.lastResult;
    if (result.sack) return 'sack';
    if (result.turnover) return 'fumble';
    if (result.touchdown) return 'touchdown';
    if (result.yardsGained >= 15) return 'big-gain';
    return 'normal';
  };

  // Kicking scenarios
  const pendingKickoff = isPendingKickoff();
  const pendingPAT = isPendingPAT();
  const isFourthDown = engineState.field.down === 4;
  const inFGRange = isInFieldGoalRange();

  return (
    <>
      {/* Landscape orientation required for mobile */}
      <OrientationPrompt />

      <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
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
      <div className="flex-1 flex min-h-0">
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
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <div
            ref={canvasContainerRef}
            className="relative cursor-crosshair"
            onClick={handleCanvasClick}
          >
            <PixiGameCanvas game={game} width={canvasSize.width} height={canvasSize.height} />

            {/* The Call button - bribe mechanic */}
            {isPlayRunning && (
              <TheCallButton
                slushFundBalance={slushFundBalance}
                playSituation={getPlaySituation()}
                visible={true}
              />
            )}

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
        onCallDefense={() => setShowDefensePlayCall(true)}
        onSnap={handleSnap}
        onSnapDefense={handleSnapDefense}
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
        selectedDefensePlayName={selectedDefensePlay?.name}
      />

      {/* Play Call Modal - Offense */}
      {showPlayCall && (
        <PlayCallModal
          plays={playbook.plays}
          onSelectPlay={handlePlaySelect}
          onClose={() => setShowPlayCall(false)}
        />
      )}

      {/* Play Call Modal - Defense */}
      {showDefensePlayCall && (
        <DefensePlayCallModal
          onSelectPlay={handleDefensePlaySelect}
          onClose={() => setShowDefensePlayCall(false)}
        />
      )}
      </div>
    </>
  );
};
