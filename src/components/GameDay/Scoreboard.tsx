import React from 'react';
import type { GameClock, TeamGameState } from '../../types';

interface ScoreboardProps {
  clock: GameClock;
  homeTeam: TeamGameState & { name: string };
  awayTeam: TeamGameState & { name: string };
  possession: 'home' | 'away';
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  clock,
  homeTeam,
  awayTeam,
  possession,
}) => {
  const formatTime = (min: number, sec: number) => {
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div className={`flex-1 text-center ${possession === 'away' ? 'text-yellow-400' : 'text-white'}`}>
          <div className="text-sm text-gray-400">{awayTeam.name}</div>
          <div className="text-4xl font-bold">{awayTeam.score}</div>
          <div className="text-xs text-gray-500">TO: {awayTeam.timeoutsRemaining}</div>
        </div>

        <div className="px-6 text-center">
          <div className="text-2xl font-mono text-white">
            {formatTime(clock.minutes, clock.seconds)}
          </div>
          <div className="text-sm text-gray-400">Q{clock.quarter}</div>
        </div>

        <div className={`flex-1 text-center ${possession === 'home' ? 'text-yellow-400' : 'text-white'}`}>
          <div className="text-sm text-gray-400">{homeTeam.name}</div>
          <div className="text-4xl font-bold">{homeTeam.score}</div>
          <div className="text-xs text-gray-500">TO: {homeTeam.timeoutsRemaining}</div>
        </div>
      </div>
    </div>
  );
};