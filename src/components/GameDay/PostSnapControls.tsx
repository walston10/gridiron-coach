import React from 'react';

interface PostSnapControlsProps {
  onJuke: () => void;
  onSpin: () => void;
  onDive: () => void;
}

export const PostSnapControls: React.FC<PostSnapControlsProps> = ({
  onJuke,
  onSpin,
  onDive,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="text-gray-400 text-sm mb-2">Controls</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center text-white text-xs">
          <div className="bg-gray-700 rounded p-2 mb-1">↑</div>
          <div>W / ↑</div>
        </div>
        <div className="text-center text-white text-xs">
          <div className="bg-gray-700 rounded p-2 mb-1">←↓→</div>
          <div>A S D</div>
        </div>
        <div className="text-center text-white text-xs">
          <div className="bg-gray-700 rounded p-2 mb-1">Move</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onJuke}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
        >
          Juke (J)
        </button>
        <button
          onClick={onSpin}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm"
        >
          Spin (K)
        </button>
        <button
          onClick={onDive}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm"
        >
          Dive (L)
        </button>
      </div>
    </div>
  );
};