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
import { AudibleBar } from './AudibleBar';
import { DefensePicker } from './DefensePicker';
import { useKeyFramedPlay } from '../../hooks/useKeyFramedPlay';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import { SAMPLE_DEFENSES } from '../../data/sampleDefenses';
import type { OffenseRatings, DefenseRatings } from '../../engine/PlaySimulator';

interface KeyFramePlaySliceProps {
  onBack?: () => void;
}

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
  // Pass + run plays (anything with a Key Frame mechanic).
  const playablePlays = useMemo(
    () => DEFAULT_PLAYS.filter(p => p.playType === 'PASS' || p.playType === 'RUN'),
    []
  );
  const [selectedPlayId, setSelectedPlayId] = useState<string>(
    playablePlays.find(p => p.id === 'default-post-corner')?.id ?? playablePlays[0]?.id ?? ''
  );
  const selectedPlay = playablePlays.find(p => p.id === selectedPlayId) ?? playablePlays[0];

  const [selectedDefenseId, setSelectedDefenseId] = useState<string>(SAMPLE_DEFENSES[0].id);
  const selectedDefense = SAMPLE_DEFENSES.find(d => d.id === selectedDefenseId) ?? SAMPLE_DEFENSES[0];

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
    preSnapTimeRemaining,
    preSnapWindowMs,
    chosenOption,
    activePlay,
    loadPlay,
    play,
    snap,
    audible,
    decide,
    reset,
  } = useKeyFramedPlay();

  // Pick 2 alternates of the same play type as the active play (for the
  // audible bar). Exclude the active one. First two found in DEFAULT_PLAYS order.
  const alternates = useMemo(() => {
    if (!activePlay) return [];
    return playablePlays
      .filter(p => p.id !== activePlay.id && p.playType === activePlay.playType)
      .slice(0, 2);
  }, [activePlay, playablePlays]);

  // (Re)load whenever the chosen play or defense changes.
  useEffect(() => {
    if (!selectedPlay) return;
    loadPlay(selectedPlay, selectedDefense, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
  }, [selectedPlay, selectedDefense, loadPlay]);

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
        {playablePlays.map(p => (
          <option key={p.id} value={p.id}>
            {p.playType === 'RUN' ? '🏃 ' : '🎯 '}{p.name}
          </option>
        ))}
      </select>

      {/* Defense picker — cycle through schemes to feel how the same play
          plays out against different looks. */}
      <DefensePicker
        defenses={SAMPLE_DEFENSES}
        activeId={selectedDefenseId}
        onPick={d => { setSelectedDefenseId(d.id); }}
      />

      {/* Canvas + overlay */}
      <div style={{ position: 'relative', width: canvasSize.width, height: canvasSize.height }}>
        <PlayAnimationCanvas
          frame={currentFrame}
          width={canvasSize.width}
          height={canvasSize.height}
          showRouteTrails={true}
          showLabels={true}
        />
        {/* Active-defense banner during pre-snap so the player has a clear
            read on what they're audibling against. */}
        {phase === 'pre-snap' && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '4px 8px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#fbbf24',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 4,
              letterSpacing: 1,
              pointerEvents: 'none',
            }}
          >
            DEF: {selectedDefense.name.toUpperCase()}
          </div>
        )}
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

      {/* Pre-snap audible bar (replaces Start button while in pre-snap phase) */}
      {phase === 'pre-snap' && activePlay && (
        <AudibleBar
          active={activePlay}
          alternates={alternates}
          windowMs={preSnapWindowMs}
          timeRemainingMs={preSnapTimeRemaining}
          onAudible={audible}
          onSnap={snap}
        />
      )}

      {/* Start / Reset controls (hidden while in pre-snap, audible bar takes over) */}
      {phase !== 'pre-snap' && (
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480 }}>
          <button
            onClick={play}
            disabled={phase !== 'ready'}
            style={primaryBtn(phase === 'ready')}
          >
            Start Play
          </button>
          <button
            onClick={() => {
              if (selectedPlay) loadPlay(selectedPlay, selectedDefense, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
            }}
            style={secondaryBtn}
          >
            Reset
          </button>
        </div>
      )}

      {/* Help text */}
      <div style={{ fontSize: 11, color: '#6b7280', maxWidth: 480, textAlign: 'center', marginTop: 4 }}>
        Pick a <strong>play</strong> and a <strong>defense</strong>, then tap <strong>Start Play</strong>.
        During pre-snap you can audible to an alternate or commit with <strong>SNAP</strong>.
        At the slo-mo moment, tap a colored target — green = safe, yellow = standard, red = risky.
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
