import { describe, it, expect } from 'vitest';
import { SeededRNG } from './playResolver';
import {
  computeTierWeights,
  verdictFor,
  resolveSnap,
  pickTier,
  tierShift,
  scaleTier,
  normalize,
  triangular,
  type SnapModifiers,
  type Rng,
} from './tierResolver';
import { TIER_ORDER, TIER_BANDS, type OutcomeTier } from '../data/matchupMatrix';

const TIER_INDEX: Record<OutcomeTier, number> = Object.fromEntries(
  TIER_ORDER.map((t, i) => [t, i]),
) as Record<OutcomeTier, number>;

function rng(seed = 12345): Rng {
  return new SeededRNG(seed);
}

/** Tally tiers over many resolveSnap samples, returning percentage shares. */
function tierShares(
  offense: Parameters<typeof resolveSnap>[0],
  defense: Parameters<typeof resolveSnap>[1],
  mods: SnapModifiers,
  n = 40000,
): Record<OutcomeTier, number> {
  const r = rng(98765);
  const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<OutcomeTier, number>;
  for (let i = 0; i < n; i++) {
    counts[resolveSnap(offense, defense, mods, r).tier] += 1;
  }
  const shares = {} as Record<OutcomeTier, number>;
  for (const t of TIER_ORDER) shares[t] = (counts[t] / n) * 100;
  return shares;
}

function meanTierIndex(shares: Record<OutcomeTier, number>): number {
  return TIER_ORDER.reduce((acc, t) => acc + shares[t] * TIER_INDEX[t], 0) / 100;
}

describe('computeTierWeights', () => {
  it('normalizes to ~100 for a clean matchup', () => {
    const w = computeTierWeights('HAMMER', 'UMBRELLA');
    const sum = TIER_ORDER.reduce((acc, t) => acc + w[t], 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('normalizes to ~100 after modifiers', () => {
    const mods: SnapModifiers = { bite: 80, ratingTilt: 0.5, momentumTilt: -0.4, bonusTierShift: 0.5 };
    const w = computeTierWeights('AIR_IT_OUT', 'SELL_OUT', mods);
    const sum = TIER_ORDER.reduce((acc, t) => acc + w[t], 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('leaves run verbs unaffected by hot Bite (bonus is pass-only)', () => {
    const cold = computeTierWeights('HAMMER', 'SELL_OUT', { bite: 0 });
    const hot = computeTierWeights('HAMMER', 'SELL_OUT', { bite: 90 });
    for (const t of TIER_ORDER) expect(hot[t]).toBeCloseTo(cold[t], 6);
  });

  it('hot Bite jumps a tier and halves the bust/stuff floor for pass verbs', () => {
    const cold = computeTierWeights('AIR_IT_OUT', 'SELL_OUT', { bite: 0 });
    const hot = computeTierWeights('AIR_IT_OUT', 'SELL_OUT', { bite: 75 });
    expect(hot.BUST).toBeLessThan(cold.BUST);
    expect(hot.BIG + hot.HUGE).toBeGreaterThan(cold.BIG + cold.HUGE);
  });

  it('red zone makes HUGE impossible and shifts weight down', () => {
    const w = computeTierWeights('AIR_IT_OUT', 'SELL_OUT', { bite: 90, redZone: true });
    expect(w.HUGE).toBe(0);
  });

  it('positive rating tilt raises the mean tier, negative lowers it', () => {
    const base = meanIndexOfWeights(computeTierWeights('DINK', 'ROBBER'));
    const up = meanIndexOfWeights(computeTierWeights('DINK', 'ROBBER', { ratingTilt: 1 }));
    const down = meanIndexOfWeights(computeTierWeights('DINK', 'ROBBER', { ratingTilt: -1 }));
    expect(up).toBeGreaterThan(base);
    expect(down).toBeLessThan(base);
  });
});

describe('verdictFor', () => {
  it('reads the matchup outcome table', () => {
    expect(verdictFor('HAMMER', 'UMBRELLA')).toBe('YOU_BEAT_THE_CALL');
    expect(verdictFor('HAMMER', 'SELL_OUT')).toBe('THEY_READ_YOU');
    expect(verdictFor('HAMMER', 'ROBBER')).toBe('DEAD_EVEN');
  });

  it('stamps THEY_BIT on a hot pass vs a run-committed defense', () => {
    expect(verdictFor('AIR_IT_OUT', 'SELL_OUT', { bite: 80 })).toBe('THEY_BIT');
    // Not run-committed → normal verdict even when hot.
    expect(verdictFor('AIR_IT_OUT', 'UMBRELLA', { bite: 80 })).not.toBe('THEY_BIT');
    // Cold Bite → normal verdict.
    expect(verdictFor('AIR_IT_OUT', 'SELL_OUT', { bite: 10 })).not.toBe('THEY_BIT');
  });
});

describe('resolveSnap distributions', () => {
  it('empirical tier shares track the computed weights', () => {
    const weights = computeTierWeights('HAMMER', 'UMBRELLA');
    const shares = tierShares('HAMMER', 'UMBRELLA', {});
    for (const t of TIER_ORDER) {
      expect(Math.abs(shares[t] - weights[t]), t).toBeLessThan(2);
    }
  });

  it('winning the read jumps tiers vs losing it', () => {
    const win = meanTierIndex(tierShares('HAMMER', 'UMBRELLA', {}));
    const lose = meanTierIndex(tierShares('HAMMER', 'SELL_OUT', {}));
    expect(win).toBeGreaterThan(lose + 0.5);
  });

  it('hot Bite makes AIR IT OUT vs SELL OUT dramatically better', () => {
    const cold = meanTierIndex(tierShares('AIR_IT_OUT', 'SELL_OUT', { bite: 0 }));
    const hot = meanTierIndex(tierShares('AIR_IT_OUT', 'SELL_OUT', { bite: 80 }));
    expect(hot).toBeGreaterThan(cold);
  });

  it('never produces HUGE in the red zone', () => {
    const shares = tierShares('AIR_IT_OUT', 'SELL_OUT', { bite: 90, redZone: true });
    expect(shares.HUGE).toBe(0);
  });
});

describe('resolveSnap outcomes', () => {
  it('DISASTER is a turnover with zero offensive yards', () => {
    const r = rng(1);
    for (let i = 0; i < 20000; i++) {
      const res = resolveSnap('TRICK_EM', 'ROBBER', {}, r);
      if (res.tier === 'DISASTER') {
        expect(res.turnover).toBe(true);
        expect(res.yards).toBe(0);
        expect(res.turnoverType).toBe('FUMBLE'); // run verb
        return;
      }
    }
    throw new Error('expected at least one DISASTER from TRICK_EM vs ROBBER');
  });

  it('a hot pass DISASTER is an interception', () => {
    const r = rng(7);
    for (let i = 0; i < 20000; i++) {
      const res = resolveSnap('AIR_IT_OUT', 'UMBRELLA', {}, r);
      if (res.tier === 'DISASTER') {
        expect(res.turnoverType).toBe('INTERCEPTION');
        return;
      }
    }
    throw new Error('expected at least one DISASTER from AIR_IT_OUT vs UMBRELLA');
  });

  it('attaches a breakaway sequence only on BIG/HUGE and never shrinks yards', () => {
    const r = rng(2);
    for (let i = 0; i < 20000; i++) {
      const res = resolveSnap('HAMMER', 'UMBRELLA', { ballCarrierRating: 95 }, r);
      if (res.tier === 'BIG' || res.tier === 'HUGE') {
        expect(res.breakaway).toBeDefined();
        expect(res.touchdownPossible).toBe(true);
        expect(res.yards).toBeGreaterThanOrEqual(res.breakaway!.baseYards);
      } else {
        expect(res.breakaway).toBeUndefined();
      }
    }
  });

  it('non-turnover yards fall inside the tier band (pre-breakaway)', () => {
    const r = rng(3);
    for (let i = 0; i < 20000; i++) {
      const res = resolveSnap('DINK', 'UMBRELLA', {}, r);
      if (res.turnover) continue;
      const band = TIER_BANDS[res.tier];
      const base = res.breakaway ? res.breakaway.baseYards : res.yards;
      expect(base, res.tier).toBeGreaterThanOrEqual(band.min);
      expect(base, res.tier).toBeLessThanOrEqual(band.max);
    }
  });
});

describe('tier-weight primitives', () => {
  it('tierShift preserves total mass', () => {
    const w = computeTierWeights('DINK', 'BLITZ');
    const shifted = tierShift(w, 1.3);
    const before = TIER_ORDER.reduce((a, t) => a + w[t], 0);
    const after = TIER_ORDER.reduce((a, t) => a + shifted[t], 0);
    expect(after).toBeCloseTo(before, 6);
  });

  it('tierShift up raises the mean tier index', () => {
    const w = normalize({ DISASTER: 0, BUST: 0, STUFF: 100, MODEST: 0, SOLID: 0, BIG: 0, HUGE: 0 });
    const up = meanIndexOfWeights(tierShift(w, 1));
    expect(up).toBeGreaterThan(meanIndexOfWeights(w));
  });

  it('scaleTier multiplies a single tier', () => {
    const w = computeTierWeights('AIR_IT_OUT', 'BLITZ');
    const scaled = scaleTier(w, 'BUST', 0.5);
    expect(scaled.BUST).toBeCloseTo(w.BUST * 0.5, 6);
  });

  it('pickTier respects a degenerate single-tier distribution', () => {
    const onlyBig = { DISASTER: 0, BUST: 0, STUFF: 0, MODEST: 0, SOLID: 0, BIG: 100, HUGE: 0 };
    expect(pickTier(onlyBig, rng())).toBe('BIG');
  });
});

describe('triangular', () => {
  it('stays within [min, max]', () => {
    const r = rng(55);
    for (let i = 0; i < 5000; i++) {
      const v = triangular(3, 12, 6, r.next());
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(12);
    }
  });

  it('peaks near the mode (more mass on the near side)', () => {
    const r = rng(56);
    let low = 0;
    for (let i = 0; i < 20000; i++) {
      // mode near the low end → most samples should land below the midpoint.
      if (triangular(0, 10, 2, r.next()) < 5) low += 1;
    }
    expect(low).toBeGreaterThan(12000);
  });
});

function meanIndexOfWeights(w: Record<OutcomeTier, number>): number {
  const n = normalize(w);
  return TIER_ORDER.reduce((acc, t) => acc + n[t] * TIER_INDEX[t], 0) / 100;
}
