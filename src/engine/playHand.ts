/**
 * Play hand generator — produces the per-drive "hand of cards" the player
 * picks from.
 *
 * Shape: 3 safety plays (always in hand) + 5 rotating plays drawn from
 * the wider playbook. Refreshed each drive so situational variety happens
 * but the player always has reliable fallbacks.
 */

import type { Play } from '../types/Play';
import { safetyPlays, rotatingPool } from '../data/playApproach';

export interface PlayHand {
  /** The 3 safety plays — always available. */
  safety: Play[];
  /** The 5 rotating plays for this drive only. */
  rotating: Play[];
}

/**
 * Generate a fresh hand for a drive. The 3 safety plays are always the
 * same; the 5 rotating plays are drawn at random from the rotating pool
 * (without replacement). If the rotating pool has fewer than 5 plays,
 * the hand size shrinks accordingly — never duplicate.
 */
export function dealDriveHand(rotatingSize: number = 5): PlayHand {
  const safety = safetyPlays();
  const pool = [...rotatingPool()];

  // Fisher-Yates partial shuffle to pull the top N.
  const rotating: Play[] = [];
  const take = Math.min(rotatingSize, pool.length);
  for (let i = 0; i < take; i++) {
    const idx = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[idx]] = [pool[idx], pool[i]];
    rotating.push(pool[i]);
  }

  return { safety, rotating };
}

/** All plays currently available to call. */
export function handAll(hand: PlayHand): Play[] {
  return [...hand.safety, ...hand.rotating];
}
