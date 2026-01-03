/**
 * Desk Whiskey
 *
 * Stress indicator - whiskey glass fills up based on chaos level.
 */

import React from 'react';

interface DeskWhiskeyProps {
  fillLevel: number; // 0-100
}

export const DeskWhiskey: React.FC<DeskWhiskeyProps> = ({ fillLevel }) => {
  // Clamp between 0 and 100
  const level = Math.max(0, Math.min(100, fillLevel));

  // Get stress description
  const getStressText = () => {
    if (level < 20) return 'Smooth sailing';
    if (level < 40) return 'Getting interesting';
    if (level < 60) return 'Feeling the heat';
    if (level < 80) return 'Things are tense';
    return 'Everything\'s on fire';
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-2">
      {/* Glass container */}
      <div className="relative w-12 h-16">
        {/* Glass shape */}
        <div className="absolute inset-0 bg-stone-700/30 rounded-b-lg border-2 border-stone-500/30 overflow-hidden">
          {/* Liquid */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700 to-amber-500 transition-all duration-500"
            style={{ height: `${level}%` }}
          >
            {/* Liquid surface reflection */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-300/40" />
          </div>

          {/* Ice cubes (when nearly empty) */}
          {level < 30 && (
            <>
              <div className="absolute bottom-1 left-2 w-2 h-2 bg-white/30 rounded-sm transform rotate-12" />
              <div className="absolute bottom-2 right-2 w-2 h-1.5 bg-white/20 rounded-sm transform -rotate-6" />
            </>
          )}
        </div>

        {/* Glass rim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-stone-400/50 rounded-t" />
      </div>

      {/* Label */}
      <div className="text-stone-500 text-[10px] mt-2 text-center">
        🥃 STRESS
      </div>

      {/* Stress level text */}
      <div className={`text-[9px] mt-1 text-center ${
        level < 40 ? 'text-stone-500' :
        level < 70 ? 'text-orange-400' :
        'text-red-400'
      }`}>
        {getStressText()}
      </div>
    </div>
  );
};

export default DeskWhiskey;
