import { describe, it, expect } from 'vitest';
import {
  MATCHUP_MATRIX,
  MATCHUP_OUTCOME,
  TIER_ORDER,
  TIER_BANDS,
  type OutcomeTier,
} from './matchupMatrix';
import type { OffenseVerb, DefenseVerb } from './verbs';

const OFFENSE_VERBS = Object.keys(MATCHUP_MATRIX) as OffenseVerb[];
const DEFENSE_VERBS = Object.keys(MATCHUP_MATRIX.HAMMER) as DefenseVerb[];

describe('matchup matrix invariants', () => {
  it('covers all 4x5 pairings', () => {
    expect(OFFENSE_VERBS).toHaveLength(4);
    expect(DEFENSE_VERBS).toHaveLength(5);
  });

  it('every weight row sums to 100', () => {
    for (const off of OFFENSE_VERBS) {
      for (const def of DEFENSE_VERBS) {
        const row = MATCHUP_MATRIX[off][def];
        const sum = TIER_ORDER.reduce((acc, t) => acc + row[t], 0);
        expect(sum, `${off} vs ${def}`).toBe(100);
      }
    }
  });

  it('every weight is non-negative and every tier is present', () => {
    for (const off of OFFENSE_VERBS) {
      for (const def of DEFENSE_VERBS) {
        const row = MATCHUP_MATRIX[off][def];
        for (const t of TIER_ORDER) {
          expect(row[t], `${off} vs ${def} ${t}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('has an outcome verdict for every pairing', () => {
    for (const off of OFFENSE_VERBS) {
      for (const def of DEFENSE_VERBS) {
        expect(['WIN', 'LOSE', 'EVEN']).toContain(MATCHUP_OUTCOME[off][def]);
      }
    }
  });

  it('winning pairings carry more weight in the upper tiers than losing ones', () => {
    // HAMMER wins vs UMBRELLA, loses vs SELL_OUT — the win should skew higher.
    const win = expectedTierIndex(MATCHUP_MATRIX.HAMMER.UMBRELLA);
    const lose = expectedTierIndex(MATCHUP_MATRIX.HAMMER.SELL_OUT);
    expect(win).toBeGreaterThan(lose);
  });
});

describe('tier bands', () => {
  it('defines a band for every tier with mode inside [min, max]', () => {
    for (const t of TIER_ORDER) {
      const band = TIER_BANDS[t];
      expect(band.mode).toBeGreaterThanOrEqual(band.min);
      expect(band.mode).toBeLessThanOrEqual(band.max);
    }
  });

  it('marks exactly DISASTER as a turnover tier', () => {
    const turnoverTiers = TIER_ORDER.filter((t) => TIER_BANDS[t].turnover);
    expect(turnoverTiers).toEqual(['DISASTER']);
  });
});

/** Weight-averaged tier index (0 = DISASTER … 6 = HUGE). */
function expectedTierIndex(row: Record<OutcomeTier, number>): number {
  let total = 0;
  let weighted = 0;
  TIER_ORDER.forEach((t, i) => {
    total += row[t];
    weighted += row[t] * i;
  });
  return weighted / total;
}
