// src/data/signatureCards.ts
// Signature cards - BONUS cards unlocked by having elite players (90+ in key stat)

import type { RatingFactor } from './playbook';

export interface UnlockCondition {
  position: string;
  stat: string;
  min: number;
  stat2?: string;
  min2?: number;
}

export interface SignatureCard {
  id: string;
  name: string;
  unlockCondition: UnlockCondition;
  baseCost: number;
  type: 'pass' | 'run' | 'modifier';
  baseSuccess?: number;
  yardRange?: { min: number; max: number };
  baseBreakaway?: number;
  baseIntRisk?: number;
  baseFumbleRisk?: number;
  description: string;
  special: string;
  targetPriority?: string[];
  ratingFactors?: Record<string, RatingFactor>;
  effect?: {
    successMod?: number;
    appliesToType?: ('pass' | 'run')[];
  };
}

// ============================================
// SIGNATURE CARDS
// ============================================

export const SIGNATURE_CARDS: SignatureCard[] = [
  // WR Signatures
  {
    id: 'moss-it',
    name: 'Moss It',
    unlockCondition: { position: 'WR', stat: 'jumping', min: 90 },
    baseCost: 2,
    type: 'pass',
    baseSuccess: 45,
    yardRange: { min: 20, max: 45 },
    baseBreakaway: 20,
    baseIntRisk: 6,
    description: 'Contested catch. Your WR goes up and gets it.',
    special: 'Ignores bracket coverage',
    targetPriority: ['WR1'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'deepAccuracy' },
      target: { weight: 0.5, stat: 'jumping' },
      oline: { weight: 0.2, stat: 'passBlock' },
    },
  },
  {
    id: 'route-god',
    name: 'Route God',
    unlockCondition: { position: 'WR', stat: 'routeRunning', min: 92 },
    baseCost: 2,
    type: 'pass',
    baseSuccess: 70,
    yardRange: { min: 12, max: 22 },
    baseBreakaway: 15,
    baseIntRisk: 3,
    description: 'Instant separation. Elite route creates space.',
    special: '+20% success, ignores press coverage',
    targetPriority: ['WR1'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'mediumAccuracy' },
      target: { weight: 0.55, stat: 'routeRunning' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
  },

  // QB Signatures
  {
    id: 'escape-artist',
    name: 'Escape Artist',
    unlockCondition: { position: 'QB', stat: 'speed', min: 82 },
    baseCost: 2,
    type: 'run',
    baseSuccess: 60,
    yardRange: { min: 2, max: 20 },
    baseBreakaway: 25,
    baseFumbleRisk: 4,
    description: 'Scramble drill. Extends plays, makes magic.',
    special: 'Can throw mid-scramble (50% success)',
    targetPriority: ['QB'],
    ratingFactors: {
      qb: { weight: 0.6, stat: 'speed' },
      qbSecondary: { weight: 0.25, stat: 'elusiveness' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
  },
  {
    id: 'cannon-arm',
    name: 'Bomb It',
    unlockCondition: { position: 'QB', stat: 'armStrength', min: 92 },
    baseCost: 3,
    type: 'pass',
    baseSuccess: 40,
    yardRange: { min: 40, max: 70 },
    baseBreakaway: 50,
    baseIntRisk: 12,
    description: '60+ yard bomb. Only elite arms can do this.',
    special: 'Ignores deep coverage penalties',
    targetPriority: ['WR1'],
    ratingFactors: {
      qb: { weight: 0.5, stat: 'armStrength' },
      target: { weight: 0.35, stat: 'speed' },
      oline: { weight: 0.15, stat: 'passBlock' },
    },
  },
  {
    id: 'surgeon',
    name: 'Surgical Strike',
    unlockCondition: { position: 'QB', stat: 'accuracy', min: 93 },
    baseCost: 2,
    type: 'pass',
    baseSuccess: 75,
    yardRange: { min: 10, max: 18 },
    baseBreakaway: 5,
    baseIntRisk: 2,
    description: 'Perfect ball placement. Elite accuracy wins.',
    special: '-50% INT risk',
    targetPriority: ['WR1', 'TE'],
    ratingFactors: {
      qb: { weight: 0.6, stat: 'accuracy' },
      target: { weight: 0.3, stat: 'catching' },
      oline: { weight: 0.1, stat: 'passBlock' },
    },
  },

  // RB Signatures
  {
    id: 'make-em-miss',
    name: "Make 'Em Miss",
    unlockCondition: { position: 'RB', stat: 'elusiveness', min: 90 },
    baseCost: 2,
    type: 'run',
    baseSuccess: 55,
    yardRange: { min: 0, max: 15 },
    baseBreakaway: 35,
    baseFumbleRisk: 2,
    description: 'Juke, spin, gone. Broken ankles.',
    special: 'Reroll breakaway if first fails',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.6, stat: 'elusiveness' },
      rbSecondary: { weight: 0.2, stat: 'speed' },
      oline: { weight: 0.2, stat: 'runBlock' },
    },
  },
  {
    id: 'freight-train',
    name: 'Freight Train',
    unlockCondition: { position: 'RB', stat: 'power', min: 90 },
    baseCost: 2,
    type: 'run',
    baseSuccess: 65,
    yardRange: { min: 3, max: 8 },
    baseBreakaway: 15,
    baseFumbleRisk: 1,
    description: 'Lower the shoulder. Move the pile.',
    special: '+3 yards minimum on success',
    targetPriority: ['RB'],
    ratingFactors: {
      rb: { weight: 0.55, stat: 'power' },
      rbSecondary: { weight: 0.15, stat: 'toughness' },
      oline: { weight: 0.3, stat: 'runBlock' },
    },
  },

  // TE Signatures
  {
    id: 'mismatch',
    name: 'TE Mismatch',
    unlockCondition: { position: 'TE', stat: 'catching', min: 85, stat2: 'speed', min2: 80 },
    baseCost: 2,
    type: 'pass',
    baseSuccess: 60,
    yardRange: { min: 12, max: 28 },
    baseBreakaway: 20,
    baseIntRisk: 4,
    description: 'Too fast for LBs, too big for DBs.',
    special: 'Ignores TE coverage penalties',
    targetPriority: ['TE'],
    ratingFactors: {
      qb: { weight: 0.3, stat: 'mediumAccuracy' },
      target: { weight: 0.5, stat: 'catching' },
      targetSecondary: { weight: 0.2, stat: 'speed' },
    },
  },

  // OL Signatures (Modifier type)
  {
    id: 'pancake',
    name: 'Pancake Block',
    unlockCondition: { position: 'OL', stat: 'runBlock', min: 90 },
    baseCost: 1,
    type: 'modifier',
    description: 'Flatten a defender. +15% run success.',
    special: 'Only applies to run plays',
    effect: {
      successMod: 15,
      appliesToType: ['run'],
    },
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export interface RosterRatings {
  QB?: Record<string, number>;
  RB?: Record<string, number>;
  WR1?: Record<string, number>;
  WR2?: Record<string, number>;
  TE?: Record<string, number>;
  OL?: Record<string, number>;
}

/**
 * Check if a signature card is unlocked based on roster ratings
 */
export function isSignatureUnlocked(card: SignatureCard, roster: RosterRatings): boolean {
  const { position, stat, min, stat2, min2 } = card.unlockCondition;

  // Map position to roster key
  const positionMap: Record<string, keyof RosterRatings> = {
    QB: 'QB',
    RB: 'RB',
    WR: 'WR1',
    TE: 'TE',
    OL: 'OL',
  };

  const rosterKey = positionMap[position];
  if (!rosterKey) return false;

  const playerRatings = roster[rosterKey];
  if (!playerRatings) return false;

  // Check primary stat
  const primaryStat = playerRatings[stat] || 0;
  if (primaryStat < min) return false;

  // Check secondary stat if required
  if (stat2 && min2) {
    const secondaryStat = playerRatings[stat2] || 0;
    if (secondaryStat < min2) return false;
  }

  return true;
}

/**
 * Get all unlocked signature cards for a roster
 */
export function getUnlockedSignatures(roster: RosterRatings): SignatureCard[] {
  return SIGNATURE_CARDS.filter((card) => isSignatureUnlocked(card, roster));
}

export default SIGNATURE_CARDS;
