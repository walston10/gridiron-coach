/**
 * Start Screen
 *
 * Initial game screen with title and start button.
 * Eventually will have owner selection.
 */

import React from 'react';
import { useGameStore } from '../../stores/gameStore';

export const StartScreen: React.FC = () => {
  const { setPhase } = useGameStore();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(139, 69, 19, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(220, 38, 38, 0.15) 0%, transparent 40%),
            linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)
          `,
        }}
      />

      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.1) 2px,
            rgba(255,255,255,0.1) 4px
          )`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Title */}
        <h1
          className="text-6xl md:text-8xl font-black tracking-tighter mb-4"
          style={{
            color: '#f59e0b',
            textShadow: `
              0 0 40px rgba(245, 158, 11, 0.5),
              0 4px 0 #78350f,
              0 8px 0 #451a03
            `,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          ILLEGAL
        </h1>
        <h1
          className="text-6xl md:text-8xl font-black tracking-tighter mb-8"
          style={{
            color: '#dc2626',
            textShadow: `
              0 0 40px rgba(220, 38, 38, 0.5),
              0 4px 0 #7f1d1d,
              0 8px 0 #450a0a
            `,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          MOTION
        </h1>

        {/* Tagline */}
        <p className="text-stone-500 text-lg mb-12 tracking-widest uppercase">
          Build your dynasty. Bend the rules.
        </p>

        {/* Start button */}
        <button
          onClick={() => setPhase('intro')}
          className="group relative px-12 py-4 bg-gradient-to-r from-amber-600 to-amber-700
                     text-white font-black text-xl uppercase tracking-wider
                     rounded-sm transition-all duration-300
                     hover:from-amber-500 hover:to-amber-600
                     hover:scale-105 hover:shadow-lg hover:shadow-amber-900/50"
        >
          <span className="relative z-10">Start New Franchise</span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
        </button>

        {/* Version/credits */}
        <p className="text-stone-700 text-xs mt-16 tracking-wider">
          v0.1 ALPHA
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
