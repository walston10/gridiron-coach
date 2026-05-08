/**
 * KeyFrameOverlay — the slo-mo decision overlay.
 *
 * Sits on top of the play canvas. When the simulator hits the Key Frame tick,
 * this component shows tap targets at each option's diegetic field position
 * (mapped to canvas pixels via the same 0..100 → pixel transform the canvas uses).
 * The bail option uses a stable position (sideline by the QB).
 *
 * Mobile-first: targets are 72px touch zones, color-coded by risk.
 * A radial countdown ring shows the remaining decision window.
 */

import React from 'react';
import type { KFOption, KFRisk } from '../../types/keyFrame.types';

interface KeyFrameOverlayProps {
  options: KFOption[];
  /** Canvas pixel dimensions — same width/height passed to PlayAnimationCanvas. */
  canvasWidth: number;
  canvasHeight: number;
  /** Decision window total length (ms). Used to compute the countdown ring. */
  windowMs: number;
  /** Time remaining in the window (ms). 0 means expired. */
  timeRemainingMs: number;
  /** Called when the player taps an option. */
  onDecide: (optionId: string) => void;
}

const TARGET_DIAMETER = 72;

const RISK_COLORS: Record<KFRisk, { fill: string; ring: string; label: string }> = {
  SAFE:     { fill: 'rgba(34, 197, 94, 0.85)',  ring: '#16a34a', label: '#ffffff' }, // Green
  STANDARD: { fill: 'rgba(234, 179, 8, 0.85)',  ring: '#a16207', label: '#1f2937' }, // Yellow
  RISKY:    { fill: 'rgba(239, 68, 68, 0.85)',  ring: '#991b1b', label: '#ffffff' }, // Red
};

export const KeyFrameOverlay: React.FC<KeyFrameOverlayProps> = ({
  options,
  canvasWidth,
  canvasHeight,
  windowMs,
  timeRemainingMs,
  onDecide,
}) => {
  // Field coords (0..100) → canvas pixels (matches PlayAnimationCanvas math).
  const toPx = (x: number, y: number) => ({
    px: (x / 100) * canvasWidth,
    py: (y / 100) * canvasHeight,
  });

  const fraction = windowMs > 0 ? Math.max(0, Math.min(1, timeRemainingMs / windowMs)) : 0;

  return (
    <div
      // Absolute positioning over the canvas. Pointer events scoped to children.
      style={{
        position: 'absolute',
        inset: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
      }}
      aria-label="Key frame decision overlay"
    >
      {/* Dim layer to focus the eye on tap targets */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          pointerEvents: 'none',
        }}
      />

      {/* Decision window bar at the top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 4,
          width: `${fraction * 100}%`,
          backgroundColor: fraction > 0.5 ? '#22c55e' : fraction > 0.25 ? '#eab308' : '#ef4444',
          transition: 'width 50ms linear, background-color 200ms',
        }}
      />

      {/* Tap targets */}
      {options.map(opt => {
        const { px, py } = toPx(opt.fieldX, opt.fieldY);
        const colors = RISK_COLORS[opt.risk];
        const left = px - TARGET_DIAMETER / 2;
        const top = py - TARGET_DIAMETER / 2;

        return (
          <button
            key={opt.id}
            onClick={() => onDecide(opt.id)}
            style={{
              position: 'absolute',
              left,
              top,
              width: TARGET_DIAMETER,
              height: TARGET_DIAMETER,
              borderRadius: '50%',
              border: `3px solid ${colors.ring}`,
              backgroundColor: colors.fill,
              color: colors.label,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.1,
              padding: 4,
              cursor: 'pointer',
              pointerEvents: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(255,255,255,0.15)',
              animation: 'kf-target-pulse 900ms ease-in-out infinite',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={`${opt.intent}: ${opt.label}`}
          >
            {opt.label}
          </button>
        );
      })}

      {/* Inline keyframes for the target pulse */}
      <style>{`
        @keyframes kf-target-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

export default KeyFrameOverlay;
