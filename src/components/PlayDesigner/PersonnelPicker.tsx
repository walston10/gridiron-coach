import React from 'react';
import type { PersonnelPackage } from '../../types';
import { PERSONNEL_PACKAGES } from '../../data/personnel';

interface PersonnelPickerProps {
  selected: PersonnelPackage;
  onSelect: (personnel: PersonnelPackage) => void;
}

export const PersonnelPicker: React.FC<PersonnelPickerProps> = ({ selected, onSelect }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Personnel</label>
      <div className="grid grid-cols-4 gap-2">
        {PERSONNEL_PACKAGES.map((pkg) => (
          <button
            key={pkg.code}
            onClick={() => onSelect(pkg.code)}
            className={`p-2 rounded text-center transition-colors ${
              selected === pkg.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={pkg.description}
          >
            <div className="text-lg font-bold">{pkg.code}</div>
            <div className="text-xs opacity-75">{pkg.rb}RB {pkg.te}TE {pkg.wr}WR</div>
          </button>
        ))}
      </div>
    </div>
  );
};
