import React from 'react';
import { useGameStore } from '../../stores/gameStore';

// Player status types for the drama system
type PlayerStatus = 'CLEAN' | 'UNDER_INVESTIGATION' | 'SUSPENDED' | 'INJURED' | 'ENHANCED' | 'HOLDOUT';

// Owner mood types
type OwnerMood = 'PLEASED' | 'CONTENT' | 'IMPATIENT' | 'FURIOUS';

// Drama event types
interface DramaEvent {
  id: string;
  icon: string;
  title: string;
  urgency: 'low' | 'medium' | 'high';
  category: 'media' | 'money' | 'scandal' | 'legal';
}

// Placeholder drama events - to be expanded into full system later
const PLACEHOLDER_EVENTS: DramaEvent[] = [
  { id: '1', icon: '⚠️', title: 'Reporter asking about locker room fight', urgency: 'high', category: 'media' },
  { id: '2', icon: '💰', title: 'Agent wants to renegotiate deal', urgency: 'medium', category: 'money' },
  { id: '3', icon: '🚨', title: 'Star player missed team curfew', urgency: 'high', category: 'scandal' },
];

// Placeholder player statuses - randomly assign for now
const getPlayerStatus = (playerId: string): PlayerStatus => {
  const statuses: PlayerStatus[] = ['CLEAN', 'CLEAN', 'CLEAN', 'CLEAN', 'INJURED', 'UNDER_INVESTIGATION', 'ENHANCED'];
  const hash = playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return statuses[hash % statuses.length];
};

const STATUS_STYLES: Record<PlayerStatus, { bg: string; text: string; label: string }> = {
  CLEAN: { bg: '#15803d', text: '#e8e4d9', label: 'CLEAN' },
  UNDER_INVESTIGATION: { bg: '#d4a056', text: '#1c1917', label: 'INVESTIGATION' },
  SUSPENDED: { bg: '#dc2626', text: '#e8e4d9', label: 'SUSPENDED' },
  INJURED: { bg: '#78716c', text: '#e8e4d9', label: 'INJURED' },
  ENHANCED: { bg: '#7c3aed', text: '#e8e4d9', label: 'ENHANCED' },
  HOLDOUT: { bg: '#ea580c', text: '#e8e4d9', label: 'HOLDOUT' },
};

const OWNER_QUOTES: Record<OwnerMood, string[]> = {
  PLEASED: ['"Keep this up and there\'s a bonus in it for you."', '"Finally, someone who knows how to win."'],
  CONTENT: ['"Acceptable progress. Don\'t get comfortable."', '"The board is watching. Keep delivering."'],
  IMPATIENT: ['"I didn\'t buy this team to finish second."', '"Results. I need results. Yesterday."'],
  FURIOUS: ['"Clean out your desk by Monday."', '"My lawyers are reviewing your contract."'],
};

// Get owner mood based on standings
const getOwnerMood = (wins: number, losses: number): OwnerMood => {
  const winPct = wins / (wins + losses || 1);
  if (winPct >= 0.7) return 'PLEASED';
  if (winPct >= 0.5) return 'CONTENT';
  if (winPct >= 0.3) return 'IMPATIENT';
  return 'FURIOUS';
};

export const Dashboard: React.FC = () => {
  const { teams, userTeamId, season, playbook } = useGameStore();

  const userTeam = teams.find(t => t.info.id === userTeamId);
  const standing = season?.standings.find(s => s.teamId === userTeamId);

  if (!userTeam) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="text-xl" style={{ color: '#d4a056' }}>Loading...</div>
      </div>
    );
  }

  const topPlayers = [...userTeam.roster]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 6);

  const wins = standing?.wins || 0;
  const losses = standing?.losses || 0;
  const ownerMood = getOwnerMood(wins, losses);
  const ownerQuote = OWNER_QUOTES[ownerMood][Math.floor(Math.random() * OWNER_QUOTES[ownerMood].length)];

  // Placeholder reputation values
  const reputation = { public: 72, culture: 58, media: 45, risk: 38 };

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#e8e4d9' }}>
            {userTeam.info.name.toUpperCase()}
          </h1>
          <p className="text-sm" style={{ color: '#78716c' }}>
            Season {season?.year || 2024} &bull; {season?.phase?.replace('_', ' ') || 'PRESEASON'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded text-sm font-bold" style={{ backgroundColor: '#292524', color: '#d4a056' }}>
            {wins}-{losses}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="RECORD" value={`${wins}-${losses}`} accent />
        <StatCard label="CAP SPACE" value={`$${(userTeam.capSpace / 1_000_000).toFixed(1)}M`} color="#15803d" />
        <StatCard label="ROSTER" value={`${userTeam.roster.length}/53`} />
        <StatCard label="SCHEMES" value={`${playbook.plays.length}`} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Roster Watch */}
        <div className="lg:col-span-1">
          <div className="rounded-lg p-4" style={{ backgroundColor: '#292524' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wider" style={{ color: '#d4a056' }}>
                ROSTER WATCH
              </h2>
              <span className="text-xs" style={{ color: '#78716c' }}>
                {topPlayers.filter(p => getPlayerStatus(p.id) !== 'CLEAN').length} flags
              </span>
            </div>
            <div className="space-y-2">
              {topPlayers.map(player => {
                const status = getPlayerStatus(player.id);
                const statusStyle = STATUS_STYLES[status];
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded"
                    style={{ backgroundColor: '#1c1917' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: '#78716c' }}>{player.position}</span>
                      <span style={{ color: '#e8e4d9' }}>{player.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: '#d4a056' }}>{player.overall}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {status === 'ENHANCED' ? '💉' : ''}{statusStyle.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column - Owner & Inbox */}
        <div className="lg:col-span-1 space-y-6">
          {/* Owner's Mood */}
          <div className="rounded-lg p-4" style={{ backgroundColor: '#292524' }}>
            <h2 className="text-sm font-bold tracking-wider mb-4" style={{ color: '#d4a056' }}>
              OWNER'S MOOD
            </h2>
            <div className="flex items-start gap-4">
              {/* Owner avatar placeholder */}
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                style={{ backgroundColor: '#1c1917' }}
              >
                🎩
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs px-2 py-1 rounded font-bold"
                    style={{
                      backgroundColor: ownerMood === 'PLEASED' ? '#15803d' :
                                      ownerMood === 'CONTENT' ? '#d4a056' :
                                      ownerMood === 'IMPATIENT' ? '#ea580c' : '#dc2626',
                      color: ownerMood === 'CONTENT' ? '#1c1917' : '#e8e4d9',
                    }}
                  >
                    {ownerMood}
                  </span>
                </div>
                <p className="text-sm italic" style={{ color: '#a8a29e' }}>
                  {ownerQuote}
                </p>
              </div>
            </div>
          </div>

          {/* Inbox / Headlines */}
          <div className="rounded-lg p-4" style={{ backgroundColor: '#292524' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wider" style={{ color: '#d4a056' }}>
                INBOX
              </h2>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: '#dc2626', color: '#e8e4d9' }}>
                {PLACEHOLDER_EVENTS.length}
              </span>
            </div>
            <div className="space-y-2">
              {PLACEHOLDER_EVENTS.map(event => (
                <button
                  key={event.id}
                  className="w-full text-left p-3 rounded transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: '#1c1917',
                    borderLeft: `3px solid ${
                      event.urgency === 'high' ? '#dc2626' :
                      event.urgency === 'medium' ? '#d4a056' : '#78716c'
                    }`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{event.icon}</span>
                    <span className="text-sm" style={{ color: '#e8e4d9' }}>{event.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Reputation */}
        <div className="lg:col-span-1">
          <div className="rounded-lg p-4" style={{ backgroundColor: '#292524' }}>
            <h2 className="text-sm font-bold tracking-wider mb-4" style={{ color: '#d4a056' }}>
              REPUTATION
            </h2>
            <div className="space-y-4">
              <ReputationBar label="PUBLIC IMAGE" value={reputation.public} color="#15803d" />
              <ReputationBar label="TEAM CULTURE" value={reputation.culture} color="#d4a056" />
              <ReputationBar label="MEDIA RELATIONS" value={reputation.media} color="#3b82f6" />
              <ReputationBar label="RISK LEVEL" value={reputation.risk} color="#dc2626" inverted />
            </div>

            {/* Quick stats */}
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid #44403c' }}>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black" style={{ color: '#d4a056' }}>$2.1M</div>
                  <div className="text-xs" style={{ color: '#78716c' }}>IN FINES (YTD)</div>
                </div>
                <div>
                  <div className="text-2xl font-black" style={{ color: '#dc2626' }}>3</div>
                  <div className="text-xs" style={{ color: '#78716c' }}>SCANDALS BURIED</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: string;
  accent?: boolean;
  color?: string;
}> = ({ label, value, accent, color }) => (
  <div className="rounded-lg p-4" style={{ backgroundColor: '#292524' }}>
    <div className="text-xs font-semibold tracking-wider mb-1" style={{ color: '#78716c' }}>
      {label}
    </div>
    <div
      className="text-2xl font-black"
      style={{ color: color || (accent ? '#d4a056' : '#e8e4d9') }}
    >
      {value}
    </div>
  </div>
);

// Reputation Bar Component
const ReputationBar: React.FC<{
  label: string;
  value: number;
  color: string;
  inverted?: boolean;
}> = ({ label, value, color, inverted }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-semibold" style={{ color: '#a8a29e' }}>{label}</span>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
    </div>
    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#1c1917' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          backgroundColor: inverted ? (value > 50 ? '#dc2626' : '#15803d') : color,
        }}
      />
    </div>
  </div>
);
