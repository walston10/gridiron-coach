/**
 * Training Camp Component
 *
 * Handles roster cuts, development reports, and final prep for the season.
 */

import React, { useState } from 'react';
import { useOffseasonStore } from '../../stores/offseasonStore';
import type { TrainingCampPlayer, RosterCut } from '../../types/offseason.types';

interface TrainingCampProps {
  onContinue: () => void;
}

export const TrainingCamp: React.FC<TrainingCampProps> = ({ onContinue }) => {
  const {
    campReport,
    rosterFinalized,
    deadMoney,
    makeRosterCut,
    finalizeRoster,
  } = useOffseasonStore();

  const [selectedPlayer, setSelectedPlayer] = useState<TrainingCampPlayer | null>(null);
  const [cutReason, setCutReason] = useState<RosterCut['reason']>('PERFORMANCE');

  if (!campReport) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <p>Loading camp report...</p>
      </div>
    );
  }

  const gradeColors: Record<string, string> = {
    A: 'text-green-400 bg-green-900/30',
    B: 'text-blue-400 bg-blue-900/30',
    C: 'text-yellow-400 bg-yellow-900/30',
    D: 'text-orange-400 bg-orange-900/30',
    F: 'text-red-400 bg-red-900/30',
  };

  const handleCutPlayer = () => {
    if (!selectedPlayer) return;

    const cut: RosterCut = {
      playerId: selectedPlayer.player.id,
      playerName: `${selectedPlayer.player.firstName} ${selectedPlayer.player.lastName}`,
      position: selectedPlayer.player.position,
      reason: cutReason,
      severanceCost: selectedPlayer.player.contract?.guaranteed || 0,
    };

    makeRosterCut(cut);
    setSelectedPlayer(null);
  };

  const handleFinalize = () => {
    finalizeRoster();
    onContinue();
  };

  const cutsNeeded = Math.max(0, 53 - (campReport.standouts.length + campReport.disappointments.length));

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Training Camp</h1>
          <p className="text-gray-400 mt-1">
            {rosterFinalized
              ? 'Roster finalized - Ready for Week 1!'
              : 'Finalize your 53-man roster'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Team Chemistry</div>
          <div className="flex items-center gap-2">
            <div className="w-32 bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${
                  campReport.teamChemistry >= 70
                    ? 'bg-green-500'
                    : campReport.teamChemistry >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${campReport.teamChemistry}%` }}
              />
            </div>
            <span className="text-white font-bold">{campReport.teamChemistry}%</span>
          </div>
          {deadMoney > 0 && (
            <div className="text-red-400 text-sm mt-1">
              Dead Money: ${(deadMoney / 1_000_000).toFixed(1)}M
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Standouts */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-green-400">★</span> Camp Standouts
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {campReport.standouts.map((camper) => (
              <CampPlayerCard
                key={camper.player.id}
                camper={camper}
                gradeColors={gradeColors}
                onSelect={() => setSelectedPlayer(camper)}
              />
            ))}
            {campReport.standouts.length === 0 && (
              <p className="text-gray-400">No standout performers.</p>
            )}
          </div>
        </div>

        {/* Disappointments / Bubble Players */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-400">⚠</span> On the Bubble
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {campReport.disappointments.map((camper) => (
              <CampPlayerCard
                key={camper.player.id}
                camper={camper}
                gradeColors={gradeColors}
                onSelect={() => setSelectedPlayer(camper)}
                showCutButton
              />
            ))}
            {campReport.disappointments.length === 0 && (
              <p className="text-gray-400">No players struggling.</p>
            )}
          </div>
        </div>

        {/* Injuries & Roster Decisions */}
        <div className="space-y-6">
          {/* Injuries */}
          {campReport.injuries.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-red-400">🏥</span> Camp Injuries
              </h2>
              <div className="space-y-2">
                {campReport.injuries.map((camper) => (
                  <div key={camper.player.id} className="bg-red-900/20 rounded p-3">
                    <div className="text-white">
                      {camper.player.firstName} {camper.player.lastName}
                    </div>
                    <div className="text-red-400 text-sm">{camper.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roster Cuts Made */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>✂️</span> Roster Cuts ({campReport.rosterDecisions.length})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {campReport.rosterDecisions.map((cut) => (
                <div key={cut.playerId} className="bg-gray-700 rounded p-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white">{cut.playerName}</span>
                      <span className="text-gray-400 ml-2">{cut.position}</span>
                    </div>
                    {cut.severanceCost > 0 && (
                      <span className="text-red-400 text-sm">
                        ${(cut.severanceCost / 1_000_000).toFixed(1)}M
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs">{cut.reason}</div>
                </div>
              ))}
              {campReport.rosterDecisions.length === 0 && (
                <p className="text-gray-400">No cuts made yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cut Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Cut {selectedPlayer.player.firstName} {selectedPlayer.player.lastName}?
            </h3>

            <div className="bg-gray-700 rounded p-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Position</span>
                <span className="text-white">{selectedPlayer.player.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Overall</span>
                <span className="text-white">{selectedPlayer.player.overall}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Camp Grade</span>
                <span className={gradeColors[selectedPlayer.campGrade]?.split(' ')[0]}>
                  {selectedPlayer.campGrade}
                </span>
              </div>
              {selectedPlayer.player.contract && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Dead Cap</span>
                  <span className="text-red-400">
                    ${(selectedPlayer.player.contract.guaranteed / 1_000_000).toFixed(1)}M
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm">Reason</label>
              <select
                value={cutReason}
                onChange={(e) => setCutReason(e.target.value as RosterCut['reason'])}
                className="w-full mt-1 bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="PERFORMANCE">Performance</option>
                <option value="CAP">Cap Space</option>
                <option value="INJURY">Injury</option>
                <option value="CHARACTER">Character Issues</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCutPlayer}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded"
              >
                Confirm Cut
              </button>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex flex-col items-center mt-8 gap-2">
        {cutsNeeded > 0 && !rosterFinalized && (
          <p className="text-yellow-400">
            You need to cut {cutsNeeded} more players to reach 53-man roster
          </p>
        )}
        <button
          onClick={handleFinalize}
          disabled={rosterFinalized}
          className={`font-bold px-8 py-3 rounded-lg text-lg transition-colors ${
            rosterFinalized
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {rosterFinalized ? 'Roster Finalized' : 'Finalize Roster & Start Season'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const CampPlayerCard: React.FC<{
  camper: TrainingCampPlayer;
  gradeColors: Record<string, string>;
  onSelect: () => void;
  showCutButton?: boolean;
}> = ({ camper, gradeColors, onSelect, showCutButton }) => {
  const { player, campGrade, development, isRookie, isBubble, notes } = camper;

  return (
    <div
      className={`bg-gray-700 rounded-lg p-3 ${isBubble ? 'border border-yellow-600' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">
              {player.firstName} {player.lastName}
            </span>
            {isRookie && (
              <span className="text-xs bg-blue-900 text-blue-400 px-2 py-0.5 rounded">
                ROOKIE
              </span>
            )}
          </div>
          <div className="text-gray-400 text-sm">
            {player.position} • {player.overall} OVR
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className={`text-lg font-bold px-2 py-1 rounded ${gradeColors[campGrade]}`}>
              {campGrade}
            </span>
          </div>
          {development !== 0 && (
            <div
              className={`text-sm font-bold ${
                development > 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {development > 0 ? '+' : ''}
              {development}
            </div>
          )}
          {showCutButton && (
            <button
              onClick={onSelect}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Cut
            </button>
          )}
        </div>
      </div>

      {notes && <p className="text-gray-500 text-sm mt-1 italic">{notes}</p>}
    </div>
  );
};
