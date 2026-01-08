/**
 * ILLEGAL MOTION - Season Manager Engine
 *
 * Handles season logic, AI game simulation, playoff progression,
 * and integration with the management system.
 */

import type {
  Season,
  SeasonPhase,
  ScheduledGame,
  TeamStanding,
  PlayoffMatchup,
  PlayoffRound,
  GameResult,
  SeasonEvent,
  SeasonEventType,
  LeagueTeam,
} from '../types/season.types';
import type { AITeam, GMPersonality } from '../stores/seasonStore';

// =============================================================================
// SEASON MANAGER CLASS
// =============================================================================

export class SeasonManager {
  private season: Season;
  private aiTeams: Map<string, AITeam>;
  private userTeamId: string;
  private config: SeasonConfig;

  constructor(config: SeasonConfig) {
    this.config = config;
    this.season = this.createEmptySeason();
    this.aiTeams = new Map();
    this.userTeamId = '';
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  initialize(userTeamId: string, teams: LeagueTeam[]): Season {
    this.userTeamId = userTeamId;
    this.initializeAITeams(teams);
    this.season = this.createSeason(teams);
    this.generateSchedule(teams);
    return this.season;
  }

  private createEmptySeason(): Season {
    return {
      year: new Date().getFullYear(),
      phase: 'PRESEASON',
      currentWeek: 0,
      totalWeeks: 0,
      schedule: [],
      standings: [],
      seasonRecords: {
        userTeamRecord: { wins: 0, losses: 0 },
        userPlayoffResult: null,
        passingLeader: { playerId: '', yards: 0 },
        rushingLeader: { playerId: '', yards: 0 },
        scoringLeader: { teamId: '', points: 0 },
        defenseLeader: { teamId: '', pointsAllowed: 999 },
        perfectWeeks: 0,
        comebackWins: 0,
        blowoutWins: 0,
        dirtyWins: 0,
        scandalCount: 0,
        totalHeatGenerated: 0,
        bribesAttempted: 0,
        playersSuspended: 0,
      },
      majorEvents: [],
    };
  }

  private createSeason(teams: LeagueTeam[]): Season {
    const standings: TeamStanding[] = teams.map((team, index) => ({
      teamId: team.id,
      rank: index + 1,
      wins: 0,
      losses: 0,
      ties: 0,
      winPercentage: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      playoffSeed: null,
      magicNumber: null,
      isEliminated: false,
      isClinched: false,
    }));

    return {
      year: new Date().getFullYear(),
      phase: 'REGULAR_SEASON',
      currentWeek: 1,
      totalWeeks: this.config.gamesPerSeason + this.config.byeWeeks,
      schedule: [],
      standings,
      seasonRecords: {
        userTeamRecord: { wins: 0, losses: 0 },
        userPlayoffResult: null,
        passingLeader: { playerId: '', yards: 0 },
        rushingLeader: { playerId: '', yards: 0 },
        scoringLeader: { teamId: '', points: 0 },
        defenseLeader: { teamId: '', pointsAllowed: 999 },
        perfectWeeks: 0,
        comebackWins: 0,
        blowoutWins: 0,
        dirtyWins: 0,
        scandalCount: 0,
        totalHeatGenerated: 0,
        bribesAttempted: 0,
        playersSuspended: 0,
      },
      majorEvents: [],
    };
  }

  private initializeAITeams(teams: LeagueTeam[]): void {
    const personalities: GMPersonality[] = [
      'AGGRESSIVE', 'CONSERVATIVE', 'BALANCED', 'REBUILDING',
      'WIN_NOW', 'ANALYTICS', 'OLD_SCHOOL', 'GAMBLER',
    ];

    teams.forEach((team, index) => {
      if (team.id === this.userTeamId) return;

      const personality = personalities[index % personalities.length];
      const baseRating = 50 + (team.prestige * 8);

      const aiTeam: AITeam = {
        ...team,
        gmName: generateGMName(personality),
        gmPersonality: personality,
        rosterStrength: clamp(baseRating + randomVariance(10), 60, 95),
        offenseRating: clamp(baseRating + randomVariance(10), 50, 99),
        defenseRating: clamp(baseRating + randomVariance(10), 50, 99),
        specialTeamsRating: clamp(baseRating + randomVariance(10), 50, 99),
        injury: Math.random() * 0.3,
        momentum: 0,
      };

      this.aiTeams.set(team.id, aiTeam);
    });
  }

  // =============================================================================
  // SCHEDULE GENERATION
  // =============================================================================

  private generateSchedule(teams: LeagueTeam[]): void {
    const schedule: ScheduledGame[] = [];
    const teamIds = teams.map(t => t.id);
    const totalWeeks = this.config.gamesPerSeason + this.config.byeWeeks;

    // Assign bye weeks
    const byeWeeks = this.assignByeWeeks(teamIds, totalWeeks);
    let gameId = 0;

    for (let week = 1; week <= totalWeeks; week++) {
      const teamsWithBye = teamIds.filter(id => byeWeeks.get(id) === week);
      const availableTeams = teamIds.filter(id => !teamsWithBye.includes(id));

      // Create bye week games (placeholder)
      for (const teamId of teamsWithBye) {
        schedule.push({
          id: `game-${gameId++}`,
          week,
          homeTeamId: teamId,
          awayTeamId: '',
          isComplete: false,
          isByeWeek: true,
          isRivalry: false,
          isPlayoff: false,
        });
      }

      // Match remaining teams
      const matchups = this.createWeekMatchups(availableTeams, schedule, week);

      for (const [home, away] of matchups) {
        const homeTeam = this.aiTeams.get(home) || teams.find(t => t.id === home);
        const isRivalry = homeTeam?.rivalryTeams?.includes(away) || false;

        schedule.push({
          id: `game-${gameId++}`,
          week,
          homeTeamId: home,
          awayTeamId: away,
          isComplete: false,
          isByeWeek: false,
          isRivalry,
          isPlayoff: false,
          spreadLine: this.generateSpreadLine(home, away),
          overUnder: this.generateOverUnder(home, away),
        });
      }
    }

    this.season.schedule = schedule;
  }

  private assignByeWeeks(teamIds: string[], totalWeeks: number): Map<string, number> {
    const byeWeeks = new Map<string, number>();

    // Spread bye weeks across middle portion of season
    const byeStart = Math.floor(totalWeeks * 0.3);
    const byeEnd = Math.floor(totalWeeks * 0.7);
    const byeRange = byeEnd - byeStart;

    teamIds.forEach((teamId, index) => {
      const byeWeek = byeStart + (index % byeRange) + 1;
      byeWeeks.set(teamId, byeWeek);
    });

    return byeWeeks;
  }

  private createWeekMatchups(
    availableTeams: string[],
    existingSchedule: ScheduledGame[],
    _week: number
  ): Array<[string, string]> {
    const matchups: Array<[string, string]> = [];
    const shuffled = [...availableTeams].sort(() => Math.random() - 0.5);
    const matched = new Set<string>();

    // Prioritize user team matchup
    if (shuffled.includes(this.userTeamId)) {
      const userIndex = shuffled.indexOf(this.userTeamId);
      const opponents = shuffled.filter((id, i) => i !== userIndex && !matched.has(id));

      // Find opponent user hasn't played much
      const opponent = this.findBestOpponent(this.userTeamId, opponents, existingSchedule);

      if (opponent) {
        const isHome = Math.random() > 0.5;
        matchups.push(isHome ? [this.userTeamId, opponent] : [opponent, this.userTeamId]);
        matched.add(this.userTeamId);
        matched.add(opponent);
      }
    }

    // Match remaining teams
    for (const teamId of shuffled) {
      if (matched.has(teamId)) continue;

      const opponents = shuffled.filter(id => id !== teamId && !matched.has(id));
      const opponent = this.findBestOpponent(teamId, opponents, existingSchedule);

      if (opponent) {
        matchups.push([teamId, opponent]);
        matched.add(teamId);
        matched.add(opponent);
      }
    }

    return matchups;
  }

  private findBestOpponent(
    teamId: string,
    candidates: string[],
    existingSchedule: ScheduledGame[]
  ): string | null {
    if (candidates.length === 0) return null;

    // Count existing matchups
    const matchupCounts = new Map<string, number>();

    for (const candidateId of candidates) {
      const count = existingSchedule.filter(
        g => !g.isByeWeek && (
          (g.homeTeamId === teamId && g.awayTeamId === candidateId) ||
          (g.awayTeamId === teamId && g.homeTeamId === candidateId)
        )
      ).length;
      matchupCounts.set(candidateId, count);
    }

    // Sort by fewest matchups, then random
    const sorted = [...candidates].sort((a, b) => {
      const countDiff = (matchupCounts.get(a) || 0) - (matchupCounts.get(b) || 0);
      return countDiff !== 0 ? countDiff : Math.random() - 0.5;
    });

    return sorted[0];
  }

  private generateSpreadLine(homeId: string, awayId: string): number {
    const homeTeam = this.aiTeams.get(homeId);
    const awayTeam = this.aiTeams.get(awayId);

    if (!homeTeam || !awayTeam) return 0;

    const homeAdvantage = 3;
    const powerDiff = (homeTeam.rosterStrength - awayTeam.rosterStrength) / 3;

    return Math.round(powerDiff + homeAdvantage);
  }

  private generateOverUnder(homeId: string, awayId: string): number {
    const homeTeam = this.aiTeams.get(homeId);
    const awayTeam = this.aiTeams.get(awayId);

    if (!homeTeam || !awayTeam) return 45;

    const avgOffense = (homeTeam.offenseRating + awayTeam.offenseRating) / 2;
    const avgDefense = (homeTeam.defenseRating + awayTeam.defenseRating) / 2;

    // Higher offense and lower defense = higher total
    const total = 40 + (avgOffense - 70) / 2 - (avgDefense - 70) / 3;

    return Math.round(total / 0.5) * 0.5; // Round to nearest 0.5
  }

  // =============================================================================
  // GAME SIMULATION
  // =============================================================================

  simulateGame(homeTeamId: string, awayTeamId: string, isRivalry: boolean = false): GameResult {
    const homeTeam = this.aiTeams.get(homeTeamId);
    const awayTeam = this.aiTeams.get(awayTeamId);

    if (!homeTeam || !awayTeam) {
      throw new Error(`Cannot simulate game: team not found`);
    }

    return simulateAIGame(homeTeam, awayTeam, isRivalry);
  }

  simulateWeekGames(): GameResult[] {
    const results: GameResult[] = [];
    const currentWeek = this.season.currentWeek;

    const weekGames = this.season.schedule.filter(
      g => g.week === currentWeek &&
           !g.isComplete &&
           !g.isByeWeek &&
           g.homeTeamId !== this.userTeamId &&
           g.awayTeamId !== this.userTeamId
    );

    for (const game of weekGames) {
      const result = this.simulateGame(game.homeTeamId, game.awayTeamId, game.isRivalry);

      // Update game
      game.isComplete = true;
      game.result = result;

      // Update standings
      this.updateStandings(result, game.homeTeamId, game.awayTeamId);

      // Update team momentum
      this.updateTeamMomentum(game.homeTeamId, result.homeScore > result.awayScore);
      this.updateTeamMomentum(game.awayTeamId, result.awayScore > result.homeScore);

      // Check for notable events
      const event = this.checkForSeasonEvent(game, result);
      if (event) {
        this.season.majorEvents.push(event);
      }

      results.push(result);
    }

    return results;
  }

  // =============================================================================
  // STANDINGS MANAGEMENT
  // =============================================================================

  updateStandings(result: GameResult, homeTeamId: string, awayTeamId: string): void {
    const homeWon = result.homeScore > result.awayScore;

    for (const standing of this.season.standings) {
      if (standing.teamId === homeTeamId) {
        if (homeWon) {
          standing.wins++;
          standing.currentStreak = standing.currentStreak >= 0 ? standing.currentStreak + 1 : 1;
          standing.longestWinStreak = Math.max(standing.longestWinStreak, standing.currentStreak);
        } else {
          standing.losses++;
          standing.currentStreak = standing.currentStreak <= 0 ? standing.currentStreak - 1 : -1;
          standing.longestLossStreak = Math.max(standing.longestLossStreak, Math.abs(standing.currentStreak));
        }
        standing.pointsFor += result.homeScore;
        standing.pointsAgainst += result.awayScore;
        standing.pointDifferential = standing.pointsFor - standing.pointsAgainst;
        standing.winPercentage = standing.wins / (standing.wins + standing.losses + standing.ties);
      }

      if (standing.teamId === awayTeamId) {
        if (!homeWon) {
          standing.wins++;
          standing.currentStreak = standing.currentStreak >= 0 ? standing.currentStreak + 1 : 1;
          standing.longestWinStreak = Math.max(standing.longestWinStreak, standing.currentStreak);
        } else {
          standing.losses++;
          standing.currentStreak = standing.currentStreak <= 0 ? standing.currentStreak - 1 : -1;
          standing.longestLossStreak = Math.max(standing.longestLossStreak, Math.abs(standing.currentStreak));
        }
        standing.pointsFor += result.awayScore;
        standing.pointsAgainst += result.homeScore;
        standing.pointDifferential = standing.pointsFor - standing.pointsAgainst;
        standing.winPercentage = standing.wins / (standing.wins + standing.losses + standing.ties);
      }
    }

    // Re-rank
    this.season.standings.sort((a, b) => {
      if (a.winPercentage !== b.winPercentage) return b.winPercentage - a.winPercentage;
      return b.pointDifferential - a.pointDifferential;
    });

    this.season.standings.forEach((s, i) => {
      s.rank = i + 1;
    });
  }

  calculatePlayoffPicture(): void {
    const { standings } = this.season;
    const gamesRemaining = this.season.totalWeeks - this.season.currentWeek;

    standings.forEach((standing, index) => {
      // Set playoff seed for top teams
      standing.playoffSeed = index < this.config.playoffTeams ? index + 1 : null;

      // Calculate magic number
      if (index < this.config.playoffTeams) {
        const teamBelowCutoff = standings[this.config.playoffTeams];
        if (teamBelowCutoff) {
          standing.magicNumber = Math.max(0,
            (gamesRemaining + 1) - (standing.wins - teamBelowCutoff.wins)
          );
        }
      }

      // Check clinch/elimination
      const maxPossibleWins = standing.wins + gamesRemaining;
      const currentCutoffWins = standings[this.config.playoffTeams - 1]?.wins || 0;

      standing.isClinched = standing.magicNumber !== null && standing.magicNumber <= 0;
      standing.isEliminated = maxPossibleWins < currentCutoffWins;
    });
  }

  // =============================================================================
  // WEEK PROGRESSION
  // =============================================================================

  advanceWeek(): SeasonPhase {
    this.season.currentWeek++;

    // Check if regular season is complete
    if (this.season.currentWeek > this.season.totalWeeks) {
      this.calculatePlayoffPicture();

      const userStanding = this.season.standings.find(s => s.teamId === this.userTeamId);

      if (userStanding && userStanding.playoffSeed !== null && userStanding.playoffSeed <= this.config.playoffTeams) {
        this.season.phase = 'PLAYOFFS';
        this.initializePlayoffs();
      } else {
        this.season.phase = 'OFFSEASON_START';
        this.season.seasonRecords.userPlayoffResult = 'MISSED_PLAYOFFS';
      }
    }

    // Apply weekly changes
    this.applyWeeklyDevelopment();
    this.calculatePlayoffPicture();

    return this.season.phase;
  }

  private applyWeeklyDevelopment(): void {
    // Slight rating fluctuations for AI teams
    for (const [id, team] of this.aiTeams) {
      const offenseChange = randomVariance(2);
      const defenseChange = randomVariance(2);

      team.offenseRating = clamp(team.offenseRating + offenseChange, 50, 99);
      team.defenseRating = clamp(team.defenseRating + defenseChange, 50, 99);

      // Injury effects (random chance to temporarily reduce ratings)
      if (Math.random() < team.injury) {
        const injuryImpact = Math.floor(Math.random() * 5) + 1;
        team.rosterStrength = clamp(team.rosterStrength - injuryImpact, 60, 95);
      }

      this.aiTeams.set(id, team);
    }
  }

  private updateTeamMomentum(teamId: string, won: boolean): void {
    const team = this.aiTeams.get(teamId);
    if (team) {
      team.momentum = clamp(team.momentum + (won ? 1 : -1), -5, 5);
      this.aiTeams.set(teamId, team);
    }
  }

  // =============================================================================
  // PLAYOFFS
  // =============================================================================

  private initializePlayoffs(): void {
    const qualifiedTeams = this.season.standings
      .filter(s => s.playoffSeed !== null && s.playoffSeed <= this.config.playoffTeams)
      .sort((a, b) => (a.playoffSeed || 99) - (b.playoffSeed || 99));

    const matchups: PlayoffMatchup[] = [];

    if (this.config.playoffTeams === 4) {
      // Semi-finals: 1 vs 4, 2 vs 3
      matchups.push(this.createPlayoffMatchup('semi-1', 'DIVISIONAL', qualifiedTeams[0], qualifiedTeams[3]));
      matchups.push(this.createPlayoffMatchup('semi-2', 'DIVISIONAL', qualifiedTeams[1], qualifiedTeams[2]));
    } else if (this.config.playoffTeams === 6) {
      // Wild Card: 3 vs 6, 4 vs 5 (1 & 2 have byes)
      matchups.push(this.createPlayoffMatchup('wild-1', 'WILD_CARD', qualifiedTeams[2], qualifiedTeams[5]));
      matchups.push(this.createPlayoffMatchup('wild-2', 'WILD_CARD', qualifiedTeams[3], qualifiedTeams[4]));
    }

    this.season.playoffBracket = {
      round: this.config.playoffTeams === 6 ? 'WILD_CARD' : 'DIVISIONAL',
      matchups,
      eliminatedTeams: this.season.standings
        .filter(s => s.playoffSeed === null || s.playoffSeed > this.config.playoffTeams)
        .map(s => s.teamId),
      championId: null,
    };
  }

  private createPlayoffMatchup(
    id: string,
    round: PlayoffRound,
    homeTeam: TeamStanding,
    awayTeam: TeamStanding
  ): PlayoffMatchup {
    return {
      id,
      round,
      homeTeamId: homeTeam.teamId,
      awayTeamId: awayTeam.teamId,
      homeSeed: homeTeam.playoffSeed || 1,
      awaySeed: awayTeam.playoffSeed || 8,
      isComplete: false,
    };
  }

  advancePlayoffRound(winnerId: string, loserId: string): boolean {
    if (!this.season.playoffBracket) return false;

    const bracket = this.season.playoffBracket;

    // Find and complete the matchup
    const matchup = bracket.matchups.find(
      m => !m.isComplete && (m.homeTeamId === winnerId || m.awayTeamId === winnerId)
    );

    if (matchup) {
      matchup.winnerId = winnerId;
      matchup.isComplete = true;
      bracket.eliminatedTeams.push(loserId);
    }

    // Check if round is complete
    const currentRoundMatchups = bracket.matchups.filter(m => m.round === bracket.round);
    const allComplete = currentRoundMatchups.every(m => m.isComplete);

    if (allComplete) {
      return this.advanceToNextRound();
    }

    return false;
  }

  private advanceToNextRound(): boolean {
    if (!this.season.playoffBracket) return false;

    const bracket = this.season.playoffBracket;
    const winners = bracket.matchups
      .filter(m => m.isComplete && m.winnerId)
      .map(m => m.winnerId!);

    const winnerStandings = this.season.standings
      .filter(s => winners.includes(s.teamId))
      .sort((a, b) => (a.playoffSeed || 99) - (b.playoffSeed || 99));

    let nextRound: PlayoffRound;

    switch (bracket.round) {
      case 'WILD_CARD':
        nextRound = 'DIVISIONAL';
        // Add 1 & 2 seeds vs wild card winners
        const team1 = this.season.standings.find(s => s.playoffSeed === 1)!;
        const team2 = this.season.standings.find(s => s.playoffSeed === 2)!;

        bracket.matchups.push(
          this.createPlayoffMatchup('div-1', 'DIVISIONAL', team1, winnerStandings[winnerStandings.length - 1]),
          this.createPlayoffMatchup('div-2', 'DIVISIONAL', team2, winnerStandings[0])
        );
        break;

      case 'DIVISIONAL':
        if (winnerStandings.length >= 2) {
          nextRound = 'CHAMPIONSHIP';
          bracket.matchups.push(
            this.createPlayoffMatchup('championship', 'CHAMPIONSHIP', winnerStandings[0], winnerStandings[1])
          );
        } else {
          return false;
        }
        break;

      case 'CHAMPIONSHIP':
        // Season complete!
        bracket.championId = winners[0];
        this.season.phase = 'CHAMPION';

        // Update user's playoff result
        if (winners[0] === this.userTeamId) {
          this.season.seasonRecords.userPlayoffResult = 'CHAMPION';
        } else if (bracket.eliminatedTeams.includes(this.userTeamId)) {
          this.season.seasonRecords.userPlayoffResult = 'CHAMPIONSHIP_LOSS';
        }

        return true;

      default:
        return false;
    }

    bracket.round = nextRound;
    return false;
  }

  // =============================================================================
  // SEASON EVENTS
  // =============================================================================

  private checkForSeasonEvent(game: ScheduledGame, result: GameResult): SeasonEvent | null {
    // Major upset (big underdog wins)
    const homeTeam = this.aiTeams.get(game.homeTeamId);
    const awayTeam = this.aiTeams.get(game.awayTeamId);

    if (homeTeam && awayTeam) {
      const powerDiff = Math.abs(homeTeam.rosterStrength - awayTeam.rosterStrength);
      const expectedWinner = homeTeam.rosterStrength > awayTeam.rosterStrength ? game.homeTeamId : game.awayTeamId;

      if (powerDiff >= 15 && result.winnerId !== expectedWinner) {
        return {
          week: this.season.currentWeek,
          type: 'UPSET' as SeasonEventType,
          title: 'MAJOR UPSET!',
          description: `${this.getTeamName(result.winnerId)} pulls off a stunning upset!`,
          teamsInvolved: [game.homeTeamId, game.awayTeamId],
          playersInvolved: [],
          impact: 'League standings shaken up',
        };
      }
    }

    // Blowout
    const scoreDiff = Math.abs(result.homeScore - result.awayScore);
    if (scoreDiff >= 28) {
      return {
        week: this.season.currentWeek,
        type: 'RECORD_BROKEN' as SeasonEventType,
        title: 'BLOWOUT!',
        description: `${this.getTeamName(result.winnerId)} dominates with a ${scoreDiff}-point victory!`,
        teamsInvolved: [game.homeTeamId, game.awayTeamId],
        playersInvolved: [],
        impact: 'Statement win',
      };
    }

    return null;
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  getSeason(): Season {
    return this.season;
  }

  getAITeam(teamId: string): AITeam | undefined {
    return this.aiTeams.get(teamId);
  }

  getAllAITeams(): AITeam[] {
    return Array.from(this.aiTeams.values());
  }

  getUserGame(): ScheduledGame | null {
    return this.season.schedule.find(
      g => g.week === this.season.currentWeek &&
           (g.homeTeamId === this.userTeamId || g.awayTeamId === this.userTeamId)
    ) || null;
  }

  getWeekSchedule(week: number): ScheduledGame[] {
    return this.season.schedule.filter(g => g.week === week);
  }

  private getTeamName(teamId: string): string {
    const team = this.aiTeams.get(teamId);
    return team ? team.name : 'Unknown Team';
  }

  isRegularSeasonComplete(): boolean {
    return this.season.currentWeek > this.season.totalWeeks;
  }

  isPlayoffs(): boolean {
    return this.season.phase === 'PLAYOFFS' || this.season.phase === 'CHAMPIONSHIP';
  }

  isSeasonComplete(): boolean {
    return ['CHAMPION', 'OFFSEASON_START', 'FIRED', 'ARRESTED'].includes(this.season.phase);
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface SeasonConfig {
  gamesPerSeason: number;  // 8, 12, or 17
  playoffTeams: number;    // 4 or 6
  byeWeeks: number;        // 1 or 2
}

export const SEASON_CONFIGS: Record<string, SeasonConfig> = {
  SHORT: {
    gamesPerSeason: 8,
    playoffTeams: 4,
    byeWeeks: 1,
  },
  STANDARD: {
    gamesPerSeason: 12,
    playoffTeams: 4,
    byeWeeks: 1,
  },
  FULL: {
    gamesPerSeason: 17,
    playoffTeams: 6,
    byeWeeks: 2,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomVariance(range: number): number {
  return Math.floor(Math.random() * (range * 2 + 1)) - range;
}

function generateGMName(personality: GMPersonality): string {
  const firstNames = ['Mike', 'Bill', 'Tom', 'John', 'Steve', 'Dave', 'Rick', 'Jim', 'Bob', 'Dan'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson'];
  const nicknames: Record<GMPersonality, string[]> = {
    AGGRESSIVE: ['Gunner', 'Blaze', 'Madman'],
    CONSERVATIVE: ['Steady', 'Rock', 'Foundation'],
    BALANCED: ['Fair', 'Even', 'Balanced'],
    REBUILDING: ['Future', 'Builder', 'Youth'],
    WIN_NOW: ['Winner', 'Champ', 'Ring'],
    ANALYTICS: ['Numbers', 'Stats', 'Data'],
    OLD_SCHOOL: ['Iron', 'Leather', 'Classic'],
    GAMBLER: ['Lucky', 'Dice', 'Risk'],
  };

  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  const nick = nicknames[personality][Math.floor(Math.random() * nicknames[personality].length)];

  return Math.random() > 0.5 ? `${first} "${nick}" ${last}` : `${first} ${last}`;
}

function simulateAIGame(homeTeam: AITeam, awayTeam: AITeam, isRivalry: boolean): GameResult {
  const homeAdvantage = 3;
  const rivalryBonus = isRivalry ? 7 : 0;

  // Expected scores based on ratings
  const homeExpected = 17 +
    (homeTeam.offenseRating - 70) / 5 +
    (70 - awayTeam.defenseRating) / 5 +
    homeAdvantage +
    homeTeam.momentum * 1.5;

  const awayExpected = 17 +
    (awayTeam.offenseRating - 70) / 5 +
    (70 - homeTeam.defenseRating) / 5 +
    awayTeam.momentum * 1.5;

  // Add variance
  const homeVariance = randomVariance(10);
  const awayVariance = randomVariance(10);

  let homeScore = Math.max(0, Math.round(homeExpected + homeVariance + rivalryBonus / 2));
  let awayScore = Math.max(0, Math.round(awayExpected + awayVariance + rivalryBonus / 2));

  // Round to football-like scores
  homeScore = roundToFootballScore(homeScore);
  awayScore = roundToFootballScore(awayScore);

  // No ties
  if (homeScore === awayScore) {
    if (homeTeam.rosterStrength >= awayTeam.rosterStrength) {
      homeScore += 3;
    } else {
      awayScore += 3;
    }
  }

  const winnerId = homeScore > awayScore ? homeTeam.id : awayTeam.id;
  const isOvertime = Math.abs(homeScore - awayScore) <= 3 && Math.random() > 0.7;

  return {
    homeScore,
    awayScore,
    winnerId,
    isOvertime,
    homeYards: 250 + Math.floor(Math.random() * 200),
    awayYards: 250 + Math.floor(Math.random() * 200),
    homeTurnovers: Math.floor(Math.random() * 3),
    awayTurnovers: Math.floor(Math.random() * 3),
    dirtyPlaysAttempted: 0,
    dirtyPlaysCaught: 0,
    heatGenerated: 0,
  };
}

function roundToFootballScore(score: number): number {
  const targets = [0, 3, 6, 7, 10, 13, 14, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35, 38, 41, 42, 45, 48, 49, 52];

  let closest = 0;
  let minDiff = Math.abs(score - closest);

  for (const target of targets) {
    const diff = Math.abs(score - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = target;
    }
  }

  return closest;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { simulateAIGame, roundToFootballScore };
