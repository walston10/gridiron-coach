/**
 * Presentation copy for the verb loop — verdict stamps, tier slams, satirical
 * play-by-play, and defensive tell chips. Kept separate from the beat
 * components so the *voice* (messy, dirty, gritty, funny — the degenerate coach
 * fantasy) is tunable in one place. See docs/GAMEPLAY_LOOP_DESIGN.md §2.
 */

import type { MatchupVerdict, OutcomeTier } from '../../data/matchupMatrix';
import { MATCHUP_OUTCOME } from '../../data/matchupMatrix';
import type { DefenseVerb, OffenseVerb } from '../../data/verbs';
import { DEFENSE_VERB_DEFS } from '../../data/verbs';
import type { ScoutGrade } from '../../engine/tells';
import type { CardRarity } from '../../types/card.types';
import { RARITY_COLORS } from '../../types/card.types';
import type { SpotlightCard } from '../../engine/spotlightGenerator';

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

// =============================================================================
// DEFENSE POSSESSIONS — offensive tells + defense-POV verdicts/stamps (§7)
// =============================================================================

/**
 * Pre-snap OFFENSIVE tells (formation / personnel / motion), gated by scout
 * grade — the thin mirror of defenseTells for player-defense possessions.
 */
export function offenseTells(verb: OffenseVerb, grade: ScoutGrade): DefenseTellChip[] {
  if (grade === 'D') return [];

  const heavy: DefenseTellChip = { label: 'HEAVY SET', accent: 'bg-red-900/60 text-red-300' };
  const iform: DefenseTellChip = { label: 'I-FORM', accent: 'bg-red-900/60 text-red-300' };
  const spread: DefenseTellChip = { label: 'SPREAD', accent: 'bg-blue-900/60 text-blue-300' };
  const empty: DefenseTellChip = { label: 'EMPTY', accent: 'bg-indigo-900/60 text-indigo-300' };
  const splits: DefenseTellChip = { label: 'DEEP SPLITS', accent: 'bg-indigo-900/60 text-indigo-300' };
  const motion: DefenseTellChip = { label: 'JET MOTION', accent: 'bg-fuchsia-900/60 text-fuchsia-300' };
  const runLook: DefenseTellChip = { label: 'RUN LOOK', accent: 'bg-red-900/40 text-red-300' };
  const passLook: DefenseTellChip = { label: 'PASS LOOK', accent: 'bg-blue-900/40 text-blue-300' };
  const mystery: DefenseTellChip = { label: '???', accent: 'bg-gray-800 text-gray-400' };

  switch (verb) {
    case 'HAMMER':
      if (grade === 'A') return [heavy, iform];
      if (grade === 'B') return [heavy];
      return [runLook];
    case 'DINK':
      if (grade === 'A') return [spread, motion];
      if (grade === 'B') return [spread];
      return [passLook];
    case 'AIR_IT_OUT':
      if (grade === 'A') return [empty, splits];
      if (grade === 'B') return [splits];
      return [passLook];
    case 'TRICK_EM':
      if (grade === 'A') return [motion, mystery];
      if (grade === 'B') return [motion];
      return [mystery];
  }
}

/**
 * The reveal verdict from the DEFENSE's point of view. Reuses the shared
 * matchup outcome table (offense-relative) and flips it. A correct ROBBER guess
 * overrides everything with the jackpot stamp.
 */
export function defenseVerdictStyle(
  offense: OffenseVerb,
  defense: DefenseVerb,
  robberHit: boolean,
): VerdictStyle {
  if (robberHit) {
    return {
      label: 'CALLED IT 🎯',
      accent: 'text-amber-300 border-amber-400',
      glow: 'rgba(251,191,36,0.65)',
    };
  }
  const outcome = MATCHUP_OUTCOME[offense][defense];
  if (outcome === 'LOSE') {
    // Offense lost the read → defense won it.
    return {
      label: 'YOU SNIFFED IT OUT',
      accent: 'text-emerald-300 border-emerald-400',
      glow: 'rgba(52,211,153,0.55)',
    };
  }
  if (outcome === 'WIN') {
    return {
      label: 'THEY GOT YOU',
      accent: 'text-red-300 border-red-400',
      glow: 'rgba(248,113,113,0.55)',
    };
  }
  return { label: 'DEAD EVEN', accent: 'text-gray-200 border-gray-400', glow: 'rgba(209,213,219,0.4)' };
}

/** The aftermath tier stamp from the DEFENSE's point of view. */
export function defenseTierStamp(tier: OutcomeTier, touchdownAllowed: boolean): TierStamp {
  if (touchdownAllowed) return { label: 'TOUCHDOWN ALLOWED', accent: '#fee2e2', bg: '#7f1d1d' };
  const map: Record<OutcomeTier, TierStamp> = {
    DISASTER: { label: 'TAKEAWAY!', accent: '#fef3c7', bg: '#065f46' },
    BUST: { label: 'BLOWN UP', accent: '#d1fae5', bg: '#047857' },
    STUFF: { label: 'STONEWALLED', accent: '#d1fae5', bg: '#065f46' },
    MODEST: { label: "HELD 'EM SHORT", accent: '#e5e7eb', bg: '#1f2937' },
    SOLID: { label: 'GAVE GROUND', accent: '#fef9c3', bg: '#a16207' },
    BIG: { label: 'GASHED', accent: '#fed7aa', bg: '#9a3412' },
    HUGE: { label: 'TORCHED', accent: '#fee2e2', bg: '#7f1d1d' },
  };
  return map[tier];
}

const DEFENSE_PBP: Record<OutcomeTier, string[]> = {
  DISASTER: ['Picked it off! Ball game momentum swing.', 'Strip-sack — your guys are feasting.', 'They coughed it up and you pounced.'],
  BUST: ['Buried in the backfield. Get off the field.', 'Nowhere to throw, nowhere to run. Suffocating.', 'You blew up the whole thing.'],
  STUFF: ['Met him at the line. Not today.', 'Gang tackle for nothing. Wall of bodies.', 'Stood him straight up.'],
  MODEST: ["Bent but didn't break. Live to fight.", 'Short of the sticks. Force the issue.', 'Gave up a little, kept the lid on.'],
  SOLID: ['They moved the chains on you. Tighten up.', 'A chunk. That one stings.', 'Missed a fit and they made you pay.'],
  BIG: ['They ripped off a big one. Woof.', 'Blown coverage — that hurt.', 'Somebody lost contain. Big gain.'],
  HUGE: ['Torched deep. Get the fire department.', 'They hit the home run over the top.', 'Nobody home. That is a disaster.'],
};

/** One line of defense-POV play-by-play. `roll` is a uniform value in [0, 1). */
export function defensePlayByPlay(tier: OutcomeTier, roll: number): string {
  const lines = DEFENSE_PBP[tier];
  return lines[Math.min(lines.length - 1, Math.floor(roll * lines.length))];
}

// =============================================================================
// SPOTLIGHT cards (§3.2)
// =============================================================================

export function rarityLabel(rarity: CardRarity): string {
  return rarity.charAt(0) + rarity.slice(1).toLowerCase();
}

export function rarityColor(rarity: CardRarity): string {
  return RARITY_COLORS[rarity];
}

/** The ego-hook stamp shown on a Spotlight card, sized to the delivered bonus. */
export function spotlightBonusStamp(effectiveShift: number): string {
  if (effectiveShift >= 0.95) return '🔥 +1 TIER';
  if (effectiveShift >= 0.5) return '▲ BIG EDGE';
  if (effectiveShift > 0) return '▲ EDGE';
  return '— SULKING';
}

/** A between-drive event line when a neglected player's morale finally cracks. */
export function moraleHitLine(card: SpotlightCard): string {
  const n = card.shortName;
  switch (card.trait) {
    case 'DIVA':
      return `${n} is on the sideline phone with his agent. Great.`;
    case 'MEDIA_DARLING':
      return `${n} just subtweeted the play-caller. That's you.`;
    case 'TROUBLEMAKER':
      return `${n} "accidentally" flipped the Gatorade table.`;
    case 'PARTY_ANIMAL':
      return `${n} stopped trying two series ago. Can you blame him?`;
    case 'MERCENARY':
      return `${n} wants to know what he's even getting paid for.`;
    case 'LEADER':
      return `${n} pulled the offense aside. Not a happy speech.`;
    default:
      return `${n} is heated — he's been ignored all drive.`;
  }
}
