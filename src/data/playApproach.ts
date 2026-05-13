/**
 * Play approach tagging — maps DEFAULT_PLAYS into the offensive approach
 * tiers (RUN / BALANCED / PASS / TRICK) and marks the three "safety" plays
 * that always appear in the player's hand.
 *
 * Used by the playHand generator and the 3-tier card stack UI. Decoupled
 * from the Play type so adding/changing approach tags doesn't churn data.
 */

import { DEFAULT_PLAYS } from './defaultPlays';
import type { Play } from '../types/Play';

export type OffensiveApproach = 'RUN' | 'BALANCED' | 'PASS' | 'TRICK';

/** Maps a play ID to its primary approach bucket. */
const APPROACH_BY_ID: Record<string, OffensiveApproach> = {
  // North-south runs — straight ahead, low variance.
  'default-hb-dive':     'RUN',
  'default-power-run':   'RUN',
  'default-draw-play':   'RUN',

  // Outside / quick-game / safety-valve plays — balanced tempo, mid-range.
  'default-hb-sweep':    'BALANCED',
  'default-curl-flat':   'BALANCED',
  'default-hb-screen':   'BALANCED',
  'default-quick-out':   'BALANCED',

  // Drop-back pass concepts.
  'default-slants':         'PASS',
  'default-mesh-concept':   'PASS',
  'default-four-verticals': 'PASS',
  'default-post-corner':    'PASS',
};

/**
 * Plays the offense can ALWAYS call — the reliable safety net. Three slots:
 * one safe run, one safe short pass, one screen. Don't rotate out of hand.
 */
const SAFETY_PLAY_IDS = new Set<string>([
  'default-hb-dive',     // Safe run
  'default-quick-out',   // Safe short pass
  'default-hb-screen',   // Screen / checkdown valve
]);

export function approachFor(play: Play): OffensiveApproach {
  return APPROACH_BY_ID[play.id] ?? (play.playType === 'RUN' ? 'RUN' : 'PASS');
}

export function isSafetyPlay(play: Play): boolean {
  return SAFETY_PLAY_IDS.has(play.id);
}

/** All plays tagged with a given approach. */
export function playsForApproach(approach: OffensiveApproach): Play[] {
  return DEFAULT_PLAYS.filter(p => approachFor(p) === approach);
}

/** All safety plays in fixed order. */
export function safetyPlays(): Play[] {
  return DEFAULT_PLAYS.filter(p => isSafetyPlay(p));
}

/** All non-safety plays — these are what rotate through your drive hand. */
export function rotatingPool(): Play[] {
  return DEFAULT_PLAYS.filter(p => !isSafetyPlay(p));
}

/** Human label for an approach. */
export function approachLabel(approach: OffensiveApproach): string {
  switch (approach) {
    case 'RUN':      return 'Run';
    case 'BALANCED': return 'Balanced';
    case 'PASS':     return 'Pass';
    case 'TRICK':    return 'Trick';
  }
}

/** Short tagline for the approach card. */
export function approachTagline(approach: OffensiveApproach): string {
  switch (approach) {
    case 'RUN':      return 'North-south, low variance';
    case 'BALANCED': return 'Quick game / outside';
    case 'PASS':     return 'Drop-back concepts';
    case 'TRICK':    return 'Misdirection (coming soon)';
  }
}
