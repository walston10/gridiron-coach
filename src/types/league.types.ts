/**
 * League System Types
 *
 * 8-team league (7 AI + 1 User)
 * 7-game round-robin season
 * Top 4 make playoffs (single elimination)
 */

// =============================================================================
// TEAM IDENTITY
// =============================================================================

export type OffenseStyle = 'RUN_HEAVY' | 'PASS_HEAVY' | 'BALANCED' | 'EXPLOSIVE' | 'TRICK_HEAVY';
export type DefenseStyle = 'AGGRESSIVE' | 'CONSERVATIVE' | 'BALANCED' | 'BLITZ_HEAVY';

export interface TeamIdentity {
  offenseStyle: OffenseStyle;
  defenseStyle: DefenseStyle;
  overall: number;  // 60-90 range
  description: string;  // "Ground and pound offense with physical defense"
}

export interface StaticTeamInfo {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  identity: TeamIdentity;
}

// =============================================================================
// STANDINGS & SCHEDULE
// =============================================================================

export interface TeamStanding {
  teamId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface ScheduledGame {
  gameId: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  result: GameResult | null;  // null = not played yet
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  homeStats: TeamGameStats;
  awayStats: TeamGameStats;
}

export interface TeamGameStats {
  passYards: number;
  rushYards: number;
  turnovers: number;
  sacks: number;
}

// =============================================================================
// PLAYOFFS
// =============================================================================

export interface PlayoffMatchup {
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  result: GameResult | null;
}

export interface PlayoffBracket {
  semi1: PlayoffMatchup;  // #1 vs #4
  semi2: PlayoffMatchup;  // #2 vs #3
  final: PlayoffMatchup;
}

// =============================================================================
// INJURIES (User team only)
// =============================================================================

export type InjurySeverity = 'QUESTIONABLE' | 'BANGED_UP' | 'INJURED';

export const INJURY_CONFIG: Record<InjurySeverity, {
  buffMultiplier: number;
  weeksMin: number;
  weeksMax: number;
}> = {
  QUESTIONABLE: { buffMultiplier: 0.75, weeksMin: 1, weeksMax: 1 },
  BANGED_UP: { buffMultiplier: 0.50, weeksMin: 1, weeksMax: 2 },
  INJURED: { buffMultiplier: 0.25, weeksMin: 2, weeksMax: 3 },
};

/** Chance of injury per play involving the player (3%) */
export const INJURY_CHANCE_PER_PLAY = 0.03;

export interface PlayerInjury {
  playerId: string;
  playerName: string;
  position: string;
  severity: InjurySeverity;
  weeksRemaining: number;
  buffMultiplier: number;
}

// =============================================================================
// SEASON STATS
// =============================================================================

export interface SeasonTeamStats {
  teamId: string;
  gamesPlayed: number;
  passYards: number;
  rushYards: number;
  pointsScored: number;
  pointsAllowed: number;
  turnovers: number;
  sacks: number;
}

// =============================================================================
// LEAGUE STATE
// =============================================================================

export type SeasonPhase = 'NOT_STARTED' | 'REGULAR_SEASON' | 'PLAYOFFS' | 'COMPLETE';

export interface LeagueState {
  phase: SeasonPhase;
  week: number;  // 1-7 regular, 8 = semis, 9 = final
  schedule: ScheduledGame[];
  standings: TeamStanding[];
  seasonStats: SeasonTeamStats[];
  userInjuries: PlayerInjury[];
  playoffBracket: PlayoffBracket | null;
  championId: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create initial standings for all teams (0-0, 0 PF, 0 PA)
 */
export function createInitialStandings(teamIds: string[]): TeamStanding[] {
  return teamIds.map(teamId => ({
    teamId,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }));
}

/**
 * Create initial season stats for all teams
 */
export function createInitialSeasonStats(teamIds: string[]): SeasonTeamStats[] {
  return teamIds.map(teamId => ({
    teamId,
    gamesPlayed: 0,
    passYards: 0,
    rushYards: 0,
    pointsScored: 0,
    pointsAllowed: 0,
    turnovers: 0,
    sacks: 0,
  }));
}

/**
 * Create empty playoff bracket
 */
export function createEmptyPlayoffBracket(): PlayoffBracket {
  return {
    semi1: { team1Id: null, team2Id: null, winnerId: null, result: null },
    semi2: { team1Id: null, team2Id: null, winnerId: null, result: null },
    final: { team1Id: null, team2Id: null, winnerId: null, result: null },
  };
}

/**
 * Update standings after a game result
 */
export function updateStandingsAfterGame(
  standings: TeamStanding[],
  homeTeamId: string,
  awayTeamId: string,
  result: GameResult
): TeamStanding[] {
  return standings.map(standing => {
    if (standing.teamId === homeTeamId) {
      const won = result.homeScore > result.awayScore;
      return {
        ...standing,
        wins: standing.wins + (won ? 1 : 0),
        losses: standing.losses + (won ? 0 : 1),
        pointsFor: standing.pointsFor + result.homeScore,
        pointsAgainst: standing.pointsAgainst + result.awayScore,
      };
    }
    if (standing.teamId === awayTeamId) {
      const won = result.awayScore > result.homeScore;
      return {
        ...standing,
        wins: standing.wins + (won ? 1 : 0),
        losses: standing.losses + (won ? 0 : 1),
        pointsFor: standing.pointsFor + result.awayScore,
        pointsAgainst: standing.pointsAgainst + result.homeScore,
      };
    }
    return standing;
  });
}

/**
 * Update season stats after a game
 */
export function updateSeasonStatsAfterGame(
  seasonStats: SeasonTeamStats[],
  homeTeamId: string,
  awayTeamId: string,
  result: GameResult
): SeasonTeamStats[] {
  return seasonStats.map(stats => {
    if (stats.teamId === homeTeamId) {
      return {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        passYards: stats.passYards + result.homeStats.passYards,
        rushYards: stats.rushYards + result.homeStats.rushYards,
        pointsScored: stats.pointsScored + result.homeScore,
        pointsAllowed: stats.pointsAllowed + result.awayScore,
        turnovers: stats.turnovers + result.homeStats.turnovers,
        sacks: stats.sacks + result.homeStats.sacks,
      };
    }
    if (stats.teamId === awayTeamId) {
      return {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        passYards: stats.passYards + result.awayStats.passYards,
        rushYards: stats.rushYards + result.awayStats.rushYards,
        pointsScored: stats.pointsScored + result.awayScore,
        pointsAllowed: stats.pointsAllowed + result.homeScore,
        turnovers: stats.turnovers + result.awayStats.turnovers,
        sacks: stats.sacks + result.awayStats.sacks,
      };
    }
    return stats;
  });
}
