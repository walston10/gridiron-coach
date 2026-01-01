import React from 'react';
import type { DraftPick as DraftPickType, Team, Player } from '../../types';
interface DraftPickProps {
  pick: DraftPickType;
  teams: Team[];
  selectedPlayer?: Player;
  isUserPick: boolean;
  isCurrentPick: boolean;
}

export const DraftPick: React.FC<DraftPickProps> = ({
  pick,
  teams,
  selectedPlayer,
  isUserPick,
  isCurrentPick,
}) => {
  const team = teams.find(t => t.info.id === pick.currentTeamId);

  return (
    <div className={`flex items-center justify-between p-3 rounded ${
      isCurrentPick ? 'bg-yellow-600' :
      isUserPick ? 'bg-blue-800' :
      pick.selectedPlayerId ? 'bg-gray-700' : 'bg-gray-800'
    }`}>
      <div className="flex items-center gap-4">
        <span className="text-gray-400 w-12">
          {pick.round}.{pick.pick}
        </span>
        <span className="text-white font-medium">
          {team?.info.name || 'Unknown'}
        </span>
      </div>

      {selectedPlayer ? (
        <div className="text-white">
          <span className="text-gray-400 mr-2">{selectedPlayer.position}</span>
          {selectedPlayer.firstName} {selectedPlayer.lastName}
        </div>
      ) : isCurrentPick ? (
        <span className="text-yellow-200 text-sm">ON THE CLOCK</span>
      ) : (
        <span className="text-gray-500 text-sm">-</span>
      )}
    </div>
  );
};