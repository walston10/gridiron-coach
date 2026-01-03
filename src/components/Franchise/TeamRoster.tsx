import React, { useState } from 'react';
import { PlayerCard } from './PlayerCard';
import type { Player } from '../../types';
// Remove unused Position importimport { PlayerCard } from './PlayerCard';

interface TeamRosterProps {
  roster: Player[];
  onPlayerClick?: (player: Player) => void;
}

const POSITION_GROUPS = {
  OFFENSE: ['QB', 'RB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
  DEFENSE: ['DE', 'DT', 'NT', 'OLB', 'MLB', 'CB', 'FS', 'SS'],
  SPECIAL: ['K', 'P'],
};

export const TeamRoster: React.FC<TeamRosterProps> = ({ roster, onPlayerClick }) => {
  const [activeGroup, setActiveGroup] = useState<'OFFENSE' | 'DEFENSE' | 'SPECIAL'>('OFFENSE');
  const [sortBy, setSortBy] = useState<'position' | 'overall' | 'salary'>('position');

  const filteredRoster = roster.filter(p =>
    POSITION_GROUPS[activeGroup].includes(p.position)
  );

  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (sortBy === 'overall') return b.overall - a.overall;
    if (sortBy === 'salary') {
      const aSalary = a.contract?.yearlySalary || 0;
      const bSalary = b.contract?.yearlySalary || 0;
      return bSalary - aSalary;
    }
    // Sort by position order
    const aIndex = POSITION_GROUPS[activeGroup].indexOf(a.position);
    const bIndex = POSITION_GROUPS[activeGroup].indexOf(b.position);
    return aIndex - bIndex;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(Object.keys(POSITION_GROUPS) as Array<keyof typeof POSITION_GROUPS>).map(group => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-4 py-2 rounded ${
                activeGroup === group ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-gray-700 text-white rounded px-3 py-2"
        >
          <option value="position">Sort by Position</option>
          <option value="overall">Sort by Overall</option>
          <option value="salary">Sort by Salary</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedRoster.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onClick={() => onPlayerClick?.(player)}
          />
        ))}
      </div>

      <div className="mt-4 text-gray-400 text-sm">
        Showing {sortedRoster.length} players
      </div>
    </div>
  );
};