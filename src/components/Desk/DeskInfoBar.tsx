/**
 * Desk Info Bar
 *
 * Displays current week/day, team record, and slush fund.
 * Positioned in top-right corner of desk view.
 */

import React from 'react';
import type { DayOfWeek } from '../../types/Events';
import { DAY_DESCRIPTIONS } from '../../types/Events';

interface DeskInfoBarProps {
  week: number;
  day: DayOfWeek;
  teamName: string;
  record: { wins: number; losses: number };
  slushFund: number;
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `$${Math.floor(amount / 1_000)}K`;
  }
  return `$${amount}`;
}

export const DeskInfoBar: React.FC<DeskInfoBarProps> = ({
  week,
  day,
  teamName,
  record,
  slushFund,
}) => {
  return (
    <div className="flex flex-col items-end gap-1 text-right">
      {/* Week and Day */}
      <div className="text-amber-200/80 text-sm font-medium tracking-wide">
        WEEK {week} — {DAY_DESCRIPTIONS[day].toUpperCase()}
      </div>

      {/* Team and Record */}
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-lg">{teamName}</span>
        <span className="text-stone-400 font-mono">
          {record.wins}-{record.losses}
        </span>
      </div>

      {/* Slush Fund */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-stone-500 text-xs">SLUSH FUND</span>
        <span className="text-emerald-400 font-bold font-mono">
          {formatMoney(slushFund)}
        </span>
      </div>
    </div>
  );
};

export default DeskInfoBar;
