/**
 * AI OFFENSE-VERB CALLER for player-defense possessions.
 * See docs/GAMEPLAY_LOOP_DESIGN.md §7 (mirror loop).
 *
 * When the player is on defense, the AI offense picks an intent verb from the
 * situation: pound the run in short yardage, air it out when it's long. Pure
 * and RNG-injected so it's deterministic and testable, mirroring
 * aiDefenseVerb.ts.
 */

import type { OffenseVerb } from '../data/verbs';
import type { Rng } from './tierResolver';

export interface OffenseSituation {
  down: number;
  yardsToGo: number;
  /** Ball spot 0-100 from the offense's own goal (for red-zone tightening). */
  ballOn: number;
}

const OFFENSE_VERBS: readonly OffenseVerb[] = ['HAMMER', 'DINK', 'AIR_IT_OUT', 'TRICK_EM'];

/** Pick an offensive verb for the AI, tilted by down & distance. */
export function chooseOffenseVerb(sit: OffenseSituation, rng: Rng): OffenseVerb {
  const w: Record<OffenseVerb, number> = {
    HAMMER: 2,
    DINK: 2.5,
    AIR_IT_OUT: 1.5,
    TRICK_EM: 0.5,
  };

  const short = sit.yardsToGo <= 3;
  const long = sit.yardsToGo >= 8;

  if (short) {
    w.HAMMER += 3;
    w.DINK += 1;
    w.AIR_IT_OUT -= 0.75;
  }
  if (long) {
    w.AIR_IT_OUT += 2;
    w.DINK += 1;
    w.HAMMER -= 1;
  }
  if (sit.down >= 3 && long) w.AIR_IT_OUT += 1.5; // must-throw down
  if (sit.ballOn >= 80) w.AIR_IT_OUT -= 0.5; // less deep near the goal line

  const total = OFFENSE_VERBS.reduce((sum, v) => sum + Math.max(0, w[v]), 0);
  let roll = rng.next() * total;
  for (const v of OFFENSE_VERBS) {
    roll -= Math.max(0, w[v]);
    if (roll < 0) return v;
  }
  return 'DINK';
}
