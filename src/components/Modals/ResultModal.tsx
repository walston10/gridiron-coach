/**
 * Result Modal
 *
 * Shows the result of a choice after the event modal closes.
 * Simple display of meter changes and outcome.
 */

import React from 'react';
import type { ChoiceResult, Meters } from '../../types/Events';

interface ResultModalProps {
  result: ChoiceResult;
  onContinue: () => void;
}

const METER_LABELS: Record<keyof Meters, string> = {
  reputation: 'Reputation',
  culture: 'Culture',
  image: 'Image',
  risk: 'Risk',
  playerTrust: 'Trust',
};

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  onContinue,
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg max-w-md w-full overflow-hidden border border-stone-600/50 shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className={`p-6 text-center ${result.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
          <div className={`text-4xl font-black mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? '✓' : '✗'}
          </div>
          <div className={`text-xl font-bold ${result.success ? 'text-green-300' : 'text-red-300'}`}>
            {result.success ? 'Success' : 'Failed'}
          </div>
        </div>

        {/* Flavor text */}
        <div className="p-6">
          <p className="text-stone-200 text-center italic leading-relaxed">
            "{result.flavorText}"
          </p>
        </div>

        {/* Meter changes */}
        {result.meterChanges && Object.keys(result.meterChanges).length > 0 && (
          <div className="px-6 pb-4">
            <div className="bg-stone-950/50 rounded-lg p-4">
              <div className="text-stone-400 text-xs uppercase tracking-wider mb-3">Changes</div>
              <div className="space-y-2">
                {(Object.entries(result.meterChanges) as [keyof Meters, number][]).map(([meter, value]) => (
                  <div key={meter} className="flex justify-between items-center">
                    <span className="text-stone-400">{METER_LABELS[meter]}</span>
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
          <div className="px-6 pb-4 flex justify-center gap-2">
            <span className="text-stone-400">🔥 Heat:</span>
            <span className={result.heatChange > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
              {result.heatChange > 0 ? '+' : ''}{result.heatChange}
            </span>
          </div>
        )}

        {/* Continue button */}
        <div className="p-6 pt-2">
          <button
            onClick={onContinue}
            className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
