/**
 * Meter Display Component
 *
 * Shows the 5 visible meters: reputation, culture, image, risk, playerTrust
 * Each meter ranges from 0-100 with color-coded states.
 */

import React from 'react';
import type { Meters } from '../../types/Events';

interface MeterDisplayProps {
  meters: Meters;
  compact?: boolean;
}

interface MeterConfig {
  key: keyof Meters;
  label: string;
  lowLabel: string;
  highLabel: string;
  icon: string;
  // Whether high values are good (green) or bad (red)
  highIsGood: boolean;
}

const METER_CONFIG: MeterConfig[] = [
  {
    key: 'reputation',
    label: 'Reputation',
    lowLabel: 'Corrupt',
    highLabel: 'Clean',
    icon: '⚖️',
    highIsGood: true,
  },
  {
    key: 'culture',
    label: 'Culture',
    lowLabel: 'Wins-First',
    highLabel: 'Players-First',
    icon: '👥',
    highIsGood: true,
  },
  {
    key: 'image',
    label: 'Image',
    lowLabel: 'Villain',
    highLabel: 'Beloved',
    icon: '📺',
    highIsGood: true,
  },
  {
    key: 'risk',
    label: 'Risk',
    lowLabel: 'Conservative',
    highLabel: 'Reckless',
    icon: '🎲',
    highIsGood: false, // Low risk is generally better
  },
  {
    key: 'playerTrust',
    label: 'Locker Room',
    lowLabel: 'Toxic',
    highLabel: 'United',
    icon: '🤝',
    highIsGood: true,
  },
];

function getMeterColor(value: number, highIsGood: boolean): string {
  const effectiveValue = highIsGood ? value : 100 - value;

  if (effectiveValue >= 70) return 'bg-green-500';
  if (effectiveValue >= 50) return 'bg-yellow-500';
  if (effectiveValue >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

function getMeterBgColor(value: number, highIsGood: boolean): string {
  const effectiveValue = highIsGood ? value : 100 - value;

  if (effectiveValue >= 70) return 'bg-green-900/50';
  if (effectiveValue >= 50) return 'bg-yellow-900/50';
  if (effectiveValue >= 30) return 'bg-orange-900/50';
  return 'bg-red-900/50';
}

export const MeterDisplay: React.FC<MeterDisplayProps> = ({ meters, compact = false }) => {
  if (compact) {
    return (
      <div className="flex gap-4">
        {METER_CONFIG.map((config) => {
          const value = meters[config.key];
          return (
            <div key={config.key} className="flex items-center gap-2">
              <span className="text-sm">{config.icon}</span>
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getMeterColor(value, config.highIsGood)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-6">{value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold text-white mb-4">Program Status</h3>
      {METER_CONFIG.map((config) => {
        const value = meters[config.key];
        return (
          <div key={config.key} className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="text-sm text-gray-300">{config.label}</span>
              </div>
              <span className="text-sm font-bold text-white">{value}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 text-right">{config.lowLabel}</span>
              <div className={`flex-1 h-3 rounded-full overflow-hidden ${getMeterBgColor(value, config.highIsGood)}`}>
                <div
                  className={`h-full transition-all duration-300 rounded-full ${getMeterColor(value, config.highIsGood)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-20">{config.highLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MeterDisplay;
