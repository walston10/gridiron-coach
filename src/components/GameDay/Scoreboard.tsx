import React from 'react';
import type { GameClock, TeamGameState } from '../../types';

interface ScoreboardProps {
  clock: GameClock;
  homeTeam: TeamGameState & { name: string };
  awayTeam: TeamGameState & { name: string };
  possession: 'home' | 'away';
  down?: number;
  yardsToGo?: number;
  yardLine?: number;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  clock,
  homeTeam,
  awayTeam,
  possession,
  down,
  yardsToGo,
  yardLine,
}) => {
  const formatTime = (min: number, sec: number) => {
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getDownSuffix = (d: number) => {
    if (d === 1) return 'ST';
    if (d === 2) return 'ND';
    if (d === 3) return 'RD';
    return 'TH';
  };

  const getYardLineText = (yl: number) => {
    if (yl === 50) return '50';
    if (yl > 50) return `OPP ${100 - yl}`;
    return `OWN ${yl}`;
  };

  // Team colors (could be expanded to use actual team colors)
  const awayColor = 'from-red-600 to-red-800';
  const homeColor = 'from-blue-600 to-blue-800';

  return (
    <div className="w-full">
      {/* Main Broadcast Bar */}
      <div className="relative bg-black/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />

        <div className="flex items-stretch">
          {/* Away Team */}
          <div className={`flex-1 bg-gradient-to-br ${awayColor} p-4 relative`}>
            {/* Possession indicator */}
            {possession === 'away' && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50" />
              </div>
            )}
            <div className="flex items-center justify-between pl-6">
              <div>
                <div className="text-white/70 text-xs font-semibold tracking-wider uppercase">
                  {awayTeam.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white tabular-nums tracking-tight">
                    {awayTeam.score}
                  </span>
                </div>
              </div>
              {/* Timeouts */}
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-6 rounded-sm ${
                      i < awayTeam.timeoutsRemaining
                        ? 'bg-yellow-400'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Center - Clock & Game Info */}
          <div className="bg-slate-900 px-6 py-3 flex flex-col items-center justify-center min-w-[180px] border-x border-white/10">
            {/* Clock */}
            <div className="text-4xl font-black text-white tabular-nums tracking-tight font-mono">
              {formatTime(clock.minutes, clock.seconds)}
            </div>
            {/* Quarter */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-yellow-400 font-bold text-sm">
                {clock.quarter === 1 ? '1ST' : clock.quarter === 2 ? '2ND' : clock.quarter === 3 ? '3RD' : '4TH'} QTR
              </span>
            </div>
            {/* Down & Distance (if provided) */}
            {down && yardsToGo && (
              <div className="mt-2 px-3 py-1 bg-slate-800 rounded-full">
                <span className="text-white font-bold text-sm">
                  {down}{getDownSuffix(down)} & {yardsToGo}
                </span>
                {yardLine && (
                  <span className="text-white/50 text-xs ml-2">
                    {getYardLineText(yardLine)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className={`flex-1 bg-gradient-to-bl ${homeColor} p-4 relative`}>
            {/* Possession indicator */}
            {possession === 'home' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50" />
              </div>
            )}
            <div className="flex items-center justify-between pr-6">
              {/* Timeouts */}
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-6 rounded-sm ${
                      i < homeTeam.timeoutsRemaining
                        ? 'bg-yellow-400'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <div className="text-right">
                <div className="text-white/70 text-xs font-semibold tracking-wider uppercase">
                  {homeTeam.name}
                </div>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-5xl font-black text-white tabular-nums tracking-tight">
                    {homeTeam.score}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
