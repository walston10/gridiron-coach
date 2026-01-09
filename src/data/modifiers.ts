// src/data/modifiers.ts
// Modifier cards - played ALONGSIDE a base play for extra cost

export interface ModifierEffect {
  successMod?: number;
  conditionalMod?: {
    condition: string;
    bonus: number;
  };
  vsBlitz?: number;
  breakawayMod?: number;
  revealsCoverage?: boolean;
  requiresQBRating?: { stat: string; min: number };
  timeMod?: number;
  freePlayChance?: number;
  defenseAdjustmentBlocked?: boolean;
  appliesToType?: ('pass' | 'run')[];
  appliesToCategory?: string[];
  // Dirty effects
  penaltyRisk?: number;
  heatGain?: number;
  fumbleProtection?: boolean;
  flopChance?: number;
  flopYards?: number;
  revealDefense?: boolean;
}

export interface ModifierCard {
  id: string;
  name: string;
  cost: number;
  type: 'offensive' | 'dirty';
  description: string;
  effect: ModifierEffect;
  icon: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

// ============================================
// OFFENSIVE MODIFIERS
// ============================================

export const OFFENSIVE_MODIFIERS: ModifierCard[] = [
  {
    id: 'play-action',
    name: 'Play Action',
    cost: 2,
    type: 'offensive',
    description: 'Fake handoff first. +15% if run rate >40%',
    effect: {
      successMod: 0,
      conditionalMod: {
        condition: 'runRate > 0.4',
        bonus: 15,
      },
      appliesToCategory: ['medium', 'deep'],
    },
    icon: '🎭',
  },
  {
    id: 'max-protect',
    name: 'Max Protect',
    cost: 1,
    type: 'offensive',
    description: 'Keep extra blockers. +20% vs blitz, less YAC.',
    effect: {
      vsBlitz: 20,
      breakawayMod: -10,
      appliesToType: ['pass'],
    },
    icon: '🛡️',
  },
  {
    id: 'motion',
    name: 'Pre-Snap Motion',
    cost: 1,
    type: 'offensive',
    description: 'Move a receiver. Reveals man/zone coverage.',
    effect: {
      successMod: 5,
      revealsCoverage: true,
    },
    icon: '↔️',
  },
  {
    id: 'rpo',
    name: 'RPO',
    cost: 2,
    type: 'offensive',
    description: 'Read option. Can audible run↔pass post-snap.',
    effect: {
      successMod: 8,
      requiresQBRating: { stat: 'awareness', min: 75 },
      appliesToCategory: ['short', 'run'],
    },
    icon: '👁️',
  },
  {
    id: 'hot-route',
    name: 'Hot Route',
    cost: 1,
    type: 'offensive',
    description: 'Quick adjustment. Better vs blitz.',
    effect: {
      vsBlitz: 15,
      timeMod: -5,
    },
    icon: '🔥',
  },
  {
    id: 'hard-count',
    name: 'Hard Count',
    cost: 1,
    type: 'offensive',
    description: '15% chance of free play (offsides).',
    effect: {
      freePlayChance: 15,
    },
    icon: '📢',
  },
  {
    id: 'no-huddle',
    name: 'No Huddle',
    cost: 0,
    type: 'offensive',
    description: "Quick snap. -5% success but defense can't adjust.",
    effect: {
      successMod: -5,
      defenseAdjustmentBlocked: true,
    },
    icon: '⚡',
  },
  {
    id: 'empty-backfield',
    name: 'Empty Backfield',
    cost: 1,
    type: 'offensive',
    description: '5 receivers out. +10% pass, -15% vs blitz.',
    effect: {
      successMod: 10,
      vsBlitz: -15,
      appliesToType: ['pass'],
    },
    icon: '👥',
  },
];

// ============================================
// DIRTY MODIFIERS (Cost + Investigation Risk)
// ============================================

export const DIRTY_MODIFIERS: ModifierCard[] = [
  {
    id: 'hold-em',
    name: "Hold 'Em",
    cost: 2,
    type: 'dirty',
    description: 'O-line holds blatantly. +15% pass success, penalty risk.',
    effect: {
      successMod: 15,
      penaltyRisk: 25,
      heatGain: 8,
      appliesToType: ['pass'],
    },
    icon: '🤝',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'pick-play',
    name: 'Pick Play',
    cost: 2,
    type: 'dirty',
    description: 'Illegal pick route. +20% short/medium, OPI risk.',
    effect: {
      successMod: 20,
      penaltyRisk: 20,
      heatGain: 5,
      appliesToCategory: ['short', 'medium'],
    },
    icon: '🚧',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'greased-football',
    name: 'Greased Ball',
    cost: 3,
    type: 'dirty',
    description: 'Fumbles become incompletes. Suspicious...',
    effect: {
      fumbleProtection: true,
      heatGain: 15,
    },
    icon: '🧴',
    riskLevel: 'HIGH',
  },
  {
    id: 'qb-flop',
    name: 'QB Flop',
    cost: 2,
    type: 'dirty',
    description: 'Fake roughing the passer. 30% free 15 yards.',
    effect: {
      flopChance: 30,
      flopYards: 15,
      heatGain: 12,
    },
    icon: '🎬',
    riskLevel: 'HIGH',
  },
  {
    id: 'steal-signals',
    name: 'Steal Signals',
    cost: 4,
    type: 'dirty',
    description: 'See their coverage before snap. Massive heat.',
    effect: {
      revealDefense: true,
      successMod: 25,
      heatGain: 25,
    },
    icon: '📡',
    riskLevel: 'EXTREME',
  },
];

// ============================================
// ALL MODIFIERS
// ============================================

export const ALL_MODIFIERS: ModifierCard[] = [
  ...OFFENSIVE_MODIFIERS,
  ...DIRTY_MODIFIERS,
];

export default { OFFENSIVE_MODIFIERS, DIRTY_MODIFIERS, ALL_MODIFIERS };
