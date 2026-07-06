/**
 * RevealFlip — beat 3, the heartbeat of the game (§2).
 *
 * A card flips face-up center-screen (~0.8s) and is immediately stamped with the
 * matchup verdict in big brawler type — telling the player *why* before they
 * ever see *how much*. Perspective-agnostic: on offense it flips the defense's
 * call; on defense it flips the offense's call. The caller supplies the card
 * content and the pre-resolved verdict stamp. Tap (or the auto-timer) advances.
 */

import React, { useEffect, useState } from 'react';

export interface RevealStamp {
  label: string;
  /** Tailwind text/border accent classes. */
  accent: string;
  /** rgba glow color. */
  glow: string;
}

interface RevealFlipProps {
  /** Small kicker above the title, e.g. "Defense" or "Offense". */
  kicker: string;
  /** The revealed verb label. */
  title: string;
  flavor: string;
  /** Card tone — matches whose call is being revealed. */
  tone: 'red' | 'emerald';
  stamp: RevealStamp;
  onDone: () => void;
}

const FLIP_MS = 800;
const STAMP_MS = 1100;
const AUTO_ADVANCE_MS = 2200;

const TONE: Record<RevealFlipProps['tone'], { border: string; from: string; kicker: string }> = {
  red: { border: 'border-red-500/70', from: 'from-red-950', kicker: 'text-red-400' },
  emerald: { border: 'border-emerald-500/70', from: 'from-emerald-950', kicker: 'text-emerald-400' },
};

export const RevealFlip: React.FC<RevealFlipProps> = ({
  kicker,
  title,
  flavor,
  tone,
  stamp,
  onDone,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [stamped, setStamped] = useState(false);
  const t = TONE[tone];

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 60);
    const t2 = setTimeout(() => setStamped(true), STAMP_MS);
    const t3 = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <button
      type="button"
      onClick={onDone}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm"
      aria-label="Continue"
    >
      {/* The flipping call card. */}
      <div style={{ perspective: 1000 }}>
        <div
          className="relative h-56 w-40"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transition: `transform ${FLIP_MS}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
          }}
        >
          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-gray-600 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-4xl opacity-40">🃏</span>
          </div>
          {/* Front — the revealed call. */}
          <div
            className={`absolute inset-0 rounded-2xl border-2 ${t.border} bg-gradient-to-br ${t.from} to-gray-950 p-4 flex flex-col justify-between`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className={`text-[10px] font-bold uppercase tracking-widest ${t.kicker}`}>
              {kicker}
            </div>
            <div className="text-2xl font-black uppercase leading-none text-white">{title}</div>
            <div className="text-[11px] leading-tight text-gray-400">{flavor}</div>
          </div>
        </div>
      </div>

      {/* Verdict stamp. */}
      <div
        className={`rounded-lg border-4 bg-black/60 px-5 py-2 text-center text-2xl font-black uppercase tracking-wider ${stamp.accent}`}
        style={{
          opacity: stamped ? 1 : 0,
          transform: stamped ? 'scale(1) rotate(-3deg)' : 'scale(1.6) rotate(-3deg)',
          transition: 'opacity 160ms ease-out, transform 220ms cubic-bezier(0.34,1.56,0.64,1)',
          textShadow: `0 0 18px ${stamp.glow}`,
          boxShadow: `0 0 24px ${stamp.glow}`,
        }}
      >
        {stamp.label}
      </div>

      <div className="text-[10px] uppercase tracking-widest text-gray-500">Tap to continue</div>
    </button>
  );
};

export default RevealFlip;
