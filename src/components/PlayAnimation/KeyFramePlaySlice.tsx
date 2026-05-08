/**
 * KeyFramePlaySlice — vertical slice screen for the Key Frame mechanic.
 *
 * Picks one pass play, runs it through the branched simulator, and shows
 * the slo-mo decision moment with diegetic tap targets. This is the smallest
 * playable demonstration of the new gameplay loop.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { PlayAnimationCanvas } from './PlayAnimationCanvas';
import { KeyFrameOverlay } from './KeyFrameOverlay';
import { useKeyFramedPlay } from '../../hooks/useKeyFramedPlay';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import type { DefensiveCard } from '../../types/card.types';
import type { OffenseRatings, DefenseRatings } from '../../engine/PlaySimulator';

interface KeyFramePlaySliceProps {
  onBack?: () => void;
}

/** A simple defensive card used by the slice — zone coverage shell. */
const SAMPLE_DEFENSE: DefensiveCard = {
  id: 'slice-zone',
  category: 'DEFENSIVE',
  name: 'Zone Coverage',
  description: 'Read-and-react zone shell.',
  playType: 'ZONE_COVERAGE',
  rarity: 'COMMON',
  runStopRating: 65,
  passDefenseRating: 78,
  pressureRating: 25,
  bigPlayAllowed: 15,
  situationBonuses: [],
  predictionBonus: 15,
  strongAgainst: ['DEEP_PASS'],
  weakAgainst: ['SHORT_PASS'],
  generatedBy: 'slice',
};

/** Sample QB ratings — used to drive the Key Frame window size. */
const SAMPLE_OFFENSE: OffenseRatings = {
  qbAccuracy: 82,
};

const SAMPLE_DEFENSE_RATINGS: DefenseRatings = {};

// Mobile-first canvas: portrait-ish, since plays develop along the Y axis.
function pickCanvasSize() {
  if (typeof window === 'undefined') return { width: 360, height: 520 };
  const w = Math.min(window.innerWidth - 24, 480);
  const h = Math.round(w * 1.45);
  return { width: w, height: h };
}

export const KeyFramePlaySlice: React.FC<KeyFramePlaySliceProps> = ({ onBack }) => {
  // Pick a pass play with rich route diversity for the demo.
  const passPlays = useMemo(
    () => DEFAULT_PLAYS.filter(p => p.playType === 'PASS'),
    []
  );
  const [selectedPlayId, setSelectedPlayId] = useState<string>(
    passPlays.find(p => p.id === 'default-post-corner')?.id ?? passPlays[0]?.id ?? ''
  );
  const selectedPlay = passPlays.find(p => p.id === selectedPlayId) ?? passPlays[0];

  const [canvasSize, setCanvasSize] = useState(pickCanvasSize);
  useEffect(() => {
    const onResize = () => setCanvasSize(pickCanvasSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const {
    phase,
    currentFrame,
    keyFramedPlay,
    options,
    decisionTimeRemaining,
    chosenOption,
    loadPlay,
    play,
    decide,
    reset,
  } = useKeyFramedPlay();

  // (Re)load whenever the chosen play changes.
  useEffect(() => {
    if (!selectedPlay) return;
    loadPlay(selectedPlay, SAMPLE_DEFENSE, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
  }, [selectedPlay, loadPlay]);

  const showOverlay = phase === 'awaiting-decision';
  const finalOutcome = phase === 'done' && chosenOption?.branch.outcome;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#e5e7eb',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        )}
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Key Frame Slice</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Play selector */}
      <select
        value={selectedPlayId}
        onChange={e => { setSelectedPlayId(e.target.value); reset(); }}
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '10px 12px',
          backgroundColor: '#1f2937',
          color: '#e5e7eb',
          border: '1px solid #374151',
          borderRadius: 6,
          fontSize: 14,
        }}
      >
        {passPlays.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Canvas + overlay */}
      <div style={{ position: 'relative', width: canvasSize.width, height: canvasSize.height }}>
        <PlayAnimationCanvas
          frame={currentFrame}
          width={canvasSize.width}
          height={canvasSize.height}
          showRouteTrails={true}
          showLabels={true}
        />
        {showOverlay && keyFramedPlay && (
          <KeyFrameOverlay
            options={options}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            windowMs={keyFramedPlay.windowMs}
            timeRemainingMs={decisionTimeRemaining}
            onDecide={decide}
          />
        )}
      </div>

      {/* Status / outcome */}
      <div style={{ width: '100%', maxWidth: 480, minHeight: 60, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          Phase: <span style={{ color: '#e5e7eb' }}>{phase}</span>
          {' • '}Window: {keyFramedPlay ? `${keyFramedPlay.windowMs}ms` : '—'}
          {' • '}Options: {options.length}
        </div>

        {finalOutcome && (
          <div style={{
            padding: 12,
            backgroundColor: outcomeBg(finalOutcome.result),
            borderRadius: 6,
            fontSize: 14,
          }}>
            <div style={{ fontWeight: 700 }}>
              {finalOutcome.result} — {finalOutcome.yardsGained > 0 ? '+' : ''}{finalOutcome.yardsGained} yards
            </div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              You picked: <strong>{chosenOption?.label}</strong> ({chosenOption?.intent})
              {chosenOption?.targetSlot && ` → ${chosenOption.targetSlot}`}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480 }}>
        <button
          onClick={play}
          disabled={phase !== 'ready'}
          style={primaryBtn(phase === 'ready')}
        >
          Snap
        </button>
        <button
          onClick={() => {
            if (selectedPlay) loadPlay(selectedPlay, SAMPLE_DEFENSE, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
          }}
          style={secondaryBtn}
        >
          Reset
        </button>
      </div>

      {/* Help text */}
      <div style={{ fontSize: 11, color: '#6b7280', maxWidth: 480, textAlign: 'center', marginTop: 4 }}>
        Tap "Snap" to start the play. When the slo-mo decision moment hits, tap one of the
        colored targets on the field. Green = open, yellow = contested, red = covered.
        Throw-away appears at the sideline.
      </div>
    </div>
  );
};

function outcomeBg(result: string): string {
  switch (result) {
    case 'TOUCHDOWN': return '#065f46';
    case 'COMPLETE':  return '#1e3a8a';
    case 'INCOMPLETE':return '#374151';
    case 'INTERCEPTION': return '#7f1d1d';
    case 'SACK':      return '#7f1d1d';
    default:          return '#374151';
  }
}

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '14px',
    backgroundColor: enabled ? '#16a34a' : '#374151',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
    cursor: enabled ? 'pointer' : 'not-allowed',
    touchAction: 'manipulation',
  };
}

const secondaryBtn: React.CSSProperties = {
  padding: '14px 20px',
  backgroundColor: '#1f2937',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: 6,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  touchAction: 'manipulation',
};

export default KeyFramePlaySlice;
