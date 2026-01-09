/**
 * Card Game Controller
 *
 * Orchestrates the card-based game flow, switching between:
 * - OffensivePlay (when player has ball)
 * - DefensivePlay (when opponent has ball)
 * - PlayResultDisplay (after play resolves)
 */

import { useEffect, useState, useCallback } from 'react';
import { useCardGameStore } from '../../stores/cardGameStore';
import { useGameStore } from '../../stores/gameStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { DEFAULT_TEAMS } from '../../data/defaultTeams';
import { generateAIRoster } from '../../utils/playerGenerator';
import { buildDeck } from '../../engine/cardGenerator';
import type { OffensiveCard, DefensiveCard, OffensivePlayType } from '../../types/card.types';
import type { PlayResult, FourthDownResult } from '../../engine/playResolver';
import type { FourthDownCategory, FourthDownDefenseResponse, TargetPosition, OffensiveModifier } from '../../types/game.types';
import { getAvailableModifiers, MODIFIER_EFFECTS, LOCKED_TARGET_PLAYS, DEFAULT_PLAY_TARGETS } from '../../types/game.types';

// Lazy load the heavy game components
import { PlayResultDisplay } from './PlayResult';
import { PregamePresentation } from './PregamePresentation';

// =============================================================================
// TYPES
// =============================================================================

interface CardGameControllerProps {
  onGameEnd?: (playerScore: number, opponentScore: number) => void;
  onBack?: () => void;
}

// =============================================================================
// OFFENSIVE PLAY UI (Inline for now - the full component)
// =============================================================================

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
    offensiveMomentum,
    getAvailableOffensiveCards,
  } = useCardGameStore();

  const cards = getAvailableOffensiveCards();
  const [selectedCard, setSelectedCard] = useState<OffensiveCard | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetPosition | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<OffensiveModifier>('NONE');
  const [showHelp, setShowHelp] = useState(false);

  // Helper to check if play is a pass
  const isPassPlay = (playType: OffensivePlayType) => {
    return ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(playType);
  };

  // Get locked target for the selected card
  const lockedTarget = selectedCard ? LOCKED_TARGET_PLAYS[selectedCard.playType] : undefined;
  const defaultTarget = selectedCard ? DEFAULT_PLAY_TARGETS[selectedCard.playType] : undefined;
  const effectiveTarget = lockedTarget || selectedTarget || defaultTarget || 'WR1';

  // Get available modifiers for the selected card
  const availableModifiers = selectedCard
    ? getAvailableModifiers(isPassPlay(selectedCard.playType), selectedCard.playType === 'PLAY_ACTION')
    : [];

  // Get available targets based on play type
  const getAvailableTargets = (): TargetPosition[] => {
    if (!selectedCard) return [];
    if (lockedTarget) return [lockedTarget]; // Locked, no choice
    if (isPassPlay(selectedCard.playType)) {
      return ['WR1', 'WR2', 'TE', 'RB'];
    }
    return ['RB']; // Runs target RB
  };

  const availableTargets = getAvailableTargets();

  // Reset selections when card changes
  const handleCardSelect = (card: OffensiveCard) => {
    setSelectedCard(card);
    setSelectedTarget(null);
    setSelectedModifier('NONE');
  };

  const handleSnap = useCallback(() => {
    if (selectedCard) {
      onSnapBall(selectedCard, effectiveTarget, selectedModifier);
      setSelectedCard(null);
      setSelectedTarget(null);
      setSelectedModifier('NONE');
    }
  }, [selectedCard, effectiveTarget, selectedModifier, onSnapBall]);

  // Fourth down decision screen
  // Show 4th down decision only when on 4th down and NOT already waiting for defense response
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
      <div className="bg-green-900/30 border-b border-green-800/50 p-4 text-center">
        <div className="text-amber-400 font-bold text-lg">
          {fieldPosition.down === 1 ? '1st' : fieldPosition.down === 2 ? '2nd' : fieldPosition.down === 3 ? '3rd' : '4th'} & {fieldPosition.yardsToGo}
        </div>
        <div className="text-gray-400 text-sm">
          Ball at {fieldPosition.yardLine > 50 ? `OPP ${100 - fieldPosition.yardLine}` : `OWN ${fieldPosition.yardLine}`}
        </div>
      </div>

      {/* Momentum */}
      <div className="bg-gray-900 border-b border-gray-800 p-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 text-sm">Momentum:</span>
          <div className="flex gap-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded ${i < offensiveMomentum ? 'bg-amber-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-white font-bold">How Plays Work</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <h4 className="text-amber-400 font-bold mb-1">Success Rate</h4>
                <p className="text-gray-300">The % shown is your chance to gain the expected yards. Even failed plays can gain 1-2 yards (runs) or result in incompletions (passes).</p>
              </div>
              <div>
                <h4 className="text-amber-400 font-bold mb-1">Runs vs Passes</h4>
                <p className="text-gray-300">Runs have a higher floor (failed runs still gain some yards) but lower ceiling. Passes have higher variance - bigger gains possible, but incompletions = 0 yards.</p>
              </div>
              <div>
                <h4 className="text-amber-400 font-bold mb-1">Modifiers</h4>
                <p className="text-gray-300">Pre-snap adjustments that affect your play. Some are pass-only (Max Protect), some are run-only (Heavy Set).</p>
              </div>
              <div>
                <h4 className="text-amber-400 font-bold mb-1">Targets</h4>
                <p className="text-gray-300">For passes, pick who to throw to. Runs automatically target the RB. Defense can shade a receiver - if they guess right, you're penalized.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Hand */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="text-gray-400 text-sm">1. Select a play:</div>
          <button onClick={() => setShowHelp(true)} className="text-blue-400 text-xs hover:text-blue-300">? Help</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardSelect(card)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedCard?.id === card.id
                  ? 'border-amber-500 bg-amber-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="font-bold text-white text-sm truncate">{card.name}</div>
              <div className="text-gray-400 text-xs mt-1">{card.playType.replace(/_/g, ' ')}</div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-green-400">{card.successChance}%</span>
                <span className="text-blue-400">{card.baseYards} yds</span>
              </div>
            </button>
          ))}
        </div>

        {/* Target Selection (when card is selected) */}
        {selectedCard && availableTargets.length > 0 && (
          <div className="mb-4">
            <div className="text-gray-400 text-sm mb-2">2. Target:</div>
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

        {/* Modifier Selection (when card is selected) */}
        {selectedCard && availableModifiers.length > 1 && (
          <div className="mb-4">
            <div className="text-gray-400 text-sm mb-2">3. Modifier:</div>
            <div className="flex gap-2 flex-wrap">
              {availableModifiers.map(mod => (
                <button
                  key={mod}
                  onClick={() => setSelectedModifier(mod)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedModifier === mod
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  title={MODIFIER_EFFECTS[mod].description}
                >
                  {mod === 'NONE' ? 'Standard' : mod.replace(/_/g, ' ')}
                </button>
              ))}
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
        <button
          onClick={onTimeout}
          disabled={playerState.timeoutsRemaining === 0}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 disabled:opacity-50"
        >
          Timeout ({playerState.timeoutsRemaining})
        </button>
        <button
          onClick={handleSnap}
          disabled={!selectedCard}
          className={`w-full py-4 rounded-lg text-lg font-bold transition-all ${
            selectedCard
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          SNAP BALL
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// DEFENSIVE PLAY UI (Inline for now)
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
  const [selectedCard, setSelectedCard] = useState<DefensiveCard | null>(null);
  const [prediction, setPrediction] = useState<OffensivePlayType | null>(null);

  const handleSetDefense = useCallback(() => {
    if (selectedCard) {
      onSetDefense(selectedCard, prediction || undefined);
      setSelectedCard(null);
      setPrediction(null);
    }
  }, [selectedCard, prediction, onSetDefense]);

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
        <div className="flex items-center justify-center gap-2">
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
      </div>

      {/* Prediction Section */}
      <div className="bg-gray-900/50 border-b border-gray-800 p-3">
        <div className="text-gray-400 text-sm mb-2">Predict their play (bonus if correct):</div>
        <div className="flex flex-wrap gap-2">
          {(['INSIDE_RUN', 'OUTSIDE_RUN', 'SHORT_PASS', 'DEEP_PASS'] as OffensivePlayType[]).map(type => (
            <button
              key={type}
              onClick={() => setPrediction(prediction === type ? null : type)}
              className={`px-3 py-1 rounded text-sm ${
                prediction === type
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Card Hand */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-gray-400 text-sm mb-3">Select defensive play:</div>
        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedCard?.id === card.id
                  ? 'border-red-500 bg-red-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="font-bold text-white text-sm truncate">{card.name}</div>
              <div className="text-gray-400 text-xs mt-1">{card.playType.replace(/_/g, ' ')}</div>
              <div className="text-xs mt-2 text-red-400">
                vs Run: {card.runStopRating}% | vs Pass: {card.passDefenseRating}%
              </div>
            </button>
          ))}
        </div>
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
          disabled={!selectedCard}
          className={`w-full py-4 rounded-lg text-lg font-bold transition-all ${
            selectedCard
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          SET DEFENSE
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
    lastPlayedSelection,
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

    // CPU selects a random offense card, target, and modifier
    const cpuOffenseCards = opponentDeck?.hand.offensiveCards || [];
    if (cpuOffenseCards.length > 0) {
      const randomOffense = cpuOffenseCards[Math.floor(Math.random() * cpuOffenseCards.length)];
      // CPU randomly picks a target based on play type
      const isPass = ['SHORT_PASS', 'MEDIUM_PASS', 'DEEP_PASS', 'SCREEN', 'PLAY_ACTION'].includes(randomOffense.playType);
      const targets: TargetPosition[] = isPass ? ['WR1', 'WR2', 'TE', 'RB'] : ['RB'];
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      // CPU randomly picks a modifier (30% chance to use one)
      const cpuModifiers = getAvailableModifiers(isPass, randomOffense.playType === 'PLAY_ACTION');
      const randomModifier = Math.random() < 0.3 && cpuModifiers.length > 1
        ? cpuModifiers[Math.floor(Math.random() * cpuModifiers.length)]
        : 'NONE';
      selectOffensiveCard(randomOffense, randomTarget, randomModifier);
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

    // Set phase based on possession
    if (isPlayerOnOffense()) {
      setPhase('OFFENSE_SELECT');
    } else {
      setPhase('DEFENSE_SELECT');
    }
  }, [phase, isPlayerOnOffense, setPhase, playerState.score, opponentState.score, onGameEnd]);

  // Handle XP choice
  const handleXPChoice = useCallback((choice: 'XP' | 'TWO_POINT') => {
    // TODO: Implement XP choice
    console.log('XP choice:', choice);
    handleContinue();
  }, [handleContinue]);

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

    return (
      <PlayResultDisplay
        result={lastResult}
        offensePlayType={offenseCard?.playType}
        targetPosition={lastPlayedSelection?.offenseTarget || undefined}
        defenseCard={defenseCard || undefined}
        defenseShade={lastPlayedSelection?.defenseShade || undefined}
        isPlayerOffense={isPlayerOnOffense()}
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
