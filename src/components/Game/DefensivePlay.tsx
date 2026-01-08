/**
 * ILLEGAL MOTION - Defensive Play UI
 *
 * Main gameplay screen when opponent has the ball.
 * Portrait layout, dark theme with RED accents (darker, tension feel).
 *
 * KEY DIFFERENCE: Defense is PREDICTING, not reacting.
 * You must guess what offense will do for bonus success.
 */

import { useState, useMemo, useCallback } from 'react';
import { useCardGameStore, MOMENTUM_CONFIG } from '../../stores/cardGameStore';
import type {
  DefensiveCard,
  DefensivePlayType,
  CardRarity,
  OffensivePlayType,
} from '../../types/card.types';
import type { FourthDownDefenseResponse } from '../../types/game.types';

// =============================================================================
// TYPES
// =============================================================================

interface DefensivePlayProps {
  onSetDefense: (card: DefensiveCard, prediction?: OffensivePlayType) => void;
  onTimeout: () => void;
  onFourthDownResponse: (response: FourthDownDefenseResponse) => void;
}

type CoverageType = 'COVER_0' | 'COVER_1' | 'COVER_2' | 'COVER_3' | 'COVER_4' | 'COVER_6' | 'MAN';

type AdjustmentType =
  | 'BLITZ'
  | 'ZONE_BLITZ'
  | 'QB_SPY'
  | 'PRESS'
  | 'SHOW_BLITZ'
  | 'CONTAIN'
  | 'DOUBLE_TEAM';

interface Adjustment {
  type: AdjustmentType;
  name: string;
  icon: string;
  description: string;
  momentumCost: number;
  effect: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RARITY_COLORS: Record<CardRarity, { bg: string; border: string; glow: string }> = {
  COMMON: { bg: 'bg-gray-700', border: 'border-gray-600', glow: '' },
  UNCOMMON: { bg: 'bg-green-900/50', border: 'border-green-600', glow: '' },
  RARE: { bg: 'bg-blue-900/50', border: 'border-blue-500', glow: 'shadow-blue-500/30' },
  ELITE: { bg: 'bg-purple-900/50', border: 'border-purple-500', glow: 'shadow-purple-500/50 shadow-lg' },
  LEGENDARY: { bg: 'bg-red-900/50', border: 'border-red-400', glow: 'shadow-red-400/60 shadow-xl animate-pulse' },
};

const COVERAGE_OPTIONS: { type: CoverageType; name: string; icon: string; description: string }[] = [
  { type: 'COVER_0', name: 'Cover 0', icon: '0️⃣', description: 'All-out blitz, man coverage, no safety help' },
  { type: 'COVER_1', name: 'Cover 1', icon: '1️⃣', description: 'Man coverage with single-high safety' },
  { type: 'COVER_2', name: 'Cover 2', icon: '2️⃣', description: 'Two-deep safeties, zone underneath' },
  { type: 'COVER_3', name: 'Cover 3', icon: '3️⃣', description: 'Three-deep zones, balanced coverage' },
  { type: 'COVER_4', name: 'Cover 4', icon: '4️⃣', description: 'Four-deep quarters, prevent deep' },
  { type: 'COVER_6', name: 'Cover 6', icon: '6️⃣', description: 'Quarter-quarter-half hybrid' },
  { type: 'MAN', name: 'Man', icon: '👤', description: 'Tight man coverage, aggressive' },
];

const ADJUSTMENT_OPTIONS: Adjustment[] = [
  { type: 'BLITZ', name: 'Blitz', icon: '⚡', description: 'Send extra rushers', momentumCost: 1, effect: '+15% pressure, -10% coverage' },
  { type: 'ZONE_BLITZ', name: 'Zone Blitz', icon: '🔀', description: 'Disguised pressure', momentumCost: 2, effect: '+10% pressure, +5% disguise' },
  { type: 'QB_SPY', name: 'QB Spy', icon: '👁️', description: 'LB watches QB', momentumCost: 1, effect: '+20% vs QB run' },
  { type: 'PRESS', name: 'Press', icon: '🤝', description: 'Jam at line', momentumCost: 1, effect: '+15% vs short, -10% vs deep' },
  { type: 'SHOW_BLITZ', name: 'Show Blitz', icon: '🎭', description: 'Fake pressure', momentumCost: 0, effect: 'May confuse offense' },
  { type: 'CONTAIN', name: 'Contain', icon: '🛡️', description: 'Set the edge', momentumCost: 1, effect: '+20% vs outside runs' },
  { type: 'DOUBLE_TEAM', name: 'Double', icon: '👥', description: 'Bracket top threat', momentumCost: 2, effect: '+25% vs primary receiver' },
];

const PLAY_TYPE_PREDICTIONS: { type: OffensivePlayType; label: string; category: 'pass' | 'run' }[] = [
  { type: 'SHORT_PASS', label: 'Short Pass', category: 'pass' },
  { type: 'MEDIUM_PASS', label: 'Medium Pass', category: 'pass' },
  { type: 'DEEP_PASS', label: 'Deep Pass', category: 'pass' },
  { type: 'SCREEN', label: 'Screen', category: 'pass' },
  { type: 'PLAY_ACTION', label: 'Play Action', category: 'pass' },
  { type: 'INSIDE_RUN', label: 'Inside Run', category: 'run' },
  { type: 'OUTSIDE_RUN', label: 'Outside Run', category: 'run' },
  { type: 'POWER_RUN', label: 'Power Run', category: 'run' },
  { type: 'DRAW', label: 'Draw Play', category: 'run' },
];

const DEFENSE_PLAY_TYPE_LABELS: Record<DefensivePlayType, string> = {
  MAN_COVERAGE: 'Man Coverage',
  ZONE_COVERAGE: 'Zone Coverage',
  BLITZ: 'Blitz',
  ZONE_BLITZ: 'Zone Blitz',
  DEEP_ZONE: 'Deep Zone',
  GOAL_LINE_STAND: 'Goal Line Stand',
  CONTAIN: 'Contain',
  STACK_THE_BOX: 'Stack the Box',
  PRESS_COVERAGE: 'Press Coverage',
  SPY: 'QB Spy',
  PREVENT: 'Prevent Defense',
  GUESS_PLAY: 'Guess Play',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const DefensivePlay: React.FC<DefensivePlayProps> = ({
  onSetDefense,
  onTimeout,
  onFourthDownResponse,
}) => {
  const [selectedCoverage, setSelectedCoverage] = useState<CoverageType | null>(null);
  const [selectedAdjustments, setSelectedAdjustments] = useState<AdjustmentType[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<OffensivePlayType | null>(null);
  const [showPredictionPicker, setShowPredictionPicker] = useState(false);

  const {
    clock,
    fieldPosition,
    playerState,
    opponentState,
    defensiveMomentum,
    opponentTendencies,
    fourthDownState,
    currentDrive,
    getAvailableDefensiveCards,
    selectDefensiveCard,
  } = useCardGameStore();

  const availableCards = getAvailableDefensiveCards();

  // Find matching card for current selection
  const matchingCard = useMemo(() => {
    if (!selectedCoverage) return null;
    // Map coverage to defensive play type
    const coverageToPlayType: Record<CoverageType, DefensivePlayType> = {
      COVER_0: 'BLITZ',
      COVER_1: 'MAN_COVERAGE',
      COVER_2: 'ZONE_COVERAGE',
      COVER_3: 'ZONE_COVERAGE',
      COVER_4: 'DEEP_ZONE',
      COVER_6: 'ZONE_COVERAGE',
      MAN: 'MAN_COVERAGE',
    };
    const targetType = coverageToPlayType[selectedCoverage];
    return availableCards.find(c => c.playType === targetType) || availableCards[0];
  }, [selectedCoverage, availableCards]);

  // Calculate total momentum cost
  const totalMomentumCost = useMemo(() => {
    return selectedAdjustments.reduce((sum, adj) => {
      const adjustment = ADJUSTMENT_OPTIONS.find(a => a.type === adj);
      return sum + (adjustment?.momentumCost || 0);
    }, 0);
  }, [selectedAdjustments]);

  // Can afford adjustments?
  const canAffordAdjustments = defensiveMomentum >= totalMomentumCost;

  // Handle coverage selection
  const handleCoverageSelect = useCallback((coverage: CoverageType) => {
    setSelectedCoverage(prev => prev === coverage ? null : coverage);
  }, []);

  // Handle adjustment toggle
  const handleAdjustmentToggle = useCallback((adjustment: AdjustmentType) => {
    setSelectedAdjustments(prev => {
      if (prev.includes(adjustment)) {
        return prev.filter(a => a !== adjustment);
      }
      // Check if can afford
      const adjDef = ADJUSTMENT_OPTIONS.find(a => a.type === adjustment);
      const currentCost = prev.reduce((sum, a) => {
        const def = ADJUSTMENT_OPTIONS.find(d => d.type === a);
        return sum + (def?.momentumCost || 0);
      }, 0);
      if (currentCost + (adjDef?.momentumCost || 0) <= defensiveMomentum) {
        return [...prev, adjustment];
      }
      return prev;
    });
  }, [defensiveMomentum]);

  // Handle set defense
  const handleSetDefense = useCallback(() => {
    if (matchingCard) {
      selectDefensiveCard(matchingCard, selectedPrediction || undefined);
      onSetDefense(matchingCard, selectedPrediction || undefined);
    }
  }, [matchingCard, selectedPrediction, selectDefensiveCard, onSetDefense]);

  // Is 4th down?
  const isFourthDown = fieldPosition.down === 4;

  // Generate prediction suggestion from tendencies
  const predictionSuggestion = useMemo(() => {
    const { runPassRatio, shortDeepRatio, recentPlays } = opponentTendencies;

    // Check for patterns
    if (recentPlays.length >= 3) {
      const lastThree = recentPlays.slice(-3);
      const allSame = lastThree.every(p => p === lastThree[0]);
      if (allSame) {
        return { type: lastThree[0], confidence: 70, reason: 'Repeated pattern!' };
      }
    }

    // Check run/pass tendency
    if (runPassRatio > 65) {
      return { type: 'INSIDE_RUN' as OffensivePlayType, confidence: 55, reason: 'Run-heavy tendency' };
    }
    if (runPassRatio < 35) {
      return { type: 'SHORT_PASS' as OffensivePlayType, confidence: 55, reason: 'Pass-heavy tendency' };
    }

    // Short/deep tendency
    if (shortDeepRatio > 65) {
      return { type: 'SCREEN' as OffensivePlayType, confidence: 45, reason: 'Quick game focus' };
    }
    if (shortDeepRatio < 35) {
      return { type: 'DEEP_PASS' as OffensivePlayType, confidence: 45, reason: 'Taking shots deep' };
    }

    return null;
  }, [opponentTendencies]);

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* === SCORE BAR === */}
      <ScoreBarDefense
        playerScore={playerState.score}
        opponentScore={opponentState.score}
        clock={clock}
        fieldPosition={fieldPosition}
        timeoutsRemaining={playerState.timeoutsRemaining}
      />

      {/* === OPPONENT DRIVE STATUS === */}
      <OpponentDriveBar
        plays={currentDrive.plays.length}
        yards={currentDrive.yardsGained}
        defensiveMomentum={defensiveMomentum}
        fatigue={opponentState.fatigue}
      />

      {/* === MAIN CONTENT AREA === */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Opponent Intel */}
        <OpponentIntelPanel
          tendencies={opponentTendencies}
          suggestion={predictionSuggestion}
          fieldPosition={fieldPosition}
        />

        {/* Prediction Picker */}
        <PredictionSection
          selectedPrediction={selectedPrediction}
          onSelect={setSelectedPrediction}
          isOpen={showPredictionPicker}
          onToggle={() => setShowPredictionPicker(!showPredictionPicker)}
          suggestion={predictionSuggestion}
        />

        {/* Coverage Selection Grid */}
        <CoverageGrid
          selectedCoverage={selectedCoverage}
          onSelect={handleCoverageSelect}
        />

        {/* Adjustments */}
        <AdjustmentSection
          selectedAdjustments={selectedAdjustments}
          onToggle={handleAdjustmentToggle}
          momentum={defensiveMomentum}
          totalCost={totalMomentumCost}
        />

        {/* Selected Combo Preview */}
        {selectedCoverage && matchingCard && (
          <ComboPreview
            coverage={selectedCoverage}
            adjustments={selectedAdjustments}
            prediction={selectedPrediction}
            card={matchingCard}
            momentumCost={totalMomentumCost}
            canAfford={canAffordAdjustments}
            onSetDefense={handleSetDefense}
          />
        )}

        {/* Defensive Whisper (coach advice) */}
        <DefensiveWhisper
          momentum={defensiveMomentum}
          fieldPosition={fieldPosition}
          opponentTendencies={opponentTendencies}
        />
      </div>

      {/* === ACTION BUTTONS === */}
      <DefenseActionButtons
        onTimeout={onTimeout}
        timeoutsRemaining={playerState.timeoutsRemaining}
        momentum={defensiveMomentum}
      />

      {/* === DEFENSIVE CARD HAND (smaller, secondary) === */}
      <DefenseCardStrip cards={availableCards} />

      {/* === 4TH DOWN DEFENSE OVERLAY === */}
      {isFourthDown && fourthDownState && (
        <FourthDownDefenseOverlay
          fourthDownState={fourthDownState}
          fieldPosition={fieldPosition}
          onResponse={onFourthDownResponse}
        />
      )}
    </div>
  );
};

// =============================================================================
// SCORE BAR (Defense version - red accent)
// =============================================================================

interface ScoreBarDefenseProps {
  playerScore: number;
  opponentScore: number;
  clock: { quarter: number | 'OT'; minutes: number; seconds: number };
  fieldPosition: { down: number; yardsToGo: number; yardLine: number; yardsToEndzone: number };
  timeoutsRemaining: number;
}

const ScoreBarDefense: React.FC<ScoreBarDefenseProps> = ({
  playerScore,
  opponentScore,
  clock,
  fieldPosition,
  timeoutsRemaining,
}) => {
  const quarterLabel = clock.quarter === 'OT' ? 'OT' : `Q${clock.quarter}`;
  const timeLabel = `${clock.minutes}:${String(clock.seconds).padStart(2, '0')}`;
  const downLabel = `${fieldPosition.down}${getOrdinalSuffix(fieldPosition.down)} & ${fieldPosition.yardsToGo}`;

  // Field position from offense perspective
  const offenseYardLine = 100 - fieldPosition.yardLine;
  const positionLabel = offenseYardLine > 50
    ? `YOUR ${100 - offenseYardLine}`
    : offenseYardLine === 50
    ? '50'
    : `THEIR ${offenseYardLine}`;

  return (
    <div className="bg-gray-900 border-b border-red-900/50">
      {/* Score Row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-red-500">{playerScore}</span>
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
                i < timeoutsRemaining ? 'bg-red-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Down & Distance Row - Red tinted */}
      <div className="flex items-center justify-between px-4 py-1 bg-red-950/30">
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400 uppercase font-bold">THEY HAVE</span>
          <span className="text-red-500 font-bold">{downLabel}</span>
          <span className="text-gray-500">at</span>
          <span className="text-white font-medium">{positionLabel}</span>
        </div>
        <div className="text-sm text-red-400 font-bold">
          {fieldPosition.yardsToEndzone} TO SCORE
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// OPPONENT DRIVE BAR
// =============================================================================

interface OpponentDriveBarProps {
  plays: number;
  yards: number;
  defensiveMomentum: number;
  fatigue: number;
}

const OpponentDriveBar: React.FC<OpponentDriveBarProps> = ({
  plays,
  yards,
  defensiveMomentum,
  fatigue,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-red-950/20 border-b border-red-900/30">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          Their Drive: <span className="text-red-400">{plays} plays</span>, <span className="text-red-400">{yards} yds</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Defensive Momentum */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">DEF</span>
          <div className="flex gap-0.5">
            {[...Array(MOMENTUM_CONFIG.MAX)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-3 rounded-sm transition-colors ${
                  i < defensiveMomentum
                    ? defensiveMomentum >= 5 ? 'bg-red-500' : defensiveMomentum >= 3 ? 'bg-orange-500' : 'bg-yellow-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Their Fatigue (bad for us if low) */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">THEIR FAT</span>
          <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                fatigue < 30 ? 'bg-red-500' : fatigue < 60 ? 'bg-yellow-500' : 'bg-green-500'
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
// OPPONENT INTEL PANEL
// =============================================================================

interface OpponentIntelPanelProps {
  tendencies: {
    runPassRatio: number;
    shortDeepRatio: number;
    predictability: number;
    recentPlays: OffensivePlayType[];
  };
  suggestion: { type: OffensivePlayType; confidence: number; reason: string } | null;
  fieldPosition: { down: number; yardsToGo: number; inRedZone: boolean };
}

const OpponentIntelPanel: React.FC<OpponentIntelPanelProps> = ({
  tendencies,
  suggestion,
  fieldPosition,
}) => {
  return (
    <div className="bg-red-950/30 rounded-lg border border-red-900/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Offensive Scouting</h3>
        <div className="text-xs text-gray-600">OC: Unknown</div>
      </div>

      {/* Tendency Bars */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Run/Pass Split</div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-blue-500"
              style={{ width: `${tendencies.runPassRatio}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span>{tendencies.runPassRatio}% Run</span>
            <span>{100 - tendencies.runPassRatio}% Pass</span>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-500 mb-1">Attack Style</div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-purple-500"
              style={{ width: `${tendencies.shortDeepRatio}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span>Quick</span>
            <span>Deep</span>
          </div>
        </div>
      </div>

      {/* Recent Plays */}
      {tendencies.recentPlays.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">Recent Calls</div>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tendencies.recentPlays.slice(-5).map((play, i) => (
              <div
                key={i}
                className={`px-2 py-0.5 rounded text-xs shrink-0 ${
                  ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW'].includes(play)
                    ? 'bg-orange-900/50 text-orange-400'
                    : 'bg-blue-900/50 text-blue-400'
                }`}
              >
                {play.replace(/_/g, ' ').toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion Box */}
      {suggestion && (
        <div className="p-2 bg-red-900/30 rounded border border-red-800/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-500">🎯</span>
            <span className="text-red-400">
              Watch for: <span className="font-bold text-white">{suggestion.type.replace(/_/g, ' ')}</span>
            </span>
            <span className="text-xs text-gray-500">({suggestion.confidence}%)</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{suggestion.reason}</div>
        </div>
      )}

      {/* Situational Warning */}
      {fieldPosition.down === 3 && fieldPosition.yardsToGo > 5 && (
        <div className="mt-2 text-xs text-yellow-500">
          ⚠️ 3rd & Long - Expect pass
        </div>
      )}
      {fieldPosition.down === 3 && fieldPosition.yardsToGo <= 2 && (
        <div className="mt-2 text-xs text-yellow-500">
          ⚠️ 3rd & Short - Could be anything
        </div>
      )}
      {fieldPosition.inRedZone && (
        <div className="mt-2 text-xs text-red-500">
          🎯 RED ZONE - High alert!
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PREDICTION SECTION
// =============================================================================

interface PredictionSectionProps {
  selectedPrediction: OffensivePlayType | null;
  onSelect: (prediction: OffensivePlayType | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  suggestion: { type: OffensivePlayType; confidence: number; reason: string } | null;
}

const PredictionSection: React.FC<PredictionSectionProps> = ({
  selectedPrediction,
  onSelect,
  isOpen,
  onToggle,
  suggestion,
}) => {
  return (
    <div className="bg-gray-900/80 rounded-lg border border-red-900/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <span className="text-sm font-medium text-red-400">
            {selectedPrediction
              ? `Predicting: ${selectedPrediction.replace(/_/g, ' ')}`
              : 'Make a Prediction (Bonus +15%)'
            }
          </span>
        </div>
        <span className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 border-t border-gray-800/50">
          <div className="pt-2 text-xs text-gray-500 mb-2">
            Correctly predict the play for +15% success bonus!
          </div>

          {/* Category Tabs */}
          <div className="space-y-2">
            <div className="text-xs text-gray-600 uppercase">Pass Plays</div>
            <div className="flex flex-wrap gap-1">
              {PLAY_TYPE_PREDICTIONS.filter(p => p.category === 'pass').map(pred => (
                <button
                  key={pred.type}
                  onClick={() => onSelect(selectedPrediction === pred.type ? null : pred.type)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    selectedPrediction === pred.type
                      ? 'bg-red-600 text-white'
                      : suggestion?.type === pred.type
                      ? 'bg-red-900/50 text-red-400 border border-red-700'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {pred.label}
                  {suggestion?.type === pred.type && ' ★'}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-600 uppercase">Run Plays</div>
            <div className="flex flex-wrap gap-1">
              {PLAY_TYPE_PREDICTIONS.filter(p => p.category === 'run').map(pred => (
                <button
                  key={pred.type}
                  onClick={() => onSelect(selectedPrediction === pred.type ? null : pred.type)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    selectedPrediction === pred.type
                      ? 'bg-red-600 text-white'
                      : suggestion?.type === pred.type
                      ? 'bg-red-900/50 text-red-400 border border-red-700'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {pred.label}
                  {suggestion?.type === pred.type && ' ★'}
                </button>
              ))}
            </div>
          </div>

          {selectedPrediction && (
            <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-400">
              If correct: +15% success chance this play
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COVERAGE GRID
// =============================================================================

interface CoverageGridProps {
  selectedCoverage: CoverageType | null;
  onSelect: (coverage: CoverageType) => void;
}

const CoverageGrid: React.FC<CoverageGridProps> = ({
  selectedCoverage,
  onSelect,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Coverage Shell</h3>
        <span className="text-xs text-gray-600">Choose your base coverage</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {COVERAGE_OPTIONS.map(coverage => (
          <button
            key={coverage.type}
            onClick={() => onSelect(coverage.type)}
            className={`p-2 rounded-lg border-2 transition-all ${
              selectedCoverage === coverage.type
                ? 'border-red-500 bg-red-900/40 scale-105 shadow-lg shadow-red-500/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-red-700 hover:bg-gray-800'
            }`}
          >
            <div className="text-xl mb-1">{coverage.icon}</div>
            <div className="text-xs font-bold text-white">{coverage.name}</div>
          </button>
        ))}
      </div>

      {/* Selected Coverage Info */}
      {selectedCoverage && (
        <div className="p-2 bg-gray-800/50 rounded text-xs text-gray-400">
          {COVERAGE_OPTIONS.find(c => c.type === selectedCoverage)?.description}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ADJUSTMENT SECTION
// =============================================================================

interface AdjustmentSectionProps {
  selectedAdjustments: AdjustmentType[];
  onToggle: (adjustment: AdjustmentType) => void;
  momentum: number;
  totalCost: number;
}

const AdjustmentSection: React.FC<AdjustmentSectionProps> = ({
  selectedAdjustments,
  onToggle,
  momentum,
  totalCost,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Adjustments</h3>
        <span className={`text-xs ${totalCost > momentum ? 'text-red-500' : 'text-gray-600'}`}>
          Cost: {totalCost}/{momentum} Momentum
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ADJUSTMENT_OPTIONS.map(adj => {
          const isSelected = selectedAdjustments.includes(adj.type);
          const canAfford = momentum >= adj.momentumCost || isSelected;

          return (
            <button
              key={adj.type}
              onClick={() => onToggle(adj.type)}
              disabled={!canAfford && !isSelected}
              className={`p-2 rounded-lg border transition-all text-left ${
                isSelected
                  ? 'border-red-500 bg-red-900/40'
                  : canAfford
                  ? 'border-gray-700 bg-gray-800/50 hover:border-red-700'
                  : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span>{adj.icon}</span>
                  <span className="text-xs font-bold text-white">{adj.name}</span>
                </div>
                {adj.momentumCost > 0 && (
                  <span className="text-xs text-red-400">-{adj.momentumCost}</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{adj.effect}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// COMBO PREVIEW
// =============================================================================

interface ComboPreviewProps {
  coverage: CoverageType;
  adjustments: AdjustmentType[];
  prediction: OffensivePlayType | null;
  card: DefensiveCard;
  momentumCost: number;
  canAfford: boolean;
  onSetDefense: () => void;
}

const ComboPreview: React.FC<ComboPreviewProps> = ({
  coverage,
  adjustments,
  prediction,
  card,
  momentumCost,
  canAfford,
  onSetDefense,
}) => {
  // Calculate success modifier - use passDefenseRating as base
  let successModifier = 0;
  if (prediction) successModifier += 15; // Prediction bonus (if correct)
  adjustments.forEach(adj => {
    if (adj === 'BLITZ') successModifier += 10;
    if (adj === 'PRESS') successModifier += 5;
    if (adj === 'ZONE_BLITZ') successModifier += 8;
  });

  const totalSuccess = Math.min(95, card.passDefenseRating + successModifier);
  const coverageInfo = COVERAGE_OPTIONS.find(c => c.type === coverage);

  return (
    <div className="bg-red-950/40 rounded-lg border border-red-800/50 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{coverageInfo?.icon}</span>
            <span className="text-lg font-bold text-white">{coverageInfo?.name}</span>
          </div>
          <div className="text-sm text-gray-500">{DEFENSE_PLAY_TYPE_LABELS[card.playType]}</div>
        </div>
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
          RARITY_COLORS[card.rarity].bg
        } ${RARITY_COLORS[card.rarity].border} border`}>
          {card.rarity}
        </div>
      </div>

      {/* Adjustments Tags */}
      {adjustments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {adjustments.map(adj => {
            const adjDef = ADJUSTMENT_OPTIONS.find(a => a.type === adj);
            return (
              <span
                key={adj}
                className="px-2 py-0.5 bg-red-900/50 rounded text-xs text-red-400"
              >
                {adjDef?.icon} {adjDef?.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Prediction Tag */}
      {prediction && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-500">🔮</span>
          <span className="text-gray-400">Predicting:</span>
          <span className="text-white font-bold">{prediction.replace(/_/g, ' ')}</span>
          <span className="text-green-500 text-xs">(+15% if correct)</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900/50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Pass Def</div>
          <div className={`text-xl font-bold ${
            totalSuccess >= 70 ? 'text-green-400' :
            totalSuccess >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {totalSuccess}%
          </div>
          {successModifier > 0 && (
            <div className="text-xs text-green-500">+{successModifier}%</div>
          )}
        </div>

        <div className="bg-gray-900/50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Pressure</div>
          <div className="text-xl font-bold text-orange-400">{card.pressureRating}%</div>
        </div>

        <div className="bg-gray-900/50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Run Stop</div>
          <div className="text-xl font-bold text-purple-400">{card.runStopRating}%</div>
        </div>
      </div>

      {/* Cost Warning */}
      {momentumCost > 0 && (
        <div className={`text-xs ${canAfford ? 'text-gray-500' : 'text-red-500'}`}>
          This call costs {momentumCost} momentum
        </div>
      )}

      {/* SET DEFENSE Button */}
      <button
        onClick={onSetDefense}
        disabled={!canAfford}
        className={`w-full py-4 rounded-lg text-lg font-bold uppercase tracking-wider transition-all shadow-lg ${
          canAfford
            ? 'bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-600 hover:to-red-500 active:scale-98 shadow-red-500/30'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        🛡️ Set Defense
      </button>
    </div>
  );
};

// =============================================================================
// DEFENSIVE WHISPER (Coach Advice)
// =============================================================================

interface DefensiveWhisperProps {
  momentum: number;
  fieldPosition: { down: number; yardsToGo: number; inRedZone: boolean; backedUp: boolean };
  opponentTendencies: { runPassRatio: number; predictability: number };
}

const DefensiveWhisper: React.FC<DefensiveWhisperProps> = ({
  momentum,
  fieldPosition,
  opponentTendencies,
}) => {
  let message = '';
  let icon = '🎧';

  if (fieldPosition.inRedZone) {
    message = "Bend don't break. Make them kick!";
    icon = '🚨';
  } else if (fieldPosition.backedUp) {
    message = "Backed up - watch for the quick throw";
    icon = '👀';
  } else if (momentum >= 5) {
    message = "We're rolling! Get aggressive!";
    icon = '🔥';
  } else if (momentum <= 1) {
    message = "Need a stop here. Stay disciplined.";
    icon = '😤';
  } else if (opponentTendencies.predictability > 60) {
    message = `They're predictable (${opponentTendencies.predictability}%). Trust your read.`;
    icon = '🧠';
  } else if (fieldPosition.down === 3 && fieldPosition.yardsToGo > 7) {
    message = "Third and long - tee off!";
    icon = '⚡';
  } else {
    return null;
  }

  return (
    <div className="flex items-start gap-2 p-2 bg-red-950/30 rounded-lg border border-red-900/30">
      <div className="text-lg">{icon}</div>
      <div>
        <div className="text-xs text-red-400 mb-0.5">DC</div>
        <div className="text-sm text-gray-400 italic">{message}</div>
      </div>
    </div>
  );
};

// =============================================================================
// DEFENSE ACTION BUTTONS
// =============================================================================

interface DefenseActionButtonsProps {
  onTimeout: () => void;
  timeoutsRemaining: number;
  momentum: number;
}

const DefenseActionButtons: React.FC<DefenseActionButtonsProps> = ({
  onTimeout,
  timeoutsRemaining,
  momentum,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-gray-900 border-t border-red-900/30">
      <button
        onClick={onTimeout}
        disabled={timeoutsRemaining === 0}
        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          timeoutsRemaining > 0
            ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        ⏸️ Timeout ({timeoutsRemaining})
      </button>

      <button
        disabled={momentum < 2}
        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          momentum >= 2
            ? 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/50'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        📣 Fire Up (+ATK)
      </button>

      <button
        className="px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
      >
        📋 Plays
      </button>
    </div>
  );
};

// =============================================================================
// DEFENSE CARD STRIP (smaller than offense hand)
// =============================================================================

interface DefenseCardStripProps {
  cards: DefensiveCard[];
}

const DefenseCardStrip: React.FC<DefenseCardStripProps> = ({ cards }) => {
  return (
    <div className="bg-gray-900 border-t border-red-900/30 py-2">
      <div className="flex gap-1 px-3 overflow-x-auto scrollbar-hide">
        {cards.map(card => {
          const rarityStyle = RARITY_COLORS[card.rarity];

          return (
            <div
              key={card.id}
              className={`shrink-0 w-20 rounded border ${rarityStyle.border} ${rarityStyle.bg} p-1.5`}
            >
              <div className="text-xs font-bold text-white truncate">{card.name}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-500">
                  {DEFENSE_PLAY_TYPE_LABELS[card.playType]?.slice(0, 4)}
                </span>
                <span className={`text-xs ${
                  card.passDefenseRating >= 70 ? 'text-green-400' :
                  card.passDefenseRating >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {card.passDefenseRating}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// FOURTH DOWN DEFENSE OVERLAY
// =============================================================================

interface FourthDownDefenseOverlayProps {
  fourthDownState: {
    offenseCategory: string | null;
    fieldGoalDistance: number;
    puntExpectedYards: number;
    conversionChance: number;
  };
  fieldPosition: { yardsToGo: number; yardLine: number };
  onResponse: (response: FourthDownDefenseResponse) => void;
}

const FourthDownDefenseOverlay: React.FC<FourthDownDefenseOverlayProps> = ({
  fourthDownState,
  fieldPosition,
  onResponse,
}) => {
  const inFGRange = fourthDownState.fieldGoalDistance <= 55;
  const likelyPunt = fieldPosition.yardLine < 40;
  const likelyGoForIt = fieldPosition.yardsToGo <= 2 || fieldPosition.yardLine > 60;

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-50">
      <div className="text-center mb-6">
        <div className="text-red-500 text-sm uppercase tracking-widest mb-1">4th Down Defense</div>
        <div className="text-2xl font-bold text-white">
          4th & {fieldPosition.yardsToGo}
        </div>
        <div className="text-gray-500 mt-1">What do you expect?</div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* FIELD GOAL BLOCK */}
        {inFGRange && (
          <button
            onClick={() => onResponse('BLOCK_ATTEMPT')}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              !likelyGoForIt && !likelyPunt
                ? 'border-blue-500 bg-blue-900/30 hover:bg-blue-900/50'
                : 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-white">BLOCK FG</div>
                <div className="text-sm text-gray-400">{fourthDownState.fieldGoalDistance} yard attempt</div>
              </div>
              <div className="text-lg text-blue-400">🦶</div>
            </div>
          </button>
        )}

        {/* PUNT RETURN */}
        <button
          onClick={() => onResponse('AGGRESSIVE_RETURN')}
          className={`w-full p-4 rounded-xl border-2 transition-all ${
            likelyPunt
              ? 'border-gray-400 bg-gray-700/30 hover:bg-gray-600/50'
              : 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white">PUNT RETURN</div>
              <div className="text-sm text-gray-400">Standard return setup</div>
            </div>
            <div className="text-lg text-gray-400">🏈</div>
          </div>
        </button>

        {/* EXPECT GO FOR IT */}
        <button
          onClick={() => onResponse('AGGRESSIVE_STOP')}
          className={`w-full p-4 rounded-xl border-2 transition-all ${
            likelyGoForIt
              ? 'border-red-500 bg-red-900/30 hover:bg-red-900/50'
              : 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white">DEFEND 4TH</div>
              <div className="text-sm text-gray-400">They'll go for it</div>
            </div>
            <div className={`text-2xl font-bold ${
              fourthDownState.conversionChance <= 40 ? 'text-green-400' :
              fourthDownState.conversionChance <= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {100 - fourthDownState.conversionChance}%
            </div>
          </div>
        </button>

        {/* EXPECT FAKE */}
        <button
          onClick={() => onResponse('EXPECT_FAKE')}
          className="w-full p-4 rounded-xl border-2 border-purple-600 bg-purple-900/30 hover:bg-purple-900/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white">🎭 EXPECT FAKE</div>
              <div className="text-sm text-gray-400">They're trying something</div>
            </div>
            <div className="text-sm text-purple-400">Big risk, big reward</div>
          </div>
        </button>
      </div>

      {/* Situation Hint */}
      <div className="mt-6 text-center">
        <div className="text-xs text-gray-600">
          {likelyGoForIt && "Short yardage - they might go for it"}
          {likelyPunt && !likelyGoForIt && "Deep in their territory - likely punt"}
          {inFGRange && !likelyPunt && !likelyGoForIt && "In FG range - could kick"}
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

export default DefensivePlay;
