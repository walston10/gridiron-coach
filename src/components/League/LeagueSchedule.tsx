/**
 * League Schedule Component
 *
 * Displays the 7-week round-robin schedule with all games.
 * Highlights user games and shows results for completed games.
 */

import React, { useState, useMemo } from 'react';
import { useLeagueStore, getTeamName, getTeamAbbreviation } from '../../stores/leagueStore';
import { STATIC_TEAMS } from '../../data/staticTeams';
import type { ScheduledGame } from '../../types/league.types';

// =============================================================================
// TYPES
// =============================================================================

interface LeagueScheduleProps {
  compact?: boolean;
  onSelectGame?: (game: ScheduledGame) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LeagueSchedule: React.FC<LeagueScheduleProps> = ({
  compact = false,
  onSelectGame,
}) => {
  const { phase, week, schedule, standings } = useLeagueStore();
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(week || 1);
  const [viewMode, setViewMode] = useState<'user' | 'all'>('all');

  // Find user team ID
  const userTeamId = standings.find(s =>
    !STATIC_TEAMS.some(t => t.info.id === s.teamId)
  )?.teamId || '';

  // Filter games based on view mode
  const filteredGames = useMemo(() => {
    let games = schedule;

    // Filter by week
    if (selectedWeek !== 'all') {
      games = games.filter(g => g.week === selectedWeek);
    }

    // Filter by user involvement
    if (viewMode === 'user') {
      games = games.filter(g =>
        g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
      );
    }

    return games.sort((a, b) => a.week - b.week);
  }, [schedule, selectedWeek, viewMode, userTeamId]);

  // Get user's games for mini schedule
  const userGames = useMemo(() => {
    return schedule
      .filter(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId)
      .sort((a, b) => a.week - b.week);
  }, [schedule, userTeamId]);

  // Get user record
  const userRecord = useMemo(() => {
    const standing = standings.find(s => s.teamId === userTeamId);
    return standing ? { wins: standing.wins, losses: standing.losses } : { wins: 0, losses: 0 };
  }, [standings, userTeamId]);

  if (phase === 'NOT_STARTED' || schedule.length === 0) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <div className="text-gray-400 text-center">No season in progress</div>
      </div>
    );
  }

  if (compact) {
    return (
      <CompactSchedule
        games={userGames}
        currentWeek={week}
        userTeamId={userTeamId}
        onSelectGame={onSelectGame}
      />
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Season Schedule</h2>
            <div className="text-gray-400 text-sm mt-1">
              {phase === 'REGULAR_SEASON' ? `Week ${week} of 7` :
               phase === 'PLAYOFFS' ? 'Playoffs' : 'Season Complete'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {userRecord.wins}-{userRecord.losses}
            </div>
            <div className="text-gray-400 text-sm">Your Record</div>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-4 mt-4">
          {/* Week Selector */}
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Week:</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value="all">All Weeks</option>
              {[1, 2, 3, 4, 5, 6, 7].map(w => (
                <option key={w} value={w}>
                  Week {w}
                  {w === week ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => setViewMode('user')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My Games
            </button>
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="max-h-[600px] overflow-y-auto">
        {selectedWeek === 'all' ? (
          <WeekGroupedSchedule
            games={filteredGames}
            currentWeek={week}
            userTeamId={userTeamId}
            onSelectGame={onSelectGame}
          />
        ) : (
          <div className="p-4 space-y-3">
            {filteredGames.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No games for this selection
              </div>
            ) : (
              filteredGames.map(game => (
                <GameCard
                  key={game.gameId}
                  game={game}
                  userTeamId={userTeamId}
                  currentWeek={week}
                  onSelect={onSelectGame}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// COMPACT SCHEDULE
// =============================================================================

interface CompactScheduleProps {
  games: ScheduledGame[];
  currentWeek: number;
  userTeamId: string;
  onSelectGame?: (game: ScheduledGame) => void;
}

const CompactSchedule: React.FC<CompactScheduleProps> = ({
  games,
  currentWeek,
  userTeamId,
  onSelectGame,
}) => {
  // Show previous, current, and next 2 games
  const relevantGames = useMemo(() => {
    const currentIndex = games.findIndex(g => g.week === currentWeek);
    const start = Math.max(0, currentIndex - 1);
    const end = Math.min(games.length, currentIndex + 3);
    return games.slice(start, end);
  }, [games, currentWeek]);

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="text-sm font-medium text-gray-400 mb-2">Schedule</div>

      {relevantGames.map(game => {
        const isHome = game.homeTeamId === userTeamId;
        const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
        const staticTeam = STATIC_TEAMS.find(t => t.info.id === opponentId);
        const oppAbbr = getTeamAbbreviation(opponentId);
        const isCurrent = game.week === currentWeek;
        const isPast = game.week < currentWeek;

        // Result for completed games
        let resultText = '';
        let resultColor = '';
        if (game.result) {
          const userScore = isHome ? game.result.homeScore : game.result.awayScore;
          const oppScore = isHome ? game.result.awayScore : game.result.homeScore;
          const won = userScore > oppScore;
          resultText = `${won ? 'W' : 'L'} ${userScore}-${oppScore}`;
          resultColor = won ? 'text-green-400' : 'text-red-400';
        }

        return (
          <button
            key={game.gameId}
            onClick={() => onSelectGame?.(game)}
            disabled={isPast && !!game.result}
            className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
              isCurrent
                ? 'bg-blue-900/30 border border-blue-700 hover:bg-blue-900/50'
                : isPast
                  ? 'bg-gray-700/30'
                  : 'bg-gray-700/50 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6">W{game.week}</span>
              <span className="text-xs text-gray-400">{isHome ? 'vs' : '@'}</span>
              <span className={`text-sm ${isCurrent ? 'text-white font-medium' : 'text-gray-300'}`}>
                {oppAbbr}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {game.result ? (
                <span className={`text-sm font-medium ${resultColor}`}>{resultText}</span>
              ) : isCurrent ? (
                <span className="text-xs text-blue-400 font-medium">NEXT</span>
              ) : (
                <span className="text-xs text-gray-500">
                  {staticTeam ? `${staticTeam.info.identity.overall} OVR` : ''}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// WEEK GROUPED SCHEDULE
// =============================================================================

interface WeekGroupedScheduleProps {
  games: ScheduledGame[];
  currentWeek: number;
  userTeamId: string;
  onSelectGame?: (game: ScheduledGame) => void;
}

const WeekGroupedSchedule: React.FC<WeekGroupedScheduleProps> = ({
  games,
  currentWeek,
  userTeamId,
  onSelectGame,
}) => {
  const weeks = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="divide-y divide-gray-800">
      {weeks.map(weekNum => {
        const weekGames = games.filter(g => g.week === weekNum);
        if (weekGames.length === 0) return null;

        const isCurrent = weekNum === currentWeek;
        const isPast = weekNum < currentWeek;

        return (
          <div key={weekNum} className={`${isCurrent ? 'bg-blue-900/20' : ''}`}>
            <div className={`px-4 py-2 flex items-center justify-between ${
              isCurrent ? 'bg-blue-900/30' : 'bg-gray-800/50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Week {weekNum}</span>
                {isCurrent && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
                {isPast && (
                  <span className="text-xs text-gray-500">Complete</span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-2">
              {weekGames.map(game => (
                <GameCard
                  key={game.gameId}
                  game={game}
                  userTeamId={userTeamId}
                  currentWeek={currentWeek}
                  onSelect={onSelectGame}
                  compact
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// GAME CARD
// =============================================================================

interface GameCardProps {
  game: ScheduledGame;
  userTeamId: string;
  currentWeek: number;
  onSelect?: (game: ScheduledGame) => void;
  compact?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  userTeamId,
  currentWeek,
  onSelect,
  compact = false,
}) => {
  const isUserGame = game.homeTeamId === userTeamId || game.awayTeamId === userTeamId;
  const isHome = game.homeTeamId === userTeamId;
  const isCurrent = game.week === currentWeek;
  const isPast = game.week < currentWeek;

  const homeTeamStatic = STATIC_TEAMS.find(t => t.info.id === game.homeTeamId);
  const awayTeamStatic = STATIC_TEAMS.find(t => t.info.id === game.awayTeamId);
  const homeColor = homeTeamStatic?.info.primaryColor || '#4a5568';
  const awayColor = awayTeamStatic?.info.primaryColor || '#4a5568';
  const homeAbbr = getTeamAbbreviation(game.homeTeamId);
  const awayAbbr = getTeamAbbreviation(game.awayTeamId);

  // Result styling
  let userWon = false;
  let resultStyle = '';
  if (game.result && isUserGame) {
    const userScore = isHome ? game.result.homeScore : game.result.awayScore;
    const oppScore = isHome ? game.result.awayScore : game.result.homeScore;
    userWon = userScore > oppScore;
    resultStyle = userWon ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500';
  }

  if (compact) {
    return (
      <button
        onClick={() => onSelect?.(game)}
        disabled={isPast && !!game.result && !isUserGame}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
          isUserGame ? 'bg-gray-700/80' : 'bg-gray-800/50'
        } ${resultStyle} ${
          isCurrent && isUserGame ? 'ring-2 ring-blue-500' : ''
        } hover:bg-gray-700`}
      >
        {/* Away Team */}
        <div className="flex items-center gap-2 w-1/3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: awayColor }}
          />
          <span className={`text-sm ${game.awayTeamId === userTeamId ? 'text-white font-bold' : 'text-gray-300'}`}>
            {awayAbbr}
          </span>
        </div>

        {/* Score / Status */}
        <div className="text-center w-1/3">
          {game.result ? (
            <div className="flex items-center justify-center gap-2">
              <span className={`font-bold ${
                game.result.awayScore > game.result.homeScore ? 'text-white' : 'text-gray-400'
              }`}>
                {game.result.awayScore}
              </span>
              <span className="text-gray-500">-</span>
              <span className={`font-bold ${
                game.result.homeScore > game.result.awayScore ? 'text-white' : 'text-gray-400'
              }`}>
                {game.result.homeScore}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              {isCurrent ? 'TODAY' : 'Scheduled'}
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-end gap-2 w-1/3">
          <span className={`text-sm ${game.homeTeamId === userTeamId ? 'text-white font-bold' : 'text-gray-300'}`}>
            {homeAbbr}
          </span>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: homeColor }}
          />
        </div>
      </button>
    );
  }

  // Full game card
  const homeName = getTeamName(game.homeTeamId);
  const awayName = getTeamName(game.awayTeamId);

  return (
    <button
      onClick={() => onSelect?.(game)}
      disabled={isPast && !!game.result && !isUserGame}
      className={`w-full rounded-lg p-4 transition-colors ${
        isUserGame ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 hover:bg-gray-700/50'
      } ${resultStyle} ${
        isCurrent && isUserGame ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Away Team */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: awayColor }}
            >
              {awayAbbr.slice(0, 2)}
            </div>
            <div className="text-left">
              <div className={`font-medium ${
                game.awayTeamId === userTeamId ? 'text-white' : 'text-gray-300'
              }`}>
                {awayName}
              </div>
              <div className="text-xs text-gray-500">
                {awayTeamStatic?.info.identity.offenseStyle || 'Away'}
              </div>
            </div>
          </div>
        </div>

        {/* Score / Status */}
        <div className="px-6 text-center">
          {game.result ? (
            <div>
              <div className="flex items-center gap-3 text-2xl font-bold">
                <span className={game.result.awayScore > game.result.homeScore ? 'text-white' : 'text-gray-500'}>
                  {game.result.awayScore}
                </span>
                <span className="text-gray-600">-</span>
                <span className={game.result.homeScore > game.result.awayScore ? 'text-white' : 'text-gray-500'}>
                  {game.result.homeScore}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">FINAL</div>
            </div>
          ) : (
            <div>
              <div className="text-lg text-gray-400">@</div>
              {isCurrent ? (
                <div className="text-xs text-blue-400 font-medium mt-1">GAME DAY</div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">Week {game.week}</div>
              )}
            </div>
          )}
        </div>

        {/* Home Team */}
        <div className="flex-1">
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <div className={`font-medium ${
                game.homeTeamId === userTeamId ? 'text-white' : 'text-gray-300'
              }`}>
                {homeName}
              </div>
              <div className="text-xs text-gray-500">
                {homeTeamStatic?.info.identity.offenseStyle || 'Home'}
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: homeColor }}
            >
              {homeAbbr.slice(0, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* Game Tags */}
      {isUserGame && !game.result && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
            YOUR GAME
          </span>
        </div>
      )}
    </button>
  );
};

export default LeagueSchedule;
