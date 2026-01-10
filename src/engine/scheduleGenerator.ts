/**
 * Schedule Generator
 *
 * Round-robin schedule for 8 teams (7 weeks)
 * Tiebreaker logic: Head-to-head, then random for 3+ way ties
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScheduledGame, TeamStanding } from '../types/league.types';

// =============================================================================
// ROUND-ROBIN SCHEDULE GENERATOR
// =============================================================================

/**
 * Generate a round-robin schedule where each team plays every other team once.
 * Uses the circle method for balanced home/away distribution.
 *
 * @param teamIds - Array of 8 team IDs
 * @returns Array of scheduled games (28 total: 4 games per week × 7 weeks)
 */
export function generateRoundRobinSchedule(teamIds: string[]): ScheduledGame[] {
  if (teamIds.length !== 8) {
    throw new Error('Round-robin schedule requires exactly 8 teams');
  }

  const schedule: ScheduledGame[] = [];
  const teams = [...teamIds];

  // Circle method: fix one team, rotate the rest
  // For 8 teams, we need 7 rounds (each team plays 7 games)
  for (let week = 1; week <= 7; week++) {
    const weekGames: ScheduledGame[] = [];

    // Pair up teams for this week
    for (let i = 0; i < 4; i++) {
      const team1 = teams[i];
      const team2 = teams[7 - i];

      // Alternate home/away based on week to balance
      const isTeam1Home = (week + i) % 2 === 0;

      weekGames.push({
        gameId: uuidv4(),
        week,
        homeTeamId: isTeam1Home ? team1 : team2,
        awayTeamId: isTeam1Home ? team2 : team1,
        result: null,
      });
    }

    schedule.push(...weekGames);

    // Rotate teams (keep first team fixed, rotate the rest)
    const lastTeam = teams.pop()!;
    teams.splice(1, 0, lastTeam);
  }

  return schedule;
}

/**
 * Get games for a specific week
 */
export function getWeekGames(schedule: ScheduledGame[], week: number): ScheduledGame[] {
  return schedule.filter(game => game.week === week);
}

/**
 * Get all games for a specific team
 */
export function getTeamGames(schedule: ScheduledGame[], teamId: string): ScheduledGame[] {
  return schedule.filter(
    game => game.homeTeamId === teamId || game.awayTeamId === teamId
  );
}

/**
 * Get the user's game for a specific week
 */
export function getUserGameForWeek(
  schedule: ScheduledGame[],
  week: number,
  userTeamId: string
): ScheduledGame | null {
  return schedule.find(
    game => game.week === week && (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId)
  ) || null;
}

/**
 * Get AI vs AI games for a specific week (excludes user's game)
 */
export function getAIGamesForWeek(
  schedule: ScheduledGame[],
  week: number,
  userTeamId: string
): ScheduledGame[] {
  return schedule.filter(
    game => game.week === week && game.homeTeamId !== userTeamId && game.awayTeamId !== userTeamId
  );
}

// =============================================================================
// TIEBREAKER LOGIC
// =============================================================================

/**
 * Get head-to-head result between two teams
 * Returns: 1 if team1 won, -1 if team2 won, 0 if not played or tie
 */
export function getHeadToHead(
  schedule: ScheduledGame[],
  team1Id: string,
  team2Id: string
): number {
  const game = schedule.find(
    g => (g.homeTeamId === team1Id && g.awayTeamId === team2Id) ||
         (g.homeTeamId === team2Id && g.awayTeamId === team1Id)
  );

  if (!game || !game.result) return 0;

  const team1IsHome = game.homeTeamId === team1Id;
  const team1Score = team1IsHome ? game.result.homeScore : game.result.awayScore;
  const team2Score = team1IsHome ? game.result.awayScore : game.result.homeScore;

  if (team1Score > team2Score) return 1;
  if (team2Score > team1Score) return -1;
  return 0;  // Tie (shouldn't happen in football, but handle it)
}

/**
 * Sort standings with tiebreakers:
 * 1. Win percentage (wins / games played)
 * 2. Head-to-head (for 2-way ties)
 * 3. Point differential
 * 4. Random (for 3+ way ties where h2h is inconclusive)
 */
export function sortStandingsWithTiebreakers(
  standings: TeamStanding[],
  schedule: ScheduledGame[]
): TeamStanding[] {
  // First, sort by wins (descending)
  const sorted = [...standings].sort((a, b) => {
    // Primary: wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // Secondary: losses (fewer is better, for same win count)
    if (a.losses !== b.losses) return a.losses - b.losses;

    return 0;  // Same record, need tiebreaker
  });

  // Group teams by record for tiebreaking
  const groups: TeamStanding[][] = [];
  let currentGroup: TeamStanding[] = [];

  for (const standing of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(standing);
    } else {
      const last = currentGroup[currentGroup.length - 1];
      if (last.wins === standing.wins && last.losses === standing.losses) {
        currentGroup.push(standing);
      } else {
        groups.push(currentGroup);
        currentGroup = [standing];
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Resolve ties within each group
  const result: TeamStanding[] = [];

  for (const group of groups) {
    if (group.length === 1) {
      result.push(group[0]);
    } else if (group.length === 2) {
      // 2-way tie: use head-to-head
      const h2h = getHeadToHead(schedule, group[0].teamId, group[1].teamId);
      if (h2h === 1) {
        result.push(group[0], group[1]);
      } else if (h2h === -1) {
        result.push(group[1], group[0]);
      } else {
        // No h2h result, use point differential
        const diff0 = group[0].pointsFor - group[0].pointsAgainst;
        const diff1 = group[1].pointsFor - group[1].pointsAgainst;
        if (diff0 >= diff1) {
          result.push(group[0], group[1]);
        } else {
          result.push(group[1], group[0]);
        }
      }
    } else {
      // 3+ way tie: try head-to-head within group, then random
      const resolved = resolve3WayTie(group, schedule);
      result.push(...resolved);
    }
  }

  return result;
}

/**
 * Resolve 3+ way ties
 * First checks if one team beat all others in the tie
 * If not conclusive, uses random selection
 */
function resolve3WayTie(
  tiedTeams: TeamStanding[],
  schedule: ScheduledGame[]
): TeamStanding[] {
  // Calculate head-to-head record within the tied group
  const h2hRecords: Map<string, { wins: number; losses: number }> = new Map();

  for (const team of tiedTeams) {
    h2hRecords.set(team.teamId, { wins: 0, losses: 0 });
  }

  // Count wins/losses only against other teams in the tie
  for (let i = 0; i < tiedTeams.length; i++) {
    for (let j = i + 1; j < tiedTeams.length; j++) {
      const result = getHeadToHead(schedule, tiedTeams[i].teamId, tiedTeams[j].teamId);
      if (result === 1) {
        h2hRecords.get(tiedTeams[i].teamId)!.wins++;
        h2hRecords.get(tiedTeams[j].teamId)!.losses++;
      } else if (result === -1) {
        h2hRecords.get(tiedTeams[j].teamId)!.wins++;
        h2hRecords.get(tiedTeams[i].teamId)!.losses++;
      }
    }
  }

  // Sort by h2h record within the group
  const sorted = [...tiedTeams].sort((a, b) => {
    const aRecord = h2hRecords.get(a.teamId)!;
    const bRecord = h2hRecords.get(b.teamId)!;

    // Compare h2h wins first
    if (bRecord.wins !== aRecord.wins) return bRecord.wins - aRecord.wins;

    // Then h2h losses (fewer is better)
    if (aRecord.losses !== bRecord.losses) return aRecord.losses - bRecord.losses;

    // Still tied? Use point differential
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;

    // Final tiebreaker: random
    return Math.random() - 0.5;
  });

  return sorted;
}

/**
 * Get playoff seeding (top 4 teams)
 */
export function getPlayoffTeams(
  standings: TeamStanding[],
  schedule: ScheduledGame[]
): TeamStanding[] {
  const sorted = sortStandingsWithTiebreakers(standings, schedule);
  return sorted.slice(0, 4);
}

/**
 * Check if a team has clinched a playoff spot
 * (Can't be mathematically eliminated from top 4)
 */
export function hasClinched(
  teamId: string,
  standings: TeamStanding[],
  gamesRemaining: number
): boolean {
  const team = standings.find(s => s.teamId === teamId);
  if (!team) return false;

  // Sort by wins descending
  const sorted = [...standings].sort((a, b) => b.wins - a.wins);
  const teamRank = sorted.findIndex(s => s.teamId === teamId);

  // Already in top 4
  if (teamRank < 4) {
    // Check if 5th place team can catch up
    const fifthPlace = sorted[4];
    if (!fifthPlace) return true;

    const maxFifthWins = fifthPlace.wins + gamesRemaining;
    return team.wins > maxFifthWins;
  }

  return false;
}

/**
 * Check if a team is eliminated from playoffs
 */
export function isEliminated(
  teamId: string,
  standings: TeamStanding[],
  gamesRemaining: number
): boolean {
  const team = standings.find(s => s.teamId === teamId);
  if (!team) return true;

  // Sort by wins descending
  const sorted = [...standings].sort((a, b) => b.wins - a.wins);
  const fourthPlace = sorted[3];

  if (!fourthPlace) return false;

  // Team's max possible wins
  const maxWins = team.wins + gamesRemaining;

  // Can't catch 4th place
  return maxWins < fourthPlace.wins;
}
