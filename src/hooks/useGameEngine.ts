import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, CPUPlayCaller, CPU_PERSONALITIES } from '../engine';
import type { GameState, OffensivePlay, Vector2 } from '../types/GameSim';
import type { Play } from '../types';
import type { KickResult } from '../engine/KickingEngine';
import { OFFENSIVE_PLAYBOOK } from '../data/offensivePlaybook';

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastKickResult, setLastKickResult] = useState<KickResult | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const cpuRef = useRef<CPUPlayCaller | null>(null);

  useEffect(() => {
    engineRef.current = new GameEngine(setGameState);
    cpuRef.current = new CPUPlayCaller(CPU_PERSONALITIES.balanced);
    setGameState(engineRef.current.getState());

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      cpuRef.current = null;
    };
  }, []);

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

  const nextPlay = useCallback(() => {
    engineRef.current?.resetForNextPlay();
    setLastKickResult(null);
  }, []);

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
  };
}
