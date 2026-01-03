/**
 * GM Name Input
 *
 * Simple screen to input the player's GM name after the intro.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export const GMNameInput: React.FC = () => {
  const { setGMName, startFranchise } = useGameStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setGMName(name.trim());
    startFranchise();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(139, 69, 19, 0.2) 0%, transparent 60%),
            linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)
          `,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Tex's question */}
        <div className="text-center mb-8">
          <p className="text-stone-500 text-sm uppercase tracking-widest mb-2">
            Tex Morgan asks:
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-white"
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            "What's your name, son?"
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input */}
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name..."
              autoFocus
              className="w-full px-4 py-4 bg-stone-900/80 border-2 border-stone-700
                         text-white text-xl text-center placeholder-stone-600
                         rounded-sm focus:outline-none focus:border-amber-600
                         transition-colors"
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700
                       text-white font-black text-lg uppercase tracking-wider
                       rounded-sm transition-all duration-300
                       hover:from-amber-500 hover:to-amber-600
                       hover:shadow-lg hover:shadow-amber-900/50
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={name.trim().length < 2}
          >
            Let's Get to Work
          </button>
        </form>

        {/* Decorative line */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-stone-800" />
          <div className="text-stone-700 text-2xl">🏈</div>
          <div className="h-px w-16 bg-stone-800" />
        </div>
      </div>
    </div>
  );
};

export default GMNameInput;
