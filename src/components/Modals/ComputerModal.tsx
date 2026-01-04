/**
 * Computer Modal
 *
 * Tabbed interface for: Roster, Schedule, Standings
 */

import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { Player } from '../../types';

interface ComputerModalProps {
  onClose: () => void;
}

type Tab = 'roster' | 'schedule' | 'standings';

// Helper to get best player at a position from roster
function getStarterAtPosition(roster: Player[], position: string): Player | undefined {
  const candidates = roster.filter(p => p.position === position);
  if (candidates.length === 0) return undefined;
  // Return highest overall
  return candidates.sort((a, b) => b.overall - a.overall)[0];
}

// Helper to get backups at a position
function getBackupsAtPosition(roster: Player[], position: string, limit: number = 2): Player[] {
  const candidates = roster.filter(p => p.position === position);
  if (candidates.length <= 1) return [];
  // Sort by overall, skip starter, return backups
  return candidates.sort((a, b) => b.overall - a.overall).slice(1, limit + 1);
}

export const ComputerModal: React.FC<ComputerModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const { teams, userTeamId } = useGameStore();

  const userTeam = teams.find(t => t.info.id === userTeamId);
  const roster = userTeam?.roster || [];

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
          {activeTab === 'roster' && <RosterTab roster={roster} />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'standings' && <StandingsTab />}
        </div>
      </div>
    </div>
  );
};

// Roster Tab - Uses real roster data
interface RosterTabProps {
  roster: Player[];
}

const RosterTab: React.FC<RosterTabProps> = ({ roster }) => {
  // Build starters from actual roster
  const qb = getStarterAtPosition(roster, 'QB');
  const rb = getStarterAtPosition(roster, 'RB');
  const wr1 = getStarterAtPosition(roster, 'WR');
  const wrs = roster.filter(p => p.position === 'WR').sort((a, b) => b.overall - a.overall);
  const wr2 = wrs[1];
  const te = getStarterAtPosition(roster, 'TE');

  const cb1 = getStarterAtPosition(roster, 'CB');
  const cbs = roster.filter(p => p.position === 'CB').sort((a, b) => b.overall - a.overall);
  const cb2 = cbs[1];
  const safety = getStarterAtPosition(roster, 'FS') || getStarterAtPosition(roster, 'SS');
  const lb1 = getStarterAtPosition(roster, 'MLB') || getStarterAtPosition(roster, 'OLB');
  const lbs = roster.filter(p => ['MLB', 'OLB', 'ILB'].includes(p.position)).sort((a, b) => b.overall - a.overall);
  const lb2 = lbs[1];

  // Calculate O-LINE and D-LINE averages
  const oLinemen = roster.filter(p => ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.position));
  const oLineAvg = oLinemen.length > 0
    ? Math.round(oLinemen.reduce((sum, p) => sum + p.overall, 0) / oLinemen.length)
    : 70;

  const dLinemen = roster.filter(p => ['DE', 'DT', 'NT'].includes(p.position));
  const dLineAvg = dLinemen.length > 0
    ? Math.round(dLinemen.reduce((sum, p) => sum + p.overall, 0) / dLinemen.length)
    : 70;

  const formatPlayer = (player: Player | undefined, pos: string) => {
    if (!player) return { pos, name: 'Empty', ovr: 0, status: 'HEALTHY' };
    return {
      pos,
      name: `${player.firstName} ${player.lastName}`,
      ovr: player.overall,
      status: player.injuryStatus ? 'INJURED' : 'HEALTHY',
    };
  };

  const offensePlayers = [
    formatPlayer(qb, 'QB'),
    formatPlayer(rb, 'RB'),
    formatPlayer(wr1, 'WR1'),
    formatPlayer(wr2, 'WR2'),
    formatPlayer(te, 'FLEX'),
  ];

  const defensePlayers = [
    formatPlayer(cb1, 'CB1'),
    formatPlayer(cb2, 'CB2'),
    formatPlayer(safety, 'S'),
    formatPlayer(lb1, 'LB1'),
    formatPlayer(lb2, 'LB2'),
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
            <span className={`${getOvrColor(oLineAvg)} font-bold text-lg`}>{oLineAvg}</span>
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
            <span className={`${getOvrColor(dLineAvg)} font-bold text-lg`}>{dLineAvg}</span>
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
