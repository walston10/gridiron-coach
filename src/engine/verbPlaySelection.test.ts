import { describe, it, expect } from 'vitest';
import { SeededRNG } from './playResolver';
import { selectConcretePlay, playsForVerb } from './verbPlaySelection';
import type { OffenseVerb } from '../data/verbs';
import type { Rng } from './tierResolver';

const VERBS: OffenseVerb[] = ['HAMMER', 'DINK', 'AIR_IT_OUT', 'TRICK_EM'];

function rng(seed = 42): Rng {
  return new SeededRNG(seed);
}

describe('selectConcretePlay', () => {
  it('returns a valid concrete play for every verb', () => {
    const r = rng();
    for (const verb of VERBS) {
      for (let i = 0; i < 200; i++) {
        const play = selectConcretePlay(verb, 30, r);
        expect(playsForVerb(verb)).toContainEqual(play);
      }
    }
  });

  it('HAMMER always renders a run play', () => {
    const r = rng(1);
    for (let i = 0; i < 500; i++) {
      expect(selectConcretePlay('HAMMER', i % 100, r).playType).toBe('RUN');
    }
  });

  it('AIR IT OUT always renders a pass play', () => {
    const r = rng(2);
    for (let i = 0; i < 500; i++) {
      expect(selectConcretePlay('AIR_IT_OUT', i % 100, r).playType).toBe('PASS');
    }
  });

  it('is deterministic for a given RNG seed', () => {
    const a = selectConcretePlay('DINK', 40, rng(999));
    const b = selectConcretePlay('DINK', 40, rng(999));
    expect(a.id).toBe(b.id);
  });

  it('fires the draw more often at low Bite than at high Bite', () => {
    // Draw beats a pass-expecting (low-Bite) defense; at hot Bite the defense
    // reads run, so draws should be suppressed.
    const cold = countDraws(0);
    const hot = countDraws(90);
    expect(cold).toBeGreaterThan(hot);
  });
});

function countDraws(bite: number): number {
  const r = rng(2024);
  let draws = 0;
  for (let i = 0; i < 4000; i++) {
    if (selectConcretePlay('HAMMER', bite, r).id === 'default-draw') draws += 1;
  }
  return draws;
}
