import React from 'react';
import { useGameStore } from '../../stores/gameStore';

export const Header: React.FC = () => {
  const { teams, userTeamId, season } = useGameStore();

  const userTeam = teams.find(t => t.info.id === userTeamId);
  const standing = season?.standings.find(s => s.teamId === userTeamId);

  if (!userTeam) return null;

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full"
            style={{ backgroundColor: userTeam.info.primaryColor }}
          />
          <div>
            <div className="text-white font-bold">
              {userTeam.info.city} {userTeam.info.name}
            </div>
            {standing && (
              <div className="text-gray-400 text-sm">
                {standing.wins}-{standing.losses}{standing.ties > 0 ? `-${standing.ties}` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-400">Season:</span>
            <span className="text-white ml-2">{season?.year}</span>
          </div>
          <div>
            <span className="text-gray-400">Week:</span>
            <span className="text-white ml-2">{season?.currentWeek || 'Offseason'}</span>
          </div>
          <div>
            <span className="text-gray-400">Cap:</span>
            <span className="text-green-400 ml-2">
              ${(userTeam.capSpace / 1_000_000).toFixed(1)}M
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};