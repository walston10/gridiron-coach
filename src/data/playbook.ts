// src/data/playbook.ts
// Fixed playbook - EVERYONE has access to ALL plays
// Player ratings MODIFY success rates, not what plays are available

export interface RatingFactor {
  weight: number;
  stat: string;
}

export interface BasePlay {
  id: string;
  name: string;
  category: 'short' | 'medium' | 'deep' | 'run' | 'trick';
  type: 'pass' | 'run';
  baseCost: number;
  baseSuccess: number;
  yardRange: { min: number; max: number };
  baseBreakaway: number;
  baseIntRisk?: number;
  baseFumbleRisk?: number;
  description: string;
  targetPriority?: string[];
  ratingFactors: Record<string, RatingFactor>;
  bonusVs?: string[];
  penaltyVs?: string[];
  counters?: string[];
  situational?: {
    maxDistance?: number;
    redZone?: boolean;
  };
  requiresTendency?: {
    runRate?: number;
  };
}

// ============================================
// SHORT PASSES (Low Risk, Low Reward)
// ============================================

export const SHORT_PASSES: BasePlay[] = [
  {
    id: 'checkdown',
    name: 'Checkdown',
    category: 'short',
    type: 'pass',
    baseCost: 0,
    baseSuccess: 70,
    yardRange: { min: 2, max: 5 },
    baseBreakaway: 3,
    baseIntRisk: 2,
    description: 'Safe dump-off to RB or TE',
    targetPriority: ['RB', 'TE'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'shortAccuracy' },
      target: { weight: 0.4, stat: 'catching' },
      oline: { weight: 0.3, stat: 'passBlock' },
    },
  },
  {
    id: 'quick-slant',
    name: 'Quick Slant',
    category: 'short',
    type: 'pass',
    baseCost: 1,
    baseSuccess: 65,
    yardRange: { min: 6, max: 12 },
    baseBreakaway: 10,
    baseIntRisk: 4,
    description: 'Fast inside cut, quick release',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'shortAccuracy' },
      target: { weight: 0.5, stat: 'routeRunning' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
  {
    id: 'quick-out',
    name: 'Quick Out',
    category: 'short',
    type: 'pass',
    baseCost: 1,
    baseSuccess: 63,
    yardRange: { min: 5, max: 9 },
    baseBreakaway: 5,
    baseIntRisk: 3,
    description: 'Sharp out cut near sideline',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.35, stat: 'shortAccuracy' },
      target: { weight: 0.45, stat: 'routeRunning' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
  {
    id: 'drag-route',
    name: 'Drag Route',
    category: 'short',
    type: 'pass',
    baseCost: 1,
    baseSuccess: 68,
    yardRange: { min: 4, max: 8 },
    baseBreakaway: 8,
    baseIntRisk: 2,
    description: 'Shallow cross, finds soft spots',
    targetPriority: ['WR2', 'TE'],
    ratingFactors: {
      qb: { weight: 0.25, stat: 'shortAccuracy' },
      target: { weight: 0.5, stat: 'catching' },
      oline: { weight: 0.25, stat: 'passBlock' },
    },
  },
  {
    id: 'swing-pass',
    name: 'Swing Pass',
    category: 'short',
    type: 'pass',
    baseCost: 1,
    baseSuccess: 66,
    yardRange: { min: 3, max: 10 },
    baseBreakaway: 15,
    baseIntRisk: 2,
    description: 'RB flares to flat, YAC potential',
    targetPriority: ['RB'],
    ratingFactors: {
      qb: { weight: 0.2, stat: 'shortAccuracy' },
      target: { weight: 0.4, stat: 'catching' },
      targetSecondary: { weight: 0.4, stat: 'speed' },
    },
  },
];

// ============================================
// MEDIUM PASSES (Moderate Risk)
// ============================================

export const MEDIUM_PASSES: BasePlay[] = [
  {
    id: 'curl-route',
    name: 'Curl Route',
    category: 'medium',
    type: 'pass',
    baseCost: 2,
    baseSuccess: 58,
    yardRange: { min: 10, max: 16 },
    baseBreakaway: 6,
    baseIntRisk: 5,
    description: 'WR curls back to QB, timing route',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.4, stat: 'mediumAccuracy' },
      target: { weight: 0.4, stat: 'routeRunning' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
  {
    id: 'dig-route',
    name: 'Dig Route',
    category: 'medium',
    type: 'pass',
    baseCost: 2,
    baseSuccess: 55,
    yardRange: { min: 12, max: 18 },
    baseBreakaway: 8,
    baseIntRisk: 6,
    description: 'Deep in-cut, finds zone holes',
    targetPriority: ['WR1'],
    ratingFactors: {
      qb: { weight: 0.35, stat: 'mediumAccuracy' },
      target: { weight: 0.45, stat: 'routeRunning' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
  {
    id: 'out-route',
    name: 'Out Route',
    category: 'medium',
    type: 'pass',
    baseCost: 2,
    baseSuccess: 52,
    yardRange: { min: 12, max: 20 },
    baseBreakaway: 5,
    baseIntRisk: 7,
    description: 'Deep out to sideline, tight window',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.5, stat: 'mediumAccuracy' },
      target: { weight: 0.35, stat: 'routeRunning' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
  },
  {
    id: 'te-seam',
    name: 'TE Seam',
    category: 'medium',
    type: 'pass',
    baseCost: 2,
    baseSuccess: 50,
    yardRange: { min: 14, max: 25 },
    baseBreakaway: 10,
    baseIntRisk: 6,
    description: 'TE up the seam, LB mismatch',
    targetPriority: ['TE'],
    ratingFactors: {
      qb: { weight: 0.35, stat: 'mediumAccuracy' },
      target: { weight: 0.5, stat: 'catching' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
  },
  {
    id: 'screen-pass',
    name: 'Screen Pass',
    category: 'medium',
    type: 'pass',
    baseCost: 2,
    baseSuccess: 55,
    yardRange: { min: -2, max: 15 },
    baseBreakaway: 22,
    baseIntRisk: 2,
    description: 'Let rush come, dump behind them',
    targetPriority: ['RB'],
    ratingFactors: {
      qb: { weight: 0.15, stat: 'shortAccuracy' },
      target: { weight: 0.35, stat: 'catching' },
      targetSecondary: { weight: 0.3, stat: 'speed' },
      oline: { weight: 0.2, stat: 'runBlock' },
    },
    bonusVs: ['blitz'],
    penaltyVs: ['spy'],
  },
  {
    id: 'comeback-route',
    name: 'Comeback',
    category: 'medium',
    type: 'pass',
    baseCost: 2,
    baseSuccess: 54,
    yardRange: { min: 11, max: 17 },
    baseBreakaway: 4,
    baseIntRisk: 5,
    description: 'Deep then back to sideline',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.45, stat: 'mediumAccuracy' },
      target: { weight: 0.4, stat: 'routeRunning' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
  },
];

// ============================================
// DEEP PASSES (High Risk, High Reward)
// ============================================

export const DEEP_PASSES: BasePlay[] = [
  {
    id: 'go-route',
    name: 'Go Route',
    category: 'deep',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 32,
    yardRange: { min: 25, max: 55 },
    baseBreakaway: 35,
    baseIntRisk: 10,
    description: 'Straight vertical, need time and arm',
    targetPriority: ['WR1'],
    ratingFactors: {
      qb: { weight: 0.4, stat: 'deepAccuracy' },
      qbSecondary: { weight: 0.15, stat: 'armStrength' },
      target: { weight: 0.3, stat: 'speed' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
    counters: ['cover2', 'cover4', 'bracket'],
  },
  {
    id: 'post-route',
    name: 'Post Route',
    category: 'deep',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 38,
    yardRange: { min: 18, max: 40 },
    baseBreakaway: 25,
    baseIntRisk: 8,
    description: 'Deep cross toward post, big play threat',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.4, stat: 'deepAccuracy' },
      target: { weight: 0.4, stat: 'routeRunning' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
    bonusVs: ['cover1', 'cover3'],
  },
  {
    id: 'corner-route',
    name: 'Corner Route',
    category: 'deep',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 35,
    yardRange: { min: 15, max: 35 },
    baseBreakaway: 20,
    baseIntRisk: 8,
    description: 'Break to back pylon, fade territory',
    targetPriority: ['WR1', 'TE'],
    ratingFactors: {
      qb: { weight: 0.45, stat: 'deepAccuracy' },
      target: { weight: 0.35, stat: 'catching' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
    bonusVs: ['cover2'],
  },
  {
    id: 'deep-crosser',
    name: 'Deep Crosser',
    category: 'deep',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 40,
    yardRange: { min: 16, max: 30 },
    baseBreakaway: 18,
    baseIntRisk: 7,
    description: 'Deep cross, needs elite route runner',
    targetPriority: ['WR2', 'WR1'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'mediumAccuracy' },
      target: { weight: 0.5, stat: 'routeRunning' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
];

// ============================================
// RUN PLAYS
// ============================================

export const RUN_PLAYS: BasePlay[] = [
  {
    id: 'hb-dive',
    name: 'HB Dive',
    category: 'run',
    type: 'run',
    baseCost: 1,
    baseSuccess: 62,
    yardRange: { min: 2, max: 5 },
    baseBreakaway: 5,
    baseFumbleRisk: 2,
    description: 'Straight ahead, reliable yards',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.4, stat: 'power' },
      oline: { weight: 0.6, stat: 'runBlock' },
    },
  },
  {
    id: 'stretch-run',
    name: 'Stretch Run',
    category: 'run',
    type: 'run',
    baseCost: 2,
    baseSuccess: 50,
    yardRange: { min: -2, max: 12 },
    baseBreakaway: 20,
    baseFumbleRisk: 3,
    description: 'Zone stretch, cutback potential',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.35, stat: 'speed' },
      rbSecondary: { weight: 0.25, stat: 'vision' },
      oline: { weight: 0.4, stat: 'runBlock' },
    },
  },
  {
    id: 'power-run',
    name: 'Power Run',
    category: 'run',
    type: 'run',
    baseCost: 1,
    baseSuccess: 58,
    yardRange: { min: 1, max: 6 },
    baseBreakaway: 8,
    baseFumbleRisk: 2,
    description: 'Downhill with pulling guard',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.45, stat: 'power' },
      oline: { weight: 0.55, stat: 'runBlock' },
    },
  },
  {
    id: 'counter',
    name: 'Counter',
    category: 'run',
    type: 'run',
    baseCost: 2,
    baseSuccess: 48,
    yardRange: { min: -1, max: 14 },
    baseBreakaway: 15,
    baseFumbleRisk: 3,
    description: 'Misdirection, big play if it hits',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.4, stat: 'vision' },
      rbSecondary: { weight: 0.2, stat: 'speed' },
      oline: { weight: 0.4, stat: 'runBlock' },
    },
  },
  {
    id: 'toss',
    name: 'HB Toss',
    category: 'run',
    type: 'run',
    baseCost: 2,
    baseSuccess: 45,
    yardRange: { min: -3, max: 18 },
    baseBreakaway: 25,
    baseFumbleRisk: 4,
    description: 'Pitch outside, need speed',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.5, stat: 'speed' },
      rbSecondary: { weight: 0.2, stat: 'elusiveness' },
      oline: { weight: 0.3, stat: 'runBlock' },
    },
    penaltyVs: ['contain'],
  },
  {
    id: 'draw',
    name: 'Draw Play',
    category: 'run',
    type: 'run',
    baseCost: 2,
    baseSuccess: 52,
    yardRange: { min: 1, max: 12 },
    baseBreakaway: 12,
    baseFumbleRisk: 2,
    description: 'Fake pass, delayed handoff',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.4, stat: 'vision' },
      rbSecondary: { weight: 0.2, stat: 'speed' },
      oline: { weight: 0.4, stat: 'passBlock' },
    },
    bonusVs: ['blitz'],
  },
  {
    id: 'qb-sneak',
    name: 'QB Sneak',
    category: 'run',
    type: 'run',
    baseCost: 0,
    baseSuccess: 75,
    yardRange: { min: 0, max: 2 },
    baseBreakaway: 1,
    baseFumbleRisk: 3,
    description: 'Short yardage specialist',
    targetPriority: ['QB'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'power' },
      oline: { weight: 0.7, stat: 'runBlock' },
    },
    situational: { maxDistance: 2 },
  },
  {
    id: 'qb-draw',
    name: 'QB Draw',
    category: 'run',
    type: 'run',
    baseCost: 2,
    baseSuccess: 48,
    yardRange: { min: 0, max: 15 },
    baseBreakaway: 18,
    baseFumbleRisk: 4,
    description: 'QB keeps and runs',
    targetPriority: ['QB'],
    ratingFactors: {
      qb: { weight: 0.6, stat: 'speed' },
      qbSecondary: { weight: 0.2, stat: 'elusiveness' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
    bonusVs: ['blitz'],
  },
];

// ============================================
// TRICK PLAYS (Everyone Gets These!)
// ============================================

export const TRICK_PLAYS: BasePlay[] = [
  {
    id: 'flea-flicker',
    name: 'Flea Flicker',
    category: 'trick',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 35,
    yardRange: { min: 20, max: 50 },
    baseBreakaway: 40,
    baseIntRisk: 12,
    description: 'Fake run, deep shot. High risk, high reward!',
    targetPriority: ['WR1'],
    ratingFactors: {
      qb: { weight: 0.35, stat: 'deepAccuracy' },
      target: { weight: 0.35, stat: 'speed' },
      rb: { weight: 0.15, stat: 'catching' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
    requiresTendency: { runRate: 0.4 },
  },
  {
    id: 'reverse',
    name: 'Reverse',
    category: 'trick',
    type: 'run',
    baseCost: 3,
    baseSuccess: 40,
    yardRange: { min: -5, max: 25 },
    baseBreakaway: 30,
    baseFumbleRisk: 6,
    description: 'WR comes back for handoff, goes other way',
    targetPriority: ['WR2'],
    ratingFactors: {
      wr: { weight: 0.5, stat: 'speed' },
      wrSecondary: { weight: 0.2, stat: 'elusiveness' },
      oline: { weight: 0.3, stat: 'runBlock' },
    },
  },
  {
    id: 'hb-pass',
    name: 'HB Pass',
    category: 'trick',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 32,
    yardRange: { min: 15, max: 40 },
    baseBreakaway: 25,
    baseIntRisk: 15,
    description: 'RB throws it! Pray he can throw.',
    targetPriority: ['WR1', 'TE'],
    ratingFactors: {
      rb: { weight: 0.5, stat: 'awareness' },
      target: { weight: 0.3, stat: 'catching' },
      oline: { weight: 0.2, stat: 'runBlock' },
    },
  },
  {
    id: 'philly-special',
    name: 'Philly Special',
    category: 'trick',
    type: 'pass',
    baseCost: 4,
    baseSuccess: 28,
    yardRange: { min: 2, max: 15 },
    baseBreakaway: 5,
    baseIntRisk: 8,
    description: 'TE throws to QB. Legendary if it works.',
    targetPriority: ['QB'],
    ratingFactors: {
      te: { weight: 0.4, stat: 'awareness' },
      qb: { weight: 0.4, stat: 'catching' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
    situational: { redZone: true },
  },
  {
    id: 'hook-and-ladder',
    name: 'Hook & Lateral',
    category: 'trick',
    type: 'pass',
    baseCost: 3,
    baseSuccess: 30,
    yardRange: { min: 10, max: 45 },
    baseBreakaway: 45,
    baseIntRisk: 8,
    baseFumbleRisk: 12,
    description: 'Catch and pitch. Chaos play.',
    targetPriority: ['WR1', 'WR2'],
    ratingFactors: {
      qb: { weight: 0.25, stat: 'shortAccuracy' },
      wr1: { weight: 0.3, stat: 'catching' },
      wr2: { weight: 0.25, stat: 'speed' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
  {
    id: 'qb-scramble',
    name: 'QB Scramble',
    category: 'trick',
    type: 'run',
    baseCost: 1,
    baseSuccess: 55,
    yardRange: { min: -3, max: 15 },
    baseBreakaway: 15,
    baseFumbleRisk: 5,
    description: 'Designed QB run, not a broken play',
    targetPriority: ['QB'],
    ratingFactors: {
      qb: { weight: 0.5, stat: 'speed' },
      qbSecondary: { weight: 0.3, stat: 'elusiveness' },
      oline: { weight: 0.2, stat: 'runBlock' },
    },
    penaltyVs: ['spy'],
  },
];

// ============================================
// COMBINED PLAYBOOK
// ============================================

export const FULL_PLAYBOOK = {
  short: SHORT_PASSES,
  medium: MEDIUM_PASSES,
  deep: DEEP_PASSES,
  run: RUN_PLAYS,
  trick: TRICK_PLAYS,
};

export const ALL_PLAYS: BasePlay[] = [
  ...SHORT_PASSES,
  ...MEDIUM_PASSES,
  ...DEEP_PASSES,
  ...RUN_PLAYS,
  ...TRICK_PLAYS,
];

export default FULL_PLAYBOOK;
