import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { TeamRoster } from './TeamRoster';
import { DepthChart } from './DepthChart';
import { Schedule } from './Schedule';
import { Standings } from './Standings';
import { CoordinatorPanel } from './CoordinatorPanel';
import type { Player } from '../../types';
type Tab = 'roster' | 'depth' | 'schedule' | 'standings' | 'staff';

export const FranchiseDashboard: React.FC = () => {
  const { teams, userTeamId, season } = useGameStore();
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const userTeam = teams.find(t => t.info.id === userTeamId);

  if (!userTeam) {
    return <div className="text-white p-6">No team selected</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'roster', label: 'Roster' },
    { key: 'depth', label: 'Depth Chart' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'standings', label: 'Standings' },
    { key: 'staff', label: 'Staff' },
  ];

  const formatCap = (amount: number) => `$${(amount / 1_000_000).toFixed(1)}M`;

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{userTeam.info.city} {userTeam.info.name}</h1>
          <div className="text-gray-400 mt-1">
            Cap Space: <span className="text-green-400">{formatCap(userTeam.capSpace)}</span>
            {userTeam.deadCap > 0 && (
              <span className="ml-4">
                Dead Cap: <span className="text-red-400">{formatCap(userTeam.deadCap)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-gray-400">
          <div>Season {season?.year}</div>
          <div>{season?.phase.replace('_', ' ')}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded ${
              activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roster' && (
        <TeamRoster roster={userTeam.roster} onPlayerClick={setSelectedPlayer} />
      )}

      {activeTab === 'depth' && (
        <DepthChart roster={userTeam.roster} />
      )}

      {activeTab === 'schedule' && season && (
        <Schedule
          schedule={season.schedule}
          teams={teams}
          userTeamId={userTeamId!}
          currentWeek={season.currentWeek}
        />
      )}

      {activeTab === 'standings' && season && (
        <Standings
          standings={season.standings}
          teams={teams}
          userTeamId={userTeamId!}
        />
      )}

      {activeTab === 'staff' && (
        <CoordinatorPanel
          oc={userTeam.coordinators.oc}
          dc={userTeam.coordinators.dc}
        />
      )}
    </div>
  );
};