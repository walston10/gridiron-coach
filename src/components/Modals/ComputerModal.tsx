/**
 * Computer Modal
 *
 * Tabbed interface for: Roster, Schedule, Standings
 */

import React, { useState } from 'react';

interface ComputerModalProps {
  onClose: () => void;
}

type Tab = 'roster' | 'schedule' | 'standings';

export const ComputerModal: React.FC<ComputerModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('roster');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 rounded-lg max-w-4xl w-full h-[80vh] overflow-hidden border border-stone-600/50 shadow-2xl flex flex-col">
        {/* Monitor bezel */}
        <div className="bg-stone-800 p-2 rounded-t-lg flex justify-between items-center">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="text-stone-400 text-xs font-mono">TEAM MANAGEMENT SYSTEM v2.4</div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div className="bg-stone-800/50 border-b border-stone-700 flex">
          {(['roster', 'schedule', 'standings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-stone-900 text-blue-400 border-b-2 border-blue-400'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6 bg-gradient-to-b from-stone-900 to-stone-950">
          {activeTab === 'roster' && <RosterTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'standings' && <StandingsTab />}
        </div>
      </div>
    </div>
  );
};

// Roster Tab - Placeholder
const RosterTab: React.FC = () => {
  const offensePlayers = [
    { pos: 'QB', name: 'Marcus Williams', ovr: 82, status: 'HEALTHY' },
    { pos: 'RB', name: 'Darius Jackson', ovr: 78, status: 'HEALTHY' },
    { pos: 'WR1', name: 'Terrell Moore', ovr: 85, status: 'UNHAPPY' },
    { pos: 'WR2', name: 'Chris Adams', ovr: 74, status: 'HEALTHY' },
    { pos: 'FLEX', name: 'Jordan Bell', ovr: 76, status: 'HEALTHY' },
  ];

  const defensePlayers = [
    { pos: 'CB1', name: 'Devon Harris', ovr: 80, status: 'HEALTHY' },
    { pos: 'CB2', name: 'Marcus Thompson', ovr: 75, status: 'HEALTHY' },
    { pos: 'S', name: 'Andre Williams', ovr: 79, status: 'HEALTHY' },
    { pos: 'LB1', name: 'James Carter', ovr: 84, status: 'HEALTHY' },
    { pos: 'LB2', name: 'Tony Mitchell', ovr: 77, status: 'INJURED' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-400';
      case 'UNHAPPY': return 'text-yellow-400';
      case 'INJURED': return 'text-red-400';
      default: return 'text-stone-400';
    }
  };

  const getOvrColor = (ovr: number) => {
    if (ovr >= 85) return 'text-green-400';
    if (ovr >= 75) return 'text-blue-400';
    if (ovr >= 65) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Offense */}
      <div>
        <h3 className="text-amber-400 font-bold text-lg mb-4 flex items-center gap-2">
          <span>🏈</span> OFFENSE
        </h3>
        <div className="space-y-2">
          {offensePlayers.map((player) => (
            <div key={player.pos} className="bg-stone-800/50 rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-stone-500 font-mono text-sm w-10">{player.pos}</span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`${getStatusColor(player.status)} text-xs`}>{player.status}</span>
                <span className={`${getOvrColor(player.ovr)} font-bold text-lg`}>{player.ovr}</span>
              </div>
            </div>
          ))}
          {/* O-Line Unit */}
          <div className="bg-stone-700/50 rounded p-3 flex items-center justify-between border border-stone-600">
            <div className="flex items-center gap-3">
              <span className="text-stone-400 font-mono text-sm">O-LINE</span>
              <span className="text-stone-300 font-medium">Offensive Line Unit</span>
            </div>
            <span className="text-blue-400 font-bold text-lg">76</span>
          </div>
        </div>
      </div>

      {/* Defense */}
      <div>
        <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
          <span>🛡️</span> DEFENSE
        </h3>
        <div className="space-y-2">
          {defensePlayers.map((player) => (
            <div key={player.pos} className="bg-stone-800/50 rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-stone-500 font-mono text-sm w-10">{player.pos}</span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`${getStatusColor(player.status)} text-xs`}>{player.status}</span>
                <span className={`${getOvrColor(player.ovr)} font-bold text-lg`}>{player.ovr}</span>
              </div>
            </div>
          ))}
          {/* D-Line Unit */}
          <div className="bg-stone-700/50 rounded p-3 flex items-center justify-between border border-stone-600">
            <div className="flex items-center gap-3">
              <span className="text-stone-400 font-mono text-sm">D-LINE</span>
              <span className="text-stone-300 font-medium">Defensive Line Unit</span>
            </div>
            <span className="text-blue-400 font-bold text-lg">74</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Schedule Tab - Placeholder
const ScheduleTab: React.FC = () => {
  const schedule = [
    { week: 1, opponent: 'Titans', home: true, result: 'W', score: '24-17' },
    { week: 2, opponent: 'Eagles', home: false, result: 'W', score: '31-28' },
    { week: 3, opponent: 'Bears', home: true, result: 'L', score: '14-21' },
    { week: 4, opponent: 'Vikings', home: false, result: null, score: null },
    { week: 5, opponent: 'Cowboys', home: true, result: null, score: null },
    { week: 6, opponent: 'Giants', home: false, result: null, score: null },
    { week: 7, opponent: 'Packers', home: true, result: null, score: null },
    { week: 8, opponent: 'Lions', home: false, result: null, score: null },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-white font-bold text-lg mb-4">8-GAME SEASON</h3>
      <div className="space-y-2">
        {schedule.map((game) => (
          <div
            key={game.week}
            className={`rounded p-4 flex items-center justify-between ${
              game.result
                ? game.result === 'W'
                  ? 'bg-green-900/30 border border-green-700/50'
                  : 'bg-red-900/30 border border-red-700/50'
                : 'bg-stone-800/50 border border-stone-700/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-stone-500 font-mono w-16">WEEK {game.week}</span>
              <span className="text-stone-400 text-sm">{game.home ? 'vs' : '@'}</span>
              <span className="text-white font-medium">{game.opponent}</span>
            </div>
            <div className="text-right">
              {game.result ? (
                <div className="flex items-center gap-3">
                  <span className={game.result === 'W' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                    {game.result}
                  </span>
                  <span className="text-stone-300 font-mono">{game.score}</span>
                </div>
              ) : (
                <span className="text-stone-500 text-sm">UPCOMING</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Standings Tab - Placeholder
const StandingsTab: React.FC = () => {
  const standings = [
    { rank: 1, team: 'Moles', wins: 2, losses: 1, pf: 69, pa: 66, isPlayer: true },
    { rank: 2, team: 'Eagles', wins: 2, losses: 1, pf: 72, pa: 58, isPlayer: false },
    { rank: 3, team: 'Cowboys', wins: 2, losses: 1, pf: 65, pa: 62, isPlayer: false },
    { rank: 4, team: 'Packers', wins: 1, losses: 2, pf: 58, pa: 71, isPlayer: false },
    { rank: 5, team: 'Bears', wins: 1, losses: 2, pf: 54, pa: 60, isPlayer: false },
    { rank: 6, team: 'Vikings', wins: 1, losses: 2, pf: 48, pa: 55, isPlayer: false },
    { rank: 7, team: 'Giants', wins: 0, losses: 3, pf: 42, pa: 78, isPlayer: false },
    { rank: 8, team: 'Lions', wins: 0, losses: 3, pf: 38, pa: 68, isPlayer: false },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-white font-bold text-lg mb-4">LEAGUE STANDINGS</h3>
      <div className="bg-stone-800/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 p-3 bg-stone-700/50 text-stone-400 text-xs uppercase tracking-wider font-bold">
          <div>#</div>
          <div className="col-span-2">Team</div>
          <div className="text-center">Record</div>
          <div className="text-center">PF</div>
          <div className="text-center">PA</div>
        </div>
        {/* Rows */}
        {standings.map((team) => (
          <div
            key={team.team}
            className={`grid grid-cols-6 gap-4 p-3 border-b border-stone-700/50 ${
              team.isPlayer ? 'bg-amber-900/20' : ''
            }`}
          >
            <div className="text-stone-500 font-mono">{team.rank}</div>
            <div className={`col-span-2 font-medium ${team.isPlayer ? 'text-amber-400' : 'text-white'}`}>
              {team.team}
              {team.isPlayer && <span className="text-xs ml-2 text-stone-500">YOU</span>}
            </div>
            <div className="text-center text-white font-mono">{team.wins}-{team.losses}</div>
            <div className="text-center text-stone-400 font-mono">{team.pf}</div>
            <div className="text-center text-stone-400 font-mono">{team.pa}</div>
          </div>
        ))}
      </div>

      {/* Playoff info */}
      <div className="mt-4 text-center text-stone-500 text-sm">
        Top 4 teams make playoffs
      </div>
    </div>
  );
};

export default ComputerModal;
