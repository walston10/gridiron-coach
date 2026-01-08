/**
 * ILLEGAL MOTION - Season Store
 *
 * State management for season progression, schedule, standings, and playoffs.
 * Integrates with management and game stores for full season experience.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Season,
  SeasonPhase,
  ScheduledGame,
  TeamStanding,
  PlayoffBracket,
  PlayoffMatchup,
  PlayoffRound,
  GameResult,
  SeasonRecords,
  SeasonEvent,
  LeagueTeam,
} from '../types/season.types';

// =============================================================================
// GM PERSONALITY TYPES (for AI teams)
// =============================================================================

export type GMPersonality =
  | 'AGGRESSIVE'      // Takes risks, goes for it on 4th
  | 'CONSERVATIVE'    // Plays it safe, runs the ball
  | 'BALANCED'        // Mix of both
  | 'REBUILDING'      // Tank mode, plays youth
  | 'WIN_NOW'         // All in, veteran heavy
  | 'ANALYTICS'       // Goes by the numbers
  | 'OLD_SCHOOL'      // Traditional football
  | 'GAMBLER';        // High risk, high reward

export interface AITeam extends LeagueTeam {
  gmName: string;
  gmPersonality: GMPersonality;
  rosterStrength: number;        // 60-95, affects sim results
  offenseRating: number;         // 50-99
  defenseRating: number;         // 50-99
  specialTeamsRating: number;    // 50-99
  injury: number;                // How injury-prone (0-1)
  momentum: number;              // Current team momentum (-5 to +5)
}

// =============================================================================
// SEASON STATE
// =============================================================================

interface SeasonState {
  // Core Season Data
  season: Season | null;
  aiTeams: AITeam[];
  userTeamId: string | null;

  // Configuration
  config: {
    gamesPerSeason: number;        // 8, 12, or 17
    playoffTeams: number;          // 4 or 6
    byeWeeks: number;              // 1 or 2
    quarterLength: number;         // Minutes per quarter
  };

  // Week State
  currentWeekGames: ScheduledGame[];
  weekSimulated: boolean;

  // Playoff State
  inPlayoffs: boolean;
  playoffRound: PlayoffRound | null;

  // Season Summary (end of season)
  seasonComplete: boolean;
  finalStandings: TeamStanding[];
}

interface SeasonActions {
  // Initialization
  initializeSeason: (userTeamId: string, teams: LeagueTeam[]) => void;
  generateSchedule: () => void;
  generateAITeams: (teams: LeagueTeam[]) => void;

  // Week Progression
  advanceWeek: () => void;
  simulateAIGames: () => GameResult[];
  recordUserGame: (result: GameResult) => void;
  getCurrentUserGame: () => ScheduledGame | null;
  getWeekGames: (week: number) => ScheduledGame[];

  // Standings
  updateStandings: (result: GameResult) => void;
  getStandings: () => TeamStanding[];
  getTeamStanding: (teamId: string) => TeamStanding | null;
  calculatePlayoffSeeding: () => void;

  // Playoffs
  checkPlayoffClinch: () => void;
  startPlayoffs: () => void;
  advancePlayoffRound: (winnerId: string) => void;
  getPlayoffBracket: () => PlayoffBracket | null;

  // Season Events
  addSeasonEvent: (event: SeasonEvent) => void;
  getSeasonEvents: () => SeasonEvent[];

  // Player Development
  applyWeeklyDevelopment: () => void;

  // Helpers
  isRegularSeasonComplete: () => boolean;
  getUserTeamRecord: () => { wins: number; losses: number };
  getOpponentInfo: (teamId: string) => AITeam | LeagueTeam | null;

  // Reset
  resetSeason: () => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_CONFIG = {
  gamesPerSeason: 8,
  playoffTeams: 4,
  byeWeeks: 1,
  quarterLength: 4,
};

const DEFAULT_SEASON_RECORDS: SeasonRecords = {
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
};

// GM name pools by personality
const GM_NAMES: Record<GMPersonality, string[]> = {
  AGGRESSIVE: ['Mike "Madman" Mitchell', 'Tony Blaze', 'Rex Gunner'],
  CONSERVATIVE: ['Bill Steadman', 'Tom Foundation', 'Coach Grindstone'],
  BALANCED: ['John Fairweather', 'Chris Moderate', 'Pat Evenkeeled'],
  REBUILDING: ['Sam Prospect', 'Derek Tomorrow', 'Youth Coach Young'],
  WIN_NOW: ['Victor Victory', 'Champion Chase', 'Ring Hunter Rick'],
  ANALYTICS: ['Dr. Numbers', 'Stat Man Steve', 'Algorithm Al'],
  OLD_SCHOOL: ['Iron Mike', 'Coach Leather', 'Gridiron George'],
  GAMBLER: ['Lucky Lou', 'Dice Dan', 'All-In Andy'],
};

// =============================================================================
// STORE
// =============================================================================

export const useSeasonStore = create<SeasonState & SeasonActions>()(
  persist(
    (set, get) => ({
      // Initial State
      season: null,
      aiTeams: [],
      userTeamId: null,
      config: DEFAULT_CONFIG,
      currentWeekGames: [],
      weekSimulated: false,
      inPlayoffs: false,
      playoffRound: null,
      seasonComplete: false,
      finalStandings: [],

      // =============================================================================
      // INITIALIZATION
      // =============================================================================

      initializeSeason: (userTeamId: string, teams: LeagueTeam[]) => {
        const config = get().config;

        // Generate AI teams
        get().generateAITeams(teams);

        // Create initial standings
        const standings: TeamStanding[] = teams.map((team) => ({
          teamId: team.id,
          rank: 0,
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

        // Create season
        const season: Season = {
          year: new Date().getFullYear(),
          phase: 'REGULAR_SEASON',
          currentWeek: 1,
          totalWeeks: config.gamesPerSeason + config.byeWeeks,
          schedule: [],
          standings,
          seasonRecords: { ...DEFAULT_SEASON_RECORDS },
          majorEvents: [],
        };

        set({
          season,
          userTeamId,
          seasonComplete: false,
          inPlayoffs: false,
          playoffRound: null,
        });

        // Generate schedule after setting season
        get().generateSchedule();
      },

      generateAITeams: (teams: LeagueTeam[]) => {
        const personalities: GMPersonality[] = [
          'AGGRESSIVE', 'CONSERVATIVE', 'BALANCED', 'REBUILDING',
          'WIN_NOW', 'ANALYTICS', 'OLD_SCHOOL', 'GAMBLER',
        ];

        const aiTeams: AITeam[] = teams.map((team, index) => {
          const personality = personalities[index % personalities.length];
          const gmNamePool = GM_NAMES[personality];
          const gmName = gmNamePool[Math.floor(Math.random() * gmNamePool.length)];

          // Generate ratings based on prestige
          const baseRating = 50 + (team.prestige * 8); // 50-90 base
          const variance = () => Math.floor(Math.random() * 20) - 10; // -10 to +10

          return {
            ...team,
            gmName,
            gmPersonality: personality,
            rosterStrength: Math.min(95, Math.max(60, baseRating + variance())),
            offenseRating: Math.min(99, Math.max(50, baseRating + variance())),
            defenseRating: Math.min(99, Math.max(50, baseRating + variance())),
            specialTeamsRating: Math.min(99, Math.max(50, baseRating + variance())),
            injury: Math.random() * 0.3, // 0-30% injury prone
            momentum: 0,
          };
        });

        set({ aiTeams });
      },

      generateSchedule: () => {
        const { season, aiTeams, userTeamId, config } = get();
        if (!season || !userTeamId) return;

        const schedule: ScheduledGame[] = [];
        const teamIds = aiTeams.map(t => t.id);
        const totalWeeks = config.gamesPerSeason + config.byeWeeks;

        // Assign bye week for user (middle of season)
        const userByeWeek = Math.floor(totalWeeks / 2);

        // Create round-robin schedule
        let gameId = 0;

        for (let week = 1; week <= totalWeeks; week++) {
          // User's bye week
          if (week === userByeWeek) {
            schedule.push({
              id: `game-${gameId++}`,
              week,
              homeTeamId: userTeamId,
              awayTeamId: '',
              isComplete: false,
              isByeWeek: true,
              isRivalry: false,
              isPlayoff: false,
            });

            // Still sim AI games during bye week
            const otherTeams = teamIds.filter(id => id !== userTeamId);
            const shuffled = [...otherTeams].sort(() => Math.random() - 0.5);

            for (let i = 0; i < shuffled.length - 1; i += 2) {
              if (shuffled[i + 1]) {
                schedule.push({
                  id: `game-${gameId++}`,
                  week,
                  homeTeamId: shuffled[i],
                  awayTeamId: shuffled[i + 1],
                  isComplete: false,
                  isByeWeek: false,
                  isRivalry: aiTeams.find(t => t.id === shuffled[i])?.rivalryTeams?.includes(shuffled[i + 1]) || false,
                  isPlayoff: false,
                });
              }
            }
            continue;
          }

          // Pick user's opponent for this week
          const availableOpponents = teamIds.filter(id => {
            // Can't play yourself
            if (id === userTeamId) return false;

            // Check if already played this opponent
            const alreadyPlayed = schedule.filter(g =>
              !g.isByeWeek &&
              ((g.homeTeamId === userTeamId && g.awayTeamId === id) ||
               (g.awayTeamId === userTeamId && g.homeTeamId === id))
            );

            // Allow playing same team up to 2x in short season
            return alreadyPlayed.length < 2;
          });

          if (availableOpponents.length > 0) {
            const opponentId = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
            const isHome = Math.random() > 0.5;
            const userTeam = aiTeams.find(t => t.id === userTeamId);
            const isRivalry = userTeam?.rivalryTeams?.includes(opponentId) || false;

            schedule.push({
              id: `game-${gameId++}`,
              week,
              homeTeamId: isHome ? userTeamId : opponentId,
              awayTeamId: isHome ? opponentId : userTeamId,
              isComplete: false,
              isByeWeek: false,
              isRivalry,
              isPlayoff: false,
            });
          }

          // Schedule AI vs AI games for remaining teams
          const teamsThisWeek = new Set<string>();
          teamsThisWeek.add(userTeamId);
          const userGame = schedule.find(g => g.week === week && !g.isByeWeek);
          if (userGame) {
            teamsThisWeek.add(userGame.homeTeamId);
            teamsThisWeek.add(userGame.awayTeamId);
          }

          const remainingTeams = teamIds.filter(id => !teamsThisWeek.has(id));
          const shuffledRemaining = [...remainingTeams].sort(() => Math.random() - 0.5);

          for (let i = 0; i < shuffledRemaining.length - 1; i += 2) {
            if (shuffledRemaining[i + 1]) {
              const homeTeam = aiTeams.find(t => t.id === shuffledRemaining[i]);
              const isRivalry = homeTeam?.rivalryTeams?.includes(shuffledRemaining[i + 1]) || false;

              schedule.push({
                id: `game-${gameId++}`,
                week,
                homeTeamId: shuffledRemaining[i],
                awayTeamId: shuffledRemaining[i + 1],
                isComplete: false,
                isByeWeek: false,
                isRivalry,
                isPlayoff: false,
              });
            }
          }
        }

        set(state => ({
          season: state.season ? {
            ...state.season,
            schedule,
          } : null,
          currentWeekGames: schedule.filter(g => g.week === 1),
        }));
      },

      // =============================================================================
      // WEEK PROGRESSION
      // =============================================================================

      advanceWeek: () => {
        const { season, config, inPlayoffs } = get();
        if (!season) return;

        const nextWeek = season.currentWeek + 1;

        // Check if regular season is complete
        if (!inPlayoffs && nextWeek > season.totalWeeks) {
          get().calculatePlayoffSeeding();
          get().checkPlayoffClinch();

          // Start playoffs if user made it
          const userStanding = get().getTeamStanding(get().userTeamId || '');
          if (userStanding && userStanding.playoffSeed !== null && userStanding.playoffSeed <= config.playoffTeams) {
            get().startPlayoffs();
          } else {
            // Season over - didn't make playoffs
            set({
              seasonComplete: true,
              finalStandings: season.standings,
            });
          }
          return;
        }

        // Apply weekly development
        get().applyWeeklyDevelopment();

        // Update current week games
        const weekGames = season.schedule.filter(g => g.week === nextWeek);

        set(state => ({
          season: state.season ? {
            ...state.season,
            currentWeek: nextWeek,
          } : null,
          currentWeekGames: weekGames,
          weekSimulated: false,
        }));
      },

      simulateAIGames: () => {
        const { season, aiTeams, userTeamId } = get();
        if (!season) return [];

        const results: GameResult[] = [];
        const weekGames = season.schedule.filter(
          g => g.week === season.currentWeek &&
               !g.isComplete &&
               !g.isByeWeek &&
               g.homeTeamId !== userTeamId &&
               g.awayTeamId !== userTeamId
        );

        for (const game of weekGames) {
          const homeTeam = aiTeams.find(t => t.id === game.homeTeamId);
          const awayTeam = aiTeams.find(t => t.id === game.awayTeamId);

          if (!homeTeam || !awayTeam) continue;

          // Simulate game based on team ratings
          const result = simulateGame(homeTeam, awayTeam, game.isRivalry);

          // Update game in schedule
          set(state => ({
            season: state.season ? {
              ...state.season,
              schedule: state.season.schedule.map(g =>
                g.id === game.id
                  ? { ...g, isComplete: true, result }
                  : g
              ),
            } : null,
          }));

          // Update standings
          get().updateStandings(result);

          // Update team momentum
          const homeWon = result.homeScore > result.awayScore;
          set(state => ({
            aiTeams: state.aiTeams.map(t => {
              if (t.id === homeTeam.id) {
                return { ...t, momentum: Math.max(-5, Math.min(5, t.momentum + (homeWon ? 1 : -1))) };
              }
              if (t.id === awayTeam.id) {
                return { ...t, momentum: Math.max(-5, Math.min(5, t.momentum + (homeWon ? -1 : 1))) };
              }
              return t;
            }),
          }));

          results.push(result);
        }

        set({ weekSimulated: true });
        return results;
      },

      recordUserGame: (result: GameResult) => {
        const { season, userTeamId } = get();
        if (!season) return;

        // Find and update the game
        const gameIndex = season.schedule.findIndex(
          g => g.week === season.currentWeek &&
               (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId) &&
               !g.isByeWeek
        );

        if (gameIndex === -1) return;

        set(state => ({
          season: state.season ? {
            ...state.season,
            schedule: state.season.schedule.map((g, i) =>
              i === gameIndex
                ? { ...g, isComplete: true, result }
                : g
            ),
          } : null,
        }));

        // Update standings
        get().updateStandings(result);

        // Update season records
        const userWon = (result.homeScore > result.awayScore && season.schedule[gameIndex].homeTeamId === userTeamId) ||
                        (result.awayScore > result.homeScore && season.schedule[gameIndex].awayTeamId === userTeamId);

        set(state => ({
          season: state.season ? {
            ...state.season,
            seasonRecords: {
              ...state.season.seasonRecords,
              userTeamRecord: {
                wins: state.season.seasonRecords.userTeamRecord.wins + (userWon ? 1 : 0),
                losses: state.season.seasonRecords.userTeamRecord.losses + (userWon ? 0 : 1),
              },
              dirtyWins: state.season.seasonRecords.dirtyWins + (userWon && result.dirtyPlaysAttempted > 0 ? 1 : 0),
              totalHeatGenerated: state.season.seasonRecords.totalHeatGenerated + result.heatGenerated,
            },
          } : null,
        }));
      },

      getCurrentUserGame: () => {
        const { season, userTeamId } = get();
        if (!season || !userTeamId) return null;

        return season.schedule.find(
          g => g.week === season.currentWeek &&
               (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId)
        ) || null;
      },

      getWeekGames: (week: number) => {
        const { season } = get();
        if (!season) return [];
        return season.schedule.filter(g => g.week === week);
      },

      // =============================================================================
      // STANDINGS
      // =============================================================================

      updateStandings: (result: GameResult) => {
        set(state => {
          if (!state.season) return state;

          const standings = state.season.standings.map(standing => {
            if (standing.teamId === result.winnerId) {
              const homeGame = result.winnerId === state.season?.schedule.find(
                g => g.result === result
              )?.homeTeamId;
              const points = homeGame ? result.homeScore : result.awayScore;
              const pointsAgainst = homeGame ? result.awayScore : result.homeScore;

              const newWins = standing.wins + 1;
              const newStreak = standing.currentStreak >= 0 ? standing.currentStreak + 1 : 1;

              return {
                ...standing,
                wins: newWins,
                winPercentage: newWins / (newWins + standing.losses + standing.ties),
                pointsFor: standing.pointsFor + points,
                pointsAgainst: standing.pointsAgainst + pointsAgainst,
                pointDifferential: standing.pointDifferential + (points - pointsAgainst),
                currentStreak: newStreak,
                longestWinStreak: Math.max(standing.longestWinStreak, newStreak),
              };
            }

            // Losing team
            const isHomeTeam = result.homeScore < result.awayScore && standing.teamId === state.season?.schedule.find(g => g.result === result)?.homeTeamId;
            const isAwayTeam = result.awayScore < result.homeScore && standing.teamId === state.season?.schedule.find(g => g.result === result)?.awayTeamId;

            if (isHomeTeam || isAwayTeam) {
              const points = isHomeTeam ? result.homeScore : result.awayScore;
              const pointsAgainst = isHomeTeam ? result.awayScore : result.homeScore;

              const newLosses = standing.losses + 1;
              const newStreak = standing.currentStreak <= 0 ? standing.currentStreak - 1 : -1;

              return {
                ...standing,
                losses: newLosses,
                winPercentage: standing.wins / (standing.wins + newLosses + standing.ties),
                pointsFor: standing.pointsFor + points,
                pointsAgainst: standing.pointsAgainst + pointsAgainst,
                pointDifferential: standing.pointDifferential + (points - pointsAgainst),
                currentStreak: newStreak,
                longestLossStreak: Math.max(standing.longestLossStreak, Math.abs(newStreak)),
              };
            }

            return standing;
          });

          // Re-rank standings
          const sorted = [...standings].sort((a, b) => {
            if (a.winPercentage !== b.winPercentage) return b.winPercentage - a.winPercentage;
            return b.pointDifferential - a.pointDifferential;
          });

          sorted.forEach((s, i) => {
            s.rank = i + 1;
          });

          return {
            season: {
              ...state.season,
              standings: sorted,
            },
          };
        });
      },

      getStandings: () => {
        const { season } = get();
        if (!season) return [];
        return [...season.standings].sort((a, b) => a.rank - b.rank);
      },

      getTeamStanding: (teamId: string) => {
        const { season } = get();
        if (!season) return null;
        return season.standings.find(s => s.teamId === teamId) || null;
      },

      calculatePlayoffSeeding: () => {
        const { season, config } = get();
        if (!season) return;

        const sorted = [...season.standings].sort((a, b) => {
          if (a.winPercentage !== b.winPercentage) return b.winPercentage - a.winPercentage;
          return b.pointDifferential - a.pointDifferential;
        });

        set(state => ({
          season: state.season ? {
            ...state.season,
            standings: sorted.map((s, i) => ({
              ...s,
              rank: i + 1,
              playoffSeed: i < config.playoffTeams ? i + 1 : null,
              isClinched: i < config.playoffTeams,
              isEliminated: i >= config.playoffTeams,
            })),
          } : null,
        }));
      },

      // =============================================================================
      // PLAYOFFS
      // =============================================================================

      checkPlayoffClinch: () => {
        const { season, config } = get();
        if (!season) return;

        const gamesRemaining = season.totalWeeks - season.currentWeek;

        season.standings.forEach((standing, index) => {
          // Calculate magic number (wins needed to clinch)
          const teamsAhead = season.standings.filter(s => s.winPercentage > standing.winPercentage).length;
          const canCatch = teamsAhead < config.playoffTeams;

          // Simple elimination check
          const maxPossibleWins = standing.wins + gamesRemaining;
          const currentCutoffWins = season.standings[config.playoffTeams - 1]?.wins || 0;
          const isEliminated = maxPossibleWins < currentCutoffWins;

          set(state => ({
            season: state.season ? {
              ...state.season,
              standings: state.season.standings.map(s =>
                s.teamId === standing.teamId
                  ? { ...s, isEliminated, isClinched: canCatch && gamesRemaining === 0 && index < config.playoffTeams }
                  : s
              ),
            } : null,
          }));
        });
      },

      startPlayoffs: () => {
        const { season, config } = get();
        if (!season) return;

        const qualifiedTeams = season.standings
          .filter(s => s.playoffSeed !== null && s.playoffSeed <= config.playoffTeams)
          .sort((a, b) => (a.playoffSeed || 99) - (b.playoffSeed || 99));

        // Create bracket based on number of playoff teams
        const matchups: PlayoffMatchup[] = [];

        if (config.playoffTeams === 4) {
          // 1 vs 4, 2 vs 3
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
        } else if (config.playoffTeams === 6) {
          // 1 & 2 get byes, 3v6, 4v5
          matchups.push({
            id: 'wild-1',
            round: 'WILD_CARD',
            homeTeamId: qualifiedTeams[2].teamId,
            awayTeamId: qualifiedTeams[5].teamId,
            homeSeed: 3,
            awaySeed: 6,
            isComplete: false,
          });
          matchups.push({
            id: 'wild-2',
            round: 'WILD_CARD',
            homeTeamId: qualifiedTeams[3].teamId,
            awayTeamId: qualifiedTeams[4].teamId,
            homeSeed: 4,
            awaySeed: 5,
            isComplete: false,
          });
        }

        const bracket: PlayoffBracket = {
          round: config.playoffTeams === 6 ? 'WILD_CARD' : 'DIVISIONAL',
          matchups,
          eliminatedTeams: season.standings
            .filter(s => s.playoffSeed === null || s.playoffSeed > config.playoffTeams)
            .map(s => s.teamId),
          championId: null,
        };

        set(state => ({
          season: state.season ? {
            ...state.season,
            phase: 'PLAYOFFS',
            playoffBracket: bracket,
          } : null,
          inPlayoffs: true,
          playoffRound: bracket.round,
        }));
      },

      advancePlayoffRound: (winnerId: string) => {
        const { season } = get();
        if (!season || !season.playoffBracket) return;

        const bracket = season.playoffBracket;

        // Find and update the matchup
        const updatedMatchups = bracket.matchups.map(m => {
          if (!m.isComplete && (m.homeTeamId === winnerId || m.awayTeamId === winnerId)) {
            return {
              ...m,
              winnerId,
              isComplete: true,
            };
          }
          return m;
        });

        // Check if all matchups in current round are complete
        const currentRoundComplete = updatedMatchups
          .filter(m => m.round === bracket.round)
          .every(m => m.isComplete);

        if (currentRoundComplete) {
          const winners = updatedMatchups.filter(m => m.winnerId).map(m => m.winnerId!);

          // Determine next round
          let nextRound: PlayoffRound | null = null;
          const newMatchups: PlayoffMatchup[] = [...updatedMatchups];

          if (bracket.round === 'WILD_CARD') {
            nextRound = 'DIVISIONAL';
            // Top 2 seeds vs wild card winners
            const sortedWinners = season.standings
              .filter(s => winners.includes(s.teamId))
              .sort((a, b) => (a.playoffSeed || 99) - (b.playoffSeed || 99));

            // #1 seed vs lowest remaining, #2 vs other
            newMatchups.push({
              id: 'div-1',
              round: 'DIVISIONAL',
              homeTeamId: season.standings.find(s => s.playoffSeed === 1)!.teamId,
              awayTeamId: sortedWinners[sortedWinners.length - 1].teamId,
              homeSeed: 1,
              awaySeed: sortedWinners[sortedWinners.length - 1].playoffSeed || 6,
              isComplete: false,
            });
            newMatchups.push({
              id: 'div-2',
              round: 'DIVISIONAL',
              homeTeamId: season.standings.find(s => s.playoffSeed === 2)!.teamId,
              awayTeamId: sortedWinners[0].teamId,
              homeSeed: 2,
              awaySeed: sortedWinners[0].playoffSeed || 3,
              isComplete: false,
            });
          } else if (bracket.round === 'DIVISIONAL') {
            if (winners.length === 2) {
              nextRound = 'CHAMPIONSHIP';
              // Championship game
              const sortedWinners = season.standings
                .filter(s => winners.includes(s.teamId))
                .sort((a, b) => (a.playoffSeed || 99) - (b.playoffSeed || 99));

              newMatchups.push({
                id: 'championship',
                round: 'CHAMPIONSHIP',
                homeTeamId: sortedWinners[0].teamId,
                awayTeamId: sortedWinners[1].teamId,
                homeSeed: sortedWinners[0].playoffSeed || 1,
                awaySeed: sortedWinners[1].playoffSeed || 2,
                isComplete: false,
              });
            }
          } else if (bracket.round === 'CHAMPIONSHIP') {
            // Season complete - we have a champion!
            const championId = winners[0];

            set(state => ({
              season: state.season ? {
                ...state.season,
                phase: 'CHAMPION' as SeasonPhase,
                playoffBracket: {
                  ...state.season.playoffBracket!,
                  matchups: newMatchups,
                  championId,
                },
                seasonRecords: {
                  ...state.season.seasonRecords,
                  userPlayoffResult: championId === state.userTeamId ? 'CHAMPION' : 'CHAMPIONSHIP_LOSS',
                },
              } : null,
              seasonComplete: true,
              inPlayoffs: false,
              finalStandings: state.season?.standings || [],
            }));
            return;
          }

          // Update eliminated teams
          const newEliminated = updatedMatchups
            .filter(m => m.isComplete && m.winnerId)
            .map(m => m.homeTeamId === m.winnerId ? m.awayTeamId : m.homeTeamId);

          set(state => ({
            season: state.season ? {
              ...state.season,
              playoffBracket: {
                round: nextRound || bracket.round,
                matchups: newMatchups,
                eliminatedTeams: [...bracket.eliminatedTeams, ...newEliminated],
                championId: null,
              },
            } : null,
            playoffRound: nextRound,
          }));
        } else {
          // Just update the matchups
          set(state => ({
            season: state.season ? {
              ...state.season,
              playoffBracket: {
                ...bracket,
                matchups: updatedMatchups,
              },
            } : null,
          }));
        }
      },

      getPlayoffBracket: () => {
        const { season } = get();
        return season?.playoffBracket || null;
      },

      // =============================================================================
      // SEASON EVENTS
      // =============================================================================

      addSeasonEvent: (event: SeasonEvent) => {
        set(state => ({
          season: state.season ? {
            ...state.season,
            majorEvents: [...state.season.majorEvents, event],
          } : null,
        }));
      },

      getSeasonEvents: () => {
        const { season } = get();
        return season?.majorEvents || [];
      },

      // =============================================================================
      // PLAYER DEVELOPMENT
      // =============================================================================

      applyWeeklyDevelopment: () => {
        // Small random changes to AI team ratings (simulating injuries, improvements)
        set(state => ({
          aiTeams: state.aiTeams.map(team => {
            const change = (Math.random() * 4) - 2; // -2 to +2
            return {
              ...team,
              offenseRating: Math.min(99, Math.max(50, team.offenseRating + change)),
              defenseRating: Math.min(99, Math.max(50, team.defenseRating + change)),
            };
          }),
        }));
      },

      // =============================================================================
      // HELPERS
      // =============================================================================

      isRegularSeasonComplete: () => {
        const { season } = get();
        if (!season) return false;
        return season.currentWeek > season.totalWeeks;
      },

      getUserTeamRecord: () => {
        const { season, userTeamId } = get();
        if (!season || !userTeamId) return { wins: 0, losses: 0 };

        const standing = season.standings.find(s => s.teamId === userTeamId);
        return {
          wins: standing?.wins || 0,
          losses: standing?.losses || 0,
        };
      },

      getOpponentInfo: (teamId: string) => {
        const { aiTeams } = get();
        return aiTeams.find(t => t.id === teamId) || null;
      },

      // =============================================================================
      // RESET
      // =============================================================================

      resetSeason: () => {
        set({
          season: null,
          aiTeams: [],
          userTeamId: null,
          currentWeekGames: [],
          weekSimulated: false,
          inPlayoffs: false,
          playoffRound: null,
          seasonComplete: false,
          finalStandings: [],
        });
      },
    }),
    {
      name: 'illegal-motion-season',
      partialize: (state) => ({
        season: state.season,
        aiTeams: state.aiTeams,
        userTeamId: state.userTeamId,
        config: state.config,
        inPlayoffs: state.inPlayoffs,
        playoffRound: state.playoffRound,
        seasonComplete: state.seasonComplete,
        finalStandings: state.finalStandings,
      }),
    }
  )
);

// =============================================================================
// GAME SIMULATION HELPER
// =============================================================================

function simulateGame(homeTeam: AITeam, awayTeam: AITeam, isRivalry: boolean): GameResult {
  // Base scoring expectation
  const homeAdvantage = 3;
  const rivalryBonus = isRivalry ? 7 : 0; // More points in rivalry games

  // Calculate expected scores based on ratings
  const homeExpected = 17 + (homeTeam.offenseRating - 70) / 5 + (70 - awayTeam.defenseRating) / 5 + homeAdvantage;
  const awayExpected = 17 + (awayTeam.offenseRating - 70) / 5 + (70 - homeTeam.defenseRating) / 5;

  // Add momentum effect
  const homeMomentum = homeTeam.momentum * 1.5;
  const awayMomentum = awayTeam.momentum * 1.5;

  // Random variance
  const homeVariance = (Math.random() * 20) - 10;
  const awayVariance = (Math.random() * 20) - 10;

  // Calculate final scores
  let homeScore = Math.max(0, Math.round(homeExpected + homeMomentum + homeVariance + (isRivalry ? rivalryBonus / 2 : 0)));
  let awayScore = Math.max(0, Math.round(awayExpected + awayMomentum + awayVariance + (isRivalry ? rivalryBonus / 2 : 0)));

  // Round to realistic football scores (multiples of 7, 3, with some 6s and 2s)
  homeScore = roundToFootballScore(homeScore);
  awayScore = roundToFootballScore(awayScore);

  // Ensure no ties in playoffs (rare in regular season too)
  if (homeScore === awayScore) {
    if (Math.random() > 0.5) {
      homeScore += 3; // Field goal in OT
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
  // Common football scores are multiples of 7 (TD+XP), 3 (FG), with occasional 6 (TD no XP), 2 (safety)
  const targets = [0, 3, 6, 7, 10, 13, 14, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35, 38, 41, 42, 45, 48, 49, 52, 55, 56];

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
