/**
 * KeyFramePlaySlice — vertical slice screen for the Key Frame mechanic.
 *
 * Picks one pass play, runs it through the branched simulator, and shows
 * the slo-mo decision moment with diegetic tap targets. This is the smallest
 * playable demonstration of the new gameplay loop.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayAnimationCanvas } from './PlayAnimationCanvas';
import { KeyFrameOverlay } from './KeyFrameOverlay';
import { AudibleBar } from './AudibleBar';
import { DefensePicker } from './DefensePicker';
import { ScoutTellsOverlay } from './ScoutTellsOverlay';
import { DriveHud } from './DriveHud';
import { useKeyFramedPlay } from '../../hooks/useKeyFramedPlay';
import { useDriveState } from '../../hooks/useDriveState';
import { DEFAULT_PLAYS } from '../../data/defaultPlays';
import { SAMPLE_DEFENSES } from '../../data/sampleDefenses';
import { tellsFor, gradeLabel, type ScoutGrade } from '../../engine/tells';
import { chooseDefense } from '../../engine/aiDefenseCaller';
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

  // AI defense caller — when on, AI picks the defense based on situation
  // (down/distance/field position). Player can flip off to drive the picker manually.
  const [aiDefenseEnabled, setAiDefenseEnabled] = useState<boolean>(true);

  // The defense the offense is currently facing. Driven by AI when enabled,
  // or by the manual picker when not. Initial value is an AI pick for the
  // starting situation if AI is on, otherwise the first sample defense.
  const [currentDefense, setCurrentDefense] = useState(() =>
    aiDefenseEnabled
      ? chooseDefense(SAMPLE_DEFENSES, { down: 1, yardsToGo: 10, ballOn: 25, scoreDiff: 0 })
      : SAMPLE_DEFENSES[0]
  );

  // Scout grade gates which pre-snap tells are visible. Defaults to B
  // ("good scout") which reveals blitz / deep / spy but not man-coverage shape.
  const [scoutGrade, setScoutGrade] = useState<ScoutGrade>('B');

  // Tells re-derive whenever defense or scout grade changes.
  const tells = useMemo(
    () => tellsFor(currentDefense, scoutGrade),
    [currentDefense, scoutGrade]
  );

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

  // Drive state — persists across snaps until the drive ends.
  const drive = useDriveState();

  // (Re)load whenever the chosen play or defense changes.
  useEffect(() => {
    if (!selectedPlay) return;
    loadPlay(selectedPlay, currentDefense, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
  }, [selectedPlay, currentDefense, loadPlay]);

  // Once-per-play guard so we only apply the outcome to drive state a single
  // time when the phase transitions to 'done'.
  const lastAppliedRef = useRef<string | null>(null);

  // Pump the play outcome into the drive state when a play resolves.
  useEffect(() => {
    if (phase !== 'done' || !chosenOption) return;
    // chosenOption is replaced each play; guard against re-applying the same one.
    const key = `${chosenOption.id}|${chosenOption.branch.totalDurationMs}|${drive.state.playsRun}`;
    if (lastAppliedRef.current === key) return;
    lastAppliedRef.current = key;
    drive.applyOutcome(chosenOption.branch.outcome);
  }, [phase, chosenOption, drive]);

  // Reset the per-play guard whenever a new play is loaded (so the next
  // play's outcome will apply cleanly).
  useEffect(() => {
    if (phase === 'ready') lastAppliedRef.current = null;
  }, [phase]);

  /**
   * Compute the AI's defense pick for the current drive situation.
   * Returns the chosen card; caller seats it into state.
   */
  const aiPickDefense = useCallback(() => {
    return chooseDefense(SAMPLE_DEFENSES, {
      down: drive.state.down,
      yardsToGo: drive.state.yardsToGo,
      ballOn: drive.state.ballOn,
      scoreDiff: drive.state.score,  // No opponent score yet; treat own score as differential.
    });
  }, [drive.state]);

  // When AI toggle flips on, pick a fresh defense for the current situation.
  // (Flipping off leaves the existing defense in place until manually changed.)
  useEffect(() => {
    if (!aiDefenseEnabled) return;
    setCurrentDefense(aiPickDefense());
    // We intentionally only re-pick on toggle flip, not on every drive state change —
    // mid-play state shifts are noise; the explicit "Next Play" handler is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDefenseEnabled]);

  const showOverlay = phase === 'awaiting-decision';
  const finalOutcome = phase === 'done' && chosenOption?.branch.outcome;
  const isFourthDown = drive.state.down === 4 && !drive.state.driveOver && phase === 'ready';

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

      {/* Drive HUD — score, down/distance, field position. Persists across plays. */}
      <DriveHud state={drive.state} />

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

      {/* AI defense toggle — when on, defense is called by the AI based on
          down/distance/spot; the picker below becomes a read-only display.
          When off, you drive the picker manually for testing. */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: 1 }}>
          DEFENSE CALLED BY
        </span>
        <button
          onClick={() => setAiDefenseEnabled(v => !v)}
          style={{
            flex: 1,
            padding: '6px 12px',
            backgroundColor: aiDefenseEnabled ? '#7c2d12' : '#1f2937',
            color: aiDefenseEnabled ? '#fed7aa' : '#d1d5db',
            border: `2px solid ${aiDefenseEnabled ? '#f97316' : '#374151'}`,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          {aiDefenseEnabled ? 'AI (tap to override)' : 'YOU (manual)'}
        </button>
      </div>

      {/* Defense picker — cycle through schemes to feel how the same play
          plays out against different looks. */}
      <DefensePicker
        defenses={SAMPLE_DEFENSES}
        activeId={currentDefense.id}
        onPick={d => {
          if (aiDefenseEnabled) return;  // Locked while AI is calling
          setCurrentDefense(d);
        }}
      />

      {/* Scout-grade picker — controls how much the defense reveals pre-snap. */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: 1 }}>
          SCOUT REPORT — {gradeLabel(scoutGrade)}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['A', 'B', 'C', 'D'] as ScoutGrade[]).map(g => (
            <button
              key={g}
              onClick={() => setScoutGrade(g)}
              style={{
                flex: 1,
                minHeight: 36,
                padding: '6px',
                backgroundColor: scoutGrade === g ? '#d4a056' : '#1f2937',
                color: scoutGrade === g ? '#1c1917' : '#d1d5db',
                border: `2px solid ${scoutGrade === g ? '#fbbf24' : '#374151'}`,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

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
            DEF: {currentDefense.name.toUpperCase()} · SCOUT {scoutGrade}
          </div>
        )}
        {/* Scout-tell badges over each tagged defender — only during pre-snap. */}
        {phase === 'pre-snap' && (
          <ScoutTellsOverlay
            tells={tells}
            frame={currentFrame}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />
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

      {/* End-of-drive controls: show summary + New Drive button. */}
      {drive.state.driveOver && (
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              padding: 12,
              backgroundColor: driveResultBg(drive.state.driveOverReason),
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {driveResultLabel(drive.state.driveOverReason)} · {drive.state.playsRun} plays · {drive.state.score} pts total
          </div>
          <button
            onClick={() => {
              drive.newDrive();
              // On a new drive, AI picks a fresh defense for 1st & 10 at own 25.
              if (aiDefenseEnabled) {
                setCurrentDefense(chooseDefense(SAMPLE_DEFENSES, {
                  down: 1, yardsToGo: 10, ballOn: 25, scoreDiff: drive.state.score,
                }));
                // currentDefense change will trigger the load-play effect.
              } else if (selectedPlay) {
                loadPlay(selectedPlay, currentDefense, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
              }
            }}
            style={primaryBtn(true)}
          >
            New Drive
          </button>
        </div>
      )}

      {/* 4th-down decision row: only on 4th down before snap, drive still live. */}
      {isFourthDown && !drive.state.driveOver && (
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', gap: 6 }}>
          <button onClick={play} style={{ ...primaryBtn(true), flex: 2 }}>
            Go For It
          </button>
          <button onClick={drive.kickFieldGoal} style={{ ...secondaryBtn, flex: 1, padding: 14 }}>
            FG
          </button>
          <button onClick={drive.punt} style={{ ...secondaryBtn, flex: 1, padding: 14 }}>
            Punt
          </button>
        </div>
      )}

      {/* Standard controls: Start Play / Next Play. Hidden during pre-snap,
          on 4th down (special row above), and when drive is over. */}
      {phase !== 'pre-snap' && !drive.state.driveOver && !isFourthDown && (
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480 }}>
          <button
            onClick={() => {
              if (phase === 'done' && selectedPlay) {
                // Advance to the next play. If AI is calling, it picks a new defense
                // for the just-updated situation; otherwise reload with current defense.
                if (aiDefenseEnabled) {
                  setCurrentDefense(aiPickDefense());
                  // currentDefense change triggers the load-play effect.
                } else {
                  loadPlay(selectedPlay, currentDefense, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
                }
              } else {
                play();
              }
            }}
            disabled={phase !== 'ready' && phase !== 'done'}
            style={primaryBtn(phase === 'ready' || phase === 'done')}
          >
            {phase === 'done' ? 'Next Play' : 'Start Play'}
          </button>
          <button
            onClick={() => {
              drive.newDrive();
              if (aiDefenseEnabled) {
                setCurrentDefense(chooseDefense(SAMPLE_DEFENSES, {
                  down: 1, yardsToGo: 10, ballOn: 25, scoreDiff: drive.state.score,
                }));
              } else if (selectedPlay) {
                loadPlay(selectedPlay, currentDefense, SAMPLE_OFFENSE, SAMPLE_DEFENSE_RATINGS);
              }
            }}
            style={secondaryBtn}
          >
            Reset Drive
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

function driveResultBg(reason: string | null): string {
  switch (reason) {
    case 'TOUCHDOWN':         return '#065f46';
    case 'FIELD_GOAL':        return '#1e3a8a';
    case 'PUNT':              return '#374151';
    case 'TURNOVER':
    case 'TURNOVER_ON_DOWNS':
    case 'SAFETY':            return '#7f1d1d';
    default:                  return '#374151';
  }
}

function driveResultLabel(reason: string | null): string {
  switch (reason) {
    case 'TOUCHDOWN':         return 'TOUCHDOWN';
    case 'FIELD_GOAL':        return 'Field goal attempt';
    case 'PUNT':              return 'Punted';
    case 'TURNOVER':          return 'Turnover';
    case 'TURNOVER_ON_DOWNS': return 'Turnover on downs';
    case 'SAFETY':            return 'Safety';
    default:                  return 'Drive over';
  }
}

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
