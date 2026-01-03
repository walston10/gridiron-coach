import React from 'react';
import type { Player } from '../../types';
interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  isCompact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, isCompact }) => {
  const getOverallColor = (ovr: number) => {
    if (ovr >= 85) return 'text-green-400';
    if (ovr >= 75) return 'text-blue-400';
    if (ovr >= 65) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatSalary = (amount: number) => {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  };

  if (isCompact) {
    return (
      <div
        onClick={onClick}
        className="flex items-center justify-between p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm w-8">{player.position}</span>
          <span className="text-white">{player.firstName} {player.lastName}</span>
        </div>
        <span className={`font-bold ${getOverallColor(player.overall)}`}>
          {player.overall}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-gray-400">{player.position}</div>
          <div className="text-white font-bold">
            {player.firstName} {player.lastName}
          </div>
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
      </div>

      {player.contract && (
        <div className="border-t border-gray-700 pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Salary:</span>
            <span className="text-green-400">{formatSalary(player.contract.yearlySalary)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Years:</span>
            <span className="text-white">{player.contract.years}</span>
          </div>
        </div>
      )}

      {player.injuryStatus && (
        <div className="mt-2 text-red-400 text-sm">
          Injured: {player.injuryStatus.type} ({player.injuryStatus.weeksRemaining} weeks)
        </div>
      )}
    </div>
  );
};