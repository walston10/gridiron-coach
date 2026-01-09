/**
 * ILLEGAL MOTION - Offensive Play UI
 *
 * Main gameplay screen when player has the ball.
 * Portrait layout, dark theme with amber accents.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCardGameStore, MOMENTUM_CONFIG } from '../../stores/cardGameStore';
import type { OffensiveCard, CardRarity, OffensivePlayType, DefensivePlayType } from '../../types/card.types';
import type { FourthDownCategory, TargetPosition } from '../../types/game.types';
import { LOCKED_TARGET_PLAYS, DEFAULT_PLAY_TARGETS } from '../../types/game.types';
import type { Synergy } from '../../engine/playResolver';
import { getCounterModifier, getActiveSynergies } from '../../engine/playResolver';

// =============================================================================
// TYPES
// =============================================================================

interface OffensivePlayProps {
  onSnapBall: (card: OffensiveCard) => void;
  onTimeout: () => void;
  onFourthDownChoice: (choice: FourthDownCategory | 'FAKE_FG' | 'FAKE_PUNT') => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RARITY_COLORS: Record<CardRarity, { bg: string; border: string; glow: string }> = {
  COMMON: { bg: 'bg-gray-700', border: 'border-gray-600', glow: '' },
  UNCOMMON: { bg: 'bg-green-900/50', border: 'border-green-600', glow: '' },
  RARE: { bg: 'bg-blue-900/50', border: 'border-blue-500', glow: 'shadow-blue-500/30' },
  ELITE: { bg: 'bg-purple-900/50', border: 'border-purple-500', glow: 'shadow-purple-500/50 shadow-lg' },
  LEGENDARY: { bg: 'bg-amber-900/50', border: 'border-amber-400', glow: 'shadow-amber-400/60 shadow-xl animate-pulse' },
};

const PLAY_TYPE_ICONS: Record<OffensivePlayType, string> = {
  SHORT_PASS: '📡',
  MEDIUM_PASS: '🎯',
  DEEP_PASS: '🚀',
  SCREEN: '🔄',
  PLAY_ACTION: '🎭',
  INSIDE_RUN: '💪',
  OUTSIDE_RUN: '🏃',
  POWER_RUN: '🔨',
  DRAW: '🎪',
  TRICK_PLAY: '✨',
  QB_RUN: '⚡',
  SPIKE: '⏱️',
  KNEEL: '🧎',
};

const PLAY_TYPE_LABELS: Record<OffensivePlayType, string> = {
  SHORT_PASS: 'Short Pass',
  MEDIUM_PASS: 'Medium Pass',
  DEEP_PASS: 'Deep Pass',
  SCREEN: 'Screen',
  PLAY_ACTION: 'Play Action',
  INSIDE_RUN: 'Inside Run',
  OUTSIDE_RUN: 'Outside Run',
  POWER_RUN: 'Power Run',
  DRAW: 'Draw',
  TRICK_PLAY: 'Trick Play',
  QB_RUN: 'QB Run',
  SPIKE: 'Spike',
  KNEEL: 'Kneel',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const OffensivePlay: React.FC<OffensivePlayProps> = ({
  onSnapBall,
  onTimeout,
  onFourthDownChoice,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetPosition | null>(null);
  const [showMatchups, setShowMatchups] = useState(false);
  const [showTendencies, setShowTendencies] = useState(false);
  const [activeSynergies, setActiveSynergies] = useState<Synergy[]>([]);

  const {
    clock,
    fieldPosition,
    playerState,
    opponentState,
    offensiveMomentum,
    playerTendencies,
    opponentTendencies,
    playSelection,
    fourthDownState,
    currentDrive,
    getAvailableOffensiveCards,
    selectOffensiveCard,
  } = useCardGameStore();

  const availableCards = getAvailableOffensiveCards();
  const selectedCard = useMemo(
    () => availableCards.find(c => c.id === selectedCardId) || null,
    [availableCards, selectedCardId]
  );

  // Calculate synergies when card is selected
  useEffect(() => {
    if (selectedCard) {
      const synergies = getActiveSynergies(playerTendencies, selectedCard);
      setActiveSynergies(synergies);
    } else {
      setActiveSynergies([]);
    }
  }, [selectedCard, playerTendencies]);

  // Determine if target is locked for selected play
  const lockedTarget = useMemo(() => {
    if (!selectedCard) return null;
    return LOCKED_TARGET_PLAYS[selectedCard.playType] || null;
  }, [selectedCard]);

  // Default target based on play type
  const defaultTarget = useMemo(() => {
    if (!selectedCard) return null;
    return DEFAULT_PLAY_TARGETS[selectedCard.playType] || 'WR1';
  }, [selectedCard]);

  // Effective target (locked > selected > default)
  const effectiveTarget = useMemo(() => {
    if (lockedTarget) return lockedTarget;
    if (selectedTarget) return selectedTarget;
    return defaultTarget;
  }, [lockedTarget, selectedTarget, defaultTarget]);

  // Reset target when card changes
  useEffect(() => {
    setSelectedTarget(null);
  }, [selectedCardId]);

  // Handle card selection
  const handleCardSelect = useCallback((card: OffensiveCard) => {
    if (selectedCardId === card.id) {
      setSelectedCardId(null);
      setSelectedTarget(null);
    } else {
      setSelectedCardId(card.id);
      setSelectedTarget(null);
    }
  }, [selectedCardId]);

  // Handle target selection
  const handleTargetSelect = useCallback((target: TargetPosition) => {
    if (!lockedTarget) {
      setSelectedTarget(target);
    }
  }, [lockedTarget]);

  // Handle snap
  const handleSnap = useCallback(() => {
    if (selectedCard && effectiveTarget) {
      selectOffensiveCard(selectedCard, effectiveTarget);
      onSnapBall(selectedCard);
    }
  }, [selectedCard, effectiveTarget, selectOffensiveCard, onSnapBall]);

  // Is 4th down?
  const isFourthDown = fieldPosition.down === 4;

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* === SCORE BAR === */}
      <ScoreBar
        playerScore={playerState.score}
        opponentScore={opponentState.score}
        clock={clock}
        fieldPosition={fieldPosition}
        timeoutsRemaining={playerState.timeoutsRemaining}
      />

      {/* === DRIVE STATUS === */}
      <DriveStatusBar
        plays={currentDrive.plays.length}
        yards={currentDrive.yardsGained}
        offensiveMomentum={offensiveMomentum}
        fatigue={playerState.fatigue}
      />

      {/* === ACTIVE BONUSES === */}
      {activeSynergies.length > 0 && (
        <ActiveBonusesBar synergies={activeSynergies} />
      )}

      {/* === MAIN CONTENT AREA === */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Defense Intel */}
        <DefenseIntelPanel
          defenseCard={playSelection.defenseCard}
          defensePrediction={playSelection.defensePrediction}
          opponentTendencies={opponentTendencies}
        />

        {/* Collapsible Panels */}
        <CollapsiblePanel
          title="Matchups"
          isOpen={showMatchups}
          onToggle={() => setShowMatchups(!showMatchups)}
        >
          <MatchupsPanel />
        </CollapsiblePanel>

        <CollapsiblePanel
          title="Your Tendencies"
          isOpen={showTendencies}
          onToggle={() => setShowTendencies(!showTendencies)}
        >
          <TendenciesPanel tendencies={playerTendencies} />
        </CollapsiblePanel>

        {/* Owner Whisper */}
        <OwnerWhisper momentum={offensiveMomentum} />

        {/* Selected Card Detail */}
        {selectedCard && (
          <SelectedCardDetail
            card={selectedCard}
            synergies={activeSynergies}
            defensePlayType={playSelection.defenseCard?.playType as DefensivePlayType | undefined}
            selectedTarget={effectiveTarget}
            lockedTarget={lockedTarget}
            onTargetSelect={handleTargetSelect}
            onSnap={handleSnap}
          />
        )}
      </div>

      {/* === ACTION BUTTONS === */}
      <ActionButtons
        onTimeout={onTimeout}
        onAudible={() => {}}
        onDraw={() => {}}
        timeoutsRemaining={playerState.timeoutsRemaining}
        momentum={offensiveMomentum}
      />

      {/* === CARD HAND === */}
      <CardHand
        cards={availableCards}
        selectedCardId={selectedCardId}
        onSelectCard={handleCardSelect}
        fatigue={playerState.fatigue}
      />

      {/* === 4TH DOWN OVERLAY === */}
      {isFourthDown && fourthDownState && (
        <FourthDownOverlay
          fieldPosition={fieldPosition}
          fourthDownState={fourthDownState}
          onChoice={onFourthDownChoice}
          onGoForIt={() => {}}
        />
      )}
    </div>
  );
};

// =============================================================================
// SCORE BAR
// =============================================================================

interface ScoreBarProps {
  playerScore: number;
  opponentScore: number;
  clock: { quarter: number | 'OT'; minutes: number; seconds: number };
  fieldPosition: { down: number; yardsToGo: number; yardLine: number; yardsToEndzone: number };
  timeoutsRemaining: number;
}

const ScoreBar: React.FC<ScoreBarProps> = ({
  playerScore,
  opponentScore,
  clock,
  fieldPosition,
  timeoutsRemaining,
}) => {
  const quarterLabel = clock.quarter === 'OT' ? 'OT' : `Q${clock.quarter}`;
  const timeLabel = `${clock.minutes}:${String(clock.seconds).padStart(2, '0')}`;
  const downLabel = `${fieldPosition.down}${getOrdinalSuffix(fieldPosition.down)} & ${fieldPosition.yardsToGo}`;
  const positionLabel = fieldPosition.yardLine > 50
    ? `OPP ${100 - fieldPosition.yardLine}`
    : fieldPosition.yardLine === 50
    ? '50'
    : `OWN ${fieldPosition.yardLine}`;

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      {/* Score Row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-amber-500">{playerScore}</span>
          <span className="text-gray-500">-</span>
          <span className="text-2xl font-bold text-gray-400">{opponentScore}</span>
        </div>

        <div className="text-center">
          <div className="text-lg font-mono text-white">{timeLabel}</div>
          <div className="text-xs text-gray-500">{quarterLabel}</div>
        </div>

        <div className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-4 rounded-sm ${
                i < timeoutsRemaining ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Down & Distance Row */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-bold">{downLabel}</span>
          <span className="text-gray-500">at</span>
          <span className="text-white font-medium">{positionLabel}</span>
        </div>
        <div className="text-sm text-gray-400">
          {fieldPosition.yardsToEndzone} to go
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DRIVE STATUS BAR
// =============================================================================

interface DriveStatusBarProps {
  plays: number;
  yards: number;
  offensiveMomentum: number;
  fatigue: number;
}

const DriveStatusBar: React.FC<DriveStatusBarProps> = ({
  plays,
  yards,
  offensiveMomentum,
  fatigue,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          Drive: <span className="text-white">{plays} plays</span>, <span className="text-white">{yards} yds</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Momentum */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">MOM</span>
          <div className="flex gap-0.5">
            {[...Array(MOMENTUM_CONFIG.MAX)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-3 rounded-sm transition-colors ${
                  i < offensiveMomentum
                    ? offensiveMomentum >= 5 ? 'bg-green-500' : offensiveMomentum >= 3 ? 'bg-amber-500' : 'bg-red-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Fatigue */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">FAT</span>
          <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                fatigue > 70 ? 'bg-red-500' : fatigue > 40 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${fatigue}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ACTIVE BONUSES BAR
// =============================================================================

interface ActiveBonusesBarProps {
  synergies: Synergy[];
}

const ActiveBonusesBar: React.FC<ActiveBonusesBarProps> = ({ synergies }) => {
  return (
    <div className="px-3 py-2 bg-gradient-to-r from-amber-900/30 to-transparent border-b border-amber-800/30">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs text-amber-500 uppercase tracking-wider shrink-0">Active</span>
        {synergies.map((synergy, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full text-xs text-amber-400 animate-pulse shrink-0"
          >
            <span>✨</span>
            <span>{synergy.name}</span>
            <span className="text-amber-300 font-bold">+{synergy.modifier}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// DEFENSE INTEL PANEL
// =============================================================================

interface DefenseIntelPanelProps {
  defenseCard: unknown;
  defensePrediction: OffensivePlayType | null;
  opponentTendencies: { predictability: number; recentPlays: OffensivePlayType[] };
}

const DefenseIntelPanel: React.FC<DefenseIntelPanelProps> = ({
  defenseCard,
  defensePrediction,
  opponentTendencies,
}) => {
  return (
    <div className="bg-gray-900/80 rounded-lg border border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Defense Intel</h3>
        <div className="text-xs text-gray-600">DC: Mike Johnson</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Visible Card */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Showing</div>
          {defenseCard ? (
            <div className="text-sm text-white font-medium">
              {(defenseCard as { name?: string }).name || 'Unknown'}
            </div>
          ) : (
            <div className="text-sm text-amber-500">Zone Coverage</div>
          )}
        </div>

        {/* Hidden Card */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Hidden</div>
          <div className="text-sm text-gray-600 font-mono">???</div>
        </div>
      </div>

      {/* Prediction Warning */}
      {defensePrediction && (
        <div className="mt-2 p-2 bg-red-900/30 rounded border border-red-800/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-500">⚠️</span>
            <span className="text-red-400">
              Reading you as: <span className="font-bold">{PLAY_TYPE_LABELS[defensePrediction]}</span>
            </span>
          </div>
        </div>
      )}

      {/* Tendency Warning */}
      {opponentTendencies.predictability > 60 && (
        <div className="mt-2 text-xs text-amber-500">
          They're reading your tendencies ({opponentTendencies.predictability}% predictable)
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COLLAPSIBLE PANEL
// =============================================================================

interface CollapsiblePanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="bg-gray-900/60 rounded-lg border border-gray-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-400">{title}</span>
        <span className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-gray-800/50">
          {children}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MATCHUPS PANEL
// =============================================================================

const MatchupsPanel: React.FC = () => {
  // Placeholder matchup data
  const matchups = [
    { position: 'WR1', name: 'J. Chase', vs: 'M. Humphrey', advantage: 'WR' },
    { position: 'WR2', name: 'T. Higgins', vs: 'M. Peters', advantage: 'CB' },
    { position: 'TE', name: 'T. Kelce', vs: 'Zone', advantage: 'TE' },
  ];

  return (
    <div className="pt-2 space-y-2">
      {matchups.map((matchup, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-8">{matchup.position}</span>
            <span className="text-white">{matchup.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">vs</span>
            <span className="text-gray-400">{matchup.vs}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
              matchup.advantage === 'WR' || matchup.advantage === 'TE'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-red-900/50 text-red-400'
            }`}>
              {matchup.advantage === 'WR' || matchup.advantage === 'TE' ? '↑' : '↓'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// TENDENCIES PANEL
// =============================================================================

interface TendenciesPanelProps {
  tendencies: {
    runPassRatio: number;
    shortDeepRatio: number;
    predictability: number;
  };
}

const TendenciesPanel: React.FC<TendenciesPanelProps> = ({ tendencies }) => {
  return (
    <div className="pt-2 space-y-3">
      {/* Run/Pass Ratio */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Run</span>
          <span>Pass</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-blue-600"
            style={{ width: `${tendencies.runPassRatio}%` }}
          />
        </div>
      </div>

      {/* Short/Deep Ratio */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Short</span>
          <span>Deep</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-purple-600"
            style={{ width: `${tendencies.shortDeepRatio}%` }}
          />
        </div>
      </div>

      {/* Predictability */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Predictability</span>
        <span className={`text-sm font-bold ${
          tendencies.predictability > 60 ? 'text-red-400' :
          tendencies.predictability > 40 ? 'text-amber-400' : 'text-green-400'
        }`}>
          {tendencies.predictability}%
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// OWNER WHISPER
// =============================================================================

interface OwnerWhisperProps {
  momentum: number;
}

const OwnerWhisper: React.FC<OwnerWhisperProps> = ({ momentum }) => {
  // Only show if momentum is low or high
  if (momentum >= 2 && momentum <= 4) return null;

  const message = momentum < 2
    ? "Maybe time for something... unconventional? 😈"
    : "They're on their heels. Strike hard! 💪";

  return (
    <div className="flex items-start gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
      <div className="text-lg">👔</div>
      <div>
        <div className="text-xs text-gray-500 mb-0.5">Owner</div>
        <div className="text-sm text-gray-400 italic">{message}</div>
      </div>
    </div>
  );
};

// =============================================================================
// SELECTED CARD DETAIL
// =============================================================================

interface SelectedCardDetailProps {
  card: OffensiveCard;
  synergies: Synergy[];
  defensePlayType?: DefensivePlayType;
  selectedTarget: TargetPosition | null;
  lockedTarget: TargetPosition | null;
  onTargetSelect: (target: TargetPosition) => void;
  onSnap: () => void;
}

const TARGET_OPTIONS: { position: TargetPosition; label: string; icon: string }[] = [
  { position: 'WR1', label: 'WR1', icon: '📡' },
  { position: 'WR2', label: 'WR2', icon: '📶' },
  { position: 'TE', label: 'TE', icon: '🎯' },
  { position: 'RB', label: 'RB', icon: '🏃' },
];

const SelectedCardDetail: React.FC<SelectedCardDetailProps> = ({
  card,
  synergies,
  defensePlayType,
  selectedTarget,
  lockedTarget,
  onTargetSelect,
  onSnap,
}) => {
  // Calculate modified success chance
  const counterMod = defensePlayType ? getCounterModifier(card.playType, defensePlayType) : 0;
  const synergyMod = synergies.reduce((sum, s) => sum + s.modifier, 0);
  const totalSuccessChance = Math.max(5, Math.min(95, card.successChance + counterMod + synergyMod));

  // Determine success color
  const successColor = totalSuccessChance >= 70 ? 'text-green-400' :
                       totalSuccessChance >= 50 ? 'text-amber-400' : 'text-red-400';

  // Counter warning
  const hasCounterWarning = counterMod < -10;

  return (
    <div className="bg-gray-900 rounded-lg border border-amber-500/30 p-3 space-y-3">
      {/* Card Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{PLAY_TYPE_ICONS[card.playType]}</span>
            <span className="text-lg font-bold text-white">{card.name}</span>
          </div>
          <div className="text-sm text-gray-500">{PLAY_TYPE_LABELS[card.playType]} • {card.formation}</div>
        </div>
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
          RARITY_COLORS[card.rarity].bg
        } ${RARITY_COLORS[card.rarity].border} border`}>
          {card.rarity}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Success Chance */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Success</div>
          <div className={`text-2xl font-bold ${successColor}`}>
            {totalSuccessChance}%
          </div>
          {counterMod !== 0 && (
            <div className={`text-xs ${counterMod > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {counterMod > 0 ? '+' : ''}{counterMod}% vs coverage
            </div>
          )}
        </div>

        {/* Yard Range */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Expected</div>
          <div className="text-2xl font-bold text-white">{card.baseYards} yds</div>
          <div className="text-xs text-gray-500">±{Math.round(card.baseYards * 0.3)}</div>
        </div>

        {/* Big Play Chance */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Breakaway</div>
          <div className="text-lg font-bold text-purple-400">{card.bigPlayChance}%</div>
        </div>

        {/* Turnover Risk */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Risk</div>
          <div className={`text-lg font-bold ${
            card.turnoverRisk > 15 ? 'text-red-400' :
            card.turnoverRisk > 8 ? 'text-amber-400' : 'text-green-400'
          }`}>
            {card.turnoverRisk}%
          </div>
        </div>
      </div>

      {/* Synergies */}
      {synergies.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase">Active Synergies</div>
          {synergies.map((synergy, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-amber-400">{synergy.name}</span>
              <span className="text-green-400">+{synergy.modifier}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Counter Warning */}
      {hasCounterWarning && (
        <div className="p-2 bg-red-900/30 rounded border border-red-800/50">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <span>⚠️</span>
            <span>This play is countered by their coverage!</span>
          </div>
        </div>
      )}

      {/* Target Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase">Target</span>
          {lockedTarget && (
            <span className="text-xs text-amber-500">🔒 Locked to {lockedTarget}</span>
          )}
        </div>
        <div className="flex gap-2">
          {TARGET_OPTIONS.map((opt) => {
            const isSelected = selectedTarget === opt.position;
            const isLocked = lockedTarget === opt.position;
            const isDisabled = lockedTarget !== null && lockedTarget !== opt.position;

            return (
              <button
                key={opt.position}
                onClick={() => !isDisabled && onTargetSelect(opt.position)}
                disabled={isDisabled}
                className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                  isSelected || isLocked
                    ? 'border-amber-500 bg-amber-900/40 text-amber-400'
                    : isDisabled
                    ? 'border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-50'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-amber-500/50'
                }`}
              >
                <div className="text-center">
                  <div className="text-sm">{opt.icon}</div>
                  <div className="text-xs font-bold">{opt.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Snap Button */}
      <button
        onClick={onSnap}
        disabled={!selectedTarget}
        className={`w-full py-4 rounded-lg text-lg font-bold uppercase tracking-wider transition-all shadow-lg ${
          selectedTarget
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 active:scale-98 shadow-amber-500/30'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        🏈 Snap Ball {selectedTarget && `→ ${selectedTarget}`}
      </button>
    </div>
  );
};

// =============================================================================
// ACTION BUTTONS
// =============================================================================

interface ActionButtonsProps {
  onTimeout: () => void;
  onAudible: () => void;
  onDraw: () => void;
  timeoutsRemaining: number;
  momentum: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onTimeout,
  onAudible,
  onDraw,
  timeoutsRemaining,
  momentum,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-gray-900 border-t border-gray-800">
      <button
        onClick={onAudible}
        className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
      >
        🔄 Audible
      </button>

      <button
        onClick={onTimeout}
        disabled={timeoutsRemaining === 0}
        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          timeoutsRemaining > 0
            ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        ⏸️ Timeout ({timeoutsRemaining})
      </button>

      <button
        onClick={onDraw}
        disabled={momentum < 2}
        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          momentum >= 2
            ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        🃏 Draw +2
      </button>
    </div>
  );
};

// =============================================================================
// CARD HAND
// =============================================================================

interface CardHandProps {
  cards: OffensiveCard[];
  selectedCardId: string | null;
  onSelectCard: (card: OffensiveCard) => void;
  fatigue: number;
}

const CardHand: React.FC<CardHandProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  fatigue,
}) => {
  return (
    <div className="bg-gray-900 border-t border-gray-800 py-3">
      <div className="flex gap-2 px-3 overflow-x-auto scrollbar-hide pb-2">
        {cards.map(card => {
          const isSelected = card.id === selectedCardId;
          const canAfford = fatigue + card.staminaCost <= 100;
          const rarityStyle = RARITY_COLORS[card.rarity];

          return (
            <button
              key={card.id}
              onClick={() => canAfford && onSelectCard(card)}
              disabled={!canAfford}
              className={`shrink-0 w-28 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-amber-500 scale-105 shadow-lg shadow-amber-500/30'
                  : canAfford
                  ? `${rarityStyle.border} hover:border-amber-500/50`
                  : 'border-gray-700 opacity-50 cursor-not-allowed'
              } ${rarityStyle.bg} ${rarityStyle.glow} overflow-hidden`}
            >
              <div className="p-2">
                {/* Type Icon */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{PLAY_TYPE_ICONS[card.playType]}</span>
                  <span className={`text-xs px-1 rounded ${
                    card.successChance >= 70 ? 'bg-green-900/50 text-green-400' :
                    card.successChance >= 50 ? 'bg-amber-900/50 text-amber-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {card.successChance}%
                  </span>
                </div>

                {/* Card Name */}
                <div className="text-xs font-bold text-white truncate">{card.name}</div>

                {/* Yard Range */}
                <div className="text-xs text-gray-400 mt-1">{card.baseYards} yds</div>

                {/* Stamina Cost */}
                <div className="flex items-center gap-1 mt-1">
                  <div className={`text-xs ${
                    card.staminaCost > 15 ? 'text-red-400' :
                    card.staminaCost > 8 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    ⚡{card.staminaCost}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// FOURTH DOWN OVERLAY
// =============================================================================

interface FourthDownOverlayProps {
  fieldPosition: { yardsToGo: number; yardLine: number; yardsToEndzone: number };
  fourthDownState: {
    fieldGoalDistance: number;
    fieldGoalSuccessChance: number;
    puntExpectedYards: number;
    conversionChance: number;
  };
  onChoice: (choice: FourthDownCategory | 'FAKE_FG' | 'FAKE_PUNT') => void;
  onGoForIt: () => void;
}

const FourthDownOverlay: React.FC<FourthDownOverlayProps> = ({
  fieldPosition,
  fourthDownState,
  onChoice,
  onGoForIt,
}) => {
  const [showFakeOptions, setShowFakeOptions] = useState<'FG' | 'PUNT' | null>(null);

  const inFGRange = fourthDownState.fieldGoalDistance <= 55;
  const shortYardage = fieldPosition.yardsToGo <= 3;

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-50">
      <div className="text-center mb-6">
        <div className="text-amber-500 text-sm uppercase tracking-widest mb-1">4th Down Decision</div>
        <div className="text-2xl font-bold text-white">
          4th & {fieldPosition.yardsToGo}
        </div>
        <div className="text-gray-500 mt-1">at the {fieldPosition.yardLine > 50 ? `OPP ${100 - fieldPosition.yardLine}` : `OWN ${fieldPosition.yardLine}`}</div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* GO FOR IT */}
        <button
          onClick={() => { onChoice('GO_FOR_IT'); onGoForIt(); }}
          className={`w-full p-4 rounded-xl border-2 transition-all ${
            shortYardage
              ? 'border-green-500 bg-green-900/30 hover:bg-green-900/50'
              : 'border-amber-500 bg-amber-900/30 hover:bg-amber-900/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white">GO FOR IT</div>
              <div className="text-sm text-gray-400">Convert for first down</div>
            </div>
            <div className={`text-2xl font-bold ${
              fourthDownState.conversionChance >= 60 ? 'text-green-400' :
              fourthDownState.conversionChance >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {fourthDownState.conversionChance}%
            </div>
          </div>
        </button>

        {/* FIELD GOAL */}
        {inFGRange && (
          <div>
            <button
              onClick={() => showFakeOptions === 'FG' ? setShowFakeOptions(null) : setShowFakeOptions('FG')}
              className="w-full p-4 rounded-xl border-2 border-blue-500 bg-blue-900/30 hover:bg-blue-900/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-white">FIELD GOAL</div>
                  <div className="text-sm text-gray-400">{fourthDownState.fieldGoalDistance} yard attempt</div>
                </div>
                <div className={`text-2xl font-bold ${
                  fourthDownState.fieldGoalSuccessChance >= 70 ? 'text-green-400' :
                  fourthDownState.fieldGoalSuccessChance >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {fourthDownState.fieldGoalSuccessChance}%
                </div>
              </div>
            </button>

            {showFakeOptions === 'FG' && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onChoice('FIELD_GOAL')}
                  className="flex-1 p-2 bg-blue-800/50 rounded-lg text-sm text-blue-300"
                >
                  Kick It
                </button>
                <button
                  onClick={() => onChoice('FAKE_FG')}
                  className="flex-1 p-2 bg-purple-800/50 rounded-lg text-sm text-purple-300"
                >
                  🎭 Fake FG
                </button>
              </div>
            )}
          </div>
        )}

        {/* PUNT */}
        {fieldPosition.yardLine < 60 && (
          <div>
            <button
              onClick={() => showFakeOptions === 'PUNT' ? setShowFakeOptions(null) : setShowFakeOptions('PUNT')}
              className="w-full p-4 rounded-xl border-2 border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-white">PUNT</div>
                  <div className="text-sm text-gray-400">Flip field position</div>
                </div>
                <div className="text-lg text-gray-300">
                  ~{fourthDownState.puntExpectedYards} yds
                </div>
              </div>
            </button>

            {showFakeOptions === 'PUNT' && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onChoice('PUNT')}
                  className="flex-1 p-2 bg-gray-700/50 rounded-lg text-sm text-gray-300"
                >
                  Punt It
                </button>
                <button
                  onClick={() => onChoice('FAKE_PUNT')}
                  className="flex-1 p-2 bg-purple-800/50 rounded-lg text-sm text-purple-300"
                >
                  🎭 Fake Punt
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Risk Indicator */}
      <div className="mt-6 text-center">
        <div className="text-xs text-gray-600">
          Turnover on downs gives ball at the {100 - fieldPosition.yardLine}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// =============================================================================
// EXPORTS
// =============================================================================

export default OffensivePlay;
