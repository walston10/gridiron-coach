import React from 'react';
import type { ScheduleGame, Team } from '../../types';
interface ScheduleProps {
  schedule: ScheduleGame[];
  teams: Team[];
  userTeamId: string;
  currentWeek: number;
}

export const Schedule: React.FC<ScheduleProps> = ({
  schedule,
  teams,
  userTeamId,
  currentWeek,
}) => {
  const getTeamName = (teamId: string) => {
    return teams.find(t => t.info.id === teamId)?.info.name || 'Unknown';
  };

  const userGames = schedule.filter(
    g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
  );

  return (
    <div className="space-y-2">
      {userGames.map(game => {
        const isHome = game.homeTeamId === userTeamId;
        const opponent = isHome ? game.awayTeamId : game.homeTeamId;
        const isCurrent = game.week === currentWeek;

        return (
          <div
            key={game.id}
            className={`flex items-center justify-between p-3 rounded ${
              isCurrent ? 'bg-blue-600' : game.isComplete ? 'bg-gray-800' : 'bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-gray-400 w-16">Week {game.week}</span>
              <span className="text-white">
                {isHome ? 'vs' : '@'} {getTeamName(opponent)}
              </span>
            </div>

            {game.isComplete ? (
              <div className="text-white font-bold">
                {isHome
                  ? `${game.homeScore} - ${game.awayScore}`
                  : `${game.awayScore} - ${game.homeScore}`}
              </div>
            ) : isCurrent ? (
              <span className="text-yellow-300 text-sm">NEXT GAME</span>
            ) : (
              <span className="text-gray-500 text-sm">Upcoming</span>
            )}
          </div>
        );
      })}

      {userGames.length === 0 && (
        <div className="text-gray-400 text-center py-8">
          Schedule not yet generated
        </div>
      )}
    </div>
  );
};