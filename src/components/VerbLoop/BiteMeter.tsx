/**
 * BiteMeter — the play-action loading gauge (§5).
 *
 * Renders as linebacker silhouettes creeping toward the line of scrimmage as
 * Bite climbs: diegetic, on-field, so the player literally watches themselves
 * "load the gun" by pounding the run. At/above the hot threshold it flares and
 * flags the 🔥 pass bonus.
 */

import React from 'react';
import { BITE_CONFIG } from '../../data/verbs';

interface BiteMeterProps {
  bite: number;
  hot: boolean;
}

const DEFENDERS = 3;

export const BiteMeter: React.FC<BiteMeterProps> = ({ bite, hot }) => {
  const frac = Math.max(0, Math.min(1, bite / BITE_CONFIG.MAX));
  const hotFrac = BITE_CONFIG.HOT_THRESHOLD / BITE_CONFIG.MAX;

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Bite
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            hot ? 'text-amber-300' : 'text-gray-500'
          }`}
        >
          {hot ? "🔥 They're biting" : `${Math.round(bite)}`}
        </span>
      </div>

      {/* Field strip: defenders on the left creep toward the LOS on the right. */}
      <div
        className={`relative h-9 rounded-md overflow-hidden border ${
          hot ? 'border-amber-500/70' : 'border-gray-700'
        }`}
        style={{
          background: hot
            ? 'linear-gradient(90deg, rgba(120,53,15,0.5), rgba(180,83,9,0.35))'
            : 'linear-gradient(90deg, rgba(31,41,55,0.9), rgba(17,24,39,0.9))',
        }}
      >
        {/* Line of scrimmage. */}
        <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-white/60" />

        {/* Creeping linebackers. At full bite they crowd the LOS. */}
        {Array.from({ length: DEFENDERS }).map((_, i) => {
          const base = 8 + i * 10; // resting % from the left
          const crept = base + frac * (70 - i * 6); // advance toward the LOS
          return (
            <div
              key={i}
              className="absolute top-1/2 text-sm transition-[left] duration-500 ease-out"
              style={{
                left: `${crept}%`,
                transform: 'translate(-50%, -50%)',
                filter: hot ? 'drop-shadow(0 0 4px rgba(251,191,36,0.9))' : 'none',
              }}
            >
              🛡️
            </div>
          );
        })}

        {/* Hot-threshold notch. */}
        <div
          className="absolute top-0 bottom-0 w-px bg-amber-400/50"
          style={{ left: `${hotFrac * 100}%` }}
        />
      </div>
    </div>
  );
};

export default BiteMeter;
