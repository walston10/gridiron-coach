/**
 * Presentation copy for the verb loop — verdict stamps, tier slams, satirical
 * play-by-play, and defensive tell chips. Kept separate from the beat
 * components so the *voice* (messy, dirty, gritty, funny — the degenerate coach
 * fantasy) is tunable in one place. See docs/GAMEPLAY_LOOP_DESIGN.md §2.
 */

import type { MatchupVerdict, OutcomeTier } from '../../data/matchupMatrix';
import type { DefenseVerb } from '../../data/verbs';
import { DEFENSE_VERB_DEFS } from '../../data/verbs';
import type { ScoutGrade } from '../../engine/tells';

// =============================================================================
// REVEAL — verdict stamp (beat 3)
// =============================================================================

export interface VerdictStyle {
  label: string;
  /** Tailwind text/border/bg accent. */
  accent: string;
  glow: string;
}

export const VERDICT_STYLE: Record<MatchupVerdict, VerdictStyle> = {
  YOU_BEAT_THE_CALL: {
    label: 'YOU BEAT THE CALL',
    accent: 'text-emerald-300 border-emerald-400',
    glow: 'rgba(52,211,153,0.55)',
  },
  THEY_READ_YOU: {
    label: 'THEY READ YOU',
    accent: 'text-red-300 border-red-400',
    glow: 'rgba(248,113,113,0.55)',
  },
  DEAD_EVEN: {
    label: 'DEAD EVEN',
    accent: 'text-gray-200 border-gray-400',
    glow: 'rgba(209,213,219,0.4)',
  },
  THEY_BIT: {
    label: 'THEY BIT ON THE FAKE 🔥',
    accent: 'text-amber-300 border-amber-400',
    glow: 'rgba(251,191,36,0.65)',
  },
};

// =============================================================================
// AFTERMATH — tier slam stamp (beat 5)
// =============================================================================

export interface TierStamp {
  label: string;
  accent: string;
  bg: string;
}

const TIER_STAMP: Record<OutcomeTier, TierStamp> = {
  DISASTER: { label: 'GIVEAWAY', accent: '#fee2e2', bg: '#7f1d1d' },
  BUST: { label: 'BLOWN UP', accent: '#fecaca', bg: '#7c2d12' },
  STUFF: { label: 'STUFFED', accent: '#e5e7eb', bg: '#374151' },
  MODEST: { label: 'MOVING THE CHAINS', accent: '#e5e7eb', bg: '#1f2937' },
  SOLID: { label: 'CHUNK PLAY', accent: '#dbeafe', bg: '#1e3a8a' },
  BIG: { label: 'BIG GAINER', accent: '#ede9fe', bg: '#5b21b6' },
  HUGE: { label: 'HOUSE CALL', accent: '#fef3c7', bg: '#065f46' },
};

/** The stamp for a resolved tier, with a touchdown override. */
export function tierStamp(tier: OutcomeTier, touchdown: boolean): TierStamp {
  if (touchdown) return { label: 'TOUCHDOWN', accent: '#fef3c7', bg: '#047857' };
  return TIER_STAMP[tier];
}

// =============================================================================
// AFTERMATH — one line of play-by-play
// =============================================================================

const PLAY_BY_PLAY: Record<OutcomeTier, string[]> = {
  DISASTER: [
    'He threw it to the wrong colored jersey. Bold strategy.',
    'The ball is loose and the coach is already yelling.',
    'That one is going on the blooper reel. And the news.',
  ],
  BUST: [
    'Swallowed whole at the line. Nowhere to go.',
    'They read the mail before he sent it.',
    'Dead on arrival. Bring out the punt team.',
  ],
  STUFF: [
    'A whole yard. Frame it.',
    'Gets what the defense allowed and not an inch more.',
    'Grind it out. Nobody said it would be pretty.',
  ],
  MODEST: [
    'Falls forward for a respectable gain.',
    'Keeps the chains crawling. Serviceable.',
    'Not sexy, but it works.',
  ],
  SOLID: [
    'Hits the seam and takes a nice bite out of it.',
    'Now we are cooking. Big chunk.',
    'Finds grass and gets vertical.',
  ],
  BIG: [
    'He is loose in the second level — chunk of real estate!',
    'Turns the corner and the sideline opens up!',
    'That is a haymaker. The crowd is up.',
  ],
  HUGE: [
    'GONE. Nobody is catching him.',
    'He hit the jets and left the secondary for dead.',
    'Absolute track meet — take it to the house!',
  ],
};

/** Pick a play-by-play line for a tier. `roll` is a uniform value in [0, 1). */
export function playByPlay(tier: OutcomeTier, roll: number): string {
  const lines = PLAY_BY_PLAY[tier];
  return lines[Math.min(lines.length - 1, Math.floor(roll * lines.length))];
}

// =============================================================================
// READ — defensive tell chips, gated by scout grade
// =============================================================================

export interface DefenseTellChip {
  label: string;
  accent: string;
}

/**
 * Pre-snap tells for a defensive verb, revealed according to scout grade.
 * - A: exact call. B: run/pass lean + heat. C: heat only. D: nothing.
 * ROBBER is deliberately masked below an A grade — the gamble should feel risky.
 */
export function defenseTells(verb: DefenseVerb, grade: ScoutGrade): DefenseTellChip[] {
  if (grade === 'D') return [];

  const heat: DefenseTellChip = { label: 'HEAT', accent: 'bg-orange-900/60 text-orange-300' };
  const box: DefenseTellChip = { label: 'STACKED BOX', accent: 'bg-red-900/60 text-red-300' };
  const man: DefenseTellChip = { label: 'MAN', accent: 'bg-blue-900/60 text-blue-300' };
  const deep: DefenseTellChip = { label: 'DEEP', accent: 'bg-indigo-900/60 text-indigo-300' };
  const mystery: DefenseTellChip = { label: '???', accent: 'bg-gray-800 text-gray-400' };

  switch (verb) {
    case 'SELL_OUT':
      if (grade === 'A') return [box, heat];
      if (grade === 'B') return [box];
      return [heat]; // C: you can feel the run commit
    case 'BLITZ':
      return grade === 'C' ? [heat] : [heat, man];
    case 'LOCKDOWN':
      if (grade === 'C') return [];
      return [man];
    case 'UMBRELLA':
      if (grade === 'C') return [];
      return [deep];
    case 'ROBBER':
      return grade === 'A' ? [mystery, heat] : [mystery];
  }
}

/** Human label for a defensive verb (delegates to the shared def). */
export function defenseVerbLabel(verb: DefenseVerb): string {
  return DEFENSE_VERB_DEFS[verb].label;
}
