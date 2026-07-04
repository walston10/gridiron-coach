/**
 * ResultSlam — beat 5, the aftermath (§2).
 *
 * A big yardage number, the tier stamp (STUFFED / CHUNK / HOUSE CALL…), one
 * line of filthy play-by-play, and the Bite meter delta ticking. Tap to chain
 * straight into the next READ.
 */

import React from 'react';
import type { TierResolution } from '../../engine/tierResolver';
import { tierStamp, playByPlay } from './copy';

interface ResultSlamProps {
  resolution: TierResolution;
  /** Whether this play crossed the goal line. */
  touchdown: boolean;
  /** Whether this play converted a first down. */
  firstDown: boolean;
  /** Bite meter before → after this snap, for the delta readout. */
  biteBefore: number;
  biteAfter: number;
  /** Stable [0,1) roll so the play-by-play line doesn't flicker on re-render. */
  flavorRoll: number;
  /** The concrete play the engine rendered under the verb (emergent flavor). */
  concretePlayName: string;
  /** Set when a Spotlight card was played, e.g. "FEED DEMARCUS". */
  spotlightName?: string;
  onContinue: () => void;
}

export const ResultSlam: React.FC<ResultSlamProps> = ({
  resolution,
  touchdown,
  firstDown,
  biteBefore,
  biteAfter,
  flavorRoll,
  concretePlayName,
  spotlightName,
  onContinue,
}) => {
  const stamp = tierStamp(resolution.tier, touchdown);
  const line = playByPlay(resolution.tier, flavorRoll);
  const biteDelta = Math.round(biteAfter - biteBefore);
  const yards = resolution.yards;
  const yardLabel = resolution.turnover
    ? 'TURNOVER'
    : `${yards >= 0 ? '+' : ''}${yards}`;

  return (
    <button
      type="button"
      onClick={onContinue}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/80 px-6"
      aria-label="Next play"
    >
      {/* Tier stamp. */}
      <div
        className="rounded-lg border-4 px-6 py-2 text-3xl font-black uppercase tracking-wider"
        style={{
          color: stamp.accent,
          backgroundColor: stamp.bg,
          borderColor: stamp.accent,
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          animation: 'vl-slam 420ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {stamp.label}
      </div>

      {/* Big number. */}
      {!touchdown && (
        <div className="flex items-baseline gap-2">
          <span
            className={`text-7xl font-black tabular-nums ${
              resolution.turnover ? 'text-red-400' : yards < 0 ? 'text-orange-400' : 'text-white'
            }`}
          >
            {yardLabel}
          </span>
          {!resolution.turnover && (
            <span className="text-2xl font-bold uppercase text-gray-500">yd</span>
          )}
        </div>
      )}

      {firstDown && !touchdown && !resolution.turnover && (
        <div className="rounded bg-amber-500/20 px-3 py-0.5 text-sm font-black uppercase tracking-widest text-amber-300">
          1st Down
        </div>
      )}

      {spotlightName && (
        <div className="rounded bg-amber-500/20 px-3 py-0.5 text-xs font-black uppercase tracking-widest text-amber-300">
          ⭐ {spotlightName}
        </div>
      )}

      {/* Play-by-play + the concrete play the verb rendered. */}
      <div className="flex flex-col items-center gap-1">
        <p className="max-w-xs text-center text-sm italic text-gray-300">“{line}”</p>
        <span className="text-[10px] uppercase tracking-widest text-gray-600">
          {concretePlayName}
        </span>
      </div>

      {/* Bite delta. */}
      {biteDelta !== 0 && (
        <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Bite{' '}
          <span className={biteDelta > 0 ? 'text-amber-300' : 'text-sky-300'}>
            {biteDelta > 0 ? `+${biteDelta}` : biteDelta}
          </span>{' '}
          → {Math.round(biteAfter)}
        </div>
      )}

      <div className="text-[10px] uppercase tracking-widest text-gray-600">Tap for next play</div>

      <style>{`
        @keyframes vl-slam {
          0% { transform: scale(0.4) rotate(-6deg); opacity: 0; }
          60% { transform: scale(1.12) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </button>
  );
};

export default ResultSlam;
