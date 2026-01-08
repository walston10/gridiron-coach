import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { DraftBoard } from './DraftBoard';
import { ProspectCard } from '../Scouting/ProspectCard';
import { generateDraftClass } from '../../utils/draftGenerator';
import type { Draft, DraftProspect } from '../../types';

export const DraftPage: React.FC = () => {
  const { teams, userTeamId } = useGameStore();
  const [prospects] = useState<DraftProspect[]>(() => generateDraftClass(250));
  const [draft, setDraft] = useState<Draft>(() => ({
    year: 2025,
    prospects,
    picks: teams.flatMap((team, teamIdx) =>
      Array.from({ length: 7 }, (_, round) => ({
        round: round + 1,
        pick: teamIdx + 1,
        originalTeamId: team.info.id,
        currentTeamId: team.info.id,
        selectedPlayerId: null,
      }))
    ).sort((a, b) => a.round - b.round || a.pick - b.pick),
    currentRound: 1,
    currentPick: 1,
    isComplete: false,
  }));

  const currentPickIndex = (draft.currentRound - 1) * teams.length + draft.currentPick - 1;
  const currentPick = draft.picks[currentPickIndex];
  const isUserPick = currentPick?.currentTeamId === userTeamId;

  const availableProspects = prospects.filter(
    p => !draft.picks.some(pick => pick.selectedPlayerId === p.player.id)
  );

  const handleDraftPlayer = (playerId: string) => {
    if (!isUserPick) return;

    setDraft(prev => {
      const newPicks = [...prev.picks];
      newPicks[currentPickIndex] = {
        ...newPicks[currentPickIndex],
        selectedPlayerId: playerId,
      };

      let nextRound = prev.currentRound;
      let nextPick = prev.currentPick + 1;

      if (nextPick > teams.length) {
        nextPick = 1;
        nextRound += 1;
      }

      return {
        ...prev,
        picks: newPicks,
        currentRound: nextRound,
        currentPick: nextPick,
        isComplete: nextRound > 7,
      };
    });
  };

  const handleSimPick = () => {
    if (isUserPick || draft.isComplete) return;

    // CPU picks best available (simplified)
    const bestAvailable = availableProspects[0];
    if (!bestAvailable) return;

    handleDraftPlayer(bestAvailable.player.id);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Draft</h1>
        <div className="text-white">
          Round {draft.currentRound}, Pick {draft.currentPick}
          {draft.isComplete && <span className="ml-4 text-green-400">Draft Complete!</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <h2 className="text-lg font-bold text-white mb-3">Draft Board</h2>
          <div className="max-h-[600px] overflow-y-auto">
            <DraftBoard
              draft={draft}
              teams={teams}
              prospects={prospects}
              userTeamId={userTeamId!}
            />
          </div>
        </div>

        <div className="col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">Available Prospects</h2>
            {!isUserPick && !draft.isComplete && (
              <button
                onClick={handleSimPick}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Sim Pick
              </button>
            )}
          </div>

          {isUserPick && (
            <div className="bg-yellow-600 text-white p-3 rounded mb-4 text-center font-bold">
              You're on the clock! Select a player to draft.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 max-h-[550px] overflow-y-auto">
            {availableProspects.slice(0, 50).map(prospect => (
              <div
                key={prospect.player.id}
                onClick={() => isUserPick && handleDraftPlayer(prospect.player.id)}
                className={isUserPick ? 'cursor-pointer' : 'cursor-default'}
              >
                <ProspectCard prospect={prospect} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};