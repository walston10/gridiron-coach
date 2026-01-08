/**
 * Owner Types and Archetypes
 *
 * Three owner personalities that modify how the game responds to your decisions.
 * Each owner has different priorities, multipliers, and patience recovery methods.
 */

// =============================================================================
// PATIENCE RECOVERY CONDITIONS
// =============================================================================

export interface PatienceRecovery {
  // Common
  win?: number;
  playoffBerth?: number;

  // Tex-specific
  mediaAppearance?: number;
  controversy?: number;
  primetimeWin?: number;

  // Hale-specific
  cleanWeek?: number;
  charityEvent?: number;
  positivePress?: number;

  // Kessler-specific
  underBudget?: number;
  merchandiseBump?: number;
}

// =============================================================================
// OWNER MOOD
// =============================================================================

export type OwnerMood = 'FURIOUS' | 'IMPATIENT' | 'NEUTRAL' | 'PLEASED' | 'ECSTATIC';

export function getOwnerMood(patience: number): OwnerMood {
  if (patience < 25) return 'FURIOUS';
  if (patience < 50) return 'IMPATIENT';
  if (patience < 75) return 'NEUTRAL';
  if (patience < 90) return 'PLEASED';
  return 'ECSTATIC';
}

export const OWNER_MOOD_COLORS: Record<OwnerMood, string> = {
  FURIOUS: '#ef4444',     // Red
  IMPATIENT: '#f97316',   // Orange
  NEUTRAL: '#eab308',     // Yellow
  PLEASED: '#22c55e',     // Green
  ECSTATIC: '#3b82f6',    // Blue
};

// =============================================================================
// OWNER INTERFACE
// =============================================================================

export interface Owner {
  id: string;
  name: string;
  nickname: string;
  description: string;
  portrait: string;  // Image path or emoji for now

  // Multipliers for meter changes (0.5 to 2.0)
  reputationMod: number;
  cultureMod: number;
  imageMod: number;
  riskMod: number;

  // How much they care about specific things
  recordWeight: number;    // Patience loss per loss
  moneyWeight: number;     // How much overspending hurts

  // Slush fund
  annualBudget: number;
  winBonus: number;        // Extra $ per win

  // Patience recovery conditions
  patienceRecovery: PatienceRecovery;

  // Win expectation (affects patience changes)
  winExpectation?: 'REBUILD' | 'MAINTAIN' | 'CONTEND';

  // Flavor
  catchphrase: string;
  angryQuote: string;
  happyQuote: string;
}

// =============================================================================
// THREE OWNER ARCHETYPES
// =============================================================================

export const OWNER_TEX: Owner = {
  id: 'tex',
  name: 'Tex Morgan',
  nickname: 'Big Oil',
  description: 'Win or lose, he wants to be on SportsCenter. Controversy is just free advertising.',
  portrait: '🤠',

  // Doesn't care about being clean, LOVES attention
  reputationMod: 0.5,
  cultureMod: 0.75,
  imageMod: 1.5,
  riskMod: 0.5,

  recordWeight: 1.0,
  moneyWeight: 0.5,

  annualBudget: 8000000,
  winBonus: 100000,

  patienceRecovery: {
    mediaAppearance: 10,
    controversy: 5,
    primetimeWin: 15,
    playoffBerth: 20,
    win: 5,
  },

  catchphrase: "If they ain't talkin' about us, we ain't doin' it right.",
  angryQuote: "Son, I didn't get rich by being invisible. Fix this.",
  happyQuote: "Ha! Did you see the ratings? They can't look away!",
};

export const OWNER_HALE: Owner = {
  id: 'hale',
  name: 'Catherine Hale',
  nickname: 'The Senator',
  description: 'Every move is calculated for her political future. Squeaky clean optics are non-negotiable.',
  portrait: '👩‍💼',

  // Obsessed with clean image and perception
  reputationMod: 1.75,
  cultureMod: 1.5,
  imageMod: 2.0,
  riskMod: 1.5,

  recordWeight: 1.25,
  moneyWeight: 1.25,

  annualBudget: 4000000,
  winBonus: 50000,

  patienceRecovery: {
    cleanWeek: 5,
    charityEvent: 10,
    positivePress: 10,
    playoffBerth: 15,
    win: 3,
  },

  catchphrase: "We're not just building a team. We're building a legacy.",
  angryQuote: "Do you have any idea what this does to my approval ratings?",
  happyQuote: "Excellent. The focus groups will love this.",
};

export const OWNER_KESSLER: Owner = {
  id: 'kessler',
  name: 'Warren Kessler',
  nickname: 'The Accountant',
  description: 'Everything is ROI. Including you. Every dollar is tracked, every player is a line item.',
  portrait: '🧮',

  // Only cares about money and results
  reputationMod: 0.75,
  cultureMod: 0.5,
  imageMod: 0.5,
  riskMod: 1.25,

  recordWeight: 1.5,
  moneyWeight: 2.0,

  annualBudget: 2000000,
  winBonus: 200000,

  patienceRecovery: {
    underBudget: 10,
    win: 8,
    playoffBerth: 25,
    merchandiseBump: 5,
  },

  catchphrase: "Show me the numbers.",
  angryQuote: "This line item isn't producing returns. You're the line item.",
  happyQuote: "Profit margins are up. Keep doing whatever you're doing.",
};

// =============================================================================
// OWNER LOOKUP
// =============================================================================

export const OWNERS: Record<string, Owner> = {
  tex: OWNER_TEX,
  hale: OWNER_HALE,
  kessler: OWNER_KESSLER,
};

export const OWNER_LIST: Owner[] = [OWNER_TEX, OWNER_HALE, OWNER_KESSLER];

export function getOwnerById(id: string): Owner | undefined {
  return OWNERS[id];
}
