import { describe, it, expect } from 'vitest';
import { SeededRNG } from './playResolver';
import {
  generateSpotlights,
  rarityForSource,
  effectiveTierShift,
  registerUse,
  registerNeglect,
  initialPlayerState,
  spotlightSourcesFromRoster,
  DEMO_SPOTLIGHT_SOURCES,
  type SpotlightSource,
  type SpotlightCard,
} from './spotlightGenerator';
import type { Rng } from './tierResolver';
import type { Roster } from '../types/player.types';
import { DEFAULT_RATINGS } from '../types/player.types';

function rng(seed = 77): Rng {
  return new SeededRNG(seed);
}

describe('generateSpotlights', () => {
  it('produces the requested count of distinct-source cards', () => {
    const cards = generateSpotlights(DEMO_SPOTLIGHT_SOURCES, rng(), 2);
    expect(cards).toHaveLength(2);
    expect(new Set(cards.map((c) => c.sourceId)).size).toBe(2);
  });

  it('never asks for more cards than there are sources', () => {
    const cards = generateSpotlights(DEMO_SPOTLIGHT_SOURCES.slice(0, 1), rng(), 2);
    expect(cards).toHaveLength(1);
  });

  it('assigns a sensible verb by position/trait', () => {
    const bySource = (id: string): SpotlightCard => {
      const src = DEMO_SPOTLIGHT_SOURCES.find((s) => s.id === id)!;
      return generateSpotlights([src], rng(), 1)[0];
    };
    expect(bySource('demo-rb').verb).toBe('HAMMER'); // RB, team-first
    expect(bySource('demo-wr1').verb).toBe('AIR_IT_OUT'); // WR diva
    expect(bySource('demo-te').verb).toBe('DINK'); // TE
    expect(bySource('demo-wr2').verb).toBe('TRICK_EM'); // troublemaker → chaos
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateSpotlights(DEMO_SPOTLIGHT_SOURCES, rng(999), 2).map((c) => c.name);
    const b = generateSpotlights(DEMO_SPOTLIGHT_SOURCES, rng(999), 2).map((c) => c.name);
    expect(a).toEqual(b);
  });

  it('sets an ego hook whose neglect limit shrinks with ego', () => {
    const diva = generateSpotlights([DEMO_SPOTLIGHT_SOURCES[0]], rng(), 1)[0]; // ego 88
    const chill = generateSpotlights([DEMO_SPOTLIGHT_SOURCES[3]], rng(), 1)[0]; // ego 40
    expect(diva.hook.neglectLimit).toBeLessThan(chill.hook.neglectLimit);
  });
});

describe('rarityForSource', () => {
  it('gives elite players higher rarity than scrubs on average', () => {
    const star: SpotlightSource = { ...DEMO_SPOTLIGHT_SOURCES[0], overall: 99, ego: 99 };
    const scrub: SpotlightSource = { ...DEMO_SPOTLIGHT_SOURCES[0], overall: 55, ego: 40 };
    const ladder = ['COMMON', 'UNCOMMON', 'RARE', 'ELITE', 'LEGENDARY'];
    const avg = (s: SpotlightSource) => {
      const r = rng(5);
      let sum = 0;
      for (let i = 0; i < 3000; i++) sum += ladder.indexOf(rarityForSource(s, r));
      return sum / 3000;
    };
    expect(avg(star)).toBeGreaterThan(avg(scrub) + 1);
  });
});

describe('ego / morale reducers', () => {
  it('feeding raises morale and the hot-hand bonus', () => {
    const card = generateSpotlights([DEMO_SPOTLIGHT_SOURCES[0]], rng(), 1)[0];
    let st = initialPlayerState();
    const before = effectiveTierShift(card, st);
    st = registerUse(st);
    expect(st.morale).toBeGreaterThan(INITIAL());
    expect(effectiveTierShift(card, st)).toBeGreaterThan(before); // hot hand
  });

  it('crossing the neglect limit lands a morale hit', () => {
    const card = generateSpotlights([DEMO_SPOTLIGHT_SOURCES[0]], rng(), 1)[0]; // limit 1
    const res = registerNeglect(initialPlayerState(), card);
    expect(res.moraleHit).toBe(true);
    expect(res.state.morale).toBeLessThan(INITIAL());
  });

  it('does not hit morale before the neglect limit', () => {
    const card = generateSpotlights([DEMO_SPOTLIGHT_SOURCES[3]], rng(), 1)[0]; // ego 40 → limit 3
    const res = registerNeglect(initialPlayerState(), card);
    expect(res.moraleHit).toBe(false);
    expect(res.state.morale).toBe(INITIAL());
  });

  it('a sulking player delivers a smaller bonus', () => {
    const card = generateSpotlights([DEMO_SPOTLIGHT_SOURCES[0]], rng(), 1)[0];
    const happy = effectiveTierShift(card, { morale: 70, neglectStreak: 0, useStreak: 0 });
    const sulking = effectiveTierShift(card, { morale: 20, neglectStreak: 2, useStreak: 0 });
    expect(sulking).toBeLessThan(happy);
  });
});

describe('spotlightSourcesFromRoster', () => {
  it('adapts the five offensive skill players', () => {
    const sources = spotlightSourcesFromRoster(makeRoster());
    expect(sources.map((s) => s.position)).toEqual(['QB', 'RB', 'WR1', 'WR2', 'TE']);
    expect(sources.every((s) => s.shortName.length > 0)).toBe(true);
  });
});

function INITIAL(): number {
  return 70;
}

/** Minimal roster stub — only the offensive skill players matter here. */
function makeRoster(): Roster {
  const player = (id: string, last: string) => ({
    id,
    firstName: 'Test',
    lastName: last,
    position: 'WR' as const,
    age: 25,
    experience: 3,
    ratings: { ...DEFAULT_RATINGS },
    overall: 80,
    potential: 85,
    status: { condition: 'HEALTHY' as const, cardQualityModifier: 0 },
    contract: null,
    cardsGenerated: [],
    cardContribution: 2,
    personality: { primary: 'TEAM_FIRST' as const },
    scandalHistory: [],
    trustInGM: 50,
  });
  const unit = { passBlockRating: 70, runBlockRating: 70, passRushRating: 70, runStopRating: 70 };
  // Only the five offensive skill players are read by the adapter under test;
  // route through `unknown` so we don't have to stub the entire Roster shape.
  return {
    offense: {
      QB: player('qb', 'Callahan'),
      RB: player('rb', 'Stone'),
      WR1: player('wr1', 'Hill'),
      WR2: player('wr2', 'Knox'),
      TE: player('te', 'Delgado'),
      OL: unit,
    },
    defense: {
      DL: unit,
      LB: player('lb', 'Vance'),
      CB1: player('cb1', 'Reed'),
      CB2: player('cb2', 'Ford'),
      S: player('s', 'Ellis'),
    },
  } as unknown as Roster;
}
