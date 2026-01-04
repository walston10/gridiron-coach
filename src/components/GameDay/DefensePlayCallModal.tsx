import React, { useState, useEffect, useCallback } from 'react';
import type { DefensivePlay } from '../../types/GameSim';
import { DEFENSIVE_PLAYBOOK, getDefensivePlaysByCategory } from '../../data/defensivePlaybook';

interface DefensePlayCallModalProps {
  onSelectPlay: (play: DefensivePlay) => void;
  onClose: () => void;
}

type Category = 'SHELLS' | 'BLITZES' | 'SITUATIONAL' | 'ALL';

export const DefensePlayCallModal: React.FC<DefensePlayCallModalProps> = ({
  onSelectPlay,
  onClose,
}) => {
  const [category, setCategory] = useState<Category>('SHELLS');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const categories = getDefensivePlaysByCategory();

  const getPlaysForCategory = (): DefensivePlay[] => {
    switch (category) {
      case 'SHELLS':
        return categories.coverageShells;
      case 'BLITZES':
        return categories.blitzes;
      case 'SITUATIONAL':
        return categories.situational;
      case 'ALL':
        return DEFENSIVE_PLAYBOOK;
    }
  };

  const plays = getPlaysForCategory();

  // Reset focused index when category changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [category]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowUp':
        setFocusedIndex(prev => Math.max(0, prev - 2));
        break;
      case 'ArrowDown':
        setFocusedIndex(prev => Math.min(plays.length - 1, prev + 2));
        break;
      case 'ArrowLeft':
        setFocusedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        setFocusedIndex(prev => Math.min(plays.length - 1, prev + 1));
        break;
      case 'Enter':
        if (plays[focusedIndex]) {
          onSelectPlay(plays[focusedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [plays, focusedIndex, onSelectPlay, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get coverage type color
  const getCoverageColor = (coverage: string) => {
    if (coverage.includes('COVER_0')) return 'text-red-400';
    if (coverage.includes('COVER_1')) return 'text-orange-400';
    if (coverage.includes('COVER_2')) return 'text-yellow-400';
    if (coverage.includes('COVER_3')) return 'text-green-400';
    if (coverage.includes('COVER_4')) return 'text-blue-400';
    if (coverage.includes('MAN')) return 'text-purple-400';
    return 'text-gray-400';
  };

  // Get blitz indicator
  const hasBlitz = (play: DefensivePlay) => play.blitz !== 'NONE';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 max-w-3xl w-full mx-4 border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white">CALL DEFENSE</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4">
          {(['SHELLS', 'BLITZES', 'SITUATIONAL', 'ALL'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                category === cat
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {cat === 'SHELLS' ? 'COVERAGE' : cat}
            </button>
          ))}
        </div>

        {/* Play Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
          {plays.map((play, index) => (
            <button
              key={play.id}
              onClick={() => onSelectPlay(play)}
              className={`p-4 rounded-lg text-left transition-all ${
                index === focusedIndex
                  ? 'bg-red-600/30 border-2 border-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">{play.name}</span>
                <div className="flex items-center gap-2">
                  {hasBlitz(play) && (
                    <span className="px-2 py-0.5 bg-red-500/30 text-red-400 text-xs font-bold rounded">
                      BLITZ
                    </span>
                  )}
                  <span className={`text-xs font-mono ${getCoverageColor(play.coverage)}`}>
                    {play.coverage.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-sm text-slate-400">{play.description}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 bg-slate-700 rounded">{play.formation}</span>
                {play.blitzers && play.blitzers.length > 0 && (
                  <span className="text-red-400">
                    Rush: {play.blitzers.join(', ')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hints */}
        <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <div className="flex gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓←→</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Esc</kbd> Close</span>
          </div>
          <div className="text-slate-400">
            {plays.length} plays available
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefensePlayCallModal;
