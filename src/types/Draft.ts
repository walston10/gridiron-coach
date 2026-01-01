import type { Player, PlayerStats } from './Player';

export type DraftProspect = {
  player: Player;
  scoutedStats: Partial<PlayerStats>;
  combineResults: {
    fortyYard: number | null;
    verticalJump: number | null;
    benchPress: number | null;
  } | null;
  projectedRound: number;
  isFullyScouted: boolean;
  userInterest: 'NONE' | 'WATCHING' | 'TARGET';
};

export type DraftPick = {
  round: number;
  pick: number;
  originalTeamId: string;
  currentTeamId: string;
  selectedPlayerId: string | null;
};

export type Draft = {
  year: number;
  prospects: DraftProspect[];
  picks: DraftPick[];
  currentRound: number;
  currentPick: number;
  isComplete: boolean;
};