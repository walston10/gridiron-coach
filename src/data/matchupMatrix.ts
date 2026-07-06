/**
 * MATCHUP MATRIX — the tunable heart of the two-stage resolver.
 * See docs/GAMEPLAY_LOOP_DESIGN.md §4.
 *
 * Stage 1 of resolution picks an OUTCOME TIER from a weight table keyed by
 * (offense verb × defense verb). Stage 2 rolls yards inside that tier's band.
 * Modifiers (Bite, ratings, momentum, dirty) shift these TIER WEIGHTS — never
 * raw yards — which is what keeps randomness legible: "beat their call, jump a
 * tier."
 *
 * Everything here is DATA so it can be tuned without touching engine code
 * (tierResolver.ts). Every weight row sums to 100 (asserted in tests).
 *
 * Pattern used to fill the matrix (per the design doc):
 *   - Winning the matchup shifts ~2 tiers of weight upward.
 *   - Losing shifts ~1-2 tiers down.
 *   - ROBBER is high-variance both ways (fat DISASTER and fat upside).
 *   - AIR IT OUT is bimodal: heavy BUST (incompletion/sack) OR big.
 */

import type { OffenseVerb, DefenseVerb } from './verbs';

/** Outcome tiers, worst → best. Order matters: index drives tier shifting. */
export type OutcomeTier =
  | 'DISASTER'
  | 'BUST'
  | 'STUFF'
  | 'MODEST'
  | 'SOLID'
  | 'BIG'
  | 'HUGE';

/** Canonical low→high ordering used everywhere tiers are shifted or compared. */
export const TIER_ORDER: readonly OutcomeTier[] = [
  'DISASTER',
  'BUST',
  'STUFF',
  'MODEST',
  'SOLID',
  'BIG',
  'HUGE',
];

/** A distribution over tiers. Conventionally sums to 100 but any positive
 *  weights are valid — the resolver normalizes before sampling. */
export type TierWeights = Record<OutcomeTier, number>;

/**
 * Yardage band + sampling mode for each tier (§4.1). `mode` is the peak of a
 * triangular distribution within [min, max]; most tiers peak low, but BUST
 * peaks high (toward 0) because incompletions dominate over big losses.
 * DISASTER is a turnover — its "yards" are possible return yards only.
 */
export interface TierBand {
  readonly min: number;
  readonly max: number;
  readonly mode: number;
  readonly turnover: boolean;
}

export const TIER_BANDS: Record<OutcomeTier, TierBand> = {
  DISASTER: { min: 0, max: 5, mode: 0, turnover: true },
  BUST: { min: -8, max: 0, mode: 0, turnover: false },
  STUFF: { min: 0, max: 2, mode: 1, turnover: false },
  MODEST: { min: 3, max: 6, mode: 4, turnover: false },
  SOLID: { min: 7, max: 12, mode: 8, turnover: false },
  BIG: { min: 13, max: 25, mode: 16, turnover: false },
  HUGE: { min: 26, max: 55, mode: 32, turnover: false },
};

/** Tiers that hand the animation a live breakaway sequence (§4.4). */
export const BREAKAWAY_TIERS: ReadonlySet<OutcomeTier> = new Set<OutcomeTier>([
  'BIG',
  'HUGE',
]);

/**
 * Who wins the pre-snap read for a pairing. Drives the REVEAL verdict stamp
 * (§2, beat 3). The special "THEY BIT ON THE FAKE 🔥" verdict is computed at
 * resolve time (pass verb + hot Bite vs a run-committed defense) and is not
 * stored here.
 */
export type MatchupOutcome = 'WIN' | 'LOSE' | 'EVEN';

/** The verdict stamp shown at the reveal. */
export type MatchupVerdict =
  | 'YOU_BEAT_THE_CALL'
  | 'THEY_READ_YOU'
  | 'DEAD_EVEN'
  | 'THEY_BIT';

export const VERDICT_FOR_OUTCOME: Record<MatchupOutcome, MatchupVerdict> = {
  WIN: 'YOU_BEAT_THE_CALL',
  LOSE: 'THEY_READ_YOU',
  EVEN: 'DEAD_EVEN',
};

/**
 * Base tier weights for every (offense × defense) pairing. Each row sums to
 * 100. The AIR IT OUT vs SELL OUT row is the *base* (no Bite); the Bite bonus
 * is applied by the resolver and pushes it toward the doc's 🔥 example row.
 */
export const MATCHUP_MATRIX: Record<OffenseVerb, Record<DefenseVerb, TierWeights>> = {
  HAMMER: {
    //                          DIS BUST STUF MOD  SOL BIG HUGE
    SELL_OUT: w(3, 12, 45, 30, 8, 2, 0), // they read you: stacked box
    BLITZ: w(2, 10, 38, 33, 12, 4, 1), // extra men in the gaps
    LOCKDOWN: w(1, 3, 15, 33, 30, 14, 4), // man = light box, run lanes open
    UMBRELLA: w(1, 2, 8, 30, 35, 18, 6), // you beat the call: empty box
    ROBBER: w(4, 10, 25, 28, 20, 9, 4), // gamble — good unless they guessed run
  },
  DINK: {
    SELL_OUT: w(2, 8, 10, 30, 34, 13, 3), // they sold out on run, quick game open
    BLITZ: w(3, 15, 5, 25, 35, 14, 3), // hot read beats the pressure
    LOCKDOWN: w(4, 22, 18, 30, 18, 6, 2), // man blankets the quick stuff
    UMBRELLA: w(2, 10, 15, 40, 25, 7, 1), // reliable but capped underneath
    ROBBER: w(5, 15, 15, 30, 22, 10, 3), // coin-flip gamble
  },
  AIR_IT_OUT: {
    SELL_OUT: w(6, 25, 0, 5, 19, 30, 15), // base shot vs run commit (Bite adds more)
    BLITZ: w(10, 38, 0, 4, 13, 22, 13), // beat it and you're gone, else sack/INT
    LOCKDOWN: w(9, 45, 0, 5, 22, 14, 5), // press man contests everything
    UMBRELLA: w(10, 55, 0, 5, 20, 8, 2), // they read you: deep zone eats it
    ROBBER: w(12, 40, 0, 5, 15, 18, 10), // high variance both ways
  },
  TRICK_EM: {
    SELL_OUT: w(8, 18, 5, 12, 22, 20, 15), // aggression overcommits, gash
    BLITZ: w(7, 16, 5, 12, 22, 22, 16), // blitz bites, reverse springs
    LOCKDOWN: w(18, 32, 12, 14, 12, 8, 4), // disciplined coverage sniffs it
    UMBRELLA: w(16, 30, 13, 14, 13, 9, 5), // patient zone stays home
    ROBBER: w(25, 40, 15, 10, 5, 3, 2), // disaster: they guessed the gimmick
  },
};

/** Who wins the read, per pairing — drives the reveal verdict stamp. */
export const MATCHUP_OUTCOME: Record<OffenseVerb, Record<DefenseVerb, MatchupOutcome>> = {
  HAMMER: {
    SELL_OUT: 'LOSE',
    BLITZ: 'LOSE',
    LOCKDOWN: 'WIN',
    UMBRELLA: 'WIN',
    ROBBER: 'EVEN',
  },
  DINK: {
    SELL_OUT: 'WIN',
    BLITZ: 'WIN',
    LOCKDOWN: 'LOSE',
    UMBRELLA: 'EVEN',
    ROBBER: 'EVEN',
  },
  AIR_IT_OUT: {
    SELL_OUT: 'WIN',
    BLITZ: 'EVEN',
    LOCKDOWN: 'LOSE',
    UMBRELLA: 'LOSE',
    ROBBER: 'EVEN',
  },
  TRICK_EM: {
    SELL_OUT: 'WIN',
    BLITZ: 'WIN',
    LOCKDOWN: 'LOSE',
    UMBRELLA: 'EVEN',
    ROBBER: 'LOSE',
  },
};

/** Build a TierWeights row from positional args in TIER_ORDER. */
function w(
  disaster: number,
  bust: number,
  stuff: number,
  modest: number,
  solid: number,
  big: number,
  huge: number,
): TierWeights {
  return {
    DISASTER: disaster,
    BUST: bust,
    STUFF: stuff,
    MODEST: modest,
    SOLID: solid,
    BIG: big,
    HUGE: huge,
  };
}
