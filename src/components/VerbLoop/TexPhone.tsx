/**
 * TexPhone — the dirty layer, relocated (§3.4).
 *
 * Dirty plays no longer compete for hand space. Tex is a phone in the corner
 * that glows on eligible moments (a result Tex could "fix" — your turnover,
 * their touchdown, a big gain you gave up). Tapping it opens the Call menu,
 * which drives the existing bribe economy (theCallSystem). Idle/dim when there's
 * nothing to fix or the refs are too hot to take the call.
 */

import React from 'react';

interface TexPhoneProps {
  /** Glows + is tappable when a call is available for the current result. */
  eligible: boolean;
  onOpen: () => void;
}

export const TexPhone: React.FC<TexPhoneProps> = ({ eligible, onOpen }) => (
  <button
    type="button"
    onClick={eligible ? onOpen : undefined}
    aria-label="Call Tex"
    className={`absolute bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl transition-all ${
      eligible
        ? 'border-amber-400 bg-amber-950/80 cursor-pointer'
        : 'border-gray-700 bg-gray-900/70 opacity-50 cursor-default'
    }`}
    style={eligible ? { animation: 'tex-ring 1.1s ease-in-out infinite' } : undefined}
  >
    📞
    {eligible && (
      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
        !
      </span>
    )}
    <style>{`
      @keyframes tex-ring {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.55); transform: scale(1); }
        50% { box-shadow: 0 0 0 10px rgba(251,191,36,0); transform: scale(1.06); }
      }
    `}</style>
  </button>
);

export default TexPhone;
