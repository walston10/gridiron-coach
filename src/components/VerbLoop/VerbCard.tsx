/**
 * VerbCard — one intent-verb card in the COMMIT rail (beat 2).
 *
 * Shows exactly what the design allows (§3.3): name, a yardage-BAND bar (not a
 * number, not a percentage), 0-3 risk skulls, an active Bite stamp on pass
 * verbs when the defense is biting, and one line of flavor. Committing is a
 * swipe-up gesture (drag the card toward the field); a plain tap also commits
 * for desktop / accessibility.
 */

import React, { useRef, useState } from 'react';
import type { VerbDef } from '../../data/verbs';

interface VerbCardProps {
  def: VerbDef;
  /** Whether the 🔥 Bite stamp should show (pass verb + hot meter). */
  biteStamp: boolean;
  disabled: boolean;
  onCommit: () => void;
}

/** Distance in px the card must travel upward to count as a commit. */
const COMMIT_THRESHOLD = 56;

export const VerbCard: React.FC<VerbCardProps> = ({ def, biteStamp, disabled, onCommit }) => {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    startYRef.current = e.clientY;
    movedRef.current = false;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null) return;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dy) > 4) movedRef.current = true;
    // Only track upward drag (negative dy).
    setDragY(Math.min(0, dy));
  };

  const onPointerUp = () => {
    if (startYRef.current === null) return;
    const committed = -dragY >= COMMIT_THRESHOLD;
    startYRef.current = null;
    setDragging(false);
    setDragY(0);
    if (committed && !disabled) onCommit();
  };

  // A tap (pointer down/up without meaningful drag) also commits.
  const onClick = () => {
    if (disabled) return;
    if (!movedRef.current) onCommit();
  };

  const armed = -dragY >= COMMIT_THRESHOLD;

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      className={`relative flex-1 min-w-0 rounded-xl border-2 p-3 text-left transition-colors touch-none ${
        armed
          ? 'border-amber-400 bg-amber-950/40'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragging ? 'none' : 'transform 160ms ease-out',
        boxShadow: armed ? '0 -6px 20px rgba(251,191,36,0.35)' : 'none',
      }}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-black uppercase tracking-wide text-white text-sm leading-none">
          {def.label}
        </span>
        <RiskPips count={def.riskPips} />
      </div>

      <YardageBandBar def={def} />

      {biteStamp && (
        <div className="mt-1 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
          🔥 +1 Tier
        </div>
      )}

      <div className="mt-1 text-[10px] leading-tight text-gray-400 line-clamp-2">
        {def.flavor}
      </div>
    </button>
  );
};

/** 0-3 skull risk pips. */
const RiskPips: React.FC<{ count: number }> = ({ count }) => (
  <span className="flex gap-0.5" aria-label={`${count} risk`}>
    {[0, 1, 2].map((i) => (
      <span key={i} className={i < count ? 'opacity-100' : 'opacity-20'}>
        💀
      </span>
    ))}
  </span>
);

/**
 * Horizontal band bar spanning a fixed scale, with the verb's typical range
 * highlighted. Bimodal verbs (AIR IT OUT, TRICK 'EM) get a split look to read
 * "nothing... or huge". No numbers on the bar itself — just the shape of risk.
 */
const SCALE_MIN = -12;
const SCALE_MAX = 55;

const YardageBandBar: React.FC<{ def: VerbDef }> = ({ def }) => {
  const { floor, typicalLow, typicalHigh, ceiling, bimodal } = def.band;
  const pct = (v: number) => ((clampScale(v) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  const zeroPct = pct(0);
  const floorPct = pct(floor);
  const ceilPct = pct(ceiling);
  const typLowPct = pct(typicalLow);
  const typHighPct = pct(typicalHigh);

  return (
    <div className="mt-2">
      <div className="relative h-3 rounded-full bg-gray-800 overflow-hidden">
        {/* Full floor→ceiling span (dim). */}
        <div
          className="absolute top-0 bottom-0 bg-gray-600/50"
          style={{ left: `${floorPct}%`, width: `${Math.max(0, ceilPct - floorPct)}%` }}
        />
        {/* Typical range (bright). For bimodal verbs it reads as the "or huge" band. */}
        <div
          className={`absolute top-0 bottom-0 ${bimodal ? 'bg-purple-400' : 'bg-emerald-400'}`}
          style={{ left: `${typLowPct}%`, width: `${Math.max(2, typHighPct - typLowPct)}%` }}
        />
        {/* The "nothing" bump for bimodal verbs, near the floor. */}
        {bimodal && (
          <div
            className="absolute top-0 bottom-0 bg-red-500/70"
            style={{ left: `${floorPct}%`, width: `${Math.max(2, zeroPct - floorPct)}%` }}
          />
        )}
        {/* Zero-yard tick. */}
        <div className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${zeroPct}%` }} />
      </div>
    </div>
  );
};

function clampScale(v: number): number {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, v));
}

export default VerbCard;
