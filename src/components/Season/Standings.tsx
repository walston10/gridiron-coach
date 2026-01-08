/**
 * ILLEGAL MOTION - League Standings Component
 *
 * Displays league standings with playoff picture.
 * Shows W-L records, point differentials, streaks, and playoff seeding.
 */

import React, { useMemo } from 'react';
import { useSeasonStore } from '../../stores/seasonStore';
import type { TeamStanding } from '../../types/season.types';

// =============================================================================
// TYPES
// =============================================================================

interface StandingsProps {
  compact?: boolean;
  highlightPlayoffLine?: boolean;
  onSelectTeam?: (teamId: string) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const Standings: React.FC<StandingsProps> = ({
  compact = false,
  highlightPlayoffLine = true,
  onSelectTeam,
}) => {
  const {
    season,
    aiTeams,
    userTeamId,
    config,
  } = useSeasonStore();

  const standings = useMemo(() => {
    if (!season) return [];
    return [...season.standings].sort((a, b) => a.rank - b.rank);
  }, [season]);

  // Get team info helper
  const getTeamInfo = (teamId: string) => {
    return aiTeams.find(t => t.id === teamId);
  };

  if (!season) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <div className="text-gray-400 text-center">No season in progress</div>
      </div>
    );
  }

  if (compact) {
    return (
      <CompactStandings
        standings={standings}
        userTeamId={userTeamId || ''}
        playoffTeams={config.playoffTeams}
        getTeamInfo={getTeamInfo}
        onSelectTeam={onSelectTeam}
      />
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">League Standings</h2>
            <div className="text-gray-400 text-sm mt-1">
              Week {season.currentWeek} of {season.totalWeeks}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-400">Clinched</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-400">Playoff Position</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-xs text-gray-400">Eliminated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800/50 text-xs text-gray-400 uppercase">
              <th className="py-3 px-4 text-left w-12">#</th>
              <th className="py-3 px-4 text-left">Team</th>
              <th className="py-3 px-4 text-center">W</th>
              <th className="py-3 px-4 text-center">L</th>
              <th className="py-3 px-4 text-center">PCT</th>
              <th className="py-3 px-4 text-center">PF</th>
              <th className="py-3 px-4 text-center">PA</th>
              <th className="py-3 px-4 text-center">DIFF</th>
              <th className="py-3 px-4 text-center">STRK</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {standings.map((standing, index) => {
              const team = getTeamInfo(standing.teamId);
              const isUserTeam = standing.teamId === userTeamId;
              const isPlayoffPosition = index < config.playoffTeams;
              const showPlayoffLine = highlightPlayoffLine && index === config.playoffTeams - 1;

              return (
                <StandingsRow
                  key={standing.teamId}
                  standing={standing}
                  team={team}
                  isUserTeam={isUserTeam}
                  isPlayoffPosition={isPlayoffPosition}
                  showPlayoffLine={showPlayoffLine}
                  onSelect={onSelectTeam}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Playoff Picture Summary */}
      <PlayoffPictureSummary
        standings={standings}
        playoffTeams={config.playoffTeams}
        userTeamId={userTeamId || ''}
        getTeamInfo={getTeamInfo}
      />
    </div>
  );
};

// =============================================================================
// STANDINGS ROW
// =============================================================================

interface StandingsRowProps {
  standing: TeamStanding;
  team: ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  isUserTeam: boolean;
  isPlayoffPosition: boolean;
  showPlayoffLine: boolean;
  onSelect?: (teamId: string) => void;
}

const StandingsRow: React.FC<StandingsRowProps> = ({
  standing,
  team,
  isUserTeam,
  isPlayoffPosition,
  showPlayoffLine,
  onSelect,
}) => {
  const getStreakDisplay = () => {
    if (standing.currentStreak === 0) return '-';
    const type = standing.currentStreak > 0 ? 'W' : 'L';
    return `${type}${Math.abs(standing.currentStreak)}`;
  };

  const getStreakColor = () => {
    if (standing.currentStreak >= 3) return 'text-green-400';
    if (standing.currentStreak <= -3) return 'text-red-400';
    if (standing.currentStreak > 0) return 'text-green-300/70';
    if (standing.currentStreak < 0) return 'text-red-300/70';
    return 'text-gray-500';
  };

  const getStatusBadge = () => {
    if (standing.isClinched) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          Clinched
        </span>
      );
    }
    if (standing.isEliminated) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
          Eliminated
        </span>
      );
    }
    if (standing.magicNumber !== null && standing.magicNumber > 0) {
      return (
        <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
          M# {standing.magicNumber}
        </span>
      );
    }
    return null;
  };

  return (
    <tr
      onClick={() => onSelect?.(standing.teamId)}
      className={`
        transition-colors cursor-pointer
        ${isUserTeam ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'hover:bg-gray-800/50'}
        ${showPlayoffLine ? 'border-b-2 border-b-blue-500' : ''}
      `}
    >
      {/* Rank */}
      <td className="py-3 px-4">
        <div className={`
          w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
          ${standing.isClinched ? 'bg-green-900/50 text-green-400' :
            standing.isEliminated ? 'bg-red-900/50 text-red-400' :
            isPlayoffPosition ? 'bg-blue-900/50 text-blue-400' :
            'bg-gray-700 text-gray-400'}
        `}>
          {standing.rank}
        </div>
      </td>

      {/* Team */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: team?.colors?.primary || '#666' }}
          >
            {team?.abbreviation?.slice(0, 2) || '??'}
          </div>
          <div>
            <div className={`font-medium ${isUserTeam ? 'text-blue-400' : 'text-white'}`}>
              {team?.name || 'Unknown'}
              {isUserTeam && <span className="ml-2 text-xs text-blue-400/70">(You)</span>}
            </div>
            <div className="text-xs text-gray-500">
              {team?.city || ''} - {team?.gmPersonality || ''}
            </div>
          </div>
        </div>
      </td>

      {/* W */}
      <td className="py-3 px-4 text-center">
        <span className="font-bold text-green-400">{standing.wins}</span>
      </td>

      {/* L */}
      <td className="py-3 px-4 text-center">
        <span className="font-bold text-red-400">{standing.losses}</span>
      </td>

      {/* PCT */}
      <td className="py-3 px-4 text-center">
        <span className="text-gray-300">
          {standing.winPercentage > 0 ? standing.winPercentage.toFixed(3).slice(1) : '.000'}
        </span>
      </td>

      {/* PF */}
      <td className="py-3 px-4 text-center text-gray-400">
        {standing.pointsFor}
      </td>

      {/* PA */}
      <td className="py-3 px-4 text-center text-gray-400">
        {standing.pointsAgainst}
      </td>

      {/* DIFF */}
      <td className="py-3 px-4 text-center">
        <span className={
          standing.pointDifferential > 0 ? 'text-green-400' :
          standing.pointDifferential < 0 ? 'text-red-400' :
          'text-gray-400'
        }>
          {standing.pointDifferential > 0 ? '+' : ''}{standing.pointDifferential}
        </span>
      </td>

      {/* Streak */}
      <td className="py-3 px-4 text-center">
        <span className={`font-medium ${getStreakColor()}`}>
          {getStreakDisplay()}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-4 text-center">
        {getStatusBadge()}
      </td>
    </tr>
  );
};

// =============================================================================
// COMPACT STANDINGS
// =============================================================================

interface CompactStandingsProps {
  standings: TeamStanding[];
  userTeamId: string;
  playoffTeams: number;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  onSelectTeam?: (teamId: string) => void;
}

const CompactStandings: React.FC<CompactStandingsProps> = ({
  standings,
  userTeamId,
  playoffTeams,
  getTeamInfo,
  onSelectTeam,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-sm font-medium text-gray-400 mb-3">Standings</div>

      <div className="space-y-1">
        {standings.slice(0, 8).map((standing, index) => {
          const team = getTeamInfo(standing.teamId);
          const isUserTeam = standing.teamId === userTeamId;
          const isPlayoffPosition = index < playoffTeams;
          const isPlayoffLine = index === playoffTeams - 1;

          return (
            <button
              key={standing.teamId}
              onClick={() => onSelectTeam?.(standing.teamId)}
              className={`
                w-full flex items-center justify-between p-2 rounded transition-colors
                ${isUserTeam ? 'bg-blue-900/30' : 'hover:bg-gray-700/50'}
                ${isPlayoffLine ? 'border-b border-b-blue-500' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 text-xs font-bold ${
                  standing.isClinched ? 'text-green-400' :
                  standing.isEliminated ? 'text-red-400' :
                  isPlayoffPosition ? 'text-blue-400' :
                  'text-gray-500'
                }`}>
                  {standing.rank}
                </span>

                <div
                  className="w-5 h-5 rounded text-xs flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: team?.colors?.primary || '#666' }}
                >
                  {team?.abbreviation?.charAt(0) || '?'}
                </div>

                <span className={`text-sm ${isUserTeam ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  {team?.abbreviation || '???'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {standing.wins}-{standing.losses}
                </span>

                {standing.isClinched && (
                  <span className="w-2 h-2 bg-green-400 rounded-full" title="Clinched" />
                )}
                {standing.isEliminated && (
                  <span className="w-2 h-2 bg-red-400 rounded-full" title="Eliminated" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* User's position if not in top 8 */}
      {!standings.slice(0, 8).find(s => s.teamId === userTeamId) && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          {(() => {
            const userStanding = standings.find(s => s.teamId === userTeamId);
            const team = getTeamInfo(userTeamId);

            if (!userStanding) return null;

            return (
              <div className="flex items-center justify-between p-2 bg-blue-900/30 rounded">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-xs font-bold text-gray-500">{userStanding.rank}</span>
                  <div
                    className="w-5 h-5 rounded text-xs flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team?.colors?.primary || '#666' }}
                  >
                    {team?.abbreviation?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-blue-400 font-medium">{team?.abbreviation || '???'}</span>
                  <span className="text-xs text-blue-400/70">(You)</span>
                </div>
                <span className="text-sm text-gray-400">
                  {userStanding.wins}-{userStanding.losses}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PLAYOFF PICTURE SUMMARY
// =============================================================================

interface PlayoffPictureSummaryProps {
  standings: TeamStanding[];
  playoffTeams: number;
  userTeamId: string;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
}

const PlayoffPictureSummary: React.FC<PlayoffPictureSummaryProps> = ({
  standings,
  playoffTeams,
  userTeamId,
  getTeamInfo,
}) => {
  const userStanding = standings.find(s => s.teamId === userTeamId);
  const inPlayoffPosition = userStanding && standings.indexOf(userStanding) < playoffTeams;

  const playoffTeamsList = standings.slice(0, playoffTeams);
  const bubbleTeams = standings.slice(playoffTeams, playoffTeams + 2);

  return (
    <div className="p-4 bg-gray-800/50 border-t border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Playoff Picture</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* In Position */}
        <div>
          <div className="text-xs text-gray-500 mb-2">In Playoff Position</div>
          <div className="space-y-1">
            {playoffTeamsList.map((standing, index) => {
              const team = getTeamInfo(standing.teamId);
              const isUserTeam = standing.teamId === userTeamId;

              return (
                <div
                  key={standing.teamId}
                  className={`flex items-center gap-2 text-sm ${
                    isUserTeam ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  <span className="w-4 text-xs text-blue-400 font-bold">#{index + 1}</span>
                  <div
                    className="w-4 h-4 rounded text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: team?.colors?.primary || '#666' }}
                  >
                    {team?.abbreviation?.charAt(0) || '?'}
                  </div>
                  <span className={isUserTeam ? 'font-medium' : ''}>
                    {team?.abbreviation || '???'}
                  </span>
                  <span className="text-gray-500">({standing.wins}-{standing.losses})</span>
                  {standing.isClinched && (
                    <span className="text-xs text-green-400">x</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* On the Bubble */}
        <div>
          <div className="text-xs text-gray-500 mb-2">On the Bubble</div>
          <div className="space-y-1">
            {bubbleTeams.map((standing, index) => {
              const team = getTeamInfo(standing.teamId);
              const isUserTeam = standing.teamId === userTeamId;
              const gamesBack = (playoffTeamsList[playoffTeams - 1]?.wins || 0) - standing.wins;

              return (
                <div
                  key={standing.teamId}
                  className={`flex items-center gap-2 text-sm ${
                    isUserTeam ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  <span className="w-4 text-xs text-gray-500 font-bold">#{playoffTeams + index + 1}</span>
                  <div
                    className="w-4 h-4 rounded text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: team?.colors?.primary || '#666' }}
                  >
                    {team?.abbreviation?.charAt(0) || '?'}
                  </div>
                  <span className={isUserTeam ? 'font-medium' : ''}>
                    {team?.abbreviation || '???'}
                  </span>
                  <span className="text-gray-500">({standing.wins}-{standing.losses})</span>
                  {gamesBack > 0 && (
                    <span className="text-xs text-yellow-400">{gamesBack} GB</span>
                  )}
                  {standing.isEliminated && (
                    <span className="text-xs text-red-400">e</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User's playoff status */}
      {userStanding && (
        <div className={`mt-4 p-3 rounded-lg ${
          userStanding.isClinched ? 'bg-green-900/30 border border-green-800' :
          userStanding.isEliminated ? 'bg-red-900/30 border border-red-800' :
          inPlayoffPosition ? 'bg-blue-900/30 border border-blue-800' :
          'bg-yellow-900/30 border border-yellow-800'
        }`}>
          <div className="flex items-center gap-2">
            {userStanding.isClinched ? (
              <>
                <span className="text-green-400 font-medium">Playoff Berth Clinched!</span>
                <span className="text-green-400/70">- #{userStanding.playoffSeed} seed</span>
              </>
            ) : userStanding.isEliminated ? (
              <span className="text-red-400 font-medium">Eliminated from Playoff Contention</span>
            ) : inPlayoffPosition ? (
              <>
                <span className="text-blue-400 font-medium">Currently #{standings.indexOf(userStanding) + 1} Seed</span>
                {userStanding.magicNumber !== null && userStanding.magicNumber > 0 && (
                  <span className="text-blue-400/70">- Magic Number: {userStanding.magicNumber}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-yellow-400 font-medium">Outside Playoff Picture</span>
                {(() => {
                  const gamesBack = (playoffTeamsList[playoffTeams - 1]?.wins || 0) - userStanding.wins;
                  return gamesBack > 0 ? (
                    <span className="text-yellow-400/70">- {gamesBack} games back</span>
                  ) : null;
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Standings;
