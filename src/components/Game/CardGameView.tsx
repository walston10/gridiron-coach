// src/components/Game/CardGameView.tsx
// FULLY WIRED - connects to real stores and engines

import React, { useState, useEffect } from 'react';
import { useSimpleCardGameStore, type DefenseCard } from '../../stores/simpleCardGameStore';
import { useGameStore } from '../../stores/gameStore';
import { generateDeckFromRoster } from '../../engine/deckGenerator';

export const CardGameView: React.FC = () => {
  const { draftedRoster } = useGameStore();

  // Get state from card game store
  const {
    gameState,
    hand,
    momentum,
    tendencies,
    activeBonuses,
    defenseIntel,

    // Actions
    selectCard,
    selectedCard,
    snapBall,
    selectCoverage,
    selectAdjustment,
    selectedCoverage,
    selectedAdjustment,
    setDefense,
    drawCards,
    useTimeout,
    initializeGame,

    // Derived
    isPlayerOnOffense,
    canAffordCard,
  } = useSimpleCardGameStore();

  const [showMatchups, setShowMatchups] = useState(false);
  const [showTendencies, setShowTendencies] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    if (!isInitialized && draftedRoster) {
      const deck = generateDeckFromRoster(draftedRoster);
      initializeGame(draftedRoster, deck);
      setIsInitialized(true);
    }
  }, [draftedRoster, isInitialized, initializeGame]);

  // Coverage options (base coverages are free)
  const coverageOptions: DefenseCard[] = [
    { id: 'cover0', name: 'Cover 0', type: 'coverage', cost: 0, description: 'All out blitz, no safety help', vsRun: 45, vsPass: 40 },
    { id: 'cover1', name: 'Cover 1', type: 'coverage', cost: 0, description: 'Single high safety, man under', vsRun: 55, vsPass: 65 },
    { id: 'cover2', name: 'Cover 2', type: 'coverage', cost: 0, description: 'Two deep safeties, zone under', vsRun: 50, vsPass: 70 },
    { id: 'cover3', name: 'Cover 3', type: 'coverage', cost: 0, description: 'Three deep zones', vsRun: 55, vsPass: 68 },
    { id: 'cover4', name: 'Cover 4', type: 'coverage', cost: 0, description: 'Four deep quarters', vsRun: 48, vsPass: 75 },
    { id: 'man', name: 'Man Coverage', type: 'coverage', cost: 0, description: 'Man-to-man across the board', vsRun: 52, vsPass: 68 },
  ];

  const adjustmentOptions: DefenseCard[] = [
    { id: 'blitz', name: 'Blitz', type: 'adjustment', cost: 1, description: 'Send extra rusher', vsRun: -5, vsPass: -10, sackBonus: 15 },
    { id: 'spy', name: 'Spy', type: 'adjustment', cost: 1, description: 'LB watches QB', vsRun: 5, vsPass: 5, scrambleCounter: true },
    { id: 'bracket', name: 'Bracket', type: 'adjustment', cost: 2, description: 'Double team WR1', vsRun: -5, vsPass: 15 },
    { id: 'press', name: 'Press', type: 'adjustment', cost: 1, description: 'Jam at the line', vsRun: 0, vsPass: 8 },
  ];

  const handleSnapBall = async () => {
    if (!selectedCard) return;
    if (!canAffordCard(selectedCard)) return;

    const result = await snapBall(selectedCard);
    setLastResult(result);
    setShowResult(true);

    // Auto-hide result after delay
    setTimeout(() => {
      setShowResult(false);
      setLastResult(null);
    }, 3000);
  };

  const handleSetDefense = async () => {
    if (!selectedCoverage) return;

    const result = await setDefense(selectedCoverage, selectedAdjustment);
    setLastResult(result);
    setShowResult(true);

    setTimeout(() => {
      setShowResult(false);
      setLastResult(null);
    }, 3000);
  };

  const getCardBg = (type: string) => {
    switch (type) {
      case 'pass': return 'from-blue-900 via-blue-800 to-blue-950';
      case 'run': return 'from-emerald-900 via-emerald-800 to-emerald-950';
      case 'dirty': return 'from-purple-900 via-fuchsia-900 to-purple-950';
      case 'special': return 'from-amber-900 via-amber-800 to-amber-950';
      default: return 'from-gray-800 to-gray-900';
    }
  };

  const getSuccessColor = (prob: number) => {
    if (prob >= 65) return 'text-green-400';
    if (prob >= 45) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDown = (down: number) => {
    switch (down) {
      case 1: return '1st';
      case 2: return '2nd';
      case 3: return '3rd';
      case 4: return '4th';
      default: return `${down}th`;
    }
  };

  const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (!isInitialized || hand.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-black flex flex-col items-center justify-center font-sans text-white p-6">
        <div className="text-amber-500 text-2xl font-bold mb-4">KICKOFF</div>
        <div className="text-gray-400">Preparing game...</div>
      </div>
    );
  }

  // Game over screen
  if (gameState.isGameOver) {
    const playerWon = gameState.playerScore > gameState.opponentScore;
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-black flex flex-col items-center justify-center font-sans text-white p-6">
        <div className={`text-4xl font-bold mb-4 ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
          {playerWon ? 'VICTORY!' : 'DEFEAT'}
        </div>
        <div className="text-6xl font-bold text-white mb-8">
          {gameState.playerScore} - {gameState.opponentScore}
        </div>
        <div className="text-gray-500">Final Score</div>
      </div>
    );
  }

  // PLAY RESULT OVERLAY
  if (showResult && lastResult) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-black flex flex-col items-center justify-center font-sans text-white p-6">
        <div className={`text-center ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
          <div className="text-6xl mb-4">
            {lastResult.touchdown ? '🏈🎉' : lastResult.turnover ? '😱' : lastResult.success ? '✓' : '✗'}
          </div>
          <div className="text-3xl font-black mb-2">
            {lastResult.touchdown ? 'TOUCHDOWN!' :
             lastResult.turnover ? (lastResult.interception ? 'INTERCEPTED!' : 'FUMBLE!') :
             lastResult.sack ? 'SACKED!' :
             lastResult.success ? 'COMPLETE!' : 'INCOMPLETE'}
          </div>
          <div className="text-5xl font-black mb-4">
            {lastResult.yards > 0 ? '+' : ''}{lastResult.yards} YDS
          </div>
          {lastResult.breakaway && (
            <div className="text-purple-400 text-xl font-bold mb-2">💥 BREAKAWAY!</div>
          )}
          {lastResult.firstDown && !lastResult.touchdown && (
            <div className="text-amber-400 text-xl font-bold mb-2">FIRST DOWN!</div>
          )}
          <div className="text-slate-400 text-sm">
            {lastResult.clockUsed && `Clock: -${lastResult.clockUsed}s`}
          </div>
        </div>

        {/* Momentum change */}
        {lastResult.momentumChange !== 0 && (
          <div className={`mt-4 text-lg font-bold ${lastResult.momentumChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
            Momentum {lastResult.momentumChange > 0 ? '+' : ''}{lastResult.momentumChange}
          </div>
        )}

        <div className="mt-8 text-slate-500 text-sm animate-pulse">
          Continuing...
        </div>
      </div>
    );
  }

  // OFFENSE VIEW
  if (isPlayerOnOffense) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col font-sans text-white overflow-hidden">

        {/* === TOP BAR === */}
        <div className="bg-black/90 px-3 py-2 flex justify-between items-center border-b border-amber-600/30">
          <div className="text-center">
            <div className="text-amber-500 text-xs font-bold tracking-wider">YOU</div>
            <div className="text-3xl font-black text-amber-400">{gameState.playerScore}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-slate-400 text-xs">Q{gameState.quarter} • {formatClock(gameState.clock)}</div>
            <div className="text-white text-lg font-bold">
              {formatDown(gameState.down)} & {gameState.distance}
            </div>
            <div className="text-slate-500 text-xs">
              {gameState.fieldPosition > 50 ? `OPP ${100 - gameState.fieldPosition}` : `OWN ${gameState.fieldPosition}`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-red-500 text-xs font-bold tracking-wider">OPP</div>
            <div className="text-3xl font-black text-red-400">{gameState.opponentScore}</div>
          </div>
        </div>

        {/* === ACTIVE BONUSES === */}
        {activeBonuses.length > 0 && (
          <div className="bg-green-950/40 px-3 py-2 border-b border-green-700/30">
            <div className="flex gap-2 overflow-x-auto">
              {activeBonuses.map((bonus, i) => (
                <div key={i} className="flex-shrink-0 bg-green-900/50 border border-green-600/50 rounded px-2 py-1">
                  <span className="text-green-400 text-xs font-bold">{bonus.name}</span>
                  <span className="text-green-300 text-xs ml-1">+{bonus.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === MAIN FIELD AREA === */}
        <div className="flex-1 relative bg-gradient-to-b from-slate-800/30 to-slate-900/50 overflow-hidden">

          {/* Defense Intel Panel */}
          <div className="absolute top-2 left-2 right-2 bg-red-950/90 border border-red-800/50 rounded-lg p-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-red-400 text-xs font-bold">DC: {defenseIntel?.coordinator || 'Unknown'}</div>
                <div className="text-red-300 text-sm font-bold">{defenseIntel?.showing || 'Base Defense'}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">{defenseIntel?.personality || 'BALANCED'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-500">READING YOU AS:</div>
                <div className="text-red-300 text-sm font-bold">
                  {tendencies.runRate > 0.6 ? '⚠️ Run Heavy' : tendencies.runRate < 0.4 ? '⚠️ Pass Heavy' : 'Balanced'}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Panels */}
          <div className="absolute top-24 left-2 right-2 flex gap-2">
            <button
              onClick={() => { setShowMatchups(!showMatchups); setShowTendencies(false); }}
              className={`flex-1 text-xs py-1.5 rounded border transition-all ${showMatchups ? 'bg-blue-900/80 border-blue-500 text-blue-300' : 'bg-slate-800/80 border-slate-600 text-slate-400'}`}
            >
              👥 Matchups
            </button>
            <button
              onClick={() => { setShowTendencies(!showTendencies); setShowMatchups(false); }}
              className={`flex-1 text-xs py-1.5 rounded border transition-all ${showTendencies ? 'bg-amber-900/80 border-amber-500 text-amber-300' : 'bg-slate-800/80 border-slate-600 text-slate-400'}`}
            >
              📊 Tendencies
            </button>
          </div>

          {/* Tendencies Panel */}
          {showTendencies && (
            <div className="absolute top-36 left-2 right-2 bg-slate-900/95 border border-amber-600/50 rounded-lg p-2 z-10">
              <div className="text-xs text-amber-400 mb-2">⚠️ DEFENSE IS TRACKING</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800 rounded p-2">
                  <div className="text-slate-500">Run Rate</div>
                  <div className="text-amber-400 font-bold text-lg">{Math.round(tendencies.runRate * 100)}%</div>
                </div>
                <div className="bg-slate-800 rounded p-2">
                  <div className="text-slate-500">Favored Target</div>
                  <div className="text-amber-400 font-bold">{tendencies.favoredTarget || 'WR1'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Selected Card Detail */}
          {selectedCard && !showMatchups && !showTendencies && (
            <div className="absolute top-36 left-2 right-2 bg-slate-900/95 border border-amber-500/50 rounded-lg p-3 z-10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-amber-400 font-bold text-lg">{selectedCard.name}</div>
                  {selectedCard.target && (
                    <div className="text-slate-400 text-sm">{selectedCard.target}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${getSuccessColor(selectedCard.successRate)}`}>
                    {selectedCard.successRate}%
                  </div>
                  <div className="text-slate-500 text-xs">Success Rate</div>
                </div>
              </div>

              {/* Outcome Range */}
              <div className="bg-slate-800 rounded p-2 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 text-xs">Yards: </span>
                    <span className="text-white font-bold">{selectedCard.yardRange.min}-{selectedCard.yardRange.max}</span>
                  </div>
                  {selectedCard.breakawayChance > 5 && (
                    <div className="text-right">
                      <span className="text-slate-500 text-xs">Breakaway: </span>
                      <span className="text-purple-400 font-bold">{selectedCard.breakawayChance}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {selectedCard.intRisk && selectedCard.intRisk > 5 && (
                <div className="bg-red-900/50 border border-red-600/50 rounded p-2 mb-2 text-xs">
                  <span className="text-red-400 font-bold">🎲 INT Risk: {selectedCard.intRisk}%</span>
                </div>
              )}

              {/* Action Button */}
              <button
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black py-3 rounded-lg text-lg transition-all active:scale-95"
                onClick={handleSnapBall}
              >
                ⚡ SNAP BALL
              </button>
            </div>
          )}
        </div>

        {/* === MOMENTUM BAR === */}
        <div className="bg-black/90 px-4 py-2 border-t border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-bold tracking-wider">MOMENTUM</span>
            <span className="text-xs text-amber-400 font-bold">{momentum.offense}/{momentum.max}</span>
          </div>
          <div className="flex gap-1">
            {[...Array(momentum.max)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-3 rounded ${i < momentum.offense ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-slate-800'}`}
              />
            ))}
          </div>
        </div>

        {/* === CARD HAND === */}
        <div className="bg-gradient-to-t from-black via-slate-900 to-slate-800 px-2 pt-3 pb-4 border-t border-slate-600">
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {hand.map((card) => {
              const affordable = canAffordCard(card);
              return (
                <div
                  key={card.id}
                  onClick={() => affordable && selectCard(card)}
                  className={`
                    flex-shrink-0 w-24 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-lg
                    ${selectedCard?.id === card.id ? 'ring-2 ring-amber-400 -translate-y-3 scale-105 shadow-amber-500/30' : ''}
                    ${!affordable ? 'opacity-40 grayscale' : 'hover:-translate-y-1 hover:shadow-xl'}
                  `}
                >
                  {/* Card Top */}
                  <div className={`bg-gradient-to-br ${getCardBg(card.type)} p-2 relative`}>
                    <div className="absolute top-1 right-1 bg-black/60 backdrop-blur rounded-full w-6 h-6 flex items-center justify-center border border-amber-500/50">
                      <span className="text-amber-400 text-sm font-black">{card.cost}</span>
                    </div>
                    <div className="text-white font-bold text-xs mt-4 leading-tight">{card.name}</div>
                    <div className="text-2xl mt-1">
                      {card.type === 'pass' ? '🏈' : card.type === 'run' ? '💨' : card.type === 'dirty' ? '💀' : '⭐'}
                    </div>
                  </div>

                  {/* Card Bottom */}
                  <div className="bg-slate-950 p-2">
                    <div className={`text-center font-black text-lg ${getSuccessColor(card.successRate)}`}>
                      {card.successRate}%
                    </div>
                    <div className="text-slate-400 text-xs text-center">
                      {card.yardRange.min}-{card.yardRange.max} yds
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2 px-1">
            <button
              onClick={() => useTimeout('player')}
              disabled={gameState.playerTimeouts <= 0}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg transition-colors border border-slate-600 disabled:opacity-50"
            >
              ⏱️ TIMEOUT ({gameState.playerTimeouts})
            </button>
            <button
              onClick={() => drawCards(2)}
              disabled={momentum.offense < 2}
              className="flex-1 bg-red-900/80 hover:bg-red-800 text-red-300 text-xs py-2.5 rounded-lg transition-colors border border-red-700 disabled:opacity-50"
            >
              🃏 DRAW +2 (2🔥)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DEFENSE VIEW
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col font-sans text-white overflow-hidden">

      {/* === TOP BAR === */}
      <div className="bg-black/90 px-3 py-2 flex justify-between items-center border-b border-red-600/30">
        <div className="text-center">
          <div className="text-amber-500 text-xs font-bold tracking-wider">YOU</div>
          <div className="text-3xl font-black text-amber-400">{gameState.playerScore}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-slate-400 text-xs">Q{gameState.quarter} • {formatClock(gameState.clock)}</div>
          <div className="text-red-400 text-lg font-bold">⚔️ DEFENSE</div>
          <div className="text-white text-sm">
            {formatDown(gameState.down)} & {gameState.distance}
          </div>
        </div>
        <div className="text-center">
          <div className="text-red-500 text-xs font-bold tracking-wider">OPP</div>
          <div className="text-3xl font-black text-red-400">{gameState.opponentScore}</div>
        </div>
      </div>

      {/* === OPPONENT INTEL === */}
      <div className="bg-red-950/50 px-3 py-2 border-b border-red-700/30">
        <div className="text-xs text-red-400 mb-1">OPPONENT TENDENCIES</div>
        <div className="flex gap-3 text-xs">
          <div>
            <span className="text-slate-500">Run Rate: </span>
            <span className="text-red-300 font-bold">{Math.round((tendencies.opponentRunRate || 0.5) * 100)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Prediction: </span>
            <span className="text-amber-300 font-bold">
              {(tendencies.opponentRunRate || 0.5) > 0.5 ? 'Likely Run' : 'Likely Pass'}
            </span>
          </div>
        </div>
      </div>

      {/* === MAIN AREA === */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Coverage Selection */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2 font-bold tracking-wider">SELECT COVERAGE</div>
          <div className="grid grid-cols-2 gap-2">
            {coverageOptions.map(card => (
              <button
                key={card.id}
                onClick={() => selectCoverage(card)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedCoverage?.id === card.id
                    ? 'bg-red-900/80 border-red-500 ring-2 ring-red-400'
                    : 'bg-slate-800/80 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-white font-bold text-sm">{card.name}</div>
                <div className="text-slate-400 text-xs">{card.description}</div>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-green-400">Run: {card.vsRun}%</span>
                  <span className="text-blue-400">Pass: {card.vsPass}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Adjustment Selection */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2 font-bold tracking-wider">ADD ADJUSTMENT (Optional)</div>
          <div className="grid grid-cols-2 gap-2">
            {adjustmentOptions.map(card => {
              const canAfford = momentum.defense >= card.cost;
              return (
                <button
                  key={card.id}
                  onClick={() => canAfford && selectAdjustment(selectedAdjustment?.id === card.id ? null : card)}
                  disabled={!canAfford}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedAdjustment?.id === card.id
                      ? 'bg-amber-900/80 border-amber-500 ring-2 ring-amber-400'
                      : canAfford
                        ? 'bg-slate-800/80 border-slate-600 hover:border-slate-500'
                        : 'bg-slate-900/50 border-slate-700 opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-white font-bold text-sm">{card.name}</div>
                    <div className="text-amber-400 text-xs font-bold">{card.cost}🔥</div>
                  </div>
                  <div className="text-slate-400 text-xs">{card.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Combo Preview */}
        {selectedCoverage && (
          <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-600">
            <div className="text-xs text-slate-400 mb-1">YOUR CALL:</div>
            <div className="text-white font-bold text-lg">
              {selectedCoverage.name}
              {selectedAdjustment && ` + ${selectedAdjustment.name}`}
            </div>
          </div>
        )}
      </div>

      {/* === MOMENTUM BAR === */}
      <div className="bg-black/90 px-4 py-2 border-t border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 font-bold tracking-wider">DEF MOMENTUM</span>
          <span className="text-xs text-red-400 font-bold">{momentum.defense}/{momentum.max}</span>
        </div>
        <div className="flex gap-1">
          {[...Array(momentum.max)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-3 rounded ${i < momentum.defense ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-slate-800'}`}
            />
          ))}
        </div>
      </div>

      {/* === ACTION BUTTONS === */}
      <div className="bg-black/90 px-4 py-4 border-t border-slate-700">
        <button
          onClick={() => useTimeout('player')}
          disabled={gameState.playerTimeouts <= 0}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg transition-colors border border-slate-600 mb-2 disabled:opacity-50"
        >
          ⏱️ Timeout ({gameState.playerTimeouts})
        </button>
        <button
          onClick={handleSetDefense}
          disabled={!selectedCoverage}
          className={`w-full py-4 rounded-xl text-lg font-black transition-all active:scale-95 ${
            selectedCoverage
              ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          🛡️ SET DEFENSE
        </button>
      </div>
    </div>
  );
};

export default CardGameView;
