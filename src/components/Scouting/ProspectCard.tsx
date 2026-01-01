import React from 'react';
import type { DraftProspect } from '../../types';

interface ProspectCardProps {
  prospect: DraftProspect;
  onClick?: () => void;
  onScout?: () => void;
}

export const ProspectCard: React.FC<ProspectCardProps> = ({ prospect, onClick, onScout }) => {
  const { player, scoutedStats, projectedRound, isFullyScouted, userInterest } = prospect;

  const revealedCount = Object.keys(scoutedStats).length;
  const totalStats = 16;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-xs text-gray-400">{player.position}</div>
          <div className="text-white font-bold">{player.firstName} {player.lastName}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Proj. Rd</div>
          <div className="text-white font-bold">{projectedRound}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 rounded-full h-2"
            style={{ width: `${(revealedCount / totalStats) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{revealedCount}/{totalStats}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs mb-3">
        {Object.entries(scoutedStats).slice(0, 6).map(([stat, value]) => (
          <div key={stat} className="flex justify-between">
            <span className="text-gray-400 capitalize">{stat.slice(0, 8)}</span>
            <span className="text-white">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {onScout && !isFullyScouted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onScout();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm"
          >
            Scout (+10 pts)
          </button>
        )}
        <div className={`px-2 py-1 rounded text-xs ${
          userInterest === 'TARGET' ? 'bg-green-600' :
          userInterest === 'WATCHING' ? 'bg-yellow-600' : 'bg-gray-600'
        }`}>
          {userInterest}
        </div>
      </div>
    </div>
  );
};