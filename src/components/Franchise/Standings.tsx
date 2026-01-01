import React from 'react';
import type { Standings as StandingsType, Team } from '../../types';
interface StandingsProps {
  standings: StandingsType[];
  teams: Team[];
  userTeamId: string;
}

export const Standings: React.FC<StandingsProps> = ({ standings, teams, userTeamId }) => {
  const getTeamName = (teamId: string) => {
    return teams.find(t => t.info.id === teamId)?.info.name || 'Unknown';
  };

  const sortedStandings = [...standings].sort((a, b) => {
    const aWinPct = a.wins / (a.wins + a.losses + a.ties || 1);
    const bWinPct = b.wins / (b.wins + b.losses + b.ties || 1);
    return bWinPct - aWinPct;
  });

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="text-left p-3 text-gray-400">#</th>
            <th className="text-left p-3 text-gray-400">Team</th>
            <th className="text-center p-3 text-gray-400">W</th>
            <th className="text-center p-3 text-gray-400">L</th>
            <th className="text-center p-3 text-gray-400">T</th>
            <th className="text-center p-3 text-gray-400">PF</th>
            <th className="text-center p-3 text-gray-400">PA</th>
          </tr>
        </thead>
        <tbody>
          {sortedStandings.map((standing, idx) => {
            const isUser = standing.teamId === userTeamId;
            return (
              <tr
                key={standing.teamId}
                className={isUser ? 'bg-blue-900' : idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}
              >
                <td className="p-3 text-gray-400">{idx + 1}</td>
                <td className="p-3 text-white font-medium">
                  {getTeamName(standing.teamId)}
                  {isUser && <span className="ml-2 text-xs text-blue-400">(You)</span>}
                </td>
                <td className="p-3 text-center text-green-400">{standing.wins}</td>
                <td className="p-3 text-center text-red-400">{standing.losses}</td>
                <td className="p-3 text-center text-gray-400">{standing.ties}</td>
                <td className="p-3 text-center text-white">{standing.pointsFor}</td>
                <td className="p-3 text-center text-white">{standing.pointsAgainst}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};