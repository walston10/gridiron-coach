/**
 * Desk Meters
 *
 * Dark panel showing the 5 visible meters with GTA-style bars.
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
  glowColor: string;
}

const METER_CONFIG: MeterConfig[] = [
  { key: 'reputation', label: 'REPUTATION', color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.3)' },
  { key: 'culture', label: 'CULTURE', color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.3)' },
  { key: 'image', label: 'IMAGE', color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.3)' },
  { key: 'risk', label: 'RISK', color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)' },
  { key: 'playerTrust', label: 'TRUST', color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)' },
];

export const DeskMeters: React.FC<DeskMetersProps> = ({ meters }) => {
  return (
    <div
      className="flex-1 rounded-sm p-4 flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="text-amber-500/80 font-black text-xs mb-4 tracking-widest border-b border-stone-800 pb-2">
        STATUS
      </div>

      {/* Meters */}
      <div className="flex-1 flex flex-col justify-around gap-3">
        {METER_CONFIG.map((config) => {
          const value = meters[config.key];
          const isLow = value < 30;
          const isHigh = value > 70;
          const isRisk = config.key === 'risk';

          // Risk meter: high is bad, low is good (inverse coloring)
          const isDanger = isRisk ? isHigh : isLow;

          return (
            <div key={config.key} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 text-xs font-bold tracking-wider">
                  {config.label}
                </span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: config.color }}
                >
                  {value}
                </span>
              </div>
              <div className="h-3 bg-stone-900 rounded-sm overflow-hidden relative">
                {/* Background segments */}
                <div className="absolute inset-0 flex">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-stone-800 last:border-r-0"
                    />
                  ))}
                </div>
                {/* Filled bar */}
                <div
                  className="h-full transition-all duration-500 ease-out relative"
                  style={{
                    width: `${value}%`,
                    background: `linear-gradient(90deg, ${config.color}dd 0%, ${config.color} 100%)`,
                    boxShadow: isDanger
                      ? `0 0 10px ${config.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`
                      : `inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                />
                {/* Danger pulse overlay */}
                {isDanger && (
                  <div
                    className="absolute inset-0 animate-pulse opacity-30"
                    style={{ background: config.color }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeskMeters;
