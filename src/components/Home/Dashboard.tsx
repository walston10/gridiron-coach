import React from 'react';
import { useGameStore } from '../../stores/gameStore';

export const Dashboard: React.FC = () => {
  const { teams, userTeamId, season, playbook } = useGameStore();

  const userTeam = teams.find(t => t.info.id === userTeamId);
  const standing = season?.standings.find(s => s.teamId === userTeamId);

  if (!userTeam) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  const topPlayers = [...userTeam.roster]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 5);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Record</div>
          <div className="text-3xl font-bold text-white">
            {standing?.wins || 0}-{standing?.losses || 0}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Cap Space</div>
          <div className="text-3xl font-bold text-green-400">
            ${(userTeam.capSpace / 1_000_000).toFixed(1)}M
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Roster Size</div>
          <div className="text-3xl font-bold text-white">
            {userTeam.roster.length}/53
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Playbook</div>
          <div className="text-3xl font-bold text-white">
            {playbook.plays.length} plays
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-white mb-4">Top Players</h2>
          <div className="space-y-2">
            {topPlayers.map(player => (
              <div
                key={player.id}
                className="flex justify-between items-center p-2 bg-gray-700 rounded"
              >
                <div>
                  <span className="text-gray-400 text-sm mr-2">{player.position}</span>
                  <span className="text-white">{player.firstName} {player.lastName}</span>
                </div>
                <span className="text-green-400 font-bold">{player.overall}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-white mb-4">Season Phase</h2>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-xl text-white font-bold">
              {season?.phase.replace('_', ' ') || 'PRESEASON'}
            </div>
            <div className="text-gray-400 mt-2">
              {season?.phase === 'REGULAR_SEASON' && `Week ${season.currentWeek}`}
              {season?.phase === 'PRESEASON' && 'Get your team ready!'}
              {season?.phase === 'OFFSEASON_START' && 'Time to rebuild'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};