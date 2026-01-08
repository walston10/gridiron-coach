/**
 * ILLEGAL MOTION - Fantasy Draft Player Pool
 *
 * Generates realistic players across skill tiers for the fantasy draft.
 * Each player comes with pre-calculated cards they would contribute to the deck.
 */

import type {
  Player,
  Position,
  PlayerRatings,
  OLineUnit,
  DLineUnit,
  PersonalityTrait,
  PlayerPersonality,
} from '../types/player.types';
import type { Card } from '../types/card.types';
import { generatePlayerCards, generateLineUnitCards } from '../engine/cardGenerator';

// =============================================================================
// NAME POOLS (More variety than base names.ts)
// =============================================================================

const QB_FIRST_NAMES = [
  'Patrick', 'Josh', 'Joe', 'Justin', 'Lamar', 'Jalen', 'Kyler', 'Dak',
  'Trevor', 'Mac', 'Tua', 'Russell', 'Derek', 'Kirk', 'Matthew', 'Aaron',
  'Carson', 'Baker', 'Geno', 'Daniel', 'Brock', 'Jordan', 'Desmond', 'CJ',
];

const RB_FIRST_NAMES = [
  'Derrick', 'Jonathan', 'Austin', 'Nick', 'Saquon', 'Josh', 'Tony', 'Breece',
  'Travis', 'Rhamondre', 'Kenneth', 'Javonte', 'Najee', 'Aaron', 'Joe', 'James',
  'Alvin', 'Dalvin', 'Christian', 'Dameon', 'Isiah', 'DeAndre', 'David', 'Miles',
];

const WR_FIRST_NAMES = [
  'Tyreek', 'Justin', 'Ja\'Marr', 'Stefon', 'CeeDee', 'Davante', 'AJ', 'DeVonta',
  'Amon-Ra', 'Chris', 'Garrett', 'DK', 'Brandon', 'Jaylen', 'Terry', 'Amari',
  'Mike', 'Diontae', 'Tyler', 'Drake', 'George', 'Christian', 'DeAndre', 'Marquise',
];

const TE_FIRST_NAMES = [
  'Travis', 'Mark', 'George', 'TJ', 'Dallas', 'Darren', 'Pat', 'Kyle',
  'Evan', 'Cole', 'David', 'Gerald', 'Hunter', 'Noah', 'Jake', 'Dalton',
];

const DEF_FIRST_NAMES = [
  'Micah', 'TJ', 'Nick', 'Myles', 'Aaron', 'Maxx', 'Josh', 'Sauce',
  'Patrick', 'Roquan', 'Fred', 'Darius', 'Tremaine', 'Devin', 'Jaire', 'Trevon',
  'Derek', 'Jamal', 'Jessie', 'Antoine', 'Budda', 'Minkah', 'Justin', 'Derwin',
  'Jalen', 'Marcus', 'Quandre', 'Jordan', 'Kenny', 'Trey', 'Lavonte', 'Bobby',
];

const ST_FIRST_NAMES = [
  'Justin', 'Harrison', 'Tyler', 'Jake', 'Daniel', 'Jason', 'Chris', 'Brandon',
  'Evan', 'Cameron', 'Matt', 'Ryan', 'Younghoe', 'Graham', 'Joey', 'Wil',
];

const LAST_NAMES = [
  'Mahomes', 'Allen', 'Burrow', 'Herbert', 'Jackson', 'Hurts', 'Murray', 'Prescott',
  'Lawrence', 'Jones', 'Tagovailoa', 'Wilson', 'Carr', 'Cousins', 'Stafford', 'Rodgers',
  'Henry', 'Taylor', 'Ekeler', 'Chubb', 'Barkley', 'Jacobs', 'Pollard', 'Hall',
  'Hill', 'Jefferson', 'Chase', 'Diggs', 'Lamb', 'Adams', 'Brown', 'Smith',
  'Kelce', 'Andrews', 'Kittle', 'Hockenson', 'Goedert', 'Waller', 'Pitts', 'Ertz',
  'Parsons', 'Watt', 'Bosa', 'Garrett', 'Donald', 'Crosby', 'Allen', 'Gardner',
  'Surtain', 'Leonard', 'Warner', 'White', 'Edmunds', 'Lloyd', 'Alexander', 'Diggs',
  'Ramsey', 'Stingley', 'Fitzpatrick', 'Simmons', 'James', 'Bates', 'Baker', 'Tucker',
  'McPherson', 'Bass', 'Elliott', 'Carlson', 'Gay', 'Boswell', 'Koo', 'Gano',
  'Williams', 'Davis', 'Miller', 'Thompson', 'Robinson', 'Clark', 'Walker', 'King',
  'Wright', 'Mitchell', 'Carter', 'Phillips', 'Evans', 'Turner', 'Nelson', 'Campbell',
];

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export type PlayerTier = 'ELITE' | 'STAR' | 'STARTER' | 'BACKUP' | 'DEPTH';

interface TierConfig {
  tier: PlayerTier;
  overallRange: [number, number];
  salaryRange: [number, number];
  potentialBonus: number;
  color: string;
}

const POSITION_TIERS: Record<Position, TierConfig[]> = {
  QB: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [42, 55], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [28, 41], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [15, 27], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [5, 14], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 4], potentialBonus: 12, color: '#2D3748' },
  ],
  RB: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [18, 25], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [12, 17], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [8, 11], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [4, 7], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 3], potentialBonus: 12, color: '#2D3748' },
  ],
  WR: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [25, 35], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [16, 24], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [10, 15], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [5, 9], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 4], potentialBonus: 12, color: '#2D3748' },
  ],
  TE: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [15, 20], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [10, 14], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [6, 9], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [3, 5], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 2], potentialBonus: 12, color: '#2D3748' },
  ],
  OL: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [20, 28], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [14, 19], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [9, 13], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [5, 8], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [2, 4], potentialBonus: 12, color: '#2D3748' },
  ],
  DL: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [22, 30], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [15, 21], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [10, 14], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [5, 9], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [2, 4], potentialBonus: 12, color: '#2D3748' },
  ],
  LB: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [18, 25], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [12, 17], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [8, 11], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [4, 7], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 3], potentialBonus: 12, color: '#2D3748' },
  ],
  CB: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [20, 28], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [14, 19], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [9, 13], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [4, 8], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 3], potentialBonus: 12, color: '#2D3748' },
  ],
  S: [
    { tier: 'ELITE', overallRange: [88, 95], salaryRange: [16, 22], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [82, 87], salaryRange: [11, 15], potentialBonus: 3, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [75, 81], salaryRange: [7, 10], potentialBonus: 5, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [68, 74], salaryRange: [4, 6], potentialBonus: 8, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 67], salaryRange: [1, 3], potentialBonus: 12, color: '#2D3748' },
  ],
  ST: [
    { tier: 'ELITE', overallRange: [90, 97], salaryRange: [15, 18], potentialBonus: 0, color: '#FFD700' },
    { tier: 'STAR', overallRange: [85, 89], salaryRange: [10, 14], potentialBonus: 2, color: '#C0C0C0' },
    { tier: 'STARTER', overallRange: [80, 84], salaryRange: [6, 9], potentialBonus: 4, color: '#CD7F32' },
    { tier: 'BACKUP', overallRange: [70, 79], salaryRange: [3, 5], potentialBonus: 6, color: '#4A5568' },
    { tier: 'DEPTH', overallRange: [60, 69], salaryRange: [1, 2], potentialBonus: 10, color: '#2D3748' },
  ],
};

// How many players to generate per tier for each position
const PLAYERS_PER_TIER: Record<PlayerTier, number> = {
  ELITE: 1,
  STAR: 2,
  STARTER: 2,
  BACKUP: 2,
  DEPTH: 1,
};

// =============================================================================
// HELPERS
// =============================================================================

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// RATING GENERATORS BY POSITION
// =============================================================================

function generateQBRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;

  return {
    speed: Math.min(99, Math.max(40, base - 15 + variance())),
    strength: Math.min(99, Math.max(40, base - 10 + variance())),
    agility: Math.min(99, Math.max(45, base - 5 + variance())),
    stamina: Math.min(99, Math.max(60, base + variance())),
    awareness: Math.min(99, Math.max(50, base + 5 + variance())),
    discipline: Math.min(99, Math.max(50, base + variance())),
    clutch: Math.min(99, Math.max(40, base + variance())),
    throwing: Math.min(99, Math.max(55, base + 5 + variance())), // Primary
    catching: 30,
    carrying: Math.min(80, Math.max(40, base - 15 + variance())),
    blocking: 20,
    passRush: 10,
    coverage: 10,
    tackling: 20,
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(30, 90),
    loyalty: randomInRange(30, 80),
    vice: randomInRange(20, 70),
  };
}

function generateRBRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;

  return {
    speed: Math.min(99, Math.max(60, base + 3 + variance())), // Primary
    strength: Math.min(99, Math.max(50, base - 3 + variance())),
    agility: Math.min(99, Math.max(60, base + 5 + variance())), // Primary
    stamina: Math.min(99, Math.max(60, base + variance())),
    awareness: Math.min(99, Math.max(50, base - 5 + variance())),
    discipline: Math.min(99, Math.max(45, base - 5 + variance())),
    clutch: Math.min(99, Math.max(40, base + variance())),
    throwing: 30,
    catching: Math.min(90, Math.max(40, base - 10 + variance())),
    carrying: Math.min(99, Math.max(60, base + 5 + variance())), // Primary
    blocking: Math.min(75, Math.max(30, base - 15 + variance())),
    passRush: 10,
    coverage: 10,
    tackling: 25,
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(25, 80),
    loyalty: randomInRange(35, 85),
    vice: randomInRange(20, 65),
  };
}

function generateWRRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;

  return {
    speed: Math.min(99, Math.max(70, base + 5 + variance())), // Primary
    strength: Math.min(85, Math.max(40, base - 15 + variance())),
    agility: Math.min(99, Math.max(65, base + 3 + variance())), // Primary
    stamina: Math.min(99, Math.max(60, base + variance())),
    awareness: Math.min(99, Math.max(50, base - 3 + variance())),
    discipline: Math.min(99, Math.max(40, base - 8 + variance())),
    clutch: Math.min(99, Math.max(40, base + variance())),
    throwing: 30,
    catching: Math.min(99, Math.max(65, base + 5 + variance())), // Primary
    carrying: Math.min(85, Math.max(50, base - 5 + variance())),
    blocking: Math.min(60, Math.max(25, base - 25 + variance())),
    passRush: 10,
    coverage: 10,
    tackling: 25,
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(35, 95), // WRs tend to have higher ego
    loyalty: randomInRange(25, 75),
    vice: randomInRange(25, 75),
  };
}

function generateTERatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;
  // Randomly bias toward receiving or blocking
  const isReceivingTE = Math.random() > 0.4;

  return {
    speed: Math.min(90, Math.max(50, base - 8 + variance())),
    strength: Math.min(99, Math.max(60, base + (isReceivingTE ? -5 : 5) + variance())),
    agility: Math.min(90, Math.max(50, base + (isReceivingTE ? 3 : -5) + variance())),
    stamina: Math.min(99, Math.max(60, base + variance())),
    awareness: Math.min(99, Math.max(50, base + variance())),
    discipline: Math.min(99, Math.max(50, base + variance())),
    clutch: Math.min(99, Math.max(40, base + variance())),
    throwing: 30,
    catching: Math.min(95, Math.max(55, base + (isReceivingTE ? 8 : -5) + variance())),
    carrying: Math.min(80, Math.max(45, base - 10 + variance())),
    blocking: Math.min(95, Math.max(50, base + (isReceivingTE ? -8 : 8) + variance())),
    passRush: 10,
    coverage: 10,
    tackling: 30,
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(25, 70),
    loyalty: randomInRange(45, 90),
    vice: randomInRange(15, 55),
  };
}

function generateLBRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;

  return {
    speed: Math.min(95, Math.max(60, base - 3 + variance())),
    strength: Math.min(99, Math.max(60, base + variance())),
    agility: Math.min(95, Math.max(55, base - 5 + variance())),
    stamina: Math.min(99, Math.max(65, base + variance())),
    awareness: Math.min(99, Math.max(55, base + 3 + variance())),
    discipline: Math.min(99, Math.max(50, base + variance())),
    clutch: Math.min(99, Math.max(45, base + variance())),
    throwing: 20,
    catching: Math.min(70, Math.max(30, base - 20 + variance())),
    carrying: 40,
    blocking: 30,
    passRush: Math.min(95, Math.max(50, base - 5 + variance())),
    coverage: Math.min(90, Math.max(45, base - 8 + variance())),
    tackling: Math.min(99, Math.max(65, base + 5 + variance())), // Primary
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(30, 85),
    loyalty: randomInRange(40, 90),
    vice: randomInRange(20, 60),
  };
}

function generateCBRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;

  return {
    speed: Math.min(99, Math.max(75, base + 5 + variance())), // Primary
    strength: Math.min(85, Math.max(45, base - 12 + variance())),
    agility: Math.min(99, Math.max(70, base + 3 + variance())), // Primary
    stamina: Math.min(99, Math.max(65, base + variance())),
    awareness: Math.min(99, Math.max(55, base + variance())),
    discipline: Math.min(99, Math.max(45, base - 3 + variance())),
    clutch: Math.min(99, Math.max(45, base + variance())),
    throwing: 20,
    catching: Math.min(85, Math.max(45, base - 10 + variance())),
    carrying: 50,
    blocking: 30,
    passRush: Math.min(70, Math.max(30, base - 25 + variance())),
    coverage: Math.min(99, Math.max(65, base + 5 + variance())), // Primary
    tackling: Math.min(90, Math.max(50, base - 8 + variance())),
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(35, 90),
    loyalty: randomInRange(30, 80),
    vice: randomInRange(25, 70),
  };
}

function generateSRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-5, 5);
  const base = overall;

  return {
    speed: Math.min(99, Math.max(70, base + 3 + variance())),
    strength: Math.min(90, Math.max(50, base - 5 + variance())),
    agility: Math.min(95, Math.max(65, base + variance())),
    stamina: Math.min(99, Math.max(65, base + variance())),
    awareness: Math.min(99, Math.max(60, base + 5 + variance())), // Primary
    discipline: Math.min(99, Math.max(50, base + variance())),
    clutch: Math.min(99, Math.max(45, base + variance())),
    throwing: 20,
    catching: Math.min(85, Math.max(45, base - 8 + variance())),
    carrying: 50,
    blocking: 30,
    passRush: Math.min(75, Math.max(35, base - 20 + variance())),
    coverage: Math.min(99, Math.max(60, base + 3 + variance())), // Primary
    tackling: Math.min(99, Math.max(60, base + variance())), // Primary
    kickPower: 30,
    kickAccuracy: 30,
    clutchKicking: 30,
    coverageUnit: 50,
    ego: randomInRange(30, 80),
    loyalty: randomInRange(40, 85),
    vice: randomInRange(20, 60),
  };
}

function generateSTRatings(overall: number): PlayerRatings {
  const variance = () => randomInRange(-3, 3);
  const base = overall;

  return {
    speed: Math.min(70, Math.max(35, 50 + variance())),
    strength: Math.min(70, Math.max(35, 50 + variance())),
    agility: Math.min(75, Math.max(40, 55 + variance())),
    stamina: Math.min(85, Math.max(60, 70 + variance())),
    awareness: Math.min(90, Math.max(55, base - 10 + variance())),
    discipline: Math.min(95, Math.max(60, base - 5 + variance())),
    clutch: Math.min(99, Math.max(40, base - 5 + variance())),
    throwing: 30,
    catching: 30,
    carrying: 30,
    blocking: 25,
    passRush: 10,
    coverage: 10,
    tackling: 35,
    kickPower: Math.min(99, Math.max(55, base + 3 + variance())), // Primary
    kickAccuracy: Math.min(99, Math.max(55, base + 3 + variance())), // Primary
    clutchKicking: Math.min(99, Math.max(40, base + variance())), // Primary
    coverageUnit: Math.min(90, Math.max(45, base - 10 + variance())),
    ego: randomInRange(20, 60),
    loyalty: randomInRange(50, 95),
    vice: randomInRange(10, 45),
  };
}

function generateRatingsForPosition(position: Position, overall: number): PlayerRatings {
  switch (position) {
    case 'QB': return generateQBRatings(overall);
    case 'RB': return generateRBRatings(overall);
    case 'WR': return generateWRRatings(overall);
    case 'TE': return generateTERatings(overall);
    case 'LB': return generateLBRatings(overall);
    case 'CB': return generateCBRatings(overall);
    case 'S': return generateSRatings(overall);
    case 'ST': return generateSTRatings(overall);
    default: return generateLBRatings(overall); // Fallback
  }
}

function getFirstNamesForPosition(position: Position): string[] {
  switch (position) {
    case 'QB': return QB_FIRST_NAMES;
    case 'RB': return RB_FIRST_NAMES;
    case 'WR': return WR_FIRST_NAMES;
    case 'TE': return TE_FIRST_NAMES;
    case 'ST': return ST_FIRST_NAMES;
    default: return DEF_FIRST_NAMES;
  }
}

function generatePersonality(): PlayerPersonality {
  const traits: PersonalityTrait[] = [
    'TEAM_FIRST', 'DIVA', 'QUIET_PROFESSIONAL', 'MEDIA_DARLING',
    'TROUBLEMAKER', 'LEADER', 'PARTY_ANIMAL', 'DEVOUT', 'MERCENARY', 'LOYAL_SOLDIER',
  ];

  const primary = pickRandom(traits);
  const hasSecondary = Math.random() > 0.6;
  const secondary = hasSecondary ? pickRandom(traits.filter(t => t !== primary)) : undefined;

  return { primary, secondary };
}

// =============================================================================
// PLAYER GENERATION
// =============================================================================

export interface DraftPlayer {
  player: Player;
  tier: PlayerTier;
  salary: number;
  tierColor: string;
  previewCards: Card[];
  cardCount: number;
  keyRatings: { name: string; value: number }[];
}

function generatePlayer(
  position: Position,
  tierConfig: TierConfig,
  usedNames: Set<string>
): DraftPlayer {
  const overall = randomInRange(tierConfig.overallRange[0], tierConfig.overallRange[1]);
  const salary = randomInRange(tierConfig.salaryRange[0], tierConfig.salaryRange[1]);
  const potential = Math.min(99, overall + tierConfig.potentialBonus + randomInRange(0, 5));

  // Generate unique name
  const firstNames = getFirstNamesForPosition(position);
  let firstName: string;
  let lastName: string;
  let fullName: string;
  let attempts = 0;

  do {
    firstName = pickRandom(firstNames);
    lastName = pickRandom(LAST_NAMES);
    fullName = `${firstName} ${lastName}`;
    attempts++;
  } while (usedNames.has(fullName) && attempts < 100);

  usedNames.add(fullName);

  const ratings = generateRatingsForPosition(position, overall);

  const player: Player = {
    id: generateId(),
    firstName,
    lastName,
    position,
    age: randomInRange(22, 32),
    experience: randomInRange(0, 10),
    ratings,
    overall,
    potential,
    status: {
      condition: 'HEALTHY',
      cardQualityModifier: 0,
    },
    contract: null,
    cardsGenerated: [],
    cardContribution: Math.floor(overall / 20) + 2,
    personality: generatePersonality(),
    scandalHistory: [],
    trustInGM: 50,
  };

  // Generate preview cards
  const previewCards = generatePlayerCards(player);

  // Get key ratings for display
  const keyRatings = getKeyRatingsForPosition(position, ratings);

  return {
    player,
    tier: tierConfig.tier,
    salary,
    tierColor: tierConfig.color,
    previewCards,
    cardCount: previewCards.length,
    keyRatings,
  };
}

function getKeyRatingsForPosition(
  position: Position,
  ratings: PlayerRatings
): { name: string; value: number }[] {
  switch (position) {
    case 'QB':
      return [
        { name: 'THR', value: ratings.throwing },
        { name: 'AWR', value: ratings.awareness },
        { name: 'SPD', value: ratings.speed },
      ];
    case 'RB':
      return [
        { name: 'SPD', value: ratings.speed },
        { name: 'AGI', value: ratings.agility },
        { name: 'CAR', value: ratings.carrying },
      ];
    case 'WR':
      return [
        { name: 'SPD', value: ratings.speed },
        { name: 'CTH', value: ratings.catching },
        { name: 'AGI', value: ratings.agility },
      ];
    case 'TE':
      return [
        { name: 'CTH', value: ratings.catching },
        { name: 'BLK', value: ratings.blocking },
        { name: 'SPD', value: ratings.speed },
      ];
    case 'LB':
      return [
        { name: 'TKL', value: ratings.tackling },
        { name: 'COV', value: ratings.coverage },
        { name: 'SPD', value: ratings.speed },
      ];
    case 'CB':
      return [
        { name: 'COV', value: ratings.coverage },
        { name: 'SPD', value: ratings.speed },
        { name: 'AGI', value: ratings.agility },
      ];
    case 'S':
      return [
        { name: 'COV', value: ratings.coverage },
        { name: 'TKL', value: ratings.tackling },
        { name: 'AWR', value: ratings.awareness },
      ];
    case 'ST':
      return [
        { name: 'KPW', value: ratings.kickPower },
        { name: 'KAC', value: ratings.kickAccuracy },
        { name: 'CLT', value: ratings.clutchKicking },
      ];
    default:
      return [];
  }
}

// =============================================================================
// LINE UNIT GENERATION
// =============================================================================

export interface DraftLineUnit {
  unit: OLineUnit | DLineUnit;
  type: 'OL' | 'DL';
  tier: PlayerTier;
  salary: number;
  tierColor: string;
  previewCards: Card[];
  cardCount: number;
  keyRatings: { name: string; value: number }[];
}

const OL_NAMES = [
  'The Hogs', 'The Great Wall', 'Road Graders', 'The Maulers', 'Big Uglies',
  'Pancake Factory', 'The Brick Wall', 'Steel Curtain Jr', 'The Trench Dogs',
  'The Protectors', 'Thunder Line', 'The Anchors', 'Freight Train',
];

const DL_NAMES = [
  'The Fearsome Four', 'Sack Masters', 'The Wrecking Crew', 'Steel Front',
  'The Crushers', 'Havoc Squad', 'The Destroyers', 'Nightmare Front',
  'The Predators', 'Chaos Unit', 'The Terrors', 'Pressure Cookers',
];

function generateOLineUnit(tierConfig: TierConfig, usedNames: Set<string>): DraftLineUnit {
  const overall = randomInRange(tierConfig.overallRange[0], tierConfig.overallRange[1]);
  const salary = randomInRange(tierConfig.salaryRange[0], tierConfig.salaryRange[1]);

  // Pick unique name
  let name: string;
  let attempts = 0;
  do {
    name = pickRandom(OL_NAMES);
    attempts++;
  } while (usedNames.has(name) && attempts < 50);
  usedNames.add(name);

  const unit: OLineUnit = {
    id: generateId(),
    name,
    overall,
    passBlockRating: Math.min(99, Math.max(50, overall + randomInRange(-8, 8))),
    runBlockRating: Math.min(99, Math.max(50, overall + randomInRange(-8, 8))),
    personality: pickRandom(['Blue collar', 'Nasty streak', 'Technical', 'Physical', 'Veteran savvy']),
    captain: {
      firstName: pickRandom(DEF_FIRST_NAMES),
      lastName: pickRandom(LAST_NAMES),
      ego: randomInRange(25, 65),
      vice: randomInRange(15, 50),
    },
  };

  // OL doesn't generate cards directly - they modify
  const previewCards: Card[] = [];

  return {
    unit,
    type: 'OL',
    tier: tierConfig.tier,
    salary,
    tierColor: tierConfig.color,
    previewCards,
    cardCount: 0,
    keyRatings: [
      { name: 'PBK', value: unit.passBlockRating },
      { name: 'RBK', value: unit.runBlockRating },
      { name: 'OVR', value: unit.overall },
    ],
  };
}

function generateDLineUnit(tierConfig: TierConfig, usedNames: Set<string>): DraftLineUnit {
  const overall = randomInRange(tierConfig.overallRange[0], tierConfig.overallRange[1]);
  const salary = randomInRange(tierConfig.salaryRange[0], tierConfig.salaryRange[1]);

  let name: string;
  let attempts = 0;
  do {
    name = pickRandom(DL_NAMES);
    attempts++;
  } while (usedNames.has(name) && attempts < 50);
  usedNames.add(name);

  const unit: DLineUnit = {
    id: generateId(),
    name,
    overall,
    passRushRating: Math.min(99, Math.max(50, overall + randomInRange(-8, 8))),
    runStopRating: Math.min(99, Math.max(50, overall + randomInRange(-8, 8))),
    personality: pickRandom(['Relentless', 'Disciplined', 'Disruptive', 'Gap integrity', 'Attack mode']),
    captain: {
      firstName: pickRandom(DEF_FIRST_NAMES),
      lastName: pickRandom(LAST_NAMES),
      ego: randomInRange(35, 80),
      vice: randomInRange(20, 60),
    },
  };

  // Generate DL cards
  const previewCards = generateLineUnitCards(unit, 'DL');

  return {
    unit,
    type: 'DL',
    tier: tierConfig.tier,
    salary,
    tierColor: tierConfig.color,
    previewCards,
    cardCount: previewCards.length,
    keyRatings: [
      { name: 'PRS', value: unit.passRushRating },
      { name: 'RST', value: unit.runStopRating },
      { name: 'OVR', value: unit.overall },
    ],
  };
}

// =============================================================================
// POOL GENERATION
// =============================================================================

export interface PlayerPool {
  QB: DraftPlayer[];
  RB: DraftPlayer[];
  WR: DraftPlayer[];
  TE: DraftPlayer[];
  OL: DraftLineUnit[];
  DL: DraftLineUnit[];
  LB: DraftPlayer[];
  CB: DraftPlayer[];
  S: DraftPlayer[];
  ST: DraftPlayer[];
}

export function generatePlayerPool(): PlayerPool {
  const usedNames = new Set<string>();
  const usedUnitNames = new Set<string>();

  const pool: PlayerPool = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    OL: [],
    DL: [],
    LB: [],
    CB: [],
    S: [],
    ST: [],
  };

  // Generate players for each position
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'S', 'ST'];

  for (const position of positions) {
    const tiers = POSITION_TIERS[position];
    for (const tierConfig of tiers) {
      const count = PLAYERS_PER_TIER[tierConfig.tier];
      for (let i = 0; i < count; i++) {
        const draftPlayer = generatePlayer(position, tierConfig, usedNames);
        (pool[position] as DraftPlayer[]).push(draftPlayer);
      }
    }
    // Sort by overall descending
    (pool[position] as DraftPlayer[]).sort((a, b) => b.player.overall - a.player.overall);
  }

  // Generate OL units
  const olTiers = POSITION_TIERS['OL'];
  for (const tierConfig of olTiers) {
    const count = PLAYERS_PER_TIER[tierConfig.tier];
    for (let i = 0; i < count; i++) {
      pool.OL.push(generateOLineUnit(tierConfig, usedUnitNames));
    }
  }
  pool.OL.sort((a, b) => (b.unit as OLineUnit).overall - (a.unit as OLineUnit).overall);

  // Generate DL units
  const dlTiers = POSITION_TIERS['DL'];
  for (const tierConfig of dlTiers) {
    const count = PLAYERS_PER_TIER[tierConfig.tier];
    for (let i = 0; i < count; i++) {
      pool.DL.push(generateDLineUnit(tierConfig, usedUnitNames));
    }
  }
  pool.DL.sort((a, b) => (b.unit as DLineUnit).overall - (a.unit as DLineUnit).overall);

  return pool;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  POSITION_TIERS,
  PLAYERS_PER_TIER,
  getKeyRatingsForPosition,
};
