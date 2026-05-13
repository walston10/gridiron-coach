/**
 * OpponentDriveFeed — streams the opponent's play-by-play between drives.
 *
 * Given a pre-computed OpponentDriveResult, reveals plays one at a time
 * with a short delay so the drive has texture instead of just dumping a
 * block of text. When all plays have been shown, fires onDone().
 */

import React, { useEffect, useRef, useState } from 'react';
import type { OpponentDriveResult, OpponentPlay } from '../../engine/aiOffense';

interface OpponentDriveFeedProps {
  result: OpponentDriveResult;
  /** Delay between plays in ms. Default 700. */
  playIntervalMs?: number;
  /** Called when the last play has been revealed. */
  onDone: () => void;
}

export const OpponentDriveFeed: React.FC<OpponentDriveFeedProps> = ({
  result,
  playIntervalMs = 700,
  onDone,
}) => {
  const [revealedCount, setRevealedCount] = useState(0);
  const doneFiredRef = useRef(false);

  // Reveal plays at the configured cadence.
  useEffect(() => {
    setRevealedCount(0);
    doneFiredRef.current = false;
    if (result.plays.length === 0) {
      onDone();
      return;
    }
    const interval = setInterval(() => {
      setRevealedCount(c => {
        const next = c + 1;
        if (next >= result.plays.length) {
          clearInterval(interval);
          // Defer onDone slightly so the last play is visible for a beat.
          setTimeout(() => {
            if (!doneFiredRef.current) {
              doneFiredRef.current = true;
              onDone();
            }
          }, playIntervalMs);
        }
        return next;
      });
    }, playIntervalMs);
    return () => clearInterval(interval);
  }, [result, playIntervalMs, onDone]);

  const visiblePlays = result.plays.slice(0, revealedCount);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, letterSpacing: 1 }}>
          OPPONENT'S DRIVE
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {revealedCount}/{result.plays.length} plays
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: 240,
          overflowY: 'auto',
        }}
      >
        {visiblePlays.map((p, i) => (
          <PlayLine key={i} play={p} isLatest={i === revealedCount - 1} />
        ))}
      </div>

      {revealedCount >= result.plays.length && (
        <div
          style={{
            marginTop: 4,
            padding: '8px 10px',
            backgroundColor: bgForSummary(result.endReason),
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {result.summary}
        </div>
      )}
    </div>
  );
};

const PlayLine: React.FC<{ play: OpponentPlay; isLatest: boolean }> = ({ play, isLatest }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
        padding: '4px 6px',
        backgroundColor: isLatest ? 'rgba(251,191,36,0.08)' : 'transparent',
        borderRadius: 4,
        fontSize: 12,
        animation: isLatest ? 'feed-fade-in 200ms ease-out' : undefined,
      }}
    >
      <div style={{ minWidth: 130, color: '#9ca3af', fontWeight: 600 }}>
        {play.prelude}
      </div>
      <div style={{ flex: 1, color: '#e5e7eb' }}>
        {play.description}
      </div>
      <style>{`
        @keyframes feed-fade-in {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

function bgForSummary(reason: string): string {
  if (reason === 'TOUCHDOWN') return '#7f1d1d';
  if (reason === 'FIELD_GOAL') return '#7c2d12';
  if (reason === 'TURNOVER' || reason === 'TURNOVER_ON_DOWNS') return '#065f46';
  if (reason === 'PUNT') return '#374151';
  return '#374151';
}

export default OpponentDriveFeed;
