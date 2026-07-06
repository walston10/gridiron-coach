/**
 * SPOTLIGHT GENERATOR — the comedy engine (§3.2).
 *
 * A Spotlight card is an intent VERB wearing a personality: a real roster
 * player who wants the ball, printed as a one-off card that rotates through the
 * COMMIT rail (1-2 per drive). Feeding them pays off (an ego bonus, expressed
 * as a tier shift — never raw yards, per §4.3); ignoring them curdles into a
 * morale hit and, eventually, a between-drive event. Rarity lives here
 * (COMMON→LEGENDARY) — the plain verbs have none.
 *
 * This is a focused generator (the spirit of the §8 "cardGenerator → Spotlight
 * only" refactor) that leaves the legacy card generator untouched. It works off
 * a light `SpotlightSource` so it stays decoupled from the full Roster/Player
 * types and easily testable; `spotlightSourcesFromRoster` adapts a real roster.
 */

import type { CardRarity } from '../types/card.types';
import type { PersonalityTrait, Roster, Player } from '../types/player.types';
import type { OffenseVerb } from '../data/verbs';
import type { Rng } from './tierResolver';

/** A player eligible to headline a Spotlight card. */
export interface SpotlightSource {
  id: string;
  /** Full display name, e.g. "DeMarcus Hill". */
  name: string;
  /** Loud short handle for the card title, e.g. "DEMARCUS". */
  shortName: string;
  position: 'QB' | 'RB' | 'WR1' | 'WR2' | 'TE';
  /** Composite 1-99 — drives rarity. */
  overall: number;
  /** 1-99 diva meter — drives how loud/impatient the ego hook is. */
  ego: number;
  trait: PersonalityTrait;
}

/** The ego hook printed on the card. */
export interface EgoHook {
  /** Tier shift applied when the card is played (the payoff for feeding them). */
  useTierShift: number;
  /** Consecutive drives the card can be ignored before a morale hit lands. */
  neglectLimit: number;
  /** Morale lost when the neglect limit is crossed. */
  neglectPenalty: number;
}

export interface SpotlightCard {
  id: string;
  /** Card title, e.g. "FEED DEMARCUS". */
  name: string;
  /** The intent verb this card fires. */
  verb: OffenseVerb;
  rarity: CardRarity;
  sourceId: string;
  shortName: string;
  position: SpotlightSource['position'];
  trait: PersonalityTrait;
  ego: number;
  /** One line of personality. */
  flavor: string;
  hook: EgoHook;
}

/** Per-player ego bookkeeping, persisted across drives. */
export interface SpotlightPlayerState {
  /** 0-100. Below 40 they sulk (cold); feeding them warms them up. */
  morale: number;
  /** Consecutive drives offered-and-ignored. */
  neglectStreak: number;
  /** Consecutive drives fed — a hot hand sharpens the bonus. */
  useStreak: number;
}

export const INITIAL_SPOTLIGHT_MORALE = 70;

export function initialPlayerState(): SpotlightPlayerState {
  return { morale: INITIAL_SPOTLIGHT_MORALE, neglectStreak: 0, useStreak: 0 };
}

// =============================================================================
// GENERATION
// =============================================================================

/** The verb a player itches to run, by position (with a chaos override). */
function verbForSource(source: SpotlightSource): OffenseVerb {
  // Loose cannons want gadget plays regardless of position.
  if (source.trait === 'TROUBLEMAKER' || source.trait === 'PARTY_ANIMAL') {
    return 'TRICK_EM';
  }
  switch (source.position) {
    case 'RB':
      return 'HAMMER';
    case 'TE':
      return 'DINK';
    case 'QB':
    case 'WR1':
    case 'WR2':
      return 'AIR_IT_OUT';
  }
}

const RARITY_LADDER: readonly CardRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'ELITE',
  'LEGENDARY',
];

function bumpRarity(rarity: CardRarity): CardRarity {
  const i = RARITY_LADDER.indexOf(rarity);
  return RARITY_LADDER[Math.min(RARITY_LADDER.length - 1, i + 1)];
}

/** Rarity from a blend of overall talent and ego, with a little star-shine luck. */
export function rarityForSource(source: SpotlightSource, rng: Rng): CardRarity {
  const score = source.overall * 0.75 + source.ego * 0.25;
  let base: CardRarity;
  if (score >= 90) base = 'ELITE';
  else if (score >= 84) base = 'RARE';
  else if (score >= 76) base = 'UNCOMMON';
  else base = 'COMMON';

  if (rng.next() < 0.15) base = bumpRarity(base);
  if (score >= 88 && rng.next() < 0.25) base = 'LEGENDARY';
  return base;
}

const HOOK_BY_RARITY: Record<CardRarity, { useTierShift: number; neglectPenalty: number }> = {
  COMMON: { useTierShift: 0.3, neglectPenalty: 8 },
  UNCOMMON: { useTierShift: 0.45, neglectPenalty: 10 },
  RARE: { useTierShift: 0.6, neglectPenalty: 12 },
  ELITE: { useTierShift: 0.8, neglectPenalty: 16 },
  LEGENDARY: { useTierShift: 1.0, neglectPenalty: 20 },
};

/** Bigger egos have shorter fuses. */
function neglectLimitForEgo(ego: number): number {
  if (ego >= 80) return 1;
  if (ego >= 60) return 2;
  return 3;
}

function egoHook(rarity: CardRarity, ego: number): EgoHook {
  const base = HOOK_BY_RARITY[rarity];
  return {
    useTierShift: base.useTierShift,
    neglectPenalty: base.neglectPenalty,
    neglectLimit: neglectLimitForEgo(ego),
  };
}

/** Card title verb, by intent verb. */
const TITLE_VERB: Record<OffenseVerb, string> = {
  HAMMER: 'RIDE',
  DINK: 'WORK',
  AIR_IT_OUT: 'FEED',
  TRICK_EM: 'UNLEASH',
};

/** One-line flavor keyed by personality trait. */
function flavorFor(source: SpotlightSource): string {
  const n = source.shortName;
  switch (source.trait) {
    case 'DIVA':
      return `${n} told the media he's open every play. Prove it.`;
    case 'MEDIA_DARLING':
      return `The cameras love ${n}. Give them a highlight.`;
    case 'TROUBLEMAKER':
      return `${n} drew up something illegal in the dirt. Let him cook.`;
    case 'PARTY_ANIMAL':
      return `${n} is running on two hours of sleep and pure spite.`;
    case 'TEAM_FIRST':
      return `${n} just wants to help. Reward the effort.`;
    case 'LEADER':
      return `${n} called his own number in the huddle.`;
    case 'MERCENARY':
      return `${n}'s incentive clause is one big play away. Motivated.`;
    case 'QUIET_PROFESSIONAL':
      return `${n} won't ask twice. But he's earned a look.`;
    case 'DEVOUT':
      return `${n} pointed at the sky. He's feeling blessed today.`;
    case 'LOYAL_SOLDIER':
      return `${n} will run through a wall if you ask. So ask.`;
  }
}

/**
 * Generate up to `count` Spotlight cards for a drive, drawn from the given
 * sources without replacement (weighted toward the loudest egos — divas demand
 * the ball more often).
 */
export function generateSpotlights(
  sources: SpotlightSource[],
  rng: Rng,
  count = 2,
): SpotlightCard[] {
  const pool = [...sources];
  const picked: SpotlightSource[] = [];
  const take = Math.min(count, pool.length);

  for (let n = 0; n < take; n++) {
    const total = pool.reduce((sum, s) => sum + egoWeight(s), 0);
    let roll = rng.next() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= egoWeight(pool[i]);
      if (roll < 0) {
        idx = i;
        break;
      }
    }
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return picked.map((source, i) => {
    const verb = verbForSource(source);
    const rarity = rarityForSource(source, rng);
    return {
      id: `spot_${source.id}_${i}_${Math.floor(rng.next() * 1e6)}`,
      name: `${TITLE_VERB[verb]} ${source.shortName}`,
      verb,
      rarity,
      sourceId: source.id,
      shortName: source.shortName,
      position: source.position,
      trait: source.trait,
      ego: source.ego,
      flavor: flavorFor(source),
      hook: egoHook(rarity, source.ego),
    };
  });
}

/** Louder egos surface more often. */
function egoWeight(source: SpotlightSource): number {
  return 1 + source.ego / 25; // ego 1→1.04, 99→4.96
}

// =============================================================================
// EGO / MORALE / STREAK REDUCERS (pure)
// =============================================================================

/**
 * The tier shift a card actually delivers when played: its printed hook, plus a
 * hot-hand bonus if the player is on a run, minus a cold penalty if they're
 * sulking.
 */
export function effectiveTierShift(card: SpotlightCard, state: SpotlightPlayerState): number {
  let shift = card.hook.useTierShift;
  if (state.useStreak >= 1) shift += 0.25; // hot hand
  if (state.morale < 40) shift -= 0.25; // sulking
  return Math.max(0, shift);
}

/** Feed the player: morale up, hot-hand streak up, neglect reset. */
export function registerUse(state: SpotlightPlayerState): SpotlightPlayerState {
  return {
    morale: Math.min(100, state.morale + 6),
    neglectStreak: 0,
    useStreak: state.useStreak + 1,
  };
}

/**
 * Ignore the player for a drive. Crossing the neglect limit lands a morale hit
 * (and resets the streak so the hit doesn't repeat every drive).
 */
export function registerNeglect(
  state: SpotlightPlayerState,
  card: SpotlightCard,
): { state: SpotlightPlayerState; moraleHit: boolean } {
  const neglectStreak = state.neglectStreak + 1;
  const useStreak = 0;
  if (neglectStreak >= card.hook.neglectLimit) {
    return {
      state: {
        morale: Math.max(0, state.morale - card.hook.neglectPenalty),
        neglectStreak: 0,
        useStreak,
      },
      moraleHit: true,
    };
  }
  return { state: { ...state, neglectStreak, useStreak }, moraleHit: false };
}

// =============================================================================
// ROSTER ADAPTER + SANDBOX SOURCES
// =============================================================================

/** Adapt a real roster's skill players into Spotlight sources. */
export function spotlightSourcesFromRoster(roster: Roster): SpotlightSource[] {
  const o = roster.offense;
  const entries: [SpotlightSource['position'], Player][] = [
    ['QB', o.QB],
    ['RB', o.RB],
    ['WR1', o.WR1],
    ['WR2', o.WR2],
    ['TE', o.TE],
  ];
  return entries.map(([position, p]) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    shortName: (p.nickname ?? p.lastName).toUpperCase(),
    position,
    overall: p.overall,
    ego: p.ratings.ego,
    trait: p.personality.primary,
  }));
}

/** Colorful stand-in roster for the #verbloop sandbox. */
export const DEMO_SPOTLIGHT_SOURCES: SpotlightSource[] = [
  { id: 'demo-wr1', name: 'DeMarcus Hill', shortName: 'DEMARCUS', position: 'WR1', overall: 91, ego: 88, trait: 'DIVA' },
  { id: 'demo-rb', name: 'Tank Boudreaux', shortName: 'TANK', position: 'RB', overall: 84, ego: 55, trait: 'TEAM_FIRST' },
  { id: 'demo-qb', name: 'Chase Vandergriff', shortName: 'CHASE', position: 'QB', overall: 87, ego: 72, trait: 'MEDIA_DARLING' },
  { id: 'demo-te', name: 'Moose Delgado', shortName: 'MOOSE', position: 'TE', overall: 79, ego: 40, trait: 'QUIET_PROFESSIONAL' },
  { id: 'demo-wr2', name: 'Reggie Knox', shortName: 'REGGIE', position: 'WR2', overall: 82, ego: 91, trait: 'TROUBLEMAKER' },
];
