/**
 * AI DEFENSE-VERB CALLER for the rebuilt loop.
 * See docs/GAMEPLAY_LOOP_DESIGN.md §5 and §7.
 *
 * The defense reads the Bite meter too: the harder the offense has been
 * hammering the run, the more the AI sells out against it — which is exactly
 * what makes the play-action payoff real. Pure and RNG-injected so it's
 * deterministic and unit-testable.
 */

import type { DefenseVerb } from '../data/verbs';
import { BITE_CONFIG } from '../data/verbs';
import type { Rng } from './tierResolver';

const DEFENSE_VERBS: readonly DefenseVerb[] = [
  'SELL_OUT',
  'BLITZ',
  'LOCKDOWN',
  'UMBRELLA',
  'ROBBER',
];

/** Pick a defensive verb, tilting toward SELL OUT as the Bite meter climbs. */
export function chooseDefenseVerb(bite: number, rng: Rng): DefenseVerb {
  const biteFrac = clamp01(bite / BITE_CONFIG.MAX);

  const weights: Record<DefenseVerb, number> = {
    SELL_OUT: 2 + biteFrac * 6, // up to +6 at full bite — they crash the run
    BLITZ: 2 + biteFrac * 2,
    LOCKDOWN: 2,
    UMBRELLA: 2 * (1 - biteFrac * 0.5), // less deep help when they smell run
    ROBBER: 1, // the gamble stays rare
  };

  const total = DEFENSE_VERBS.reduce((sum, v) => sum + weights[v], 0);
  let roll = rng.next() * total;
  for (const v of DEFENSE_VERBS) {
    roll -= weights[v];
    if (roll < 0) return v;
  }
  return 'LOCKDOWN';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
