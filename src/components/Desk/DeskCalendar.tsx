/**
 * Desk Calendar
 *
 * Dark-themed day planner showing current week/day.
 * GTA-style with neon accents.
 */

import React from 'react';
import type { DayOfWeek } from '../../types/Events';
import { DAYS_IN_ORDER } from '../../types/Events';

interface DeskCalendarProps {
  currentWeek: number;
  currentDay: DayOfWeek;
  isGameDay: boolean;
  onAdvance?: () => void;
}

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'M',
  TUESDAY: 'T',
  WEDNESDAY: 'W',
  THURSDAY: 'T',
  FRIDAY: 'F',
  SATURDAY: 'S',
  SUNDAY: 'S',
};

export const DeskCalendar: React.FC<DeskCalendarProps> = ({
  currentWeek,
  currentDay,
  isGameDay,
  onAdvance,
}) => {
  const currentDayIndex = DAYS_IN_ORDER.indexOf(currentDay);

  return (
    <div
      className="rounded-sm p-4 flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-amber-500 font-black text-lg tracking-tight">
          WEEK {currentWeek}
        </div>
        <div
          className={`text-xs font-bold px-2 py-1 rounded-sm ${
            isGameDay
              ? 'bg-orange-500 text-white'
              : 'bg-stone-800 text-stone-400'
          }`}
        >
          {currentDay}
        </div>
      </div>

      {/* Week grid */}
      <div className="flex gap-1 mb-4">
        {DAYS_IN_ORDER.map((day, index) => {
          const isPast = index < currentDayIndex;
          const isCurrent = day === currentDay;
          const isSunday = day === 'SUNDAY';

          return (
            <div
              key={day}
              className={`
                flex-1 aspect-square rounded-sm flex items-center justify-center
                text-xs font-bold transition-all
                ${
                  isCurrent
                    ? isSunday
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                    : isPast
                    ? 'bg-stone-800/50 text-stone-600'
                    : isSunday
                    ? 'bg-orange-950 text-orange-500 border border-orange-800/50'
                    : 'bg-stone-800 text-stone-500'
                }
              `}
            >
              {DAY_SHORT[day]}
            </div>
          );
        })}
      </div>

      {/* Action button */}
      <button
        onClick={onAdvance}
        disabled={!onAdvance}
        className={`
          py-3 rounded-sm font-black text-sm uppercase tracking-wider
          transition-all duration-200 relative overflow-hidden
          ${
            isGameDay
              ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
          }
          ${!onAdvance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
        `}
      >
        {isGameDay ? 'GAME DAY' : 'NEXT DAY'}
      </button>
    </div>
  );
};

export default DeskCalendar;
