import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, CPUPlayCaller, CPU_PERSONALITIES } from '../engine';
import type { GameState, OffensivePlay, Vector2 } from '../types/GameSim';
import type { Play } from '../types';
import type { KickResult } from '../engine/KickingEngine';
import { OFFENSIVE_PLAYBOOK } from '../data/offensivePlaybook';

export interface GameEndResult {
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  quarterScores: {
    home: [number, number, number, number];
    away: [number, number, number, number];
  };
}

export interface UseGameEngineOptions {
  onGameEnd?: (result: GameEndResult) => void;
  onQuarterEnd?: (quarter: number, homeScore: number, awayScore: number) => void;
}

export function useGameEngine(options: UseGameEngineOptions = {}) {
  const { onGameEnd, onQuarterEnd } = options;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastKickResult, setLastKickResult] = useState<KickResult | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [quarterScores, setQuarterScores] = useState<{
    home: [number, number, number, number];
    away: [number, number, number, number];
  }>({
    home: [0, 0, 0, 0],
    away: [0, 0, 0, 0],
  });

  const engineRef = useRef<GameEngine | null>(null);
  const cpuRef = useRef<CPUPlayCaller | null>(null);
  const lastQuarterRef = useRef<number>(1);
  const lastScoreRef = useRef<{ home: number; away: number }>({ home: 0, away: 0 });
  const gameEndedRef = useRef<boolean>(false);

  useEffect(() => {
    engineRef.current = new GameEngine(setGameState);
    cpuRef.current = new CPUPlayCaller(CPU_PERSONALITIES.balanced);
    setGameState(engineRef.current.getState());
    gameEndedRef.current = false;
    setIsGameOver(false);
    setQuarterScores({
      home: [0, 0, 0, 0],
      away: [0, 0, 0, 0],
    });
    lastQuarterRef.current = 1;
    lastScoreRef.current = { home: 0, away: 0 };

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      cpuRef.current = null;
    };
  }, []);

  // Track quarter changes and game end
  useEffect(() => {
    if (!gameState) return;

    const currentQuarter = gameState.clock.quarter;
    const currentScore = gameState.score;

    // Detect quarter change - save quarter scores
    if (currentQuarter !== lastQuarterRef.current) {
      const prevQuarter = lastQuarterRef.current;

      // Calculate points scored in the previous quarter
      const homePointsThisQuarter = currentScore.home - lastScoreRef.current.home;
      const awayPointsThisQuarter = currentScore.away - lastScoreRef.current.away;

      setQuarterScores(prev => {
        const newScores = { ...prev };
        newScores.home = [...prev.home] as [number, number, number, number];
        newScores.away = [...prev.away] as [number, number, number, number];
        newScores.home[prevQuarter - 1] = homePointsThisQuarter;
        newScores.away[prevQuarter - 1] = awayPointsThisQuarter;
        return newScores;
      });

      // Trigger quarter end callback
      onQuarterEnd?.(prevQuarter, currentScore.home, currentScore.away);

      lastQuarterRef.current = currentQuarter;
      lastScoreRef.current = { home: currentScore.home, away: currentScore.away };
    }

    // Detect game over (quarter 4, time expired, and play is dead)
    const isClockExpired = gameState.clock.quarter === 4 &&
                           gameState.clock.minutes === 0 &&
                           gameState.clock.seconds === 0;
    const isPlayDead = gameState.phase === 'WHISTLE';

    if (isClockExpired && isPlayDead && !gameEndedRef.current) {
      gameEndedRef.current = true;
      setIsGameOver(true);

      // Calculate final quarter scores
      const finalQuarterScores = { ...quarterScores };
      const q4HomePoints = currentScore.home - lastScoreRef.current.home;
      const q4AwayPoints = currentScore.away - lastScoreRef.current.away;
      finalQuarterScores.home = [...quarterScores.home] as [number, number, number, number];
      finalQuarterScores.away = [...quarterScores.away] as [number, number, number, number];
      finalQuarterScores.home[3] = q4HomePoints;
      finalQuarterScores.away[3] = q4AwayPoints;

      // Trigger game end callback
      onGameEnd?.({
        homeScore: currentScore.home,
        awayScore: currentScore.away,
        homeWon: currentScore.home > currentScore.away,
        quarterScores: finalQuarterScores,
      });
    }
  }, [gameState, onGameEnd, onQuarterEnd, quarterScores]);

  // Support both OffensivePlay (engine format) and Play (UI format)
  const selectPlay = useCallback((play: OffensivePlay | Play) => {
    if (!engineRef.current || !cpuRef.current || !gameState) return;

    engineRef.current.setOffensivePlay(play);

    // CPU selects defense
    const cpuDefense = cpuRef.current.callDefensivePlay(
      gameState.field,
      gameState.score.away - gameState.score.home,
      gameState.clock.minutes * 60 + gameState.clock.seconds
    );
    engineRef.current.setDefensivePlay(cpuDefense);
  }, [gameState]);

  // Alternative: auto-select CPU defense
  const selectPlayWithAutoCPU = useCallback((play: OffensivePlay | Play) => {
    if (!engineRef.current) return;

    engineRef.current.setOffensivePlay(play);
    engineRef.current.setAutoCPUDefense();
  }, []);

  const snap = useCallback(() => {
    engineRef.current?.snap();
  }, []);

  const moveBallCarrier = useCallback((direction: Vector2) => {
    engineRef.current?.moveBallCarrier(direction);
  }, []);

  const throwToSpot = useCallback((location: Vector2) => {
    engineRef.current?.throwToSpot(location);
  }, []);

  const handoff = useCallback((targetId: string) => {
    engineRef.current?.handoff(targetId);
  }, []);

  // Evasion moves
  const juke = useCallback(() => {
    engineRef.current?.juke();
  }, []);

  const spin = useCallback(() => {
    engineRef.current?.spin();
  }, []);

  const dive = useCallback(() => {
    engineRef.current?.dive();
  }, []);

  const nextPlay = useCallback(() => {
    engineRef.current?.resetForNextPlay();
    setLastKickResult(null);
  }, []);

  // Simulate a full CPU offensive play (when user is on defense)
  const simulateCPUPlay = useCallback(() => {
    if (!engineRef.current || !cpuRef.current || !gameState) return;

    // CPU selects an offensive play
    const cpuOffense = cpuRef.current.callOffensivePlay(
      gameState.field,
      gameState.score.away - gameState.score.home,
      gameState.clock.minutes * 60 + gameState.clock.seconds
    );

    // Set up CPU offense (user is on defense)
    engineRef.current.setOffensivePlay(cpuOffense);

    // Auto-set defense since user isn't picking
    engineRef.current.setAutoCPUDefense();

    // Snap after a brief delay for huddle animation
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.snap();
        // Enable CPU ball carrier control
        engineRef.current.enableCPUControl(true);
      }
    }, 1500); // Wait for huddle break animation
  }, [gameState]);

  // Kicking plays
  const kickoff = useCallback(() => {
    if (!engineRef.current) return null;
    const result = engineRef.current.kickoff();
    setLastKickResult(result);
    return result;
  }, []);

  const punt = useCallback(() => {
    if (!engineRef.current) return null;
    const result = engineRef.current.punt();
    setLastKickResult(result);
    return result;
  }, []);

  const fieldGoal = useCallback(() => {
    if (!engineRef.current) return null;
    const result = engineRef.current.fieldGoal();
    setLastKickResult(result);
    return result;
  }, []);

  const attemptPAT = useCallback(() => {
    if (!engineRef.current) return null;
    const result = engineRef.current.attemptPAT();
    setLastKickResult(result);
    return result;
  }, []);

  const attemptTwoPoint = useCallback(() => {
    if (!engineRef.current) return null;
    const result = engineRef.current.attemptTwoPoint();
    setLastKickResult(result);
    return result;
  }, []);

  // Kicking state helpers
  const isPendingKickoff = useCallback(() => {
    return engineRef.current?.isPendingKickoff() ?? false;
  }, []);

  const isPendingPAT = useCallback(() => {
    return engineRef.current?.isPendingPAT() ?? false;
  }, []);

  const isInFieldGoalRange = useCallback(() => {
    return engineRef.current?.isInFieldGoalRange() ?? false;
  }, []);

  const shouldPunt = useCallback(() => {
    return engineRef.current?.shouldPunt() ?? false;
  }, []);

  const getCoverageOverlay = useCallback(() => {
    return engineRef.current?.getCoverageOverlay() ?? { zones: [], manCoverage: [], rushers: [] };
  }, []);

  // Get engine instance for advanced use cases (mobile controls, etc.)
  const getEngine = useCallback(() => engineRef.current, []);

  return {
    gameState,
    playbook: OFFENSIVE_PLAYBOOK,
    selectPlay,
    selectPlayWithAutoCPU,
    snap,
    moveBallCarrier,
    throwToSpot,
    handoff,
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
    shouldPunt,
    lastKickResult,
    getCoverageOverlay,
    // Game end state
    isGameOver,
    quarterScores,
    // Engine access for mobile controls
    getEngine,
  };
}
