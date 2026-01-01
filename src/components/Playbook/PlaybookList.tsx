import React from 'react';
import type { Play } from '../../types';
import { PlayPreview } from './PlayPreview';

interface PlaybookListProps {
  plays: Play[];
  selectedPlayId?: string;
  onSelectPlay: (play: Play) => void;
  onDeletePlay?: (playId: string) => void;
}

export const PlaybookList: React.FC<PlaybookListProps> = ({
  plays,
  selectedPlayId,
  onSelectPlay,
  onDeletePlay,
}) => {
  const passingPlays = plays.filter(p => p.playType === 'PASS');
  const runningPlays = plays.filter(p => p.playType === 'RUN');

  return (
    <div className="space-y-6">
      {passingPlays.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3">Passing Plays ({passingPlays.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {passingPlays.map(play => (
              <div key={play.id} className="relative">
                <PlayPreview
                  play={play}
                  onClick={() => onSelectPlay(play)}
                  isSelected={selectedPlayId === play.id}
                />
                {onDeletePlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlay(play.id);
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {runningPlays.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3">Running Plays ({runningPlays.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {runningPlays.map(play => (
              <div key={play.id} className="relative">
                <PlayPreview
                  play={play}
                  onClick={() => onSelectPlay(play)}
                  isSelected={selectedPlayId === play.id}
                />
                {onDeletePlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlay(play.id);
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {plays.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          <p>No plays in your playbook yet.</p>
          <p className="text-sm mt-2">Go to Play Designer to create your first play!</p>
        </div>
      )}
    </div>
  );
};