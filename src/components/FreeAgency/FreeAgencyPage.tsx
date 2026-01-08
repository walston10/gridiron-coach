import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { FreeAgentList } from './FreeAgentList';
import { OfferModal } from './OfferModal';
import type { FreeAgent, ContractOffer } from '../../types';
import { generatePlayer } from '../../utils/playerGenerator';

export const FreeAgencyPage: React.FC = () => {
  const { teams, userTeamId } = useGameStore();
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<FreeAgent | null>(null);
  const [wave, setWave] = useState<1 | 2 | 3>(1);

  const userTeam = teams.find(t => t.info.id === userTeamId);

  // Generate free agents on mount
  useEffect(() => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'LT', 'DE', 'CB', 'MLB'] as const;
    const generated: FreeAgent[] = [];

    positions.forEach(pos => {
      for (let i = 0; i < 5; i++) {
        const quality = Math.random() > 0.7 ? 80 : Math.random() > 0.5 ? 70 : 60;
        const player = generatePlayer(pos, quality);
        player.experience = 2 + Math.floor(Math.random() * 8);

        generated.push({
          player,
          askingPrice: Math.round((player.overall / 99) * 15_000_000) + 1_000_000,
          minYears: 1,
          preferredTeams: [],
          interestedTeams: [],
          offers: [],
        });
      }
    });

    setFreeAgents(generated);
  }, []);

  const handleMakeOffer = (playerId: string) => {
    const agent = freeAgents.find(fa => fa.player.id === playerId);
    if (agent) {
      setSelectedAgent(agent);
    }
  };

  const handleSubmitOffer = (offer: Omit<ContractOffer, 'teamId' | 'status'>) => {
    if (!selectedAgent || !userTeamId) return;

    const fullOffer: ContractOffer = {
      ...offer,
      teamId: userTeamId,
      status: 'PENDING',
    };

    setFreeAgents(prev => prev.map(fa => {
      if (fa.player.id === selectedAgent.player.id) {
        return {
          ...fa,
          offers: [...fa.offers, fullOffer],
        };
      }
      return fa;
    }));

    alert('Offer submitted! The player will respond soon.');
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Free Agency</h1>
          <div className="text-gray-400 mt-1">Wave {wave} of 3</div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="text-right">
            <div className="text-gray-400 text-sm">Your Cap Space</div>
            <div className="text-green-400 font-bold">
              ${((userTeam?.capSpace || 0) / 1_000_000).toFixed(1)}M
            </div>
          </div>

          <button
            onClick={() => setWave(w => Math.min(3, w + 1) as 1 | 2 | 3)}
            disabled={wave >= 3}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Advance to Wave {wave + 1}
          </button>
        </div>
      </div>

      <FreeAgentList
        freeAgents={freeAgents}
        onMakeOffer={handleMakeOffer}
      />

      {selectedAgent && userTeam && (
        <OfferModal
          freeAgent={selectedAgent}
          capSpace={userTeam.capSpace}
          onSubmitOffer={handleSubmitOffer}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
};