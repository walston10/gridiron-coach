import React from 'react';
import type { Draft, Team, DraftProspect } from '../../types';
import { DraftPick } from './DraftPick';

interface DraftBoardProps {
  draft: Draft;
  teams: Team[];
  prospects: DraftProspect[];
  userTeamId: string;
}

export const DraftBoard: React.FC<DraftBoardProps> = ({
  draft,
  teams,
  prospects,
  userTeamId,
}) => {
  const currentPickIndex = (draft.currentRound - 1) * 32 + draft.currentPick - 1;

  const getSelectedPlayer = (playerId: string | null) => {
    if (!playerId) return undefined;
    return prospects.find(p => p.player.id === playerId)?.player;
  };

  return (
    <div className="space-y-2">
      {draft.picks.map((pick, idx) => (
        <DraftPick
          key={`${pick.round}-${pick.pick}`}
          pick={pick}
          teams={teams}
          selectedPlayer={getSelectedPlayer(pick.selectedPlayerId)}
          isUserPick={pick.currentTeamId === userTeamId}
          isCurrentPick={idx === currentPickIndex}
        />
      ))}
    </div>
  );
};