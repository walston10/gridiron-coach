/**
 * BoxScore — game stats panel for both teams.
 *
 * Shows everything the store has been tracking: yards (total / passing /
 * rushing), turnovers, sacks, third-down efficiency, red-zone trips,
 * penalties, time of possession. Surfaced as a modal overlay so it
 * doesn't compete with the play surface — opened by tapping the score
 * in the DriveHud and dismissed with a tap-to-close.
 *
 * Read-only view. The store already tracks all of this; we just give
 * the player a way to see it.
 */

import React from 'react';
import type { GameStats } from '../../types/game.types';

interface BoxScoreProps {
  playerScore: number;
  opponentScore: number;
  playerStats: GameStats;
  opponentStats: GameStats;
  /** Optional team labels, default YOU / OPP. */
  playerLabel?: string;
  opponentLabel?: string;
  /** Quarter / clock for the header. */
  quarterLabel?: string;
  clockLabel?: string;
  onClose: () => void;
}

export const BoxScore: React.FC<BoxScoreProps> = ({
  playerScore,
  opponentScore,
  playerStats,
  opponentStats,
  playerLabel = 'YOU',
  opponentLabel = 'OPP',
  quarterLabel,
  clockLabel,
  onClose,
}) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#0f172a',
          border: '2px solid #374151',
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          color: '#e5e7eb',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: '#d4a056', letterSpacing: 2, fontWeight: 800 }}>
            BOX SCORE
          </div>
          {quarterLabel && (
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {quarterLabel}{clockLabel ? ` · ${clockLabel}` : ''}
            </div>
          )}
        </div>

        {/* Score banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            backgroundColor: '#1f2937',
            borderRadius: 8,
          }}
        >
          <ScoreTile label={playerLabel} score={playerScore} color="#fbbf24" align="left" />
          <span style={{ fontSize: 18, color: '#6b7280', fontWeight: 700 }}>—</span>
          <ScoreTile label={opponentLabel} score={opponentScore} color="#f87171" align="right" />
        </div>

        {/* Stat rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <StatRow label="Total yards"     left={playerStats.totalYards}   right={opponentStats.totalYards} />
          <StatRow label="Passing yards"   left={playerStats.passingYards} right={opponentStats.passingYards} />
          <StatRow label="Rushing yards"   left={playerStats.rushingYards} right={opponentStats.rushingYards} />
          <Divider />
          <StatRow label="Turnovers"       left={playerStats.turnovers}    right={opponentStats.turnovers} invert />
          <StatRow label="Sacks taken"     left={playerStats.sacks}        right={opponentStats.sacks} invert />
          <Divider />
          <StatRow
            label="3rd down"
            left={`${playerStats.thirdDownConversions} / ${playerStats.thirdDownAttempts}`}
            right={`${opponentStats.thirdDownConversions} / ${opponentStats.thirdDownAttempts}`}
          />
          <StatRow
            label="Red zone"
            left={`${playerStats.redZoneScores} / ${playerStats.redZoneAttempts}`}
            right={`${opponentStats.redZoneScores} / ${opponentStats.redZoneAttempts}`}
          />
          <Divider />
          <StatRow label="Penalties"       left={`${playerStats.penalties} (${playerStats.penaltyYards}y)`}    right={`${opponentStats.penalties} (${opponentStats.penaltyYards}y)`} invert />
          <StatRow label="Time of poss."   left={fmtTOP(playerStats.timeOfPossession)} right={fmtTOP(opponentStats.timeOfPossession)} />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            marginTop: 4,
            padding: '12px',
            backgroundColor: '#1f2937',
            color: '#e5e7eb',
            border: '1px solid #374151',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const ScoreTile: React.FC<{ label: string; score: number; color: string; align: 'left' | 'right' }> = ({
  label, score, color, align,
}) => (
  <div style={{ textAlign: align, display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
    <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 1, fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: 28, color, fontWeight: 900, lineHeight: 1 }}>{score}</div>
  </div>
);

const StatRow: React.FC<{
  label: string;
  left: number | string;
  right: number | string;
  /** When true, "better" = lower (turnovers, sacks, penalties). */
  invert?: boolean;
}> = ({ label, left, right, invert }) => {
  const leftBetter = invert
    ? Number(left) < Number(right)
    : Number(left) > Number(right);
  const rightBetter = invert
    ? Number(right) < Number(left)
    : Number(right) > Number(left);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', alignItems: 'baseline', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: leftBetter ? '#22c55e' : '#e5e7eb', textAlign: 'right', fontWeight: 700 }}>
        {left}
      </span>
      <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: rightBetter ? '#22c55e' : '#e5e7eb', textAlign: 'left', fontWeight: 700 }}>
        {right}
      </span>
    </div>
  );
};

const Divider: React.FC = () => (
  <div style={{ height: 1, backgroundColor: '#1f2937', margin: '4px 0' }} />
);

function fmtTOP(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default BoxScore;
