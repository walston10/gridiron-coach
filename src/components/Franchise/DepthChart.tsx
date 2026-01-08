import React from 'react';
import type { Player } from '../../types';
import { PlayerCard } from './PlayerCard';

interface DepthChartProps {
  roster: Player[];
  onUpdateDepth?: (position: string, playerIds: string[]) => void;
}

// Simplified roster positions
const OFFENSE_POSITIONS = ['QB', 'RB', 'WR1', 'WR2', 'FLEX'];
const DEFENSE_POSITIONS = ['CB1', 'CB2', 'S', 'LB1', 'LB2'];

const POSITION_LABELS: Record<string, string> = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR1: 'Wide Receiver 1',
  WR2: 'Wide Receiver 2',
  FLEX: 'Flex (TE/FB/Slot)',
  CB1: 'Cornerback 1',
  CB2: 'Cornerback 2',
  S: 'Safety',
  LB1: 'Linebacker 1 (MLB)',
  LB2: 'Linebacker 2 (OLB)',
};

export const DepthChart: React.FC<DepthChartProps> = ({ roster, onUpdateDepth: _onUpdateDepth }) => {
  const getPlayersForPosition = (pos: string): Player[] => {
    return roster
      .filter(p => p.position === pos)
      .sort((a, b) => b.overall - a.overall);
  };

  return (
    <div className="space-y-6">
      {/* Offense */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Offense (5 Starters + 5 Bench)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OFFENSE_POSITIONS.map(pos => {
            const players = getPlayersForPosition(pos);
            return (
              <div key={pos} className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-400 text-sm mb-2">
                  {POSITION_LABELS[pos] || pos}
                </div>
                <div className="space-y-2">
                  {players.map((player, idx) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${idx === 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {idx === 0 ? 'START' : 'BENCH'}
                      </span>
                      <PlayerCard player={player} isCompact />
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className="text-gray-500 text-sm">No players</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* O-Line Unit */}
        <div className="mt-4 bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-sm mb-2">Offensive Line Unit</div>
          <div className="text-white text-sm">
            Aggregate unit - no individual players
          </div>
        </div>
      </div>

      {/* Defense */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Defense (5 Starters + 5 Bench)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFENSE_POSITIONS.map(pos => {
            const players = getPlayersForPosition(pos);
            return (
              <div key={pos} className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-400 text-sm mb-2">
                  {POSITION_LABELS[pos] || pos}
                </div>
                <div className="space-y-2">
                  {players.map((player, idx) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${idx === 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {idx === 0 ? 'START' : 'BENCH'}
                      </span>
                      <PlayerCard player={player} isCompact />
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className="text-gray-500 text-sm">No players</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* D-Line Unit */}
        <div className="mt-4 bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-sm mb-2">Defensive Line Unit</div>
          <div className="text-white text-sm">
            Aggregate unit - no individual players
          </div>
        </div>
      </div>
    </div>
  );
};
