import React from 'react';
import type { BlockingAssignment } from '../../types';

interface BlockingMenuProps {
  onSelectBlocking: (assignment: BlockingAssignment) => void;
  onClose: () => void;
  playerLabel: string;
  currentAssignment?: BlockingAssignment;
}

type BlockingOption = {
  type: BlockingAssignment;
  name: string;
  description: string;
  icon: string;
  category: 'pass' | 'run';
};

const BLOCKING_OPTIONS: BlockingOption[] = [
  // Pass Protection
  { type: 'PASS_PRO', name: 'Pass Protection', description: 'Standard pass blocking', icon: '🛡️', category: 'pass' },
  { type: 'MAN', name: 'Man Block', description: 'Block assigned defender', icon: '👤', category: 'pass' },

  // Run Blocking
  { type: 'ZONE_LEFT', name: 'Zone Left', description: 'Zone block, combo left', icon: '⬅️', category: 'run' },
  { type: 'ZONE_RIGHT', name: 'Zone Right', description: 'Zone block, combo right', icon: '➡️', category: 'run' },
  { type: 'PULL_LEFT', name: 'Pull Left', description: 'Pull and lead block left', icon: '↩️', category: 'run' },
  { type: 'PULL_RIGHT', name: 'Pull Right', description: 'Pull and lead block right', icon: '↪️', category: 'run' },
];

export const BlockingMenu: React.FC<BlockingMenuProps> = ({
  onSelectBlocking,
  onClose,
  playerLabel,
  currentAssignment,
}) => {
  const passOptions = BLOCKING_OPTIONS.filter(o => o.category === 'pass');
  const runOptions = BLOCKING_OPTIONS.filter(o => o.category === 'run');

  const renderOption = (option: BlockingOption) => {
    const isSelected = currentAssignment === option.type;

    return (
      <button
        key={option.type}
        onClick={() => onSelectBlocking(option.type)}
        className={`p-3 rounded text-left transition-colors flex items-center gap-3 ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        <span className="text-2xl">{option.icon}</span>
        <div>
          <div className="font-bold">{option.name}</div>
          <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
            {option.description}
          </div>
        </div>
        {isSelected && <span className="ml-auto text-green-400">✓</span>}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Blocking for {playerLabel}</h2>
            <p className="text-gray-400 text-sm">Select blocking assignment</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        {/* Pass Protection */}
        <div className="mb-4">
          <h3 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wide">
            Pass Protection
          </h3>
          <div className="space-y-2">
            {passOptions.map(renderOption)}
          </div>
        </div>

        {/* Run Blocking */}
        <div className="mb-4">
          <h3 className="text-green-400 font-bold mb-2 text-sm uppercase tracking-wide">
            Run Blocking
          </h3>
          <div className="space-y-2">
            {runOptions.map(renderOption)}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
