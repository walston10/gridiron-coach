/**
 * Desk Door
 *
 * Office door in the background. Visitors enter through here.
 */

import React from 'react';
import type { EventCharacter } from '../../types/Events';

interface DeskDoorProps {
  hasVisitor: boolean;
  visitorType?: EventCharacter;
  onClick: () => void;
}

const VISITOR_INFO: Record<string, { emoji: string; color: string; label: string }> = {
  PLAYER: { emoji: '🏈', color: 'bg-green-600', label: 'PLAYER' },
  REPORTER: { emoji: '📰', color: 'bg-yellow-600', label: 'PRESS' },
  DOCTOR: { emoji: '🩺', color: 'bg-teal-600', label: 'MEDICAL' },
  LEAGUE_REP: { emoji: '⚖️', color: 'bg-red-600', label: 'LEAGUE' },
  AGENT: { emoji: '📱', color: 'bg-blue-600', label: 'AGENT' },
  SHADY_FIGURE: { emoji: '🕶️', color: 'bg-stone-800', label: '???' },
  OWNER: { emoji: '👔', color: 'bg-purple-600', label: 'OWNER' },
};

export const DeskDoor: React.FC<DeskDoorProps> = ({
  hasVisitor,
  visitorType,
  onClick,
}) => {
  const visitorInfo = visitorType ? VISITOR_INFO[visitorType] : null;

  return (
    <button
      onClick={onClick}
      disabled={!hasVisitor}
      className={`
        relative w-32 h-40 rounded-t-lg overflow-hidden
        transition-all duration-300
        ${hasVisitor ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* Door frame */}
      <div className="absolute inset-0 bg-stone-700 rounded-t-lg">
        {/* Door panel */}
        <div
          className={`
            absolute inset-1 rounded-t-sm transition-all duration-500 origin-left
            ${hasVisitor
              ? 'bg-stone-600 -rotate-[25deg] shadow-2xl'
              : 'bg-stone-800'
            }
          `}
        >
          {/* Frosted glass window */}
          <div className="absolute top-4 left-3 right-3 h-16 bg-stone-500/30 rounded">
            {/* Door text */}
            <div className="h-full flex items-center justify-center text-stone-400/50 text-[8px] font-bold">
              {hasVisitor ? '' : 'G.M. OFFICE'}
            </div>
          </div>

          {/* Door handle */}
          <div className="absolute right-2 top-1/2 w-2 h-4 bg-amber-600 rounded" />
        </div>

        {/* Visitor silhouette when door is open */}
        {hasVisitor && visitorInfo && (
          <div className="absolute inset-2 flex flex-col items-center justify-center">
            {/* Character placeholder */}
            <div className={`w-16 h-16 rounded-full ${visitorInfo.color} flex items-center justify-center shadow-lg`}>
              <span className="text-2xl">{visitorInfo.emoji}</span>
            </div>
            <div className="text-white text-xs font-bold mt-2 bg-black/50 px-2 py-0.5 rounded">
              {visitorInfo.label}
            </div>
          </div>
        )}
      </div>

      {/* Knock animation */}
      {hasVisitor && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-amber-400 text-xs font-bold animate-bounce">
            👋 VISITOR
          </div>
        </div>
      )}

      {/* Light spill from open door */}
      {hasVisitor && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent animate-pulse pointer-events-none" />
      )}
    </button>
  );
};

export default DeskDoor;
