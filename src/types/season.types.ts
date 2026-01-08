/**
 * ILLEGAL MOTION - Season Types
 *
 * Season structure, schedule, standings, and progression.
 * Shorter seasons (8-12 games) for faster gameplay loops.
 */

import type { GameSummary } from './game.types';

// =============================================================================
// SEASON PHASE
// =============================================================================

export type SeasonPhase =
  // Active season
  | 'PRESEASON'           // Training, roster cuts, prep events
  | 'REGULAR_SEASON'      // Weekly games + events
  | 'PLAYOFFS'            // Win or go home
  | 'CHAMPIONSHIP'        // The big game

  // Offseason
  | 'OFFSEASON_START'     // Season recap, awards
  | 'FREE_AGENCY'         // Sign players
  | 'DRAFT'               // Draft new players
  | 'TRAINING_CAMP'       // Final prep before preseason

  // Special
  | 'FIRED'               // You got fired (game over)
  | 'ARRESTED'            // Too much heat (game over)
  | 'CHAMPION';           // Won it all (season complete)

// =============================================================================
// LEAGUE STRUCTURE
// =============================================================================

/**
 * Simplified league structure.
 * 8 teams, 1 division, playoff format.
 */
export interface LeagueStructure {
  teams: LeagueTeam[];
  playoffTeams: number;       // How many make playoffs (default 4)
  regularSeasonGames: number; // Games per team (default 8)
  byeWeeks: number;           // Bye weeks per team (default 1)
}

export interface LeagueTeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  colors: { primary: string; secondary: string };
  isUserTeam: boolean;
  rivalryTeams: string[];     // Team IDs of rivals (extra drama)
  prestige: number;           // 1-5 stars, affects free agency
}

// =============================================================================
// SCHEDULE
// =============================================================================

export interface Season {
  year: number;
  phase: SeasonPhase;
  currentWeek: number;
  totalWeeks: number;         // Regular season weeks

  schedule: ScheduledGame[];
  standings: TeamStanding[];

  // Playoff state
  playoffBracket?: PlayoffBracket;

  // Season records
  seasonRecords: SeasonRecords;

  // Events that occurred
  majorEvents: SeasonEvent[];
}

export interface ScheduledGame {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;

  // Pre-game
  isComplete: boolean;
  isByeWeek: boolean;         // One team has bye
  isRivalry: boolean;         // Rivalry game (bonus stakes)
  isPlayoff: boolean;
  playoffRound?: PlayoffRound;

  // Post-game
  result?: GameResult;
  summary?: GameSummary;

  // Betting/Predictions (for dirty cards)
  spreadLine?: number;        // Point spread
  overUnder?: number;         // Total points line
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  winnerId: string;
  isOvertime: boolean;

  // Key stats
  homeYards: number;
  awayYards: number;
  homeTurnovers: number;
  awayTurnovers: number;

  // Dirty play tracking
  dirtyPlaysAttempted: number;
  dirtyPlaysCaught: number;
  heatGenerated: number;
}

// =============================================================================
// STANDINGS
// =============================================================================

export interface TeamStanding {
  teamId: string;
  rank: number;               // Current position

  // Record
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;

  // Points
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;

  // Streaks
  currentStreak: number;      // Positive = wins, negative = losses
  longestWinStreak: number;
  longestLossStreak: number;

  // Playoff picture
  playoffSeed: number | null; // Null if not in playoff position
  magicNumber: number | null; // Games to clinch (null if eliminated)
  isEliminated: boolean;
  isClinched: boolean;

  // Division (if applicable)
  divisionRecord?: { wins: number; losses: number };
}

/** Sort standings by rank */
export function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  return [...standings].sort((a, b) => {
    // Win percentage first
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    // Point differential as tiebreaker
    return b.pointDifferential - a.pointDifferential;
  });
}

// =============================================================================
// PLAYOFFS
// =============================================================================

export type PlayoffRound =
  | 'WILD_CARD'           // First round
  | 'DIVISIONAL'          // Second round
  | 'CONFERENCE'          // Conference championship
  | 'CHAMPIONSHIP';       // The big game

export interface PlayoffBracket {
  round: PlayoffRound;
  matchups: PlayoffMatchup[];
  eliminatedTeams: string[];
  championId: string | null;
}

export interface PlayoffMatchup {
  id: string;
  round: PlayoffRound;
  homeTeamId: string;         // Higher seed
  awayTeamId: string;         // Lower seed
  homeSeed: number;
  awaySeed: number;

  gameId?: string;            // Reference to scheduled game
  winnerId?: string;
  isComplete: boolean;
}

/** Generate playoff bracket from standings */
export function generatePlayoffBracket(
  standings: TeamStanding[],
  playoffTeams: number
): PlayoffBracket {
  const sorted = sortStandings(standings);
  const qualifiedTeams = sorted.slice(0, playoffTeams);

  // Simple bracket: 1v4, 2v3 for 4-team playoff
  const matchups: PlayoffMatchup[] = [];

  if (playoffTeams === 4) {
    matchups.push({
      id: 'semi-1',
      round: 'DIVISIONAL',
      homeTeamId: qualifiedTeams[0].teamId,
      awayTeamId: qualifiedTeams[3].teamId,
      homeSeed: 1,
      awaySeed: 4,
      isComplete: false,
    });
    matchups.push({
      id: 'semi-2',
      round: 'DIVISIONAL',
      homeTeamId: qualifiedTeams[1].teamId,
      awayTeamId: qualifiedTeams[2].teamId,
      homeSeed: 2,
      awaySeed: 3,
      isComplete: false,
    });
  }

  return {
    round: 'DIVISIONAL',
    matchups,
    eliminatedTeams: sorted.slice(playoffTeams).map(s => s.teamId),
    championId: null,
  };
}

// =============================================================================
// SEASON RECORDS & AWARDS
// =============================================================================

export interface SeasonRecords {
  // User team records
  userTeamRecord: { wins: number; losses: number };
  userPlayoffResult: PlayoffResult | null;

  // League leaders
  passingLeader: { playerId: string; yards: number };
  rushingLeader: { playerId: string; yards: number };
  scoringLeader: { teamId: string; points: number };
  defenseLeader: { teamId: string; pointsAllowed: number };

  // Notable achievements
  perfectWeeks: number;           // Weeks with perfect prediction
  comebackWins: number;
  blowoutWins: number;
  dirtyWins: number;              // Wins using dirty cards

  // Dubious honors
  scandalCount: number;
  totalHeatGenerated: number;
  bribesAttempted: number;
  playersSuspended: number;
}

export type PlayoffResult =
  | 'MISSED_PLAYOFFS'
  | 'WILD_CARD_LOSS'
  | 'DIVISIONAL_LOSS'
  | 'CONFERENCE_LOSS'
  | 'CHAMPIONSHIP_LOSS'
  | 'CHAMPION';

// =============================================================================
// SEASON EVENTS (Major moments)
// =============================================================================

export interface SeasonEvent {
  week: number;
  type: SeasonEventType;
  title: string;
  description: string;
  teamsInvolved: string[];
  playersInvolved: string[];
  impact: string;
}

export type SeasonEventType =
  | 'TRADE'                   // Major trade
  | 'INJURY'                  // Star player injury
  | 'SUSPENSION'              // League suspension
  | 'RECORD_BROKEN'           // Record achievement
  | 'UPSET'                   // Major upset
  | 'SCANDAL'                 // Big scandal
  | 'FIRING'                  // Coach/GM fired
  | 'RETIREMENT'              // Player retirement
  | 'ARREST'                  // Criminal charges
  | 'INVESTIGATION';          // League investigation

// =============================================================================
// WEEK STRUCTURE
// =============================================================================

export interface Week {
  number: number;
  phase: WeekPhase;

  // Events
  eventsToResolve: string[];      // Event IDs
  eventsCompleted: string[];

  // Game
  scheduledGameId: string | null;
  gameComplete: boolean;
  isByeWeek: boolean;

  // State changes this week
  rosterMoves: RosterMove[];
  meterChanges: MeterChange[];
}

export type WeekPhase =
  | 'EVENTS'              // Resolving weekly events
  | 'PREPARATION'         // Pre-game decisions
  | 'GAME_DAY'            // Playing the game
  | 'AFTERMATH'           // Post-game consequences
  | 'COMPLETE';           // Week done, advance

export interface RosterMove {
  type: 'SIGN' | 'CUT' | 'TRADE' | 'INJURY' | 'SUSPENSION' | 'RETURN';
  playerId: string;
  description: string;
}

export interface MeterChange {
  meter: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

// =============================================================================
// OFFSEASON
// =============================================================================

export interface OffseasonState {
  phase: OffseasonPhase;

  // Free Agency
  availableFreeAgents: string[];    // Player IDs
  signedPlayers: string[];
  freeAgencyBudget: number;

  // Draft
  draftOrder: string[];             // Team IDs in draft order
  draftPicks: DraftPick[];
  availableDraftees: string[];

  // Camp
  rosterCutDeadline: boolean;
  trainingCampComplete: boolean;
}

export type OffseasonPhase =
  | 'AWARDS'              // Season awards
  | 'FREE_AGENCY_OPEN'    // Can sign FAs
  | 'FREE_AGENCY_FRENZY'  // Early FA period
  | 'FREE_AGENCY_QUIET'   // Bargains available
  | 'PRE_DRAFT'           // Scouting
  | 'DRAFT'               // Draft day
  | 'POST_DRAFT'          // Signing undrafted
  | 'TRAINING_CAMP'       // Final roster moves
  | 'COMPLETE';

export interface DraftPick {
  round: number;
  pick: number;
  teamId: string;
  playerId?: string;              // Null until picked
  tradedTo?: string;              // If pick was traded
}

// =============================================================================
// SEASON HELPERS
// =============================================================================

/** Get current game for user team */
export function getCurrentGame(season: Season, userTeamId: string): ScheduledGame | null {
  return season.schedule.find(
    game =>
      game.week === season.currentWeek &&
      !game.isComplete &&
      (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId)
  ) || null;
}

/** Get user's standing */
export function getUserStanding(season: Season, userTeamId: string): TeamStanding | null {
  return season.standings.find(s => s.teamId === userTeamId) || null;
}

/** Check if playoffs are clinched */
export function hasClinchedPlayoffs(standing: TeamStanding): boolean {
  return standing.isClinched;
}

/** Check if eliminated from playoffs */
export function isEliminatedFromPlayoffs(standing: TeamStanding): boolean {
  return standing.isEliminated;
}

/** Get playoff picture description */
export function getPlayoffPictureDescription(standing: TeamStanding): string {
  if (standing.isClinched) {
    return `Clinched #${standing.playoffSeed} seed`;
  }
  if (standing.isEliminated) {
    return 'Eliminated from playoff contention';
  }
  if (standing.magicNumber !== null) {
    return `Magic number: ${standing.magicNumber}`;
  }
  return 'In the hunt';
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SEASON_DEFAULTS = {
  REGULAR_SEASON_WEEKS: 8,
  PLAYOFF_TEAMS: 4,
  BYE_WEEKS: 1,
  EVENTS_PER_WEEK_MIN: 1,
  EVENTS_PER_WEEK_MAX: 2,
};

export const PLAYOFF_ROUND_NAMES: Record<PlayoffRound, string> = {
  WILD_CARD: 'Wild Card Round',
  DIVISIONAL: 'Semifinal',
  CONFERENCE: 'Conference Championship',
  CHAMPIONSHIP: 'The Championship',
};
