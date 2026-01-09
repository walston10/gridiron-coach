/**
 * Draft Component
 *
 * Handles pre-draft scouting and draft day pick selection.
 */

import React, { useState, useMemo } from 'react';
import { useOffseasonStore } from '../../stores/offseasonStore';
import type { DraftProspect, DraftPick } from '../../types/offseason.types';
import type { Position } from '../../types/player.types';

interface DraftProps {
  onContinue: () => void;
}

const POSITION_FILTERS: Position[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'ST'];

export const Draft: React.FC<DraftProps> = ({ onContinue }) => {
  const {
    phase,
    draftClass,
    draftOrder,
    userPicks,
    draftResults,
    scoutingBudget,
    scoutProspect,
    makeDraftSelection,
  } = useOffseasonStore();

  const [selectedProspect, setSelectedProspect] = useState<DraftProspect | null>(null);
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [currentPick, setCurrentPick] = useState(1);

  const isScoutingPhase = phase === 'PRE_DRAFT';
  const isDraftPhase = phase === 'DRAFT';

  // Get available prospects filtered by position
  const availableProspects = useMemo(() => {
    if (!draftClass) return [];
    return draftClass.prospects
      .filter((p) => positionFilter === 'ALL' || p.position === positionFilter)
      .sort((a, b) => a.projectedRound - b.projectedRound || b.scoutingGrade - a.scoutingGrade);
  }, [draftClass, positionFilter]);

  // Get current pick info
  const currentPickInfo = useMemo(() => {
    return draftOrder.find((p) => p.overall === currentPick);
  }, [draftOrder, currentPick]);

  const isUserPick = currentPickInfo?.teamId === 'USER';
  const nextUserPick = userPicks.find((p) => !p.selectedPlayerId);

  const handleScout = (prospect: DraftProspect) => {
    const success = scoutProspect(prospect.id, prospect.scoutingCost);
    if (!success) {
      alert('Not enough scouting budget!');
    }
  };

  const handleDraftPlayer = (prospectId: string) => {
    if (!isUserPick) return;

    const selection = makeDraftSelection(currentPick, prospectId);
    if (selection) {
      setSelectedProspect(null);
      // Move to next pick
      setCurrentPick(currentPick + 1);
    }
  };

  // Simulate AI picks when not user's turn
  const simulateToUserPick = () => {
    // In a real implementation, this would simulate AI picks
    // For now, just advance to next user pick
    if (nextUserPick) {
      setCurrentPick(nextUserPick.overall);
    }
  };

  const gradeColors: Record<number, string> = {
    1: 'text-purple-400',
    2: 'text-blue-400',
    3: 'text-green-400',
    4: 'text-yellow-400',
    5: 'text-gray-400',
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isScoutingPhase ? 'Draft Scouting' : 'Draft Day'}
          </h1>
          <p className="text-gray-400 mt-1">
            {isScoutingPhase
              ? 'Scout prospects to reveal their true potential'
              : `Round ${Math.ceil(currentPick / 32)}, Pick ${currentPick}`}
          </p>
        </div>
        <div className="text-right">
          {isScoutingPhase && (
            <>
              <div className="text-gray-400 text-sm">Scouting Budget</div>
              <div className="text-green-400 font-bold text-xl">
                ${(scoutingBudget / 1000).toFixed(0)}K
              </div>
            </>
          )}
          {isDraftPhase && nextUserPick && (
            <>
              <div className="text-gray-400 text-sm">Next Pick</div>
              <div className="text-amber-400 font-bold text-xl">
                #{nextUserPick.overall} (Rd {nextUserPick.round})
              </div>
            </>
          )}
        </div>
      </div>

      {/* Draft Order (during draft phase) */}
      {isDraftPhase && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">Draft Order</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {draftOrder.slice(0, 20).map((pick) => (
              <div
                key={pick.overall}
                className={`flex-shrink-0 w-12 h-12 rounded flex items-center justify-center text-sm font-bold ${
                  pick.selectedPlayerId
                    ? 'bg-gray-600 text-gray-400'
                    : pick.overall === currentPick
                    ? 'bg-amber-600 text-white'
                    : pick.teamId === 'USER'
                    ? 'bg-green-900 text-green-400 border border-green-600'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {pick.overall}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Position Filter */}
        <div className="lg:col-span-3">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setPositionFilter('ALL')}
              className={`px-3 py-1 rounded text-sm ${
                positionFilter === 'ALL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {POSITION_FILTERS.map((pos) => (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className={`px-3 py-1 rounded text-sm ${
                  positionFilter === pos
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Prospect List */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Prospects ({availableProspects.length})
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {availableProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                gradeColors={gradeColors}
                isScoutingPhase={isScoutingPhase}
                isDraftPhase={isDraftPhase}
                isUserPick={isUserPick}
                scoutingBudget={scoutingBudget}
                onScout={() => handleScout(prospect)}
                onSelect={() => setSelectedProspect(prospect)}
                onDraft={() => handleDraftPlayer(prospect.id)}
              />
            ))}
          </div>
        </div>

        {/* Draft Results / Your Picks */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {isDraftPhase ? 'Draft Results' : 'Your Picks'}
          </h2>

          {isDraftPhase ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {draftResults.map((result) => (
                <div
                  key={result.pick.overall}
                  className={`p-3 rounded ${
                    result.teamId === 'USER'
                      ? 'bg-green-900/30 border border-green-700'
                      : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-400 text-sm">#{result.pick.overall}</span>
                      <span className="text-white ml-2">
                        {result.prospect.firstName} {result.prospect.lastName}
                      </span>
                    </div>
                    <span className="text-amber-400">{result.prospect.position}</span>
                  </div>
                </div>
              ))}
              {draftResults.length === 0 && (
                <p className="text-gray-400">No picks made yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {userPicks.map((pick) => (
                <div key={pick.overall} className="bg-gray-700 rounded p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white font-bold">Round {pick.round}</span>
                      <span className="text-gray-400 ml-2">Pick #{pick.overall}</span>
                    </div>
                    {pick.originalTeamId !== 'USER' && (
                      <span className="text-blue-400 text-sm">via trade</span>
                    )}
                  </div>
                </div>
              ))}
              {userPicks.length === 0 && (
                <p className="text-gray-400">No picks available.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prospect Detail Modal */}
      {selectedProspect && (
        <ProspectModal
          prospect={selectedProspect}
          isScoutingPhase={isScoutingPhase}
          isDraftPhase={isDraftPhase}
          isUserPick={isUserPick}
          scoutingBudget={scoutingBudget}
          onClose={() => setSelectedProspect(null)}
          onScout={() => handleScout(selectedProspect)}
          onDraft={() => handleDraftPlayer(selectedProspect.id)}
        />
      )}

      {/* Continue Button */}
      <div className="flex justify-center mt-8 gap-4">
        {isDraftPhase && !isUserPick && nextUserPick && (
          <button
            onClick={simulateToUserPick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg text-lg transition-colors"
          >
            Sim to Your Pick (#{nextUserPick.overall})
          </button>
        )}
        <button
          onClick={onContinue}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          {isScoutingPhase ? 'Start Draft' : 'Continue to UDFAs'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ProspectCard: React.FC<{
  prospect: DraftProspect;
  gradeColors: Record<number, string>;
  isScoutingPhase: boolean;
  isDraftPhase: boolean;
  isUserPick: boolean;
  scoutingBudget: number;
  onScout: () => void;
  onSelect: () => void;
  onDraft: () => void;
}> = ({
  prospect,
  gradeColors,
  isScoutingPhase,
  isDraftPhase,
  isUserPick,
  scoutingBudget,
  onScout,
  onSelect,
  onDraft,
}) => {
  const canAffordScout = scoutingBudget >= prospect.scoutingCost;

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1" onClick={onSelect} role="button">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white font-semibold">
                {prospect.firstName} {prospect.lastName}
              </div>
              <div className="text-gray-400 text-sm">
                {prospect.position} • {prospect.college}
              </div>
            </div>
            <span className={`text-sm ${gradeColors[prospect.projectedRound]}`}>
              Rd {prospect.projectedRound}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm">
              <span className="text-gray-400">Grade: </span>
              <span className="text-amber-400 font-bold">
                {prospect.isScounted ? prospect.scoutingGrade : '??'}
              </span>
            </div>
            {prospect.isScounted && (
              <span className="text-green-400 text-xs">SCOUTED</span>
            )}
          </div>

          {/* Flags */}
          <div className="flex gap-2 mt-2">
            {prospect.greenFlags.slice(0, 2).map((flag, i) => (
              <span key={i} className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded">
                {flag}
              </span>
            ))}
            {prospect.redFlags.slice(0, 2).map((flag, i) => (
              <span key={i} className="text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded">
                {flag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {isScoutingPhase && !prospect.isScounted && (
            <button
              onClick={onScout}
              disabled={!canAffordScout}
              className={`px-3 py-2 rounded text-sm ${
                canAffordScout
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Scout (${(prospect.scoutingCost / 1000).toFixed(0)}K)
            </button>
          )}
          {isDraftPhase && isUserPick && (
            <button
              onClick={onDraft}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProspectModal: React.FC<{
  prospect: DraftProspect;
  isScoutingPhase: boolean;
  isDraftPhase: boolean;
  isUserPick: boolean;
  scoutingBudget: number;
  onClose: () => void;
  onScout: () => void;
  onDraft: () => void;
}> = ({
  prospect,
  isScoutingPhase,
  isDraftPhase,
  isUserPick,
  scoutingBudget,
  onClose,
  onScout,
  onDraft,
}) => {
  const canAffordScout = scoutingBudget >= prospect.scoutingCost;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white">
              {prospect.firstName} {prospect.lastName}
            </h3>
            <div className="text-gray-400">
              {prospect.position} • {prospect.college}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-700 rounded p-3 text-center">
            <div className="text-gray-400 text-sm">Projected Round</div>
            <div className="text-amber-400 font-bold text-xl">{prospect.projectedRound}</div>
          </div>
          <div className="bg-gray-700 rounded p-3 text-center">
            <div className="text-gray-400 text-sm">Scout Grade</div>
            <div className="text-white font-bold text-xl">
              {prospect.isScounted ? prospect.scoutingGrade : '??'}
            </div>
          </div>
        </div>

        {prospect.playerComparison && (
          <div className="bg-gray-700 rounded p-3 mb-4">
            <div className="text-gray-400 text-sm">Player Comparison</div>
            <div className="text-white">{prospect.playerComparison}</div>
          </div>
        )}

        {/* Ratings (if scouted) */}
        {prospect.isScounted && prospect.ratings && (
          <div className="mb-4">
            <h4 className="text-white font-semibold mb-2">Ratings</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(prospect.ratings).slice(0, 6).map(([key, value]) => (
                <div key={key} className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-gray-400 text-xs">{key}</div>
                  <div className="text-white font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flags */}
        <div className="mb-4">
          {prospect.greenFlags.length > 0 && (
            <div className="mb-2">
              <h4 className="text-green-400 font-semibold text-sm mb-1">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {prospect.greenFlags.map((flag, i) => (
                  <span key={i} className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {prospect.redFlags.length > 0 && (
            <div>
              <h4 className="text-red-400 font-semibold text-sm mb-1">Concerns</h4>
              <div className="flex flex-wrap gap-2">
                {prospect.redFlags.map((flag, i) => (
                  <span key={i} className="text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isScoutingPhase && !prospect.isScounted && (
            <button
              onClick={() => {
                onScout();
                onClose();
              }}
              disabled={!canAffordScout}
              className={`flex-1 py-2 rounded font-bold ${
                canAffordScout
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Scout (${(prospect.scoutingCost / 1000).toFixed(0)}K)
            </button>
          )}
          {isDraftPhase && isUserPick && (
            <button
              onClick={() => {
                onDraft();
                onClose();
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold"
            >
              Draft This Player
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
