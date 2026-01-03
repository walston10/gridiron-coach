/**
 * Desk Owner Photo
 *
 * Framed photo of the owner on the wall/desk.
 * Shows current mood and can be clicked for status.
 */

import React from 'react';
import type { Owner } from '../../types/Owner';
import { getOwnerMood } from '../../types/Owner';

interface DeskOwnerPhotoProps {
  owner: Owner;
  patience: number;
  hasEvent?: boolean;
  onClick: () => void;
}

const MOOD_STYLES: Record<string, { emoji: string; borderColor: string; bgTint: string }> = {
  Happy: { emoji: '😊', borderColor: 'border-amber-500', bgTint: 'from-amber-900/30' },
  Content: { emoji: '🙂', borderColor: 'border-stone-500', bgTint: 'from-stone-800/30' },
  Neutral: { emoji: '😐', borderColor: 'border-stone-600', bgTint: 'from-stone-900/30' },
  Concerned: { emoji: '😟', borderColor: 'border-orange-600', bgTint: 'from-orange-900/30' },
  Angry: { emoji: '😠', borderColor: 'border-red-600', bgTint: 'from-red-900/30' },
  Furious: { emoji: '🤬', borderColor: 'border-red-700', bgTint: 'from-red-950/50' },
};

const OWNER_COLORS: Record<string, string> = {
  tex: 'bg-amber-800',
  hale: 'bg-slate-700',
  kessler: 'bg-stone-700',
};

export const DeskOwnerPhoto: React.FC<DeskOwnerPhotoProps> = ({
  owner,
  patience,
  hasEvent = false,
  onClick,
}) => {
  const mood = getOwnerMood(patience);
  const moodStyle = MOOD_STYLES[mood] || MOOD_STYLES.Neutral;
  const ownerColor = OWNER_COLORS[owner.id] || 'bg-stone-700';

  return (
    <button
      onClick={onClick}
      className={`
        relative w-24 h-28 rounded-sm overflow-hidden cursor-pointer
        transition-all duration-300 hover:scale-105
        ${hasEvent ? 'animate-pulse ring-2 ring-amber-400' : ''}
      `}
    >
      {/* Frame */}
      <div className={`absolute inset-0 border-4 ${moodStyle.borderColor} rounded-sm`} />

      {/* Photo background */}
      <div className={`absolute inset-1 ${ownerColor} bg-gradient-to-b ${moodStyle.bgTint} to-transparent`}>
        {/* Placeholder portrait */}
        <div className="h-full flex flex-col items-center justify-center p-2">
          {/* Mood emoji */}
          <div className="text-3xl mb-1">{moodStyle.emoji}</div>

          {/* Owner name */}
          <div className="text-white text-xs font-bold text-center leading-tight">
            {owner.name.split(' ')[0]}
          </div>

          {/* Mood label */}
          <div className="text-stone-400 text-[10px] uppercase mt-0.5">
            {mood}
          </div>
        </div>
      </div>

      {/* Event indicator glow */}
      {hasEvent && (
        <div className="absolute inset-0 bg-amber-400/20 animate-pulse" />
      )}

      {/* Cracked frame effect when owner is furious */}
      {patience < 20 && (
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 120">
            <path
              d="M10,0 L15,30 L5,50 L20,80 L10,120"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <path
              d="M90,0 L85,40 L95,70 L80,100 L90,120"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}
    </button>
  );
};

export default DeskOwnerPhoto;
