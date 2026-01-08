/**
 * ILLEGAL MOTION - Play Result Display
 *
 * Shows what happened after a play resolves.
 * Quick but satisfying - punchy text with emphasis on big moments.
 *
 * Handles: completions, runs, sacks, turnovers, TDs, penalties
 * Plus: momentum changes, breakaway sequences, possession transitions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCardGameStore, MOMENTUM_CONFIG } from '../../stores/cardGameStore';
import type { PlayResult, FourthDownResult, PlayBreakdown } from '../../engine/playResolver';
import type { OffensivePlayType } from '../../types/card.types';

// =============================================================================
// TYPES
// =============================================================================

interface PlayResultDisplayProps {
  result: PlayResult | FourthDownResult;
  offensePlayType?: OffensivePlayType;
  isPlayerOffense: boolean;
  onContinue: () => void;
  onXPChoice?: (choice: 'XP' | 'TWO_POINT') => void;
}

type ResultType =
  | 'COMPLETION'
  | 'INCOMPLETION'
  | 'SACK'
  | 'RUN_GAIN'
  | 'RUN_LOSS'
  | 'TOUCHDOWN'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'PENALTY'
  | 'FIELD_GOAL_GOOD'
  | 'FIELD_GOAL_MISS'
  | 'PUNT'
  | 'SAFETY'
  | 'TURNOVER_ON_DOWNS';

type TransitionType =
  | 'TOUCHDOWN'
  | 'FIELD_GOAL'
  | 'PUNT'
  | 'TURNOVER'
  | 'TURNOVER_ON_DOWNS'
  | 'SAFETY'
  | null;

// =============================================================================
// CONSTANTS
// =============================================================================

const RESULT_COLORS: Record<ResultType, { bg: string; text: string; accent: string }> = {
  COMPLETION: { bg: 'from-green-900/80', text: 'text-green-400', accent: 'border-green-500' },
  INCOMPLETION: { bg: 'from-gray-800/80', text: 'text-gray-400', accent: 'border-gray-600' },
  SACK: { bg: 'from-red-900/80', text: 'text-red-400', accent: 'border-red-500' },
  RUN_GAIN: { bg: 'from-blue-900/80', text: 'text-blue-400', accent: 'border-blue-500' },
  RUN_LOSS: { bg: 'from-orange-900/80', text: 'text-orange-400', accent: 'border-orange-500' },
  TOUCHDOWN: { bg: 'from-amber-600/90', text: 'text-amber-300', accent: 'border-amber-400' },
  INTERCEPTION: { bg: 'from-purple-900/80', text: 'text-purple-400', accent: 'border-purple-500' },
  FUMBLE: { bg: 'from-red-800/80', text: 'text-red-300', accent: 'border-red-400' },
  PENALTY: { bg: 'from-yellow-900/80', text: 'text-yellow-400', accent: 'border-yellow-500' },
  FIELD_GOAL_GOOD: { bg: 'from-green-800/80', text: 'text-green-400', accent: 'border-green-500' },
  FIELD_GOAL_MISS: { bg: 'from-gray-800/80', text: 'text-gray-400', accent: 'border-gray-600' },
  PUNT: { bg: 'from-gray-700/80', text: 'text-gray-300', accent: 'border-gray-500' },
  SAFETY: { bg: 'from-red-900/90', text: 'text-red-300', accent: 'border-red-400' },
  TURNOVER_ON_DOWNS: { bg: 'from-red-800/80', text: 'text-red-400', accent: 'border-red-500' },
};

const KEY_MOMENTS = [
  { trigger: 'bigPlay', text: 'BREAKAWAY!', icon: '🔥' },
  { trigger: 'brokenTackle', text: 'Broken tackle!', icon: '💪' },
  { trigger: 'pressureForced', text: 'Pressure forced bad throw', icon: '⚡' },
  { trigger: 'coverageBusted', text: 'Coverage busted!', icon: '🎯' },
  { trigger: 'perfectThrow', text: 'Perfect throw!', icon: '🎯' },
  { trigger: 'bigHit', text: 'BIG HIT!', icon: '💥' },
  { trigger: 'tightWindow', text: 'Threaded the needle!', icon: '🧵' },
];

// Fake player names for display
const PLAYER_NAMES = {
  QB: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown'],
  WR: ['Jackson', 'Davis', 'Miller', 'Wilson', 'Moore'],
  RB: ['Taylor', 'Anderson', 'Thomas', 'Harris', 'Martin'],
  TE: ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Pitts'],
  DEF: ['Adams', 'Howard', 'Diggs', 'Ward', 'Ramsey'],
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PlayResultDisplay: React.FC<PlayResultDisplayProps> = ({
  result,
  offensePlayType,
  isPlayerOffense,
  onContinue,
  onXPChoice,
}) => {
  const [phase, setPhase] = useState<'result' | 'breakaway' | 'transition' | 'xp_choice'>('result');
  const [breakawayYard, setBreakawayYard] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);

  const {
    fieldPosition,
    playerState,
    opponentState,
    offensiveMomentum,
    defensiveMomentum,
  } = useCardGameStore();

  // Determine result type
  const resultType = useMemo(() => getResultType(result, offensePlayType), [result, offensePlayType]);

  // Determine if this causes a possession change
  const transitionType = useMemo(() => getTransitionType(result), [result]);

  // Get key moment callout
  const keyMoment = useMemo(() => getKeyMoment(result, resultType), [result, resultType]);

  // Get player name for display
  const playerName = useMemo(() => getPlayerName(resultType, offensePlayType), [resultType, offensePlayType]);

  // Check if it's a PlayResult (has breakdown) or FourthDownResult
  const isPlayResult = 'breakdown' in result;

  // Calculate display time based on result significance
  const displayTime = useMemo(() => {
    if (result.touchdown) return 5000;
    if (result.turnover) return 4000;
    if ('bigPlay' in result && result.bigPlay) return 4000;
    return 2500;
  }, [result]);

  // Handle breakaway sequence
  useEffect(() => {
    if ('bigPlay' in result && result.bigPlay && result.yardsGained >= 20 && phase === 'result') {
      // Start breakaway sequence
      const startYard = fieldPosition.yardLine - result.yardsGained;
      let currentYard = startYard;
      const endYard = fieldPosition.yardLine;

      setPhase('breakaway');
      setBreakawayYard(currentYard);

      // Animate countdown
      const interval = setInterval(() => {
        currentYard += 10;
        if (currentYard >= endYard) {
          setBreakawayYard(endYard);
          clearInterval(interval);
          // Move to result after breakaway
          setTimeout(() => {
            setPhase(result.touchdown ? 'transition' : 'result');
          }, 500);
        } else {
          setBreakawayYard(currentYard);
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, [result, fieldPosition, phase]);

  // Auto-advance timer
  useEffect(() => {
    if (phase === 'result' && !result.touchdown && !transitionType) {
      const timer = window.setTimeout(() => {
        onContinue();
      }, displayTime);
      setAutoAdvanceTimer(displayTime);
      return () => window.clearTimeout(timer);
    }
  }, [phase, result, transitionType, displayTime, onContinue]);

  // Countdown timer display
  useEffect(() => {
    if (autoAdvanceTimer && autoAdvanceTimer > 0) {
      const interval = setInterval(() => {
        setAutoAdvanceTimer(prev => (prev ? prev - 100 : null));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [autoAdvanceTimer]);

  // Handle continue
  const handleContinue = useCallback(() => {
    if (phase === 'result' && transitionType) {
      if (transitionType === 'TOUCHDOWN' && isPlayerOffense && onXPChoice) {
        setPhase('xp_choice');
      } else {
        setPhase('transition');
      }
    } else if (phase === 'transition' || phase === 'xp_choice') {
      onContinue();
    } else {
      onContinue();
    }
  }, [phase, transitionType, isPlayerOffense, onXPChoice, onContinue]);

  // Handle XP choice
  const handleXPChoice = useCallback((choice: 'XP' | 'TWO_POINT') => {
    if (onXPChoice) {
      onXPChoice(choice);
    }
    setPhase('transition');
  }, [onXPChoice]);

  const colors = RESULT_COLORS[resultType];
  const momentumChange = isPlayResult ? (result as PlayResult).momentumShift : 0;

  // Render based on phase
  if (phase === 'breakaway') {
    return (
      <BreakawaySequence
        currentYard={breakawayYard || 50}
        isTouchdown={result.touchdown}
        onComplete={() => setPhase(result.touchdown ? 'transition' : 'result')}
      />
    );
  }

  if (phase === 'xp_choice') {
    return (
      <XPChoiceModal
        onChoice={handleXPChoice}
        playerScore={playerState.score}
        opponentScore={opponentState.score}
      />
    );
  }

  if (phase === 'transition' && transitionType) {
    return (
      <PossessionTransition
        type={transitionType}
        isPlayerGettingBall={!isPlayerOffense || transitionType === 'TURNOVER'}
        fieldPosition={fieldPosition}
        playerScore={playerState.score}
        opponentScore={opponentState.score}
        onContinue={onContinue}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md bg-gradient-to-b ${colors.bg} to-gray-900 rounded-2xl border-2 ${colors.accent} overflow-hidden shadow-2xl`}
        onClick={handleContinue}
      >
        {/* Result Header */}
        <div className="p-6 text-center">
          {/* Key Moment */}
          {keyMoment && (
            <div className="mb-2 animate-bounce">
              <span className="text-2xl">{keyMoment.icon}</span>
              <span className="ml-2 text-lg font-bold text-white">{keyMoment.text}</span>
            </div>
          )}

          {/* Big Result Text */}
          <ResultText
            resultType={resultType}
            yardsGained={'yardsGained' in result ? (result.yardsGained ?? 0) : 0}
            colors={colors}
          />

          {/* Player Involved */}
          {playerName && (
            <div className="mt-2 text-gray-400">
              {getPlayerAction(resultType)} <span className="text-white font-medium">{playerName}</span>
            </div>
          )}

          {/* Play-by-Play */}
          <div className="mt-3 text-sm text-gray-300 italic">
            "{result.playByPlay}"
          </div>
        </div>

        {/* Yard Line Movement */}
        <YardLineVisual
          yardsGained={'yardsGained' in result ? (result.yardsGained ?? 0) : 0}
          startYard={fieldPosition.yardLine - ('yardsGained' in result ? (result.yardsGained ?? 0) : 0)}
          endYard={fieldPosition.yardLine}
          isTouchdown={result.touchdown}
        />

        {/* Momentum Change */}
        {momentumChange !== 0 && (
          <MomentumDisplay
            change={momentumChange}
            currentMomentum={isPlayerOffense ? offensiveMomentum : defensiveMomentum}
            isPositive={isPlayerOffense ? momentumChange > 0 : momentumChange < 0}
          />
        )}

        {/* Special Events */}
        {isPlayResult && (result as PlayResult).injury && (
          <InjuryDisplay injury={(result as PlayResult).injury!} />
        )}

        {isPlayResult && (result as PlayResult).penalty && (
          <PenaltyDisplay penalty={(result as PlayResult).penalty!} />
        )}

        {/* Details Toggle */}
        {isPlayResult && (
          <div className="px-4 pb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="text-xs text-gray-500 hover:text-gray-400"
            >
              {showDetails ? '▼ Hide Details' : '▶ Show Details'}
            </button>

            {showDetails && (
              <BreakdownPanel breakdown={(result as PlayResult).breakdown} />
            )}
          </div>
        )}

        {/* Continue Footer */}
        <div className="p-4 bg-gray-900/50 border-t border-gray-800">
          <button
            onClick={handleContinue}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
          >
            {transitionType ? 'Continue' : 'Next Play'}
            {autoAdvanceTimer && !transitionType && (
              <span className="ml-2 text-gray-500 text-sm">
                ({Math.ceil(autoAdvanceTimer / 1000)}s)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// RESULT TEXT
// =============================================================================

interface ResultTextProps {
  resultType: ResultType;
  yardsGained: number;
  colors: { text: string };
}

const ResultText: React.FC<ResultTextProps> = ({ resultType, yardsGained, colors }) => {
  const getText = () => {
    switch (resultType) {
      case 'COMPLETION':
        return `COMPLETE - ${yardsGained} YARDS`;
      case 'INCOMPLETION':
        return 'INCOMPLETE';
      case 'SACK':
        return `SACK - ${Math.abs(yardsGained)} YARD LOSS`;
      case 'RUN_GAIN':
        return `RUN - ${yardsGained} YARDS`;
      case 'RUN_LOSS':
        return `STUFFED - ${Math.abs(yardsGained)} YARD LOSS`;
      case 'TOUCHDOWN':
        return 'TOUCHDOWN!';
      case 'INTERCEPTION':
        return 'INTERCEPTED!';
      case 'FUMBLE':
        return 'FUMBLE!';
      case 'PENALTY':
        return 'FLAG ON THE PLAY';
      case 'FIELD_GOAL_GOOD':
        return 'FIELD GOAL GOOD!';
      case 'FIELD_GOAL_MISS':
        return 'NO GOOD';
      case 'PUNT':
        return `PUNT - ${yardsGained} YARDS`;
      case 'SAFETY':
        return 'SAFETY!';
      case 'TURNOVER_ON_DOWNS':
        return 'TURNOVER ON DOWNS';
      default:
        return 'PLAY RESULT';
    }
  };

  const getIcon = () => {
    switch (resultType) {
      case 'TOUCHDOWN': return '🏈';
      case 'INTERCEPTION': return '🖐️';
      case 'FUMBLE': return '💨';
      case 'SACK': return '💥';
      case 'FIELD_GOAL_GOOD': return '✅';
      case 'FIELD_GOAL_MISS': return '❌';
      case 'SAFETY': return '🛑';
      default: return null;
    }
  };

  const icon = getIcon();

  return (
    <div className={`text-3xl font-black ${colors.text} tracking-tight`}>
      {icon && <span className="mr-2">{icon}</span>}
      {getText()}
    </div>
  );
};

// =============================================================================
// YARD LINE VISUAL
// =============================================================================

interface YardLineVisualProps {
  yardsGained: number;
  startYard: number;
  endYard: number;
  isTouchdown: boolean;
}

const YardLineVisual: React.FC<YardLineVisualProps> = ({
  yardsGained,
  startYard,
  endYard,
  isTouchdown,
}) => {
  const direction = yardsGained >= 0 ? 'right' : 'left';
  const absYards = Math.abs(yardsGained);

  return (
    <div className="px-4 py-3 bg-gray-800/50">
      <div className="relative h-8 bg-green-900 rounded-lg overflow-hidden">
        {/* Field markings */}
        <div className="absolute inset-0 flex">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-white/20 flex items-center justify-center"
            >
              <span className="text-xs text-white/30">{(i + 1) * 10}</span>
            </div>
          ))}
        </div>

        {/* Movement indicator */}
        <div
          className={`absolute top-0 bottom-0 ${
            isTouchdown ? 'bg-amber-500/50' : yardsGained >= 0 ? 'bg-green-500/50' : 'bg-red-500/50'
          } transition-all duration-500`}
          style={{
            left: `${Math.min(startYard, endYard)}%`,
            width: `${absYards}%`,
          }}
        />

        {/* Ball marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full shadow-lg transition-all duration-500"
          style={{ left: `${endYard}%` }}
        />

        {/* Direction arrow */}
        {absYards > 5 && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 text-white/60 text-xl ${
              direction === 'right' ? 'animate-pulse' : 'animate-pulse rotate-180'
            }`}
            style={{ left: `${(startYard + endYard) / 2}%` }}
          >
            →
          </div>
        )}
      </div>

      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>Own {Math.max(1, Math.min(50, startYard > 50 ? 100 - startYard : startYard))}</span>
        <span className={yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}>
          {yardsGained >= 0 ? '+' : ''}{yardsGained} yds
        </span>
        <span>{endYard >= 50 ? `OPP ${100 - endYard}` : `Own ${endYard}`}</span>
      </div>
    </div>
  );
};

// =============================================================================
// MOMENTUM DISPLAY
// =============================================================================

interface MomentumDisplayProps {
  change: number;
  currentMomentum: number;
  isPositive: boolean;
}

const MomentumDisplay: React.FC<MomentumDisplayProps> = ({
  change,
  currentMomentum,
  isPositive,
}) => {
  return (
    <div className="px-4 py-3 bg-gray-800/30">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase">Momentum</span>
        <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {change > 0 ? '+' : ''}{change}
        </span>
      </div>

      {/* Momentum Bar */}
      <div className="flex gap-1 mt-2">
        {[...Array(MOMENTUM_CONFIG.MAX)].map((_, i) => {
          const isFilled = i < currentMomentum;
          const isNew = i >= currentMomentum - Math.abs(change) && i < currentMomentum && change > 0;
          const isLost = i >= currentMomentum && i < currentMomentum + Math.abs(change) && change < 0;

          return (
            <div
              key={i}
              className={`flex-1 h-3 rounded transition-all duration-500 ${
                isNew ? 'bg-green-500 animate-pulse' :
                isLost ? 'bg-red-500 animate-pulse' :
                isFilled
                  ? currentMomentum >= 5 ? 'bg-green-500' : currentMomentum >= 3 ? 'bg-amber-500' : 'bg-red-500'
                  : 'bg-gray-700'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// BREAKAWAY SEQUENCE
// =============================================================================

interface BreakawaySequenceProps {
  currentYard: number;
  isTouchdown: boolean;
  onComplete: () => void;
}

const BreakawaySequence: React.FC<BreakawaySequenceProps> = ({
  currentYard,
  isTouchdown,
}) => {
  const displayYard = currentYard > 50 ? 100 - currentYard : currentYard;
  const isOpponentSide = currentYard > 50;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center animate-pulse">
        <div className="text-6xl font-black text-white mb-4">
          {isTouchdown && currentYard >= 95 ? (
            <span className="text-amber-400">TOUCHDOWN!</span>
          ) : (
            <>
              He's at the <span className="text-green-400">{isOpponentSide ? 'OPP ' : ''}{displayYard}</span>...
            </>
          )}
        </div>

        {/* Running field visualization */}
        <div className="w-80 h-2 bg-green-900 rounded-full mx-auto overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${currentYard}%` }}
          />
        </div>

        <div className="mt-4 text-xl text-gray-400">
          {currentYard < 30 && '...'}
          {currentYard >= 30 && currentYard < 50 && '30...'}
          {currentYard >= 50 && currentYard < 70 && '20...'}
          {currentYard >= 70 && currentYard < 90 && '10...'}
          {currentYard >= 90 && !isTouchdown && '5...'}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// XP CHOICE MODAL
// =============================================================================

interface XPChoiceModalProps {
  onChoice: (choice: 'XP' | 'TWO_POINT') => void;
  playerScore: number;
  opponentScore: number;
}

const XPChoiceModal: React.FC<XPChoiceModalProps> = ({
  onChoice,
  playerScore,
  opponentScore,
}) => {
  const newScore = playerScore + 6;
  const differential = newScore - opponentScore;

  // Suggest 2pt if it matters
  const suggest2PT = differential === -2 || differential === -1 || differential === 1;

  return (
    <div className="fixed inset-0 bg-amber-900/90 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border-2 border-amber-500 overflow-hidden">
        <div className="p-6 text-center bg-gradient-to-b from-amber-600/30 to-transparent">
          <div className="text-5xl mb-2">🏈</div>
          <div className="text-3xl font-black text-amber-400">TOUCHDOWN!</div>
          <div className="mt-2 text-xl text-white">
            {newScore} - {opponentScore}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-center text-gray-400 mb-4">Extra Point Attempt</div>

          <button
            onClick={() => onChoice('XP')}
            className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-lg font-bold text-white">Extra Point</div>
                <div className="text-sm text-gray-400">Safe play</div>
              </div>
              <div className="text-2xl font-bold text-green-400">95%</div>
            </div>
          </button>

          <button
            onClick={() => onChoice('TWO_POINT')}
            className={`w-full p-4 rounded-xl border transition-all ${
              suggest2PT
                ? 'bg-amber-900/50 hover:bg-amber-800/50 border-amber-600'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-lg font-bold text-white">2-Point Conversion</div>
                <div className="text-sm text-gray-400">
                  {suggest2PT ? 'Could tie/take lead!' : 'Higher risk'}
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-400">50%</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// POSSESSION TRANSITION
// =============================================================================

interface PossessionTransitionProps {
  type: TransitionType;
  isPlayerGettingBall: boolean;
  fieldPosition: { yardLine: number; down: number; yardsToGo: number };
  playerScore: number;
  opponentScore: number;
  onContinue: () => void;
}

const PossessionTransition: React.FC<PossessionTransitionProps> = ({
  type,
  isPlayerGettingBall,
  fieldPosition,
  playerScore,
  opponentScore,
  onContinue,
}) => {
  const getTitle = () => {
    switch (type) {
      case 'TOUCHDOWN': return 'SCORE UPDATE';
      case 'FIELD_GOAL': return 'SCORE UPDATE';
      case 'PUNT': return 'CHANGE OF POSSESSION';
      case 'TURNOVER': return 'TURNOVER!';
      case 'TURNOVER_ON_DOWNS': return 'TURNOVER ON DOWNS';
      case 'SAFETY': return 'SAFETY!';
      default: return 'POSSESSION CHANGE';
    }
  };

  const getBallStatus = () => {
    if (isPlayerGettingBall) {
      return { team: 'YOUR', role: 'OFFENSE', color: 'text-amber-400' };
    }
    return { team: 'THEIR', role: 'DEFENSE', color: 'text-red-400' };
  };

  const ballStatus = getBallStatus();
  const yardDisplay = fieldPosition.yardLine > 50
    ? `OPP ${100 - fieldPosition.yardLine}`
    : `OWN ${fieldPosition.yardLine}`;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md text-center">
        {/* Title */}
        <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
          {getTitle()}
        </div>

        {/* Score Update */}
        {(type === 'TOUCHDOWN' || type === 'FIELD_GOAL' || type === 'SAFETY') && (
          <div className="text-4xl font-black text-white mb-6">
            {playerScore} - {opponentScore}
          </div>
        )}

        {/* Ball Status */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-6">
          <div className={`text-4xl font-black ${ballStatus.color} mb-2`}>
            {ballStatus.team} BALL
          </div>
          <div className="text-2xl text-gray-300 mb-6">
            {ballStatus.role}
          </div>

          <div className="text-lg text-gray-400">
            1st & 10 at {yardDisplay}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-bold text-lg transition-colors"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// INJURY DISPLAY
// =============================================================================

interface InjuryDisplayProps {
  injury: { playerId: string; severity: string; weeksOut: number };
}

const InjuryDisplay: React.FC<InjuryDisplayProps> = ({ injury }) => {
  return (
    <div className="mx-4 mb-3 p-3 bg-red-900/30 rounded-lg border border-red-800/50">
      <div className="flex items-center gap-2 text-red-400">
        <span className="text-lg">🏥</span>
        <span className="font-bold">INJURY</span>
      </div>
      <div className="text-sm text-gray-300 mt-1">
        Player down on the field - {injury.severity}
        {injury.weeksOut > 0 && (
          <span className="text-red-400"> (Out {injury.weeksOut} weeks)</span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// PENALTY DISPLAY
// =============================================================================

interface PenaltyDisplayProps {
  penalty: { type: string; yards: number; team: 'OFFENSE' | 'DEFENSE'; description: string };
}

const PenaltyDisplay: React.FC<PenaltyDisplayProps> = ({ penalty }) => {
  return (
    <div className="mx-4 mb-3 p-3 bg-yellow-900/30 rounded-lg border border-yellow-800/50">
      <div className="flex items-center gap-2 text-yellow-400">
        <span className="text-lg">🚩</span>
        <span className="font-bold">FLAG ON THE PLAY</span>
      </div>
      <div className="text-sm text-gray-300 mt-1">
        {penalty.type} - {penalty.yards} yards
        <span className="text-gray-500"> ({penalty.team})</span>
      </div>
      {penalty.description && (
        <div className="text-xs text-gray-500 mt-1">{penalty.description}</div>
      )}
    </div>
  );
};

// =============================================================================
// BREAKDOWN PANEL
// =============================================================================

interface BreakdownPanelProps {
  breakdown: PlayBreakdown;
}

const BreakdownPanel: React.FC<BreakdownPanelProps> = ({ breakdown }) => {
  return (
    <div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-500">Base Success</span>
        <span className="text-white">{breakdown.baseSuccessChance}%</span>
      </div>
      {breakdown.counterModifier !== 0 && (
        <div className="flex justify-between">
          <span className="text-gray-500">Counter</span>
          <span className={breakdown.counterModifier > 0 ? 'text-green-400' : 'text-red-400'}>
            {breakdown.counterModifier > 0 ? '+' : ''}{breakdown.counterModifier}%
          </span>
        </div>
      )}
      {breakdown.situationModifier !== 0 && (
        <div className="flex justify-between">
          <span className="text-gray-500">Situation</span>
          <span className={breakdown.situationModifier > 0 ? 'text-green-400' : 'text-red-400'}>
            {breakdown.situationModifier > 0 ? '+' : ''}{breakdown.situationModifier}%
          </span>
        </div>
      )}
      {breakdown.momentumModifier !== 0 && (
        <div className="flex justify-between">
          <span className="text-gray-500">Momentum</span>
          <span className={breakdown.momentumModifier > 0 ? 'text-green-400' : 'text-red-400'}>
            {breakdown.momentumModifier > 0 ? '+' : ''}{breakdown.momentumModifier}%
          </span>
        </div>
      )}
      <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
        <span className="text-gray-400 font-bold">Final</span>
        <span className="text-white font-bold">{breakdown.finalSuccessChance}%</span>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getResultType(result: PlayResult | FourthDownResult, offensePlayType?: OffensivePlayType): ResultType {
  // Check for special results first
  if (result.touchdown) return 'TOUCHDOWN';
  if (result.turnover) {
    if ('turnoverType' in result && result.turnoverType === 'INTERCEPTION') return 'INTERCEPTION';
    if ('turnoverType' in result && result.turnoverType === 'FUMBLE') return 'FUMBLE';
    if ('turnoverType' in result && result.turnoverType === 'DOWNS') return 'TURNOVER_ON_DOWNS';
    return 'FUMBLE';
  }
  if ('safety' in result && result.safety) return 'SAFETY';
  if ('sack' in result && result.sack) return 'SACK';

  // Fourth down specific
  if ('type' in result) {
    if (result.type === 'FIELD_GOAL') return result.success ? 'FIELD_GOAL_GOOD' : 'FIELD_GOAL_MISS';
    if (result.type === 'PUNT') return 'PUNT';
  }

  // Regular plays
  if ('penalty' in result && result.penalty) return 'PENALTY';

  const yards = 'yardsGained' in result ? (result.yardsGained ?? 0) : 0;
  const isPass = offensePlayType && ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(offensePlayType);

  if (isPass) {
    return result.success ? 'COMPLETION' : 'INCOMPLETION';
  } else {
    return yards >= 0 ? 'RUN_GAIN' : 'RUN_LOSS';
  }
}

function getTransitionType(result: PlayResult | FourthDownResult): TransitionType {
  if (result.touchdown) return 'TOUCHDOWN';
  if ('type' in result && result.type === 'FIELD_GOAL' && result.success) return 'FIELD_GOAL';
  if ('type' in result && result.type === 'PUNT') return 'PUNT';
  if (result.turnover) return 'TURNOVER';
  if ('safety' in result && result.safety) return 'SAFETY';
  if ('turnoverType' in result && result.turnoverType === 'DOWNS') return 'TURNOVER_ON_DOWNS';
  return null;
}

function getKeyMoment(result: PlayResult | FourthDownResult, resultType: ResultType): typeof KEY_MOMENTS[0] | null {
  if ('bigPlay' in result && result.bigPlay) {
    return KEY_MOMENTS.find(m => m.trigger === 'bigPlay') || null;
  }
  if ('sack' in result && result.sack) {
    return KEY_MOMENTS.find(m => m.trigger === 'bigHit') || null;
  }
  if (result.turnover) {
    return KEY_MOMENTS.find(m => m.trigger === 'pressureForced') || null;
  }
  if (resultType === 'COMPLETION' && 'yardsGained' in result && (result.yardsGained ?? 0) >= 15) {
    return KEY_MOMENTS.find(m => m.trigger === 'tightWindow') || null;
  }
  return null;
}

function getPlayerName(resultType: ResultType, playType?: OffensivePlayType): string {
  const isPass = playType && ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(playType);
  const isRun = playType && ['INSIDE_RUN', 'OUTSIDE_RUN', 'POWER_RUN', 'DRAW', 'QB_RUN'].includes(playType);

  if (resultType === 'INTERCEPTION') {
    return PLAYER_NAMES.DEF[Math.floor(Math.random() * PLAYER_NAMES.DEF.length)];
  }
  if (resultType === 'COMPLETION' && isPass) {
    return PLAYER_NAMES.WR[Math.floor(Math.random() * PLAYER_NAMES.WR.length)];
  }
  if ((resultType === 'RUN_GAIN' || resultType === 'RUN_LOSS') && isRun) {
    return PLAYER_NAMES.RB[Math.floor(Math.random() * PLAYER_NAMES.RB.length)];
  }
  return '';
}

function getPlayerAction(resultType: ResultType): string {
  switch (resultType) {
    case 'COMPLETION': return 'Caught by';
    case 'RUN_GAIN':
    case 'RUN_LOSS': return 'Carried by';
    case 'INTERCEPTION': return 'Picked off by';
    case 'FUMBLE': return 'Forced by';
    case 'TOUCHDOWN': return 'Scored by';
    default: return '';
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PlayResultDisplay;
