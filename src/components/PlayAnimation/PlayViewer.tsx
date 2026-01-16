import React, { useState, useEffect } from 'react';
import { PlayAnimationCanvas } from './PlayAnimationCanvas';
import { usePlayAnimation } from '../../hooks/usePlayAnimation';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import type { PlayOutcome } from '../../types/PlayAnimation';

interface PlayViewerProps {
  onBack?: () => void;
}

export const PlayViewer: React.FC<PlayViewerProps> = ({ onBack }) => {
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [targetReceiver, setTargetReceiver] = useState<string>('');

  const {
    currentFrame,
    playbackState,
    animationResult,
    loadPlay,
    play,
    pause,
    reset,
    setSpeed,
    seekTo,
    isLoaded,
    progress,
  } = usePlayAnimation();

  const selectedPlay = DEFAULT_PLAYS.find(p => p.id === selectedPlayId);

  // Get eligible receivers for the selected play
  const eligibleReceivers = selectedPlay?.assignments.filter(
    a => a.route && a.route !== 'BLOCK' && a.canRunRoutes
  ) || [];

  // Auto-select first receiver when play changes
  useEffect(() => {
    if (selectedPlay && eligibleReceivers.length > 0) {
      setTargetReceiver(eligibleReceivers[0].positionSlot);
    }
  }, [selectedPlayId]);

  const handlePlaySelect = (playId: string) => {
    setSelectedPlayId(playId);
    reset();
  };

  const handleLoadPlay = () => {
    if (!selectedPlay) return;

    const outcome: Partial<PlayOutcome> = {
      result: selectedPlay.playType === 'PASS' ? 'COMPLETE' : 'RUSH',
      yardsGained: selectedPlay.playType === 'PASS' ? 12 : 5,
      targetReceiver: selectedPlay.playType === 'PASS' ? targetReceiver : undefined,
    };

    loadPlay(selectedPlay, outcome);
  };

  const handlePlayPause = () => {
    if (playbackState.isPlaying) {
      pause();
    } else {
      if (!isLoaded && selectedPlay) {
        handleLoadPlay();
        // Small delay to let the play load before playing
        setTimeout(() => play(), 50);
      } else {
        play();
      }
    }
  };

  const handleReset = () => {
    reset();
    if (selectedPlay) {
      handleLoadPlay();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!animationResult) return;
    const seekTime = parseFloat(e.target.value) * animationResult.totalDurationMs;
    seekTo(seekTime);
  };

  // Group plays by type
  const runPlays = DEFAULT_PLAYS.filter(p => p.playType === 'RUN');
  const passPlays = DEFAULT_PLAYS.filter(p => p.playType === 'PASS');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              ← Back
            </button>
          )}
          <h1 className="text-2xl font-bold">Play Animator</h1>
        </div>
        <p className="text-gray-400">Select a play and watch it execute</p>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar - Play selection */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Playbook</h2>

            {/* Run Plays */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-green-400 mb-2">Run Plays</h3>
              <div className="space-y-1">
                {runPlays.map(play => (
                  <button
                    key={play.id}
                    onClick={() => handlePlaySelect(play.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedPlayId === play.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    <div className="font-medium">{play.name}</div>
                    <div className="text-xs text-gray-400">{play.formation}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pass Plays */}
            <div>
              <h3 className="text-sm font-medium text-blue-400 mb-2">Pass Plays</h3>
              <div className="space-y-1">
                {passPlays.map(play => (
                  <button
                    key={play.id}
                    onClick={() => handlePlaySelect(play.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedPlayId === play.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    <div className="font-medium">{play.name}</div>
                    <div className="text-xs text-gray-400">
                      {play.formation} • {play.passAction?.replace('_', ' ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Canvas and controls */}
        <div className="flex-1">
          {/* Play info banner */}
          {selectedPlay && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedPlay.name}</h2>
                  <p className="text-gray-400">
                    {selectedPlay.formation} • {selectedPlay.personnel} Personnel •{' '}
                    {selectedPlay.playType === 'RUN'
                      ? selectedPlay.runBlockingScheme?.replace('_', ' ')
                      : selectedPlay.protectionScheme?.replace('_', ' ')}
                  </p>
                  {selectedPlay.notes && (
                    <p className="text-sm text-gray-500 mt-1">{selectedPlay.notes}</p>
                  )}
                </div>

                {/* Target receiver selector for pass plays */}
                {selectedPlay.playType === 'PASS' && eligibleReceivers.length > 0 && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400">Target:</label>
                    <select
                      value={targetReceiver}
                      onChange={e => setTargetReceiver(e.target.value)}
                      className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    >
                      {eligibleReceivers.map(r => (
                        <option key={r.positionSlot} value={r.positionSlot}>
                          {r.label} ({r.route})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <PlayAnimationCanvas
              frame={currentFrame}
              width={700}
              height={450}
              showRouteTrails={true}
              showLabels={true}
            />
          </div>

          {/* Playback controls */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-4">
              {/* Play/Pause button */}
              <button
                onClick={handlePlayPause}
                disabled={!selectedPlay}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  selectedPlay
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {playbackState.isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              {/* Reset button */}
              <button
                onClick={handleReset}
                disabled={!selectedPlay}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                ↺ Reset
              </button>

              {/* Progress bar */}
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={progress}
                  onChange={handleSeek}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-400 w-16">
                  {animationResult
                    ? `${(playbackState.currentTimeMs / 1000).toFixed(1)}s`
                    : '0.0s'}
                </span>
              </div>

              {/* Speed control */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Speed:</span>
                {[0.5, 1, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSpeed(speed)}
                    className={`px-3 py-1 rounded transition-colors ${
                      playbackState.playbackSpeed === speed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Phase indicator */}
            {currentFrame && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="text-gray-400">Phase:</span>
                <span className={`px-3 py-1 rounded ${getPhaseColor(currentFrame.phase)}`}>
                  {currentFrame.phase.replace('_', ' ')}
                </span>
                {animationResult?.outcome && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-400">Outcome:</span>
                    <span className="text-green-400">
                      {animationResult.outcome.result} for {animationResult.outcome.yardsGained} yards
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span>QB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-500"></div>
                <span>O-Line</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span>Receivers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Running Back</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span>Blocker</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>Ball Carrier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'PRE_SNAP':
      return 'bg-gray-600 text-gray-200';
    case 'SNAP':
      return 'bg-yellow-600 text-white';
    case 'DEVELOPING':
    case 'RUNNING':
      return 'bg-green-600 text-white';
    case 'THROW':
    case 'BALL_IN_AIR':
      return 'bg-blue-600 text-white';
    case 'CATCH':
    case 'HANDOFF':
      return 'bg-purple-600 text-white';
    case 'RUN_AFTER_CATCH':
      return 'bg-green-500 text-white';
    case 'TACKLE':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-600 text-gray-200';
  }
}

export default PlayViewer;
