import React, { useCallback, useState, useRef } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameHUD } from './GameHUD';
import { PlaySelector } from './PlaySelector';
import { useGameEngine, useInputHandler } from '../../hooks';
import type { OffensivePlay, DefensivePlay, Vector2 } from '../../types/GameSim';

type Play = OffensivePlay | DefensivePlay;

interface GameViewProps {
  homeTeam?: string;
  awayTeam?: string;
}

export const GameView: React.FC<GameViewProps> = ({
  homeTeam = 'Moles',
  awayTeam = 'Empire',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    gameState,
    playbook,
    selectPlay,
    snap,
    moveBallCarrier,
    throwToSpot,
    handoff,
    nextPlay,
  } = useGameEngine();

  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);

  const isPreSnap = gameState?.phase === 'PRE_SNAP';
  const isLive = gameState?.phase === 'SNAP' || gameState?.phase === 'ACTIVE';
  const isPlayOver = gameState?.phase === 'WHISTLE';
  const isQBWithBall = gameState?.ballCarrier === 'qb' && gameState?.phase === 'SNAP';
  const isBallInAir = !!gameState?.passFlight;

  // Handle play selection
  const handleSelectPlay = useCallback((play: Play) => {
    setSelectedPlay(play);
    if ('type' in play) {
      selectPlay(play);
    }
  }, [selectPlay]);

  // Handle snap (only if play selected)
  const handleSnap = useCallback(() => {
    if (selectedPlay) {
      snap();
    }
  }, [selectedPlay, snap]);

  // Handle next play
  const handleNextPlay = useCallback(() => {
    setSelectedPlay(null);
    nextPlay();
  }, [nextPlay]);

  // Handle field click (for throwing) - uses GameCanvas's correct coordinate conversion
  const handleFieldClick = useCallback((location: Vector2) => {
    if (isQBWithBall) {
      throwToSpot(location);
    }
  }, [isQBWithBall, throwToSpot]);

  // Handle handoff to RB
  const handleHandoff = useCallback(() => {
    const rb = gameState?.offensivePlayers.find(p => p.rosterPosition === 'RB');
    if (rb) handoff(rb.id);
  }, [gameState, handoff]);

  // Use the input handler for keyboard controls
  // Note: Click-to-throw is handled by GameCanvas's onFieldClick (correct coord conversion)
  useInputHandler({
    canvasRef,
    onMove: moveBallCarrier,
    onSnap: handleSnap,
    onThrow: () => {}, // Handled by GameCanvas click
    onHandoff: handleHandoff,
    onNextPlay: handleNextPlay,
    phase: gameState?.phase ?? 'PRE_SNAP',
    enabled: !isBallInAir, // Disable movement while ball is in air
  });

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-white mb-4">
          {awayTeam} @ {homeTeam}
        </h1>

        <div className="flex gap-4">
          {/* Left side - Field */}
          <div className="flex-1">
            <GameCanvas
              ref={canvasRef}
              gameState={gameState}
              onFieldClick={handleFieldClick}
              width={400}
              height={720}
            />

            {/* Keyboard hints */}
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              {isPreSnap && selectedPlay && <div>SPACE to snap</div>}
              {isPreSnap && !selectedPlay && <div className="text-yellow-500">Select a play first</div>}
              {isQBWithBall && (
                <div>
                  <span className="text-yellow-400">Click on field to throw</span> • E to handoff • WASD to scramble • SHIFT to sprint
                </div>
              )}
              {isLive && !isQBWithBall && !isBallInAir && (
                <div>WASD to move • SHIFT to sprint</div>
              )}
              {isBallInAir && (
                <div className="text-yellow-400">Ball in the air...</div>
              )}
              {isPlayOver && <div>ENTER for next play</div>}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="w-80 space-y-4">
            <GameHUD
              gameState={gameState}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />

            {isPreSnap && (
              <PlaySelector
                plays={playbook}
                selectedPlay={selectedPlay}
                onSelectPlay={handleSelectPlay}
                onSnap={handleSnap}
                disabled={!isPreSnap}
              />
            )}

            {/* QB Options (during SNAP phase) */}
            {isQBWithBall && (
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-white font-bold mb-2">QB Options</div>
                <div className="text-sm text-gray-400 mb-3">
                  Click anywhere on the field to throw to that spot
                </div>

                <button
                  onClick={handleHandoff}
                  className="w-full p-2 bg-green-800 hover:bg-green-700 rounded text-white mb-2"
                >
                  <span className="text-yellow-400 font-mono mr-2">E</span>
                  Handoff to RB
                </button>

                <div className="text-xs text-gray-500 mt-2">
                  Tip: Lead your receivers! Accuracy affects ball placement.
                </div>
              </div>
            )}

            {/* Ball in air info */}
            {isBallInAir && gameState?.passFlight && (
              <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
                <div className="text-yellow-400 font-bold">Pass in Flight!</div>
                <div className="text-sm text-yellow-200 mt-1">
                  {gameState.passFlight.intendedTarget
                    ? `Targeting: ${gameState.passFlight.intendedTarget}`
                    : 'Throw to open space'}
                </div>
              </div>
            )}

            {/* Play over - next play button */}
            {isPlayOver && (
              <button
                onClick={handleNextPlay}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
              >
                Next Play (Enter)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameView;
