import React from 'react';
import type { FreeAgent } from '../../types';

interface FreeAgentCardProps {
  freeAgent: FreeAgent;
  onClick?: () => void;
  onMakeOffer?: () => void;
}

export const FreeAgentCard: React.FC<FreeAgentCardProps> = ({
  freeAgent,
  onClick,
  onMakeOffer,
}) => {
  const { player, askingPrice, offers, interestedTeams } = freeAgent;

  const formatSalary = (amount: number) => `$${(amount / 1_000_000).toFixed(1)}M`;

  const getOverallColor = (ovr: number) => {
    if (ovr >= 85) return 'text-green-400';
    if (ovr >= 75) return 'text-blue-400';
    if (ovr >= 65) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-gray-400">{player.position}</div>
          <div className="text-white font-bold">{player.firstName} {player.lastName}</div>
        </div>
        <div className={`text-2xl font-bold ${getOverallColor(player.overall)}`}>
          {player.overall}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-400">Age:</span>
          <span className="text-white ml-2">{player.age}</span>
        </div>
        <div>
          <span className="text-gray-400">Exp:</span>
          <span className="text-white ml-2">{player.experience} yrs</span>
        </div>
        <div>
          <span className="text-gray-400">Asking:</span>
          <span className="text-green-400 ml-2">{formatSalary(askingPrice)}/yr</span>
        </div>
        <div>
          <span className="text-gray-400">Offers:</span>
          <span className="text-white ml-2">{offers.length}</span>
        </div>
      </div>

      {interestedTeams.length > 0 && (
        <div className="text-xs text-gray-400 mb-3">
          {interestedTeams.length} team{interestedTeams.length > 1 ? 's' : ''} interested
        </div>
      )}

      {onMakeOffer && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMakeOffer();
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
        >
          Make Offer
        </button>
      )}
    </div>
  );
};