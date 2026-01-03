/**
 * Desk Computer
 *
 * Computer monitor on the desk. Opens roster, schedule, standings.
 */

import React from 'react';

interface DeskComputerProps {
  hasNotification?: boolean;
  onClick: () => void;
}

export const DeskComputer: React.FC<DeskComputerProps> = ({
  hasNotification = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="h-full w-full rounded-lg bg-stone-800/50 hover:bg-stone-700/60
                 transition-all duration-300 cursor-pointer p-4 flex flex-col items-center justify-center
                 border border-stone-700/30 hover:border-stone-600/50"
    >
      {/* Monitor frame */}
      <div className="relative bg-stone-900 rounded-t-lg p-2 w-full max-w-[120px]">
        {/* Screen */}
        <div className="bg-gradient-to-b from-blue-950 to-blue-900 rounded aspect-[4/3] flex items-center justify-center">
          {/* Screen content */}
          <div className="text-blue-400/60 text-xs font-mono">
            <div className="animate-pulse">█</div>
          </div>

          {/* Notification badge */}
          {hasNotification && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Monitor stand */}
      <div className="w-4 h-2 bg-stone-700" />
      <div className="w-12 h-1 bg-stone-700 rounded-b" />

      <div className="text-stone-400 text-xs font-medium uppercase tracking-wider mt-3">
        Computer
      </div>

      <div className="text-stone-500 text-[10px] mt-1">
        Roster • Schedule • Standings
      </div>
    </button>
  );
};

export default DeskComputer;
