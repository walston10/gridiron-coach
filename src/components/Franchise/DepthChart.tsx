import React from 'react';
import type { Player, DepthChart as DepthChartType } from '../../types';import { PlayerCard } from './PlayerCard';

interface DepthChartProps {
  roster: Player[];
  depthChart: DepthChartType;
  onUpdateDepth?: (position: string, playerIds: string[]) => void;
}

const OFFENSE_POSITIONS = ['QB', 'RB', 'WR1', 'WR2', 'WR3', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'];
const DEFENSE_POSITIONS = ['DE1', 'DE2', 'DT1', 'DT2', 'OLB1', 'OLB2', 'MLB', 'CB1', 'CB2', 'FS', 'SS'];

export const DepthChart: React.FC<DepthChartProps> = ({ roster, depthChart, onUpdateDepth }) => {
  const getPlayersForPosition = (pos: string): Player[] => {
    const basePos = pos.replace(/[0-9]/g, '');
    return roster
      .filter(p => p.position === basePos)
      .sort((a, b) => b.overall - a.overall);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Offense</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OFFENSE_POSITIONS.map(pos => {
            const players = getPlayersForPosition(pos);
            return (
              <div key={pos} className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-400 text-sm mb-2">{pos}</div>
                <div className="space-y-2">
                  {players.slice(0, 3).map((player, idx) => (
                    <PlayerCard key={player.id} player={player} isCompact />
                  ))}
                  {players.length === 0 && (
                    <div className="text-gray-500 text-sm">No players</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">Defense</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFENSE_POSITIONS.map(pos => {
            const players = getPlayersForPosition(pos);
            return (
              <div key={pos} className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-400 text-sm mb-2">{pos}</div>
                <div className="space-y-2">
                  {players.slice(0, 3).map((player, idx) => (
                    <PlayerCard key={player.id} player={player} isCompact />
                  ))}
                  {players.length === 0 && (
                    <div className="text-gray-500 text-sm">No players</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};