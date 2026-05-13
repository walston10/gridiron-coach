/**
 * AudibleBar — pre-snap audible UI.
 *
 * Shows the currently-called play plus 1-2 alternates as tappable cards.
 * The active play is highlighted; tapping an alternate calls onAudible()
 * to swap the call. A countdown bar across the top mirrors the pre-snap
 * window remaining (auto-snap on expiry, lives in the hook).
 *
 * Mobile-first: cards are 44px tall touch zones with generous horizontal padding.
 */

import React from 'react';
import type { Play } from '../../types/Play';

interface AudibleBarProps {
  active: Play;
  alternates: Play[];
  windowMs: number;
  timeRemainingMs: number;
  onAudible: (play: Play) => void;
  onSnap: () => void;
}

export const AudibleBar: React.FC<AudibleBarProps> = ({
  active,
  alternates,
  windowMs,
  timeRemainingMs,
  onAudible,
  onSnap,
}) => {
  const fraction = windowMs > 0 ? Math.max(0, Math.min(1, timeRemainingMs / windowMs)) : 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Countdown bar */}
      <div
        style={{
          width: '100%',
          height: 4,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${fraction * 100}%`,
            backgroundColor: fraction > 0.5 ? '#22c55e' : fraction > 0.25 ? '#eab308' : '#ef4444',
            transition: 'width 50ms linear, background-color 200ms',
          }}
        />
      </div>

      {/* Play cards */}
      <div style={{ display: 'flex', gap: 6 }}>
        <PlayCard play={active} isActive={true} onTap={() => { /* already active */ }} />
        {alternates.map(alt => (
          <PlayCard
            key={alt.id}
            play={alt}
            isActive={false}
            onTap={() => onAudible(alt)}
          />
        ))}
      </div>

      {/* Snap button */}
      <button
        onClick={onSnap}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#16a34a',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        SNAP
      </button>

      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
        Read the defense — tap an alternate to audible, or SNAP to commit.
      </div>
    </div>
  );
};

interface PlayCardProps {
  play: Play;
  isActive: boolean;
  onTap: () => void;
}

const PlayCard: React.FC<PlayCardProps> = ({ play, isActive, onTap }) => {
  const isRun = play.playType === 'RUN';

  return (
    <button
      onClick={onTap}
      disabled={isActive}
      style={{
        flex: 1,
        minHeight: 56,
        padding: '8px 10px',
        backgroundColor: isActive ? (isRun ? '#15803d' : '#1d4ed8') : '#1f2937',
        color: isActive ? '#ffffff' : '#d1d5db',
        border: `2px solid ${isActive ? (isRun ? '#22c55e' : '#3b82f6') : '#374151'}`,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: isActive ? 'default' : 'pointer',
        textAlign: 'left',
        lineHeight: 1.2,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span>{isRun ? '🏃' : '🎯'}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{play.formation}</span>
      </div>
      <div style={{ fontWeight: 700 }}>{play.name}</div>
    </button>
  );
};

export default AudibleBar;
