/**
 * VerbLoop — the rebuilt play-calling loop (§2).
 *
 * Drives the five beats — READ → COMMIT → REVEAL → RESOLVE → AFTERMATH — on top
 * of the Phase 1 engine (verb tiers, Bite meter, verb→play selection) and the
 * Phase 3 Spotlight cards (roster egos in the rail, with use/neglect/morale
 * hooks). Runs as a self-contained, offense-only sandbox so the whole loop is
 * playable in isolation (mounted via the #verbloop dev route).
 *
 * The Bite meter reads/writes the shared cardGameStore, exercising the Phase 1
 * store wiring end to end. Spotlight sources come from the real drafted roster
 * when one exists, otherwise a colorful demo cast.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardGameStore } from '../../stores/cardGameStore';
import { useGameStore } from '../../stores/gameStore';
import { SeededRNG } from '../../engine/playResolver';
import { resolveSnap, type TierResolution } from '../../engine/tierResolver';
import { chooseDefenseVerb } from '../../engine/aiDefenseVerb';
import { selectConcretePlay } from '../../engine/verbPlaySelection';
import { VERB_DEFS, isBiteHot, type OffenseVerb, type DefenseVerb } from '../../data/verbs';
import type { ScoutGrade } from '../../engine/tells';
import {
  generateSpotlights,
  spotlightSourcesFromRoster,
  registerUse,
  registerNeglect,
  effectiveTierShift,
  initialPlayerState,
  DEMO_SPOTLIGHT_SOURCES,
  type SpotlightCard,
  type SpotlightSource,
  type SpotlightPlayerState,
} from '../../engine/spotlightGenerator';
import { BiteMeter } from './BiteMeter';
import { VerbCard } from './VerbCard';
import { SpotlightCardView } from './SpotlightCard';
import { SpotlightMoment } from './SpotlightMoment';
import { RevealFlip } from './RevealFlip';
import { ResolveField } from './ResolveField';
import { ResultSlam } from './ResultSlam';
import { defenseTells } from './copy';

type Beat = 'READ' | 'REVEAL' | 'RESOLVE' | 'AFTERMATH';

const VERB_ORDER: OffenseVerb[] = ['HAMMER', 'DINK', 'AIR_IT_OUT', 'TRICK_EM'];
const GRADES: ScoutGrade[] = ['A', 'B', 'C', 'D'];
const SPOTLIGHTS_PER_DRIVE = 2;

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
  spotlightName?: string;
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
  const draftedRoster = useGameStore((s) => s.draftedRoster);

  const sources = useMemo<SpotlightSource[]>(
    () => (draftedRoster ? spotlightSourcesFromRoster(draftedRoster) : DEMO_SPOTLIGHT_SOURCES),
    [draftedRoster],
  );

  const rngRef = useRef<SeededRNG>(new SeededRNG(0xc0ffee));

  const [beat, setBeat] = useState<Beat>('READ');
  const [series, setSeries] = useState<Series>(INITIAL_SERIES);
  const [score, setScore] = useState(0);
  const [grade, setGrade] = useState<ScoutGrade>('B');
  const [fastMode, setFastMode] = useState(false);
  const [defenseVerb, setDefenseVerb] = useState<DefenseVerb | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);

  // Spotlight state.
  const [spotlights, setSpotlights] = useState<SpotlightCard[]>([]);
  const [egoState, setEgoState] = useState<Record<string, SpotlightPlayerState>>({});
  const [usedSpotlightIds, setUsedSpotlightIds] = useState<Set<string>>(() => new Set());
  const [moment, setMoment] = useState<{ card: SpotlightCard; morale: number } | null>(null);

  const stateFor = useCallback(
    (sourceId: string): SpotlightPlayerState => egoState[sourceId] ?? initialPlayerState(),
    [egoState],
  );

  // Fresh slate on mount: reset Bite and deal the first drive's Spotlights.
  useEffect(() => {
    resetBite();
    setSpotlights(generateSpotlights(sources, rngRef.current, SPOTLIGHTS_PER_DRIVE));
  }, [resetBite, sources]);

  // On each new READ, the defense picks its (hidden) call, reading the Bite meter.
  useEffect(() => {
    if (beat === 'READ' && defenseVerb === null) {
      setDefenseVerb(chooseDefenseVerb(biteMeter, rngRef.current));
    }
  }, [beat, defenseVerb, biteMeter]);

  const redZone = series.ballOn >= 80;

  const commit = useCallback(
    (verb: OffenseVerb, spotlight?: SpotlightCard) => {
      if (defenseVerb === null) return;
      const rng = rngRef.current;
      const biteBefore = useCardGameStore.getState().biteMeter;

      const bonusTierShift = spotlight
        ? effectiveTierShift(spotlight, stateFor(spotlight.sourceId))
        : 0;

      const resolution = resolveSnap(
        verb,
        defenseVerb,
        { bite: biteBefore, redZone, ballCarrierRating: 82, bonusTierShift },
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

      if (spotlight) {
        setUsedSpotlightIds((prev) => new Set(prev).add(spotlight.id));
      }

      setSnap({
        verb,
        defenseVerb,
        resolution,
        concretePlayName,
        spotlightName: spotlight?.name,
        touchdown,
        firstDown,
        biteBefore,
        biteAfter,
        flavorRoll: rng.next(),
      });
      setBeat('REVEAL');
    },
    [defenseVerb, redZone, series, applyVerbBite, decayBite, stateFor],
  );

  /** Settle every ego at a drive boundary: feed vs. neglect, return a morale hit. */
  const settleDriveEgos = useCallback((): { card: SpotlightCard; morale: number } | null => {
    // Compute synchronously from current state (a setState updater would run too
    // late to report the morale hit back to the caller this tick).
    const next = { ...egoState };
    let hit: { card: SpotlightCard; morale: number } | null = null;
    for (const card of spotlights) {
      const cur = next[card.sourceId] ?? initialPlayerState();
      if (usedSpotlightIds.has(card.id)) {
        next[card.sourceId] = registerUse(cur);
      } else {
        const res = registerNeglect(cur, card);
        next[card.sourceId] = res.state;
        if (res.moraleHit && !hit) hit = { card, morale: res.state.morale };
      }
    }
    setEgoState(next);
    return hit;
  }, [egoState, spotlights, usedSpotlightIds]);

  const nextPlay = useCallback(() => {
    if (!snap) return;
    const { resolution, touchdown, firstDown } = snap;
    const driveEnded =
      resolution.turnover || touchdown || (!firstDown && series.down >= 4);

    if (driveEnded) {
      const hit = settleDriveEgos();
      if (touchdown) setScore((s) => s + 7);
      setSeries(INITIAL_SERIES);
      setSpotlights(generateSpotlights(sources, rngRef.current, SPOTLIGHTS_PER_DRIVE));
      setUsedSpotlightIds(new Set());
      if (hit) setMoment(hit);
    } else {
      const newBallOn = Math.min(99, series.ballOn + resolution.yards);
      if (firstDown) {
        setSeries({ ballOn: newBallOn, down: 1, yardsToGo: Math.min(10, 100 - newBallOn) });
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
  }, [snap, series, settleDriveEgos, sources]);

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
        onCommit={(verb) => commit(verb)}
        spotlights={spotlights}
        egoState={egoState}
        usedSpotlightIds={usedSpotlightIds}
        onCommitSpotlight={(card) => commit(card.verb, card)}
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
          spotlightName={snap.spotlightName}
          onContinue={nextPlay}
        />
      )}

      {moment && (
        <SpotlightMoment
          card={moment.card}
          morale={moment.morale}
          onDismiss={() => setMoment(null)}
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
  spotlights: SpotlightCard[];
  egoState: Record<string, SpotlightPlayerState>;
  usedSpotlightIds: Set<string>;
  onCommitSpotlight: (card: SpotlightCard) => void;
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
  spotlights,
  egoState,
  usedSpotlightIds,
  onCommitSpotlight,
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

      {/* Spotlight rail — 1-2 rotating ego cards. */}
      {spotlights.length > 0 && (
        <div className="border-t border-gray-800 bg-gray-900 px-3 pt-2">
          <div className="mb-1 text-center text-[9px] uppercase tracking-widest text-gray-600">
            ⭐ Spotlight — feed the ego
          </div>
          <div className="flex gap-2">
            {spotlights.map((card) => (
              <SpotlightCardView
                key={card.id}
                card={card}
                playerState={egoState[card.sourceId] ?? initialPlayerState()}
                used={usedSpotlightIds.has(card.id)}
                disabled={!canCommit}
                onCommit={() => onCommitSpotlight(card)}
              />
            ))}
          </div>
        </div>
      )}

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
