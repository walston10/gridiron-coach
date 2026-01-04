/**
 * Event Screen Component
 *
 * Full-screen event display with character portrait, description,
 * and choice buttons. Shows costs and success rates.
 */

import React, { useState } from 'react';
import type { GameEvent, Choice, ChoiceResult, Meters } from '../../types/Events';
import { getEscalatingCost, getDiminishedSuccessRate } from '../../engine/EventEngine';
import type { ShadyActionType } from '../../types/Events';
import type { Player } from '../../types/Player';

interface EventScreenProps {
  event: GameEvent;
  slushFund: number;
  shadyActionCounts: Record<ShadyActionType, number>;
  onChoiceSelect: (choice: Choice) => void;
  result?: ChoiceResult;
  onContinue?: () => void;
  contextPlayer?: Player | null;  // The player this event is about
}

/**
 * Replace template placeholders in event text with actual player info
 * Supports: {{playerName}}, {{playerFirstName}}, {{playerLastName}}, {{playerPosition}}
 */
function interpolateEventText(text: string, player?: Player | null): string {
  if (!player) return text;

  return text
    .replace(/\{\{playerName\}\}/g, `${player.firstName} ${player.lastName}`)
    .replace(/\{\{playerFirstName\}\}/g, player.firstName)
    .replace(/\{\{playerLastName\}\}/g, player.lastName)
    .replace(/\{\{playerPosition\}\}/g, player.position);
}

// Character portraits (simple emoji representations for now)
const CHARACTER_PORTRAITS: Record<string, { emoji: string; color: string }> = {
  OWNER: { emoji: '👔', color: 'bg-purple-900' },
  PLAYER: { emoji: '🏈', color: 'bg-green-900' },
  AGENT: { emoji: '📱', color: 'bg-blue-900' },
  REPORTER: { emoji: '📰', color: 'bg-yellow-900' },
  SHADY_FIGURE: { emoji: '🕶️', color: 'bg-gray-900' },
  DOCTOR: { emoji: '🩺', color: 'bg-teal-900' },
  LEAGUE_REP: { emoji: '⚖️', color: 'bg-red-900' },
};

const TAG_STYLES: Record<string, string> = {
  SHADY: 'bg-purple-600 text-purple-100',
  EXPENSIVE: 'bg-yellow-600 text-yellow-100',
  RISKY: 'bg-red-600 text-red-100',
  SAFE: 'bg-green-600 text-green-100',
  MORAL: 'bg-blue-600 text-blue-100',
};

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

function getMeterChangeColor(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-400';
}

const METER_LABELS: Record<keyof Meters, string> = {
  reputation: 'Rep',
  culture: 'Culture',
  image: 'Image',
  risk: 'Risk',
  playerTrust: 'Trust',
};

export const EventScreen: React.FC<EventScreenProps> = ({
  event,
  slushFund,
  shadyActionCounts,
  onChoiceSelect,
  result,
  onContinue,
  contextPlayer,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const portrait = CHARACTER_PORTRAITS[event.character] || CHARACTER_PORTRAITS.PLAYER;

  // Interpolate player info into event text
  const displayDescription = interpolateEventText(event.description, contextPlayer);

  // Calculate actual costs and rates for display
  const getDisplayCost = (choice: Choice): number => {
    if (!choice.cost) return 0;
    if (choice.shadyActionType) {
      return getEscalatingCost(choice.cost, choice.shadyActionType, shadyActionCounts);
    }
    return choice.cost;
  };

  const getDisplaySuccessRate = (choice: Choice): number => {
    if (choice.successRate === undefined) return 1;
    if (choice.shadyActionType) {
      return getDiminishedSuccessRate(choice.successRate, choice.shadyActionType, shadyActionCounts);
    }
    return choice.successRate;
  };

  const canAfford = (choice: Choice): boolean => {
    const cost = getDisplayCost(choice);
    return cost <= 0 || slushFund >= cost;
  };

  const handleChoiceClick = (choice: Choice) => {
    if (!canAfford(choice)) return;
    setSelectedChoice(choice);
    onChoiceSelect(choice);
  };

  // Show result screen
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 space-y-6">
          {/* Result Header */}
          <div className={`text-center text-2xl font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? 'Success' : 'Failed'}
          </div>

          {/* Flavor Text */}
          <div className="text-gray-300 text-center text-lg">
            {interpolateEventText(result.flavorText || '', contextPlayer)}
          </div>

          {/* Meter Changes */}
          {result.meterChanges && Object.keys(result.meterChanges).length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Effects:</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(result.meterChanges) as [keyof Meters, number][]).map(([meter, value]) => (
                  <div key={meter} className="flex justify-between">
                    <span className="text-gray-300">{METER_LABELS[meter]}</span>
                    <span className={getMeterChangeColor(value)}>
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heat/Patience Changes */}
          {(result.heatChange !== undefined && result.heatChange !== 0) && (
            <div className="flex justify-center gap-4">
              <span className="text-gray-400">Heat:</span>
              <span className={result.heatChange > 0 ? 'text-red-400' : 'text-green-400'}>
                {result.heatChange > 0 ? '+' : ''}{result.heatChange}
              </span>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Main event screen
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full overflow-hidden">
        {/* Character Portrait Section */}
        <div className={`${portrait.color} p-8 flex flex-col items-center`}>
          <div className="text-6xl mb-4">{portrait.emoji}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {event.character.replace('_', ' ')}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <h2 className="text-2xl font-bold text-white">{event.title}</h2>

          {/* Description */}
          <p className="text-gray-300 leading-relaxed">{displayDescription}</p>

          {/* Slush Fund Display */}
          <div className="flex justify-between items-center py-2 border-t border-b border-gray-700">
            <span className="text-gray-400">Available Funds:</span>
            <span className="text-green-400 font-bold">{formatMoney(slushFund)}</span>
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {event.choices.map((choice) => {
              const cost = getDisplayCost(choice);
              const successRate = getDisplaySuccessRate(choice);
              const affordable = canAfford(choice);

              return (
                <button
                  key={choice.id}
                  onClick={() => handleChoiceClick(choice)}
                  disabled={!affordable}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    affordable
                      ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700 cursor-pointer'
                      : 'border-gray-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium">{interpolateEventText(choice.text, contextPlayer)}</span>
                    {cost > 0 && (
                      <span className={`text-sm ${affordable ? 'text-yellow-400' : 'text-red-400'}`}>
                        {formatMoney(cost)}
                      </span>
                    )}
                  </div>

                  {/* Tags and Success Rate */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {choice.tags?.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded ${TAG_STYLES[tag] || 'bg-gray-600'}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {successRate < 1 && (
                      <span className="text-xs text-gray-400">
                        {Math.round(successRate * 100)}% success
                      </span>
                    )}
                  </div>

                  {/* Show if choice won't work due to funds */}
                  {!affordable && (
                    <div className="text-xs text-red-400 mt-2">
                      Not enough funds
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventScreen;
