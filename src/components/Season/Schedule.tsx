/**
 * ILLEGAL MOTION - Season Schedule Component
 *
 * Displays the full season schedule with week-by-week breakdown.
 * Shows user's games prominently with opponent info, results, and upcoming matchups.
 */

import React, { useState, useMemo } from 'react';
import { useSeasonStore } from '../../stores/seasonStore';
import type { ScheduledGame } from '../../types/season.types';

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleProps {
  onSelectGame?: (game: ScheduledGame) => void;
  compact?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const Schedule: React.FC<ScheduleProps> = ({ onSelectGame, compact = false }) => {
  const {
    season,
    aiTeams,
    userTeamId,
    getUserTeamRecord,
  } = useSeasonStore();

  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(season?.currentWeek || 1);
  const [viewMode, setViewMode] = useState<'user' | 'all'>('user');

  const userRecord = getUserTeamRecord();

  // Get team info helper
  const getTeamInfo = (teamId: string) => {
    return aiTeams.find(t => t.id === teamId);
  };

  // Filter games based on view mode
  const filteredGames = useMemo(() => {
    if (!season) return [];

    let games = season.schedule;

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
  }, [season, selectedWeek, viewMode, userTeamId]);

  // Get user's games for the mini schedule
  const userGames = useMemo(() => {
    if (!season) return [];
    return season.schedule
      .filter(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId)
      .sort((a, b) => a.week - b.week);
  }, [season, userTeamId]);

  if (!season) {
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
        currentWeek={season.currentWeek}
        userTeamId={userTeamId || ''}
        getTeamInfo={getTeamInfo}
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
              {season.year} Season - Week {season.currentWeek} of {season.totalWeeks}
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
              {Array.from({ length: season.totalWeeks }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>
                  Week {week}
                  {week === season.currentWeek ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
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
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="max-h-[600px] overflow-y-auto">
        {selectedWeek === 'all' ? (
          // Group by week
          <WeekGroupedSchedule
            season={season}
            games={filteredGames}
            userTeamId={userTeamId || ''}
            getTeamInfo={getTeamInfo}
            onSelectGame={onSelectGame}
          />
        ) : (
          // Single week view
          <div className="p-4 space-y-3">
            {filteredGames.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No games scheduled for this week
              </div>
            ) : (
              filteredGames.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  userTeamId={userTeamId || ''}
                  currentWeek={season.currentWeek}
                  getTeamInfo={getTeamInfo}
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
// COMPACT SCHEDULE (for sidebar/dashboard)
// =============================================================================

interface CompactScheduleProps {
  games: ScheduledGame[];
  currentWeek: number;
  userTeamId: string;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  onSelectGame?: (game: ScheduledGame) => void;
}

const CompactSchedule: React.FC<CompactScheduleProps> = ({
  games,
  currentWeek,
  userTeamId,
  getTeamInfo,
  onSelectGame,
}) => {
  // Show previous game, current game, and next 2 games
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
        const opponent = getTeamInfo(opponentId);
        const isCurrent = game.week === currentWeek;
        const isPast = game.week < currentWeek;

        if (game.isByeWeek) {
          return (
            <div
              key={game.id}
              className={`flex items-center justify-between p-2 rounded ${
                isCurrent ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">W{game.week}</span>
                <span className="text-gray-400">BYE WEEK</span>
              </div>
              {isCurrent && (
                <span className="text-xs text-yellow-400">Current</span>
              )}
            </div>
          );
        }

        // Determine result for completed games
        let resultText = '';
        let resultColor = '';
        if (game.isComplete && game.result) {
          const userScore = isHome ? game.result.homeScore : game.result.awayScore;
          const oppScore = isHome ? game.result.awayScore : game.result.homeScore;
          const won = userScore > oppScore;
          resultText = `${won ? 'W' : 'L'} ${userScore}-${oppScore}`;
          resultColor = won ? 'text-green-400' : 'text-red-400';
        }

        return (
          <button
            key={game.id}
            onClick={() => onSelectGame?.(game)}
            disabled={isPast && game.isComplete}
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
                {opponent?.abbreviation || '???'}
              </span>
              {game.isRivalry && (
                <span className="text-xs text-red-400">Rival</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {game.isComplete ? (
                <span className={`text-sm font-medium ${resultColor}`}>{resultText}</span>
              ) : isCurrent ? (
                <span className="text-xs text-blue-400 font-medium">NEXT</span>
              ) : (
                <span className="text-xs text-gray-500">
                  {opponent ? `${opponent.rosterStrength} PWR` : ''}
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
  season: NonNullable<ReturnType<typeof useSeasonStore.getState>['season']>;
  games: ScheduledGame[];
  userTeamId: string;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  onSelectGame?: (game: ScheduledGame) => void;
}

const WeekGroupedSchedule: React.FC<WeekGroupedScheduleProps> = ({
  season,
  games,
  userTeamId,
  getTeamInfo,
  onSelectGame,
}) => {
  const weeks = Array.from({ length: season.totalWeeks }, (_, i) => i + 1);

  return (
    <div className="divide-y divide-gray-800">
      {weeks.map(week => {
        const weekGames = games.filter(g => g.week === week);
        if (weekGames.length === 0) return null;

        const isCurrent = week === season.currentWeek;
        const isPast = week < season.currentWeek;

        return (
          <div key={week} className={`${isCurrent ? 'bg-blue-900/20' : ''}`}>
            <div className={`px-4 py-2 flex items-center justify-between ${
              isCurrent ? 'bg-blue-900/30' : 'bg-gray-800/50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Week {week}</span>
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
                  key={game.id}
                  game={game}
                  userTeamId={userTeamId}
                  currentWeek={season.currentWeek}
                  getTeamInfo={getTeamInfo}
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
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  onSelect?: (game: ScheduledGame) => void;
  compact?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  userTeamId,
  currentWeek,
  getTeamInfo,
  onSelect,
  compact = false,
}) => {
  const isUserGame = game.homeTeamId === userTeamId || game.awayTeamId === userTeamId;
  const isHome = game.homeTeamId === userTeamId;
  const isCurrent = game.week === currentWeek;
  const isPast = game.week < currentWeek;

  const homeTeam = getTeamInfo(game.homeTeamId);
  const awayTeam = getTeamInfo(game.awayTeamId);

  // Bye week
  if (game.isByeWeek) {
    return (
      <div className={`rounded-lg p-4 ${
        isCurrent ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-gray-800'
      }`}>
        <div className="flex items-center justify-center gap-3">
          <span className="text-lg text-yellow-400">BYE WEEK</span>
          {isCurrent && (
            <span className="text-xs text-yellow-400">- Rest up!</span>
          )}
        </div>
      </div>
    );
  }

  // Result styling for completed games
  let userWon = false;
  let resultStyle = '';
  if (game.isComplete && game.result && isUserGame) {
    const userScore = isHome ? game.result.homeScore : game.result.awayScore;
    const oppScore = isHome ? game.result.awayScore : game.result.homeScore;
    userWon = userScore > oppScore;
    resultStyle = userWon ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500';
  }

  if (compact) {
    return (
      <button
        onClick={() => onSelect?.(game)}
        disabled={isPast && game.isComplete && !isUserGame}
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
            style={{ backgroundColor: awayTeam?.colors?.primary || '#666' }}
          />
          <span className={`text-sm ${awayTeam?.id === userTeamId ? 'text-white font-bold' : 'text-gray-300'}`}>
            {awayTeam?.abbreviation || '???'}
          </span>
        </div>

        {/* Score / Status */}
        <div className="text-center w-1/3">
          {game.isComplete && game.result ? (
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
              {game.result.isOvertime && (
                <span className="text-xs text-yellow-400">OT</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              {isCurrent ? 'TODAY' : 'Scheduled'}
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-end gap-2 w-1/3">
          <span className={`text-sm ${homeTeam?.id === userTeamId ? 'text-white font-bold' : 'text-gray-300'}`}>
            {homeTeam?.abbreviation || '???'}
          </span>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: homeTeam?.colors?.primary || '#666' }}
          />
        </div>
      </button>
    );
  }

  // Full game card
  return (
    <button
      onClick={() => onSelect?.(game)}
      disabled={isPast && game.isComplete && !isUserGame}
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
              style={{ backgroundColor: awayTeam?.colors?.primary || '#666' }}
            >
              {awayTeam?.abbreviation?.slice(0, 2) || '??'}
            </div>
            <div className="text-left">
              <div className={`font-medium ${
                awayTeam?.id === userTeamId ? 'text-white' : 'text-gray-300'
              }`}>
                {awayTeam?.name || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500">
                {awayTeam?.gmPersonality || 'Away'}
              </div>
            </div>
          </div>
        </div>

        {/* Score / Status */}
        <div className="px-6 text-center">
          {game.isComplete && game.result ? (
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
              {game.result.isOvertime && (
                <div className="text-xs text-yellow-400 mt-1">OVERTIME</div>
              )}
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
                homeTeam?.id === userTeamId ? 'text-white' : 'text-gray-300'
              }`}>
                {homeTeam?.name || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500">
                {homeTeam?.gmPersonality || 'Home'}
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: homeTeam?.colors?.primary || '#666' }}
            >
              {homeTeam?.abbreviation?.slice(0, 2) || '??'}
            </div>
          </div>
        </div>
      </div>

      {/* Game Tags */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {game.isRivalry && (
          <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
            RIVALRY
          </span>
        )}
        {isUserGame && !game.isComplete && (
          <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
            YOUR GAME
          </span>
        )}
        {game.spreadLine !== undefined && !game.isComplete && (
          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
            Line: {game.spreadLine > 0 ? `+${game.spreadLine}` : game.spreadLine}
          </span>
        )}
        {game.overUnder !== undefined && !game.isComplete && (
          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
            O/U: {game.overUnder}
          </span>
        )}
      </div>
    </button>
  );
};

export default Schedule;
