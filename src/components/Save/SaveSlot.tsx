/**
 * SaveSlot Component
 *
 * Individual save slot display showing save info and actions.
 * Can be filled (existing save) or empty (new game slot).
 */

import React, { useState } from 'react';
import type { SaveMetadata } from '../../types/save.types';

interface SaveSlotProps {
  // Either metadata for existing save, or null for empty slot
  save: SaveMetadata | null;
  slotIndex: number;

  // Actions
  onLoad?: (saveId: string) => void;
  onDelete?: (saveId: string) => void;
  onRename?: (saveId: string) => void;
  onExport?: (saveId: string) => void;
  onNewGame?: () => void;

  // State
  isSelected?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SaveSlot: React.FC<SaveSlotProps> = ({
  save,
  slotIndex,
  onLoad,
  onDelete,
  onRename,
  onExport,
  onNewGame,
  isSelected = false,
  isLoading = false,
  disabled = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    if (disabled || isLoading) return;

    if (save) {
      onLoad?.(save.id);
    } else {
      onNewGame?.();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (save) {
      e.preventDefault();
      setShowMenu(!showMenu);
    }
  };

  const handleMenuAction = (action: 'rename' | 'export' | 'delete') => {
    if (!save) return;
    setShowMenu(false);

    switch (action) {
      case 'rename':
        onRename?.(save.id);
        break;
      case 'export':
        onExport?.(save.id);
        break;
      case 'delete':
        onDelete?.(save.id);
        break;
    }
  };

  // Empty slot
  if (!save) {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-full p-6 rounded-lg border-2 border-dashed
          transition-all duration-200
          ${disabled
            ? 'border-gray-700 bg-gray-800/30 cursor-not-allowed'
            : 'border-gray-600 bg-gray-800/50 hover:border-amber-500 hover:bg-gray-800'
          }
        `}
      >
        <div className="text-center">
          <div className="text-4xl mb-2 opacity-50">+</div>
          <div className="text-gray-400 font-medium">New Game</div>
          <div className="text-gray-600 text-sm">Slot {slotIndex + 1}</div>
        </div>
      </button>
    );
  }

  // Filled slot
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={disabled || isLoading}
        className={`
          w-full p-4 rounded-lg border-2 text-left
          transition-all duration-200
          ${isSelected
            ? 'border-amber-500 bg-amber-900/20'
            : 'border-gray-700 bg-gray-800 hover:border-gray-500'
          }
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold truncate">{save.name}</h3>
            <div className="text-gray-400 text-sm">{save.gmName}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-gray-500 hover:text-white p-1"
            aria-label="Save options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Team & Season Info */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <TeamLogo teamId={save.teamId} />
            <span className="text-gray-300">{save.teamId}</span>
          </div>
          <div className="text-gray-500">|</div>
          <div className="text-gray-400">
            Season {save.seasonYear}, Week {save.currentWeek}
          </div>
        </div>

        {/* Record & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold">
              <span className="text-green-400">{save.record.wins}</span>
              <span className="text-gray-500">-</span>
              <span className="text-red-400">{save.record.losses}</span>
            </div>
            {save.championships > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <span>🏆</span>
                <span className="text-sm">{save.championships}</span>
              </div>
            )}
            {save.hasActiveGame && (
              <span className="text-xs bg-blue-900 text-blue-400 px-2 py-0.5 rounded">
                IN GAME
              </span>
            )}
          </div>
          <div className="text-gray-500 text-sm">
            {save.lastPlayedFormatted || 'Unknown'}
          </div>
        </div>

        {/* Phase indicator */}
        <div className="mt-2 text-xs text-gray-500">
          {formatPhase(save.seasonPhase)}
        </div>
      </button>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-2 top-12 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-32">
            <button
              onClick={() => handleMenuAction('rename')}
              className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm"
            >
              Rename
            </button>
            <button
              onClick={() => handleMenuAction('export')}
              className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm"
            >
              Export
            </button>
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={() => handleMenuAction('delete')}
              className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 text-sm"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const TeamLogo: React.FC<{ teamId: string }> = ({ teamId }) => {
  // Placeholder - would be replaced with actual team logos
  const colors: Record<string, string> = {
    DEFAULT: 'bg-gray-600',
    // Add team-specific colors here
  };

  const bgColor = colors[teamId] || colors.DEFAULT;

  return (
    <div
      className={`w-8 h-8 rounded ${bgColor} flex items-center justify-center text-white font-bold text-xs`}
    >
      {teamId.substring(0, 2).toUpperCase()}
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function formatPhase(phase: string): string {
  const phases: Record<string, string> = {
    PRESEASON: 'Preseason',
    REGULAR_SEASON: 'Regular Season',
    PLAYOFFS: 'Playoffs',
    CHAMPIONSHIP: 'Championship',
    OFFSEASON: 'Offseason',
    SEASON_END: 'Season End',
    PLAYER_CHANGES: 'Roster Changes',
    RESIGNING: 'Re-signing Period',
    FREE_AGENCY_WAVE_1: 'Free Agency',
    FREE_AGENCY_WAVE_2: 'Free Agency',
    FREE_AGENCY_WAVE_3: 'Free Agency',
    PRE_DRAFT: 'Draft Scouting',
    DRAFT: 'Draft Day',
    UDFA: 'Undrafted Signings',
    TRAINING_CAMP: 'Training Camp',
    COMPLETE: 'Ready for Season',
  };

  return phases[phase] || phase;
}

export default SaveSlot;
