import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Play } from '../../types';
import { PlayPreview } from '../Playbook/PlayPreview';
import { PlayDiagramPreview } from './PlayDiagramPreview';
import { flipPlay } from '../../utils/playUtils';

interface PlayCallModalProps {
  plays: Play[];
  onSelectPlay: (play: Play) => void;
  onClose: () => void;
}

export const PlayCallModal: React.FC<PlayCallModalProps> = ({
  plays,
  onSelectPlay,
  onClose,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PASS' | 'RUN'>('ALL');
  const [showDiagram, setShowDiagram] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const playListRef = useRef<HTMLDivElement>(null);

  const filteredPlays = plays.filter(p => {
    if (filter === 'ALL') return true;
    return p.playType === filter;
  });

  // Reset focused index when filter changes
  useEffect(() => {
    setFocusedIndex(0);
    setIsFlipped(false);
  }, [filter]);

  // Ensure focused index is within bounds
  useEffect(() => {
    if (focusedIndex >= filteredPlays.length && filteredPlays.length > 0) {
      setFocusedIndex(filteredPlays.length - 1);
    }
  }, [filteredPlays.length, focusedIndex]);

  // Scroll focused play into view
  useEffect(() => {
    if (playListRef.current && filteredPlays.length > 0) {
      const focusedElement = playListRef.current.querySelector(`[data-play-index="${focusedIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex, filteredPlays.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for keys we handle
    if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'Tab':
        // Toggle diagram view
        setShowDiagram(prev => !prev);
        break;

      case 'Shift':
        // Flip the play (only when Shift is pressed, not released)
        if (!e.repeat) {
          setIsFlipped(prev => !prev);
        }
        break;

      case 'ArrowUp':
        // Move up in the grid (3 columns)
        setFocusedIndex(prev => {
          const cols = showDiagram ? 2 : 3;
          const newIndex = prev - cols;
          return newIndex >= 0 ? newIndex : prev;
        });
        break;

      case 'ArrowDown':
        // Move down in the grid
        setFocusedIndex(prev => {
          const cols = showDiagram ? 2 : 3;
          const newIndex = prev + cols;
          return newIndex < filteredPlays.length ? newIndex : prev;
        });
        break;

      case 'ArrowLeft':
        // Move left
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;

      case 'ArrowRight':
        // Move right
        setFocusedIndex(prev => (prev < filteredPlays.length - 1 ? prev + 1 : prev));
        break;

      case 'Enter':
        // Select the focused play
        if (filteredPlays.length > 0 && focusedIndex < filteredPlays.length) {
          const selectedPlay = filteredPlays[focusedIndex];
          const finalPlay = isFlipped ? flipPlay(selectedPlay) : selectedPlay;
          onSelectPlay(finalPlay);
          onClose();
        }
        break;

      case 'Escape':
        onClose();
        break;
    }
  }, [filteredPlays, focusedIndex, isFlipped, showDiagram, onSelectPlay, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handlePlayClick = (play: Play, index: number) => {
    if (focusedIndex === index) {
      // Double-click behavior: select the play
      const finalPlay = isFlipped ? flipPlay(play) : play;
      onSelectPlay(finalPlay);
      onClose();
    } else {
      // First click: focus the play
      setFocusedIndex(index);
      setIsFlipped(false);
    }
  };

  const focusedPlay = filteredPlays[focusedIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Call a Play</h2>
          <div className="flex items-center gap-4">
            {/* Controls hint */}
            <div className="text-xs text-gray-400 flex gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Tab</kbd>
                <span>Diagram</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Shift</kbd>
                <span>Flip</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Enter</kbd>
                <span>Select</span>
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              &times;
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['ALL', 'PASS', 'RUN'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}

          {/* Diagram toggle button */}
          <button
            onClick={() => setShowDiagram(prev => !prev)}
            className={`ml-auto px-4 py-2 rounded flex items-center gap-2 ${
              showDiagram ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Diagram
          </button>
        </div>

        {/* Main content area */}
        <div className="flex gap-4 overflow-hidden flex-1">
          {/* Play list */}
          <div className={`overflow-y-auto flex-1 ${showDiagram ? 'max-w-[60%]' : ''}`} ref={playListRef}>
            <div className={`grid gap-3 ${showDiagram ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
              {filteredPlays.map((play, index) => (
                <div
                  key={play.id}
                  data-play-index={index}
                  className={`rounded-lg ${
                    focusedIndex === index ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-800' : ''
                  }`}
                >
                  <PlayPreview
                    play={play}
                    onClick={() => handlePlayClick(play, index)}
                    isSelected={focusedIndex === index}
                  />
                </div>
              ))}
            </div>

            {filteredPlays.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No plays available. Create some in the Play Designer!
              </div>
            )}
          </div>

          {/* Diagram panel */}
          {showDiagram && focusedPlay && (
            <div className="w-[320px] flex-shrink-0 bg-gray-900 rounded-lg p-4 flex flex-col">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-white">{focusedPlay.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    focusedPlay.playType === 'PASS' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {focusedPlay.playType}
                  </span>
                  <span className="text-sm text-gray-400">
                    {focusedPlay.formation.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Play diagram */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <PlayDiagramPreview
                  play={focusedPlay}
                  width={280}
                  height={180}
                  isFlipped={isFlipped}
                />

                {/* Flip indicator and button */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setIsFlipped(prev => !prev)}
                    className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                      isFlipped
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {isFlipped ? 'Flipped' : 'Flip Play'}
                  </button>
                  {isFlipped && (
                    <span className="text-xs text-yellow-400">
                      (Shift to toggle)
                    </span>
                  )}
                </div>
              </div>

              {/* Play stats */}
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">Times Used:</div>
                  <div className="text-white">{focusedPlay.timesUsed}</div>
                  <div className="text-gray-400">Success Rate:</div>
                  <div className="text-white">{Math.round(focusedPlay.successRate * 100)}%</div>
                  {focusedPlay.concept && (
                    <>
                      <div className="text-gray-400">Concept:</div>
                      <div className="text-white">{focusedPlay.concept}</div>
                    </>
                  )}
                </div>

                {/* Tags */}
                {focusedPlay.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {focusedPlay.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick select button */}
              <button
                onClick={() => {
                  const finalPlay = isFlipped ? flipPlay(focusedPlay) : focusedPlay;
                  onSelectPlay(finalPlay);
                  onClose();
                }}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors"
              >
                Select Play
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500 text-center">
          Use arrow keys to navigate &bull; Tab to toggle diagram &bull; Shift to flip play &bull; Enter to select
        </div>
      </div>
    </div>
  );
};
