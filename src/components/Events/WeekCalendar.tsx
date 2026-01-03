/**
 * Week Calendar Component
 *
 * Shows the current week and day progression.
 * Highlights game day (Sunday) and current day.
 */

import React from 'react';
import type { DayOfWeek } from '../../types/Events';
import { DAYS_IN_ORDER, DAY_DESCRIPTIONS } from '../../types/Events';

interface WeekCalendarProps {
  currentWeek: number;
  currentDay: DayOfWeek;
  totalWeeks?: number;
  onDayClick?: (day: DayOfWeek) => void;
}

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  currentWeek,
  currentDay,
  totalWeeks = 17,
  onDayClick,
}) => {
  const currentDayIndex = DAYS_IN_ORDER.indexOf(currentDay);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Week Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold text-white">
          Week {currentWeek}
          <span className="text-gray-500 text-sm font-normal ml-2">
            of {totalWeeks}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {DAY_DESCRIPTIONS[currentDay]}
        </div>
      </div>

      {/* Day Pills */}
      <div className="flex gap-1">
        {DAYS_IN_ORDER.map((day, index) => {
          const isPast = index < currentDayIndex;
          const isCurrent = day === currentDay;
          const isGameDay = day === 'SUNDAY';

          return (
            <button
              key={day}
              onClick={() => onDayClick?.(day)}
              disabled={!onDayClick}
              className={`
                flex-1 py-2 px-1 rounded text-xs font-medium transition-all
                ${isCurrent
                  ? isGameDay
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-500 text-white'
                  : isPast
                    ? 'bg-gray-700 text-gray-500'
                    : isGameDay
                      ? 'bg-orange-900/50 text-orange-300'
                      : 'bg-gray-700 text-gray-300'
                }
                ${onDayClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
              `}
            >
              <div className="text-center">
                <div>{DAY_SHORT[day]}</div>
                {isGameDay && <div className="text-[10px] mt-0.5">🏈</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Day Description */}
      <div className="mt-4 text-center">
        <span className="text-gray-400 text-sm">
          {currentDay === 'SUNDAY'
            ? 'Game Day - Time to compete!'
            : `${DAY_DESCRIPTIONS[currentDay]} Day`
          }
        </span>
      </div>
    </div>
  );
};

export default WeekCalendar;
