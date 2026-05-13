/**
 * OutcomePunch — animated overlay shown immediately after a play resolves.
 *
 * Categorizes the play result into a stinger-class (TOUCHDOWN, BIG_PLAY,
 * INTERCEPTION, etc) and displays a big bold banner + animated yard count
 * on top of the field. Auto-fades after ~1.5s and calls onDismiss().
 *
 * Pairs with a brief color-flash full-screen effect and an audio stinger
 * (played by the parent). The visual + audio + flash together sell the
 * outcome with much more punch than a small text result line.
 */

import React, { useEffect } from 'react';
import type { PlayOutcome } from '../../types/PlayAnimation';

export type PunchKind =
  | 'TOUCHDOWN'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'SACK'
  | 'BIG_PLAY'
  | 'FIRST_DOWN'
  | 'INCOMPLETE'
  | 'GAIN'
  | 'LOSS'
  | null;

interface OutcomePunchProps {
  /** Play outcome (yards + result). null hides the overlay. */
  outcome: PlayOutcome | null;
  /** True if this play converted a first down (set by parent). */
  isFirstDown: boolean;
  /** Canvas pixel width — used to size the overlay to the field. */
  canvasWidth: number;
  /** Canvas pixel height. */
  canvasHeight: number;
  /** Called when the overlay should disappear (~1.5s after mount). */
  onDismiss: () => void;
}

/** Categorize an outcome into a punch kind for visuals + audio. */
export function classifyPunch(outcome: PlayOutcome, isFirstDown: boolean): PunchKind {
  if (outcome.result === 'TOUCHDOWN') return 'TOUCHDOWN';
  if (outcome.result === 'INTERCEPTION') return 'INTERCEPTION';
  if (outcome.result === 'FUMBLE') return 'FUMBLE';
  if (outcome.result === 'SACK') return 'SACK';
  if (outcome.result === 'INCOMPLETE') return 'INCOMPLETE';
  if (Math.abs(outcome.yardsGained) >= 20) return 'BIG_PLAY';
  if (isFirstDown) return 'FIRST_DOWN';
  if (outcome.yardsGained < 0) return 'LOSS';
  return 'GAIN';
}

const STYLE: Record<Exclude<PunchKind, null>, { label: string; color: string; bg: string; flash: string; size: number }> = {
  TOUCHDOWN:    { label: 'TOUCHDOWN!',   color: '#fef3c7', bg: '#065f46', flash: 'rgba(34,197,94,0.45)',  size: 38 },
  BIG_PLAY:     { label: 'BIG PLAY!',    color: '#fef3c7', bg: '#1e3a8a', flash: 'rgba(59,130,246,0.35)', size: 32 },
  FIRST_DOWN:   { label: '1ST DOWN',     color: '#fef9c3', bg: '#a16207', flash: 'rgba(251,191,36,0.30)', size: 28 },
  INTERCEPTION: { label: 'INTERCEPTED',  color: '#fee2e2', bg: '#7f1d1d', flash: 'rgba(239,68,68,0.50)',  size: 30 },
  FUMBLE:       { label: 'FUMBLE LOST',  color: '#fee2e2', bg: '#7f1d1d', flash: 'rgba(239,68,68,0.50)',  size: 30 },
  SACK:         { label: 'SACK',         color: '#fee2e2', bg: '#451a03', flash: 'rgba(120,53,15,0.40)',  size: 26 },
  INCOMPLETE:   { label: 'INCOMPLETE',   color: '#e5e7eb', bg: '#374151', flash: 'rgba(0,0,0,0.20)',      size: 22 },
  GAIN:         { label: '',             color: '#e5e7eb', bg: '#1f2937', flash: 'rgba(0,0,0,0.10)',      size: 0  },
  LOSS:         { label: 'LOSS',         color: '#fef3c7', bg: '#7c2d12', flash: 'rgba(120,53,15,0.30)',  size: 22 },
};

export const OutcomePunch: React.FC<OutcomePunchProps> = ({
  outcome,
  isFirstDown,
  canvasWidth,
  canvasHeight,
  onDismiss,
}) => {
  // Auto-dismiss timer.
  useEffect(() => {
    if (!outcome) return;
    const t = setTimeout(onDismiss, 1500);
    return () => clearTimeout(t);
  }, [outcome, onDismiss]);

  if (!outcome) return null;

  const kind = classifyPunch(outcome, isFirstDown);
  if (!kind) return null;
  const style = STYLE[kind];
  const yards = outcome.yardsGained;
  const showYards = kind !== 'INCOMPLETE' && kind !== 'SACK' || kind === 'SACK';  // Sack shows yards lost.
  const yardLabel = yards > 0 ? `+${yards}` : `${yards}`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      {/* Full-canvas color flash — fades from peak to 0 over 600ms. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: style.flash,
          animation: 'punch-flash 600ms ease-out forwards',
        }}
      />

      {/* Banner + yard count — bounces in, holds, fades out. */}
      <div
        style={{
          position: 'relative',
          backgroundColor: style.bg,
          color: style.color,
          padding: '10px 22px',
          borderRadius: 8,
          border: `3px solid ${style.color}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          fontWeight: 900,
          fontSize: style.size,
          letterSpacing: 2,
          lineHeight: 1,
          textTransform: 'uppercase',
          animation: 'punch-banner 1.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {style.label || (yards >= 0 ? `${yardLabel} YD` : `${yardLabel} YD`)}
      </div>

      {/* Yard count chip — separate animation so it lands a beat after the banner. */}
      {showYards && style.label && (
        <div
          style={{
            position: 'relative',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fbbf24',
            padding: '4px 14px',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: 1,
            animation: 'punch-yards 1.5s cubic-bezier(0.34,1.56,0.64,1) 100ms forwards',
            opacity: 0,
          }}
        >
          {yardLabel} YD
        </div>
      )}

      <style>{`
        @keyframes punch-flash {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes punch-banner {
          0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; }
          20%  { transform: scale(1.15) rotate(2deg); opacity: 1; }
          35%  { transform: scale(1) rotate(0); opacity: 1; }
          80%  { transform: scale(1) rotate(0); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        @keyframes punch-yards {
          0%   { transform: translateY(20px); opacity: 0; }
          15%  { transform: translateY(20px); opacity: 0; }
          30%  { transform: translateY(0); opacity: 1; }
          80%  { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default OutcomePunch;
