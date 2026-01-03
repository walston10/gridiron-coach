/**
 * Files Modal
 *
 * Tabbed interface for: Playbook, Scouting, Contracts
 */

import React, { useState } from 'react';

interface FilesModalProps {
  onClose: () => void;
}

type Tab = 'playbook' | 'scouting' | 'contracts';

export const FilesModal: React.FC<FilesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('playbook');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 rounded-lg max-w-3xl w-full h-[70vh] overflow-hidden border border-stone-600/50 shadow-2xl flex flex-col">
        {/* File cabinet header */}
        <div className="bg-amber-800 p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📁</span>
            <span className="text-amber-100 font-bold">TEAM FILES</span>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div className="bg-amber-900/30 border-b border-amber-800/50 flex">
          {(['playbook', 'scouting', 'contracts'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-stone-900 text-amber-400 border-b-2 border-amber-400'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6 bg-gradient-to-b from-stone-900 to-stone-950">
          {activeTab === 'playbook' && <PlaybookTab />}
          {activeTab === 'scouting' && <ScoutingTab />}
          {activeTab === 'contracts' && <ContractsTab />}
        </div>
      </div>
    </div>
  );
};

// Playbook Tab - Placeholder
const PlaybookTab: React.FC = () => {
  const plays = [
    { name: 'HB Dive', type: 'RUN', success: 65 },
    { name: 'PA Crossers', type: 'PASS', success: 72 },
    { name: 'Slants', type: 'PASS', success: 68 },
    { name: 'Power O', type: 'RUN', success: 58 },
    { name: 'Four Verticals', type: 'PASS', success: 45 },
    { name: 'Screen Left', type: 'PASS', success: 61 },
    { name: 'QB Draw', type: 'RUN', success: 52 },
    { name: 'Corner Route', type: 'PASS', success: 55 },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">OFFENSIVE PLAYS</h3>
        <span className="text-stone-500 text-sm">{plays.length} plays</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {plays.map((play) => (
          <div
            key={play.name}
            className="bg-stone-800/50 rounded p-4 border border-stone-700/50 hover:border-stone-600 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-white font-medium">{play.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                play.type === 'RUN' ? 'bg-orange-600/50 text-orange-200' : 'bg-blue-600/50 text-blue-200'
              }`}>
                {play.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    play.success >= 65 ? 'bg-green-500' :
                    play.success >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${play.success}%` }}
                />
              </div>
              <span className="text-stone-400 text-sm font-mono">{play.success}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-stone-500 text-sm">
        Click a play to view diagram (coming soon)
      </div>
    </div>
  );
};

// Scouting Tab - Placeholder
const ScoutingTab: React.FC = () => {
  const opponent = {
    name: 'Vikings',
    record: '1-2',
    offenseRank: 5,
    defenseRank: 3,
    tendencies: {
      runPercent: 45,
      passPercent: 55,
      blitzPercent: 35,
    },
    keyPlayers: [
      { name: 'Justin Fields', pos: 'QB', threat: 'HIGH' },
      { name: 'Dalvin Cook', pos: 'RB', threat: 'MEDIUM' },
      { name: 'Harrison Smith', pos: 'S', threat: 'HIGH' },
    ],
    notes: 'Strong defensive secondary. Blitzes frequently on third down. Weak run defense up the middle.',
  };

  return (
    <div className="max-w-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-white font-bold text-xl">WEEK 4 OPPONENT</h3>
          <div className="text-stone-400">@ {opponent.name} ({opponent.record})</div>
        </div>
        <div className="text-4xl">🦅</div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-stone-800/50 rounded p-4 text-center">
          <div className="text-stone-400 text-xs uppercase mb-1">Offense Rank</div>
          <div className="text-2xl font-bold text-orange-400">#{opponent.offenseRank}</div>
        </div>
        <div className="bg-stone-800/50 rounded p-4 text-center">
          <div className="text-stone-400 text-xs uppercase mb-1">Defense Rank</div>
          <div className="text-2xl font-bold text-blue-400">#{opponent.defenseRank}</div>
        </div>
      </div>

      {/* Tendencies */}
      <div className="bg-stone-800/50 rounded p-4 mb-6">
        <div className="text-stone-400 text-xs uppercase mb-3">Tendencies</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-stone-400 w-16 text-sm">Run</span>
            <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${opponent.tendencies.runPercent}%` }} />
            </div>
            <span className="text-white font-mono text-sm">{opponent.tendencies.runPercent}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-stone-400 w-16 text-sm">Pass</span>
            <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${opponent.tendencies.passPercent}%` }} />
            </div>
            <span className="text-white font-mono text-sm">{opponent.tendencies.passPercent}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-stone-400 w-16 text-sm">Blitz</span>
            <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${opponent.tendencies.blitzPercent}%` }} />
            </div>
            <span className="text-white font-mono text-sm">{opponent.tendencies.blitzPercent}%</span>
          </div>
        </div>
      </div>

      {/* Key Players */}
      <div className="bg-stone-800/50 rounded p-4 mb-6">
        <div className="text-stone-400 text-xs uppercase mb-3">Key Players to Watch</div>
        <div className="space-y-2">
          {opponent.keyPlayers.map((player) => (
            <div key={player.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-mono text-sm">{player.pos}</span>
                <span className="text-white">{player.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                player.threat === 'HIGH' ? 'bg-red-600/50 text-red-200' : 'bg-yellow-600/50 text-yellow-200'
              }`}>
                {player.threat}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-amber-900/20 border border-amber-700/50 rounded p-4">
        <div className="text-amber-400 text-xs uppercase mb-2">📝 Scout Notes</div>
        <p className="text-stone-300 text-sm leading-relaxed">{opponent.notes}</p>
      </div>
    </div>
  );
};

// Contracts Tab - Placeholder
const ContractsTab: React.FC = () => {
  const contracts = [
    { name: 'James Carter', pos: 'LB1', salary: 4500000, years: 3 },
    { name: 'Terrell Moore', pos: 'WR1', salary: 3800000, years: 2 },
    { name: 'Marcus Williams', pos: 'QB', salary: 3200000, years: 4 },
    { name: 'Devon Harris', pos: 'CB1', salary: 2800000, years: 2 },
    { name: 'Andre Williams', pos: 'S', salary: 2400000, years: 3 },
    { name: 'Darius Jackson', pos: 'RB', salary: 1800000, years: 1 },
  ];

  const formatSalary = (amount: number) => {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  };

  const totalSalary = contracts.reduce((sum, c) => sum + c.salary, 0);
  const capSpace = 50_000_000;
  const slushFund = 2_400_000;

  return (
    <div className="max-w-xl">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-stone-800/50 rounded p-4 text-center">
          <div className="text-stone-400 text-xs uppercase mb-1">Total Payroll</div>
          <div className="text-xl font-bold text-white">{formatSalary(totalSalary)}</div>
        </div>
        <div className="bg-stone-800/50 rounded p-4 text-center">
          <div className="text-stone-400 text-xs uppercase mb-1">Cap Space</div>
          <div className="text-xl font-bold text-green-400">{formatSalary(capSpace - totalSalary)}</div>
        </div>
        <div className="bg-stone-800/50 rounded p-4 text-center">
          <div className="text-stone-400 text-xs uppercase mb-1">Slush Fund</div>
          <div className="text-xl font-bold text-emerald-400">{formatSalary(slushFund)}</div>
        </div>
      </div>

      {/* Contract list */}
      <div className="bg-stone-800/50 rounded overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 p-3 bg-stone-700/50 text-stone-400 text-xs uppercase tracking-wider font-bold">
          <div className="col-span-2">Player</div>
          <div className="text-right">Salary</div>
          <div className="text-right">Years</div>
        </div>
        {/* Rows */}
        {contracts.map((contract) => (
          <div key={contract.name} className="grid grid-cols-4 gap-4 p-3 border-b border-stone-700/50">
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-stone-500 font-mono text-sm">{contract.pos}</span>
              <span className="text-white">{contract.name}</span>
            </div>
            <div className="text-right text-green-400 font-mono">{formatSalary(contract.salary)}</div>
            <div className="text-right text-stone-400 font-mono">{contract.years}yr</div>
          </div>
        ))}
      </div>

      {/* Slush fund note */}
      <div className="mt-6 bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
        <div className="text-emerald-400 text-xs uppercase mb-2">💰 Slush Fund</div>
        <p className="text-stone-300 text-sm">
          Discretionary funds for "special situations." Use wisely - once it's gone, you'll need to get creative.
        </p>
      </div>
    </div>
  );
};

export default FilesModal;
