/**
 * ILLEGAL MOTION - Play Result Display
 *
 * Shows what happened after a play resolves.
 * Dramatic presentation with delayed reveals and typewriter narration.
 *
 * Phases: SNAP -> NARRATION -> RESULT -> (BREAKAWAY) -> (TRANSITION)
 * Handles: completions, runs, sacks, turnovers, TDs, penalties
 * Plus: momentum changes, breakaway sequences, possession transitions
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCardGameStore, MOMENTUM_CONFIG } from '../../stores/cardGameStore';
import type { PlayResult, FourthDownResult, PlayBreakdown, ShadeResult } from '../../engine/playResolver';
import type { OffensivePlayType, DefensiveCard } from '../../types/card.types';
import type { TargetPosition, ShadePosition } from '../../types/game.types';

// =============================================================================
// TYPES
// =============================================================================

interface PlayResultDisplayProps {
  result: PlayResult | FourthDownResult;
  offensePlayType?: OffensivePlayType;
  targetPosition?: TargetPosition;
  defenseCard?: DefensiveCard;
  defenseShade?: ShadePosition;
  isPlayerOffense: boolean;
  onContinue: () => void;
  onXPChoice?: (choice: 'XP' | 'TWO_POINT') => void;
}

// Secondary effects shown after narration
interface SecondaryEffect {
  icon: string;
  text: string;
  color: string;
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
  WR1: ['Jackson', 'Davis', 'Miller', 'Wilson', 'Moore'],
  WR2: ['Jefferson', 'Hill', 'Adams', 'Diggs', 'Chase'],
  RB: ['Taylor', 'Anderson', 'Thomas', 'Harris', 'Martin'],
  TE: ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Pitts'],
  DEF: ['Adams', 'Howard', 'Diggs', 'Ward', 'Ramsey'],
};

// =============================================================================
// NARRATION TEMPLATES
// =============================================================================

const NARRATION_TEMPLATES = {
  // Pass completions
  PASS_COMPLETE: [
    '{qb} drops back... finds {target} on the curl for {yards}!',
    '{target} breaks inside, {qb} hits him in stride - {yards} yard gain!',
    'Quick throw to {target}, he makes a man miss... picks up {yards}!',
    '{qb} fires to {target}, complete! {yards} yards on the play.',
    '{target} runs a perfect route, {qb} delivers - {yards} yard pickup!',
    'Play action fake, {qb} finds {target} wide open for {yards}!',
  ],
  // Pass completions - big play additions
  PASS_COMPLETE_BIG: [
    '{target} has room! He\'s got the first and more - {yards} yards!',
    'LOOK AT HIM GO! {target} breaks free for {yards}!',
    '{qb} drops it in the bucket! {target} takes it {yards} yards!',
  ],
  // Pass incomplete
  PASS_INCOMPLETE: [
    '{qb} fires to {target}... just out of reach. Incomplete.',
    '{target} can\'t hang on! Pass falls incomplete.',
    'Thrown behind {target}, no chance. Incomplete.',
    '{qb} overthrows {target}, pass sails out of bounds.',
    'Tight coverage! {target} can\'t come up with it.',
    'Dropped! {target} had it and let it slip away.',
  ],
  // Run plays - positive
  RUN_GAIN: [
    '{rb} takes the handoff left, {yards} yards before being dragged down.',
    '{rb} hits the hole, finds some room - {yards} yard gain.',
    '{rb} bounces outside, breaks a tackle - {yards} yard pickup!',
    'Good push up front! {rb} barrels forward for {yards}.',
    '{rb} follows his blockers, picks up {yards} on the ground.',
  ],
  // Run plays - big gain additions
  RUN_BIG: [
    'He\'s got room! {rb} bursts through for {yards}!',
    'BREAKAWAY! {rb} finds a seam and takes off - {yards} yards!',
    '{rb} makes them miss and he\'s GONE! {yards} yard run!',
  ],
  // Run plays - loss/stuffed
  RUN_LOSS: [
    '{rb} hits the hole... stuffed for a loss of {yards}. Nowhere to go.',
    'Nowhere to run! {rb} dragged down for a {yards} yard loss.',
    'Defense blows it up! {rb} loses {yards} yards.',
    '{rb} tries to bounce outside but gets swallowed up. Loss of {yards}.',
  ],
  // Sacks
  SACK: [
    '{qb} is SACKED! {yards} yard loss!',
    'Pressure gets there! {qb} goes down for a loss of {yards}!',
    '{qb} holds the ball too long... SACKED for a loss of {yards}!',
    'The pocket collapses! {qb} taken down, loses {yards}!',
    'Blitz gets home! {qb} sacked for a {yards} yard loss!',
  ],
  // Interceptions
  INTERCEPTION: [
    '{qb} throws into coverage... INTERCEPTED!',
    'Picked off! {target} was blanketed!',
    '{qb} didn\'t see the defender - INTERCEPTION!',
    'BAD DECISION! {qb}\'s pass is picked off!',
    'Jumped the route! That pass is INTERCEPTED!',
  ],
  // Fumbles
  FUMBLE: [
    'AND HE\'S LOST IT! Ball on the ground!',
    'Big hit and the ball comes loose! FUMBLE!',
    'The ball is OUT! Defenders pounce on it!',
    'Stripped! The defense recovers the fumble!',
  ],
  // Touchdowns
  TOUCHDOWN: [
    '{player} walks in! TOUCHDOWN!',
    'Into the endzone! TOUCHDOWN {team}!',
    '{player} punches it in! SIX POINTS!',
    'HOUSE CALL! {player} scores!',
  ],
};

// Timing constants
const SNAP_DELAY = 1000;           // 1 second showing "Ball snapped..."
const DEFENSE_REVEAL_DELAY = 1500; // 1.5 seconds showing defense call
const TYPEWRITER_SPEED = 25;       // 25ms per character
const SECONDARY_EFFECT_DELAY = 300; // Time between secondary effects

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PlayResultDisplay: React.FC<PlayResultDisplayProps> = ({
  result,
  offensePlayType,
  targetPosition,
  defenseCard,
  defenseShade,
  isPlayerOffense,
  onContinue,
  onXPChoice,
}) => {
  // Phase flow: snap -> defense_reveal -> narration -> result -> (breakaway) -> (transition) -> (xp_choice)
  const [phase, setPhase] = useState<'snap' | 'defense_reveal' | 'narration' | 'result' | 'breakaway' | 'transition' | 'xp_choice'>('snap');
  const [breakawayYard, setBreakawayYard] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Narration state
  const [narrationText, setNarrationText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [secondaryEffects, setSecondaryEffects] = useState<SecondaryEffect[]>([]);
  const [visibleEffects, setVisibleEffects] = useState(0);
  const skipRef = useRef(false);

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

  // Generate narration text
  const generatedNarration = useMemo(() => {
    return generateNarration(result, resultType, offensePlayType, targetPosition);
  }, [result, resultType, offensePlayType, targetPosition]);

  // Generate secondary effects
  const generatedEffects = useMemo(() => {
    return generateSecondaryEffects(result, resultType, targetPosition, isPlayerOffense);
  }, [result, resultType, targetPosition, isPlayerOffense]);

  // Phase 1: Snap delay (1 second)
  useEffect(() => {
    if (phase === 'snap') {
      const timer = setTimeout(() => {
        setPhase('defense_reveal');
      }, SNAP_DELAY);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Phase 2: Defense reveal (1.5 seconds)
  useEffect(() => {
    if (phase === 'defense_reveal') {
      const timer = setTimeout(() => {
        setNarrationText(generatedNarration);
        setSecondaryEffects(generatedEffects);
        setPhase('narration');
      }, DEFENSE_REVEAL_DELAY);
      return () => clearTimeout(timer);
    }
  }, [phase, generatedNarration, generatedEffects]);

  // Phase 3: Typewriter effect for narration
  useEffect(() => {
    if (phase === 'narration' && narrationText) {
      let index = 0;
      skipRef.current = false;

      const typeInterval = setInterval(() => {
        if (skipRef.current) {
          setDisplayedText(narrationText);
          setIsTypingComplete(true);
          clearInterval(typeInterval);
          return;
        }

        if (index < narrationText.length) {
          setDisplayedText(narrationText.slice(0, index + 1));
          index++;
        } else {
          setIsTypingComplete(true);
          clearInterval(typeInterval);
        }
      }, TYPEWRITER_SPEED);

      return () => clearInterval(typeInterval);
    }
  }, [phase, narrationText]);

  // Phase 3b: Show secondary effects one at a time after typing
  useEffect(() => {
    if (isTypingComplete && secondaryEffects.length > 0 && visibleEffects < secondaryEffects.length) {
      const timer = setTimeout(() => {
        setVisibleEffects(prev => prev + 1);
      }, SECONDARY_EFFECT_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isTypingComplete, secondaryEffects.length, visibleEffects]);

  // Phase 3c: Auto-transition to result phase disabled - now requires tap
  // (No auto-advance - user must tap)

  // Handle tap during narration - skip typing OR advance to result
  const handleNarrationTap = useCallback(() => {
    if (phase === 'narration') {
      if (!isTypingComplete) {
        // Skip typewriter animation
        skipRef.current = true;
        setDisplayedText(narrationText);
        setIsTypingComplete(true);
        setVisibleEffects(secondaryEffects.length);
      } else {
        // Typing complete, advance to result
        setPhase('result');
      }
    }
  }, [phase, isTypingComplete, narrationText, secondaryEffects.length]);

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

  // Auto-advance disabled - user must tap to continue
  // (Removed auto-advance timer for better user control)

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
  // Phase: SNAP - "Ball snapped..."
  if (phase === 'snap') {
    return (
      <SnapPhaseDisplay />
    );
  }

  // Phase: DEFENSE REVEAL - Show what defense called
  if (phase === 'defense_reveal') {
    // Get shade result from PlayResult if available
    const shadeResult = isPlayResult ? (result as PlayResult).shadeResult : undefined;
    return (
      <DefenseRevealDisplay
        defenseCard={defenseCard}
        defenseShade={defenseShade}
        targetPosition={targetPosition}
        shadeResult={shadeResult}
      />
    );
  }

  // Phase: NARRATION - Typewriter effect with play-by-play
  if (phase === 'narration') {
    return (
      <NarrationPhaseDisplay
        displayedText={displayedText}
        isTypingComplete={isTypingComplete}
        secondaryEffects={secondaryEffects}
        visibleEffects={visibleEffects}
        onTap={handleNarrationTap}
      />
    );
  }

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

          {/* Narrated Play-by-Play */}
          <div className="mt-3 text-sm text-gray-300 italic">
            "{narrationText || result.playByPlay}"
          </div>

          {/* Shade Result */}
          {isPlayResult && (result as PlayResult).shadeResult && (
            <ShadeResultDisplay shadeResult={(result as PlayResult).shadeResult!} />
          )}
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
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors animate-pulse"
          >
            {transitionType ? 'TAP TO CONTINUE' : 'TAP FOR NEXT PLAY'}
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
// SHADE RESULT DISPLAY
// =============================================================================

interface ShadeResultDisplayProps {
  shadeResult: ShadeResult;
}

const ShadeResultDisplay: React.FC<ShadeResultDisplayProps> = ({ shadeResult }) => {
  const isSuccess = shadeResult.shadeMatched || shadeResult.runShadeBonus;

  return (
    <div className={`mt-3 p-2 rounded-lg border ${
      isSuccess
        ? 'bg-green-900/30 border-green-800/50'
        : 'bg-gray-800/30 border-gray-700/50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isSuccess ? '👁️' : '❌'}</span>
          <span className={`text-sm font-medium ${isSuccess ? 'text-green-400' : 'text-gray-400'}`}>
            {shadeResult.message}
          </span>
        </div>
        {shadeResult.bonusApplied > 0 && (
          <span className="text-xs font-bold text-green-400 bg-green-900/50 px-2 py-0.5 rounded">
            +{shadeResult.bonusApplied}% DEF
          </span>
        )}
      </div>
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
      {breakdown.shadeModifier !== 0 && (
        <div className="flex justify-between">
          <span className="text-gray-500">Shade</span>
          <span className={breakdown.shadeModifier > 0 ? 'text-green-400' : 'text-red-400'}>
            {breakdown.shadeModifier > 0 ? '+' : ''}{breakdown.shadeModifier}%
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
// SNAP PHASE DISPLAY
// =============================================================================

const SnapPhaseDisplay: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">🏈</div>
        <div className="text-3xl font-bold text-white animate-pulse">
          Ball snapped...
        </div>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DEFENSE REVEAL DISPLAY
// =============================================================================

interface DefenseRevealDisplayProps {
  defenseCard?: DefensiveCard;
  defenseShade?: ShadePosition;
  targetPosition?: TargetPosition;
  shadeResult?: ShadeResult;
}

const DEFENSE_PLAY_LABELS: Record<string, string> = {
  MAN_COVERAGE: 'Man Coverage',
  ZONE_COVERAGE: 'Zone Coverage',
  BLITZ: 'Blitz',
  PREVENT: 'Prevent Defense',
  GOAL_LINE: 'Goal Line',
  RUN_STUFF: 'Run Stuff',
  SPY: 'Spy',
  COVER_2: 'Cover 2',
  COVER_3: 'Cover 3',
};

const DefenseRevealDisplay: React.FC<DefenseRevealDisplayProps> = ({
  defenseCard,
  defenseShade,
  targetPosition,
  shadeResult,
}) => {
  // Determine if shade was correct
  const shadeMatched = shadeResult?.shadeMatched || shadeResult?.runShadeBonus;
  const shadeLabel = defenseShade && defenseShade !== 'NONE' ? defenseShade : null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-6">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
            Defense Called
          </div>
          <div className="text-4xl">🛡️</div>
        </div>

        {/* Defense Card Info */}
        <div className="bg-gray-900/80 rounded-xl border-2 border-red-500/50 p-6 animate-fadeIn">
          {defenseCard ? (
            <>
              {/* Coverage Type */}
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-red-400">
                  {defenseCard.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {DEFENSE_PLAY_LABELS[defenseCard.playType] || defenseCard.playType.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Shade Info */}
              {shadeLabel && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-gray-400">Shading:</span>
                    <span className={`text-xl font-bold ${
                      shadeMatched ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {shadeLabel}
                      {shadeMatched ? (
                        <span className="ml-2 text-green-400">✓</span>
                      ) : (
                        <span className="ml-2 text-red-400/50">✗</span>
                      )}
                    </span>
                  </div>
                  {shadeMatched && (
                    <div className="text-center mt-2 text-sm text-green-400 animate-pulse">
                      Defense read the play!
                    </div>
                  )}
                  {!shadeMatched && targetPosition && (
                    <div className="text-center mt-2 text-sm text-gray-500">
                      You targeted: {targetPosition}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400">
              Defense is set...
            </div>
          )}
        </div>

        {/* Flash animation overlay */}
        <div className="absolute inset-0 bg-red-500/10 animate-ping pointer-events-none"
             style={{ animationDuration: '0.5s', animationIterationCount: '1' }} />
      </div>
    </div>
  );
};

// =============================================================================
// NARRATION PHASE DISPLAY
// =============================================================================

interface NarrationPhaseDisplayProps {
  displayedText: string;
  isTypingComplete: boolean;
  secondaryEffects: SecondaryEffect[];
  visibleEffects: number;
  onTap: () => void;
}

const NarrationPhaseDisplay: React.FC<NarrationPhaseDisplayProps> = ({
  displayedText,
  isTypingComplete,
  secondaryEffects,
  visibleEffects,
  onTap,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-6"
      onClick={onTap}
    >
      <div className="w-full max-w-md text-center">
        {/* Narration Text with Typewriter Effect */}
        <div className="text-xl text-white font-medium leading-relaxed min-h-[4rem]">
          "{displayedText}"
          {!isTypingComplete && (
            <span className="inline-block w-0.5 h-5 bg-amber-500 ml-1 animate-pulse" />
          )}
        </div>

        {/* Secondary Effects */}
        {isTypingComplete && secondaryEffects.length > 0 && (
          <div className="mt-6 space-y-2">
            {secondaryEffects.slice(0, visibleEffects).map((effect, index) => (
              <div
                key={index}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 animate-fadeIn ${effect.color}`}
              >
                <span className="text-lg">{effect.icon}</span>
                <span className="text-sm font-medium">{effect.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tap to skip hint */}
        {!isTypingComplete && (
          <div className="mt-8 text-xs text-gray-600 animate-pulse">
            Tap to skip
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// NARRATION GENERATION
// =============================================================================

function generateNarration(
  result: PlayResult | FourthDownResult,
  resultType: ResultType,
  _playType?: OffensivePlayType,
  targetPosition?: TargetPosition
): string {
  const yards = 'yardsGained' in result ? Math.abs(result.yardsGained ?? 0) : 0;
  const isBigPlay = 'bigPlay' in result && result.bigPlay;

  // Get player names
  const qbName = PLAYER_NAMES.QB[Math.floor(Math.random() * PLAYER_NAMES.QB.length)];
  const rbName = PLAYER_NAMES.RB[Math.floor(Math.random() * PLAYER_NAMES.RB.length)];

  // Get target name based on position
  let targetName = PLAYER_NAMES.WR[Math.floor(Math.random() * PLAYER_NAMES.WR.length)];
  if (targetPosition === 'WR1') {
    targetName = PLAYER_NAMES.WR1[Math.floor(Math.random() * PLAYER_NAMES.WR1.length)];
  } else if (targetPosition === 'WR2') {
    targetName = PLAYER_NAMES.WR2[Math.floor(Math.random() * PLAYER_NAMES.WR2.length)];
  } else if (targetPosition === 'TE') {
    targetName = PLAYER_NAMES.TE[Math.floor(Math.random() * PLAYER_NAMES.TE.length)];
  } else if (targetPosition === 'RB') {
    targetName = rbName;
  }

  let templates: string[];

  switch (resultType) {
    case 'COMPLETION':
      templates = isBigPlay && yards >= 15
        ? NARRATION_TEMPLATES.PASS_COMPLETE_BIG
        : NARRATION_TEMPLATES.PASS_COMPLETE;
      break;
    case 'INCOMPLETION':
      templates = NARRATION_TEMPLATES.PASS_INCOMPLETE;
      break;
    case 'RUN_GAIN':
      templates = isBigPlay && yards >= 15
        ? NARRATION_TEMPLATES.RUN_BIG
        : NARRATION_TEMPLATES.RUN_GAIN;
      break;
    case 'RUN_LOSS':
      templates = NARRATION_TEMPLATES.RUN_LOSS;
      break;
    case 'SACK':
      templates = NARRATION_TEMPLATES.SACK;
      break;
    case 'INTERCEPTION':
      templates = NARRATION_TEMPLATES.INTERCEPTION;
      break;
    case 'FUMBLE':
      templates = NARRATION_TEMPLATES.FUMBLE;
      break;
    case 'TOUCHDOWN':
      templates = NARRATION_TEMPLATES.TOUCHDOWN;
      break;
    default:
      return result.playByPlay;
  }

  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders
  return template
    .replace(/{qb}/g, qbName)
    .replace(/{rb}/g, rbName)
    .replace(/{target}/g, targetName)
    .replace(/{player}/g, targetPosition === 'RB' ? rbName : targetName)
    .replace(/{yards}/g, String(yards))
    .replace(/{team}/g, 'YOUR TEAM');
}

// =============================================================================
// SECONDARY EFFECTS GENERATION
// =============================================================================

function generateSecondaryEffects(
  result: PlayResult | FourthDownResult,
  resultType: ResultType,
  targetPosition?: TargetPosition,
  isPlayerOffense?: boolean
): SecondaryEffect[] {
  const effects: SecondaryEffect[] = [];
  const yards = 'yardsGained' in result ? (result.yardsGained ?? 0) : 0;
  const isBigPlay = 'bigPlay' in result && result.bigPlay;

  // Big hit (20% chance was rolled elsewhere, but we can show if it happened based on certain conditions)
  // For now, show on sacks and short-yardage stuffs
  if (resultType === 'SACK' || (resultType === 'RUN_LOSS' && yards <= -2)) {
    effects.push({
      icon: '💥',
      text: `Crushing tackle! ${targetPosition || 'Player'} takes a hit`,
      color: 'text-red-400',
    });
  }

  // Breakaway drain (15+ yards)
  if (yards >= 15 && targetPosition && resultType !== 'INCOMPLETION') {
    effects.push({
      icon: '🏃',
      text: `${targetPosition} -12 stamina (sprint)`,
      color: 'text-amber-400',
    });
  }

  // Regular target drain
  if (targetPosition && resultType !== 'INCOMPLETION' && yards < 15 && yards > -5) {
    effects.push({
      icon: '⚡',
      text: `${targetPosition} -10 stamina`,
      color: 'text-gray-400',
    });
  }

  // Momentum changes
  if ('sack' in result && result.sack) {
    effects.push({
      icon: '😤',
      text: 'Defense +1 momentum',
      color: 'text-green-400',
    });
  }

  if (isBigPlay && isPlayerOffense) {
    effects.push({
      icon: '🔥',
      text: 'Offense +1 momentum',
      color: 'text-amber-400',
    });
  }

  if (result.turnover) {
    effects.push({
      icon: '💔',
      text: 'Turnover! Momentum shift',
      color: 'text-red-400',
    });
  }

  return effects;
}

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
