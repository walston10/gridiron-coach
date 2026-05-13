/**
 * MacroClockBanner — full-width animated banner for macro clock beats.
 *
 * Fired by the slice on:
 *   - End of Q1 → Q2 transition  ("END OF 1st QUARTER")
 *   - End of Q3 → Q4 transition  ("END OF 3rd QUARTER")
 *   - Crossing 2:00 in Q2 or Q4  ("TWO-MINUTE WARNING")
 *
 * Halftime and end-of-game have their own dedicated cards in the slice,
 * so this component intentionally skips Q2→Q3 and Q4→done.
 *
 * Auto-dismisses after ~2.5s. Sits above gameplay (pointer-events: none),
 * so it never blocks input — just punctuates the moment.
 */

import React, { useEffect } from 'react';

export type MacroBannerKind = 'END_Q1' | 'END_Q3' | 'TWO_MINUTE';

interface MacroClockBannerProps {
  kind: MacroBannerKind;
  onDismiss: () => void;
  /** How long to show before fading. Default 2500ms. */
  durationMs?: number;
}

const STYLE: Record<MacroBannerKind, {
  primary: string;
  secondary: string;
  border: string;
  bg: string;
  flash: string;
  size: number;
}> = {
  END_Q1:     { primary: 'END OF 1ST QUARTER', secondary: '',                  border: '#3b82f6', bg: '#0c1e3a', flash: 'rgba(59,130,246,0.25)',  size: 26 },
  END_Q3:     { primary: 'END OF 3RD QUARTER', secondary: '',                  border: '#3b82f6', bg: '#0c1e3a', flash: 'rgba(59,130,246,0.25)',  size: 26 },
  TWO_MINUTE: { primary: 'TWO-MINUTE WARNING', secondary: 'CLOCK IS YOUR ENEMY',border: '#fbbf24', bg: '#3a2e0c', flash: 'rgba(251,191,36,0.30)',  size: 28 },
};

export const MacroClockBanner: React.FC<MacroClockBannerProps> = ({
  kind,
  onDismiss,
  durationMs = 2500,
}) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [kind, onDismiss, durationMs]);

  const style = STYLE[kind];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 100,
      }}
      aria-label={style.primary}
    >
      {/* Soft full-screen flash. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: style.flash,
          animation: 'macro-flash 2500ms ease-out forwards',
        }}
      />

      {/* The banner itself — slides in from left, holds, fades. */}
      <div
        style={{
          position: 'relative',
          minWidth: 280,
          maxWidth: 600,
          width: '90%',
          padding: '18px 24px',
          backgroundColor: style.bg,
          border: `3px solid ${style.border}`,
          borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
          textAlign: 'center',
          animation: 'macro-banner 2500ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        <div
          style={{
            fontSize: style.size,
            fontWeight: 900,
            color: style.border,
            letterSpacing: 3,
            lineHeight: 1.1,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}
        >
          {style.primary}
        </div>
        {style.secondary && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: '#fef3c7',
              letterSpacing: 2,
              fontWeight: 600,
              opacity: 0.85,
            }}
          >
            {style.secondary}
          </div>
        )}
      </div>

      <style>{`
        @keyframes macro-flash {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes macro-banner {
          0%   { transform: translateX(-40px) scale(0.85); opacity: 0; }
          15%  { transform: translateX(0) scale(1.04); opacity: 1; }
          25%  { transform: translateX(0) scale(1); opacity: 1; }
          80%  { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(40px) scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MacroClockBanner;
