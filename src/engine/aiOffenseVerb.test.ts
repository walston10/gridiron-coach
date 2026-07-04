import { describe, it, expect } from 'vitest';
import { SeededRNG } from './playResolver';
import { chooseOffenseVerb, type OffenseSituation } from './aiOffenseVerb';
import type { OffenseVerb } from '../data/verbs';

function tally(sit: OffenseSituation): Record<OffenseVerb, number> {
  const rng = new SeededRNG(31337);
  const counts: Record<OffenseVerb, number> = { HAMMER: 0, DINK: 0, AIR_IT_OUT: 0, TRICK_EM: 0 };
  for (let i = 0; i < 5000; i++) counts[chooseOffenseVerb(sit, rng)] += 1;
  return counts;
}

describe('chooseOffenseVerb', () => {
  it('always returns a valid offensive verb', () => {
    const rng = new SeededRNG(1);
    const valid: OffenseVerb[] = ['HAMMER', 'DINK', 'AIR_IT_OUT', 'TRICK_EM'];
    for (let i = 0; i < 1000; i++) {
      expect(valid).toContain(chooseOffenseVerb({ down: (i % 4) + 1, yardsToGo: (i % 15) + 1, ballOn: i % 100 }, rng));
    }
  });

  it('leans on the run in short yardage', () => {
    const short = tally({ down: 3, yardsToGo: 1, ballOn: 50 });
    const long = tally({ down: 3, yardsToGo: 12, ballOn: 50 });
    expect(short.HAMMER).toBeGreaterThan(long.HAMMER);
  });

  it('airs it out on 3rd and long', () => {
    const long = tally({ down: 3, yardsToGo: 12, ballOn: 50 });
    const short = tally({ down: 1, yardsToGo: 10, ballOn: 50 });
    expect(long.AIR_IT_OUT).toBeGreaterThan(short.AIR_IT_OUT);
  });
});
