import React from 'react';
import type { OffensivePlay } from '../../types/GameSim';

interface PlaySelectorProps {
  plays: OffensivePlay[];
  selectedPlay: OffensivePlay | null;
  onSelectPlay: (play: OffensivePlay) => void;
  onSnap: () => void;
  disabled?: boolean;
}

export const PlaySelector: React.FC<PlaySelectorProps> = ({
  plays,
  selectedPlay,
  onSelectPlay,
  onSnap,
  disabled = false,
}) => {
  // Group plays by type
  const runPlays = plays.filter(p => p.type === 'RUN');
  const passPlays = plays.filter(p => p.type === 'PASS');
  const screenPlays = plays.filter(p => p.type === 'SCREEN');
  const paPlays = plays.filter(p => p.type === 'PLAY_ACTION');

  const PlayButton: React.FC<{ play: OffensivePlay }> = ({ play }) => {
    const isSelected = selectedPlay?.id === play.id;

    return (
      <button
        onClick={() => onSelectPlay(play)}
        disabled={disabled}
        className={`w-full text-left p-2 rounded text-sm transition-colors ${
          isSelected
            ? 'bg-blue-600 text-white'
            : disabled
            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <div className="font-medium">{play.name}</div>
        <div className="text-xs opacity-70">{play.formation}</div>
      </button>
    );
  };

  const PlayCategory: React.FC<{ title: string; plays: OffensivePlay[]; color: string }> = ({
    title,
    plays: categoryPlays,
    color,
  }) => {
    if (categoryPlays.length === 0) return null;

    return (
      <div className="mb-4">
        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}>
          {title}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {categoryPlays.map(play => (
            <PlayButton key={play.id} play={play} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="text-white font-bold text-lg mb-4">Select Play</div>

      <div className="max-h-80 overflow-y-auto pr-2">
        <PlayCategory title="Run Plays" plays={runPlays} color="text-green-400" />
        <PlayCategory title="Pass Plays" plays={passPlays} color="text-blue-400" />
        <PlayCategory title="Screens" plays={screenPlays} color="text-yellow-400" />
        <PlayCategory title="Play Action" plays={paPlays} color="text-purple-400" />
      </div>

      {/* Selected play details */}
      {selectedPlay && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <div className="text-white font-bold">{selectedPlay.name}</div>
          <div className="text-gray-400 text-sm mt-1">{selectedPlay.description}</div>
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded ${
              selectedPlay.type === 'RUN' ? 'bg-green-900 text-green-300' :
              selectedPlay.type === 'PASS' ? 'bg-blue-900 text-blue-300' :
              selectedPlay.type === 'SCREEN' ? 'bg-yellow-900 text-yellow-300' :
              'bg-purple-900 text-purple-300'
            }`}>
              {selectedPlay.type}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
              {selectedPlay.formation}
            </span>
          </div>
        </div>
      )}

      {/* Snap button */}
      <button
        onClick={onSnap}
        disabled={!selectedPlay || disabled}
        className={`w-full mt-4 py-3 rounded font-bold text-lg transition-colors ${
          selectedPlay && !disabled
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {disabled ? 'Play in Progress' : selectedPlay ? 'SNAP!' : 'Select a Play'}
      </button>
    </div>
  );
};

export default PlaySelector;
