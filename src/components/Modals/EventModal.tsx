/**
 * Event Modal
 *
 * Full-screen modal for event display with character portrait,
 * dialogue, and choice buttons. GTA-style presentation.
 */

import React, { useState } from 'react';
import type { GameEvent, Choice, ChoiceResult, Meters } from '../../types/Events';
import type { ShadyActionType } from '../../types/Events';
import { getEscalatingCost, getDiminishedSuccessRate } from '../../engine/EventEngine';

interface EventModalProps {
  event: GameEvent;
  slushFund: number;
  shadyActionCounts: Record<ShadyActionType, number>;
  result: ChoiceResult | null;
  onChoice: (choice: Choice) => void;
  onContinue: () => void;
  onClose: () => void;
}

// Character portrait styles
const CHARACTER_STYLES: Record<string, { bg: string; border: string; emoji: string }> = {
  OWNER: { bg: 'from-purple-900 to-purple-950', border: 'border-purple-500', emoji: '👔' },
  PLAYER: { bg: 'from-green-900 to-green-950', border: 'border-green-500', emoji: '🏈' },
  AGENT: { bg: 'from-blue-900 to-blue-950', border: 'border-blue-500', emoji: '📱' },
  REPORTER: { bg: 'from-yellow-900 to-yellow-950', border: 'border-yellow-500', emoji: '📰' },
  SHADY_FIGURE: { bg: 'from-stone-800 to-black', border: 'border-stone-600', emoji: '🕶️' },
  DOCTOR: { bg: 'from-teal-900 to-teal-950', border: 'border-teal-500', emoji: '🩺' },
  LEAGUE_REP: { bg: 'from-red-900 to-red-950', border: 'border-red-500', emoji: '⚖️' },
};

const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  SHADY: { bg: 'bg-purple-600/80', text: 'text-purple-100' },
  EXPENSIVE: { bg: 'bg-yellow-600/80', text: 'text-yellow-100' },
  RISKY: { bg: 'bg-red-600/80', text: 'text-red-100' },
  SAFE: { bg: 'bg-green-600/80', text: 'text-green-100' },
  MORAL: { bg: 'bg-blue-600/80', text: 'text-blue-100' },
};

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `$${Math.floor(amount / 1_000)}K`;
  }
  return `$${amount}`;
}

const METER_LABELS: Record<keyof Meters, string> = {
  reputation: 'Reputation',
  culture: 'Culture',
  image: 'Image',
  risk: 'Risk',
  playerTrust: 'Trust',
};

export const EventModal: React.FC<EventModalProps> = ({
  event,
  slushFund,
  shadyActionCounts,
  result,
  onChoice,
  onContinue,
  onClose,
}) => {
  const [hoveredChoice, setHoveredChoice] = useState<Choice | null>(null);
  const characterStyle = CHARACTER_STYLES[event.character] || CHARACTER_STYLES.PLAYER;

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

  // Result view
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg max-w-lg w-full overflow-hidden border border-stone-600/50 shadow-2xl">
          {/* Result header */}
          <div className={`p-6 text-center ${result.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
            <div className={`text-3xl font-black mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? 'SUCCESS' : 'FAILED'}
            </div>
          </div>

          {/* Flavor text */}
          <div className="p-6">
            <p className="text-stone-200 text-lg text-center leading-relaxed">
              "{result.flavorText}"
            </p>
          </div>

          {/* Meter changes */}
          {result.meterChanges && Object.keys(result.meterChanges).length > 0 && (
            <div className="px-6 pb-4">
              <div className="bg-stone-950/50 rounded-lg p-4">
                <div className="text-stone-400 text-xs uppercase tracking-wider mb-3">Effects</div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(result.meterChanges) as [keyof Meters, number][]).map(([meter, value]) => (
                    <div key={meter} className="flex justify-between items-center">
                      <span className="text-stone-400 text-sm">{METER_LABELS[meter]}</span>
                      <span className={`font-bold ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {value > 0 ? '+' : ''}{value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Heat change */}
          {result.heatChange !== undefined && result.heatChange !== 0 && (
            <div className="px-6 pb-4">
              <div className="flex justify-center items-center gap-2">
                <span className="text-stone-400">🔥 Heat:</span>
                <span className={result.heatChange > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                  {result.heatChange > 0 ? '+' : ''}{result.heatChange}
                </span>
              </div>
            </div>
          )}

          {/* Continue button */}
          <div className="p-6 pt-2">
            <button
              onClick={onContinue}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600
                         text-white font-bold text-lg rounded-lg transition-all duration-200
                         shadow-lg shadow-amber-900/50"
            >
              CONTINUE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main event view
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg max-w-2xl w-full overflow-hidden border border-stone-600/50 shadow-2xl">
        {/* Character portrait section */}
        <div className={`bg-gradient-to-br ${characterStyle.bg} p-8 relative`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>

          {/* Portrait placeholder */}
          <div className="flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full ${characterStyle.border} border-4 bg-stone-900/50 flex items-center justify-center mb-4`}>
              <span className="text-5xl">{characterStyle.emoji}</span>
            </div>
            <div className="text-stone-300 text-xs uppercase tracking-widest">
              {event.character.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Event content */}
        <div className="p-6">
          {/* Title */}
          <h2 className="text-2xl font-black text-white mb-4 text-center">
            {event.title}
          </h2>

          {/* Description */}
          <p className="text-stone-300 text-lg leading-relaxed mb-6 text-center italic">
            "{event.description}"
          </p>

          {/* Slush fund display */}
          <div className="flex justify-center items-center gap-2 mb-6 py-2 border-t border-b border-stone-700">
            <span className="text-stone-400">💰 Available:</span>
            <span className="text-emerald-400 font-bold text-lg">{formatMoney(slushFund)}</span>
          </div>

          {/* Choice buttons */}
          <div className="grid grid-cols-2 gap-3">
            {event.choices.map((choice) => {
              const cost = getDisplayCost(choice);
              const successRate = getDisplaySuccessRate(choice);
              const affordable = canAfford(choice);

              return (
                <button
                  key={choice.id}
                  onClick={() => affordable && onChoice(choice)}
                  onMouseEnter={() => setHoveredChoice(choice)}
                  onMouseLeave={() => setHoveredChoice(null)}
                  disabled={!affordable}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200 text-left
                    ${affordable
                      ? 'border-stone-600 hover:border-amber-500 bg-stone-800/50 hover:bg-stone-700/50 cursor-pointer'
                      : 'border-stone-700 bg-stone-900/50 opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  {/* Choice text */}
                  <div className="text-white font-medium mb-2">{choice.text}</div>

                  {/* Tags and info */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {choice.tags?.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${TAG_STYLES[tag]?.bg || 'bg-stone-600'} ${TAG_STYLES[tag]?.text || 'text-white'}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {cost > 0 && (
                      <span className={`text-xs ${affordable ? 'text-yellow-400' : 'text-red-400'}`}>
                        {formatMoney(cost)}
                      </span>
                    )}
                    {successRate < 1 && (
                      <span className="text-xs text-stone-400">
                        {Math.round(successRate * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Insufficient funds warning */}
                  {!affordable && (
                    <div className="text-red-400 text-xs mt-2">
                      Insufficient funds
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hovered choice preview */}
          {hoveredChoice && (
            <div className="mt-4 p-3 bg-stone-950/50 rounded-lg border border-stone-700">
              <div className="text-stone-400 text-xs mb-1">Preview:</div>
              <div className="text-stone-300 text-sm italic">
                {hoveredChoice.flavorText || 'Make your choice...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
