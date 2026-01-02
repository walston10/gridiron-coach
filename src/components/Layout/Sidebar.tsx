import React from 'react';

type Page = 'home' | 'playbook' | 'designer' | 'gameday' | 'roster' | 'scouting' | 'draft' | 'freeagency';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'home', label: 'Dashboard', icon: '🏠' },
  { key: 'gameday', label: 'Game Day', icon: '🏈' },
  { key: 'playbook', label: 'Playbook', icon: '📋' },
  { key: 'designer', label: 'Play Designer', icon: '✏️' },
  { key: 'roster', label: 'Roster', icon: '👥' },
  { key: 'scouting', label: 'Scouting', icon: '🔍' },
  { key: 'freeagency', label: 'Free Agency', icon: '💰' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="w-64 bg-gray-800 min-h-screen p-4">
      <div className="text-2xl font-bold text-white mb-8 px-2">
        🏈 Gridiron Coach
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
              currentPage === item.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};