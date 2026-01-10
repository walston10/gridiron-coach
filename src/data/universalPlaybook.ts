/**
 * ILLEGAL MOTION - Universal Playbook
 *
 * All teams have access to the same plays.
 * Your roster provides buffs that modify play effectiveness.
 */

import type { OffensivePlayType, DefensivePlayType, Formation } from '../types/card.types';

// =============================================================================
// PLAY DEFINITIONS - Available to ALL teams
// =============================================================================

export interface UniversalPlay {
  id: string;
  name: string;
  description: string;
  playType: OffensivePlayType;
  formation: Formation;
  category: 'RUN' | 'SHORT' | 'MEDIUM' | 'DEEP' | 'TRICK' | 'SPECIAL';
  // Momentum cost (0-3)
  // 0 = Basic/desperation plays (always available)
  // 1 = Standard plays
  // 2 = Advanced plays
  // 3 = Premium/explosive plays
  momentumCost: 0 | 1 | 2 | 3;
  // Base stats before roster modifiers
  baseSuccessChance: number;  // 0-100
  baseYards: number;
  baseBigPlayChance: number;  // 0-100
  baseTurnoverRisk: number;   // 0-100
  // What makes this play better/worse
  primaryStat: 'ARM' | 'ACCURACY' | 'SPEED' | 'POWER' | 'AGILITY' | 'CATCHING' | 'BLOCKING';
  secondaryStat?: 'ARM' | 'ACCURACY' | 'SPEED' | 'POWER' | 'AGILITY' | 'CATCHING' | 'BLOCKING';
  // Situational bonuses (inherent to the play)
  situationNotes?: string;
}

export interface DefensivePlay {
  id: string;
  name: string;
  description: string;
  playType: DefensivePlayType;
  category: 'COVERAGE' | 'BLITZ' | 'RUN_D' | 'SPECIAL';
  // What this play is good/bad against
  strongVs: OffensivePlayType[];
  weakVs: OffensivePlayType[];
}

// =============================================================================
// OFFENSIVE PLAYS
// =============================================================================

export const UNIVERSAL_OFFENSIVE_PLAYS: UniversalPlay[] = [
  // === RUN PLAYS ===
  {
    id: 'hb-dive',
    name: 'HB Dive',
    description: 'Straight ahead between the tackles',
    playType: 'INSIDE_RUN',
    formation: 'I_FORM',
    category: 'RUN',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 55,
    baseYards: 4,
    baseBigPlayChance: 8,
    baseTurnoverRisk: 3,
    primaryStat: 'POWER',
    situationNotes: 'Great for short yardage',
  },
  {
    id: 'power-o',
    name: 'Power O',
    description: 'Follow the pulling guard',
    playType: 'POWER_RUN',
    formation: 'I_FORM',
    category: 'RUN',
    momentumCost: 1,  // Standard
    baseSuccessChance: 50,
    baseYards: 4,
    baseBigPlayChance: 10,
    baseTurnoverRisk: 4,
    primaryStat: 'POWER',
    secondaryStat: 'BLOCKING',
    situationNotes: 'Physical, punishing run',
  },
  {
    id: 'hb-stretch',
    name: 'HB Stretch',
    description: 'Zone stretch to the outside',
    playType: 'OUTSIDE_RUN',
    formation: 'SINGLEBACK',
    category: 'RUN',
    momentumCost: 1,  // Standard
    baseSuccessChance: 48,
    baseYards: 5,
    baseBigPlayChance: 15,
    baseTurnoverRisk: 5,
    primaryStat: 'SPEED',
    secondaryStat: 'AGILITY',
    situationNotes: 'Home run potential',
  },
  {
    id: 'toss-sweep',
    name: 'Toss Sweep',
    description: 'Quick pitch to the outside',
    playType: 'OUTSIDE_RUN',
    formation: 'SHOTGUN',
    category: 'RUN',
    momentumCost: 2,  // Advanced - explosive but risky
    baseSuccessChance: 45,
    baseYards: 6,
    baseBigPlayChance: 18,
    baseTurnoverRisk: 6,
    primaryStat: 'SPEED',
    secondaryStat: 'AGILITY',
    situationNotes: 'Explosive but risky',
  },
  {
    id: 'hb-draw',
    name: 'HB Draw',
    description: 'Delayed handoff after pass fake',
    playType: 'DRAW',
    formation: 'SHOTGUN',
    category: 'RUN',
    momentumCost: 1,  // Standard
    baseSuccessChance: 50,
    baseYards: 6,
    baseBigPlayChance: 12,
    baseTurnoverRisk: 4,
    primaryStat: 'AGILITY',
    situationNotes: 'Great vs aggressive pass rush',
  },
  {
    id: 'goal-line-plunge',
    name: 'Goal Line Plunge',
    description: 'Lower the shoulder and punch it in',
    playType: 'POWER_RUN',
    formation: 'GOAL_LINE',
    category: 'RUN',
    momentumCost: 0,  // Basic - always available for short yardage
    baseSuccessChance: 60,
    baseYards: 2,
    baseBigPlayChance: 2,
    baseTurnoverRisk: 5,
    primaryStat: 'POWER',
    situationNotes: 'Short yardage specialist',
  },
  {
    id: 'counter',
    name: 'Counter',
    description: 'Misdirection run play',
    playType: 'INSIDE_RUN',
    formation: 'SINGLEBACK',
    category: 'RUN',
    momentumCost: 2,  // Advanced - misdirection
    baseSuccessChance: 48,
    baseYards: 5,
    baseBigPlayChance: 14,
    baseTurnoverRisk: 5,
    primaryStat: 'AGILITY',
    secondaryStat: 'BLOCKING',
    situationNotes: 'Beats aggressive linebackers',
  },
  {
    id: 'qb-sneak',
    name: 'QB Sneak',
    description: 'QB follows the center',
    playType: 'QB_RUN',
    formation: 'UNDER_CENTER',
    category: 'RUN',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 70,
    baseYards: 1,
    baseBigPlayChance: 1,
    baseTurnoverRisk: 2,
    primaryStat: 'BLOCKING',
    situationNotes: 'Best for 4th and inches',
  },

  // === SHORT PASSING (0-10 yards) ===
  {
    id: 'quick-slant',
    name: 'Quick Slant',
    description: 'Fast timing route inside',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    category: 'SHORT',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 65,
    baseYards: 7,
    baseBigPlayChance: 8,
    baseTurnoverRisk: 4,
    primaryStat: 'ACCURACY',
    situationNotes: 'Quick and reliable',
  },
  {
    id: 'hitch',
    name: 'Hitch Route',
    description: 'WR stops and turns for the ball',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    category: 'SHORT',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 68,
    baseYards: 6,
    baseBigPlayChance: 5,
    baseTurnoverRisk: 3,
    primaryStat: 'ACCURACY',
    secondaryStat: 'CATCHING',
    situationNotes: 'Chain mover',
  },
  {
    id: 'checkdown',
    name: 'Checkdown',
    description: 'Safety valve to the RB',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    category: 'SHORT',
    momentumCost: 0,  // Basic - desperation available
    baseSuccessChance: 75,
    baseYards: 4,
    baseBigPlayChance: 10,
    baseTurnoverRisk: 2,
    primaryStat: 'ACCURACY',
    situationNotes: 'Conservative but safe',
  },
  {
    id: 'flat-route',
    name: 'Flat Route',
    description: 'Quick throw to the flat',
    playType: 'SHORT_PASS',
    formation: 'SHOTGUN',
    category: 'SHORT',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 70,
    baseYards: 5,
    baseBigPlayChance: 12,
    baseTurnoverRisk: 3,
    primaryStat: 'SPEED',
    situationNotes: 'YAC opportunity',
  },
  {
    id: 'rb-screen',
    name: 'RB Screen',
    description: 'Dump it to the back behind blockers',
    playType: 'SCREEN',
    formation: 'SHOTGUN',
    category: 'SHORT',
    momentumCost: 1,  // Standard - requires setup
    baseSuccessChance: 55,
    baseYards: 5,
    baseBigPlayChance: 18,
    baseTurnoverRisk: 6,
    primaryStat: 'BLOCKING',
    secondaryStat: 'SPEED',
    situationNotes: 'Kills blitz, big play potential',
  },
  {
    id: 'wr-screen',
    name: 'WR Screen',
    description: 'Quick pass behind the line',
    playType: 'SCREEN',
    formation: 'SHOTGUN',
    category: 'SHORT',
    momentumCost: 1,  // Standard - requires setup
    baseSuccessChance: 52,
    baseYards: 6,
    baseBigPlayChance: 20,
    baseTurnoverRisk: 5,
    primaryStat: 'SPEED',
    secondaryStat: 'BLOCKING',
    situationNotes: 'Explosive vs aggressive D',
  },

  // === MEDIUM PASSING (10-20 yards) ===
  {
    id: 'out-route',
    name: 'Out Route',
    description: 'Break to the sideline at 12 yards',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    category: 'MEDIUM',
    momentumCost: 1,  // Standard
    baseSuccessChance: 55,
    baseYards: 12,
    baseBigPlayChance: 10,
    baseTurnoverRisk: 6,
    primaryStat: 'ARM',
    secondaryStat: 'ACCURACY',
    situationNotes: 'Timing throw',
  },
  {
    id: 'crossing-route',
    name: 'Crossing Route',
    description: 'WR runs across the field',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    category: 'MEDIUM',
    momentumCost: 1,  // Standard
    baseSuccessChance: 58,
    baseYards: 14,
    baseBigPlayChance: 12,
    baseTurnoverRisk: 5,
    primaryStat: 'ACCURACY',
    situationNotes: 'Zone beater',
  },
  {
    id: 'dig-route',
    name: 'Dig Route',
    description: 'Deep in-breaking route',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    category: 'MEDIUM',
    momentumCost: 2,  // Advanced - deeper routes
    baseSuccessChance: 52,
    baseYards: 15,
    baseBigPlayChance: 15,
    baseTurnoverRisk: 6,
    primaryStat: 'ACCURACY',
    secondaryStat: 'CATCHING',
    situationNotes: 'Finds soft spots in zone',
  },
  {
    id: 'seam-route',
    name: 'Seam Route',
    description: 'TE splits the safeties',
    playType: 'MEDIUM_PASS',
    formation: 'SINGLEBACK',
    category: 'MEDIUM',
    momentumCost: 2,  // Advanced - mismatch exploitation
    baseSuccessChance: 50,
    baseYards: 18,
    baseBigPlayChance: 18,
    baseTurnoverRisk: 7,
    primaryStat: 'ARM',
    secondaryStat: 'CATCHING',
    situationNotes: 'TE mismatch play',
  },
  {
    id: 'play-action',
    name: 'Play Action',
    description: 'Fake the handoff, throw downfield',
    playType: 'PLAY_ACTION',
    formation: 'UNDER_CENTER',
    category: 'MEDIUM',
    momentumCost: 2,  // Advanced - requires setup
    baseSuccessChance: 52,
    baseYards: 18,
    baseBigPlayChance: 20,
    baseTurnoverRisk: 8,
    primaryStat: 'ACCURACY',
    situationNotes: 'Great when run game is working',
  },
  {
    id: 'corner-route',
    name: 'Corner Route',
    description: 'Break to the corner of the end zone',
    playType: 'MEDIUM_PASS',
    formation: 'SHOTGUN',
    category: 'MEDIUM',
    momentumCost: 2,  // Advanced - red zone weapon
    baseSuccessChance: 48,
    baseYards: 20,
    baseBigPlayChance: 15,
    baseTurnoverRisk: 7,
    primaryStat: 'ARM',
    secondaryStat: 'ACCURACY',
    situationNotes: 'Red zone touchdown threat',
  },

  // === DEEP PASSING (20+ yards) ===
  {
    id: 'go-route',
    name: 'Go Route',
    description: 'Send the receiver deep',
    playType: 'DEEP_PASS',
    formation: 'SHOTGUN',
    category: 'DEEP',
    momentumCost: 3,  // Premium - explosive deep ball
    baseSuccessChance: 38,
    baseYards: 35,
    baseBigPlayChance: 40,
    baseTurnoverRisk: 12,
    primaryStat: 'ARM',
    secondaryStat: 'SPEED',
    situationNotes: 'Home run ball',
  },
  {
    id: 'post-route',
    name: 'Post Route',
    description: 'Break to the post',
    playType: 'DEEP_PASS',
    formation: 'SHOTGUN',
    category: 'DEEP',
    momentumCost: 2,  // Advanced
    baseSuccessChance: 42,
    baseYards: 28,
    baseBigPlayChance: 35,
    baseTurnoverRisk: 10,
    primaryStat: 'ARM',
    secondaryStat: 'ACCURACY',
    situationNotes: 'Cover 2 beater',
  },
  {
    id: 'deep-crosser',
    name: 'Deep Crosser',
    description: 'Deep crossing route',
    playType: 'DEEP_PASS',
    formation: 'SHOTGUN',
    category: 'DEEP',
    momentumCost: 2,  // Advanced
    baseSuccessChance: 45,
    baseYards: 25,
    baseBigPlayChance: 28,
    baseTurnoverRisk: 9,
    primaryStat: 'ARM',
    situationNotes: 'Attack between zones',
  },
  {
    id: 'bomb',
    name: 'The Bomb',
    description: 'Launch it deep downfield',
    playType: 'DEEP_PASS',
    formation: 'SHOTGUN',
    category: 'DEEP',
    momentumCost: 3,  // Premium - Hail Mary
    baseSuccessChance: 30,
    baseYards: 50,
    baseBigPlayChance: 55,
    baseTurnoverRisk: 15,
    primaryStat: 'ARM',
    secondaryStat: 'SPEED',
    situationNotes: 'Hail Mary territory',
  },
  {
    id: 'double-move',
    name: 'Double Move',
    description: 'Fake short, go deep',
    playType: 'DEEP_PASS',
    formation: 'SHOTGUN',
    category: 'DEEP',
    momentumCost: 3,  // Premium - burns coverage
    baseSuccessChance: 35,
    baseYards: 40,
    baseBigPlayChance: 45,
    baseTurnoverRisk: 14,
    primaryStat: 'AGILITY',
    secondaryStat: 'ARM',
    situationNotes: 'Burns aggressive CBs',
  },

  // === TRICK PLAYS ===
  {
    id: 'flea-flicker',
    name: 'Flea Flicker',
    description: 'Handoff, pitch back, throw deep',
    playType: 'TRICK_PLAY',
    formation: 'SHOTGUN',
    category: 'TRICK',
    momentumCost: 3,  // Premium - trick play
    baseSuccessChance: 40,
    baseYards: 35,
    baseBigPlayChance: 50,
    baseTurnoverRisk: 15,
    primaryStat: 'ARM',
    situationNotes: 'Catches D off guard',
  },
  {
    id: 'reverse',
    name: 'Reverse',
    description: 'WR takes the handoff going the other way',
    playType: 'TRICK_PLAY',
    formation: 'SINGLEBACK',
    category: 'TRICK',
    momentumCost: 3,  // Premium - trick play
    baseSuccessChance: 45,
    baseYards: 12,
    baseBigPlayChance: 30,
    baseTurnoverRisk: 12,
    primaryStat: 'SPEED',
    situationNotes: 'Misdirection',
  },
  {
    id: 'halfback-pass',
    name: 'Halfback Pass',
    description: 'RB throws to open receiver',
    playType: 'TRICK_PLAY',
    formation: 'SHOTGUN',
    category: 'TRICK',
    momentumCost: 3,  // Premium - high risk trick
    baseSuccessChance: 35,
    baseYards: 25,
    baseBigPlayChance: 40,
    baseTurnoverRisk: 18,
    primaryStat: 'CATCHING',
    situationNotes: 'High risk, high reward',
  },
  {
    id: 'qb-scramble',
    name: 'QB Scramble',
    description: 'Tuck it and run',
    playType: 'QB_RUN',
    formation: 'SHOTGUN',
    category: 'TRICK',
    momentumCost: 1,  // Standard - reactive play
    baseSuccessChance: 55,
    baseYards: 8,
    baseBigPlayChance: 15,
    baseTurnoverRisk: 8,
    primaryStat: 'SPEED',
    secondaryStat: 'AGILITY',
    situationNotes: 'Mobile QB only',
  },
  {
    id: 'designed-qb-run',
    name: 'Designed QB Run',
    description: 'Designed keeper play',
    playType: 'QB_RUN',
    formation: 'PISTOL',
    category: 'TRICK',
    momentumCost: 2,  // Advanced - designed QB run
    baseSuccessChance: 50,
    baseYards: 10,
    baseBigPlayChance: 20,
    baseTurnoverRisk: 10,
    primaryStat: 'SPEED',
    situationNotes: 'Dual-threat weapon',
  },

  // === SPECIAL SITUATIONS ===
  {
    id: 'spike',
    name: 'Spike',
    description: 'Stop the clock',
    playType: 'SPIKE',
    formation: 'SHOTGUN',
    category: 'SPECIAL',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 100,
    baseYards: 0,
    baseBigPlayChance: 0,
    baseTurnoverRisk: 0,
    primaryStat: 'ACCURACY',
    situationNotes: 'Stops clock, loses a down',
  },
  {
    id: 'kneel',
    name: 'Victory Kneel',
    description: 'Run out the clock',
    playType: 'KNEEL',
    formation: 'SHOTGUN',
    category: 'SPECIAL',
    momentumCost: 0,  // Basic - always available
    baseSuccessChance: 100,
    baseYards: -1,
    baseBigPlayChance: 0,
    baseTurnoverRisk: 1,
    primaryStat: 'ACCURACY',
    situationNotes: 'Clock killer',
  },
];

// =============================================================================
// DEFENSIVE PLAYS
// =============================================================================

export const UNIVERSAL_DEFENSIVE_PLAYS: DefensivePlay[] = [
  // === COVERAGE ===
  {
    id: 'cover-1',
    name: 'Cover 1 Man',
    description: 'Man coverage with single high safety',
    playType: 'MAN_COVERAGE',
    category: 'COVERAGE',
    strongVs: ['SHORT_PASS', 'SCREEN'],
    weakVs: ['DEEP_PASS', 'PLAY_ACTION'],
  },
  {
    id: 'cover-2',
    name: 'Cover 2 Zone',
    description: 'Two deep safeties, zone underneath',
    playType: 'ZONE_COVERAGE',
    category: 'COVERAGE',
    strongVs: ['DEEP_PASS', 'GO_ROUTE' as OffensivePlayType],
    weakVs: ['MEDIUM_PASS', 'INSIDE_RUN'],
  },
  {
    id: 'cover-3',
    name: 'Cover 3 Zone',
    description: 'Three deep, four underneath',
    playType: 'DEEP_ZONE',
    category: 'COVERAGE',
    strongVs: ['DEEP_PASS'],
    weakVs: ['SHORT_PASS', 'INSIDE_RUN'],
  },
  {
    id: 'cover-4',
    name: 'Cover 4 Prevent',
    description: 'Four deep - no big plays',
    playType: 'PREVENT',
    category: 'COVERAGE',
    strongVs: ['DEEP_PASS', 'TRICK_PLAY'],
    weakVs: ['INSIDE_RUN', 'SHORT_PASS', 'POWER_RUN'],
  },
  {
    id: 'press-man',
    name: 'Press Man',
    description: 'Jam at the line, tight coverage',
    playType: 'PRESS_COVERAGE',
    category: 'COVERAGE',
    strongVs: ['SHORT_PASS', 'SCREEN'],
    weakVs: ['DEEP_PASS', 'DRAW'],
  },

  // === BLITZ ===
  {
    id: 'zone-blitz',
    name: 'Zone Blitz',
    description: 'Drop a lineman, blitz a LB',
    playType: 'ZONE_BLITZ',
    category: 'BLITZ',
    strongVs: ['MEDIUM_PASS', 'PLAY_ACTION'],
    weakVs: ['SCREEN', 'DRAW', 'INSIDE_RUN'],
  },
  {
    id: 'all-out-blitz',
    name: 'All-Out Blitz',
    description: 'Send everyone, cover no one',
    playType: 'BLITZ',
    category: 'BLITZ',
    strongVs: ['DEEP_PASS', 'MEDIUM_PASS'],
    weakVs: ['SCREEN', 'SHORT_PASS', 'DRAW'],
  },
  {
    id: 'lb-blitz',
    name: 'LB Blitz',
    description: 'Send the linebackers',
    playType: 'BLITZ',
    category: 'BLITZ',
    strongVs: ['MEDIUM_PASS', 'PLAY_ACTION'],
    weakVs: ['SCREEN', 'OUTSIDE_RUN'],
  },
  {
    id: 'corner-blitz',
    name: 'Corner Blitz',
    description: 'Sneak the corner off the edge',
    playType: 'BLITZ',
    category: 'BLITZ',
    strongVs: ['DEEP_PASS', 'MEDIUM_PASS'],
    weakVs: ['SCREEN', 'SHORT_PASS'],
  },
  {
    id: 'safety-blitz',
    name: 'Safety Blitz',
    description: 'Send the safety',
    playType: 'BLITZ',
    category: 'BLITZ',
    strongVs: ['PLAY_ACTION', 'DEEP_PASS'],
    weakVs: ['DEEP_PASS', 'TRICK_PLAY'],
  },

  // === RUN DEFENSE ===
  {
    id: 'base-4-3',
    name: 'Base 4-3',
    description: 'Balanced run/pass defense',
    playType: 'CONTAIN',
    category: 'RUN_D',
    strongVs: ['OUTSIDE_RUN', 'QB_RUN'],
    weakVs: ['DEEP_PASS', 'PLAY_ACTION'],
  },
  {
    id: 'stack-box',
    name: 'Stack the Box',
    description: '8 men in the box',
    playType: 'STACK_THE_BOX',
    category: 'RUN_D',
    strongVs: ['INSIDE_RUN', 'POWER_RUN', 'DRAW'],
    weakVs: ['DEEP_PASS', 'PLAY_ACTION', 'SCREEN'],
  },
  {
    id: 'goal-line-stand',
    name: 'Goal Line Stand',
    description: 'Maximum run defense',
    playType: 'GOAL_LINE_STAND',
    category: 'RUN_D',
    strongVs: ['POWER_RUN', 'INSIDE_RUN', 'QB_RUN'],
    weakVs: ['PLAY_ACTION', 'TRICK_PLAY'],
  },
  {
    id: 'contain',
    name: 'Contain',
    description: 'Keep everything inside',
    playType: 'CONTAIN',
    category: 'RUN_D',
    strongVs: ['OUTSIDE_RUN', 'QB_RUN', 'TRICK_PLAY'],
    weakVs: ['INSIDE_RUN', 'MEDIUM_PASS'],
  },
  {
    id: 'qb-spy',
    name: 'QB Spy',
    description: 'Shadow the quarterback',
    playType: 'SPY',
    category: 'SPECIAL',
    strongVs: ['QB_RUN', 'DRAW', 'TRICK_PLAY'],
    weakVs: ['DEEP_PASS', 'INSIDE_RUN'],
  },
];

// =============================================================================
// HELPER TO GET PLAYS BY CATEGORY
// =============================================================================

export function getPlaysByCategory(category: UniversalPlay['category']): UniversalPlay[] {
  return UNIVERSAL_OFFENSIVE_PLAYS.filter(p => p.category === category);
}

export function getAllOffensiveCategories(): UniversalPlay['category'][] {
  return ['RUN', 'SHORT', 'MEDIUM', 'DEEP', 'TRICK'];
}

export function getDefensivePlaysByCategory(category: DefensivePlay['category']): DefensivePlay[] {
  return UNIVERSAL_DEFENSIVE_PLAYS.filter(p => p.category === category);
}
