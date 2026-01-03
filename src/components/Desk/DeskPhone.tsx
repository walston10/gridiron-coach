/**
 * Desk Phone
 *
 * Phone object on the desk. Rings when agent/shady calls come in.
 */

import React from 'react';

interface DeskPhoneProps {
  isRinging?: boolean;
  onClick: () => void;
}

export const DeskPhone: React.FC<DeskPhoneProps> = ({
  isRinging = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={!isRinging}
      className={`
        h-full w-full rounded-lg p-4 flex flex-col items-center justify-center
        transition-all duration-300
        ${isRinging
          ? 'bg-stone-700/80 hover:bg-stone-600/80 cursor-pointer ring-2 ring-amber-400 animate-pulse'
          : 'bg-stone-800/50 cursor-default opacity-60'
        }
      `}
    >
      {/* Phone icon */}
      <div className={`text-4xl mb-2 ${isRinging ? 'animate-bounce' : ''}`}>
        📞
      </div>

      <div className="text-stone-400 text-xs font-medium uppercase tracking-wider">
        Phone
      </div>

      {isRinging && (
        <div className="text-amber-400 text-xs mt-2 animate-pulse">
          INCOMING CALL
        </div>
      )}

      {/* Ring animation circles */}
      {isRinging && (
        <>
          <div className="absolute inset-0 rounded-lg border-2 border-amber-400/50 animate-ping" />
          <div className="absolute inset-2 rounded-lg border border-amber-400/30 animate-ping delay-75" />
        </>
      )}
    </button>
  );
};

export default DeskPhone;
