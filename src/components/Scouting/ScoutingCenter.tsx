import React, { useState, useEffect } from 'react';
import { ProspectList } from './ProspectList';
import { generateDraftClass, scoutProspect } from '../../utils/draftGenerator';
import type { DraftProspect } from '../../types';

export const ScoutingCenter: React.FC = () => {
  const [prospects, setProspects] = useState<DraftProspect[]>([]);
  const [scoutingPoints, setScoutingPoints] = useState(100);

  useEffect(() => {
    // Generate draft class on mount
    setProspects(generateDraftClass(200));
  }, []);

  const handleScout = (prospectId: string) => {
    if (scoutingPoints < 10) {
      alert('Not enough scouting points!');
      return;
    }

    setProspects(prev => prev.map(p => {
      if (p.player.id === prospectId) {
        return scoutProspect(p, 10);
      }
      return p;
    }));

    setScoutingPoints(prev => prev - 10);
  };

  const handleToggleInterest = (prospectId: string) => {
    setProspects(prev => prev.map(p => {
      if (p.player.id === prospectId) {
        const nextInterest = p.userInterest === 'NONE' ? 'WATCHING' :
                           p.userInterest === 'WATCHING' ? 'TARGET' : 'NONE';
        return { ...p, userInterest: nextInterest };
      }
      return p;
    }));
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Scouting Center</h1>
        <div className="bg-gray-800 rounded-lg px-4 py-2">
          <span className="text-gray-400">Scouting Points:</span>
          <span className="text-white font-bold ml-2">{scoutingPoints}</span>
        </div>
      </div>

      <ProspectList
        prospects={prospects}
        onScout={handleScout}
        onToggleInterest={handleToggleInterest}
      />
    </div>
  );
};