/**
 * PlaybookCardStack — 3-tier play-selection UI (offensive coach version).
 *
 *   TIER 1 - APPROACH  Run / Balanced / Pass / Trick
 *   TIER 2 - PLAY      Cards from the drive hand matching the picked approach.
 *                      Safety plays are tagged so the player can tell them apart.
 *   TIER 3 - MODIFIER  Two slots, Phase 1 = visible placeholders only.
 *                      Phase 2 will wire actual effects + momentum/heat costs.
 *
 * Below the tiers: momentum meter (visual only in Phase 1).
 * Bottom: SNAP button, disabled until approach + play are both picked.
 */

import React from 'react';
import type { Play } from '../../types/Play';
import {
  approachFor,
  approachLabel,
  approachTagline,
  isSafetyPlay,
  type OffensiveApproach,
} from '../../data/playApproach';
import type { PlayHand } from '../../engine/playHand';
import { handAll } from '../../engine/playHand';

interface PlaybookCardStackProps {
  hand: PlayHand;
  selectedApproach: OffensiveApproach | null;
  selectedPlay: Play | null;
  /** Phase 1 just shows the slots — array length signals "modifiers used". */
  selectedModifiers: string[];
  momentum: number;        // 0..10
  heat: number;            // 0..10 (Phase 2 narrative for now)
  onPickApproach: (a: OffensiveApproach) => void;
  onPickPlay: (p: Play) => void;
  onSnap: () => void;
}

const APPROACHES: OffensiveApproach[] = ['RUN', 'BALANCED', 'PASS', 'TRICK'];

const APPROACH_COLOR: Record<OffensiveApproach, { fg: string; bg: string; bgActive: string; border: string }> = {
  RUN:      { fg: '#fef3c7', bg: '#1f2937', bgActive: '#15803d', border: '#22c55e' },
  BALANCED: { fg: '#fef3c7', bg: '#1f2937', bgActive: '#1d4ed8', border: '#3b82f6' },
  PASS:     { fg: '#fef3c7', bg: '#1f2937', bgActive: '#9a3412', border: '#f97316' },
  TRICK:    { fg: '#e9d5ff', bg: '#1f2937', bgActive: '#6b21a8', border: '#a855f7' },
};

export const PlaybookCardStack: React.FC<PlaybookCardStackProps> = ({
  hand,
  selectedApproach,
  selectedPlay,
  selectedModifiers,
  momentum,
  heat,
  onPickApproach,
  onPickPlay,
  onSnap,
}) => {
  const allPlays = handAll(hand);
  const playsForTier2 = selectedApproach
    ? allPlays.filter(p => approachFor(p) === selectedApproach)
    : [];

  const canSnap = !!selectedApproach && !!selectedPlay;

  return (
    <div style={{
      width: '100%',
      maxWidth: 480,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Momentum + heat row */}
      <MomentumRow momentum={momentum} heat={heat} />

      {/* TIER 1: APPROACH */}
      <TierLabel num={1} label="APPROACH" hint="Set the tone" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {APPROACHES.map(a => {
          const isPicked = selectedApproach === a;
          const isTrick = a === 'TRICK';
          const colors = APPROACH_COLOR[a];
          return (
            <button
              key={a}
              onClick={() => { if (!isTrick) onPickApproach(a); }}
              disabled={isTrick}
              style={{
                padding: '8px 4px',
                backgroundColor: isPicked ? colors.bgActive : colors.bg,
                color: isTrick ? '#52525b' : isPicked ? colors.fg : '#d1d5db',
                border: `2px solid ${isPicked ? colors.border : '#374151'}`,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: isTrick ? 'not-allowed' : 'pointer',
                opacity: isTrick ? 0.5 : 1,
                textAlign: 'center',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800 }}>{approachLabel(a)}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.85 }}>
                {approachTagline(a)}
              </div>
            </button>
          );
        })}
      </div>

      {/* TIER 2: PLAY */}
      {selectedApproach && (
        <>
          <TierLabel num={2} label="PLAY" hint={`From your hand — ${playsForTier2.length} ${approachLabel(selectedApproach).toLowerCase()} options`} />
          {playsForTier2.length === 0 ? (
            <div style={{
              padding: '14px 10px',
              backgroundColor: '#1c1917',
              border: '1px dashed #44403c',
              borderRadius: 6,
              fontSize: 11,
              color: '#78716c',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              No {approachLabel(selectedApproach).toLowerCase()} plays in this drive's hand. Pick another approach.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {playsForTier2.map(p => {
                const isPicked = selectedPlay?.id === p.id;
                const isSafe = isSafetyPlay(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => onPickPlay(p)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: isPicked ? '#1e3a8a' : '#1f2937',
                      color: '#e8e4d9',
                      border: `2px solid ${isPicked ? '#3b82f6' : '#374151'}`,
                      borderRadius: 6,
                      fontSize: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ flex: 1, fontWeight: 700 }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 9, color: '#9ca3af' }}>
                      {p.formation}
                    </span>
                    {isSafe && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: '#365314',
                        color: '#d9f99d',
                        letterSpacing: 1,
                      }}>
                        SAFE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TIER 3: MODIFIER slots */}
      {selectedPlay && (
        <>
          <TierLabel num={3} label="MODIFIER" hint="(Phase 2 — slots only for now)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[0, 1].map(i => {
              const used = selectedModifiers[i];
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 48,
                    padding: '8px',
                    backgroundColor: used ? '#3c1a1a' : '#1c1917',
                    border: `2px dashed ${used ? '#dc2626' : '#44403c'}`,
                    borderRadius: 6,
                    fontSize: 11,
                    color: used ? '#fecaca' : '#78716c',
                    textAlign: 'center',
                    fontStyle: used ? 'normal' : 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  {used ?? '+ modifier'}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SNAP button */}
      <button
        onClick={onSnap}
        disabled={!canSnap}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: canSnap ? '#16a34a' : '#374151',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: 1,
          cursor: canSnap ? 'pointer' : 'not-allowed',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {canSnap ? 'SNAP' : selectedApproach ? 'Pick a play…' : 'Pick an approach…'}
      </button>
    </div>
  );
};

const TierLabel: React.FC<{ num: number; label: string; hint?: string }> = ({ num, label, hint }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
    <span style={{
      fontSize: 10,
      fontWeight: 800,
      width: 18,
      height: 18,
      borderRadius: 3,
      backgroundColor: '#8b0000',
      color: '#fef3c7',
      textAlign: 'center',
      lineHeight: '18px',
      letterSpacing: 0,
    }}>
      {num}
    </span>
    <span style={{ fontSize: 11, fontWeight: 800, color: '#e8e4d9', letterSpacing: 1 }}>{label}</span>
    {hint && <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>{hint}</span>}
  </div>
);

const MomentumRow: React.FC<{ momentum: number; heat: number }> = ({ momentum, heat }) => {
  const mClamped = Math.max(0, Math.min(10, momentum));
  const hClamped = Math.max(0, Math.min(10, heat));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: 1, minWidth: 60 }}>
          MOMENTUM
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[...Array(10)].map((_, i) => (
            <span key={i} style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              backgroundColor: i < mClamped ? '#dc2626' : '#44403c',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: 1 }}>
          HEAT
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: i < hClamped ? '#f97316' : '#44403c',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaybookCardStack;
