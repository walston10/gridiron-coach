/**
 * Sample defensive cards used by the Key Frame slice and future demos.
 * Each card targets a meaningfully different `DefensivePlayType` so the same
 * offensive play resolves differently against each.
 */

import type { DefensiveCard } from '../types/card.types';

export const SAMPLE_DEFENSES: DefensiveCard[] = [
  {
    id: 'slice-zone',
    category: 'DEFENSIVE',
    name: 'Zone Coverage',
    description: 'Read-and-react zone shell. Balanced.',
    playType: 'ZONE_COVERAGE',
    rarity: 'COMMON',
    runStopRating: 65,
    passDefenseRating: 75,
    pressureRating: 25,
    bigPlayAllowed: 20,
    situationBonuses: [],
    predictionBonus: 15,
    strongAgainst: ['SHORT_PASS'],
    weakAgainst: ['DEEP_PASS', 'OUTSIDE_RUN'],
    generatedBy: 'slice',
  },
  {
    id: 'slice-press',
    category: 'DEFENSIVE',
    name: 'Press Man',
    description: 'Tight jam at the LOS. Beats short, vulnerable to deep.',
    playType: 'PRESS_COVERAGE',
    rarity: 'COMMON',
    runStopRating: 55,
    passDefenseRating: 80,
    pressureRating: 35,
    bigPlayAllowed: 30,
    situationBonuses: [],
    predictionBonus: 15,
    strongAgainst: ['SHORT_PASS', 'SCREEN'],
    weakAgainst: ['DEEP_PASS'],
    generatedBy: 'slice',
  },
  {
    id: 'slice-blitz',
    category: 'DEFENSIVE',
    name: 'Blitz',
    description: 'Extra rushers. Heat now, big-play risk.',
    playType: 'BLITZ',
    rarity: 'COMMON',
    runStopRating: 70,
    passDefenseRating: 50,
    pressureRating: 85,
    bigPlayAllowed: 35,
    situationBonuses: [],
    predictionBonus: 15,
    strongAgainst: ['INSIDE_RUN', 'PLAY_ACTION'],
    weakAgainst: ['SCREEN', 'SHORT_PASS'],
    generatedBy: 'slice',
  },
  {
    id: 'slice-stack',
    category: 'DEFENSIVE',
    name: 'Stack Box',
    description: 'Loaded box. Stuff runs, give up pass.',
    playType: 'STACK_THE_BOX',
    rarity: 'COMMON',
    runStopRating: 88,
    passDefenseRating: 45,
    pressureRating: 30,
    bigPlayAllowed: 35,
    situationBonuses: [],
    predictionBonus: 15,
    strongAgainst: ['INSIDE_RUN', 'POWER_RUN'],
    weakAgainst: ['DEEP_PASS', 'PLAY_ACTION'],
    generatedBy: 'slice',
  },
  {
    id: 'slice-prevent',
    category: 'DEFENSIVE',
    name: 'Prevent',
    description: 'Deep shell. No big plays, soft underneath.',
    playType: 'PREVENT',
    rarity: 'COMMON',
    runStopRating: 40,
    passDefenseRating: 82,
    pressureRating: 15,
    bigPlayAllowed: 5,
    situationBonuses: [],
    predictionBonus: 15,
    strongAgainst: ['DEEP_PASS'],
    weakAgainst: ['SHORT_PASS', 'OUTSIDE_RUN'],
    generatedBy: 'slice',
  },
];

/** Lookup by id. */
export function findSampleDefense(id: string): DefensiveCard {
  return SAMPLE_DEFENSES.find(d => d.id === id) ?? SAMPLE_DEFENSES[0];
}
