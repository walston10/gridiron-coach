import React, { useState } from 'react';
import type { FreeAgent } from '../../types';
import { FreeAgentCard } from './FreeAgentCard';

interface FreeAgentListProps {
  freeAgents: FreeAgent[];
  onMakeOffer: (playerId: string) => void;
}

export const FreeAgentList: React.FC<FreeAgentListProps> = ({
  freeAgents,
  onMakeOffer,
}) => {
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'overall' | 'salary' | 'age'>('overall');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];

  const filteredAgents = freeAgents.filter(fa => {
    if (positionFilter === 'ALL') return true;
    if (positionFilter === 'OL') return ['LT', 'LG', 'C', 'RG', 'RT'].includes(fa.player.position);
    if (positionFilter === 'DL') return ['DE', 'DT', 'NT'].includes(fa.player.position);
    if (positionFilter === 'LB') return ['OLB', 'MLB'].includes(fa.player.position);
    if (positionFilter === 'DB') return ['CB', 'FS', 'SS'].includes(fa.player.position);
    return fa.player.position === positionFilter;
  });

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (sortBy === 'overall') return b.player.overall - a.player.overall;
    if (sortBy === 'salary') return b.askingPrice - a.askingPrice;
    return a.player.age - b.player.age;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 flex-wrap">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={`px-3 py-1 rounded text-sm ${
                positionFilter === pos ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-gray-700 text-white rounded px-3 py-2 text-sm"
        >
          <option value="overall">Sort by Overall</option>
          <option value="salary">Sort by Salary</option>
          <option value="age">Sort by Age</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedAgents.map(fa => (
          <FreeAgentCard
            key={fa.player.id}
            freeAgent={fa}
            onMakeOffer={() => onMakeOffer(fa.player.id)}
          />
        ))}
      </div>

      {sortedAgents.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No free agents available
        </div>
      )}
    </div>
  );
};