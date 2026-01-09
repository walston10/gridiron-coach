/**
 * Contracts Component
 *
 * Handles player changes (retirements, expirations, development)
 * and re-signing decisions.
 */

import React, { useState } from 'react';
import { useOffseasonStore } from '../../stores/offseasonStore';
import type {
  RetirementDecision,
  ExpiringContract,
  DevelopmentChange,
  ResigningOffer,
} from '../../types/offseason.types';

interface ContractsProps {
  onContinue: () => void;
}

export const Contracts: React.FC<ContractsProps> = ({ onContinue }) => {
  const {
    phase,
    retirements,
    expiringContracts,
    developmentChanges,
    resigningDecisions,
    makeResigningDecision,
    submitResigningOffer,
    capSpace,
  } = useOffseasonStore();

  const [selectedPlayer, setSelectedPlayer] = useState<ExpiringContract | null>(null);
  const [offerYears, setOfferYears] = useState(2);
  const [offerSalary, setOfferSalary] = useState(5_000_000);

  const isResigningPhase = phase === 'RESIGNING';

  const handleMakeOffer = () => {
    if (!selectedPlayer) return;

    const offer: ResigningOffer = {
      playerId: selectedPlayer.playerId,
      years: offerYears,
      salaryPerYear: offerSalary,
      guaranteed: offerSalary * offerYears * 0.5,
      signingBonus: offerSalary * 0.2,
    };

    const result = submitResigningOffer(offer);

    if (result.accepted) {
      alert(`${result.playerName} accepted your offer!`);
    } else {
      alert(`${result.playerName} rejected your offer: ${result.reason}`);
    }

    setSelectedPlayer(null);
  };

  const handleLetWalk = (playerId: string) => {
    makeResigningDecision(playerId, 'RELEASED');
  };

  const unresolvedContracts = expiringContracts.filter(
    c => !resigningDecisions.has(c.playerId)
  );

  const canContinue = isResigningPhase
    ? unresolvedContracts.length === 0
    : true;

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isResigningPhase ? 'Re-Signing Period' : 'Roster Changes'}
          </h1>
          <p className="text-gray-400 mt-1">
            {isResigningPhase
              ? 'Decide which expiring players to keep'
              : 'Review retirements and player development'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Cap Space</div>
          <div className="text-green-400 font-bold text-xl">
            ${(capSpace / 1_000_000).toFixed(1)}M
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Retirements */}
        {retirements.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>👋</span> Retirements
            </h2>
            <div className="space-y-3">
              {retirements.map((retirement) => (
                <RetirementCard key={retirement.playerId} retirement={retirement} />
              ))}
            </div>
          </div>
        )}

        {/* Development Changes */}
        {developmentChanges.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📈</span> Development
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {developmentChanges.map((change) => (
                <DevelopmentCard key={change.playerId} change={change} />
              ))}
            </div>
          </div>
        )}

        {/* Expiring Contracts / Re-signing */}
        {expiringContracts.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📝</span> Expiring Contracts
            </h2>
            <div className="space-y-3">
              {expiringContracts.map((contract) => {
                const decision = resigningDecisions.get(contract.playerId);
                return (
                  <ExpiringContractCard
                    key={contract.playerId}
                    contract={contract}
                    decision={decision}
                    isResigningPhase={isResigningPhase}
                    onMakeOffer={() => {
                      setSelectedPlayer(contract);
                      setOfferSalary(contract.marketValue);
                    }}
                    onLetWalk={() => handleLetWalk(contract.playerId)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Make Offer to {selectedPlayer.playerName}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Contract Length</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4].map((years) => (
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

              <div>
                <label className="text-gray-400 text-sm">
                  Salary Per Year: ${(offerSalary / 1_000_000).toFixed(1)}M
                </label>
                <input
                  type="range"
                  min={1_000_000}
                  max={Math.min(capSpace, 30_000_000)}
                  step={500_000}
                  value={offerSalary}
                  onChange={(e) => setOfferSalary(Number(e.target.value))}
                  className="w-full mt-1"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>$1M</span>
                  <span className="text-amber-400">
                    Market: ${(selectedPlayer.marketValue / 1_000_000).toFixed(1)}M
                  </span>
                  <span>${(Math.min(capSpace, 30_000_000) / 1_000_000).toFixed(0)}M</span>
                </div>
              </div>

              <div className="bg-gray-700 rounded p-3">
                <div className="text-gray-400 text-sm">Total Value</div>
                <div className="text-white font-bold">
                  ${((offerSalary * offerYears) / 1_000_000).toFixed(1)}M over {offerYears} years
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Guaranteed: ${((offerSalary * offerYears * 0.5) / 1_000_000).toFixed(1)}M
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleMakeOffer}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded"
                >
                  Submit Offer
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
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`font-bold px-8 py-3 rounded-lg text-lg transition-colors ${
            canContinue
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isResigningPhase && unresolvedContracts.length > 0
            ? `${unresolvedContracts.length} contracts remaining`
            : 'Continue to Free Agency'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const RetirementCard: React.FC<{ retirement: RetirementDecision }> = ({ retirement }) => (
  <div className="bg-gray-700 rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <div className="text-white font-semibold">{retirement.playerName}</div>
        <div className="text-gray-400 text-sm">{retirement.position} • Age {retirement.age}</div>
      </div>
      <div className="text-gray-500 text-sm">{retirement.yearsPlayed} seasons</div>
    </div>
    <p className="text-gray-400 text-sm mt-2 italic">"{retirement.announcement}"</p>
  </div>
);

const DevelopmentCard: React.FC<{ change: DevelopmentChange }> = ({ change }) => {
  const isPositive = change.overallChange > 0;
  const typeColors = {
    BREAKOUT: 'text-green-400',
    GROWTH: 'text-green-400',
    REGRESSION: 'text-yellow-400',
    DECLINE: 'text-red-400',
  };

  return (
    <div className="bg-gray-700 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-white text-sm">{change.playerName}</div>
          <div className="text-gray-400 text-xs">{change.position}</div>
        </div>
        <div className="text-right">
          <div className={typeColors[change.type]}>
            {change.type.replace('_', ' ')}
          </div>
          <div className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.overallChange} OVR
          </div>
        </div>
      </div>
      <div className="text-gray-500 text-xs mt-1">{change.reason}</div>
    </div>
  );
};

const ExpiringContractCard: React.FC<{
  contract: ExpiringContract;
  decision?: 'SIGNED' | 'RELEASED' | 'PENDING';
  isResigningPhase: boolean;
  onMakeOffer: () => void;
  onLetWalk: () => void;
}> = ({ contract, decision, isResigningPhase, onMakeOffer, onLetWalk }) => {
  const isResolved = decision === 'SIGNED' || decision === 'RELEASED';

  return (
    <div className={`bg-gray-700 rounded-lg p-4 ${isResolved ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white font-semibold">{contract.playerName}</div>
              <div className="text-gray-400 text-sm">
                {contract.position} • Age {contract.age} • {contract.overall} OVR
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-gray-400 text-sm">Market Value</div>
          <div className="text-amber-400 font-bold">
            ${(contract.marketValue / 1_000_000).toFixed(1)}M/yr
          </div>
          <div className="text-gray-500 text-xs">
            Was making ${(contract.previousSalary / 1_000_000).toFixed(1)}M
          </div>
        </div>

        {isResigningPhase && !isResolved && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={onMakeOffer}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Offer
            </button>
            <button
              onClick={onLetWalk}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Let Walk
            </button>
          </div>
        )}

        {isResolved && (
          <div className={`ml-4 px-3 py-1 rounded ${
            decision === 'SIGNED' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
          }`}>
            {decision === 'SIGNED' ? 'Re-signed' : 'Released'}
          </div>
        )}
      </div>

      {/* Interest indicators */}
      <div className="flex items-center gap-4 mt-2 text-sm">
        <span className="text-gray-400">
          Willingness: <span className={contract.willingness > 60 ? 'text-green-400' : 'text-yellow-400'}>
            {contract.willingness}%
          </span>
        </span>
        <span className="text-gray-400">
          Other teams interested: <span className="text-white">{contract.otherInterest}</span>
        </span>
      </div>
    </div>
  );
};
