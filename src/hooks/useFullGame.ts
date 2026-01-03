import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, CPUPlayCaller, CPU_PERSONALITIES, GameManager } from '../engine';
import type { GameState, OffensivePlay, DefensivePlay, Vector2 } from '../types/GameSim';
import type { GameManagerState } from '../engine/GameManager';
import type { KickResult } from '../engine/KickingEngine';
import { OFFENSIVE_PLAYBOOK } from '../data/offensivePlaybook';
import { DEFENSIVE_PLAYBOOK } from '../data/defensivePlaybook';

export interface FullGameState {
  playState: GameState | null;
  managerState: GameManagerState | null;
  isUserOnOffense: boolean;
  lastKickResult: KickResult | null;
}

export function useFullGame(userTeam: 'home' | 'away' = 'home') {
  const [playState, setPlayState] = useState<GameState | null>(null);
  const [managerState, setManagerState] = useState<GameManagerState | null>(null);
  const [lastKickResult, setLastKickResult] = useState<KickResult | null>(null);

  const engineRef = useRef<GameEngine | null>(null);
  const managerRef = useRef<GameManager | null>(null);
  const cpuRef = useRef<CPUPlayCaller | null>(null);

  const isUserOnOffense = managerState?.possession === userTeam;

  // Initialize
  useEffect(() => {
    engineRef.current = new GameEngine(setPlayState);
    managerRef.current = new GameManager(setManagerState);
    cpuRef.current = new CPUPlayCaller(CPU_PERSONALITIES.balanced);

    setPlayState(engineRef.current.getState());
    setManagerState(managerRef.current.getState());

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      managerRef.current = null;
      cpuRef.current = null;
    };
  }, []);

  // COIN TOSS
  const coinToss = useCallback((userReceives: boolean) => {
    const homeReceives = userTeam === 'home' ? userReceives : !userReceives;
    managerRef.current?.coinToss(homeReceives);
  }, [userTeam]);

  // KICKOFF
  const executeKickoff = useCallback(() => {
    const result = managerRef.current?.executeKickoff();
    if (result) {
      setLastKickResult(result);
    }
  }, []);

  // PLAY SELECTION
  const selectPlay = useCallback((play: OffensivePlay | DefensivePlay) => {
    if (!engineRef.current || !cpuRef.current || !managerState || !playState) return;

    if (isUserOnOffense) {
      engineRef.current.setOffensivePlay(play as OffensivePlay);
      // CPU selects defense
      const cpuDefense = cpuRef.current.callDefensivePlay(
        managerState.field,
        managerState.awayScore - managerState.homeScore,
        managerState.clock.minutes * 60 + managerState.clock.seconds
      );
      engineRef.current.setDefensivePlay(cpuDefense);
    } else {
      // User on defense
      // CPU calls offense
      const cpuOffense = cpuRef.current.callOffensivePlay(
        managerState.field,
        managerState.awayScore - managerState.homeScore,
        managerState.clock.minutes * 60 + managerState.clock.seconds
      );
      engineRef.current.setOffensivePlay(cpuOffense);
      engineRef.current.setDefensivePlay(play as DefensivePlay);
    }
  }, [managerState, playState, isUserOnOffense]);

  // SNAP
  const snap = useCallback(() => {
    engineRef.current?.snap();
  }, []);

  // PLAYER CONTROLS
  const moveBallCarrier = useCallback((direction: Vector2) => {
    engineRef.current?.moveBallCarrier(direction);
  }, []);

  const throwToSpot = useCallback((location: Vector2) => {
    engineRef.current?.throwToSpot(location);
  }, []);

  const handoff = useCallback(() => {
    if (!playState) return;
    const rb = playState.offensivePlayers.find(p => p.rosterPosition === 'RB');
    if (rb) {
      engineRef.current?.handoff(rb.id);
    }
  }, [playState]);

  // SPECIAL TEAMS
  const selectPunt = useCallback(() => {
    managerRef.current?.selectSpecialTeams('PUNT');
  }, []);

  const selectFieldGoal = useCallback(() => {
    managerRef.current?.selectSpecialTeams('FIELD_GOAL');
  }, []);

  const executePunt = useCallback(() => {
    const result = managerRef.current?.executePunt();
    if (result) {
      setLastKickResult(result);
    }
  }, []);

  const attemptFieldGoal = useCallback(() => {
    const result = managerRef.current?.attemptFieldGoal();
    if (result) {
      setLastKickResult(result);
    }
  }, []);

  const cancelSpecialTeams = useCallback(() => {
    managerRef.current?.cancelSpecialTeams();
  }, []);

  // PAT
  const choosePAT = useCallback(() => {
    managerRef.current?.choosePAT();
  }, []);

  const chooseTwoPoint = useCallback(() => {
    managerRef.current?.chooseTwoPoint();
  }, []);

  const executePAT = useCallback(() => {
    const result = managerRef.current?.executePAT();
    if (result) {
      setLastKickResult(result);
    }
  }, []);

  // HALFTIME
  const endHalftime = useCallback(() => {
    managerRef.current?.endHalftime();
  }, []);

  // NEXT PLAY (after whistle) - sync engine result to manager
  const nextPlay = useCallback(() => {
    if (!playState || !managerState) return;

    const result = playState.lastResult;
    if (result) {
      managerRef.current?.onPlayEnd(
        result.yardsGained,
        result.touchdown,
        result.turnover,
        result.safety
      );
    }
    engineRef.current?.resetForNextPlay();
    setLastKickResult(null);
  }, [playState, managerState]);

  return {
    // State
    playState,
    managerState,
    isUserOnOffense,
    lastKickResult,

    // Playbooks
    offensivePlaybook: OFFENSIVE_PLAYBOOK,
    defensivePlaybook: DEFENSIVE_PLAYBOOK,

    // Game flow
    coinToss,
    executeKickoff,
    endHalftime,

    // Play execution
    selectPlay,
    snap,
    moveBallCarrier,
    throwToSpot,
    handoff,
    nextPlay,

    // Special teams
    selectPunt,
    selectFieldGoal,
    executePunt,
    attemptFieldGoal,
    cancelSpecialTeams,

    // PAT
    choosePAT,
    chooseTwoPoint,
    executePAT,

    // Helpers
    isInFieldGoalRange: useCallback(() => {
      return managerRef.current?.isInFieldGoalRange() ?? false;
    }, []),
  };
}
