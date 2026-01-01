import React, { useState } from 'react';
import type { Play } from '../../types';
import { PlayPreview } from '../Playbook/PlayPreview';

interface PlayCallModalProps {
  plays: Play[];
  onSelectPlay: (play: Play) => void;
  onClose: () => void;
}

export const PlayCallModal: React.FC<PlayCallModalProps> = ({
  plays,
  onSelectPlay,
  onClose,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PASS' | 'RUN'>('ALL');

  const filteredPlays = plays.filter(p => {
    if (filter === 'ALL') return true;
    return p.playType === filter;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Call a Play</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['ALL', 'PASS', 'RUN'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredPlays.map(play => (
              <PlayPreview
                key={play.id}
                play={play}
                onClick={() => {
                  onSelectPlay(play);
                  onClose();
                }}
              />
            ))}
          </div>

          {filteredPlays.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No plays available. Create some in the Play Designer!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};