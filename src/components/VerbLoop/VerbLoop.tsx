/**
 * VerbLoop — the rebuilt play-calling loop (§2), now both ways (§7).
 *
 * Drives the five beats — READ → COMMIT → REVEAL → RESOLVE → AFTERMATH — for
 * both player-offense and player-defense possessions on top of the Phase 1
 * engine (verb tiers, Bite meter), the Phase 3 Spotlight cards, and the Phase 4
 * mirror loop (defensive verbs, offensive tells, the ROBBER guess). Runs as a
 * self-contained sandbox mounted via the #verbloop dev route.
 *
 * Perspective rule of thumb: resolution is ALWAYS computed offense-relative via
 * resolveSnap(offenseVerb, defenseVerb, …); the UI just reframes it for whoever
 * the player is controlling. The Bite meter (shared cardGameStore) is loaded by
 * whichever offense is on the field.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardGameStore } from '../../stores/cardGameStore';
import { useGameStore } from '../../stores/gameStore';
import { SeededRNG } from '../../engine/playResolver';
import { resolveSnap, type TierResolution } from '../../engine/tierResolver';
import { chooseDefenseVerb } from '../../engine/aiDefenseVerb';
import { chooseOffenseVerb } from '../../engine/aiOffenseVerb';
import { selectConcretePlay } from '../../engine/verbPlaySelection';
import {
  VERB_DEFS,
  DEFENSE_VERB_DEFS,
  isBiteHot,
  applyVerbToBite as applyVerbToBiteValue,
  decayBite as decayBiteValue,
  type OffenseVerb,
  type DefenseVerb,
} from '../../data/verbs';
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
import { RevealFlip, type RevealStamp } from './RevealFlip';
import { ResolveField } from './ResolveField';
import { ResultSlam } from './ResultSlam';
import { TexPhone } from './TexPhone';
import { TexMenu } from './TexMenu';
import { TheCallSystem, type CallType } from '../../engine/theCallSystem';
import { VERDICT_STYLE, defenseTells, offenseTells, defenseVerdictStyle } from './copy';

type Beat = 'READ' | 'REVEAL' | 'RESOLVE' | 'AFTERMATH';
type Possession = 'OFFENSE' | 'DEFENSE';

const VERB_ORDER: OffenseVerb[] = ['HAMMER', 'DINK', 'AIR_IT_OUT', 'TRICK_EM'];
const DEFENSE_ORDER: DefenseVerb[] = ['SELL_OUT', 'BLITZ', 'LOCKDOWN', 'UMBRELLA', 'ROBBER'];
const GRADES: ScoutGrade[] = ['A', 'B', 'C', 'D'];
const SPOTLIGHTS_PER_DRIVE = 2;

interface Series {
  ballOn: number; // 0-100, current-offense perspective (drives toward 100)
  down: number;
  yardsToGo: number;
}

interface Snap {
  offenseVerb: OffenseVerb;
  defenseVerb: DefenseVerb;
  perspective: Possession;
  resolution: TierResolution;
  concretePlayName: string;
  spotlightName?: string;
  touchdown: boolean;
  firstDown: boolean;
  biteBefore: number;
  biteAfter: number;
  flavorRoll: number;
  // Pre-resolved reveal content.
  revealKicker: string;
  revealTitle: string;
  revealFlavor: string;
  revealTone: 'red' | 'emerald';
  stamp: RevealStamp;
  // Set once Tex gets involved (fix or caught).
  texFlag?: { label: string; note: string; line: string };
}

interface TexOffer {
  callType: CallType;
  label: string;
  description: string;
}

/** The single thing Tex can fix about the play that just happened, if any. */
function texOfferFor(snap: Snap): TexOffer | null {
  const r = snap.resolution;
  if (snap.perspective === 'OFFENSE') {
    if (r.turnover) {
      return {
        callType: 'turn-fumble-to-incomplete',
        label: 'Buy an incompletion',
        description: 'Wave off the turnover — have the refs rule it incomplete.',
      };
    }
    if (r.yards < 0) {
      return {
        callType: 'turn-sack-to-roughing',
        label: 'Buy a roughing call',
        description: 'Turn that sack into 15 yards and an automatic first down.',
      };
    }
    return null;
  }
  // Defense: rob the opponent of a score or a big gain.
  if (snap.touchdown) {
    return {
      callType: 'turn-td-to-holding',
      label: 'Buy a holding call',
      description: 'Wipe their touchdown — phantom offensive holding.',
    };
  }
  if (r.yards >= 13) {
    return {
      callType: 'turn-gain-to-penalty',
      label: 'Buy a penalty',
      description: 'Flag the big gain and bring it all the way back.',
    };
  }
  return null;
}

interface TexPatch {
  yards: number;
  turnover: boolean;
  touchdown: boolean;
  firstDown: boolean;
  note: string;
}

/** How a successful call rewrites the outcome. */
function texPatchFor(callType: CallType, snap: Snap): TexPatch {
  switch (callType) {
    case 'turn-fumble-to-incomplete':
      return { yards: 0, turnover: false, touchdown: false, firstDown: false, note: 'Refs wave off the turnover — ruled incomplete.' };
    case 'turn-sack-to-roughing':
      return { yards: 15, turnover: false, touchdown: false, firstDown: true, note: 'Roughing the passer! Fifteen and an automatic first down.' };
    case 'turn-td-to-holding':
      return { yards: -10, turnover: false, touchdown: false, firstDown: false, note: 'Holding on the offense — the touchdown comes off the board.' };
    case 'turn-gain-to-penalty':
      return { yards: -10, turnover: false, touchdown: false, firstDown: false, note: 'Flag down — block in the back erases the big gain.' };
    default:
      return {
        yards: snap.resolution.yards,
        turnover: snap.resolution.turnover,
        touchdown: snap.touchdown,
        firstDown: snap.firstDown,
        note: '',
      };
  }
}

interface SimResult {
  outcome: 'TD' | 'TAKEAWAY' | 'DOWNS' | 'PUNT';
  plays: number;
  netYards: number;
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
  const [possession, setPossession] = useState<Possession>('OFFENSE');
  const [series, setSeries] = useState<Series>(INITIAL_SERIES);
  const [score, setScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [grade, setGrade] = useState<ScoutGrade>('B');
  const [fastMode, setFastMode] = useState(false);
  const [simDefense, setSimDefense] = useState(false);

  // The AI's hidden call for the current READ (the one the player is reading).
  const [aiDefenseVerb, setAiDefenseVerb] = useState<DefenseVerb | null>(null);
  const [aiOffenseVerb, setAiOffenseVerb] = useState<OffenseVerb | null>(null);

  const [snap, setSnap] = useState<Snap | null>(null);

  // Spotlight state (offense only).
  const [spotlights, setSpotlights] = useState<SpotlightCard[]>([]);
  const [egoState, setEgoState] = useState<Record<string, SpotlightPlayerState>>({});
  const [usedSpotlightIds, setUsedSpotlightIds] = useState<Set<string>>(() => new Set());
  const [moment, setMoment] = useState<{ card: SpotlightCard; morale: number } | null>(null);
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  // Tex (dirty layer) + audibles.
  const callSysRef = useRef<TheCallSystem>(new TheCallSystem());
  const [slush, setSlush] = useState(75000);
  const [heat, setHeat] = useState(0);
  const [texMenuOpen, setTexMenuOpen] = useState(false);
  const [audiblesLeft, setAudiblesLeft] = useState(3);

  const stateFor = useCallback(
    (sourceId: string): SpotlightPlayerState => egoState[sourceId] ?? initialPlayerState(),
    [egoState],
  );

  // Fresh slate on mount: reset Bite and deal the first drive's Spotlights.
  useEffect(() => {
    resetBite();
    setSpotlights(generateSpotlights(sources, rngRef.current, SPOTLIGHTS_PER_DRIVE));
  }, [resetBite, sources]);

  // On each new READ, the AI locks in its (hidden) call.
  useEffect(() => {
    if (beat !== 'READ') return;
    if (possession === 'OFFENSE' && aiDefenseVerb === null) {
      setAiDefenseVerb(chooseDefenseVerb(biteMeter, rngRef.current));
    } else if (possession === 'DEFENSE' && aiOffenseVerb === null) {
      setAiOffenseVerb(
        chooseOffenseVerb(
          { down: series.down, yardsToGo: series.yardsToGo, ballOn: series.ballOn },
          rngRef.current,
        ),
      );
    }
  }, [beat, possession, aiDefenseVerb, aiOffenseVerb, biteMeter, series]);

  const redZone = series.ballOn >= 80;

  const runSnap = useCallback(
    (args: {
      offenseVerb: OffenseVerb;
      defenseVerb: DefenseVerb;
      perspective: Possession;
      spotlight?: SpotlightCard;
      robberGuess?: OffenseVerb;
    }) => {
      const { offenseVerb, defenseVerb, perspective, spotlight, robberGuess } = args;
      const rng = rngRef.current;
      const biteBefore = useCardGameStore.getState().biteMeter;

      let bonusTierShift = spotlight
        ? effectiveTierShift(spotlight, stateFor(spotlight.sourceId))
        : 0;

      // ROBBER greed: nailing the guess crushes the offense toward DISASTER;
      // whiffing tilts the tiers up against your defense (§7).
      let robberHit = false;
      if (perspective === 'DEFENSE' && defenseVerb === 'ROBBER') {
        robberHit = robberGuess === offenseVerb;
        bonusTierShift += robberHit ? -2 : 1;
      }

      const resolution = resolveSnap(
        offenseVerb,
        defenseVerb,
        { bite: biteBefore, redZone, ballCarrierRating: 82, bonusTierShift },
        rng,
      );
      const concretePlayName = selectConcretePlay(offenseVerb, biteBefore, rng).name;

      const touchdown = !resolution.turnover && series.ballOn + resolution.yards >= 100;
      const firstDown =
        !resolution.turnover && !touchdown && resolution.yards >= series.yardsToGo;

      // The offense on the field loads the Bite meter, then it decays a tick.
      applyVerbBite(offenseVerb);
      decayBite();
      const biteAfter = useCardGameStore.getState().biteMeter;

      if (spotlight) setUsedSpotlightIds((prev) => new Set(prev).add(spotlight.id));

      const reveal =
        perspective === 'OFFENSE'
          ? {
              kicker: 'Defense',
              title: DEFENSE_VERB_DEFS[defenseVerb].label,
              flavor: DEFENSE_VERB_DEFS[defenseVerb].flavor,
              tone: 'red' as const,
              stamp: VERDICT_STYLE[resolution.verdict],
            }
          : {
              kicker: 'Offense',
              title: VERB_DEFS[offenseVerb].label,
              flavor: VERB_DEFS[offenseVerb].flavor,
              tone: 'emerald' as const,
              stamp: defenseVerdictStyle(offenseVerb, defenseVerb, robberHit),
            };

      setSnap({
        offenseVerb,
        defenseVerb,
        perspective,
        resolution,
        concretePlayName,
        spotlightName: spotlight?.name,
        touchdown,
        firstDown,
        biteBefore,
        biteAfter,
        flavorRoll: rng.next(),
        revealKicker: reveal.kicker,
        revealTitle: reveal.title,
        revealFlavor: reveal.flavor,
        revealTone: reveal.tone,
        stamp: reveal.stamp,
      });
      setBeat('REVEAL');
    },
    [redZone, series, stateFor, applyVerbBite, decayBite],
  );

  /** Settle every ego at an offensive drive boundary; return any morale hit. */
  const settleDriveEgos = useCallback((): { card: SpotlightCard; morale: number } | null => {
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

  const beginOffense = useCallback(() => {
    callSysRef.current.onDriveEnd(); // Tex is available again next drive
    setPossession('OFFENSE');
    setSeries(INITIAL_SERIES);
    setAiDefenseVerb(null);
    setAiOffenseVerb(null);
    setSnap(null);
    setSpotlights(generateSpotlights(sources, rngRef.current, SPOTLIGHTS_PER_DRIVE));
    setUsedSpotlightIds(new Set());
    setBeat('READ');
  }, [sources]);

  /** Fast-forward an entire opponent drive when the player only wants to call O. */
  const simOpponentDrive = useCallback((): { result: SimResult; scored: boolean } => {
    const rng = rngRef.current;
    let s: Series = { ...INITIAL_SERIES };
    let bite = 0;
    let netYards = 0;
    let plays = 0;
    for (; plays < 24; ) {
      plays += 1;
      const ov = chooseOffenseVerb({ down: s.down, yardsToGo: s.yardsToGo, ballOn: s.ballOn }, rng);
      const dv = chooseDefenseVerb(bite, rng);
      const res = resolveSnap(ov, dv, { bite, redZone: s.ballOn >= 80, ballCarrierRating: 78 }, rng);
      bite = decayBiteValue(applyVerbToBiteValue(bite, ov));
      if (res.turnover) return finishSim('TAKEAWAY', plays, netYards, false);
      netYards += res.yards;
      const newBallOn = s.ballOn + res.yards;
      if (newBallOn >= 100) return finishSim('TD', plays, netYards, true);
      if (res.yards >= s.yardsToGo) {
        s = { ballOn: newBallOn, down: 1, yardsToGo: Math.min(10, 100 - newBallOn) };
      } else if (s.down >= 4) {
        return finishSim('DOWNS', plays, netYards, false);
      } else {
        s = { ballOn: newBallOn, down: s.down + 1, yardsToGo: Math.max(1, s.yardsToGo - res.yards) };
      }
    }
    return finishSim('PUNT', plays, netYards, false);
  }, []);

  const beginDefenseOrSim = useCallback(() => {
    callSysRef.current.onDriveEnd(); // Tex is available again next drive
    if (simDefense) {
      const { result, scored } = simOpponentDrive();
      if (scored) setOppScore((v) => v + 7);
      setSimResult(result);
      // Possession returns to the player after the summary is dismissed.
      return;
    }
    setPossession('DEFENSE');
    setSeries(INITIAL_SERIES);
    setAiDefenseVerb(null);
    setAiOffenseVerb(null);
    setSnap(null);
    setBeat('READ');
  }, [simDefense, simOpponentDrive]);

  const nextPlay = useCallback(() => {
    if (!snap) return;
    const { resolution, touchdown, firstDown } = snap;
    const driveEnded = resolution.turnover || touchdown || (!firstDown && series.down >= 4);

    if (!driveEnded) {
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
      setAiDefenseVerb(null);
      setAiOffenseVerb(null);
      setSnap(null);
      setBeat('READ');
      return;
    }

    // Drive over — score it and flip possession.
    if (possession === 'OFFENSE') {
      const hit = settleDriveEgos();
      if (touchdown) setScore((v) => v + 7);
      if (hit) setMoment(hit);
      beginDefenseOrSim();
    } else {
      if (touchdown) setOppScore((v) => v + 7);
      beginOffense();
    }
  }, [snap, series, possession, settleDriveEgos, beginDefenseOrSim, beginOffense]);

  const perspective = snap?.perspective ?? possession;

  // Burn an audible: force the defense to re-roll its (hidden) call — new tells.
  const onAudible = useCallback(() => {
    if (audiblesLeft <= 0 || beat !== 'READ' || possession !== 'OFFENSE') return;
    setAiDefenseVerb(chooseDefenseVerb(useCardGameStore.getState().biteMeter, rngRef.current));
    setAudiblesLeft((n) => n - 1);
  }, [audiblesLeft, beat, possession]);

  // Tex eligibility for the just-resolved play.
  const texOffer = beat === 'AFTERMATH' && snap && !snap.texFlag ? texOfferFor(snap) : null;
  const texCost = texOffer ? callSysRef.current.calculateCost(texOffer.callType) : 0;
  const texEligible = !!texOffer && callSysRef.current.isAvailable() && slush >= texCost;

  const callTex = useCallback(
    (offer: TexOffer) => {
      const sys = callSysRef.current;
      const res = sys.makeCall(offer.callType, slush);
      setHeat(sys.getHeatPercentage());
      if (res.cost > 0) setSlush((s) => Math.max(0, s - res.cost));
      setTexMenuOpen(false);
      if (!res.success && res.cost === 0) return; // refs wouldn't take it

      if (res.caught) {
        setSnap((prev) =>
          prev
            ? {
                ...prev,
                texFlag: {
                  label: 'CAUGHT! 🚨',
                  note: 'The league found the envelope. This is going to be a problem.',
                  line: res.texLine,
                },
              }
            : prev,
        );
        return;
      }

      setSnap((prev) => {
        if (!prev) return prev;
        const p = texPatchFor(offer.callType, prev);
        return {
          ...prev,
          resolution: { ...prev.resolution, yards: p.yards, turnover: p.turnover },
          touchdown: p.touchdown,
          firstDown: p.firstDown,
          texFlag: { label: 'THE FIX IS IN 🤝', note: p.note, line: res.texLine },
        };
      });
    },
    [slush],
  );

  return (
    <div className="relative mx-auto flex h-screen max-w-md flex-col bg-gray-950 text-white">
      {possession === 'OFFENSE' ? (
        <OffenseBoard
          series={series}
          score={score}
          oppScore={oppScore}
          grade={grade}
          onGrade={setGrade}
          fastMode={fastMode}
          onToggleFast={() => setFastMode((f) => !f)}
          simDefense={simDefense}
          onToggleSim={() => setSimDefense((s) => !s)}
          defenseVerb={aiDefenseVerb}
          bite={biteMeter}
          redZone={redZone}
          canCommit={beat === 'READ'}
          onCommit={(verb) => aiDefenseVerb && runSnap({ offenseVerb: verb, defenseVerb: aiDefenseVerb, perspective: 'OFFENSE' })}
          spotlights={spotlights}
          egoState={egoState}
          usedSpotlightIds={usedSpotlightIds}
          onCommitSpotlight={(card) =>
            aiDefenseVerb &&
            runSnap({ offenseVerb: card.verb, defenseVerb: aiDefenseVerb, perspective: 'OFFENSE', spotlight: card })
          }
          audiblesLeft={audiblesLeft}
          onAudible={onAudible}
          onBack={onBack}
        />
      ) : (
        <DefenseBoard
          series={series}
          score={score}
          oppScore={oppScore}
          grade={grade}
          onGrade={setGrade}
          fastMode={fastMode}
          onToggleFast={() => setFastMode((f) => !f)}
          simDefense={simDefense}
          onToggleSim={() => setSimDefense((s) => !s)}
          offenseVerb={aiOffenseVerb}
          bite={biteMeter}
          redZone={redZone}
          canCommit={beat === 'READ'}
          onCommit={(verb, guess) =>
            aiOffenseVerb &&
            runSnap({ offenseVerb: aiOffenseVerb, defenseVerb: verb, perspective: 'DEFENSE', robberGuess: guess })
          }
          onBack={onBack}
        />
      )}

      {beat === 'REVEAL' && snap && (
        <RevealFlip
          kicker={snap.revealKicker}
          title={snap.revealTitle}
          flavor={snap.revealFlavor}
          tone={snap.revealTone}
          stamp={snap.stamp}
          onDone={() => setBeat('RESOLVE')}
        />
      )}

      {beat === 'RESOLVE' && snap && (
        <ResolveField
          resolution={snap.resolution}
          startBallOn={series.ballOn}
          yardsToGo={series.yardsToGo}
          fastMode={fastMode}
          perspective={perspective}
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
          perspective={perspective}
          texFlag={snap.texFlag}
          onContinue={nextPlay}
        />
      )}

      {beat === 'AFTERMATH' && snap && (
        <TexPhone eligible={texEligible} onOpen={() => setTexMenuOpen(true)} />
      )}

      {texMenuOpen && texOffer && (
        <TexMenu
          option={{ label: texOffer.label, description: texOffer.description, cost: texCost }}
          slush={slush}
          heat={heat}
          onMakeCall={() => callTex(texOffer)}
          onClose={() => setTexMenuOpen(false)}
        />
      )}

      {simResult && (
        <SimSummary
          result={simResult}
          onDismiss={() => {
            setSimResult(null);
            beginOffense();
          }}
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

function finishSim(
  outcome: SimResult['outcome'],
  plays: number,
  netYards: number,
  scored: boolean,
): { result: SimResult; scored: boolean } {
  return { result: { outcome, plays, netYards }, scored };
}

// =============================================================================
// SHARED TOP BAR
// =============================================================================

interface TopBarProps {
  possession: Possession;
  score: number;
  oppScore: number;
  fastMode: boolean;
  onToggleFast: () => void;
  simDefense: boolean;
  onToggleSim: () => void;
  onBack?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  possession,
  score,
  oppScore,
  fastMode,
  onToggleFast,
  simDefense,
  onToggleSim,
  onBack,
}) => (
  <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-3 py-2">
    <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300" aria-label="Back">
      ‹
    </button>
    <div className="flex items-center gap-3">
      <div className="text-center">
        <div className="text-base font-black tabular-nums text-white">{score}</div>
        <div className="text-[9px] uppercase tracking-widest text-gray-500">You</div>
      </div>
      <span
        className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
          possession === 'OFFENSE' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
        }`}
      >
        {possession === 'OFFENSE' ? '🏈 Offense' : '🛡️ Defense'}
      </span>
      <div className="text-center">
        <div className="text-base font-black tabular-nums text-white">{oppScore}</div>
        <div className="text-[9px] uppercase tracking-widest text-gray-500">Opp</div>
      </div>
    </div>
    <div className="flex gap-1">
      <button
        onClick={onToggleSim}
        title="Sim opponent drives"
        className={`rounded border px-1.5 py-1 text-[9px] font-bold uppercase ${
          simDefense ? 'border-sky-500 bg-sky-950/50 text-sky-300' : 'border-gray-700 text-gray-500'
        }`}
      >
        Sim D
      </button>
      <button
        onClick={onToggleFast}
        className={`rounded border px-1.5 py-1 text-[9px] font-bold uppercase ${
          fastMode ? 'border-amber-500 bg-amber-950/50 text-amber-300' : 'border-gray-700 text-gray-500'
        }`}
      >
        ⚡{fastMode ? 'On' : 'Off'}
      </button>
    </div>
  </div>
);

const DownDistance: React.FC<{ series: Series; redZone: boolean }> = ({ series, redZone }) => {
  const spot = series.ballOn > 50 ? `OPP ${100 - series.ballOn}` : `OWN ${series.ballOn}`;
  const downLabel = ['1st', '2nd', '3rd', '4th'][Math.min(3, series.down - 1)];
  return (
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
  );
};

const ScoutRow: React.FC<{
  label: string;
  grade: ScoutGrade;
  onGrade: (g: ScoutGrade) => void;
}> = ({ label, grade, onGrade }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
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
);

const TellBox: React.FC<{ tells: { label: string; accent: string }[] }> = ({ tells }) => (
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
);

// =============================================================================
// OFFENSE READ / COMMIT board
// =============================================================================

interface OffenseBoardProps {
  series: Series;
  score: number;
  oppScore: number;
  grade: ScoutGrade;
  onGrade: (g: ScoutGrade) => void;
  fastMode: boolean;
  onToggleFast: () => void;
  simDefense: boolean;
  onToggleSim: () => void;
  defenseVerb: DefenseVerb | null;
  bite: number;
  redZone: boolean;
  canCommit: boolean;
  onCommit: (verb: OffenseVerb) => void;
  spotlights: SpotlightCard[];
  egoState: Record<string, SpotlightPlayerState>;
  usedSpotlightIds: Set<string>;
  onCommitSpotlight: (card: SpotlightCard) => void;
  audiblesLeft: number;
  onAudible: () => void;
  onBack?: () => void;
}

const OffenseBoard: React.FC<OffenseBoardProps> = (props) => {
  const { series, grade, onGrade, defenseVerb, bite, redZone, canCommit, onCommit } = props;
  const hot = isBiteHot(bite);
  const tells = useMemo(
    () => (defenseVerb ? defenseTells(defenseVerb, grade) : []),
    [defenseVerb, grade],
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar
        possession="OFFENSE"
        score={props.score}
        oppScore={props.oppScore}
        fastMode={props.fastMode}
        onToggleFast={props.onToggleFast}
        simDefense={props.simDefense}
        onToggleSim={props.onToggleSim}
        onBack={props.onBack}
      />
      <DownDistance series={series} redZone={redZone} />

      <div className="flex flex-1 flex-col justify-center gap-4 px-4">
        <ScoutRow label="Read the D" grade={grade} onGrade={onGrade} />
        <TellBox tells={tells} />
        <BiteMeter bite={bite} hot={hot} />
        <button
          type="button"
          disabled={!canCommit || props.audiblesLeft <= 0}
          onClick={props.onAudible}
          className={`self-start rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ${
            canCommit && props.audiblesLeft > 0
              ? 'border-sky-500 bg-sky-950/40 text-sky-300 hover:bg-sky-900/50'
              : 'border-gray-800 text-gray-600'
          }`}
        >
          📻 Audible ({props.audiblesLeft}) — re-roll their call
        </button>
      </div>

      {props.spotlights.length > 0 && (
        <div className="border-t border-gray-800 bg-gray-900 px-3 pt-2">
          <div className="mb-1 text-center text-[9px] uppercase tracking-widest text-gray-600">
            ⭐ Spotlight — feed the ego
          </div>
          <div className="flex gap-2">
            {props.spotlights.map((card) => (
              <SpotlightCardView
                key={card.id}
                card={card}
                playerState={props.egoState[card.sourceId] ?? initialPlayerState()}
                used={props.usedSpotlightIds.has(card.id)}
                disabled={!canCommit}
                onCommit={() => props.onCommitSpotlight(card)}
              />
            ))}
          </div>
        </div>
      )}

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

// =============================================================================
// DEFENSE READ / COMMIT board (§7)
// =============================================================================

interface DefenseBoardProps {
  series: Series;
  score: number;
  oppScore: number;
  grade: ScoutGrade;
  onGrade: (g: ScoutGrade) => void;
  fastMode: boolean;
  onToggleFast: () => void;
  simDefense: boolean;
  onToggleSim: () => void;
  offenseVerb: OffenseVerb | null;
  bite: number;
  redZone: boolean;
  canCommit: boolean;
  onCommit: (verb: DefenseVerb, robberGuess?: OffenseVerb) => void;
  onBack?: () => void;
}

const DefenseBoard: React.FC<DefenseBoardProps> = (props) => {
  const { series, grade, onGrade, offenseVerb, bite, redZone, canCommit, onCommit } = props;
  const hot = isBiteHot(bite);
  const [robberArmed, setRobberArmed] = useState(false);
  const tells = useMemo(
    () => (offenseVerb ? offenseTells(offenseVerb, grade) : []),
    [offenseVerb, grade],
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar
        possession="DEFENSE"
        score={props.score}
        oppScore={props.oppScore}
        fastMode={props.fastMode}
        onToggleFast={props.onToggleFast}
        simDefense={props.simDefense}
        onToggleSim={props.onToggleSim}
        onBack={props.onBack}
      />
      <DownDistance series={series} redZone={redZone} />

      <div className="flex flex-1 flex-col justify-center gap-4 px-4">
        <ScoutRow label="Read the O" grade={grade} onGrade={onGrade} />
        <TellBox tells={tells} />
        <BiteMeter bite={bite} hot={hot} />
      </div>

      {/* Defensive verb rail. ROBBER opens a guess sub-picker. */}
      <div className="border-t border-gray-800 bg-gray-900 p-3">
        {robberArmed ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                🎯 Robber — name their call
              </span>
              <button
                onClick={() => setRobberArmed(false)}
                className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300"
              >
                cancel
              </button>
            </div>
            <div className="flex gap-2">
              {VERB_ORDER.map((verb) => (
                <button
                  key={verb}
                  type="button"
                  disabled={!canCommit}
                  onClick={() => {
                    setRobberArmed(false);
                    onCommit('ROBBER', verb);
                  }}
                  className="flex-1 rounded-lg border-2 border-amber-500/60 bg-amber-950/30 p-2 text-xs font-black uppercase tracking-wide text-white hover:border-amber-400 disabled:opacity-40"
                >
                  {VERB_DEFS[verb].label}
                </button>
              ))}
            </div>
            <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-gray-600">
              Right = jackpot · Wrong = you get shredded
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-gray-600">
              Call the defense
            </div>
            <div className="flex gap-2">
              {DEFENSE_ORDER.map((verb) => {
                const def = DEFENSE_VERB_DEFS[verb];
                const isRobber = verb === 'ROBBER';
                return (
                  <button
                    key={verb}
                    type="button"
                    disabled={!canCommit}
                    onClick={() => (isRobber ? setRobberArmed(true) : onCommit(verb))}
                    className={`flex-1 min-w-0 rounded-lg border-2 p-2 text-left disabled:opacity-40 ${
                      isRobber
                        ? 'border-amber-500/60 bg-amber-950/30 hover:border-amber-400'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-[11px] font-black uppercase leading-tight text-white">
                      {def.label}
                    </div>
                    <div className="mt-0.5 text-[9px] leading-tight text-gray-500 line-clamp-2">
                      {isRobber ? 'Guess their call.' : def.flavor}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SIM SUMMARY (opponent drive fast-forward)
// =============================================================================

const SimSummary: React.FC<{ result: SimResult; onDismiss: () => void }> = ({
  result,
  onDismiss,
}) => {
  const label: Record<SimResult['outcome'], { text: string; accent: string }> = {
    TD: { text: 'OPPONENT SCORED', accent: 'text-red-400' },
    TAKEAWAY: { text: 'YOUR D GOT A TAKEAWAY', accent: 'text-emerald-400' },
    DOWNS: { text: 'STOPPED ON DOWNS', accent: 'text-emerald-400' },
    PUNT: { text: 'FORCED A PUNT', accent: 'text-sky-400' },
  };
  const l = label[result.outcome];
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 px-8"
      aria-label="Continue"
    >
      <div className="text-[10px] uppercase tracking-widest text-gray-500">Opponent drive (simmed)</div>
      <div className={`text-2xl font-black uppercase tracking-wide ${l.accent}`}>{l.text}</div>
      <div className="text-sm text-gray-400">
        {result.plays} plays · {result.netYards >= 0 ? '+' : ''}
        {result.netYards} net yards
      </div>
      <div className="text-[10px] uppercase tracking-widest text-gray-600">Tap to get the ball back</div>
    </button>
  );
};

export default VerbLoop;
