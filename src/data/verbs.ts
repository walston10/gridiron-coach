/**
 * VERBS — the player-facing offense (and mirrored defense) for the rebuilt
 * gameplay loop. See docs/GAMEPLAY_LOOP_DESIGN.md §3.1 and §5.
 *
 * The player chooses an *intent verb*, never a concrete football play. The
 * simulation renders a real play underneath (see verbPlaySelection.ts). Cards
 * show a yardage band + risk pips + flavor — never stat blocks.
 *
 * This file is the tunable source of truth for verb identity: labels, flavor,
 * the yardage band the card bar renders, risk pips, and each verb's effect on
 * the Bite meter. It deliberately holds NO resolution math — matchup tier
 * weights live in matchupMatrix.ts.
 */

/** The four intent verbs. Always in hand, never rotate out. */
export type OffenseVerb = 'HAMMER' | 'DINK' | 'AIR_IT_OUT' | 'TRICK_EM';

/** The five mirrored defensive verbs. */
export type DefenseVerb = 'SELL_OUT' | 'BLITZ' | 'LOCKDOWN' | 'UMBRELLA' | 'ROBBER';

/**
 * How a verb moves the Bite meter.
 * - `delta` adds to the current meter (clamped 0-100).
 * - `set` overrides the meter (TRICK 'EM resets to 0).
 */
export type BiteEffect =
  | { readonly kind: 'delta'; readonly value: number }
  | { readonly kind: 'set'; readonly value: number };

/**
 * The yardage band a verb's card bar renders (§3.3 / §4.2). This is display
 * texture only — the real outcome comes from the tier resolver. `typicalLow`
 * and `typicalHigh` bound the highlighted "usually" segment of the bar.
 * `bimodal` flags verbs (AIR IT OUT) whose bar should read "nothing... or huge".
 */
export interface YardageBand {
  readonly floor: number;
  readonly typicalLow: number;
  readonly typicalHigh: number;
  readonly ceiling: number;
  readonly bimodal: boolean;
}

export interface VerbDef {
  readonly verb: OffenseVerb;
  readonly label: string;
  readonly flavor: string;
  /** Whether this is a pass verb — gates the Bite (🔥) tier bonus. */
  readonly isPass: boolean;
  /** 0-3 skull risk pips shown on the card (turnover / sack exposure). */
  readonly riskPips: number;
  readonly band: YardageBand;
  readonly biteEffect: BiteEffect;
}

export const VERB_DEFS: Record<OffenseVerb, VerbDef> = {
  HAMMER: {
    verb: 'HAMMER',
    label: 'HAMMER',
    flavor: 'Run it down their throat.',
    isPass: false,
    riskPips: 0,
    band: { floor: -2, typicalLow: 2, typicalHigh: 5, ceiling: 15, bimodal: false },
    biteEffect: { kind: 'delta', value: 15 },
  },
  DINK: {
    verb: 'DINK',
    label: 'DINK',
    flavor: 'Quick game, checkdowns, screens.',
    isPass: true,
    riskPips: 1,
    band: { floor: 0, typicalLow: 4, typicalHigh: 7, ceiling: 12, bimodal: false },
    biteEffect: { kind: 'delta', value: -5 },
  },
  AIR_IT_OUT: {
    verb: 'AIR_IT_OUT',
    label: 'AIR IT OUT',
    flavor: 'Shot plays. Probably nothing... or six.',
    isPass: true,
    riskPips: 2,
    band: { floor: -8, typicalLow: 18, typicalHigh: 35, ceiling: 45, bimodal: true },
    biteEffect: { kind: 'delta', value: -15 },
  },
  TRICK_EM: {
    verb: 'TRICK_EM',
    label: "TRICK 'EM",
    flavor: 'Reverses, flea flickers, wildcat chaos.',
    isPass: false,
    riskPips: 3,
    band: { floor: -10, typicalLow: 5, typicalHigh: 25, ceiling: 55, bimodal: true },
    biteEffect: { kind: 'set', value: 0 },
  },
};

export interface DefenseVerbDef {
  readonly verb: DefenseVerb;
  readonly label: string;
  readonly flavor: string;
  /** Aggressive verbs overcommit — TRICK 'EM and DINK punish them. */
  readonly aggressive: boolean;
}

export const DEFENSE_VERB_DEFS: Record<DefenseVerb, DefenseVerbDef> = {
  SELL_OUT: {
    verb: 'SELL_OUT',
    label: 'SELL OUT',
    flavor: 'Stack the box, dare them to throw.',
    aggressive: true,
  },
  BLITZ: {
    verb: 'BLITZ',
    label: 'BLITZ',
    flavor: 'Send the house.',
    aggressive: true,
  },
  LOCKDOWN: {
    verb: 'LOCKDOWN',
    label: 'LOCKDOWN',
    flavor: 'Man up, no free releases.',
    aggressive: false,
  },
  UMBRELLA: {
    verb: 'UMBRELLA',
    label: 'UMBRELLA',
    flavor: 'Deep zone. Nothing over the top.',
    aggressive: false,
  },
  ROBBER: {
    verb: 'ROBBER',
    label: 'ROBBER',
    flavor: 'Guess the call. Right = jackpot, wrong = shredded.',
    aggressive: true,
  },
};

/** Bite meter tuning (§5). */
export const BITE_CONFIG = {
  MIN: 0,
  MAX: 100,
  START: 0,
  /** At/above this the defense is biting hard — pass verbs get the 🔥 bonus. */
  HOT_THRESHOLD: 60,
  /** Passive decay applied each snap. */
  DECAY_PER_SNAP: 5,
} as const;

/** Clamp a raw Bite value into the legal 0-100 range. */
export function clampBite(value: number): number {
  return Math.max(BITE_CONFIG.MIN, Math.min(BITE_CONFIG.MAX, value));
}

/** Apply a verb's Bite effect to the current meter, returning the new value. */
export function applyVerbToBite(currentBite: number, verb: OffenseVerb): number {
  const effect = VERB_DEFS[verb].biteEffect;
  const raw = effect.kind === 'set' ? effect.value : currentBite + effect.value;
  return clampBite(raw);
}

/** Apply one snap of passive Bite decay. */
export function decayBite(currentBite: number): number {
  return clampBite(currentBite - BITE_CONFIG.DECAY_PER_SNAP);
}

/** Whether the defense is biting hot enough to trigger the pass-verb bonus. */
export function isBiteHot(currentBite: number): boolean {
  return currentBite >= BITE_CONFIG.HOT_THRESHOLD;
}
