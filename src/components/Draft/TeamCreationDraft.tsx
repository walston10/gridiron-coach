/**
 * Team Creation Draft
 *
 * Budget-based team building for new game start.
 * Pick 10 positions with a limited budget.
 */

import { useState, useMemo } from 'react';
import type { DraftSlot, DraftPlayer } from '../../types/Player';
import {
  generateDraftPool,
  STARTING_BUDGET,
  calculateRemainingBudget,
  canAffordPick,
  getDraftSlots,
  getSlotDisplayName,
  getSlotCategory,
} from '../../utils/teamCreationDraft';

interface TeamCreationDraftProps {
  onComplete: (picks: Map<DraftSlot, DraftPlayer>) => void;
  onCancel?: () => void;
}

export const TeamCreationDraft: React.FC<TeamCreationDraftProps> = ({
  onComplete,
  onCancel,
}) => {
  // Generate draft pool once
  const pool = useMemo(() => generateDraftPool(), []);

  // Track picks
  const [picks, setPicks] = useState<Map<DraftSlot, DraftPlayer>>(new Map());

  // Current slot being viewed
  const [currentSlot, setCurrentSlot] = useState<DraftSlot>('QB');

  // Calculate budget
  const remainingBudget = calculateRemainingBudget(picks);
  const slots = getDraftSlots();
  const filledSlots = picks.size;
  const remainingSlots = slots.length - filledSlots;

  // Group slots by category
  const offenseSlots = slots.filter(s => getSlotCategory(s) === 'offense');
  const olineSlots = slots.filter(s => getSlotCategory(s) === 'oline');
  const defenseSlots = slots.filter(s => getSlotCategory(s) === 'defense');

  // Handle picking a player
  const handlePick = (player: DraftPlayer) => {
    if (!canAffordPick(picks, player, remainingSlots)) {
      return; // Can't afford
    }

    const newPicks = new Map(picks);
    newPicks.set(currentSlot, player);
    setPicks(newPicks);

    // Auto-advance to next unfilled slot
    const nextSlot = slots.find(s => !newPicks.has(s) && s !== currentSlot);
    if (nextSlot) {
      setCurrentSlot(nextSlot);
    }
  };

  // Handle removing a pick
  const handleRemovePick = (slot: DraftSlot) => {
    const newPicks = new Map(picks);
    newPicks.delete(slot);
    setPicks(newPicks);
    setCurrentSlot(slot);
  };

  // Check if draft is complete
  const isComplete = picks.size === slots.length;

  // Handle completing the draft
  const handleComplete = () => {
    if (isComplete) {
      onComplete(picks);
    }
  };

  // Render a slot button
  const renderSlotButton = (slot: DraftSlot) => {
    const picked = picks.get(slot);
    const isActive = slot === currentSlot;

    return (
      <button
        key={slot}
        onClick={() => setCurrentSlot(slot)}
        className={`
          w-full text-left p-2 rounded transition-colors text-sm
          ${isActive ? 'bg-blue-600 text-white' : picked ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
        `}
      >
        <div className="font-medium">{slot}</div>
        {picked ? (
          <div className="text-xs opacity-75 truncate">
            {picked.name} ({picked.overall})
          </div>
        ) : (
          <div className="text-xs opacity-50">Not selected</div>
        )}
      </button>
    );
  };

  // Render player option
  const renderPlayerOption = (player: DraftPlayer) => {
    const isPicked = picks.get(currentSlot)?.id === player.id;
    const affordable = canAffordPick(picks, player, remainingSlots);

    return (
      <div
        key={player.id}
        onClick={() => affordable && handlePick(player)}
        className={`
          p-4 rounded-lg border-2 transition-all
          ${isPicked
            ? 'border-green-500 bg-green-900/30'
            : affordable
              ? 'border-gray-600 bg-gray-800 hover:border-blue-500 cursor-pointer'
              : 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
          }
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-lg font-bold text-white">{player.name}</div>
            <div className="text-sm text-gray-400">{getSlotDisplayName(player.position)}</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getOverallColor(player.overall)}`}>
              {player.overall}
            </div>
            <div className="text-sm text-yellow-500 font-medium">
              ${player.cost}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-300 italic">
          "{player.personality}"
        </div>
        {isPicked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePick(currentSlot);
            }}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Remove selection
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Build Your Team</h1>
            <p className="text-gray-400">Draft 10 positions with your budget</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-400">${remainingBudget}</div>
            <div className="text-sm text-gray-400">Budget Remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>{filledSlots} of {slots.length} positions filled</span>
            <span>${STARTING_BUDGET - remainingBudget} spent</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-green-500 transition-all"
              style={{ width: `${(filledSlots / slots.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar - Position list */}
          <div className="col-span-3 space-y-4">
            {/* Offense */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Offense
              </h3>
              <div className="space-y-1">
                {offenseSlots.map(renderSlotButton)}
              </div>
            </div>

            {/* O-Line */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Offensive Line
              </h3>
              <div className="space-y-1">
                {olineSlots.map(renderSlotButton)}
              </div>
            </div>

            {/* Defense */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Defense
              </h3>
              <div className="space-y-1">
                {defenseSlots.map(renderSlotButton)}
              </div>
            </div>
          </div>

          {/* Right - Player options */}
          <div className="col-span-9">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Select {getSlotDisplayName(currentSlot)}
              </h2>
              {picks.has(currentSlot) && (
                <span className="text-green-400 text-sm">Selected</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {pool[currentSlot].map(renderPlayerOption)}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex justify-between items-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              Cancel
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleComplete}
            disabled={!isComplete}
            className={`
              px-8 py-3 rounded-lg font-bold text-lg transition-all
              ${isComplete
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isComplete ? 'Start Season!' : `${remainingSlots} positions left`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to get color based on overall rating
function getOverallColor(overall: number): string {
  if (overall >= 90) return 'text-purple-400';
  if (overall >= 85) return 'text-yellow-400';
  if (overall >= 80) return 'text-green-400';
  if (overall >= 70) return 'text-blue-400';
  if (overall >= 60) return 'text-gray-400';
  return 'text-red-400';
}

export default TeamCreationDraft;
