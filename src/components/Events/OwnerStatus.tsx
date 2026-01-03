/**
 * Owner Status Component
 *
 * Shows the current owner, their mood, patience level,
 * and slush fund availability.
 */

import React from 'react';
import type { Owner } from '../../types/Owner';
import { getOwnerMood } from '../../types/Owner';
import { getHeatWarning } from '../../engine/EventEngine';

interface OwnerStatusProps {
  owner: Owner;
  patience: number;
  slushFund: number;
  heat: number;
  compact?: boolean;
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

function getPatienceColor(patience: number): string {
  if (patience >= 70) return 'text-green-400';
  if (patience >= 40) return 'text-yellow-400';
  if (patience >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function getHeatColor(heat: number): string {
  if (heat < 30) return 'text-green-400';
  if (heat < 50) return 'text-yellow-400';
  if (heat < 75) return 'text-orange-400';
  return 'text-red-400';
}

const MOOD_EMOJI: Record<string, string> = {
  'Happy': '😊',
  'Content': '🙂',
  'Neutral': '😐',
  'Concerned': '😟',
  'Angry': '😠',
  'Furious': '🤬',
};

export const OwnerStatus: React.FC<OwnerStatusProps> = ({
  owner,
  patience,
  slushFund,
  heat,
  compact = false,
}) => {
  const mood = getOwnerMood(patience);
  const moodEmoji = MOOD_EMOJI[mood] || '😐';
  const heatWarning = getHeatWarning(heat);

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span>{moodEmoji}</span>
          <span className="text-gray-400">{owner.name.split(' ')[0]}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💰</span>
          <span className="text-green-400">{formatMoney(slushFund)}</span>
        </div>
        {heat > 0 && (
          <div className="flex items-center gap-1">
            <span>🔥</span>
            <span className={getHeatColor(heat)}>{heat}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Owner Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">{moodEmoji}</div>
        <div>
          <div className="text-white font-bold">{owner.name}</div>
          <div className="text-sm text-gray-400">{owner.type}</div>
        </div>
      </div>

      {/* Patience Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">Owner Patience</span>
          <span className={`text-sm font-bold ${getPatienceColor(patience)}`}>
            {mood}
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              patience >= 70
                ? 'bg-green-500'
                : patience >= 40
                  ? 'bg-yellow-500'
                  : patience >= 20
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${patience}%` }}
          />
        </div>
      </div>

      {/* Slush Fund */}
      <div className="flex justify-between items-center py-2 border-t border-gray-700">
        <span className="text-gray-400">💰 Slush Fund</span>
        <span className="text-green-400 font-bold">{formatMoney(slushFund)}</span>
      </div>

      {/* Heat Indicator */}
      {heat > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-400">🔥 Heat Level</span>
            <span className={`text-sm font-bold ${getHeatColor(heat)}`}>
              {heat}/100
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                heat < 30
                  ? 'bg-green-500'
                  : heat < 50
                    ? 'bg-yellow-500'
                    : heat < 75
                      ? 'bg-orange-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${heat}%` }}
            />
          </div>
          {heatWarning && (
            <div className="mt-2 text-xs text-orange-400 bg-orange-900/30 p-2 rounded">
              ⚠️ {heatWarning}
            </div>
          )}
        </div>
      )}

      {/* Owner Personality Hint */}
      <div className="mt-4 text-xs text-gray-500 italic">
        {owner.id === 'tex' && 'Likes media attention and controversy'}
        {owner.id === 'hale' && 'Demands clean weeks and proper image'}
        {owner.id === 'kessler' && 'Watches every penny of the budget'}
      </div>
    </div>
  );
};

export default OwnerStatus;
