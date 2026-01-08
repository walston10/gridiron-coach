/**
 * ILLEGAL MOTION - Playoff Bracket Component
 *
 * Displays the playoff bracket with tournament progression.
 * Visual bracket layout with matchups, results, and advancement.
 */

import React, { useMemo } from 'react';
import { useSeasonStore } from '../../stores/seasonStore';
import type { PlayoffMatchup, PlayoffRound, PlayoffBracket as PlayoffBracketType } from '../../types/season.types';
import { PLAYOFF_ROUND_NAMES } from '../../types/season.types';

// =============================================================================
// TYPES
// =============================================================================

interface PlayoffBracketProps {
  onSelectMatchup?: (matchup: PlayoffMatchup) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PlayoffBracket: React.FC<PlayoffBracketProps> = ({ onSelectMatchup }) => {
  const {
    season,
    aiTeams,
    userTeamId,
    getPlayoffBracket,
    config,
  } = useSeasonStore();

  const bracket = getPlayoffBracket();

  // Get team info helper
  const getTeamInfo = (teamId: string) => {
    return aiTeams.find(t => t.id === teamId);
  };

  // Organize matchups by round
  const matchupsByRound = useMemo(() => {
    if (!bracket) return new Map<PlayoffRound, PlayoffMatchup[]>();

    const map = new Map<PlayoffRound, PlayoffMatchup[]>();

    for (const matchup of bracket.matchups) {
      const existing = map.get(matchup.round) || [];
      map.set(matchup.round, [...existing, matchup]);
    }

    return map;
  }, [bracket]);

  if (!bracket) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Playoffs</h2>
          <p className="text-gray-400">
            {season?.phase === 'REGULAR_SEASON'
              ? 'Playoffs begin after the regular season'
              : 'No playoff bracket available'}
          </p>

          {/* Preview playoff seeding */}
          {season?.phase === 'REGULAR_SEASON' && (
            <PlayoffPreview
              standings={season.standings}
              playoffTeams={config.playoffTeams}
              userTeamId={userTeamId || ''}
              getTeamInfo={getTeamInfo}
            />
          )}
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
              {bracket.championId
                ? 'SEASON COMPLETE'
                : `Current Round: ${PLAYOFF_ROUND_NAMES[bracket.round]}`}
            </div>
          </div>

          {bracket.championId && (
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 text-lg">CHAMPION</span>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: getTeamInfo(bracket.championId)?.colors?.primary || '#666' }}
              >
                {getTeamInfo(bracket.championId)?.abbreviation?.slice(0, 2) || '??'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bracket Display */}
      <div className="p-6">
        {config.playoffTeams === 4 ? (
          <FourTeamBracket
            bracket={bracket}
            matchupsByRound={matchupsByRound}
            userTeamId={userTeamId || ''}
            getTeamInfo={getTeamInfo}
            onSelectMatchup={onSelectMatchup}
          />
        ) : (
          <SixTeamBracket
            bracket={bracket}
            matchupsByRound={matchupsByRound}
            userTeamId={userTeamId || ''}
            getTeamInfo={getTeamInfo}
            onSelectMatchup={onSelectMatchup}
          />
        )}
      </div>

      {/* Eliminated Teams */}
      {bracket.eliminatedTeams.length > 0 && (
        <div className="p-4 bg-gray-800/50 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Eliminated</div>
          <div className="flex flex-wrap gap-2">
            {bracket.eliminatedTeams.map(teamId => {
              const team = getTeamInfo(teamId);
              const isUserTeam = teamId === userTeamId;

              return (
                <div
                  key={teamId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    isUserTeam ? 'bg-red-900/30 border border-red-800' : 'bg-gray-700/50'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded text-xs flex items-center justify-center text-white opacity-50"
                    style={{ backgroundColor: team?.colors?.primary || '#666' }}
                  >
                    {team?.abbreviation?.charAt(0) || '?'}
                  </div>
                  <span className={`text-sm ${isUserTeam ? 'text-red-400' : 'text-gray-500'}`}>
                    {team?.name || 'Unknown'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// FOUR TEAM BRACKET (1v4, 2v3 -> Final)
// =============================================================================

interface BracketProps {
  bracket: PlayoffBracketType;
  matchupsByRound: Map<PlayoffRound, PlayoffMatchup[]>;
  userTeamId: string;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  onSelectMatchup?: (matchup: PlayoffMatchup) => void;
}

const FourTeamBracket: React.FC<BracketProps> = ({
  bracket,
  matchupsByRound,
  userTeamId,
  getTeamInfo,
  onSelectMatchup,
}) => {
  const semifinals = matchupsByRound.get('DIVISIONAL') || [];
  const finals = matchupsByRound.get('CHAMPIONSHIP') || [];

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Semifinals - Left Side */}
      <div className="flex flex-col gap-8">
        <div className="text-xs text-gray-500 text-center mb-2">Semifinals</div>
        {semifinals.map(matchup => (
          <MatchupCard
            key={matchup.id}
            matchup={matchup}
            userTeamId={userTeamId}
            isCurrent={bracket.round === 'DIVISIONAL'}
            getTeamInfo={getTeamInfo}
            onSelect={onSelectMatchup}
          />
        ))}
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
        {finals.length > 0 ? (
          <MatchupCard
            matchup={finals[0]}
            userTeamId={userTeamId}
            isCurrent={bracket.round === 'CHAMPIONSHIP'}
            isFinal
            getTeamInfo={getTeamInfo}
            onSelect={onSelectMatchup}
          />
        ) : (
          <div className="w-64 h-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
            <span className="text-gray-500 text-sm">TBD</span>
          </div>
        )}

        {/* Champion Display */}
        {bracket.championId && (
          <div className="mt-8">
            <ChampionDisplay
              teamId={bracket.championId}
              getTeamInfo={getTeamInfo}
              isUserTeam={bracket.championId === userTeamId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SIX TEAM BRACKET (Wild Card -> Divisional -> Final)
// =============================================================================

const SixTeamBracket: React.FC<BracketProps> = ({
  bracket,
  matchupsByRound,
  userTeamId,
  getTeamInfo,
  onSelectMatchup,
}) => {
  const wildCard = matchupsByRound.get('WILD_CARD') || [];
  const divisional = matchupsByRound.get('DIVISIONAL') || [];
  const finals = matchupsByRound.get('CHAMPIONSHIP') || [];

  return (
    <div className="space-y-8">
      {/* Wild Card Round */}
      <div>
        <div className="text-xs text-gray-500 mb-3">Wild Card Round</div>
        <div className="grid grid-cols-2 gap-4">
          {wildCard.map(matchup => (
            <MatchupCard
              key={matchup.id}
              matchup={matchup}
              userTeamId={userTeamId}
              isCurrent={bracket.round === 'WILD_CARD'}
              getTeamInfo={getTeamInfo}
              onSelect={onSelectMatchup}
            />
          ))}
        </div>

        {/* Bye Teams */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-500 mb-2">First Round Bye</div>
          <div className="flex gap-4">
            {['1', '2'].map(seed => {
              const standing = useSeasonStore.getState().season?.standings.find(s => s.playoffSeed === Number(seed));
              if (!standing) return null;
              const team = getTeamInfo(standing.teamId);

              return (
                <div key={seed} className="flex items-center gap-2">
                  <span className="text-xs text-yellow-400 font-bold">#{seed}</span>
                  <div
                    className="w-6 h-6 rounded text-xs flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team?.colors?.primary || '#666' }}
                  >
                    {team?.abbreviation?.slice(0, 2) || '??'}
                  </div>
                  <span className={`text-sm ${standing.teamId === userTeamId ? 'text-blue-400' : 'text-gray-300'}`}>
                    {team?.name || 'Unknown'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Divisional Round */}
      <div>
        <div className="text-xs text-gray-500 mb-3">Divisional Round</div>
        <div className="grid grid-cols-2 gap-4">
          {divisional.length > 0 ? (
            divisional.map(matchup => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                userTeamId={userTeamId}
                isCurrent={bracket.round === 'DIVISIONAL'}
                getTeamInfo={getTeamInfo}
                onSelect={onSelectMatchup}
              />
            ))
          ) : (
            <>
              <div className="h-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-gray-500 text-sm">TBD</span>
              </div>
              <div className="h-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                <span className="text-gray-500 text-sm">TBD</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Championship */}
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-500 mb-3">Championship</div>
        {finals.length > 0 ? (
          <MatchupCard
            matchup={finals[0]}
            userTeamId={userTeamId}
            isCurrent={bracket.round === 'CHAMPIONSHIP'}
            isFinal
            getTeamInfo={getTeamInfo}
            onSelect={onSelectMatchup}
          />
        ) : (
          <div className="w-80 h-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
            <span className="text-gray-500 text-sm">TBD</span>
          </div>
        )}

        {/* Champion Display */}
        {bracket.championId && (
          <div className="mt-8">
            <ChampionDisplay
              teamId={bracket.championId}
              getTeamInfo={getTeamInfo}
              isUserTeam={bracket.championId === userTeamId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MATCHUP CARD
// =============================================================================

interface MatchupCardProps {
  matchup: PlayoffMatchup;
  userTeamId: string;
  isCurrent: boolean;
  isFinal?: boolean;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  onSelect?: (matchup: PlayoffMatchup) => void;
}

const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  userTeamId,
  isCurrent,
  isFinal = false,
  getTeamInfo,
  onSelect,
}) => {
  const homeTeam = getTeamInfo(matchup.homeTeamId);
  const awayTeam = getTeamInfo(matchup.awayTeamId);
  const isUserGame = matchup.homeTeamId === userTeamId || matchup.awayTeamId === userTeamId;

  // Find result from schedule if complete
  const season = useSeasonStore.getState().season;
  const gameResult = season?.schedule.find(g => g.id === matchup.gameId)?.result;

  return (
    <button
      onClick={() => onSelect?.(matchup)}
      disabled={matchup.isComplete}
      className={`
        w-full rounded-lg p-4 transition-all
        ${isFinal ? 'bg-gradient-to-br from-yellow-900/30 to-purple-900/30 border-2 border-yellow-700/50' : 'bg-gray-800'}
        ${isCurrent && !matchup.isComplete ? 'ring-2 ring-blue-500 animate-pulse' : ''}
        ${isUserGame && !matchup.isComplete ? 'border-2 border-blue-500' : ''}
        ${matchup.isComplete ? '' : 'hover:bg-gray-700'}
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
        {/* Away Team (lower seed) */}
        <TeamLine
          team={awayTeam}
          seed={matchup.awaySeed}
          isUserTeam={matchup.awayTeamId === userTeamId}
          isWinner={matchup.winnerId === matchup.awayTeamId}
          isLoser={matchup.isComplete && matchup.winnerId !== matchup.awayTeamId}
          score={gameResult?.awayScore}
        />

        {/* Home Team (higher seed) */}
        <TeamLine
          team={homeTeam}
          seed={matchup.homeSeed}
          isUserTeam={matchup.homeTeamId === userTeamId}
          isWinner={matchup.winnerId === matchup.homeTeamId}
          isLoser={matchup.isComplete && matchup.winnerId !== matchup.homeTeamId}
          score={gameResult?.homeScore}
        />
      </div>

      {/* Status */}
      <div className="mt-3 text-center">
        {matchup.isComplete ? (
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
// TEAM LINE (within matchup card)
// =============================================================================

interface TeamLineProps {
  team: ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  seed: number;
  isUserTeam: boolean;
  isWinner: boolean;
  isLoser: boolean;
  score?: number;
}

const TeamLine: React.FC<TeamLineProps> = ({
  team,
  seed,
  isUserTeam,
  isWinner,
  isLoser,
  score,
}) => {
  return (
    <div className={`
      flex items-center justify-between p-2 rounded
      ${isWinner ? 'bg-green-900/30' : isLoser ? 'bg-gray-900/50 opacity-50' : 'bg-gray-700/30'}
    `}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold w-4 ${
          isWinner ? 'text-green-400' : 'text-gray-500'
        }`}>
          {seed}
        </span>

        <div
          className="w-6 h-6 rounded text-xs flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: team?.colors?.primary || '#666' }}
        >
          {team?.abbreviation?.slice(0, 2) || '??'}
        </div>

        <span className={`text-sm font-medium ${
          isUserTeam ? 'text-blue-400' :
          isWinner ? 'text-white' :
          isLoser ? 'text-gray-500' :
          'text-gray-300'
        }`}>
          {team?.abbreviation || '???'}
        </span>

        {isUserTeam && (
          <span className="text-xs text-blue-400/70">(You)</span>
        )}
      </div>

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
  );
};

// =============================================================================
// CHAMPION DISPLAY
// =============================================================================

interface ChampionDisplayProps {
  teamId: string;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
  isUserTeam: boolean;
}

const ChampionDisplay: React.FC<ChampionDisplayProps> = ({
  teamId,
  getTeamInfo,
  isUserTeam,
}) => {
  const team = getTeamInfo(teamId);

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
          style={{ backgroundColor: team?.colors?.primary || '#666' }}
        >
          {team?.abbreviation?.slice(0, 2) || '??'}
        </div>
        <div className="text-left">
          <div className={`text-xl font-bold ${isUserTeam ? 'text-yellow-400' : 'text-white'}`}>
            {team?.name || 'Unknown'}
          </div>
          <div className="text-gray-400">
            {team?.city || ''}
          </div>
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
// PLAYOFF PREVIEW (Pre-Playoffs)
// =============================================================================

interface PlayoffPreviewProps {
  standings: { teamId: string; playoffSeed: number | null; wins: number; losses: number }[];
  playoffTeams: number;
  userTeamId: string;
  getTeamInfo: (teamId: string) => ReturnType<typeof useSeasonStore.getState>['aiTeams'][number] | undefined;
}

const PlayoffPreview: React.FC<PlayoffPreviewProps> = ({
  standings,
  playoffTeams,
  userTeamId,
  getTeamInfo,
}) => {
  // Sort by rank (which we derive from position)
  const sorted = [...standings].sort((a, b) => {
    const aRank = a.playoffSeed || 99;
    const bRank = b.playoffSeed || 99;
    return aRank - bRank;
  }).slice(0, playoffTeams);

  const userInPlayoffs = sorted.some(s => s.teamId === userTeamId);

  return (
    <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
      <div className="text-sm text-gray-400 mb-3">Current Playoff Picture</div>

      <div className="space-y-2">
        {sorted.map((standing, index) => {
          const team = getTeamInfo(standing.teamId);
          const isUserTeam = standing.teamId === userTeamId;

          return (
            <div
              key={standing.teamId}
              className={`flex items-center justify-between p-2 rounded ${
                isUserTeam ? 'bg-blue-900/30' : 'bg-gray-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400 font-bold w-4">#{index + 1}</span>
                <div
                  className="w-5 h-5 rounded text-xs flex items-center justify-center text-white"
                  style={{ backgroundColor: team?.colors?.primary || '#666' }}
                >
                  {team?.abbreviation?.charAt(0) || '?'}
                </div>
                <span className={`text-sm ${isUserTeam ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  {team?.name || 'Unknown'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {standing.wins}-{standing.losses}
              </span>
            </div>
          );
        })}
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

export default PlayoffBracket;
