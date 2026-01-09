/**
 * ILLEGAL MOTION - Fantasy Draft
 *
 * Mobile-first portrait design for drafting your team.
 * Dark theme with amber/gold accents, GTA-inspired aesthetic.
 */

import { useEffect, useState, useMemo } from 'react';
import {
  useDraftStore,
  POSITION_REQUIREMENTS,
  type PositionStatus,
  type DraftSelection,
} from '../../stores/draftStore';
import type { DraftPlayer, DraftLineUnit, PlayerTier } from '../../data/playerPool';
import type { Card } from '../../types/card.types';

// =============================================================================
// TYPES
// =============================================================================

interface FantasyDraftProps {
  onComplete: () => void;
  onCancel?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'ST'];

const TIER_COLORS: Record<PlayerTier, { bg: string; text: string; border: string }> = {
  ELITE: { bg: 'bg-amber-900/40', text: 'text-amber-400', border: 'border-amber-500' },
  STAR: { bg: 'bg-slate-700/60', text: 'text-slate-300', border: 'border-slate-400' },
  STARTER: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-600' },
  BACKUP: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-600' },
  DEPTH: { bg: 'bg-gray-900/50', text: 'text-gray-500', border: 'border-gray-700' },
};

const STATUS_COLORS: Record<PositionStatus, { bg: string; text: string; indicator: string }> = {
  need: { bg: 'bg-red-900/30', text: 'text-red-400', indicator: 'bg-red-500' },
  ok: { bg: 'bg-green-900/30', text: 'text-green-400', indicator: 'bg-green-500' },
  full: { bg: 'bg-gray-800', text: 'text-gray-500', indicator: 'bg-gray-600' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const FantasyDraft: React.FC<FantasyDraftProps> = ({ onComplete, onCancel: _onCancel }) => {
  const {
    playerPool,
    selections,
    spent,
    budget,
    activePosition,
    kickReturnerId,
    puntReturnerId,
    initializeDraft,
    selectPlayer,
    releasePlayer,
    setKickReturner,
    setPuntReturner,
    setActivePosition,
    getPositionStatus,
    getPositionCount,
    canSelectPosition,
    isRosterComplete,
    getRemainingBudget,
    getSelectedPlayerIds,
    getAvailableReturners,
    buildRoster,
  } = useDraftStore();

  const [showRoster, setShowRoster] = useState(false);
  const [showReturnerModal, setShowReturnerModal] = useState(false);

  // Initialize on mount
  useEffect(() => {
    initializeDraft();
  }, [initializeDraft]);

  // Computed values
  const remainingBudget = getRemainingBudget();
  const selectedIds = getSelectedPlayerIds();
  const rosterComplete = isRosterComplete();
  const availableReturners = getAvailableReturners();

  // Get players for current position
  const currentPlayers = useMemo(() => {
    if (!playerPool) return [];

    const position = activePosition;
    if (position === 'OL' || position === 'DL') {
      return (playerPool[position] as DraftLineUnit[]).map(unit => ({
        id: unit.unit.id,
        isUnit: true,
        data: unit,
      }));
    }

    return (playerPool[position as keyof typeof playerPool] as DraftPlayer[]).map(player => ({
      id: player.player.id,
      isUnit: false,
      data: player,
    }));
  }, [playerPool, activePosition]);

  // Handle player selection
  const handleSelect = (item: { id: string; isUnit: boolean; data: DraftPlayer | DraftLineUnit }) => {
    if (selectedIds.has(item.id)) {
      releasePlayer(item.id);
    } else if (canSelectPosition(activePosition)) {
      const salary = item.isUnit
        ? (item.data as DraftLineUnit).salary
        : (item.data as DraftPlayer).salary;

      if (salary <= remainingBudget) {
        selectPlayer(activePosition, item.id, salary, item.data);
      }
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (!rosterComplete) return;

    const roster = buildRoster();
    if (roster) {
      onComplete();
    }
  };

  if (!playerPool) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-500 text-xl animate-pulse">Loading draft pool...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header - Budget Bar */}
      <BudgetHeader
        spent={spent}
        budget={budget}
        remaining={remainingBudget}
        rosterComplete={rosterComplete}
        onShowRoster={() => setShowRoster(true)}
      />

      {/* Position Tabs */}
      <PositionTabs
        activePosition={activePosition}
        onSelect={setActivePosition}
        getStatus={getPositionStatus}
        getCount={getPositionCount}
      />

      {/* Player List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {currentPlayers.map(item => (
          <PlayerCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            canAfford={
              item.isUnit
                ? (item.data as DraftLineUnit).salary <= remainingBudget
                : (item.data as DraftPlayer).salary <= remainingBudget
            }
            canSelect={canSelectPosition(activePosition)}
            onSelect={() => handleSelect(item)}
          />
        ))}
      </div>

      {/* Bottom Bar - Returner & Confirm */}
      <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-3 space-y-2">
        {/* Returner Status */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowReturnerModal(true)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              kickReturnerId && puntReturnerId
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : 'bg-red-900/50 text-red-400 border border-red-700'
            }`}
          >
            {kickReturnerId && puntReturnerId ? 'Returners Set' : 'Set Returners'}
          </button>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!rosterComplete}
          className={`w-full py-4 rounded-lg font-bold text-xl uppercase tracking-wide transition-all ${
            rosterComplete
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 shadow-xl shadow-amber-500/40 animate-pulse ring-2 ring-amber-300'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {rosterComplete ? '✓ CONFIRM & START SEASON →' : 'Fill Required Positions'}
        </button>
        {rosterComplete && (
          <p className="text-center text-amber-400 text-sm mt-2 font-medium">
            Your roster is complete! Tap above to begin.
          </p>
        )}
      </div>

      {/* Roster Preview Modal */}
      {showRoster && (
        <RosterModal
          selections={selections}
          onClose={() => setShowRoster(false)}
          onRelease={releasePlayer}
        />
      )}

      {/* Returner Selection Modal */}
      {showReturnerModal && (
        <ReturnerModal
          availableReturners={availableReturners}
          kickReturnerId={kickReturnerId}
          puntReturnerId={puntReturnerId}
          onSetKickReturner={setKickReturner}
          onSetPuntReturner={setPuntReturner}
          onClose={() => setShowReturnerModal(false)}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface BudgetHeaderProps {
  spent: number;
  budget: number;
  remaining: number;
  rosterComplete: boolean;
  onShowRoster: () => void;
}

const BudgetHeader: React.FC<BudgetHeaderProps> = ({
  spent,
  budget,
  remaining,
  rosterComplete: _rosterComplete,
  onShowRoster,
}) => {
  const percentage = (spent / budget) * 100;

  return (
    <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800 px-4 py-3">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-amber-500 tracking-tight">FANTASY DRAFT</h1>
        <button
          onClick={onShowRoster}
          className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          View Roster
        </button>
      </div>

      {/* Budget Bar */}
      <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 ${
            percentage > 90 ? 'bg-red-600' : percentage > 70 ? 'bg-amber-600' : 'bg-green-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-sm font-medium">
          <span className="text-white drop-shadow-md">
            ${spent}M / ${budget}M
          </span>
          <span className={`drop-shadow-md ${remaining < 10 ? 'text-red-300' : 'text-green-300'}`}>
            ${remaining}M left
          </span>
        </div>
      </div>
    </div>
  );
};

interface PositionTabsProps {
  activePosition: string;
  onSelect: (position: string) => void;
  getStatus: (position: string) => PositionStatus;
  getCount: (position: string) => number;
}

const PositionTabs: React.FC<PositionTabsProps> = ({
  activePosition,
  onSelect,
  getStatus,
  getCount,
}) => {
  return (
    <div className="sticky top-[88px] z-10 bg-gray-900 border-b border-gray-800">
      <div className="flex overflow-x-auto scrollbar-hide">
        {POSITION_ORDER.map(pos => {
          const status = getStatus(pos);
          const count = getCount(pos);
          const req = POSITION_REQUIREMENTS[pos];
          const isActive = activePosition === pos;
          const colors = STATUS_COLORS[status];

          return (
            <button
              key={pos}
              onClick={() => onSelect(pos)}
              className={`flex-shrink-0 px-4 py-2 transition-all relative ${
                isActive
                  ? 'bg-amber-900/40 text-amber-400'
                  : `${colors.bg} ${colors.text} hover:bg-gray-800`
              }`}
            >
              <div className="font-bold text-sm">{pos}</div>
              <div className="text-xs opacity-75">
                {count}/{req.max}
              </div>
              {/* Status indicator */}
              <div
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ${colors.indicator}`}
              />
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PlayerCardProps {
  item: {
    id: string;
    isUnit: boolean;
    data: DraftPlayer | DraftLineUnit;
  };
  isSelected: boolean;
  canAfford: boolean;
  canSelect: boolean;
  onSelect: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  item,
  isSelected,
  canAfford,
  canSelect,
  onSelect,
}) => {
  const isUnit = item.isUnit;
  const data = item.data;

  const tier = data.tier;
  const salary = data.salary;
  const tierColors = TIER_COLORS[tier];

  // Extract display info
  let name: string;
  let overall: number;
  let keyRatings: { name: string; value: number }[];
  let cardCount: number;
  let previewCards: Card[];

  if (isUnit) {
    const unitData = data as DraftLineUnit;
    name = unitData.unit.name;
    overall = unitData.unit.overall;
    keyRatings = unitData.keyRatings;
    cardCount = unitData.cardCount;
    previewCards = unitData.previewCards;
  } else {
    const playerData = data as DraftPlayer;
    name = `${playerData.player.firstName} ${playerData.player.lastName}`;
    overall = playerData.player.overall;
    keyRatings = playerData.keyRatings;
    cardCount = playerData.cardCount;
    previewCards = playerData.previewCards;
  }

  const disabled = isSelected ? false : !canAfford || !canSelect;

  return (
    <button
      onClick={onSelect}
      disabled={disabled && !isSelected}
      className={`w-full text-left rounded-lg border-2 transition-all overflow-hidden ${
        isSelected
          ? 'border-amber-500 bg-amber-900/30 shadow-lg shadow-amber-500/20'
          : disabled
          ? `border-gray-700 bg-gray-900/50 opacity-50`
          : `${tierColors.border} ${tierColors.bg} hover:bg-gray-800`
      }`}
    >
      <div className="p-3">
        {/* Top Row: Name, OVR, Tier, Price */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white truncate">{name}</span>
              {isSelected && (
                <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold">
                  SIGNED
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${tierColors.text}`}>{tier}</span>
              {!isUnit && (
                <span className="text-xs text-gray-500">
                  Age {(data as DraftPlayer).player.age}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{overall}</div>
            <div className="text-sm font-bold text-green-400">${salary}M</div>
          </div>
        </div>

        {/* Key Ratings */}
        <div className="flex gap-3 mb-2">
          {keyRatings.map(rating => (
            <div key={rating.name} className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{rating.name}</span>
              <span
                className={`text-sm font-bold ${
                  rating.value >= 85
                    ? 'text-amber-400'
                    : rating.value >= 75
                    ? 'text-green-400'
                    : rating.value >= 65
                    ? 'text-blue-400'
                    : 'text-gray-400'
                }`}
              >
                {rating.value}
              </span>
            </div>
          ))}
        </div>

        {/* Cards Preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Cards:</span>
          <span className="text-xs font-medium text-amber-400">{cardCount} cards</span>
          {previewCards.length > 0 && (
            <div className="flex gap-1 overflow-hidden">
              {previewCards.slice(0, 3).map((card, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 truncate max-w-[80px]"
                >
                  {card.name}
                </span>
              ))}
              {previewCards.length > 3 && (
                <span className="text-xs text-gray-500">+{previewCards.length - 3}</span>
              )}
            </div>
          )}
          {cardCount === 0 && (
            <span className="text-xs text-gray-500 italic">Modifier only</span>
          )}
        </div>
      </div>
    </button>
  );
};

interface RosterModalProps {
  selections: DraftSelection[];
  onClose: () => void;
  onRelease: (playerId: string) => void;
}

const RosterModal: React.FC<RosterModalProps> = ({ selections, onClose, onRelease }) => {
  // Group by position
  const grouped = useMemo(() => {
    const groups: Record<string, DraftSelection[]> = {};
    for (const pos of POSITION_ORDER) {
      groups[pos] = selections.filter(s => s.position === pos);
    }
    return groups;
  }, [selections]);

  const totalSpent = selections.reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
      <div className="w-full max-w-lg bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-amber-500">Your Roster</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Total: ${totalSpent}M</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Roster List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {POSITION_ORDER.map(pos => {
            const posSelections = grouped[pos];
            if (posSelections.length === 0) return null;

            return (
              <div key={pos}>
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{pos}</div>
                {posSelections.map(sel => {
                  const name = sel.playerData
                    ? `${sel.playerData.player.firstName} ${sel.playerData.player.lastName}`
                    : sel.unitData?.unit.name || 'Unknown';
                  const overall = sel.playerData?.player.overall || sel.unitData?.unit.overall || 0;

                  return (
                    <div
                      key={sel.playerId}
                      className="flex items-center justify-between bg-gray-800 rounded p-2 mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{name}</span>
                        <span className="text-sm text-gray-400">{overall} OVR</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-400">${sel.salary}M</span>
                        <button
                          onClick={() => onRelease(sel.playerId)}
                          className="text-red-400 hover:text-red-300 text-sm px-2 py-1 bg-red-900/30 rounded"
                        >
                          Release
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {selections.length === 0 && (
            <div className="text-center text-gray-500 py-8">No players signed yet</div>
          )}
        </div>

        {/* Close Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReturnerModalProps {
  availableReturners: DraftSelection[];
  kickReturnerId: string | null;
  puntReturnerId: string | null;
  onSetKickReturner: (id: string) => void;
  onSetPuntReturner: (id: string) => void;
  onClose: () => void;
}

const ReturnerModal: React.FC<ReturnerModalProps> = ({
  availableReturners,
  kickReturnerId,
  puntReturnerId,
  onSetKickReturner,
  onSetPuntReturner,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
      <div className="w-full max-w-lg bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-amber-500">Set Returners</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {availableReturners.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Sign RB, WR, or CB players first to designate returners
            </div>
          ) : (
            <>
              {/* Kick Returner */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Kick Returner</div>
                <div className="space-y-1">
                  {availableReturners.map(sel => {
                    const name = sel.playerData
                      ? `${sel.playerData.player.firstName} ${sel.playerData.player.lastName}`
                      : 'Unknown';
                    const speed = sel.playerData?.player.ratings.speed || 0;
                    const isSelected = kickReturnerId === sel.playerId;

                    return (
                      <button
                        key={sel.playerId}
                        onClick={() => onSetKickReturner(sel.playerId)}
                        className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                          isSelected
                            ? 'bg-amber-900/50 border border-amber-500'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{sel.position}</span>
                          <span className="text-white">{name}</span>
                        </div>
                        <span className="text-sm text-gray-400">SPD {speed}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Punt Returner */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Punt Returner</div>
                <div className="space-y-1">
                  {availableReturners.map(sel => {
                    const name = sel.playerData
                      ? `${sel.playerData.player.firstName} ${sel.playerData.player.lastName}`
                      : 'Unknown';
                    const agility = sel.playerData?.player.ratings.agility || 0;
                    const isSelected = puntReturnerId === sel.playerId;

                    return (
                      <button
                        key={sel.playerId}
                        onClick={() => onSetPuntReturner(sel.playerId)}
                        className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                          isSelected
                            ? 'bg-amber-900/50 border border-amber-500'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{sel.position}</span>
                          <span className="text-white">{name}</span>
                        </div>
                        <span className="text-sm text-gray-400">AGI {agility}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Done Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className={`w-full py-2 rounded font-medium transition-colors ${
              kickReturnerId && puntReturnerId
                ? 'bg-amber-600 text-black hover:bg-amber-500'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {kickReturnerId && puntReturnerId ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FantasyDraft;
