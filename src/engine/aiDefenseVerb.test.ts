import { describe, it, expect } from 'vitest';
import { SeededRNG } from './playResolver';
import { chooseDefenseVerb } from './aiDefenseVerb';
import type { DefenseVerb } from '../data/verbs';

function countSellOut(bite: number): number {
  const rng = new SeededRNG(4242);
  let n = 0;
  for (let i = 0; i < 5000; i++) {
    if (chooseDefenseVerb(bite, rng) === 'SELL_OUT') n += 1;
  }
  return n;
}

describe('chooseDefenseVerb', () => {
  it('always returns a valid defensive verb', () => {
    const rng = new SeededRNG(1);
    const valid: DefenseVerb[] = ['SELL_OUT', 'BLITZ', 'LOCKDOWN', 'UMBRELLA', 'ROBBER'];
    for (let i = 0; i < 1000; i++) {
      expect(valid).toContain(chooseDefenseVerb(i % 101, rng));
    }
  });

  it('sells out against the run far more often at high Bite', () => {
    expect(countSellOut(100)).toBeGreaterThan(countSellOut(0) * 2);
  });
});
