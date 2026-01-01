import React from 'react';
import type { FieldPosition } from '../../types';

interface DownAndDistanceProps {
  fieldPosition: FieldPosition;
}

export const DownAndDistance: React.FC<DownAndDistanceProps> = ({ fieldPosition }) => {
  const { down, yardsToGo, yardLine } = fieldPosition;

  const getDownSuffix = (d: number) => {
    if (d === 1) return 'st';
    if (d === 2) return 'nd';
    if (d === 3) return 'rd';
    return 'th';
  };

  const getYardLineText = (yl: number) => {
    if (yl === 50) return 'the 50';
    if (yl > 50) return `OPP ${100 - yl}`;
    return `OWN ${yl}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <div className="text-3xl font-bold text-white">
        {down}{getDownSuffix(down)} & {yardsToGo}
      </div>
      <div className="text-gray-400 mt-1">
        Ball on {getYardLineText(yardLine)}
      </div>
    </div>
  );
};