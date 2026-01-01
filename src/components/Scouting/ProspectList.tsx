import React, { useState } from 'react';
import type { DraftProspect } from '../../types';
import { ProspectCard } from './ProspectCard';

interface ProspectListProps {
  prospects: DraftProspect[];
  onScout: (prospectId: string) => void;
}

export const ProspectList: React.FC<ProspectListProps> = ({
  prospects,
  onScout,
}) => {
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'projected' | 'scouted'>('projected');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];

  const filteredProspects = prospects.filter((p: DraftProspect) => {
    if (positionFilter === 'ALL') return true;
    if (positionFilter === 'OL') return ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.player.position);
    if (positionFilter === 'DL') return ['DE', 'DT', 'NT'].includes(p.player.position);
    if (positionFilter === 'LB') return ['OLB', 'MLB'].includes(p.player.position);
    if (positionFilter === 'DB') return ['CB', 'FS', 'SS'].includes(p.player.position);
    return p.player.position === positionFilter;
  });

  const sortedProspects = [...filteredProspects].sort((a: DraftProspect, b: DraftProspect) => {
    if (sortBy === 'projected') return a.projectedRound - b.projectedRound;
    return Object.keys(b.scoutedStats).length - Object.keys(a.scoutedStats).length;
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
          <option value="projected">Sort by Projection</option>
          <option value="scouted">Sort by Scouted %</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedProspects.map((prospect: DraftProspect) => (
          <ProspectCard
            key={prospect.player.id}
            prospect={prospect}
            onScout={() => onScout(prospect.player.id)}
          />
        ))}
      </div>

      <div className="mt-4 text-gray-400 text-sm">
        Showing {sortedProspects.length} prospects
      </div>
    </div>
  );
};