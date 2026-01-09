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
import type { FourthDownCategory, FourthDownDefenseResponse } from '../../types/game.types';

// Lazy load the heavy game components
import { PlayResultDisplay } from './PlayResult';

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
  onSnapBall: (card: OffensiveCard) => void;
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

  const handleSnap = useCallback(() => {
    if (selectedCard) {
      onSnapBall(selectedCard);
      setSelectedCard(null);
    }
  }, [selectedCard, onSnapBall]);

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

      {/* Card Hand */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-gray-400 text-sm mb-3">Select a play:</div>
        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
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
  } = useCardGameStore();

  const { draftedRoster, draftedDeck, userTeamId } = useGameStore();
  const { getCurrentUserGame } = useSeasonStore();

  const [lastResult, setLastResult] = useState<PlayResult | FourthDownResult | null>(null);

  // Initialize game on mount
  useEffect(() => {
    if (!isInitialized && draftedRoster && draftedDeck) {
      // Get opponent info
      const currentGame = getCurrentUserGame();
      const opponentId = currentGame
        ? (currentGame.homeTeamId === userTeamId ? currentGame.awayTeamId : currentGame.homeTeamId)
        : DEFAULT_TEAMS[0].info.id;

      // Generate opponent roster and deck
      const opponentRoster = generateAIRoster(opponentId, 'AVERAGE');
      const opponentDeck = buildDeck(opponentRoster);

      // Start the game (coin toss decides who receives)
      const playerReceivesFirst = Math.random() > 0.5;

      startGame(
        draftedRoster,
        opponentRoster,
        draftedDeck,
        opponentDeck,
        playerReceivesFirst
      );
    }
  }, [isInitialized, draftedRoster, draftedDeck, userTeamId, getCurrentUserGame, startGame]);

  // Handle snap ball (offensive play)
  const handleSnapBall = useCallback((card: OffensiveCard) => {
    selectOffensiveCard(card);
    // Execute the play after card selection
    const result = executePlay();
    if (result) {
      setLastResult(result);
      setPhase('PLAY_RESULT');
    }
  }, [selectOffensiveCard, executePlay, setPhase]);

  // Handle set defense
  const handleSetDefense = useCallback((card: DefensiveCard, prediction?: OffensivePlayType) => {
    selectDefensiveCard(card, prediction);
    // CPU selects offense, then execute
    // For now, CPU play is auto-selected in executePlay
    const result = executePlay();
    if (result) {
      setLastResult(result);
      setPhase('PLAY_RESULT');
    }
  }, [selectDefensiveCard, executePlay, setPhase]);

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
