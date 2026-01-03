/**
 * Desk Meters
 *
 * A notepad/sticky note on the desk showing the 5 visible meters.
 * Yellow legal pad aesthetic.
 */

import React from 'react';
import type { Meters } from '../../types/Events';

interface DeskMetersProps {
  meters: Meters;
}

interface MeterConfig {
  key: keyof Meters;
  label: string;
  color: string;
  bgColor: string;
}

const METER_CONFIG: MeterConfig[] = [
  { key: 'reputation', label: 'REP', color: 'bg-blue-500', bgColor: 'bg-blue-900/30' },
  { key: 'culture', label: 'CULT', color: 'bg-purple-500', bgColor: 'bg-purple-900/30' },
  { key: 'image', label: 'IMG', color: 'bg-yellow-500', bgColor: 'bg-yellow-900/30' },
  { key: 'risk', label: 'RISK', color: 'bg-red-500', bgColor: 'bg-red-900/30' },
  { key: 'playerTrust', label: 'TRUST', color: 'bg-emerald-500', bgColor: 'bg-emerald-900/30' },
];

export const DeskMeters: React.FC<DeskMetersProps> = ({ meters }) => {
  return (
    <div
      className="h-full bg-gradient-to-b from-amber-100 to-amber-200 rounded shadow-lg
                 border-l-4 border-amber-300 p-3 flex flex-col"
      style={{
        backgroundImage: `repeating-linear-gradient(
          transparent,
          transparent 23px,
          #d4b896 24px,
          #d4b896 25px
        )`,
      }}
    >
      {/* Header */}
      <div className="text-stone-600 font-bold text-xs mb-3 tracking-wider border-b border-amber-300 pb-1">
        STATUS
      </div>

      {/* Meters */}
      <div className="flex-1 flex flex-col justify-around">
        {METER_CONFIG.map((config) => {
          const value = meters[config.key];
          return (
            <div key={config.key} className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-stone-700 text-xs font-medium">{config.label}</span>
                <span className="text-stone-500 text-xs font-mono">{value}</span>
              </div>
              <div className={`h-2 rounded-full ${config.bgColor} overflow-hidden`}>
                <div
                  className={`h-full ${config.color} transition-all duration-500 ease-out rounded-full`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeskMeters;
