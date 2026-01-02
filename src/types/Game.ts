import type { Play } from './Play';
import type { CoverageOverlayData } from '../engine/DefenseAI';

export type GameState = 
  | 'PRE_SNAP' 
  | 'SNAP' 
  | 'PLAY_RUNNING' 
  | 'PLAY_DEAD' 
  | 'SCORING' 
  | 'HALFTIME' 
  | 'GAME_OVER';

export type Down = 1 | 2 | 3 | 4;

export type FieldPosition = {
  yardLine: number;
  down: Down;
  yardsToGo: number;
};

export type GameClock = {
  quarter: 1 | 2 | 3 | 4;
  minutes: number;
  seconds: number;
  isRunning: boolean;
};

export type TeamGameState = {
  teamId: string;
  score: number;
  timeoutsRemaining: number;
};

export type BallCarrier = {
  x: number;
  y: number;
  playerId: string;
  hasBall: boolean;
};

export type LiveGame = {
  id: string;
  state: GameState;
  clock: GameClock;
  fieldPosition: FieldPosition;
  possession: 'home' | 'away';
  homeTeam: TeamGameState;
  awayTeam: TeamGameState;
  currentPlay: Play | null;
  playerPositions: {id: string, x: number, y: number, role: 'offense' | 'defense'}[];
  ballCarrier: BallCarrier | null;
  ballInFlight?: { x: number; y: number; progress: number }; // Ball position during passes
  handoffEffect?: { x: number; y: number; progress: number }; // Visual effect when handoff occurs
  playResult?: {
    yardsGained: number;
    touchdown: boolean;
    sack: boolean;
    turnover: boolean;
    penalty?: {
      type: string;
      team: 'offense' | 'defense';
      yards: number;
      description: string;
      accepted: boolean;
    };
  };
  coverageOverlay?: CoverageOverlayData;
  showCoverageOverlay?: boolean;
};