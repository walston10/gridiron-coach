/**
 * TexMenu — the Call menu (§3.4).
 *
 * Opens from the Tex phone. Shows the one thing Tex can fix about the play that
 * just happened, its slush-fund cost, the current Heat, and a voice line. Making
 * the call runs the existing bribe economy (theCallSystem) up in the parent;
 * this component is the shady little UX around it.
 */

import React from 'react';

export interface TexOption {
  label: string;
  description: string;
  cost: number;
}

interface TexMenuProps {
  option: TexOption;
  slush: number;
  heat: number;
  onMakeCall: () => void;
  onClose: () => void;
}

export const TexMenu: React.FC<TexMenuProps> = ({ option, slush, heat, onMakeCall, onClose }) => {
  const affordable = slush >= option.cost;
  const heatColor = heat >= 60 ? 'text-red-400' : heat >= 30 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-8">
      <div className="w-full max-w-sm rounded-2xl border-2 border-amber-500/60 bg-gray-950 p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤠</span>
            <span className="text-sm font-black uppercase tracking-widest text-amber-300">Tex</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300" aria-label="Close">
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs italic text-gray-400">“I got a guy in stripes. For a price.”</p>

        <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="text-sm font-black uppercase tracking-wide text-white">{option.label}</div>
          <div className="mt-1 text-xs text-gray-400">{option.description}</div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span className="text-gray-400">
            Slush <span className="font-bold text-emerald-300">${(slush / 1000).toFixed(0)}k</span>
          </span>
          <span className="text-gray-400">
            Heat <span className={`font-bold ${heatColor}`}>{Math.round(heat)}</span>
          </span>
          <span className="text-gray-400">
            Cost <span className="font-bold text-amber-300">${(option.cost / 1000).toFixed(1)}k</span>
          </span>
        </div>

        <button
          type="button"
          disabled={!affordable}
          onClick={onMakeCall}
          className={`mt-3 w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest ${
            affordable
              ? 'bg-amber-600 text-white hover:bg-amber-500'
              : 'cursor-not-allowed bg-gray-800 text-gray-500'
          }`}
        >
          {affordable ? 'Make the call' : 'Slush fund empty'}
        </button>
        <button
          onClick={onClose}
          className="mt-1 w-full py-1 text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300"
        >
          Never mind — play it straight
        </button>
      </div>
    </div>
  );
};

export default TexMenu;
