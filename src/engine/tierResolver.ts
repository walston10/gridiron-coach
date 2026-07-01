/**
 * TIER RESOLVER — the two-stage resolution model.
 * See docs/GAMEPLAY_LOOP_DESIGN.md §4.
 *
 * Stage 1: pick an OUTCOME TIER from a weight table (the drama).
 * Stage 2: roll YARDS inside that tier's band (the texture), plus live
 *          breakaway rolls on BIG/HUGE (the slot-machine beat).
 *
 * The one rule that keeps the game legible: modifiers shift TIER WEIGHTS, never
 * raw yards. `computeTierWeights` is a pure function (no RNG) so the card's
 * yardage-band bar and the unit tests can inspect the exact distribution a
 * matchup produces before anything is rolled.
 */

import type { OffenseVerb, DefenseVerb } from '../data/verbs';
import { VERB_DEFS, isBiteHot } from '../data/verbs';
import type { OutcomeTier, TierWeights, MatchupVerdict } from '../data/matchupMatrix';
import {
  TIER_ORDER,
  TIER_BANDS,
  BREAKAWAY_TIERS,
  MATCHUP_MATRIX,
  MATCHUP_OUTCOME,
  VERDICT_FOR_OUTCOME,
} from '../data/matchupMatrix';

/** Minimal RNG contract. `SeededRNG` from playResolver.ts satisfies it. */
export interface Rng {
  /** A float in [0, 1). */
  next(): number;
}

/**
 * Inputs that shift tier weights for a single snap. All are optional; omit for
 * a clean matchup. NOTHING here adds raw yards — every field moves the tier
 * distribution (§4.3).
 */
export interface SnapModifiers {
  /** Current Bite meter 0-100. Pass verbs get the 🔥 bonus at/above threshold. */
  bite?: number;
  /**
   * Net player-rating advantage as a signed fraction in [-1, 1]. ±1 maps to the
   * full ±10% weight tilt described in the doc.
   */
  ratingTilt?: number;
  /** Net momentum as a signed fraction in [-1, 1]. ±1 maps to ±5% weight tilt. */
  momentumTilt?: number;
  /**
   * Extra tier shift printed by a Spotlight card or dirty effect. +1 = up one
   * tier; fractional values move a fraction of the mass one tier.
   */
  bonusTierShift?: number;
  /** Red zone compresses the bands: HUGE becomes impossible, STUFF likelier. */
  redZone?: boolean;
  /** Ballcarrier rating 0-100 driving breakaway "tackle broken?" rolls. */
  ballCarrierRating?: number;
}

/** One live "tackle broken?" roll resolved during the animation (§4.4). */
export interface BreakawayRoll {
  broken: boolean;
  extraYards: number;
}

export interface BreakawaySequence {
  /** Yards before any tackles are broken. */
  baseYards: number;
  rolls: BreakawayRoll[];
  /** baseYards + all broken-tackle yardage. */
  totalYards: number;
}

export interface TierResolution {
  tier: OutcomeTier;
  /** Net yards from the offense's perspective (0 on a turnover). */
  yards: number;
  turnover: boolean;
  turnoverType?: 'INTERCEPTION' | 'FUMBLE';
  /** DISASTER return yards for the defense, when applicable. */
  returnYards?: number;
  /** True on BIG/HUGE — the game layer checks field position for the actual TD. */
  touchdownPossible: boolean;
  breakaway?: BreakawaySequence;
  verdict: MatchupVerdict;
  /** Whether the Bite bonus fired this snap. */
  biteHot: boolean;
  /** The normalized weights actually used — handy for UI bars and debugging. */
  weights: TierWeights;
}

// =============================================================================
// STAGE 1 — TIER WEIGHTS
// =============================================================================

/**
 * Resolve the final, normalized tier weights for a matchup after every
 * modifier. Pure — no RNG. This is what the card's band bar should read from.
 */
export function computeTierWeights(
  offense: OffenseVerb,
  defense: DefenseVerb,
  mods: SnapModifiers = {},
): TierWeights {
  let weights = cloneWeights(MATCHUP_MATRIX[offense][defense]);

  const isPass = VERB_DEFS[offense].isPass;
  const hot = isPass && mods.bite !== undefined && isBiteHot(mods.bite);

  // Bite (🔥): halve the low tiers and jump a full tier on pass verbs (§4.3).
  if (hot) {
    weights = scaleTier(weights, 'BUST', 0.5);
    weights = scaleTier(weights, 'STUFF', 0.5);
    weights = tierShift(weights, 1);
  }

  // Player ratings: ±10% weight tilt.
  if (mods.ratingTilt) {
    weights = tierShift(weights, clampUnit(mods.ratingTilt) * 0.1);
  }

  // Momentum: ±5% weight tilt.
  if (mods.momentumTilt) {
    weights = tierShift(weights, clampUnit(mods.momentumTilt) * 0.05);
  }

  // Spotlight / dirty printed shifts.
  if (mods.bonusTierShift) {
    weights = tierShift(weights, mods.bonusTierShift);
  }

  // Red zone compresses the field.
  if (mods.redZone) {
    weights = compressRedZone(weights);
  }

  return normalize(weights);
}

/** Verdict stamp for the reveal, including the special 🔥 THEY BIT case. */
export function verdictFor(
  offense: OffenseVerb,
  defense: DefenseVerb,
  mods: SnapModifiers = {},
): MatchupVerdict {
  const isPass = VERB_DEFS[offense].isPass;
  const hot = isPass && mods.bite !== undefined && isBiteHot(mods.bite);
  // The fake pays off when a hot pass hits a run-committed defense.
  if (hot && defense === 'SELL_OUT') return 'THEY_BIT';
  return VERDICT_FOR_OUTCOME[MATCHUP_OUTCOME[offense][defense]];
}

// =============================================================================
// STAGE 1 + 2 — FULL SNAP RESOLUTION
// =============================================================================

/**
 * Resolve a full snap: pick a tier from the weighted matchup, then roll yards
 * inside its band (with breakaway rolls on BIG/HUGE).
 */
export function resolveSnap(
  offense: OffenseVerb,
  defense: DefenseVerb,
  mods: SnapModifiers,
  rng: Rng,
): TierResolution {
  const weights = computeTierWeights(offense, defense, mods);
  const verdict = verdictFor(offense, defense, mods);
  const isPass = VERB_DEFS[offense].isPass;
  const hot = isPass && mods.bite !== undefined && isBiteHot(mods.bite);

  const tier = pickTier(weights, rng);
  const band = TIER_BANDS[tier];

  // DISASTER — turnover. Yards for the offense are zero; return yards go to the
  // defense and are surfaced separately.
  if (band.turnover) {
    const returnYards = Math.round(triangular(band.min, band.max, band.mode, rng.next()));
    return {
      tier,
      yards: 0,
      turnover: true,
      turnoverType: isPass ? 'INTERCEPTION' : 'FUMBLE',
      returnYards,
      touchdownPossible: false,
      verdict,
      biteHot: hot,
      weights,
    };
  }

  const baseYards = Math.round(triangular(band.min, band.max, band.mode, rng.next()));

  // BIG / HUGE — hand the animation a live breakaway sequence.
  if (BREAKAWAY_TIERS.has(tier)) {
    const breakaway = rollBreakaway(tier, baseYards, mods.ballCarrierRating ?? 75, rng);
    return {
      tier,
      yards: breakaway.totalYards,
      turnover: false,
      touchdownPossible: true,
      breakaway,
      verdict,
      biteHot: hot,
      weights,
    };
  }

  return {
    tier,
    yards: baseYards,
    turnover: false,
    touchdownPossible: false,
    verdict,
    biteHot: hot,
    weights,
  };
}

// =============================================================================
// STAGE 2 — BREAKAWAY
// =============================================================================

/**
 * Roll 1-2 "tackle broken?" checks weighted by ballcarrier rating. HUGE gets
 * two, BIG gets one. Each broken tackle extends the run.
 */
export function rollBreakaway(
  tier: OutcomeTier,
  baseYards: number,
  ballCarrierRating: number,
  rng: Rng,
): BreakawaySequence {
  const numRolls = tier === 'HUGE' ? 2 : 1;
  // 70-rated back breaks ~15%; each 10 points of rating is ~10%. Clamped 5-60%.
  const breakChancePct = clamp(15 + (ballCarrierRating - 70), 5, 60);

  const rolls: BreakawayRoll[] = [];
  let totalYards = baseYards;

  for (let i = 0; i < numRolls; i++) {
    const broken = rng.next() * 100 < breakChancePct;
    const extraYards = broken ? Math.round(triangular(4, 20, 7, rng.next())) : 0;
    totalYards += extraYards;
    rolls.push({ broken, extraYards });
  }

  return { baseYards, rolls, totalYards };
}

// =============================================================================
// TIER-WEIGHT PRIMITIVES (all pure; all shift weights, never yards)
// =============================================================================

/**
 * Shift probability mass between tiers. Positive `amount` moves mass toward
 * HUGE, negative toward DISASTER. |amount| >= 1 shifts whole tiers; the
 * fractional remainder moves that fraction of each tier's mass one step.
 */
export function tierShift(weights: TierWeights, amount: number): TierWeights {
  if (amount === 0) return cloneWeights(weights);
  const dir = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  let current = cloneWeights(weights);
  while (remaining > 1e-9) {
    const step = Math.min(1, remaining);
    current = shiftOnce(current, dir, step);
    remaining -= step;
  }
  return current;
}

/** Move `frac` of each tier's mass one step in `dir`, clamping at the ends. */
function shiftOnce(weights: TierWeights, dir: 1 | -1, frac: number): TierWeights {
  const arr = TIER_ORDER.map((t) => weights[t]);
  const out = arr.map(() => 0);
  for (let i = 0; i < arr.length; i++) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) {
      out[i] += arr[i]; // mass at the edge stays put
    } else {
      out[i] += arr[i] * (1 - frac);
      out[j] += arr[i] * frac;
    }
  }
  return fromArray(out);
}

/** Multiply a single tier's weight by `factor` (e.g. Bite halving BUST/STUFF). */
export function scaleTier(weights: TierWeights, tier: OutcomeTier, factor: number): TierWeights {
  return { ...weights, [tier]: weights[tier] * factor };
}

/**
 * Red-zone compression (§4.3): HUGE becomes impossible (its mass drops into
 * SOLID/BIG), and short outcomes get likelier.
 */
function compressRedZone(weights: TierWeights): TierWeights {
  const out = cloneWeights(weights);
  out.SOLID += out.HUGE * 0.5;
  out.BIG += out.HUGE * 0.5;
  out.HUGE = 0;
  out.STUFF *= 1.4;
  out.MODEST *= 1.1;
  return out;
}

/** Scale weights so they sum to 100. Falls back to a flat STUFF if degenerate. */
export function normalize(weights: TierWeights): TierWeights {
  const total = TIER_ORDER.reduce((sum, t) => sum + Math.max(0, weights[t]), 0);
  if (total <= 0) {
    return { ...zeroWeights(), STUFF: 100 };
  }
  const scale = 100 / total;
  const out = zeroWeights();
  for (const t of TIER_ORDER) out[t] = Math.max(0, weights[t]) * scale;
  return out;
}

/** Sample a tier from a weight table (normalized internally). */
export function pickTier(weights: TierWeights, rng: Rng): OutcomeTier {
  const normalized = normalize(weights);
  const roll = rng.next() * 100;
  let cumulative = 0;
  for (const t of TIER_ORDER) {
    cumulative += normalized[t];
    if (roll < cumulative) return t;
  }
  return 'HUGE'; // floating-point guard: fall through to the top tier
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Inverse-CDF sample of a triangular distribution on [min, max] peaking at
 * `mode`. `u` is a uniform sample in [0, 1).
 */
export function triangular(min: number, max: number, mode: number, u: number): number {
  if (max <= min) return min;
  const c = (mode - min) / (max - min);
  if (u < c) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampUnit(value: number): number {
  return clamp(value, -1, 1);
}

function cloneWeights(weights: TierWeights): TierWeights {
  return { ...weights };
}

function zeroWeights(): TierWeights {
  return {
    DISASTER: 0,
    BUST: 0,
    STUFF: 0,
    MODEST: 0,
    SOLID: 0,
    BIG: 0,
    HUGE: 0,
  };
}

function fromArray(arr: number[]): TierWeights {
  const out = zeroWeights();
  TIER_ORDER.forEach((t, i) => {
    out[t] = arr[i];
  });
  return out;
}
