import React from 'react';
import type { FormationType } from '../../types';
import { FORMATIONS } from '../../data/formations';
import { useGameStore } from '../../stores/gameStore';

interface FormationPickerProps {
  selected: FormationType | string;
  onSelect: (formation: FormationType | string) => void;
  onEditFormation?: () => void;
}

export const FormationPicker: React.FC<FormationPickerProps> = ({
  selected,
  onSelect,
  onEditFormation,
}) => {
  const { customFormations, removeCustomFormation } = useGameStore();

  return (
    <div className="space-y-3">
      {/* Standard Formations */}
      <div>
        <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Standard Formations</div>
        <div className="flex flex-wrap gap-2">
          {FORMATIONS.map(f => (
            <button
              key={f.type}
              onClick={() => onSelect(f.type)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                selected === f.type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Formations */}
      {customFormations.length > 0 && (
        <div>
          <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Custom Formations</div>
          <div className="flex flex-wrap gap-2">
            {customFormations.map(f => (
              <div key={f.id} className="relative group">
                <button
                  onClick={() => onSelect(f.id)}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    selected === f.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${f.name}"?`)) {
                      removeCustomFormation(f.id);
                    }
                  }}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Formation Button */}
      {onEditFormation && (
        <button
          onClick={onEditFormation}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
        >
          + Create Custom Formation
        </button>
      )}
    </div>
  );
};
