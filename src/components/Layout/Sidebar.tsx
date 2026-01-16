import React from 'react';

type Page = 'home' | 'playbook' | 'designer' | 'gameday' | 'roster' | 'scouting' | 'draft' | 'freeagency' | 'playviewer';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'home', label: 'Office', icon: '🪑' },
  { key: 'gameday', label: 'Game Day', icon: '🏟️' },
  { key: 'playviewer', label: 'Film Room', icon: '🎬' },
  { key: 'playbook', label: 'Playbook', icon: '📋' },
  { key: 'designer', label: 'Schemes', icon: '✏️' },
  { key: 'roster', label: 'Roster', icon: '👥' },
  { key: 'scouting', label: 'Intel', icon: '🔍' },
  { key: 'freeagency', label: 'Deals', icon: '🤝' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const isInGame = currentPage === 'gameday';

  return (
    <div className="relative w-64 min-h-screen p-4" style={{ backgroundColor: '#1c1917' }}>
      {/* Logo */}
      <div className="mb-8 px-2">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#d4a056', fontFamily: 'system-ui' }}>
          ILLEGAL
        </div>
        <div className="text-lg font-bold -mt-1" style={{ color: '#e8e4d9' }}>
          MOTION
        </div>
        <div className="text-xs mt-1 tracking-widest" style={{ color: '#78716c' }}>
          WIN AT ANY COST
        </div>
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 ${
              currentPage === item.key
                ? 'text-white shadow-lg'
                : 'hover:bg-stone-800/50'
            }`}
            style={{
              backgroundColor: currentPage === item.key ? '#8b0000' : 'transparent',
              color: currentPage === item.key ? '#e8e4d9' : '#a8a29e',
            }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom section - risk indicator (hidden during games) */}
      {!isInGame && (
        <div className="absolute bottom-6 left-4 right-4">
          <div className="rounded-lg p-3" style={{ backgroundColor: '#292524' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#d4a056' }}>HEAT LEVEL</span>
              <span className="text-xs" style={{ color: '#dc2626' }}>MODERATE</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#44403c' }}>
              <div className="h-full rounded-full" style={{ width: '45%', backgroundColor: '#dc2626' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};