/**
 * League Playoff Bracket Component
 *
 * Displays the 4-team playoff bracket (Semis + Final).
 * #1 vs #4, #2 vs #3 -> Final
 */

import React from 'react';
import { useLeagueStore, getTeamName, getTeamAbbreviation } from '../../stores/leagueStore';
import { STATIC_TEAMS } from '../../data/staticTeams';
import type { PlayoffMatchup } from '../../types/league.types';

// =============================================================================
// TYPES
// =============================================================================

interface LeaguePlayoffBracketProps {
  onSelectMatchup?: (round: 'semi1' | 'semi2' | 'final') => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LeaguePlayoffBracket: React.FC<LeaguePlayoffBracketProps> = ({
  onSelectMatchup,
}) => {
  const { phase, week, playoffBracket, standings, championId, getStandingsSorted } = useLeagueStore();

  // Find user team ID
  const userTeamId = standings.find(s =>
    !STATIC_TEAMS.some(t => t.info.id === s.teamId)
  )?.teamId || '';

  // Not in playoffs yet
  if (phase === 'REGULAR_SEASON') {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Playoffs</h2>
          <p className="text-gray-400 mb-4">
            Playoffs begin after Week 7
          </p>

          {/* Preview playoff seeding */}
          <PlayoffPreview
            standings={getStandingsSorted()}
            userTeamId={userTeamId}
          />
        </div>
      </div>
    );
  }

  if (phase === 'NOT_STARTED' || !playoffBracket) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-center text-gray-400">
          No playoff bracket available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Playoff Bracket</h2>
            <div className="text-gray-400 text-sm mt-1">
              {phase === 'COMPLETE'
                ? 'SEASON COMPLETE'
                : week === 8
                  ? 'Semifinals'
                  : 'Championship Game'}
            </div>
          </div>

          {championId && (
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 text-lg">CHAMPION</span>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: STATIC_TEAMS.find(t => t.info.id === championId)?.info.primaryColor || '#4a5568' }}
              >
                {getTeamAbbreviation(championId).slice(0, 2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bracket Display */}
      <div className="p-6">
        <div className="flex items-center justify-center gap-8">
          {/* Semifinals - Left Side */}
          <div className="flex flex-col gap-8">
            <div className="text-xs text-gray-500 text-center mb-2">Semifinals</div>
            <MatchupCard
              matchup={playoffBracket.semi1}
              round="semi1"
              userTeamId={userTeamId}
              isCurrent={week === 8}
              onSelect={onSelectMatchup}
            />
            <MatchupCard
              matchup={playoffBracket.semi2}
              round="semi2"
              userTeamId={userTeamId}
              isCurrent={week === 8}
              onSelect={onSelectMatchup}
            />
          </div>

          {/* Connector Lines */}
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-8 h-0.5 bg-gray-700" />
            <div className="h-32 w-0.5 bg-gray-700" />
            <div className="w-8 h-0.5 bg-gray-700" />
          </div>

          {/* Finals */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-500 text-center mb-2">Championship</div>
            {playoffBracket.final.team1Id && playoffBracket.final.team2Id ? (
              <MatchupCard
                matchup={playoffBracket.final}
                round="final"
                userTeamId={userTeamId}
                isCurrent={week === 9}
                isFinal
                onSelect={onSelectMatchup}
              />
            ) : (
              <div className="w-64 h-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-gray-500 text-sm">TBD</span>
              </div>
            )}

            {/* Champion Display */}
            {championId && (
              <div className="mt-8">
                <ChampionDisplay
                  teamId={championId}
                  isUserTeam={championId === userTeamId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MATCHUP CARD
// =============================================================================

interface MatchupCardProps {
  matchup: PlayoffMatchup;
  round: 'semi1' | 'semi2' | 'final';
  userTeamId: string;
  isCurrent: boolean;
  isFinal?: boolean;
  onSelect?: (round: 'semi1' | 'semi2' | 'final') => void;
}

const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  round,
  userTeamId,
  isCurrent,
  isFinal = false,
  onSelect,
}) => {
  const isUserGame = matchup.team1Id === userTeamId || matchup.team2Id === userTeamId;
  const isComplete = !!matchup.result;

  const team1Static = STATIC_TEAMS.find(t => t.info.id === matchup.team1Id);
  const team2Static = STATIC_TEAMS.find(t => t.info.id === matchup.team2Id);

  return (
    <button
      onClick={() => onSelect?.(round)}
      disabled={isComplete}
      className={`
        w-64 rounded-lg p-4 transition-all
        ${isFinal ? 'bg-gradient-to-br from-yellow-900/30 to-purple-900/30 border-2 border-yellow-700/50' : 'bg-gray-800'}
        ${isCurrent && !isComplete ? 'ring-2 ring-blue-500 animate-pulse' : ''}
        ${isUserGame && !isComplete ? 'border-2 border-blue-500' : ''}
        ${!isComplete ? 'hover:bg-gray-700' : ''}
      `}
    >
      {/* Round Label for Finals */}
      {isFinal && (
        <div className="text-center mb-3">
          <span className="text-xs text-yellow-400 font-bold tracking-wider">
            THE CHAMPIONSHIP
          </span>
        </div>
      )}

      {/* Teams */}
      <div className="space-y-2">
        {/* Team 1 (Higher seed) */}
        <TeamLine
          teamId={matchup.team1Id}
          staticTeam={team1Static}
          seed={round === 'final' ? undefined : (round === 'semi1' ? 1 : 2)}
          isUserTeam={matchup.team1Id === userTeamId}
          isWinner={matchup.winnerId === matchup.team1Id}
          isLoser={isComplete && matchup.winnerId !== matchup.team1Id}
          score={matchup.result?.homeScore}
        />

        {/* Team 2 (Lower seed) */}
        <TeamLine
          teamId={matchup.team2Id}
          staticTeam={team2Static}
          seed={round === 'final' ? undefined : (round === 'semi1' ? 4 : 3)}
          isUserTeam={matchup.team2Id === userTeamId}
          isWinner={matchup.winnerId === matchup.team2Id}
          isLoser={isComplete && matchup.winnerId !== matchup.team2Id}
          score={matchup.result?.awayScore}
        />
      </div>

      {/* Status */}
      <div className="mt-3 text-center">
        {isComplete ? (
          <span className="text-xs text-gray-500">FINAL</span>
        ) : isCurrent ? (
          <span className="text-xs text-blue-400 font-medium">NOW PLAYING</span>
        ) : (
          <span className="text-xs text-gray-600">Upcoming</span>
        )}
      </div>
    </button>
  );
};

// =============================================================================
// TEAM LINE
// =============================================================================

interface TeamLineProps {
  teamId: string | null;
  staticTeam?: { info: { primaryColor: string } } | undefined;
  seed?: number;
  isUserTeam: boolean;
  isWinner: boolean;
  isLoser: boolean;
  score?: number;
}

const TeamLine: React.FC<TeamLineProps> = ({
  teamId,
  staticTeam,
  seed,
  isUserTeam,
  isWinner,
  isLoser,
  score,
}) => {
  if (!teamId) {
    return (
      <div className="flex items-center justify-between p-2 rounded bg-gray-700/30">
        <span className="text-gray-500">TBD</span>
      </div>
    );
  }

  const abbr = getTeamAbbreviation(teamId);
  const color = staticTeam?.info.primaryColor || '#4a5568';

  return (
    <div className={`
      flex items-center justify-between p-2 rounded
      ${isWinner ? 'bg-green-900/30' : isLoser ? 'bg-gray-900/50 opacity-50' : 'bg-gray-700/30'}
    `}>
      <div className="flex items-center gap-2">
        {seed && (
          <span className={`text-xs font-bold w-4 ${
            isWinner ? 'text-green-400' : 'text-gray-500'
          }`}>
            {seed}
          </span>
        )}

        <div
          className="w-6 h-6 rounded text-xs flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: color }}
        >
          {abbr.slice(0, 2)}
        </div>

        <span className={`text-sm font-medium ${
          isUserTeam ? 'text-blue-400' :
          isWinner ? 'text-white' :
          isLoser ? 'text-gray-500' :
          'text-gray-300'
        }`}>
          {abbr}
        </span>

        {isUserTeam && (
          <span className="text-xs text-blue-400/70">(You)</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {score !== undefined && (
          <span className={`text-lg font-bold ${
            isWinner ? 'text-green-400' : 'text-gray-500'
          }`}>
            {score}
          </span>
        )}

        {isWinner && (
          <span className="text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// CHAMPION DISPLAY
// =============================================================================

interface ChampionDisplayProps {
  teamId: string;
  isUserTeam: boolean;
}

const ChampionDisplay: React.FC<ChampionDisplayProps> = ({
  teamId,
  isUserTeam,
}) => {
  const staticTeam = STATIC_TEAMS.find(t => t.info.id === teamId);
  const name = getTeamName(teamId);
  const abbr = getTeamAbbreviation(teamId);
  const color = staticTeam?.info.primaryColor || '#4a5568';

  return (
    <div className={`
      text-center p-6 rounded-xl
      ${isUserTeam
        ? 'bg-gradient-to-br from-yellow-600/30 to-yellow-900/30 border-2 border-yellow-500 animate-pulse'
        : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600'}
    `}>
      {isUserTeam ? (
        <div className="text-4xl mb-2">CHAMPION</div>
      ) : (
        <div className="text-2xl text-gray-400 mb-2">CHAMPION</div>
      )}

      <div className="flex items-center justify-center gap-3 mt-3">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {abbr.slice(0, 2)}
        </div>
        <div className="text-left">
          <div className={`text-xl font-bold ${isUserTeam ? 'text-yellow-400' : 'text-white'}`}>
            {name}
          </div>
          {staticTeam && (
            <div className="text-gray-400">
              {staticTeam.info.city}
            </div>
          )}
        </div>
      </div>

      {isUserTeam && (
        <div className="mt-4 text-yellow-400 font-medium">
          CONGRATULATIONS! YOU WON THE CHAMPIONSHIP!
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PLAYOFF PREVIEW
// =============================================================================

interface PlayoffPreviewProps {
  standings: { teamId: string; wins: number; losses: number }[];
  userTeamId: string;
}

const PlayoffPreview: React.FC<PlayoffPreviewProps> = ({
  standings,
  userTeamId,
}) => {
  const playoffTeams = standings.slice(0, 4);
  const userInPlayoffs = playoffTeams.some(s => s.teamId === userTeamId);

  return (
    <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-left">
      <div className="text-sm text-gray-400 mb-3">Current Playoff Picture</div>

      <div className="space-y-2">
        {playoffTeams.map((standing, index) => {
          const staticTeam = STATIC_TEAMS.find(t => t.info.id === standing.teamId);
          const isUser = standing.teamId === userTeamId;
          const abbr = getTeamAbbreviation(standing.teamId);
          const name = getTeamName(standing.teamId);

          return (
            <div
              key={standing.teamId}
              className={`flex items-center justify-between p-2 rounded ${
                isUser ? 'bg-blue-900/30' : 'bg-gray-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400 font-bold w-4">#{index + 1}</span>
                <div
                  className="w-5 h-5 rounded text-xs flex items-center justify-center text-white"
                  style={{ backgroundColor: staticTeam?.info.primaryColor || '#666' }}
                >
                  {abbr.charAt(0)}
                </div>
                <span className={`text-sm ${isUser ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  {name}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {standing.wins}-{standing.losses}
              </span>
            </div>
          );
        })}
      </div>

      {/* Projected Matchups */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 mb-2">Projected Matchups</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">
            #{1} {getTeamAbbreviation(playoffTeams[0]?.teamId || '')} vs #{4} {getTeamAbbreviation(playoffTeams[3]?.teamId || '')}
          </div>
          <div className="text-gray-400">
            #{2} {getTeamAbbreviation(playoffTeams[1]?.teamId || '')} vs #{3} {getTeamAbbreviation(playoffTeams[2]?.teamId || '')}
          </div>
        </div>
      </div>

      {!userInPlayoffs && (
        <div className="mt-3 p-2 bg-yellow-900/20 rounded border border-yellow-800/50">
          <span className="text-xs text-yellow-400">
            You are currently outside the playoff picture
          </span>
        </div>
      )}
    </div>
  );
};

export default LeaguePlayoffBracket;
