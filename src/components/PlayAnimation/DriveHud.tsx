/**
 * DriveHud — top banner showing the drive state.
 *
 * Persistent across snaps within a drive: score, down/distance/spot, plays,
 * and a small field-position bar that fills as the offense advances.
 */

import React from 'react';
import { formatDownDistance, type DriveState } from '../../engine/driveState';

interface DriveHudProps {
  state: DriveState;
}

export const DriveHud: React.FC<DriveHudProps> = ({ state }) => {
  // Progress bar — what fraction of the field has the offense covered?
  // 0 = own goal, 100 = scored.
  const progress = Math.max(0, Math.min(100, state.ballOn));
  // First-down marker position on the bar.
  const firstDownPct = Math.max(0, Math.min(100, state.firstDownTarget));

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Top row — score + down/distance */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 1, fontWeight: 600 }}>SCORE</span>
          <span style={{ fontSize: 22, color: '#fbbf24', fontWeight: 800, lineHeight: 1 }}>
            {state.score}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', textAlign: 'right', flex: 1 }}>
          {formatDownDistance(state)}
        </div>
      </div>

      {/* Field-position bar */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 6,
          backgroundColor: '#1f2937',
          borderRadius: 3,
          overflow: 'visible',
        }}
        aria-label="Field position"
      >
        {/* Driven progress */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            backgroundColor: progress >= 100 ? '#22c55e' : '#3b82f6',
            borderRadius: 3,
            transition: 'width 300ms ease',
          }}
        />
        {/* First-down line marker */}
        {!state.driveOver && firstDownPct < 100 && (
          <div
            style={{
              position: 'absolute',
              left: `${firstDownPct}%`,
              top: -2,
              height: 10,
              width: 2,
              backgroundColor: '#fbbf24',
              transform: 'translateX(-50%)',
            }}
          />
        )}
        {/* Midfield tick */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            height: '100%',
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.15)',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Last play summary */}
      {state.lastPlaySummary && (
        <div
          style={{
            fontSize: 11,
            color: '#9ca3af',
            fontStyle: 'italic',
          }}
        >
          {state.lastPlaySummary}
        </div>
      )}
    </div>
  );
};

export default DriveHud;
