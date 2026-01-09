/**
 * Offseason Free Agency Component
 *
 * Handles the 3-wave free agency period.
 * Wave 1: Elite players, Wave 2: Starters, Wave 3: Depth
 */

import React, { useState, useMemo } from 'react';
import { useOffseasonStore } from '../../stores/offseasonStore';
import type {
  OffseasonFreeAgent,
  FreeAgentOffer,
} from '../../types/offseason.types';
import type { Position } from '../../types/player.types';

interface FreeAgencyProps {
  onContinue: () => void;
}

const POSITION_FILTERS: Position[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'ST'];

export const FreeAgency: React.FC<FreeAgencyProps> = ({ onContinue }) => {
  const {
    phase,
    freeAgentPool,
    currentWave,
    signings,
    capSpace,
    freeAgencyBudget,
    makeOffer,
    passOnPlayer,
  } = useOffseasonStore();

  const [selectedAgent, setSelectedAgent] = useState<OffseasonFreeAgent | null>(null);
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [offerYears, setOfferYears] = useState(2);
  const [offerSalary, setOfferSalary] = useState(5_000_000);
  const [offerRole, setOfferRole] = useState<'STARTER' | 'BACKUP' | 'DEPTH'>('STARTER');

  // Filter agents by current wave and position
  const availableAgents = useMemo(() => {
    return freeAgentPool
      .filter(agent => agent.wave <= currentWave)
      .filter(agent => positionFilter === 'ALL' || agent.player.position === positionFilter)
      .sort((a, b) => b.player.overall - a.player.overall);
  }, [freeAgentPool, currentWave, positionFilter]);

  const waveNames: Record<1 | 2 | 3, string> = {
    1: 'Wave 1 - Elite Players',
    2: 'Wave 2 - Quality Starters',
    3: 'Wave 3 - Depth & Bargains',
  };

  const tierColors: Record<string, string> = {
    ELITE: 'text-purple-400 bg-purple-900/30',
    STARTER: 'text-blue-400 bg-blue-900/30',
    SOLID: 'text-green-400 bg-green-900/30',
    DEPTH: 'text-gray-400 bg-gray-700',
    CAMP_BODY: 'text-gray-500 bg-gray-800',
  };

  const handleMakeOffer = () => {
    if (!selectedAgent) return;

    const offer: FreeAgentOffer = {
      playerId: selectedAgent.player.id,
      years: offerYears,
      salaryPerYear: offerSalary,
      guaranteed: offerSalary * offerYears * 0.4,
      signingBonus: offerSalary * 0.15,
      role: offerRole,
    };

    const result = makeOffer(offer);

    if (result.signed) {
      alert(`${result.playerName} signed with your team!`);
    } else {
      alert(`${result.playerName} declined: ${result.reason}`);
    }

    setSelectedAgent(null);
  };

  const handlePass = (playerId: string) => {
    passOnPlayer(playerId);
  };

  const isLastWave = phase === 'FREE_AGENCY_WAVE_3';

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Free Agency</h1>
          <p className="text-amber-400 mt-1">{waveNames[currentWave]}</p>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Cap Space</div>
          <div className="text-green-400 font-bold text-xl">
            ${(capSpace / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-gray-500 text-sm">
            Budget: ${(freeAgencyBudget / 1_000_000).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* Wave Progress */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((wave) => (
          <div
            key={wave}
            className={`flex-1 py-2 text-center rounded ${
              wave < currentWave
                ? 'bg-green-900 text-green-400'
                : wave === currentWave
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            Wave {wave}
            {wave < currentWave && ' ✓'}
          </div>
        ))}
      </div>

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

        {/* Available Free Agents */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Available Players ({availableAgents.length})
          </h2>

          {availableAgents.length === 0 ? (
            <p className="text-gray-400">No players available matching your filter.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {availableAgents.map((agent) => (
                <FreeAgentCard
                  key={agent.player.id}
                  agent={agent}
                  tierColors={tierColors}
                  onSelect={() => {
                    setSelectedAgent(agent);
                    setOfferSalary(agent.askingPrice);
                  }}
                  onPass={() => handlePass(agent.player.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Signings This Offseason */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Your Signings ({signings.filter(s => s.signed).length})
          </h2>

          {signings.filter(s => s.signed).length === 0 ? (
            <p className="text-gray-400">No signings yet this offseason.</p>
          ) : (
            <div className="space-y-2">
              {signings
                .filter(s => s.signed)
                .map((signing) => (
                  <div
                    key={signing.playerId}
                    className="bg-gray-700 rounded p-3"
                  >
                    <div className="text-white font-semibold">{signing.playerName}</div>
                    {signing.contract && (
                      <div className="text-gray-400 text-sm">
                        {signing.contract.yearsRemaining}yr / $
                        {(signing.contract.salaryPerYear / 1_000_000).toFixed(1)}M
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">
              Make Offer to {selectedAgent.player.firstName} {selectedAgent.player.lastName}
            </h3>
            <div className="text-gray-400 mb-4">
              {selectedAgent.player.position} • {selectedAgent.player.overall} OVR • Age{' '}
              {selectedAgent.player.age}
            </div>

            <div className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="text-gray-400 text-sm">Promised Role</label>
                <div className="flex gap-2 mt-1">
                  {(['STARTER', 'BACKUP', 'DEPTH'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setOfferRole(role)}
                      className={`px-4 py-2 rounded flex-1 ${
                        offerRole === role
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contract Length */}
              <div>
                <label className="text-gray-400 text-sm">Contract Length</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((years) => (
                    <button
                      key={years}
                      onClick={() => setOfferYears(years)}
                      className={`px-4 py-2 rounded ${
                        offerYears === years
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {years}yr
                    </button>
                  ))}
                </div>
              </div>

              {/* Salary */}
              <div>
                <label className="text-gray-400 text-sm">
                  Salary Per Year: ${(offerSalary / 1_000_000).toFixed(1)}M
                </label>
                <input
                  type="range"
                  min={500_000}
                  max={Math.min(capSpace, 35_000_000)}
                  step={250_000}
                  value={offerSalary}
                  onChange={(e) => setOfferSalary(Number(e.target.value))}
                  className="w-full mt-1"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>$0.5M</span>
                  <span className="text-amber-400">
                    Asking: ${(selectedAgent.askingPrice / 1_000_000).toFixed(1)}M
                  </span>
                  <span>${(Math.min(capSpace, 35_000_000) / 1_000_000).toFixed(0)}M</span>
                </div>
              </div>

              {/* Offer Summary */}
              <div className="bg-gray-700 rounded p-3">
                <div className="text-gray-400 text-sm">Total Value</div>
                <div className="text-white font-bold">
                  ${((offerSalary * offerYears) / 1_000_000).toFixed(1)}M over {offerYears} years
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Guaranteed: ${((offerSalary * offerYears * 0.4) / 1_000_000).toFixed(1)}M
                </div>
              </div>

              {/* Interest & Competition */}
              <div className="flex gap-4 text-sm">
                <span className="text-gray-400">
                  Interest:{' '}
                  <span
                    className={
                      selectedAgent.interest > 60
                        ? 'text-green-400'
                        : selectedAgent.interest > 30
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }
                  >
                    {selectedAgent.interest}%
                  </span>
                </span>
                <span className="text-gray-400">
                  Other offers: <span className="text-white">{selectedAgent.competingOffers}</span>
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleMakeOffer}
                  disabled={offerSalary > capSpace}
                  className={`flex-1 font-bold py-2 rounded ${
                    offerSalary > capSpace
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Submit Offer
                </button>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={onContinue}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          {isLastWave ? 'Continue to Draft' : 'Next Wave'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const FreeAgentCard: React.FC<{
  agent: OffseasonFreeAgent;
  tierColors: Record<string, string>;
  onSelect: () => void;
  onPass: () => void;
}> = ({ agent, tierColors, onSelect, onPass }) => {
  const { player } = agent;

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white font-semibold">
                {player.firstName} {player.lastName}
              </div>
              <div className="text-gray-400 text-sm">
                {player.position} • Age {player.age} • {player.overall} OVR
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${tierColors[agent.tier]}`}>
              {agent.tier}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-gray-400 text-sm">Asking</div>
          <div className="text-amber-400 font-bold">
            ${(agent.askingPrice / 1_000_000).toFixed(1)}M/yr
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={onSelect}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Offer
          </button>
          <button
            onClick={onPass}
            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded"
          >
            Pass
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 text-sm">
        <span className="text-gray-400">
          Interest:{' '}
          <span
            className={
              agent.interest > 60 ? 'text-green-400' : agent.interest > 30 ? 'text-yellow-400' : 'text-red-400'
            }
          >
            {agent.interest}%
          </span>
        </span>
        <span className="text-gray-400">
          Other offers: <span className="text-white">{agent.competingOffers}</span>
        </span>
        {agent.daysOnMarket > 5 && (
          <span className="text-yellow-400">On market {agent.daysOnMarket} days</span>
        )}
        {agent.isExPlayer && <span className="text-blue-400">Former Player</span>}
      </div>
    </div>
  );
};
