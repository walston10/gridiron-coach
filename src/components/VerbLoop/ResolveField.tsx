/**
 * ResolveField — beat 4, "shown, not told" (§2).
 *
 * The engine already decided the tier + yards; this plays it out on the field.
 * The ballcarrier travels to the resolved spot, and on BIG/HUGE the live
 * "tackle broken?" rolls fire one at a time — the run isn't over until he's
 * down. Tap anywhere to skip to the result. FAST MODE collapses the whole thing
 * to a ~1s ticker for season grinders.
 *
 * This is intentionally a self-contained field render. The keyframed play
 * animation (KeyFramedPlayResult) computes its own outcome from a Play+defense
 * and can't yet accept a forced yardage, so swapping it in here is a later
 * integration; `onDone` is the seam.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TierResolution } from '../../engine/tierResolver';

interface ResolveFieldProps {
  resolution: TierResolution;
  /** Ball spot at the snap, 0-100 from the offense's perspective. */
  startBallOn: number;
  /** Yards needed for a first down (for the line-to-gain marker). */
  yardsToGo: number;
  fastMode: boolean;
  /** Whose eyes we watch through. On DEFENSE, small yardage reads as a win. */
  perspective?: 'OFFENSE' | 'DEFENSE';
  onDone: () => void;
}

/** Color of the traveling yard number, by perspective and outcome. */
function yardTone(
  perspective: 'OFFENSE' | 'DEFENSE',
  yards: number,
  turnover: boolean,
): string {
  if (perspective === 'DEFENSE') {
    if (turnover) return 'text-emerald-400'; // takeaway
    if (yards <= 2) return 'text-emerald-400'; // stuffed
    if (yards >= 13) return 'text-red-400'; // gashed
    return 'text-white';
  }
  if (turnover) return 'text-red-400';
  if (yards < 0) return 'text-orange-400';
  return 'text-white';
}

interface Step {
  /** Cumulative yards gained at the end of this step. */
  toYards: number;
  banner?: string;
}

export const ResolveField: React.FC<ResolveFieldProps> = ({
  resolution,
  startBallOn,
  yardsToGo,
  fastMode,
  perspective = 'OFFENSE',
  onDone,
}) => {
  const steps = useMemo<Step[]>(() => buildSteps(resolution), [resolution]);

  if (fastMode) {
    return <FastTicker resolution={resolution} perspective={perspective} onDone={onDone} />;
  }
  return (
    <FieldRun
      steps={steps}
      resolution={resolution}
      startBallOn={startBallOn}
      yardsToGo={yardsToGo}
      perspective={perspective}
      onDone={onDone}
    />
  );
};

/** Break a resolution into animation stops (breakaway rolls become extra stops). */
function buildSteps(res: TierResolution): Step[] {
  if (res.turnover) {
    return [{ toYards: 0, banner: res.turnoverType === 'INTERCEPTION' ? 'INTERCEPTED!' : 'FUMBLE!' }];
  }
  if (!res.breakaway) {
    return [{ toYards: res.yards }];
  }
  const out: Step[] = [{ toYards: res.breakaway.baseYards }];
  let running = res.breakaway.baseYards;
  for (const roll of res.breakaway.rolls) {
    if (roll.broken) {
      running += roll.extraYards;
      out.push({ toYards: running, banner: `BROKE A TACKLE! +${roll.extraYards}` });
    }
  }
  return out;
}

// =============================================================================
// FULL FIELD RUN
// =============================================================================

const FieldRun: React.FC<{
  steps: Step[];
  resolution: TierResolution;
  startBallOn: number;
  yardsToGo: number;
  perspective: 'OFFENSE' | 'DEFENSE';
  onDone: () => void;
}> = ({ steps, resolution, startBallOn, yardsToGo, perspective, onDone }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  const skip = () => {
    setStepIndex(steps.length - 1);
    setBanner(null);
    setTimeout(finish, 350);
  };

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runStep = (i: number) => {
      if (cancelled) return;
      setStepIndex(i);
      const step = steps[i];
      if (step.banner) {
        timers.push(setTimeout(() => !cancelled && setBanner(step.banner!), 260));
        timers.push(setTimeout(() => !cancelled && setBanner(null), 900));
      }
      const isLast = i >= steps.length - 1;
      const dwell = step.banner ? 1000 : 700;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if (isLast) finish();
          else runStep(i + 1);
        }, dwell),
      );
    };

    // Small beat before the carrier takes off.
    timers.push(setTimeout(() => runStep(0), 300));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const displayedYards = steps[stepIndex]?.toYards ?? 0;
  const ballOn = clampField(startBallOn + (resolution.turnover ? 0 : displayedYards));
  const lineToGain = clampField(startBallOn + yardsToGo);
  const yardLabel = displayedYards >= 0 ? `+${displayedYards}` : `${displayedYards}`;

  return (
    <button
      type="button"
      onClick={skip}
      className="absolute inset-0 z-10 flex flex-col justify-center gap-4 bg-gray-950 px-4"
      aria-label="Skip animation"
    >
      {/* Traveling yard counter. */}
      <div className="text-center">
        <span
          className={`text-6xl font-black tabular-nums ${yardTone(
            perspective,
            displayedYards,
            resolution.turnover,
          )}`}
        >
          {resolution.turnover ? '—' : yardLabel}
        </span>
        <span className="ml-1 text-lg font-bold uppercase text-gray-500">yd</span>
      </div>

      {/* Field strip. */}
      <div className="relative h-16 w-full rounded-lg border border-green-800/60 bg-green-950/60 overflow-hidden">
        {/* Opponent endzone. */}
        <div className="absolute right-0 top-0 bottom-0 w-[8%] bg-emerald-800/40 border-l border-white/30" />
        {/* Yard hashes. */}
        {[20, 40, 60, 80].map((y) => (
          <div key={y} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${y}%` }} />
        ))}
        {/* Line to gain. */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80"
          style={{ left: `${lineToGain}%` }}
        />
        {/* Ballcarrier. */}
        <div
          className="absolute top-1/2 text-2xl transition-[left] duration-500 ease-out"
          style={{ left: `${ballOn}%`, transform: 'translate(-50%, -50%)' }}
        >
          🏈
        </div>
      </div>

      {/* Breakaway banner. */}
      <div className="h-8 text-center">
        {banner && (
          <span
            className="inline-block rounded bg-amber-500/20 px-3 py-1 text-sm font-black uppercase tracking-wider text-amber-300"
            style={{ animation: 'vl-pop 240ms cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            {banner}
          </span>
        )}
      </div>

      <div className="text-center text-[10px] uppercase tracking-widest text-gray-600">
        Tap to skip
      </div>

      <style>{`
        @keyframes vl-pop {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
};

// =============================================================================
// FAST MODE TICKER
// =============================================================================

const FastTicker: React.FC<{
  resolution: TierResolution;
  perspective: 'OFFENSE' | 'DEFENSE';
  onDone: () => void;
}> = ({ resolution, perspective, onDone }) => {
  const [shown, setShown] = useState(0);
  const target = resolution.turnover ? 0 : resolution.yards;

  useEffect(() => {
    let raf = 0;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;
    const start = performance.now();
    const dur = 800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setShown(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else doneTimer = setTimeout(onDone, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [target, onDone]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div
          className={`text-6xl font-black tabular-nums ${yardTone(
            perspective,
            resolution.yards,
            resolution.turnover,
          )}`}
        >
          {resolution.turnover ? 'TURNOVER' : `${shown >= 0 ? '+' : ''}${shown}`}
        </div>
        {!resolution.turnover && (
          <div className="text-sm font-bold uppercase tracking-widest text-gray-500">yards</div>
        )}
      </div>
    </div>
  );
};

function clampField(v: number): number {
  return Math.max(1, Math.min(99, v));
}

export default ResolveField;
