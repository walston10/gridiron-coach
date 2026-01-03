/**
 * Desk Newspaper
 *
 * Folded newspaper on the desk with dynamic headline.
 */

import React from 'react';

interface DeskNewspaperProps {
  headline: string;
  hasEvent?: boolean;
  onClick: () => void;
}

export const DeskNewspaper: React.FC<DeskNewspaperProps> = ({
  headline,
  hasEvent = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={!hasEvent}
      className={`
        h-full w-full rounded p-3 flex flex-col
        transition-all duration-300
        ${hasEvent
          ? 'bg-stone-100 hover:bg-white cursor-pointer ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
          : 'bg-stone-200/90 cursor-default'
        }
      `}
    >
      {/* Newspaper header */}
      <div className="flex justify-between items-center border-b-2 border-stone-800 pb-1 mb-2">
        <div className="text-stone-800 font-serif text-xs font-bold tracking-widest">
          THE SPORTING TRIBUNE
        </div>
        <div className="text-stone-500 text-[10px] font-serif">
          Est. 1923
        </div>
      </div>

      {/* Main headline */}
      <div className="flex-1 flex items-center justify-center">
        <h2 className="text-stone-900 font-serif font-black text-lg md:text-xl text-center leading-tight px-2">
          {headline}
        </h2>
      </div>

      {/* Fake article lines */}
      <div className="space-y-1 mt-2">
        <div className="h-1.5 bg-stone-400/50 rounded w-full" />
        <div className="h-1.5 bg-stone-400/50 rounded w-11/12" />
        <div className="h-1.5 bg-stone-400/50 rounded w-full" />
        <div className="h-1.5 bg-stone-400/50 rounded w-9/12" />
      </div>

      {/* Breaking news indicator */}
      {hasEvent && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
          BREAKING
        </div>
      )}
    </button>
  );
};

export default DeskNewspaper;
