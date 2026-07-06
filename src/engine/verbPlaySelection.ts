/**
 * VERB → CONCRETE PLAY SELECTION.
 * See docs/GAMEPLAY_LOOP_DESIGN.md §3.1.
 *
 * The player picks an intent VERB; the sim renders a real football play
 * underneath. This is how "draw", "counter", "play-action" survive — as
 * emergent flavor inside a verb rather than menu items. Bite state nudges which
 * concrete play fires: a draw is more likely when the defense is NOT expecting
 * run (low Bite), a downhill power run when they are (high Bite).
 *
 * Keyed off the real DEFAULT_PLAYS ids/tags (the older playApproach.ts id map
 * predates the current play ids and no longer matches them), so the pools here
 * are the source of truth for the loop.
 */

import { DEFAULT_PLAYS } from '../data/defaultPlays';
import type { Play } from '../types/Play';
import type { OffenseVerb } from '../data/verbs';
import { isBiteHot } from '../data/verbs';
import type { Rng } from './tierResolver';

/** A candidate play plus a weighting hook for Bite-sensitive selection. */
interface WeightedPlay {
  id: string;
  /** Base draw weight before Bite adjustment. */
  weight: number;
  /**
   * True for plays that specifically beat a pass-expecting defense (draw,
   * screen). These get boosted at low Bite and suppressed at high Bite.
   */
  beatsPassLook?: boolean;
}

/** Which concrete plays each verb can render, with base weights. */
const VERB_POOLS: Record<OffenseVerb, WeightedPlay[]> = {
  HAMMER: [
    { id: 'default-hb-dive', weight: 3 },
    { id: 'default-power', weight: 3 },
    { id: 'default-hb-sweep', weight: 2 },
    { id: 'default-draw', weight: 2, beatsPassLook: true },
  ],
  DINK: [
    { id: 'default-quick-out', weight: 3 },
    { id: 'default-slants', weight: 3 },
    { id: 'default-curl-flat', weight: 2 },
    { id: 'default-hb-screen', weight: 2, beatsPassLook: true },
  ],
  AIR_IT_OUT: [
    { id: 'default-four-verts', weight: 3 },
    { id: 'default-post-corner', weight: 3 },
    { id: 'default-mesh', weight: 1 },
  ],
  // No dedicated trick plays exist yet — stand in with the most deceptive
  // concepts (delayed handoff, perimeter misdirection, screen action) until a
  // real trick-play pool lands.
  TRICK_EM: [
    { id: 'default-draw', weight: 2, beatsPassLook: true },
    { id: 'default-hb-sweep', weight: 2 },
    { id: 'default-hb-screen', weight: 2, beatsPassLook: true },
    { id: 'default-post-corner', weight: 1 },
  ],
};

const PLAYS_BY_ID: Record<string, Play> = Object.fromEntries(
  DEFAULT_PLAYS.map((p) => [p.id, p]),
);

/**
 * How strongly Bite state pushes toward/away from "beats a pass look" plays.
 * At hot Bite the defense expects run, so draws/screens are less deceptive.
 */
const PASS_LOOK_HOT_FACTOR = 0.4;
const PASS_LOOK_COLD_FACTOR = 2.0;

/**
 * Pick a concrete play for a verb, weighted by the current Bite meter.
 * Deterministic for a given `rng` sequence.
 */
export function selectConcretePlay(verb: OffenseVerb, bite: number, rng: Rng): Play {
  const pool = VERB_POOLS[verb];
  const hot = isBiteHot(bite);

  const weighted = pool.map((entry) => {
    let weight = entry.weight;
    if (entry.beatsPassLook) {
      weight *= hot ? PASS_LOOK_HOT_FACTOR : PASS_LOOK_COLD_FACTOR;
    }
    return { play: resolvePlay(entry.id), weight };
  });

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng.next() * total;
  for (const { play, weight } of weighted) {
    roll -= weight;
    if (roll < 0) return play;
  }
  return weighted[weighted.length - 1].play;
}

/** The full set of concrete plays a verb can render (for previews/tests). */
export function playsForVerb(verb: OffenseVerb): Play[] {
  return VERB_POOLS[verb].map((entry) => resolvePlay(entry.id));
}

function resolvePlay(id: string): Play {
  const play = PLAYS_BY_ID[id];
  if (!play) {
    throw new Error(`verbPlaySelection: unknown play id "${id}" — check DEFAULT_PLAYS`);
  }
  return play;
}
