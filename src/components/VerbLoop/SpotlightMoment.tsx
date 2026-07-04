/**
 * SpotlightMoment — the between-drive consequence of neglect (§3.2).
 *
 * When an ignored star's morale finally cracks, this interrupts the flow with a
 * small personality beat (the tie-in to the events/morale layer) before the
 * next drive begins. Pure flavor + a visible morale readout; tap to move on.
 */

import React from 'react';
import type { SpotlightCard } from '../../engine/spotlightGenerator';
import { moraleHitLine, rarityColor } from './copy';

interface SpotlightMomentProps {
  card: SpotlightCard;
  morale: number;
  onDismiss: () => void;
}

export const SpotlightMoment: React.FC<SpotlightMomentProps> = ({ card, morale, onDismiss }) => {
  const color = rarityColor(card.rarity);
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/85 px-8"
      aria-label="Continue"
    >
      <div className="text-5xl" style={{ filter: `drop-shadow(0 0 12px ${color})` }}>
        😤
      </div>
      <div className="text-center text-lg font-black uppercase tracking-wide text-red-300">
        {card.shortName} is fed up
      </div>
      <p className="max-w-xs text-center text-sm italic text-gray-300">“{moraleHitLine(card)}”</p>

      {/* Morale bar. */}
      <div className="w-48">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
          <span>Morale</span>
          <span className="text-red-400">{Math.round(morale)}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-800">
          <div
            className="h-2 rounded-full bg-red-500 transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, morale))}%` }}
          />
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-gray-600">Tap to continue</div>
    </button>
  );
};

export default SpotlightMoment;
