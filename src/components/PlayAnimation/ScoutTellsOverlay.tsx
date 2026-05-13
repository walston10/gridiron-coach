/**
 * ScoutTellsOverlay — pre-snap defender-tell badges.
 *
 * Renders small colored badges over each defender whose assignment produces
 * a tell allowed by the current scout grade. Positions are read from the
 * current animation frame, so the badges sit exactly on the defenders.
 *
 * Visual hierarchy: BLITZ stands out (red), then DEEP/SPY (yellow), then
 * coverage shape (subtle). Badges are non-interactive — they're just reads.
 */

import React from 'react';
import type { AnimationFrame } from '../../types/PlayAnimation';
import type { DefenderTell, TellKind } from '../../engine/tells';

interface ScoutTellsOverlayProps {
  tells: DefenderTell[];
  frame: AnimationFrame | null;
  canvasWidth: number;
  canvasHeight: number;
}

const TELL_STYLE: Record<TellKind, { bg: string; color: string; pulse?: boolean }> = {
  BLITZ: { bg: '#dc2626', color: '#ffffff', pulse: true },
  DEEP:  { bg: '#eab308', color: '#1f2937' },
  SPY:   { bg: '#a855f7', color: '#ffffff' },
  MAN:   { bg: '#0ea5e9', color: '#ffffff' },
  FLAT:  { bg: '#475569', color: '#ffffff' },
  HOOK:  { bg: '#475569', color: '#ffffff' },
};

const BADGE_OFFSET_Y = -22;  // Position badge above the defender's head

export const ScoutTellsOverlay: React.FC<ScoutTellsOverlayProps> = ({
  tells,
  frame,
  canvasWidth,
  canvasHeight,
}) => {
  if (!frame || tells.length === 0) return null;

  // Field coords (0..100) → canvas pixels.
  const toPx = (x: number, y: number) => ({
    px: (x / 100) * canvasWidth,
    py: (y / 100) * canvasHeight,
  });

  // Build a position lookup so we can match tells by slot.
  const defenderPositions = new Map<string, { x: number; y: number }>();
  for (const p of frame.players) {
    if (p.role === 'DEFENDER') {
      defenderPositions.set(p.positionSlot, { x: p.x, y: p.y });
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
      }}
      aria-label="Scout tells overlay"
    >
      {tells.map(tell => {
        const pos = defenderPositions.get(tell.positionSlot);
        if (!pos) return null;
        const { px, py } = toPx(pos.x, pos.y);
        const style = TELL_STYLE[tell.kind];

        return (
          <div
            key={tell.positionSlot}
            style={{
              position: 'absolute',
              left: px,
              top: py + BADGE_OFFSET_Y,
              transform: 'translate(-50%, -50%)',
              backgroundColor: style.bg,
              color: style.color,
              fontSize: 9,
              fontWeight: 800,
              padding: '2px 5px',
              borderRadius: 3,
              letterSpacing: 0.5,
              border: '1px solid rgba(0,0,0,0.4)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              animation: style.pulse ? 'tell-pulse 800ms ease-in-out infinite' : undefined,
              whiteSpace: 'nowrap',
            }}
          >
            {tell.label}
          </div>
        );
      })}

      <style>{`
        @keyframes tell-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%      { transform: translate(-50%, -50%) scale(1.12); }
        }
      `}</style>
    </div>
  );
};

export default ScoutTellsOverlay;
