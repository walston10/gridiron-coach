// src/components/Game/CardGameView.tsx
// New playbook-based card game UI

import React, { useEffect, useMemo, useState } from 'react';
import {
  useSimpleCardGameStore,
  type DefenseCard,
  type BasePlay,
  type SignatureCard,
} from '../../stores/simpleCardGameStore';
import { useGameStore } from '../../stores/gameStore';
import { generateAIRoster } from '../../utils/playerGenerator';

export const CardGameView: React.FC = () => {
  const { draftedRoster, userTeamId } = useGameStore();

  // Create fallback roster if none drafted
  const gameRoster = useMemo(() => {
    if (draftedRoster) return draftedRoster;
    return generateAIRoster(userTeamId || 'player', 'AVERAGE');
  }, [draftedRoster, userTeamId]);

  // Get state from card game store
  const {
    gameState,
    playbook,
    offensiveModifiers,
    dirtyModifiers,
    momentum,
    tendencies,
    defenseIntel,
    selectedCategory,
    selectedPlay,
    selectedModifier,
    calculatedSuccess,
    selectedCoverage,
    selectedAdjustment,
    isPlayerOnOffense,
    lastPlayResult,
    showingResult,

    // Actions
    initializeGame,
    setCategory,
    selectPlay,
    selectModifier,
    selectCoverage,
    selectAdjustment,
    snapBall,
    setDefense,
    dismissResult,
    useTimeout,
    canAffordPlay,
    getTotalCost,
  } = useSimpleCardGameStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showModifiers, setShowModifiers] = useState(false);
  const [showDirtyModifiers, setShowDirtyModifiers] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    if (!isInitialized && gameRoster) {
      initializeGame(gameRoster);
      setIsInitialized(true);
    }
  }, [gameRoster, isInitialized, initializeGame]);

  // Coverage options
  const coverageOptions: DefenseCard[] = [
    { id: 'cover0', name: 'Cover 0', type: 'coverage', cost: 0, description: 'All out blitz', vsRun: 45, vsPass: 40 },
    { id: 'cover1', name: 'Cover 1', type: 'coverage', cost: 0, description: 'Single high safety', vsRun: 55, vsPass: 65 },
    { id: 'cover2', name: 'Cover 2', type: 'coverage', cost: 0, description: 'Two deep safeties', vsRun: 50, vsPass: 70 },
    { id: 'cover3', name: 'Cover 3', type: 'coverage', cost: 0, description: 'Three deep zones', vsRun: 55, vsPass: 68 },
    { id: 'cover4', name: 'Cover 4', type: 'coverage', cost: 0, description: 'Four deep quarters', vsRun: 48, vsPass: 75 },
    { id: 'man', name: 'Man', type: 'coverage', cost: 0, description: 'Man-to-man', vsRun: 52, vsPass: 68 },
  ];

  const adjustmentOptions: DefenseCard[] = [
    { id: 'blitz', name: 'Blitz', type: 'adjustment', cost: 1, description: 'Send extra rusher', vsRun: -5, vsPass: -10, sackBonus: 15 },
    { id: 'spy', name: 'Spy', type: 'adjustment', cost: 1, description: 'LB watches QB', vsRun: 5, vsPass: 5, scrambleCounter: true },
    { id: 'bracket', name: 'Bracket', type: 'adjustment', cost: 2, description: 'Double WR1', vsRun: -5, vsPass: 15 },
    { id: 'contain', name: 'Contain', type: 'adjustment', cost: 1, description: 'Prevent outside runs', vsRun: 12, vsPass: 0 },
  ];

  const handleSnapBall = async () => {
    if (!selectedPlay || !canAffordPlay()) return;
    await snapBall();
  };

  const handleSetDefense = async () => {
    if (!selectedCoverage) return;
    await setDefense();
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

  const getSuccessColor = (rate: number) => {
    if (rate >= 65) return 'text-green-400';
    if (rate >= 45) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCategoryBg = (cat: string) => {
    switch (cat) {
      case 'short': return 'from-green-900 to-green-950';
      case 'medium': return 'from-blue-900 to-blue-950';
      case 'deep': return 'from-purple-900 to-purple-950';
      case 'run': return 'from-amber-900 to-amber-950';
      case 'trick': return 'from-pink-900 to-pink-950';
      case 'signature': return 'from-yellow-700 to-yellow-900';
      default: return 'from-slate-800 to-slate-900';
    }
  };

  // Get plays for current category
  const currentPlays = playbook[selectedCategory] || [];

  // Loading state
  if (!isInitialized) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="text-amber-500 text-2xl font-bold mb-4">KICKOFF</div>
        <div className="text-gray-400">Preparing game...</div>
      </div>
    );
  }

  // Game over screen
  if (gameState.isGameOver) {
    const playerWon = gameState.playerScore > gameState.opponentScore;
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className={`text-4xl font-bold mb-4 ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
          {playerWon ? 'VICTORY!' : 'DEFEAT'}
        </div>
        <div className="text-6xl font-bold mb-8">
          {gameState.playerScore} - {gameState.opponentScore}
        </div>
        <div className="text-gray-500">Final Score</div>
      </div>
    );
  }

  // Play result overlay
  if (showingResult && lastPlayResult) {
    return (
      <div
        className="w-full max-w-md mx-auto min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 cursor-pointer"
        onClick={dismissResult}
      >
        <div className={`text-center ${lastPlayResult.success ? 'text-green-400' : 'text-red-400'}`}>
          <div className="text-6xl mb-4">
            {lastPlayResult.touchdown ? '🏈🎉' : lastPlayResult.turnover ? '😱' : lastPlayResult.success ? '✓' : '✗'}
          </div>
          <div className="text-3xl font-black mb-2">
            {lastPlayResult.touchdown ? 'TOUCHDOWN!' :
             lastPlayResult.turnover ? (lastPlayResult.interception ? 'INTERCEPTED!' : 'FUMBLE!') :
             lastPlayResult.sack ? 'SACKED!' :
             lastPlayResult.penalty ? 'FLAG!' :
             lastPlayResult.success ? 'COMPLETE!' : 'INCOMPLETE'}
          </div>
          <div className="text-5xl font-black mb-4">
            {lastPlayResult.yards > 0 ? '+' : ''}{lastPlayResult.yards} YDS
          </div>
          {lastPlayResult.breakaway && (
            <div className="text-purple-400 text-xl font-bold mb-2">💥 BREAKAWAY!</div>
          )}
          {lastPlayResult.firstDown && !lastPlayResult.touchdown && (
            <div className="text-amber-400 text-xl font-bold mb-2">FIRST DOWN!</div>
          )}
          {lastPlayResult.freePlay && (
            <div className="text-green-400 text-xl font-bold mb-2">FREE PLAY!</div>
          )}
          <div className="text-slate-400 text-sm mt-4">{lastPlayResult.description}</div>
        </div>
        <div className="mt-8 text-slate-500 text-sm animate-pulse">Tap to continue</div>
      </div>
    );
  }

  // OFFENSE VIEW
  if (isPlayerOnOffense) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col text-white overflow-hidden">
        {/* Top Bar */}
        <div className="bg-black/90 px-3 py-2 flex justify-between items-center border-b border-amber-600/30">
          <div className="text-center">
            <div className="text-amber-500 text-xs font-bold">YOU</div>
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
            <div className="text-red-500 text-xs font-bold">OPP</div>
            <div className="text-3xl font-black text-red-400">{gameState.opponentScore}</div>
          </div>
        </div>

        {/* Defense Intel */}
        {defenseIntel && (
          <div className="bg-red-950/50 px-3 py-2 border-b border-red-700/30">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-red-400 text-xs">Defense: {defenseIntel.showing}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">
                  Run Rate: <span className={tendencies.runRate > 0.55 ? 'text-amber-400' : 'text-slate-300'}>
                    {Math.round(tendencies.runRate * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="bg-slate-900/80 px-2 py-2 border-b border-slate-700 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {(['short', 'medium', 'deep', 'run', 'trick', 'signature'] as const).map((cat) => {
              const plays = playbook[cat];
              const isActive = selectedCategory === cat;
              const hasPlays = plays.length > 0;

              return (
                <button
                  key={cat}
                  onClick={() => hasPlays && setCategory(cat)}
                  disabled={!hasPlays}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                    isActive
                      ? 'bg-amber-600 text-black'
                      : hasPlays
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {cat}
                  {cat === 'signature' && plays.length > 0 && ' ★'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Play Selection */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-2">
            {currentPlays.map((play: BasePlay | SignatureCard) => {
              const isSelected = selectedPlay?.id === play.id;
              const cost = play.baseCost + (selectedModifier?.cost || 0);
              const canAfford = momentum.offense >= cost;

              return (
                <button
                  key={play.id}
                  onClick={() => selectPlay(isSelected ? null : play)}
                  disabled={!canAfford && !isSelected}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-900/80 border-amber-500 ring-2 ring-amber-400'
                      : canAfford
                        ? `bg-gradient-to-br ${getCategoryBg(selectedCategory)} border-slate-600 hover:border-slate-500`
                        : 'bg-slate-900/50 border-slate-700 opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-white font-bold text-sm">{play.name}</div>
                    <div className="text-amber-400 text-xs font-bold">{play.baseCost}⚡</div>
                  </div>
                  <div className="text-slate-400 text-xs mb-2">{play.description}</div>
                  <div className="flex justify-between items-center">
                    <div className={`text-lg font-black ${getSuccessColor(play.baseSuccess || 50)}`}>
                      {play.baseSuccess}%
                    </div>
                    <div className="text-slate-500 text-xs">
                      {play.yardRange?.min}-{play.yardRange?.max} yds
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modifier Selection (collapsible) */}
        <div className="bg-slate-900/80 border-t border-slate-700">
          <button
            onClick={() => setShowModifiers(!showModifiers)}
            className="w-full px-3 py-2 flex justify-between items-center text-xs"
          >
            <span className="text-slate-400 font-bold uppercase">
              Modifiers {selectedModifier ? `(${selectedModifier.name})` : ''}
            </span>
            <span className="text-slate-500">{showModifiers ? '▼' : '▶'}</span>
          </button>

          {showModifiers && (
            <div className="px-2 pb-2 space-y-2">
              {/* Clean Modifiers */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => selectModifier(null)}
                  className={`flex-shrink-0 px-2 py-1 rounded text-xs ${
                    !selectedModifier ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  None
                </button>
                {offensiveModifiers.map((mod) => {
                  const totalCost = (selectedPlay?.baseCost || 0) + mod.cost;
                  const canAfford = momentum.offense >= totalCost;
                  const isSelected = selectedModifier?.id === mod.id;

                  return (
                    <button
                      key={mod.id}
                      onClick={() => canAfford && selectModifier(isSelected ? null : mod)}
                      disabled={!canAfford}
                      className={`flex-shrink-0 px-2 py-1 rounded text-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : canAfford
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {mod.icon} {mod.name} ({mod.cost}⚡)
                    </button>
                  );
                })}
              </div>

              {/* Dirty Modifiers Toggle */}
              <button
                onClick={() => setShowDirtyModifiers(!showDirtyModifiers)}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {showDirtyModifiers ? '▼' : '▶'} Dirty Plays ({gameState.heat}% heat)
              </button>

              {showDirtyModifiers && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {dirtyModifiers.map((mod) => {
                    const totalCost = (selectedPlay?.baseCost || 0) + mod.cost;
                    const canAfford = momentum.offense >= totalCost;
                    const isSelected = selectedModifier?.id === mod.id;

                    return (
                      <button
                        key={mod.id}
                        onClick={() => canAfford && selectModifier(isSelected ? null : mod)}
                        disabled={!canAfford}
                        className={`flex-shrink-0 px-2 py-1 rounded text-xs border ${
                          isSelected
                            ? 'bg-purple-600 border-purple-400 text-white'
                            : canAfford
                              ? 'bg-purple-900/50 border-purple-700 text-purple-300 hover:bg-purple-800/50'
                              : 'bg-slate-900 border-slate-700 text-slate-600'
                        }`}
                      >
                        {mod.icon} {mod.name} ({mod.cost}⚡)
                        <span className="ml-1 text-yellow-500">⚠️</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Play Preview */}
        {selectedPlay && calculatedSuccess && (
          <div className="bg-slate-900/95 border-t border-amber-600/50 p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-amber-400 font-bold text-lg">
                  {selectedPlay.name}
                  {selectedModifier && <span className="text-blue-400 ml-2">+ {selectedModifier.name}</span>}
                </div>
                <div className="text-slate-400 text-xs">
                  Cost: {getTotalCost()}⚡ • Yards: {selectedPlay.yardRange?.min}-{selectedPlay.yardRange?.max}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-black ${getSuccessColor(calculatedSuccess.finalSuccess)}`}>
                  {calculatedSuccess.finalSuccess}%
                </div>
                <div className="text-slate-500 text-xs">(base {calculatedSuccess.baseSuccess}%)</div>
              </div>
            </div>

            {/* Breakdown */}
            {calculatedSuccess.breakdown.length > 1 && (
              <div className="text-xs text-slate-400 mb-2 max-h-16 overflow-y-auto">
                {calculatedSuccess.breakdown.slice(1).map((item, i) => (
                  <div key={i}>{item}</div>
                ))}
              </div>
            )}

            {/* Risks */}
            <div className="flex gap-2 text-xs mb-3">
              {selectedPlay.baseIntRisk && selectedPlay.baseIntRisk > 5 && (
                <span className="text-red-400">INT: {selectedPlay.baseIntRisk}%</span>
              )}
              {selectedPlay.baseFumbleRisk && selectedPlay.baseFumbleRisk > 3 && (
                <span className="text-orange-400">FUM: {selectedPlay.baseFumbleRisk}%</span>
              )}
              {selectedPlay.baseBreakaway && selectedPlay.baseBreakaway > 15 && (
                <span className="text-purple-400">Break: {selectedPlay.baseBreakaway}%</span>
              )}
            </div>
          </div>
        )}

        {/* Momentum Bar */}
        <div className="bg-black/90 px-4 py-2 border-t border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-bold">MOMENTUM</span>
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

        {/* Action Button */}
        <div className="bg-black/90 px-4 py-4 border-t border-slate-700">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => useTimeout('player')}
              disabled={gameState.playerTimeouts <= 0}
              className="flex-1 bg-slate-800 text-slate-300 text-xs py-2 rounded disabled:opacity-50"
            >
              ⏱️ Timeout ({gameState.playerTimeouts})
            </button>
          </div>
          <button
            onClick={handleSnapBall}
            disabled={!selectedPlay || !canAffordPlay()}
            className={`w-full py-4 rounded-xl text-lg font-black transition-all active:scale-95 ${
              selectedPlay && canAffordPlay()
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            ⚡ SNAP BALL
          </button>
        </div>
      </div>
    );
  }

  // DEFENSE VIEW
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col text-white overflow-hidden">
      {/* Top Bar */}
      <div className="bg-black/90 px-3 py-2 flex justify-between items-center border-b border-red-600/30">
        <div className="text-center">
          <div className="text-amber-500 text-xs font-bold">YOU</div>
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
          <div className="text-red-500 text-xs font-bold">OPP</div>
          <div className="text-3xl font-black text-red-400">{gameState.opponentScore}</div>
        </div>
      </div>

      {/* Opponent Tendencies */}
      <div className="bg-red-950/50 px-3 py-2 border-b border-red-700/30">
        <div className="text-xs text-red-400 mb-1">OPPONENT TENDENCIES</div>
        <div className="flex gap-3 text-xs">
          <div>
            <span className="text-slate-500">Run Rate: </span>
            <span className="text-red-300 font-bold">{Math.round(tendencies.opponentRunRate * 100)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Prediction: </span>
            <span className="text-amber-300 font-bold">
              {tendencies.opponentRunRate > 0.5 ? 'Likely Run' : 'Likely Pass'}
            </span>
          </div>
        </div>
      </div>

      {/* Defense Selection */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Coverage Selection */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2 font-bold uppercase">Select Coverage</div>
          <div className="grid grid-cols-2 gap-2">
            {coverageOptions.map((card) => (
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
          <div className="text-xs text-slate-400 mb-2 font-bold uppercase">Add Adjustment (Optional)</div>
          <div className="grid grid-cols-2 gap-2">
            {adjustmentOptions.map((card) => {
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
                    <div className="text-amber-400 text-xs font-bold">{card.cost}⚡</div>
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

      {/* Momentum Bar */}
      <div className="bg-black/90 px-4 py-2 border-t border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500 font-bold">DEF MOMENTUM</span>
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

      {/* Action Button */}
      <div className="bg-black/90 px-4 py-4 border-t border-slate-700">
        <button
          onClick={() => useTimeout('player')}
          disabled={gameState.playerTimeouts <= 0}
          className="w-full bg-slate-800 text-slate-300 py-2.5 rounded-lg mb-2 disabled:opacity-50"
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
