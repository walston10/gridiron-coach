/**
 * Desk Owner Photo
 *
 * Framed photo of the owner - GTA-style portrait frame.
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

const MOOD_STYLES: Record<string, { emoji: string; frameColor: string; label: string }> = {
  ECSTATIC: { emoji: '😊', frameColor: '#3b82f6', label: 'ECSTATIC' },
  PLEASED: { emoji: '🙂', frameColor: '#22c55e', label: 'PLEASED' },
  NEUTRAL: { emoji: '😐', frameColor: '#eab308', label: 'NEUTRAL' },
  IMPATIENT: { emoji: '😟', frameColor: '#f97316', label: 'IMPATIENT' },
  FURIOUS: { emoji: '🤬', frameColor: '#ef4444', label: 'FURIOUS' },
};

export const DeskOwnerPhoto: React.FC<DeskOwnerPhotoProps> = ({
  owner,
  patience,
  hasEvent = false,
  onClick,
}) => {
  const mood = getOwnerMood(patience);
  const moodStyle = MOOD_STYLES[mood] || MOOD_STYLES.NEUTRAL;

  return (
    <button
      onClick={onClick}
      className={`
        relative w-20 h-24 cursor-pointer
        transition-all duration-300 hover:scale-105
        ${hasEvent ? 'animate-pulse' : ''}
      `}
    >
      {/* Frame */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          background: `linear-gradient(135deg, ${moodStyle.frameColor}40 0%, ${moodStyle.frameColor}80 100%)`,
          boxShadow: `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 ${moodStyle.frameColor}40`,
        }}
      />

      {/* Inner photo area */}
      <div
        className="absolute inset-1 rounded-sm flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #292524 0%, #1c1917 100%)',
        }}
      >
        {/* Mood emoji */}
        <div className="text-2xl mb-1">{moodStyle.emoji}</div>

        {/* Owner name */}
        <div className="text-white text-xs font-black tracking-tight">
          {owner.name.split(' ')[0]}
        </div>

        {/* Mood label */}
        <div
          className="text-[9px] font-bold uppercase mt-0.5"
          style={{ color: moodStyle.frameColor }}
        >
          {moodStyle.label}
        </div>
      </div>

      {/* Event glow */}
      {hasEvent && (
        <div
          className="absolute -inset-1 rounded-sm animate-pulse pointer-events-none"
          style={{
            boxShadow: `0 0 20px ${moodStyle.frameColor}60`,
          }}
        />
      )}

      {/* Cracked frame when furious */}
      {patience < 20 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm">
          <svg className="w-full h-full opacity-50" viewBox="0 0 80 96">
            <path
              d="M8,0 L12,24 L4,40 L16,64 L8,96"
              fill="none"
              stroke="rgba(255,100,100,0.6)"
              strokeWidth="1"
            />
            <path
              d="M72,0 L68,32 L76,56 L64,80 L72,96"
              fill="none"
              stroke="rgba(255,100,100,0.6)"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}
    </button>
  );
};

export default DeskOwnerPhoto;
