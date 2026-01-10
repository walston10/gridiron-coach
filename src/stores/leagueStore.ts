/**
 * League Store
 *
 * Manages the 8-team league season state including:
 * - Schedule and standings
 * - Week progression
 * - AI game simulation
 * - User injuries
 * - Playoffs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  LeagueState,
  ScheduledGame,
  TeamStanding,
  PlayerInjury,
  PlayoffBracket,
  GameResult,
} from '../types/league.types';

import {
  createInitialStandings,
  createInitialSeasonStats,
  updateStandingsAfterGame,
  updateSeasonStatsAfterGame,
} from '../types/league.types';

import {
  generateRoundRobinSchedule,
  getUserGameForWeek,
  getAIGamesForWeek,
  sortStandingsWithTiebreakers,
} from '../engine/scheduleGenerator';

import { simulateAIGame } from '../engine/leagueSimulator';
import { healInjuries } from '../engine/injurySystem';
import { STATIC_TEAMS, getTeamIdentity } from '../data/staticTeams';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface LeagueActions {
  // Initialization
  initializeSeason: (userTeamId: string) => void;
  resetSeason: () => void;

  // Week progression
  advanceWeek: () => void;
  simulateAIGames: () => void;

  // Game results
  recordUserGameResult: (result: GameResult, wasHome: boolean, opponentId: string) => void;
  recordPlayoffResult: (round: 'semi1' | 'semi2' | 'final', result: GameResult) => void;

  // Injuries
  addInjury: (injury: PlayerInjury) => void;
  healWeeklyInjuries: () => void;

  // Getters
  getUserGameThisWeek: () => ScheduledGame | null;
  getStandingsSorted: () => TeamStanding[];
  isInPlayoffs: () => boolean;
  getUserPlayoffMatchup: () => { round: 'semi1' | 'semi2' | 'final'; opponent: string } | null;
  getWeeksRemaining: () => number;
}

type LeagueStore = LeagueState & LeagueActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: LeagueState = {
  phase: 'NOT_STARTED',
  week: 0,
  schedule: [],
  standings: [],
  seasonStats: [],
  userInjuries: [],
  playoffBracket: null,
  championId: null,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useLeagueStore = create<LeagueStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // INITIALIZATION
      // =========================================================================

      initializeSeason: (userTeamId: string) => {
        // Get all team IDs (7 AI + 1 user)
        const aiTeamIds = STATIC_TEAMS.map(t => t.info.id);
        const allTeamIds = [...aiTeamIds, userTeamId];

        // Generate round-robin schedule
        const schedule = generateRoundRobinSchedule(allTeamIds);

        // Initialize standings (all 0-0)
        const standings = createInitialStandings(allTeamIds);

        // Initialize season stats
        const seasonStats = createInitialSeasonStats(allTeamIds);

        set({
          phase: 'REGULAR_SEASON',
          week: 1,
          schedule,
          standings,
          seasonStats,
          userInjuries: [],
          playoffBracket: null,
          championId: null,
        });
      },

      resetSeason: () => {
        set(initialState);
      },

      // =========================================================================
      // WEEK PROGRESSION
      // =========================================================================

      advanceWeek: () => {
        const state = get();

        if (state.phase === 'NOT_STARTED') return;

        // Heal injuries
        get().healWeeklyInjuries();

        if (state.phase === 'REGULAR_SEASON') {
          if (state.week >= 7) {
            // End of regular season, start playoffs
            const sorted = get().getStandingsSorted();
            const playoffTeams = sorted.slice(0, 4);

            const bracket: PlayoffBracket = {
              semi1: {
                team1Id: playoffTeams[0].teamId,  // #1 seed
                team2Id: playoffTeams[3].teamId,  // #4 seed
                winnerId: null,
                result: null,
              },
              semi2: {
                team1Id: playoffTeams[1].teamId,  // #2 seed
                team2Id: playoffTeams[2].teamId,  // #3 seed
                winnerId: null,
                result: null,
              },
              final: {
                team1Id: null,
                team2Id: null,
                winnerId: null,
                result: null,
              },
            };

            set({
              phase: 'PLAYOFFS',
              week: 8,
              playoffBracket: bracket,
            });
          } else {
            set({ week: state.week + 1 });
          }
        } else if (state.phase === 'PLAYOFFS') {
          const bracket = state.playoffBracket;
          if (!bracket) return;

          if (state.week === 8) {
            // After semis, set up final
            if (bracket.semi1.winnerId && bracket.semi2.winnerId) {
              set({
                week: 9,
                playoffBracket: {
                  ...bracket,
                  final: {
                    team1Id: bracket.semi1.winnerId,
                    team2Id: bracket.semi2.winnerId,
                    winnerId: null,
                    result: null,
                  },
                },
              });
            }
          } else if (state.week === 9 && bracket.final.winnerId) {
            // Season complete
            set({
              phase: 'COMPLETE',
              championId: bracket.final.winnerId,
            });
          }
        }
      },

      simulateAIGames: () => {
        const state = get();
        const userTeamId = state.standings.find(s =>
          !STATIC_TEAMS.some(t => t.info.id === s.teamId)
        )?.teamId || '';

        if (state.phase === 'REGULAR_SEASON') {
          // Get AI games for this week
          const aiGames = getAIGamesForWeek(state.schedule, state.week, userTeamId);

          let newSchedule = [...state.schedule];
          let newStandings = [...state.standings];
          let newStats = [...state.seasonStats];

          for (const game of aiGames) {
            if (game.result) continue;  // Already played

            const homeIdentity = getTeamIdentity(game.homeTeamId);
            const awayIdentity = getTeamIdentity(game.awayTeamId);

            if (!homeIdentity || !awayIdentity) continue;

            // Simulate the game
            const result = simulateAIGame(homeIdentity, awayIdentity);

            // Update schedule with result
            newSchedule = newSchedule.map(g =>
              g.gameId === game.gameId ? { ...g, result } : g
            );

            // Update standings
            newStandings = updateStandingsAfterGame(
              newStandings,
              game.homeTeamId,
              game.awayTeamId,
              result
            );

            // Update stats
            newStats = updateSeasonStatsAfterGame(
              newStats,
              game.homeTeamId,
              game.awayTeamId,
              result
            );
          }

          set({
            schedule: newSchedule,
            standings: newStandings,
            seasonStats: newStats,
          });
        } else if (state.phase === 'PLAYOFFS') {
          // Simulate AI playoff games
          const bracket = state.playoffBracket;
          if (!bracket) return;

          let newBracket = { ...bracket };

          // Check each matchup
          const matchups = [
            { key: 'semi1' as const, matchup: bracket.semi1 },
            { key: 'semi2' as const, matchup: bracket.semi2 },
            { key: 'final' as const, matchup: bracket.final },
          ];

          for (const { key, matchup } of matchups) {
            if (matchup.result || !matchup.team1Id || !matchup.team2Id) continue;

            // Check if user is in this matchup
            const isUserGame = !STATIC_TEAMS.some(t => t.info.id === matchup.team1Id) ||
                               !STATIC_TEAMS.some(t => t.info.id === matchup.team2Id);

            if (isUserGame) continue;  // Don't simulate user games

            const homeIdentity = getTeamIdentity(matchup.team1Id);
            const awayIdentity = getTeamIdentity(matchup.team2Id);

            if (!homeIdentity || !awayIdentity) continue;

            const result = simulateAIGame(homeIdentity, awayIdentity);
            const winnerId = result.homeScore > result.awayScore
              ? matchup.team1Id
              : matchup.team2Id;

            newBracket = {
              ...newBracket,
              [key]: { ...matchup, result, winnerId },
            };
          }

          set({ playoffBracket: newBracket });
        }
      },

      // =========================================================================
      // GAME RESULTS
      // =========================================================================

      recordUserGameResult: (result: GameResult, wasHome: boolean, opponentId: string) => {
        const state = get();
        const userTeamId = state.standings.find(s =>
          !STATIC_TEAMS.some(t => t.info.id === s.teamId)
        )?.teamId || '';

        const homeTeamId = wasHome ? userTeamId : opponentId;
        const awayTeamId = wasHome ? opponentId : userTeamId;

        // Update schedule
        const newSchedule = state.schedule.map(game => {
          if (game.week === state.week &&
              game.homeTeamId === homeTeamId &&
              game.awayTeamId === awayTeamId) {
            return { ...game, result };
          }
          return game;
        });

        // Update standings
        const newStandings = updateStandingsAfterGame(
          state.standings,
          homeTeamId,
          awayTeamId,
          result
        );

        // Update stats
        const newStats = updateSeasonStatsAfterGame(
          state.seasonStats,
          homeTeamId,
          awayTeamId,
          result
        );

        set({
          schedule: newSchedule,
          standings: newStandings,
          seasonStats: newStats,
        });
      },

      recordPlayoffResult: (round: 'semi1' | 'semi2' | 'final', result: GameResult) => {
        const state = get();
        const bracket = state.playoffBracket;
        if (!bracket) return;

        const matchup = bracket[round];
        if (!matchup.team1Id || !matchup.team2Id) return;

        const winnerId = result.homeScore > result.awayScore
          ? matchup.team1Id
          : matchup.team2Id;

        set({
          playoffBracket: {
            ...bracket,
            [round]: { ...matchup, result, winnerId },
          },
        });
      },

      // =========================================================================
      // INJURIES
      // =========================================================================

      addInjury: (injury: PlayerInjury) => {
        set(state => ({
          userInjuries: [...state.userInjuries, injury],
        }));
      },

      healWeeklyInjuries: () => {
        set(state => ({
          userInjuries: healInjuries(state.userInjuries),
        }));
      },

      // =========================================================================
      // GETTERS
      // =========================================================================

      getUserGameThisWeek: () => {
        const state = get();
        const userTeamId = state.standings.find(s =>
          !STATIC_TEAMS.some(t => t.info.id === s.teamId)
        )?.teamId || '';

        if (state.phase === 'REGULAR_SEASON') {
          return getUserGameForWeek(state.schedule, state.week, userTeamId);
        }

        if (state.phase === 'PLAYOFFS' && state.playoffBracket) {
          // Find user's playoff game
          const bracket = state.playoffBracket;
          const matchups = [
            { round: 'semi1' as const, m: bracket.semi1 },
            { round: 'semi2' as const, m: bracket.semi2 },
            { round: 'final' as const, m: bracket.final },
          ];

          for (const { round, m } of matchups) {
            if (m.team1Id === userTeamId || m.team2Id === userTeamId) {
              if (!m.result) {
                // This is the user's current game
                return {
                  gameId: `playoff-${round}`,
                  week: state.week,
                  homeTeamId: m.team1Id!,
                  awayTeamId: m.team2Id!,
                  result: null,
                };
              }
            }
          }
        }

        return null;
      },

      getStandingsSorted: () => {
        const state = get();
        return sortStandingsWithTiebreakers(state.standings, state.schedule);
      },

      isInPlayoffs: () => {
        const state = get();
        if (state.phase !== 'PLAYOFFS' || !state.playoffBracket) return false;

        const userTeamId = state.standings.find(s =>
          !STATIC_TEAMS.some(t => t.info.id === s.teamId)
        )?.teamId || '';

        const bracket = state.playoffBracket;
        return (
          bracket.semi1.team1Id === userTeamId ||
          bracket.semi1.team2Id === userTeamId ||
          bracket.semi2.team1Id === userTeamId ||
          bracket.semi2.team2Id === userTeamId ||
          bracket.final.team1Id === userTeamId ||
          bracket.final.team2Id === userTeamId
        );
      },

      getUserPlayoffMatchup: () => {
        const state = get();
        if (!state.playoffBracket) return null;

        const userTeamId = state.standings.find(s =>
          !STATIC_TEAMS.some(t => t.info.id === s.teamId)
        )?.teamId || '';

        const bracket = state.playoffBracket;

        // Check each round
        if (!bracket.semi1.result) {
          if (bracket.semi1.team1Id === userTeamId) {
            return { round: 'semi1', opponent: bracket.semi1.team2Id! };
          }
          if (bracket.semi1.team2Id === userTeamId) {
            return { round: 'semi1', opponent: bracket.semi1.team1Id! };
          }
        }

        if (!bracket.semi2.result) {
          if (bracket.semi2.team1Id === userTeamId) {
            return { round: 'semi2', opponent: bracket.semi2.team2Id! };
          }
          if (bracket.semi2.team2Id === userTeamId) {
            return { round: 'semi2', opponent: bracket.semi2.team1Id! };
          }
        }

        if (!bracket.final.result && bracket.final.team1Id && bracket.final.team2Id) {
          if (bracket.final.team1Id === userTeamId) {
            return { round: 'final', opponent: bracket.final.team2Id };
          }
          if (bracket.final.team2Id === userTeamId) {
            return { round: 'final', opponent: bracket.final.team1Id };
          }
        }

        return null;
      },

      getWeeksRemaining: () => {
        const state = get();
        if (state.phase === 'REGULAR_SEASON') {
          return 7 - state.week;
        }
        return 0;
      },
    }),
    {
      name: 'league-storage',
      partialize: (state) => ({
        phase: state.phase,
        week: state.week,
        schedule: state.schedule,
        standings: state.standings,
        seasonStats: state.seasonStats,
        userInjuries: state.userInjuries,
        playoffBracket: state.playoffBracket,
        championId: state.championId,
      }),
    }
  )
);

// =============================================================================
// HELPER EXPORTS
// =============================================================================

/**
 * Get team name by ID (works for both static teams and user team)
 */
export function getTeamName(teamId: string, userTeamName?: string): string {
  const staticTeam = STATIC_TEAMS.find(t => t.info.id === teamId);
  if (staticTeam) {
    return `${staticTeam.info.city} ${staticTeam.info.name}`;
  }
  return userTeamName || 'Your Team';
}

/**
 * Get team abbreviation by ID
 */
export function getTeamAbbreviation(teamId: string, userAbbr?: string): string {
  const staticTeam = STATIC_TEAMS.find(t => t.info.id === teamId);
  if (staticTeam) {
    return staticTeam.info.abbreviation;
  }
  return userAbbr || 'YOU';
}
