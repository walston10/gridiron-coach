/**
 * Desk Calendar
 *
 * Day planner on the desk showing current week/day.
 * Has advance button to move to next day.
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

const DAY_FULL: Record<DayOfWeek, string> = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
};

export const DeskCalendar: React.FC<DeskCalendarProps> = ({
  currentWeek,
  currentDay,
  isGameDay,
  onAdvance,
}) => {
  const currentDayIndex = DAYS_IN_ORDER.indexOf(currentDay);

  return (
    <div className="h-full bg-white rounded shadow-lg p-3 flex flex-col">
      {/* Calendar header */}
      <div className="flex justify-between items-center border-b border-stone-200 pb-2 mb-2">
        <div className="text-stone-800 font-bold text-sm">
          WEEK {currentWeek}
        </div>
        <div className={`text-xs font-bold px-2 py-0.5 rounded ${
          isGameDay ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-600'
        }`}>
          {DAY_FULL[currentDay]}
        </div>
      </div>

      {/* Week grid */}
      <div className="flex gap-1 mb-3">
        {DAYS_IN_ORDER.map((day, index) => {
          const isPast = index < currentDayIndex;
          const isCurrent = day === currentDay;
          const isSunday = day === 'SUNDAY';

          return (
            <div
              key={day}
              className={`
                flex-1 aspect-square rounded-sm flex items-center justify-center text-xs font-bold
                ${isCurrent
                  ? isSunday
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-500 text-white'
                  : isPast
                    ? 'bg-stone-300 text-stone-500 line-through'
                    : isSunday
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-stone-100 text-stone-600'
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
          flex-1 rounded font-bold text-sm uppercase tracking-wider
          transition-all duration-200
          ${isGameDay
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30'
          }
          ${!onAdvance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-center gap-2">
          {isGameDay ? (
            <>
              <span>🏈</span>
              <span>GAME DAY</span>
            </>
          ) : (
            <>
              <span>NEXT DAY</span>
              <span>→</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
};

export default DeskCalendar;
