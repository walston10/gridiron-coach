import React, { useState } from 'react';
import type { ConceptTemplate } from '../../types';
import { PASS_CONCEPTS, RUN_CONCEPTS } from '../../data/concepts';

interface ConceptPickerProps {
  onSelect: (concept: ConceptTemplate) => void;
  playType?: 'RUN' | 'PASS';
}

export const ConceptPicker: React.FC<ConceptPickerProps> = ({ onSelect, playType }) => {
  const [activeTab, setActiveTab] = useState<'PASS' | 'RUN'>(playType || 'PASS');

  const concepts = activeTab === 'PASS' ? PASS_CONCEPTS : RUN_CONCEPTS;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('PASS')}
          className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
            activeTab === 'PASS'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Pass Concepts
        </button>
        <button
          onClick={() => setActiveTab('RUN')}
          className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
            activeTab === 'RUN'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Run Concepts
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {concepts.map((concept) => (
          <button
            key={concept.id}
            onClick={() => onSelect(concept)}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
          >
            <div className="font-medium text-white">{concept.name}</div>
            <div className="text-xs text-gray-400 mt-1">{concept.description}</div>
            {concept.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {concept.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded"
                  >
                    {tag.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
