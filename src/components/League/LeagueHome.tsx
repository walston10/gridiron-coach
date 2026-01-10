/**
 * League Home Component
 *
 * Main dashboard for the 8-team league system.
 * Shows standings, this week's games, injuries, and playoff picture.
 */

import React, { useState } from 'react';
import { useLeagueStore, getTeamName, getTeamAbbreviation } from '../../stores/leagueStore';
import { STATIC_TEAMS } from '../../data/staticTeams';
import { getInjurySeverityColor } from '../../engine/injurySystem';
import { LeagueStandings } from './LeagueStandings';
import { LeagueSchedule } from './LeagueSchedule';
import { LeaguePlayoffBracket } from './LeaguePlayoffBracket';
import { LeagueTeamRoster } from './LeagueTeamRoster';
import type { Roster } from '../../types/player.types';

// =============================================================================
// TYPES
// =============================================================================

interface LeagueHomeProps {
  userRoster?: Roster;
  onPlayGame?: () => void;
}

type Tab = 'overview' | 'standings' | 'schedule' | 'playoffs' | 'teams';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LeagueHome: React.FC<LeagueHomeProps> = ({
  userRoster,
  onPlayGame,
}) => {
  const {
    phase,
    week,
    standings,
    userInjuries,
    getUserGameThisWeek,
    getStandingsSorted,
  } = useLeagueStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Find user team ID
  const userTeamId = standings.find(s =>
    !STATIC_TEAMS.some(t => t.info.id === s.teamId)
  )?.teamId || '';

  const userGame = getUserGameThisWeek();
  const sortedStandings = getStandingsSorted();
  const userRank = sortedStandings.findIndex(s => s.teamId === userTeamId) + 1;
  const userStanding = sortedStandings.find(s => s.teamId === userTeamId);

  if (phase === 'NOT_STARTED') {
    return (
      <div className="p-6 bg-gray-900 rounded-lg text-center">
        <h2 className="text-xl font-bold text-white mb-2">League Not Started</h2>
        <p className="text-gray-400">
          Initialize the season to begin playing in the league.
        </p>
      </div>
    );
  }

  // View team roster modal
  if (selectedTeamId) {
    return (
      <div className="max-w-4xl mx-auto">
        <LeagueTeamRoster
          teamId={selectedTeamId}
          userRoster={selectedTeamId === userTeamId ? userRoster : undefined}
          onClose={() => setSelectedTeamId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
        {(['overview', 'standings', 'schedule', 'playoffs', 'teams'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          phase={phase}
          week={week}
          userTeamId={userTeamId}
          userRank={userRank}
          userStanding={userStanding}
          userGame={userGame}
          userInjuries={userInjuries}
          onPlayGame={onPlayGame}
          onSelectTeam={setSelectedTeamId}
        />
      )}

      {activeTab === 'standings' && (
        <LeagueStandings
          userTeamId={userTeamId}
          onSelectTeam={setSelectedTeamId}
        />
      )}

      {activeTab === 'schedule' && (
        <LeagueSchedule />
      )}

      {activeTab === 'playoffs' && (
        <LeaguePlayoffBracket />
      )}

      {activeTab === 'teams' && (
        <TeamsTab
          userTeamId={userTeamId}
          onSelectTeam={setSelectedTeamId}
        />
      )}
    </div>
  );
};

// =============================================================================
// OVERVIEW TAB
// =============================================================================

interface OverviewTabProps {
  phase: string;
  week: number;
  userTeamId: string;
  userRank: number;
  userStanding: { wins: number; losses: number; pointsFor: number; pointsAgainst: number } | undefined;
  userGame: { homeTeamId: string; awayTeamId: string } | null;
  userInjuries: Array<{ playerName: string; position: string; severity: string; weeksRemaining: number }>;
  onPlayGame?: () => void;
  onSelectTeam: (teamId: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  phase,
  week,
  userTeamId,
  userRank,
  userStanding,
  userGame,
  userInjuries,
  onPlayGame,
  onSelectTeam,
}) => {
  const getPhaseLabel = () => {
    if (phase === 'REGULAR_SEASON') return `Week ${week} of 7`;
    if (phase === 'PLAYOFFS') return week === 8 ? 'Semifinals' : 'Championship';
    if (phase === 'COMPLETE') return 'Season Complete';
    return '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - 2 columns */}
      <div className="lg:col-span-2 space-y-6">
        {/* This Week's Game */}
        {userGame && phase !== 'COMPLETE' && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {phase === 'PLAYOFFS' ? 'Playoff Game' : "This Week's Game"}
            </h3>

            <ThisWeekGame
              userGame={userGame}
              userTeamId={userTeamId}
              onPlayGame={onPlayGame}
              onSelectTeam={onSelectTeam}
            />
          </div>
        )}

        {/* Season Complete Message */}
        {phase === 'COMPLETE' && (
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Season Complete!</h3>
            <p className="text-gray-400">
              Check the Playoffs tab to see the final bracket and champion.
            </p>
          </div>
        )}

        {/* Compact Standings */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Standings</h3>
            <span className="text-sm text-gray-400">{getPhaseLabel()}</span>
          </div>

          <LeagueStandings
            compact
            userTeamId={userTeamId}
            onSelectTeam={onSelectTeam}
          />
        </div>

        {/* Compact Schedule */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Your Schedule</h3>
          <LeagueSchedule compact />
        </div>
      </div>

      {/* Sidebar - 1 column */}
      <div className="space-y-6">
        {/* Your Team Status */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Your Team</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Record</span>
              <span className="text-white font-bold">
                {userStanding?.wins || 0}-{userStanding?.losses || 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Rank</span>
              <span className={`font-bold ${userRank <= 4 ? 'text-blue-400' : 'text-gray-300'}`}>
                #{userRank}
                {userRank <= 4 && <span className="text-xs ml-1">(Playoff)</span>}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Points For</span>
              <span className="text-white">{userStanding?.pointsFor || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Points Against</span>
              <span className="text-white">{userStanding?.pointsAgainst || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Point Diff</span>
              <span className={`font-bold ${
                (userStanding?.pointsFor || 0) - (userStanding?.pointsAgainst || 0) > 0
                  ? 'text-green-400'
                  : (userStanding?.pointsFor || 0) - (userStanding?.pointsAgainst || 0) < 0
                    ? 'text-red-400'
                    : 'text-gray-400'
              }`}>
                {((userStanding?.pointsFor || 0) - (userStanding?.pointsAgainst || 0)) > 0 ? '+' : ''}
                {(userStanding?.pointsFor || 0) - (userStanding?.pointsAgainst || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Injury Report */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Injury Report</h3>

          {userInjuries.length === 0 ? (
            <div className="text-gray-400 text-sm">
              No injuries - All players healthy
            </div>
          ) : (
            <div className="space-y-2">
              {userInjuries.map((injury, index) => (
                <div key={index} className="bg-gray-800 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 text-xs">{injury.position}</span>
                      <span className="text-white text-sm ml-2">{injury.playerName}</span>
                    </div>
                    <span className={`text-xs font-medium ${getInjurySeverityColor(injury.severity as any)}`}>
                      {injury.severity === 'QUESTIONABLE' ? 'Q' :
                       injury.severity === 'BANGED_UP' ? 'BU' : 'INJ'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {injury.weeksRemaining} week{injury.weeksRemaining > 1 ? 's' : ''} remaining
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playoff Picture */}
        {phase === 'REGULAR_SEASON' && (
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Playoff Picture</h3>

            <div className={`p-3 rounded-lg ${
              userRank <= 4
                ? 'bg-blue-900/30 border border-blue-800'
                : 'bg-yellow-900/30 border border-yellow-800'
            }`}>
              {userRank <= 4 ? (
                <div className="text-blue-400 font-medium">
                  You control your destiny!
                  <div className="text-xs text-blue-400/70 mt-1">
                    Currently #{userRank} seed
                  </div>
                </div>
              ) : (
                <div className="text-yellow-400 font-medium">
                  Work to do
                  <div className="text-xs text-yellow-400/70 mt-1">
                    Currently #{userRank} - need to move up
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// THIS WEEK'S GAME
// =============================================================================

interface ThisWeekGameProps {
  userGame: { homeTeamId: string; awayTeamId: string };
  userTeamId: string;
  onPlayGame?: () => void;
  onSelectTeam: (teamId: string) => void;
}

const ThisWeekGame: React.FC<ThisWeekGameProps> = ({
  userGame,
  userTeamId,
  onPlayGame,
  onSelectTeam,
}) => {
  const isHome = userGame.homeTeamId === userTeamId;
  const opponentId = isHome ? userGame.awayTeamId : userGame.homeTeamId;
  const opponent = STATIC_TEAMS.find(t => t.info.id === opponentId);

  const opponentName = getTeamName(opponentId);
  const opponentAbbr = getTeamAbbreviation(opponentId);
  const opponentColor = opponent?.info.primaryColor || '#4a5568';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white cursor-pointer hover:opacity-80"
          style={{ backgroundColor: opponentColor }}
          onClick={() => onSelectTeam(opponentId)}
        >
          {opponentAbbr.slice(0, 2)}
        </div>
        <div>
          <div className="text-sm text-gray-400">{isHome ? 'vs' : '@'}</div>
          <div className="text-xl font-bold text-white">{opponentName}</div>
          {opponent && (
            <div className="text-sm text-gray-400">
              {opponent.info.identity.overall} OVR | {formatStyle(opponent.info.identity.offenseStyle)} Offense
            </div>
          )}
        </div>
      </div>

      {onPlayGame && (
        <button
          onClick={onPlayGame}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg transition-colors"
        >
          PLAY GAME
        </button>
      )}
    </div>
  );
};

// =============================================================================
// TEAMS TAB
// =============================================================================

interface TeamsTabProps {
  userTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

const TeamsTab: React.FC<TeamsTabProps> = ({
  userTeamId,
  onSelectTeam,
}) => {
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-bold text-white mb-4">League Teams</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Team */}
        <button
          onClick={() => onSelectTeam(userTeamId)}
          className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-left hover:bg-blue-900/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              YOU
            </div>
            <div>
              <div className="text-white font-medium">{getTeamName(userTeamId)}</div>
              <div className="text-xs text-blue-400">Your Team</div>
            </div>
          </div>
        </button>

        {/* AI Teams */}
        {STATIC_TEAMS.map(team => (
          <button
            key={team.info.id}
            onClick={() => onSelectTeam(team.info.id)}
            className="bg-gray-800 rounded-lg p-4 text-left hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: team.info.primaryColor }}
              >
                {team.info.abbreviation.slice(0, 2)}
              </div>
              <div>
                <div className="text-white font-medium">
                  {team.info.city} {team.info.name}
                </div>
                <div className="text-xs text-gray-400">
                  {team.info.identity.overall} OVR | {formatStyle(team.info.identity.offenseStyle)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function formatStyle(style: string): string {
  return style.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}

export default LeagueHome;
