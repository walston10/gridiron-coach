/**
 * League Standings Component
 *
 * Displays the 8-team league standings with W-L records,
 * point differentials, and playoff picture.
 */

import React from 'react';
import { useLeagueStore, getTeamName, getTeamAbbreviation } from '../../stores/leagueStore';
import { STATIC_TEAMS } from '../../data/staticTeams';
import type { TeamStanding } from '../../types/league.types';

// =============================================================================
// TYPES
// =============================================================================

interface LeagueStandingsProps {
  compact?: boolean;
  userTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LeagueStandings: React.FC<LeagueStandingsProps> = ({
  compact = false,
  userTeamId,
  onSelectTeam,
}) => {
  const { phase, week, getStandingsSorted } = useLeagueStore();
  const standings = getStandingsSorted();

  // Find user team ID from standings (it's the one not in STATIC_TEAMS)
  const detectedUserTeamId = userTeamId || standings.find(s =>
    !STATIC_TEAMS.some(t => t.info.id === s.teamId)
  )?.teamId || '';

  if (phase === 'NOT_STARTED' || standings.length === 0) {
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
        userTeamId={detectedUserTeamId}
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
              {phase === 'REGULAR_SEASON' ? `Week ${week} of 7` :
               phase === 'PLAYOFFS' ? 'Playoffs' : 'Season Complete'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-400">Playoff Position</span>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {standings.map((standing, index) => (
              <StandingsRow
                key={standing.teamId}
                standing={standing}
                rank={index + 1}
                isUserTeam={standing.teamId === detectedUserTeamId}
                isPlayoffPosition={index < 4}
                showPlayoffLine={index === 3}
                onSelect={onSelectTeam}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Playoff Picture Summary */}
      <PlayoffPictureSummary
        standings={standings}
        userTeamId={detectedUserTeamId}
      />
    </div>
  );
};

// =============================================================================
// STANDINGS ROW
// =============================================================================

interface StandingsRowProps {
  standing: TeamStanding;
  rank: number;
  isUserTeam: boolean;
  isPlayoffPosition: boolean;
  showPlayoffLine: boolean;
  onSelect?: (teamId: string) => void;
}

const StandingsRow: React.FC<StandingsRowProps> = ({
  standing,
  rank,
  isUserTeam,
  isPlayoffPosition,
  showPlayoffLine,
  onSelect,
}) => {
  const staticTeam = STATIC_TEAMS.find(t => t.info.id === standing.teamId);
  const teamName = getTeamName(standing.teamId);
  const teamAbbr = getTeamAbbreviation(standing.teamId);
  const primaryColor = staticTeam?.info.primaryColor || '#4a5568';

  const gamesPlayed = standing.wins + standing.losses;
  const winPct = gamesPlayed > 0 ? standing.wins / gamesPlayed : 0;
  const pointDiff = standing.pointsFor - standing.pointsAgainst;

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
          ${isPlayoffPosition ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-400'}
        `}>
          {rank}
        </div>
      </td>

      {/* Team */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {teamAbbr.slice(0, 2)}
          </div>
          <div>
            <div className={`font-medium ${isUserTeam ? 'text-blue-400' : 'text-white'}`}>
              {teamName}
              {isUserTeam && <span className="ml-2 text-xs text-blue-400/70">(You)</span>}
            </div>
            {staticTeam && (
              <div className="text-xs text-gray-500">
                {staticTeam.info.identity.description}
              </div>
            )}
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
          {winPct > 0 ? winPct.toFixed(3).slice(1) : '.000'}
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
          pointDiff > 0 ? 'text-green-400' :
          pointDiff < 0 ? 'text-red-400' :
          'text-gray-400'
        }>
          {pointDiff > 0 ? '+' : ''}{pointDiff}
        </span>
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
  onSelectTeam?: (teamId: string) => void;
}

const CompactStandings: React.FC<CompactStandingsProps> = ({
  standings,
  userTeamId,
  onSelectTeam,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-sm font-medium text-gray-400 mb-3">Standings</div>

      <div className="space-y-1">
        {standings.map((standing, index) => {
          const isUserTeam = standing.teamId === userTeamId;
          const isPlayoffPosition = index < 4;
          const isPlayoffLine = index === 3;
          const staticTeam = STATIC_TEAMS.find(t => t.info.id === standing.teamId);
          const primaryColor = staticTeam?.info.primaryColor || '#4a5568';
          const abbr = getTeamAbbreviation(standing.teamId);

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
                  isPlayoffPosition ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {index + 1}
                </span>

                <div
                  className="w-5 h-5 rounded text-xs flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {abbr.charAt(0)}
                </div>

                <span className={`text-sm ${isUserTeam ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  {abbr}
                </span>
              </div>

              <span className="text-sm text-gray-400">
                {standing.wins}-{standing.losses}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// PLAYOFF PICTURE SUMMARY
// =============================================================================

interface PlayoffPictureSummaryProps {
  standings: TeamStanding[];
  userTeamId: string;
}

const PlayoffPictureSummary: React.FC<PlayoffPictureSummaryProps> = ({
  standings,
  userTeamId,
}) => {
  const userStanding = standings.find(s => s.teamId === userTeamId);
  const userRank = standings.findIndex(s => s.teamId === userTeamId) + 1;
  const inPlayoffPosition = userRank <= 4;

  const playoffTeams = standings.slice(0, 4);
  const bubbleTeams = standings.slice(4, 6);

  return (
    <div className="p-4 bg-gray-800/50 border-t border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Playoff Picture</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* In Position */}
        <div>
          <div className="text-xs text-gray-500 mb-2">In Playoff Position</div>
          <div className="space-y-1">
            {playoffTeams.map((standing, index) => {
              const staticTeam = STATIC_TEAMS.find(t => t.info.id === standing.teamId);
              const isUser = standing.teamId === userTeamId;
              const abbr = getTeamAbbreviation(standing.teamId);

              return (
                <div
                  key={standing.teamId}
                  className={`flex items-center gap-2 text-sm ${
                    isUser ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  <span className="w-4 text-xs text-blue-400 font-bold">#{index + 1}</span>
                  <div
                    className="w-4 h-4 rounded text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: staticTeam?.info.primaryColor || '#666' }}
                  >
                    {abbr.charAt(0)}
                  </div>
                  <span className={isUser ? 'font-medium' : ''}>{abbr}</span>
                  <span className="text-gray-500">({standing.wins}-{standing.losses})</span>
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
              const staticTeam = STATIC_TEAMS.find(t => t.info.id === standing.teamId);
              const isUser = standing.teamId === userTeamId;
              const abbr = getTeamAbbreviation(standing.teamId);
              const gamesBack = (playoffTeams[3]?.wins || 0) - standing.wins;

              return (
                <div
                  key={standing.teamId}
                  className={`flex items-center gap-2 text-sm ${
                    isUser ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  <span className="w-4 text-xs text-gray-500 font-bold">#{5 + index}</span>
                  <div
                    className="w-4 h-4 rounded text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: staticTeam?.info.primaryColor || '#666' }}
                  >
                    {abbr.charAt(0)}
                  </div>
                  <span className={isUser ? 'font-medium' : ''}>{abbr}</span>
                  <span className="text-gray-500">({standing.wins}-{standing.losses})</span>
                  {gamesBack > 0 && (
                    <span className="text-xs text-yellow-400">{gamesBack} GB</span>
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
          inPlayoffPosition
            ? 'bg-blue-900/30 border border-blue-800'
            : 'bg-yellow-900/30 border border-yellow-800'
        }`}>
          <div className="flex items-center gap-2">
            {inPlayoffPosition ? (
              <span className="text-blue-400 font-medium">
                Currently #{userRank} Seed
              </span>
            ) : (
              <>
                <span className="text-yellow-400 font-medium">Outside Playoff Picture</span>
                {(() => {
                  const gamesBack = (playoffTeams[3]?.wins || 0) - userStanding.wins;
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

export default LeagueStandings;
