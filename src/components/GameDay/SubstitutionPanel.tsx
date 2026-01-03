import React, { useState, useCallback } from 'react';
import type {
  PositionSlot,
  RosterPlayer,
  PlayerFatigueDisplay,
  AutoSubSettings,
} from '../../types/Substitution';
import { OFFENSIVE_SLOTS, DEFENSIVE_SLOTS, getFatigueColor } from '../../types/Substitution';

interface SubstitutionPanelProps {
  side: 'offense' | 'defense';
  roster: RosterPlayer[];
  currentLineup: Map<string, string>;  // slot -> playerId
  depthChart: { slot: string; starters: string[] }[];
  fatigueData: Map<string, PlayerFatigueDisplay>;
  autoSubSettings: AutoSubSettings;
  onSubstitute: (slot: string, newPlayerId: string) => void;
  onToggleAutoSub: () => void;
  onAutoSubAll: () => void;
  showPanel?: boolean;
}

// Fatigue bar component
const FatigueBar: React.FC<{ fatigue: PlayerFatigueDisplay }> = ({ fatigue }) => {
  const color = getFatigueColor(fatigue.level);
  const width = 100 - fatigue.percentage;

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {fatigue.shouldSub && (
        <span className="text-xs text-orange-400">!</span>
      )}
    </div>
  );
};

// Single row in the depth chart
const DepthChartRow: React.FC<{
  slotDef: PositionSlot;
  currentPlayerId: string | undefined;
  depth: string[];
  roster: RosterPlayer[];
  fatigue: PlayerFatigueDisplay | undefined;
  onSubstitute: (slot: string, newPlayerId: string) => void;
}> = ({ slotDef, currentPlayerId, depth, roster, fatigue, onSubstitute }) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentPlayer = roster.find(p => p.id === currentPlayerId);

  // Get available backups (players in depth chart for this slot, excluding current)
  const availableBackups = depth
    .map(id => roster.find(p => p.id === id))
    .filter((p): p is RosterPlayer => p !== undefined && p.id !== currentPlayerId);

  const handleSelect = useCallback((playerId: string) => {
    onSubstitute(slotDef.id, playerId);
    setIsOpen(false);
  }, [slotDef.id, onSubstitute]);

  return (
    <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2 py-1.5 px-2 hover:bg-gray-800/50 rounded text-sm relative">
      {/* Position label */}
      <div className="font-medium text-gray-400">
        {slotDef.name}
      </div>

      {/* Player dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-left"
        >
          <span className="truncate text-white">
            {currentPlayer ? (
              <>
                {currentPlayer.name}
                <span className="text-gray-500 ml-1">({currentPlayer.overall})</span>
              </>
            ) : (
              <span className="text-gray-500">Empty</span>
            )}
          </span>
          <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && availableBackups.length > 0 && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-32 overflow-y-auto">
              {availableBackups.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelect(player.id)}
                  className="w-full px-2 py-1.5 text-left hover:bg-gray-700 text-white"
                >
                  {player.name}
                  <span className="text-gray-500 ml-1">({player.overall})</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fatigue bar */}
      <div className="flex justify-end">
        {fatigue ? (
          <FatigueBar fatigue={fatigue} />
        ) : (
          <div className="w-12 h-2 bg-gray-700 rounded-full" />
        )}
      </div>
    </div>
  );
};

export const SubstitutionPanel: React.FC<SubstitutionPanelProps> = ({
  side,
  roster,
  currentLineup,
  depthChart,
  fatigueData,
  autoSubSettings,
  onSubstitute,
  onToggleAutoSub,
  onAutoSubAll,
  showPanel = true,
}) => {
  const slots = side === 'offense' ? OFFENSIVE_SLOTS : DEFENSIVE_SLOTS;

  // Count players needing substitution
  const needSubCount = Array.from(fatigueData.values()).filter(f => f.shouldSub).length;

  if (!showPanel) return null;

  return (
    <div className="w-72 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">
            {side === 'offense' ? 'Offense' : 'Defense'}
          </h3>
          <div className="flex items-center gap-2">
            {/* Auto-sub toggle */}
            <button
              onClick={onToggleAutoSub}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                autoSubSettings.enabled
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600/30'
              }`}
              title="Toggle auto-substitutions"
            >
              AUTO
            </button>
          </div>
        </div>

        {/* Auto-sub all button when players need rest */}
        {needSubCount > 0 && (
          <button
            onClick={onAutoSubAll}
            className="w-full py-1.5 px-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded text-xs font-medium border border-orange-500/30 transition-colors"
          >
            Sub {needSubCount} Tired Player{needSubCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Depth chart rows */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-1">
          {slots.map((slotDef) => {
            const entry = depthChart.find(e => e.slot === slotDef.id);
            const currentPlayerId = currentLineup.get(slotDef.id);
            const fatigue = currentPlayerId ? fatigueData.get(currentPlayerId) : undefined;

            return (
              <DepthChartRow
                key={slotDef.id}
                slotDef={slotDef}
                currentPlayerId={currentPlayerId}
                depth={entry?.starters || []}
                roster={roster}
                fatigue={fatigue}
                onSubstitute={onSubstitute}
              />
            );
          })}
        </div>
      </div>

      {/* Footer with legend */}
      <div className="p-2 border-t border-gray-800 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />Fresh
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />Tired
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />Gassed
          </span>
        </div>
      </div>
    </div>
  );
};
