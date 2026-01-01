export type SeasonPhase = 
  | 'PRESEASON'
  | 'REGULAR_SEASON' 
  | 'PLAYOFFS' 
  | 'OFFSEASON_START'
  | 'STAFF_DECISIONS'
  | 'FREE_AGENCY'
  | 'DRAFT'
  | 'TRAINING_CAMP';

export type ScheduleGame = {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
  isPlayoffs: boolean;
};

export type Standings = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  divisionWins: number;
  divisionLosses: number;
};

export type Season = {
  year: number;
  phase: SeasonPhase;
  currentWeek: number;
  schedule: ScheduleGame[];
  standings: Standings[];
};