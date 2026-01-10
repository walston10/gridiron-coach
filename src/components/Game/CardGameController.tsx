/**
 * Card Game Controller
 *
 * Orchestrates the card-based game flow, switching between:
 * - OffensivePlay (when player has ball)
 * - DefensivePlay (when opponent has ball)
 * - PlayResultDisplay (after play resolves)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useCardGameStore } from '../../stores/cardGameStore';
import { useGameStore } from '../../stores/gameStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { DEFAULT_TEAMS } from '../../data/defaultTeams';
import { generateAIRoster } from '../../utils/playerGenerator';
import { buildDeck } from '../../engine/cardGenerator';
import type { OffensiveCard, DefensiveCard, OffensivePlayType } from '../../types/card.types';
import type { PlayResult, FourthDownResult } from '../../engine/playResolver';
import type {
  FourthDownCategory,
  FourthDownDefenseResponse,
  TargetPosition,
  OffensiveModifier,
  DefenseAnticipation,
  DefenseScheme,
  DefenseModifier,
} from '../../types/game.types';
import {
  getAvailableModifiers,
  MODIFIER_EFFECTS,
  LOCKED_TARGET_PLAYS,
  DEFAULT_PLAY_TARGETS,
  ANTICIPATION_CONFIG,
  DEFENSE_SCHEME_CONFIG,
  DEFENSE_MODIFIER_CONFIG,
  getSchemesForAnticipation,
  getModifiersForScheme,
} from '../../types/game.types';

// Universal Playbook
import { UNIVERSAL_OFFENSIVE_PLAYS } from '../../data/universalPlaybook';
import { calculateRosterBuffs, applyRosterBuffs, type ModifiedPlay } from '../../engine/rosterBuffs';

// Lazy load the heavy game components
import { PlayResultDisplay } from './PlayResult';
import { PregamePresentation } from './PregamePresentation';

// =============================================================================
// AI OFFENSE SELECTION
// =============================================================================

/**
 * AI offense selection that considers game situation
 */
function selectAIOffenseCard(
  cards: OffensiveCard[],
  context: {
    down: number;
    yardsToGo: number;
    yardsToEndzone: number;
    scoreDifferential: number; // Positive = AI winning
    quarter: number;
    minutes: number;
  }
): { card: OffensiveCard; target: TargetPosition; modifier: OffensiveModifier } | null {
  if (cards.length === 0) return null;

  const { down, yardsToGo, yardsToEndzone, scoreDifferential, quarter, minutes } = context;

  // Situational weights
  const isShortYardage = yardsToGo <= 3;
  const isLongYardage = yardsToGo >= 8;
  const isRedZone = yardsToEndzone <= 20;
  const isGoalLine = yardsToEndzone <= 5;
  const isThirdDown = down === 3;
  const isFourthQuarter = quarter === 4;
  const isTwoMinuteDrill = isFourthQuarter && minutes <= 2;
  const isTrailing = scoreDifferential < 0;
  const isWinning = scoreDifferential > 7;
  const isCloseGame = Math.abs(scoreDifferential) <= 7;

  // Score each card
  const scoredCards = cards.map(card => {
    let score = card.successChance; // Base score

    // Play type preferences based on situation
    const isRun = ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(card.playType);
    const isShortPass = ['SHORT_PASS', 'SCREEN'].includes(card.playType);
    const isDeepPass = card.playType === 'DEEP_PASS';
    const isMediumPass = card.playType === 'MEDIUM_PASS';

    // Short yardage: Prefer runs and short passes
    if (isShortYardage) {
      if (isRun) score += 25;
      if (isShortPass) score += 15;
      if (card.playType === 'POWER_RUN') score += 20;
    }

    // Long yardage: Prefer passes
    if (isLongYardage) {
      if (isDeepPass) score += 20;
      if (isMediumPass) score += 15;
      if (isRun && card.playType !== 'DRAW') score -= 20;
    }

    // Red zone: Prefer high-success plays
    if (isRedZone) {
      score += card.successChance * 0.2; // Weight success more
      if (isGoalLine && card.playType === 'POWER_RUN') score += 30;
    }

    // Third down: Prefer plays that can convert
    if (isThirdDown) {
      if (card.baseYards >= yardsToGo) score += 20;
      score += card.successChance * 0.3;
    }

    // Two minute drill: Prefer passes (stop clock on incompletion)
    if (isTwoMinuteDrill && isTrailing) {
      if (!isRun) score += 25;
      if (isDeepPass || isMediumPass) score += 15;
    }

    // Winning big: Be conservative
    if (isWinning && isFourthQuarter) {
      if (isRun) score += 30;
      if (isShortPass) score += 10;
      if (isDeepPass) score -= 20;
    }

    // Trailing late: Be aggressive
    if (isTrailing && isFourthQuarter) {
      if (isDeepPass) score += 25;
      if (isMediumPass) score += 15;
      if (card.bigPlayChance > 20) score += 15;
    }

    // Check situation bonuses on the card
    card.situationBonuses.forEach(bonus => {
      if (bonus.situation === 'SHORT_YARDAGE' && isShortYardage) score += bonus.modifier;
      if (bonus.situation === 'RED_ZONE' && isRedZone) score += bonus.modifier;
      if (bonus.situation === 'THIRD_DOWN' && isThirdDown) score += bonus.modifier;
      if (bonus.situation === 'FOURTH_QUARTER' && isFourthQuarter) score += bonus.modifier;
      if (bonus.situation === 'TRAILING' && isTrailing) score += bonus.modifier;
      if (bonus.situation === 'TWO_MINUTE_WARNING' && isTwoMinuteDrill) score += bonus.modifier;
      if (bonus.situation === 'CLOSE_GAME' && isCloseGame) score += bonus.modifier;
    });

    // Add small random factor (10%) to avoid being too predictable
    score += Math.random() * 20 - 10;

    return { card, score };
  });

  // Sort by score and pick the best
  scoredCards.sort((a, b) => b.score - a.score);
  const selectedCard = scoredCards[0].card;

  // Select target based on play type
  const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(selectedCard.playType);

  let target: TargetPosition = 'RB';
  if (isPass) {
    // Weighted target selection - WR1 preferred, then WR2, TE, RB
    const rand = Math.random();
    if (rand < 0.4) target = 'WR1';
    else if (rand < 0.7) target = 'WR2';
    else if (rand < 0.85) target = 'TE';
    else target = 'RB';

    // In red zone, prefer TE and RB more
    if (isRedZone) {
      const rzRand = Math.random();
      if (rzRand < 0.3) target = 'TE';
      else if (rzRand < 0.5) target = 'RB';
      else if (rzRand < 0.75) target = 'WR1';
      else target = 'WR2';
    }
  }

  // Select modifier (30% chance, smarter selection)
  let modifier: OffensiveModifier = 'NONE';
  const cpuModifiers = getAvailableModifiers(isPass, selectedCard.playType === 'PLAY_ACTION');

  if (Math.random() < 0.35 && cpuModifiers.length > 1) {
    // Pick modifier based on situation
    if (isThirdDown && cpuModifiers.includes('MAX_PROTECT')) {
      modifier = 'MAX_PROTECT';
    } else if (isLongYardage && cpuModifiers.includes('MOTION')) {
      modifier = 'MOTION'; // Motion helps create separation on long yardage
    } else if (isShortYardage && cpuModifiers.includes('HEAVY_SET')) {
      modifier = 'HEAVY_SET';
    } else if (isTwoMinuteDrill && cpuModifiers.includes('QUICK_COUNT')) {
      modifier = 'QUICK_COUNT'; // Speed up the game when trailing late
    } else {
      // Random from available
      modifier = cpuModifiers[Math.floor(Math.random() * cpuModifiers.length)];
    }
  }

  return { card: selectedCard, target, modifier };
}

// =============================================================================
// TYPES
// =============================================================================

interface CardGameControllerProps {
  onGameEnd?: (playerScore: number, opponentScore: number) => void;
  onBack?: () => void;
}

// =============================================================================
// PLAY BUTTON (Universal Playbook)
// =============================================================================

interface PlayButtonProps {
  play: ModifiedPlay;
  isSelected: boolean;
  onSelect: (play: ModifiedPlay) => void;
}

const PlayButton: React.FC<PlayButtonProps> = ({ play, isSelected, onSelect }) => {
  const categoryColors: Record<string, { selected: string; default: string }> = {
    RUN: { selected: 'border-green-500 bg-green-900/30', default: 'border-gray-700 bg-gray-800 hover:border-green-700' },
    SHORT: { selected: 'border-blue-500 bg-blue-900/30', default: 'border-gray-700 bg-gray-800 hover:border-blue-700' },
    MEDIUM: { selected: 'border-amber-500 bg-amber-900/30', default: 'border-gray-700 bg-gray-800 hover:border-amber-700' },
    DEEP: { selected: 'border-purple-500 bg-purple-900/30', default: 'border-gray-700 bg-gray-800 hover:border-purple-700' },
    TRICK: { selected: 'border-pink-500 bg-pink-900/30', default: 'border-gray-700 bg-gray-800 hover:border-pink-700' },
    SPECIAL: { selected: 'border-gray-500 bg-gray-900/30', default: 'border-gray-700 bg-gray-800 hover:border-gray-600' },
  };

  const colors = categoryColors[play.category] || categoryColors.SPECIAL;

  return (
    <button
      onClick={() => onSelect(play)}
      className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected ? colors.selected : colors.default}`}
    >
      <div className="flex items-center gap-2">
        <div className="font-bold text-white text-sm truncate flex-1">{play.name}</div>
        {play.buffIndicator === 'boosted' && <span className="text-green-400 text-xs">▲</span>}
        {play.buffIndicator === 'weak' && <span className="text-red-400 text-xs">▼</span>}
      </div>
      <div className="text-gray-400 text-xs mt-0.5 truncate">{play.description}</div>
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-green-400">{play.successChance}%</span>
        <span className="text-blue-400">{play.yards} yds</span>
        {play.bigPlayChance > 15 && <span className="text-yellow-400">💥{play.bigPlayChance}%</span>}
      </div>
      {play.buffReason && (
        <div className={`text-xs mt-1 ${play.buffIndicator === 'boosted' ? 'text-green-400' : 'text-red-400'}`}>
          {play.buffReason}
        </div>
      )}
    </button>
  );
};

// Category Tab Button
const CategoryTab: React.FC<{
  category: string;
  isActive: boolean;
  count: number;
  onClick: () => void;
}> = ({ category, isActive, count, onClick }) => {
  const colors: Record<string, string> = {
    RUN: 'bg-green-600',
    SHORT: 'bg-blue-600',
    MEDIUM: 'bg-amber-600',
    DEEP: 'bg-purple-600',
    TRICK: 'bg-pink-600',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
        isActive
          ? `${colors[category] || 'bg-gray-600'} text-white`
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {category}
      <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>({count})</span>
    </button>
  );
};

// =============================================================================
// OFFENSIVE PLAY UI - UNIVERSAL PLAYBOOK WITH TABS
// =============================================================================

type PlayCategory = 'RUN' | 'SHORT' | 'MEDIUM' | 'DEEP' | 'TRICK';

const OffensivePlayUI: React.FC<{
  onSnapBall: (card: OffensiveCard, target: TargetPosition, modifier: OffensiveModifier) => void;
  onTimeout: () => void;
  onFourthDownChoice: (choice: FourthDownCategory | 'FAKE_FG' | 'FAKE_PUNT') => void;
}> = ({ onSnapBall, onTimeout, onFourthDownChoice }) => {
  const {
    phase,
    fieldPosition,
    clock,
    playerState,
    opponentState,
    playerRoster,
    offensiveMomentum,
  } = useCardGameStore();

  const { draftedRoster } = useGameStore();

  // Calculate roster buffs (memoized)
  const rosterBuffs = useMemo(() => {
    const roster = playerRoster || draftedRoster;
    if (!roster) return null;
    return calculateRosterBuffs(roster);
  }, [playerRoster, draftedRoster]);

  // Apply buffs to all plays (memoized)
  const allPlays = useMemo(() => {
    if (!rosterBuffs) {
      // Fallback: return plays with base stats
      return UNIVERSAL_OFFENSIVE_PLAYS.filter(p => p.category !== 'SPECIAL').map(play => ({
        id: play.id,
        name: play.name,
        description: play.description,
        playType: play.playType,
        category: play.category,
        formation: play.formation,
        successChance: play.baseSuccessChance,
        yards: play.baseYards,
        bigPlayChance: play.baseBigPlayChance,
        turnoverRisk: play.baseTurnoverRisk,
        buffIndicator: 'neutral' as const,
      }));
    }
    return UNIVERSAL_OFFENSIVE_PLAYS
      .filter(p => p.category !== 'SPECIAL')
      .map(play => applyRosterBuffs(play, rosterBuffs));
  }, [rosterBuffs]);

  // Group plays by category
  const playsByCategory = useMemo(() => {
    const categories: Record<PlayCategory, ModifiedPlay[]> = {
      RUN: [],
      SHORT: [],
      MEDIUM: [],
      DEEP: [],
      TRICK: [],
    };
    allPlays.forEach(play => {
      if (play.category in categories) {
        categories[play.category as PlayCategory].push(play);
      }
    });
    return categories;
  }, [allPlays]);

  const [activeCategory, setActiveCategory] = useState<PlayCategory>('RUN');
  const [selectedPlay, setSelectedPlay] = useState<ModifiedPlay | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetPosition | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<OffensiveModifier>('NONE');
  const [showHelp, setShowHelp] = useState(false);

  // Helper to check if play is a pass
  const isPassPlay = (playType: string) => {
    return ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(playType);
  };

  // Get locked target for the selected play
  const lockedTarget = selectedPlay ? LOCKED_TARGET_PLAYS[selectedPlay.playType as OffensivePlayType] : undefined;
  const defaultTarget = selectedPlay ? DEFAULT_PLAY_TARGETS[selectedPlay.playType as OffensivePlayType] : undefined;
  const effectiveTarget = lockedTarget || selectedTarget || defaultTarget || 'WR1';

  // Get available modifiers for the selected play
  const availableModifiers = selectedPlay
    ? getAvailableModifiers(isPassPlay(selectedPlay.playType), selectedPlay.playType === 'PLAY_ACTION')
    : [];

  // Get available targets based on play type
  const getAvailableTargets = (): TargetPosition[] => {
    if (!selectedPlay) return [];
    if (lockedTarget) return [lockedTarget]; // Locked, no choice
    if (isPassPlay(selectedPlay.playType)) {
      return ['WR1', 'WR2', 'TE', 'RB'];
    }
    return ['RB']; // Runs target RB
  };

  const availableTargets = getAvailableTargets();

  // Reset selections when play changes
  const handlePlaySelect = (play: ModifiedPlay) => {
    setSelectedPlay(play);
    setSelectedTarget(null);
    setSelectedModifier('NONE');
  };

  // Convert ModifiedPlay to OffensiveCard for the game engine
  const convertToCard = useCallback((play: ModifiedPlay): OffensiveCard => {
    return {
      id: play.id,
      category: 'OFFENSIVE',
      name: play.name,
      description: play.description,
      playType: play.playType as OffensivePlayType,
      formation: play.formation as any,
      rarity: 'COMMON',
      baseYards: play.yards,
      successChance: play.successChance,
      bigPlayChance: play.bigPlayChance,
      turnoverRisk: play.turnoverRisk,
      situationBonuses: [],
      staminaCost: 1,
      requiresLead: false,
      requiresDeficit: false,
      strongAgainst: [],
      weakAgainst: [],
      generatedBy: 'universal',
    };
  }, []);

  const handleSnap = useCallback(() => {
    if (selectedPlay) {
      const card = convertToCard(selectedPlay);
      onSnapBall(card, effectiveTarget, selectedModifier);
      setSelectedPlay(null);
      setSelectedTarget(null);
      setSelectedModifier('NONE');
    }
  }, [selectedPlay, effectiveTarget, selectedModifier, onSnapBall, convertToCard]);

  // Fourth down decision screen
  if ((phase === 'FOURTH_DOWN_DECISION' || fieldPosition.down === 4) && phase !== 'FOURTH_DOWN_DEFENSE') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Scoreboard */}
        <div className="bg-gray-900 border-b border-gray-800 p-3">
          <div className="flex justify-between items-center">
            <div className="text-white font-bold">YOU: {playerState.score}</div>
            <div className="text-gray-400">Q{clock.quarter} {clock.minutes}:{clock.seconds.toString().padStart(2, '0')}</div>
            <div className="text-white font-bold">OPP: {opponentState.score}</div>
          </div>
        </div>

        {/* Fourth Down Decision */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-amber-500 text-sm uppercase tracking-widest mb-2">4th Down Decision</div>
          <div className="text-3xl font-bold text-white mb-1">
            4th & {fieldPosition.yardsToGo}
          </div>
          <div className="text-gray-500 mb-8">
            at the {fieldPosition.yardLine > 50 ? `OPP ${100 - fieldPosition.yardLine}` : `OWN ${fieldPosition.yardLine}`}
          </div>

          <div className="space-y-3 w-full max-w-sm">
            <button
              onClick={() => onFourthDownChoice('GO_FOR_IT')}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold text-lg"
            >
              GO FOR IT
            </button>
            {fieldPosition.yardsToEndzone <= 45 && (
              <button
                onClick={() => onFourthDownChoice('FIELD_GOAL')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-lg"
              >
                FIELD GOAL ({17 + fieldPosition.yardsToEndzone} yds)
              </button>
            )}
            <button
              onClick={() => onFourthDownChoice('PUNT')}
              className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold text-lg"
            >
              PUNT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Scoreboard */}
      <div className="bg-gray-900 border-b border-gray-800 p-3">
        <div className="flex justify-between items-center">
          <div className="text-white font-bold">YOU: {playerState.score}</div>
          <div className="text-gray-400">Q{clock.quarter} {clock.minutes}:{clock.seconds.toString().padStart(2, '0')}</div>
          <div className="text-white font-bold">OPP: {opponentState.score}</div>
        </div>
      </div>

      {/* Field Position */}
      <div className="bg-green-900/30 border-b border-green-800/50 p-3 text-center">
        <div className="text-amber-400 font-bold text-lg">
          {fieldPosition.down === 1 ? '1st' : fieldPosition.down === 2 ? '2nd' : fieldPosition.down === 3 ? '3rd' : '4th'} & {fieldPosition.yardsToGo}
        </div>
        <div className="text-gray-400 text-sm">
          Ball at {fieldPosition.yardLine > 50 ? `OPP ${100 - fieldPosition.yardLine}` : `OWN ${fieldPosition.yardLine}`}
        </div>
      </div>

      {/* Team Buffs Summary */}
      {rosterBuffs && rosterBuffs.teamStrengths.length > 0 && (
        <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Team:</span>
            {rosterBuffs.teamStrengths.slice(0, 3).map((s, i) => (
              <span key={i} className="bg-green-900/50 text-green-400 px-2 py-0.5 rounded">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {(['RUN', 'SHORT', 'MEDIUM', 'DEEP', 'TRICK'] as PlayCategory[]).map(cat => (
            <CategoryTab
              key={cat}
              category={cat}
              isActive={activeCategory === cat}
              count={playsByCategory[cat].length}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
          <button onClick={() => setShowHelp(true)} className="ml-auto text-blue-400 text-sm hover:text-blue-300 px-2">?</button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-white font-bold">Universal Playbook</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <h4 className="text-amber-400 font-bold mb-1">How It Works</h4>
                <p className="text-gray-300">All teams have access to the same plays. Your roster provides buffs that modify each play's effectiveness.</p>
              </div>
              <div>
                <h4 className="text-green-400 font-bold mb-1">▲ Boosted Plays</h4>
                <p className="text-gray-300">Green arrow means your roster is good at this play type. Better success rate!</p>
              </div>
              <div>
                <h4 className="text-red-400 font-bold mb-1">▼ Weak Plays</h4>
                <p className="text-gray-300">Red arrow means your roster struggles here. Consider other options.</p>
              </div>
              <div>
                <h4 className="text-amber-400 font-bold mb-1">Targets & Modifiers</h4>
                <p className="text-gray-300">After picking a play, choose who to target (passes) and optional pre-snap adjustments.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playbook - All plays in active category */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {playsByCategory[activeCategory].map(play => (
            <PlayButton
              key={play.id}
              play={play}
              isSelected={selectedPlay?.id === play.id}
              onSelect={handlePlaySelect}
            />
          ))}
        </div>

        {/* Target Selection (when play is selected) */}
        {selectedPlay && availableTargets.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Target:</div>
            <div className="flex gap-2 flex-wrap">
              {availableTargets.map(target => (
                <button
                  key={target}
                  onClick={() => !lockedTarget && setSelectedTarget(target)}
                  disabled={!!lockedTarget}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    effectiveTarget === target
                      ? 'bg-blue-600 text-white'
                      : lockedTarget
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {target}
                </button>
              ))}
              {lockedTarget && <span className="text-gray-500 text-xs self-center ml-2">(locked)</span>}
            </div>
          </div>
        )}

        {/* Modifier Selection (when play is selected) */}
        {selectedPlay && availableModifiers.length > 1 && (
          <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">Modifier:</div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-xs">Momentum:</span>
                <div className="flex gap-0.5">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded ${i < offensiveMomentum ? 'bg-amber-500' : 'bg-gray-700'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {availableModifiers.map(mod => {
                const effect = MODIFIER_EFFECTS[mod];
                const canAfford = offensiveMomentum >= effect.momentumCost;
                const isSelected = selectedModifier === mod;
                return (
                  <button
                    key={mod}
                    onClick={() => canAfford && setSelectedModifier(mod)}
                    disabled={!canAfford && mod !== 'NONE'}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : !canAfford && mod !== 'NONE'
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                    title={effect.description}
                  >
                    <span>{mod === 'NONE' ? 'Standard' : mod.replace(/_/g, ' ')}</span>
                    {effect.momentumCost > 0 && (
                      <span className={`ml-1 ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>
                        ⚡{effect.momentumCost}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedModifier !== 'NONE' && (
              <div className="mt-2 text-xs text-purple-300">
                {MODIFIER_EFFECTS[selectedModifier].description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={onTimeout}
            disabled={playerState.timeoutsRemaining === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 disabled:opacity-50 text-sm"
          >
            TO ({playerState.timeoutsRemaining})
          </button>
          <button
            onClick={handleSnap}
            disabled={!selectedPlay}
            className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all ${
              selectedPlay
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedPlay ? `SNAP: ${selectedPlay.name}` : 'SELECT A PLAY'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DEFENSIVE PLAY UI - 3-LAYER SYSTEM
// =============================================================================

const DefensivePlayUI: React.FC<{
  onSetDefense: (card: DefensiveCard, prediction?: OffensivePlayType) => void;
  onTimeout: () => void;
  onFourthDownResponse: (response: FourthDownDefenseResponse) => void;
}> = ({ onSetDefense, onTimeout, onFourthDownResponse }) => {
  const {
    phase,
    fieldPosition,
    clock,
    playerState,
    opponentState,
    defensiveMomentum,
    getAvailableDefensiveCards,
  } = useCardGameStore();

  const cards = getAvailableDefensiveCards();

  // 3-Layer Defense State
  const [anticipation, setAnticipation] = useState<DefenseAnticipation | null>(null);
  const [scheme, setScheme] = useState<DefenseScheme | null>(null);
  const [modifier, setModifier] = useState<DefenseModifier>('NONE');
  const [showHelp, setShowHelp] = useState(false);

  // Get available schemes based on anticipation
  const availableSchemes = anticipation ? getSchemesForAnticipation(anticipation) : [];

  // Get available modifiers based on scheme
  const availableModifiers = scheme ? getModifiersForScheme(scheme) : [];

  // Check if can afford modifier
  const modifierCost = DEFENSE_MODIFIER_CONFIG[modifier].momentumCost;
  const canAffordModifier = defensiveMomentum >= modifierCost;

  // Get a card that matches our scheme (for now, pick the best one we have)
  const getMatchingCard = useCallback((): DefensiveCard | null => {
    if (!scheme || cards.length === 0) return null;

    // Try to find a card that matches the scheme's strengths
    const schemeConfig = DEFENSE_SCHEME_CONFIG[scheme];

    // Sort cards by how well they match the scheme
    const sortedCards = [...cards].sort((a, b) => {
      // If scheme is pass-focused, prioritize pass defense
      if (schemeConfig.vsPassRating > schemeConfig.vsRunRating) {
        return b.passDefenseRating - a.passDefenseRating;
      }
      // If scheme is run-focused, prioritize run stopping
      return b.runStopRating - a.runStopRating;
    });

    return sortedCards[0];
  }, [scheme, cards]);

  const handleSetDefense = useCallback(() => {
    const card = getMatchingCard();
    if (card && scheme) {
      // Deduct modifier cost from momentum
      // (This would be handled in the store normally)
      onSetDefense(card, undefined);
      // Reset state
      setAnticipation(null);
      setScheme(null);
      setModifier('NONE');
    }
  }, [getMatchingCard, scheme, onSetDefense]);

  // Reset downstream selections when upstream changes
  const handleAnticipationChange = (ant: DefenseAnticipation) => {
    setAnticipation(ant);
    setScheme(null);
    setModifier('NONE');
  };

  const handleSchemeChange = (sch: DefenseScheme) => {
    setScheme(sch);
    setModifier('NONE');
  };

  // Fourth down response screen
  if (phase === 'FOURTH_DOWN_DEFENSE') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Scoreboard */}
        <div className="bg-gray-900 border-b border-gray-800 p-3">
          <div className="flex justify-between items-center">
            <div className="text-white font-bold">YOU: {playerState.score}</div>
            <div className="text-gray-400">Q{clock.quarter} {clock.minutes}:{clock.seconds.toString().padStart(2, '0')}</div>
            <div className="text-white font-bold">OPP: {opponentState.score}</div>
          </div>
        </div>

        {/* Fourth Down Response */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-red-500 text-sm uppercase tracking-widest mb-2">Opponent's 4th Down</div>
          <div className="text-3xl font-bold text-white mb-1">
            4th & {fieldPosition.yardsToGo}
          </div>
          <div className="text-gray-500 mb-8">Choose your response</div>

          <div className="space-y-3 w-full max-w-sm">
            <button
              onClick={() => onFourthDownResponse('CONSERVATIVE_STOP')}
              className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold text-lg"
            >
              CONSERVATIVE DEFENSE
            </button>
            <button
              onClick={() => onFourthDownResponse('AGGRESSIVE_STOP')}
              className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold text-lg"
            >
              AGGRESSIVE STOP
            </button>
            <button
              onClick={() => onFourthDownResponse('EXPECT_FAKE')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-lg"
            >
              EXPECT FAKE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Scoreboard */}
      <div className="bg-gray-900 border-b border-gray-800 p-3">
        <div className="flex justify-between items-center">
          <div className="text-white font-bold">YOU: {playerState.score}</div>
          <div className="text-gray-400">Q{clock.quarter} {clock.minutes}:{clock.seconds.toString().padStart(2, '0')}</div>
          <div className="text-white font-bold">OPP: {opponentState.score}</div>
        </div>
      </div>

      {/* Field Position */}
      <div className="bg-red-900/30 border-b border-red-800/50 p-4 text-center">
        <div className="text-red-400 font-bold text-lg">DEFENSE</div>
        <div className="text-white">
          {fieldPosition.down === 1 ? '1st' : fieldPosition.down === 2 ? '2nd' : fieldPosition.down === 3 ? '3rd' : '4th'} & {fieldPosition.yardsToGo}
        </div>
        <div className="text-gray-400 text-sm">
          Ball at {fieldPosition.yardLine > 50 ? `OPP ${100 - fieldPosition.yardLine}` : `OWN ${fieldPosition.yardLine}`}
        </div>
      </div>

      {/* Momentum */}
      <div className="bg-gray-900 border-b border-gray-800 p-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Momentum:</span>
            <div className="flex gap-1">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded ${i < defensiveMomentum ? 'bg-red-500' : 'bg-gray-700'}`}
                />
              ))}
            </div>
          </div>
          <button onClick={() => setShowHelp(true)} className="text-blue-400 text-xs hover:text-blue-300">? Help</button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-white font-bold">3-Layer Defense System</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <h4 className="text-red-400 font-bold mb-1">Layer 1: Anticipate</h4>
                <p className="text-gray-300">Predict if offense will run or pass. Stack the box vs runs, drop DBs vs passes, or stay balanced.</p>
              </div>
              <div>
                <h4 className="text-red-400 font-bold mb-1">Layer 2: Scheme</h4>
                <p className="text-gray-300">Pick your coverage or front. Cover 0-4 for pass defense, Bear/Under/Over fronts for run defense, or blitz packages for pressure.</p>
              </div>
              <div>
                <h4 className="text-red-400 font-bold mb-1">Layer 3: Modifier</h4>
                <p className="text-gray-300">Optional adjustments that cost momentum. Spy the QB, bracket a receiver, pinch the D-line, etc.</p>
              </div>
              <div>
                <h4 className="text-red-400 font-bold mb-1">Strategy Tips</h4>
                <ul className="text-gray-300 list-disc list-inside space-y-1">
                  <li>Correct anticipation gives +15% bonus</li>
                  <li>Wrong anticipation gives -10% penalty</li>
                  <li>Blitzes are high risk/reward</li>
                  <li>Save momentum modifiers for key downs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main 3-Layer Selection Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">

        {/* LAYER 1: ANTICIPATE */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">1</span>
            <span className="text-white font-bold">ANTICIPATE</span>
            <span className="text-gray-500 text-xs">What are they calling?</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['RUN_HEAVY', 'BALANCED', 'PASS_HEAVY'] as DefenseAnticipation[]).map(ant => {
              const config = ANTICIPATION_CONFIG[ant];
              const isSelected = anticipation === ant;
              return (
                <button
                  key={ant}
                  onClick={() => handleAnticipationChange(ant)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-900/40'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="text-white font-bold text-sm">{config.name}</div>
                  <div className="text-gray-400 text-xs mt-1">{config.description}</div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className={config.vsRunBonus > 0 ? 'text-green-400' : config.vsRunBonus < 0 ? 'text-red-400' : 'text-gray-500'}>
                      Run: {config.vsRunBonus > 0 ? '+' : ''}{config.vsRunBonus}%
                    </span>
                    <span className={config.vsPassBonus > 0 ? 'text-green-400' : config.vsPassBonus < 0 ? 'text-red-400' : 'text-gray-500'}>
                      Pass: {config.vsPassBonus > 0 ? '+' : ''}{config.vsPassBonus}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* LAYER 2: SCHEME */}
        {anticipation && (
          <div className="bg-gray-900/50 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">2</span>
              <span className="text-white font-bold">SCHEME</span>
              <span className="text-gray-500 text-xs">Coverage or Front</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {availableSchemes.map(sch => {
                const config = DEFENSE_SCHEME_CONFIG[sch];
                const isSelected = scheme === sch;
                const categoryColors: Record<string, string> = {
                  COVERAGE: 'bg-blue-900/30 border-blue-700',
                  PRESSURE: 'bg-orange-900/30 border-orange-700',
                  RUN_STOP: 'bg-green-900/30 border-green-700',
                  SPECIALTY: 'bg-purple-900/30 border-purple-700',
                };
                return (
                  <button
                    key={sch}
                    onClick={() => handleSchemeChange(sch)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-red-500 bg-red-900/40'
                        : `${categoryColors[config.category] || 'border-gray-700 bg-gray-800'} hover:border-gray-500`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-white font-bold text-sm">{config.name}</div>
                      {config.blitzChance > 50 && <span className="text-orange-400 text-xs">BLITZ</span>}
                    </div>
                    <div className="text-gray-400 text-xs mt-1 line-clamp-2">{config.description}</div>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-green-400">Run: {config.vsRunRating}%</span>
                      <span className="text-blue-400">Pass: {config.vsPassRating}%</span>
                    </div>
                    {config.bigPlayRisk > 20 && (
                      <div className="text-yellow-500 text-xs mt-1">High risk: {config.bigPlayRisk}% big play</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LAYER 3: MODIFIER */}
        {scheme && (
          <div className="bg-gray-900/50 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">3</span>
              <span className="text-white font-bold">MODIFIER</span>
              <span className="text-gray-500 text-xs">Optional adjustment (costs momentum)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableModifiers.map(mod => {
                const config = DEFENSE_MODIFIER_CONFIG[mod];
                const isSelected = modifier === mod;
                const canAfford = defensiveMomentum >= config.momentumCost;
                return (
                  <button
                    key={mod}
                    onClick={() => canAfford && setModifier(mod)}
                    disabled={!canAfford && mod !== 'NONE'}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-red-500 bg-red-900/40'
                        : !canAfford && mod !== 'NONE'
                          ? 'border-gray-800 bg-gray-900 opacity-50 cursor-not-allowed'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-white font-bold text-sm">{config.name}</div>
                      {config.momentumCost > 0 && (
                        <span className={`text-xs ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                          -{config.momentumCost} Mom
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs mt-1 line-clamp-2">{config.description}</div>
                    {config.specialEffect && (
                      <div className="text-purple-400 text-xs mt-1">{config.specialEffect}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection Summary */}
        {scheme && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Your Call</div>
            <div className="text-white font-bold">
              {anticipation && ANTICIPATION_CONFIG[anticipation].name}
              {' → '}
              {scheme && DEFENSE_SCHEME_CONFIG[scheme].name}
              {modifier !== 'NONE' && ` + ${DEFENSE_MODIFIER_CONFIG[modifier].name}`}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 space-y-3">
        <button
          onClick={onTimeout}
          disabled={playerState.timeoutsRemaining === 0}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 disabled:opacity-50"
        >
          Timeout ({playerState.timeoutsRemaining})
        </button>
        <button
          onClick={handleSetDefense}
          disabled={!scheme || (modifier !== 'NONE' && !canAffordModifier)}
          className={`w-full py-4 rounded-lg text-lg font-bold transition-all ${
            scheme && (modifier === 'NONE' || canAffordModifier)
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {!anticipation ? 'SELECT ANTICIPATION' :
           !scheme ? 'SELECT SCHEME' :
           modifier !== 'NONE' && !canAffordModifier ? 'NOT ENOUGH MOMENTUM' :
           'SET DEFENSE'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN CONTROLLER
// =============================================================================

export const CardGameController: React.FC<CardGameControllerProps> = ({
  onGameEnd,
  onBack,
}) => {
  const {
    phase,
    isInitialized,
    playerState,
    opponentState,
    playerRoster,
    opponentRoster,
    lastPlayedSelection,
    lastPlayWasPlayerOffense,
    possessionState,
    fourthDownState,
    opponentDeck,
    startGame,
    resetGame,
    selectOffensiveCard,
    selectDefensiveCard,
    executePlay,
    executeFourthDown,
    setPhase,
    isPlayerOnOffense,
    setFourthDownOffenseChoice,
    setFourthDownDefenseResponse,
    handleExtraPoint,
    // Pregame
    pregameModifiers,
    pregameCards,
    pregamePhase,
    playerIsHome,
    initializePregame,
    revealPregameCard,
    completePregame,
  } = useCardGameStore();

  const { draftedRoster, draftedDeck, userTeamId } = useGameStore();
  const { getCurrentUserGame } = useSeasonStore();

  const [lastResult, setLastResult] = useState<PlayResult | FourthDownResult | null>(null);

  // Track if we've started initialization
  const [initStarted, setInitStarted] = useState(false);

  // Initialize pregame on mount
  useEffect(() => {
    if (!initStarted && !isInitialized && draftedRoster && draftedDeck && pregamePhase === 'NOT_STARTED') {
      setInitStarted(true);
      initializePregame();
    }
  }, [initStarted, isInitialized, draftedRoster, draftedDeck, pregamePhase, initializePregame]);

  // Handle pregame completion - now start the actual game
  const handlePregameComplete = useCallback(() => {
    if (!draftedRoster || !draftedDeck || !pregameModifiers) return;

    // Get opponent info
    const currentGame = getCurrentUserGame();
    const opponentId = currentGame
      ? (currentGame.homeTeamId === userTeamId ? currentGame.awayTeamId : currentGame.homeTeamId)
      : DEFAULT_TEAMS[0].info.id;

    // Generate opponent roster and deck
    const opponentRoster = generateAIRoster(opponentId, 'AVERAGE');
    const generatedOpponentDeck = buildDeck(opponentRoster);

    // Determine who receives based on pregame coin toss
    const playerReceivesFirst = (pregameModifiers.receivingFirst === 'HOME') === playerIsHome;

    // Complete pregame (applies starting fatigue etc)
    completePregame();

    // Start the game with pregame modifiers already applied
    startGame(
      draftedRoster,
      opponentRoster,
      draftedDeck,
      generatedOpponentDeck,
      playerReceivesFirst
    );
  }, [draftedRoster, draftedDeck, pregameModifiers, userTeamId, getCurrentUserGame, playerIsHome, completePregame, startGame]);

  // Handle snap ball (offensive play)
  const handleSnapBall = useCallback((card: OffensiveCard, target: TargetPosition, modifier: OffensiveModifier) => {
    selectOffensiveCard(card, target, modifier);

    // CPU selects a random defense card
    const cpuDefenseCards = opponentDeck?.hand.defensiveCards || [];
    if (cpuDefenseCards.length > 0) {
      const randomDefense = cpuDefenseCards[Math.floor(Math.random() * cpuDefenseCards.length)];
      // CPU randomly picks a shade (who they think offense targets)
      const shades: Array<'WR1' | 'WR2' | 'TE' | 'RB' | 'NONE'> = ['WR1', 'WR2', 'TE', 'RB', 'NONE'];
      const randomShade = shades[Math.floor(Math.random() * shades.length)];
      selectDefensiveCard(randomDefense, undefined, randomShade);
    }

    // Execute the play after both cards are selected
    const result = executePlay();
    if (result) {
      setLastResult(result);
      setPhase('PLAY_RESULT');
    }
  }, [selectOffensiveCard, selectDefensiveCard, opponentDeck, executePlay, setPhase]);

  // Handle set defense
  const handleSetDefense = useCallback((card: DefensiveCard, prediction?: OffensivePlayType) => {
    selectDefensiveCard(card, prediction);

    // Get game state for smart AI selection
    const gameState = useCardGameStore.getState();
    const { fieldPosition, clock, playerState, opponentState } = gameState;

    // CPU selects offense using situational AI
    const cpuOffenseCards = opponentDeck?.hand.offensiveCards || [];
    if (cpuOffenseCards.length > 0) {
      const aiSelection = selectAIOffenseCard(cpuOffenseCards, {
        down: fieldPosition.down,
        yardsToGo: fieldPosition.yardsToGo,
        yardsToEndzone: fieldPosition.yardsToEndzone,
        scoreDifferential: opponentState.score - playerState.score, // From AI's perspective
        quarter: typeof clock.quarter === 'number' ? clock.quarter : 5,
        minutes: clock.minutes,
      });

      if (aiSelection) {
        selectOffensiveCard(aiSelection.card, aiSelection.target, aiSelection.modifier);
      }
    }

    // Execute the play after both cards are selected
    const result = executePlay();
    if (result) {
      setLastResult(result);
      setPhase('PLAY_RESULT');
    }
  }, [selectDefensiveCard, selectOffensiveCard, opponentDeck, executePlay, setPhase]);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    // TODO: Implement timeout logic
    console.log('Timeout called');
  }, []);

  // Handle fourth down choice (offense)
  const handleFourthDownChoice = useCallback((choice: FourthDownCategory | 'FAKE_FG' | 'FAKE_PUNT') => {
    const isFaking = choice === 'FAKE_FG' || choice === 'FAKE_PUNT';
    const category = isFaking
      ? (choice === 'FAKE_FG' ? 'FIELD_GOAL' : 'PUNT')
      : (choice as FourthDownCategory);

    setFourthDownOffenseChoice(category, isFaking);

    // If player is on offense, CPU auto-responds
    if (isPlayerOnOffense()) {
      // CPU picks a random defense response
      const responses: FourthDownDefenseResponse[] = ['CONSERVATIVE_STOP', 'AGGRESSIVE_STOP', 'EXPECT_FAKE'];
      const cpuResponse = responses[Math.floor(Math.random() * responses.length)];

      // Execute fourth down directly
      const result = executeFourthDown(choice, cpuResponse);
      if (result) {
        setLastResult(result);
        setPhase('PLAY_RESULT');
      }
    } else {
      // Player is on defense - wait for their response
      setPhase('FOURTH_DOWN_DEFENSE');
    }
  }, [isPlayerOnOffense, setFourthDownOffenseChoice, executeFourthDown, setPhase]);

  // Handle fourth down response (defense)
  const handleFourthDownResponse = useCallback((response: FourthDownDefenseResponse) => {
    setFourthDownDefenseResponse(response);
    // Execute fourth down with the stored offense choice
    const offenseChoice = fourthDownState?.offenseCategory || 'GO_FOR_IT';
    const isFaking = fourthDownState?.offenseIsFaking || false;
    const choice = isFaking
      ? (offenseChoice === 'FIELD_GOAL' ? 'FAKE_FG' : 'FAKE_PUNT')
      : offenseChoice;
    const result = executeFourthDown(choice, response);
    if (result) {
      setLastResult(result);
      setPhase('PLAY_RESULT');
    }
  }, [fourthDownState, setFourthDownDefenseResponse, executeFourthDown, setPhase]);

  // Handle continue after result
  const handleContinue = useCallback(() => {
    setLastResult(null);

    // Check for game end
    if (phase === 'GAME_OVER') {
      onGameEnd?.(playerState.score, opponentState.score);
      return;
    }

    // If opponent scored TD and XP is pending, auto-kick XP for them
    if (possessionState.xpPending && !lastPlayWasPlayerOffense) {
      // CPU always kicks XP (95% success rate handled in store)
      handleExtraPoint('XP');
      return;
    }

    // Set phase based on possession
    if (isPlayerOnOffense()) {
      setPhase('OFFENSE_SELECT');
    } else {
      setPhase('DEFENSE_SELECT');
    }
  }, [phase, isPlayerOnOffense, setPhase, playerState.score, opponentState.score, onGameEnd, possessionState.xpPending, lastPlayWasPlayerOffense, handleExtraPoint]);

  // Handle XP choice
  const handleXPChoice = useCallback((choice: 'XP' | 'TWO_POINT') => {
    handleExtraPoint(choice);
  }, [handleExtraPoint]);

  // Pregame presentation
  if (phase === 'PREGAME' && pregameCards.length > 0 && pregameModifiers) {
    return (
      <PregamePresentation
        cards={pregameCards}
        onReveal={revealPregameCard}
        onComplete={handlePregameComplete}
        receivingFirst={pregameModifiers.receivingFirst}
        playerIsHome={playerIsHome}
      />
    );
  }

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-500 text-2xl font-bold mb-4">KICKOFF</div>
          <div className="text-gray-400">Preparing game...</div>
          {!draftedRoster && (
            <div className="text-red-400 mt-4">
              No roster found. Please complete the draft first.
            </div>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Game over
  if (phase === 'GAME_OVER') {
    const playerWon = playerState.score > opponentState.score;
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className={`text-4xl font-bold mb-4 ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
            {playerWon ? 'VICTORY!' : 'DEFEAT'}
          </div>
          <div className="text-6xl font-bold text-white mb-8">
            {playerState.score} - {opponentState.score}
          </div>
          <button
            onClick={() => {
              resetGame();
              onGameEnd?.(playerState.score, opponentState.score);
            }}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold text-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Play result screen
  if (phase === 'PLAY_RESULT' && lastResult) {
    // Use lastPlayedSelection which was saved before playSelection was reset
    const offenseCard = lastPlayedSelection?.offenseCard as OffensiveCard | null;
    const defenseCard = lastPlayedSelection?.defenseCard as DefensiveCard | null;

    // Get actual player names from the roster that was on offense
    const wasPlayerOffense = lastPlayWasPlayerOffense ?? isPlayerOnOffense();
    const offRoster = wasPlayerOffense ? playerRoster : opponentRoster;
    const offensePlayerNames = offRoster ? {
      qb: offRoster.offense.QB.lastName,
      rb: offRoster.offense.RB.lastName,
      wr1: offRoster.offense.WR1.lastName,
      wr2: offRoster.offense.WR2.lastName,
      te: offRoster.offense.TE.lastName,
    } : undefined;

    return (
      <PlayResultDisplay
        result={lastResult}
        offensePlayType={offenseCard?.playType}
        targetPosition={lastPlayedSelection?.offenseTarget || undefined}
        defenseCard={defenseCard || undefined}
        defenseShade={lastPlayedSelection?.defenseShade || undefined}
        isPlayerOffense={wasPlayerOffense}
        offensePlayerNames={offensePlayerNames}
        onContinue={handleContinue}
        onXPChoice={handleXPChoice}
      />
    );
  }

  // Main game screens based on possession
  if (isPlayerOnOffense()) {
    return (
      <OffensivePlayUI
        onSnapBall={handleSnapBall}
        onTimeout={handleTimeout}
        onFourthDownChoice={handleFourthDownChoice}
      />
    );
  }

  return (
    <DefensivePlayUI
      onSetDefense={handleSetDefense}
      onTimeout={handleTimeout}
      onFourthDownResponse={handleFourthDownResponse}
    />
  );
};

export default CardGameController;
