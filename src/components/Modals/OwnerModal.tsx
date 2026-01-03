/**
 * Owner Modal
 *
 * Shows owner status, patience, wants, and hates.
 */

import React from 'react';
import type { Owner } from '../../types/Owner';
import { getOwnerMood } from '../../types/Owner';

interface OwnerModalProps {
  owner: Owner;
  patience: number;
  onClose: () => void;
}

const MOOD_EMOJI: Record<string, string> = {
  Happy: '😊',
  Content: '🙂',
  Neutral: '😐',
  Concerned: '😟',
  Angry: '😠',
  Furious: '🤬',
};

const OWNER_DETAILS: Record<string, { wants: string[]; hates: string[]; quote: string }> = {
  tex: {
    wants: [
      'Media coverage (any kind)',
      'Primetime wins',
      'Entertainment value',
      'Controversy that gets attention',
    ],
    hates: [
      'Being ignored by media',
      'Boring, safe football',
      'Losing to rivals',
      'Low attendance games',
    ],
    quote: "I didn't buy this team to be invisible.",
  },
  hale: {
    wants: [
      'Clean weeks without scandal',
      'Proper public image',
      'Winning with integrity',
      'Community involvement',
    ],
    hates: [
      'Any hint of impropriety',
      'Media scandals',
      'Player misconduct',
      'Embarrassing headlines',
    ],
    quote: 'This franchise represents something larger than football.',
  },
  kessler: {
    wants: [
      'Staying under budget',
      'Efficient roster management',
      'Maximizing value per dollar',
      'Playoff revenue',
    ],
    hates: [
      'Overpaying players',
      'Wasteful spending',
      'Empty seats',
      'Luxury tax triggers',
    ],
    quote: 'Every dollar has to justify itself.',
  },
};

export const OwnerModal: React.FC<OwnerModalProps> = ({
  owner,
  patience,
  onClose,
}) => {
  const mood = getOwnerMood(patience);
  const moodEmoji = MOOD_EMOJI[mood] || '😐';
  const details = OWNER_DETAILS[owner.id] || OWNER_DETAILS.tex;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg max-w-md w-full overflow-hidden border border-stone-600/50 shadow-2xl">
        {/* Header with portrait */}
        <div className="bg-gradient-to-br from-purple-900/50 to-stone-900 p-6 text-center relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>

          {/* Portrait */}
          <div className="w-20 h-20 mx-auto rounded-full bg-stone-800 border-4 border-purple-500/50 flex items-center justify-center mb-3">
            <span className="text-4xl">{moodEmoji}</span>
          </div>

          <h2 className="text-white font-black text-xl">{owner.name}</h2>
          <div className="text-purple-300 text-sm">{owner.type}</div>

          {/* Mood label */}
          <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-bold ${
            patience >= 60 ? 'bg-green-600/50 text-green-200' :
            patience >= 40 ? 'bg-yellow-600/50 text-yellow-200' :
            patience >= 20 ? 'bg-orange-600/50 text-orange-200' :
            'bg-red-600/50 text-red-200'
          }`}>
            {mood}
          </div>
        </div>

        {/* Quote */}
        <div className="px-6 py-4 bg-stone-950/30 border-y border-stone-700/50">
          <p className="text-stone-300 italic text-center">
            "{details.quote}"
          </p>
        </div>

        {/* Patience bar */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-stone-400 text-sm">PATIENCE</span>
            <span className="text-white font-bold">{patience}%</span>
          </div>
          <div className="h-4 bg-stone-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                patience >= 60 ? 'bg-green-500' :
                patience >= 40 ? 'bg-yellow-500' :
                patience >= 20 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${patience}%` }}
            />
          </div>

          {/* Warning if patience is low */}
          {patience < 30 && (
            <div className="mt-2 text-red-400 text-xs text-center animate-pulse">
              ⚠️ Your job is on the line
            </div>
          )}
        </div>

        {/* Wants and Hates */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-4">
          {/* Wants */}
          <div>
            <div className="text-green-400 text-xs uppercase tracking-wider mb-2 font-bold">
              ✓ Wants
            </div>
            <ul className="space-y-1">
              {details.wants.map((want, i) => (
                <li key={i} className="text-stone-300 text-sm flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span>{want}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Hates */}
          <div>
            <div className="text-red-400 text-xs uppercase tracking-wider mb-2 font-bold">
              ✗ Hates
            </div>
            <ul className="space-y-1">
              {details.hates.map((hate, i) => (
                <li key={i} className="text-stone-300 text-sm flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>{hate}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-stone-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerModal;
