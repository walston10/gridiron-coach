/**
 * VerbLoop — the rebuilt play-calling loop (§2).
 *
 * Drives the five beats — READ → COMMIT → REVEAL → RESOLVE → AFTERMATH — on top
 * of the Phase 1 engine (verb tiers, Bite meter, verb→play selection). Runs as
 * a self-contained, offense-only sandbox so the whole loop is playable in
 * isolation (mounted via the #verbloop dev route) without the legacy
 * CardGameController's phase machine, decks, or 4th-down flow.
 *
 * The Bite meter reads/writes the shared cardGameStore, exercising the Phase 1
 * store wiring end to end.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardGameStore } from '../../stores/cardGameStore';
import { SeededRNG } from '../../engine/playResolver';
import { resolveSnap, type TierResolution } from '../../engine/tierResolver';
import { chooseDefenseVerb } from '../../engine/aiDefenseVerb';
import { selectConcretePlay } from '../../engine/verbPlaySelection';
import { VERB_DEFS, isBiteHot, type OffenseVerb, type DefenseVerb } from '../../data/verbs';
import type { ScoutGrade } from '../../engine/tells';
import { BiteMeter } from './BiteMeter';
import { VerbCard } from './VerbCard';
import { RevealFlip } from './RevealFlip';
import { ResolveField } from './ResolveField';
import { ResultSlam } from './ResultSlam';
import { defenseTells } from './copy';

type Beat = 'READ' | 'REVEAL' | 'RESOLVE' | 'AFTERMATH';

const VERB_ORDER: OffenseVerb[] = ['HAMMER', 'DINK', 'AIR_IT_OUT', 'TRICK_EM'];
const GRADES: ScoutGrade[] = ['A', 'B', 'C', 'D'];

interface Series {
  ballOn: number; // 0-100, offense perspective (drives toward 100)
  down: number;
  yardsToGo: number;
}

interface Snap {
  verb: OffenseVerb;
  defenseVerb: DefenseVerb;
  resolution: TierResolution;
  concretePlayName: string;
  touchdown: boolean;
  firstDown: boolean;
  biteBefore: number;
  biteAfter: number;
  flavorRoll: number;
}

const INITIAL_SERIES: Series = { ballOn: 25, down: 1, yardsToGo: 10 };

interface VerbLoopProps {
  onBack?: () => void;
}

export const VerbLoop: React.FC<VerbLoopProps> = ({ onBack }) => {
  const biteMeter = useCardGameStore((s) => s.biteMeter);
  const applyVerbBite = useCardGameStore((s) => s.applyVerbBite);
  const decayBite = useCardGameStore((s) => s.decayBite);
  const resetBite = useCardGameStore((s) => s.resetBite);

  const rngRef = useRef<SeededRNG>(new SeededRNG(0xC0FFEE));

  const [beat, setBeat] = useState<Beat>('READ');
  const [series, setSeries] = useState<Series>(INITIAL_SERIES);
  const [score, setScore] = useState(0);
  const [grade, setGrade] = useState<ScoutGrade>('B');
  const [fastMode, setFastMode] = useState(false);
  const [defenseVerb, setDefenseVerb] = useState<DefenseVerb | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);

  // Reset Bite to a clean slate on mount so the sandbox starts loaded-to-zero.
  useEffect(() => {
    resetBite();
  }, [resetBite]);

  // On each new READ, the defense picks its (hidden) call, reading the Bite meter.
  useEffect(() => {
    if (beat === 'READ' && defenseVerb === null) {
      setDefenseVerb(chooseDefenseVerb(biteMeter, rngRef.current));
    }
  }, [beat, defenseVerb, biteMeter]);

  const redZone = series.ballOn >= 80;

  const commit = useCallback(
    (verb: OffenseVerb) => {
      if (defenseVerb === null) return;
      const rng = rngRef.current;
      const biteBefore = useCardGameStore.getState().biteMeter;

      const resolution = resolveSnap(
        verb,
        defenseVerb,
        { bite: biteBefore, redZone, ballCarrierRating: 82 },
        rng,
      );
      const concretePlayName = selectConcretePlay(verb, biteBefore, rng).name;

      const touchdown = !resolution.turnover && series.ballOn + resolution.yards >= 100;
      const firstDown =
        !resolution.turnover && !touchdown && resolution.yards >= series.yardsToGo;

      // Advance the Bite meter: apply the verb's effect, then passive decay.
      applyVerbBite(verb);
      decayBite();
      const biteAfter = useCardGameStore.getState().biteMeter;

      setSnap({
        verb,
        defenseVerb,
        resolution,
        concretePlayName,
        touchdown,
        firstDown,
        biteBefore,
        biteAfter,
        flavorRoll: rng.next(),
      });
      setBeat('REVEAL');
    },
    [defenseVerb, redZone, series, applyVerbBite, decayBite],
  );

  const nextPlay = useCallback(() => {
    if (!snap) return;
    const { resolution, touchdown, firstDown } = snap;

    if (resolution.turnover) {
      setSeries(INITIAL_SERIES);
    } else if (touchdown) {
      setScore((s) => s + 7);
      setSeries(INITIAL_SERIES);
    } else {
      const newBallOn = Math.min(99, series.ballOn + resolution.yards);
      if (firstDown) {
        setSeries({ ballOn: newBallOn, down: 1, yardsToGo: Math.min(10, 100 - newBallOn) });
      } else if (series.down >= 4) {
        // Turnover on downs — sandbox just resets the drive.
        setSeries(INITIAL_SERIES);
      } else {
        setSeries({
          ballOn: newBallOn,
          down: series.down + 1,
          yardsToGo: Math.max(1, series.yardsToGo - resolution.yards),
        });
      }
    }

    setSnap(null);
    setDefenseVerb(null);
    setBeat('READ');
  }, [snap, series]);

  return (
    <div className="relative mx-auto flex h-screen max-w-md flex-col bg-gray-950 text-white">
      <ReadBoard
        series={series}
        score={score}
        grade={grade}
        onGrade={setGrade}
        fastMode={fastMode}
        onToggleFast={() => setFastMode((f) => !f)}
        defenseVerb={defenseVerb}
        bite={biteMeter}
        redZone={redZone}
        canCommit={beat === 'READ'}
        onCommit={commit}
        onBack={onBack}
      />

      {beat === 'REVEAL' && snap && (
        <RevealFlip
          defenseVerb={snap.defenseVerb}
          verdict={snap.resolution.verdict}
          onDone={() => setBeat('RESOLVE')}
        />
      )}

      {beat === 'RESOLVE' && snap && (
        <ResolveField
          resolution={snap.resolution}
          startBallOn={series.ballOn}
          yardsToGo={series.yardsToGo}
          fastMode={fastMode}
          onDone={() => setBeat('AFTERMATH')}
        />
      )}

      {beat === 'AFTERMATH' && snap && (
        <ResultSlam
          resolution={snap.resolution}
          touchdown={snap.touchdown}
          firstDown={snap.firstDown}
          biteBefore={snap.biteBefore}
          biteAfter={snap.biteAfter}
          flavorRoll={snap.flavorRoll}
          concretePlayName={snap.concretePlayName}
          onContinue={nextPlay}
        />
      )}
    </div>
  );
};

// =============================================================================
// READ / COMMIT board (beats 1 & 2)
// =============================================================================

interface ReadBoardProps {
  series: Series;
  score: number;
  grade: ScoutGrade;
  onGrade: (g: ScoutGrade) => void;
  fastMode: boolean;
  onToggleFast: () => void;
  defenseVerb: DefenseVerb | null;
  bite: number;
  redZone: boolean;
  canCommit: boolean;
  onCommit: (verb: OffenseVerb) => void;
  onBack?: () => void;
}

const ReadBoard: React.FC<ReadBoardProps> = ({
  series,
  score,
  grade,
  onGrade,
  fastMode,
  onToggleFast,
  defenseVerb,
  bite,
  redZone,
  canCommit,
  onCommit,
  onBack,
}) => {
  const hot = isBiteHot(bite);
  const tells = useMemo(
    () => (defenseVerb ? defenseTells(defenseVerb, grade) : []),
    [defenseVerb, grade],
  );
  const spot =
    series.ballOn > 50 ? `OPP ${100 - series.ballOn}` : `OWN ${series.ballOn}`;
  const downLabel = ['1st', '2nd', '3rd', '4th'][Math.min(3, series.down - 1)];

  return (
    <div className="flex h-full flex-col">
      {/* Scoreboard. */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-2">
        <button
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-gray-300"
          aria-label="Back"
        >
          ‹ Back
        </button>
        <div className="text-center">
          <div className="text-lg font-black tabular-nums">{score}</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500">You</div>
        </div>
        <button
          onClick={onToggleFast}
          className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            fastMode
              ? 'border-amber-500 bg-amber-950/50 text-amber-300'
              : 'border-gray-700 text-gray-400'
          }`}
        >
          ⚡ Fast {fastMode ? 'On' : 'Off'}
        </button>
      </div>

      {/* Down & distance. */}
      <div
        className={`border-b px-4 py-2 text-center ${
          redZone ? 'border-red-800/50 bg-red-950/30' : 'border-green-800/40 bg-green-950/30'
        }`}
      >
        <div className="text-xl font-black text-amber-400">
          {downLabel} & {series.yardsToGo}
        </div>
        <div className="text-xs text-gray-400">
          Ball at {spot}
          {redZone && <span className="ml-2 font-bold text-red-400">RED ZONE</span>}
        </div>
      </div>

      {/* Field read: tells (gated by scout grade). */}
      <div className="flex flex-1 flex-col justify-center gap-4 px-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Read the D
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-gray-600">Scout</span>
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => onGrade(g)}
                className={`h-5 w-5 rounded text-[10px] font-bold ${
                  grade === g ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-500'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          {tells.length === 0 ? (
            <span className="text-xs italic text-gray-600">No read — you're guessing.</span>
          ) : (
            tells.map((t, i) => (
              <span
                key={i}
                className={`rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${t.accent}`}
              >
                {t.label}
              </span>
            ))
          )}
        </div>

        <BiteMeter bite={bite} hot={hot} />
      </div>

      {/* COMMIT rail — 4 intent verbs. */}
      <div className="border-t border-gray-800 bg-gray-900 p-3">
        <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-gray-600">
          Swipe up or tap to commit
        </div>
        <div className="flex gap-2">
          {VERB_ORDER.map((verb) => {
            const def = VERB_DEFS[verb];
            return (
              <VerbCard
                key={verb}
                def={def}
                biteStamp={def.isPass && hot}
                disabled={!canCommit}
                onCommit={() => onCommit(verb)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VerbLoop;
