import React from 'react';
import type { GameState } from '../../types/GameSim';

interface GameHUDProps {
  gameState: GameState | null;
  homeTeam?: string;
  awayTeam?: string;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  homeTeam = 'HOME',
  awayTeam = 'AWAY',
}) => {
  if (!gameState) {
    return (
      <div className="bg-gray-900 text-white p-4 rounded-lg">
        <div className="text-center text-gray-500">Loading game...</div>
      </div>
    );
  }

  const { clock, field, score, phase, lastResult } = gameState;

  // Format clock
  const formatClock = () => {
    const mins = Math.floor(clock.minutes);
    const secs = Math.floor(clock.seconds);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format down and distance
  const formatDownDistance = () => {
    const ordinal = ['1st', '2nd', '3rd', '4th'][field.down - 1] || `${field.down}th`;
    const distance = field.yardsToGo >= 10 && field.yardLine + field.yardsToGo >= 100
      ? 'Goal'
      : field.yardsToGo;
    return `${ordinal} & ${distance}`;
  };

  // Format field position
  const formatFieldPosition = () => {
    if (field.yardLine <= 50) {
      return `Own ${field.yardLine}`;
    } else {
      return `Opp ${100 - field.yardLine}`;
    }
  };

  // Phase display
  const getPhaseDisplay = () => {
    switch (phase) {
      case 'PRE_SNAP': return 'Select Play';
      case 'SNAP': return 'LIVE';
      case 'ACTIVE': return 'LIVE';
      case 'TACKLE': return 'Tackle';
      case 'WHISTLE': return 'Play Over';
      default: return phase;
    }
  };

  const isLive = phase === 'SNAP' || phase === 'ACTIVE';

  return (
    <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
      {/* Scoreboard */}
      <div className="flex justify-between items-center bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-400">{awayTeam}</div>
            <div className="text-2xl font-bold">{score.away}</div>
          </div>
          <div className="text-gray-600">@</div>
          <div className="text-center">
            <div className="text-xs text-gray-400">{homeTeam}</div>
            <div className="text-2xl font-bold">{score.home}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-gray-400">Q{clock.quarter}</div>
          <div className="text-xl font-mono">{formatClock()}</div>
        </div>
      </div>

      {/* Down & Distance */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-gray-700">
        <div>
          <div className="text-lg font-bold text-yellow-400">{formatDownDistance()}</div>
          <div className="text-sm text-gray-400">
            {field.possession === 'home' ? homeTeam : awayTeam} ball at {formatFieldPosition()}
          </div>
        </div>

        <div className={`px-3 py-1 rounded font-bold text-sm ${
          isLive ? 'bg-red-600 animate-pulse' : 'bg-gray-700'
        }`}>
          {getPhaseDisplay()}
        </div>
      </div>

      {/* Play Clock */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800/50">
        <div className="text-sm text-gray-400">Play Clock</div>
        <div className={`text-lg font-mono ${
          clock.playClock <= 10 ? 'text-red-400' : 'text-white'
        }`}>
          {clock.playClock}
        </div>
      </div>

      {/* Last Play Result */}
      {lastResult && phase === 'WHISTLE' && (
        <div className={`px-4 py-2 text-sm ${
          lastResult.touchdown ? 'bg-green-900 text-green-200' :
          lastResult.turnover ? 'bg-red-900 text-red-200' :
          lastResult.incomplete ? 'bg-gray-700 text-gray-300' :
          lastResult.yardsGained > 0 ? 'bg-blue-900 text-blue-200' :
          'bg-orange-900 text-orange-200'
        }`}>
          {lastResult.touchdown && '🏈 TOUCHDOWN!'}
          {lastResult.turnover && `⚠️ ${lastResult.turnoverType}!`}
          {lastResult.incomplete && 'Pass Incomplete'}
          {lastResult.sack && `Sack! Lost ${Math.abs(lastResult.yardsGained)} yards`}
          {!lastResult.touchdown && !lastResult.turnover && !lastResult.incomplete && !lastResult.sack && (
            lastResult.yardsGained >= 0
              ? `Gain of ${lastResult.yardsGained} yards`
              : `Loss of ${Math.abs(lastResult.yardsGained)} yards`
          )}
          {lastResult.outOfBounds && ' (out of bounds)'}
        </div>
      )}
    </div>
  );
};

export default GameHUD;
