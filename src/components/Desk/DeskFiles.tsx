/**
 * Desk Files
 *
 * Stack of manila folders on the desk. Opens playbook, scouting, contracts.
 */

import React from 'react';

interface DeskFilesProps {
  onClick: () => void;
}

export const DeskFiles: React.FC<DeskFilesProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="h-full w-full rounded-lg bg-stone-800/50 hover:bg-stone-700/60
                 transition-all duration-300 cursor-pointer p-4 flex flex-col items-center justify-center
                 border border-stone-700/30 hover:border-stone-600/50"
    >
      {/* Stacked folders */}
      <div className="relative w-16 h-12">
        {/* Bottom folder */}
        <div className="absolute bottom-0 left-0 w-14 h-10 bg-amber-700 rounded-t-sm shadow transform -rotate-3">
          <div className="absolute top-0 left-2 w-4 h-2 bg-amber-600 rounded-t-sm" />
        </div>

        {/* Middle folder */}
        <div className="absolute bottom-1 left-1 w-14 h-10 bg-amber-600 rounded-t-sm shadow transform rotate-1">
          <div className="absolute top-0 left-2 w-4 h-2 bg-amber-500 rounded-t-sm" />
        </div>

        {/* Top folder */}
        <div className="absolute bottom-2 left-2 w-14 h-10 bg-amber-500 rounded-t-sm shadow">
          <div className="absolute top-0 left-2 w-4 h-2 bg-amber-400 rounded-t-sm" />
          {/* Label */}
          <div className="absolute top-3 left-2 right-2 h-2 bg-white/80 flex items-center justify-center">
            <span className="text-[6px] text-stone-600 font-bold">PLAYBOOK</span>
          </div>
        </div>
      </div>

      <div className="text-stone-400 text-xs font-medium uppercase tracking-wider mt-3">
        Files
      </div>

      <div className="text-stone-500 text-[10px] mt-1">
        Playbook • Scouting • Contracts
      </div>
    </button>
  );
};

export default DeskFiles;
