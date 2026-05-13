/**
 * Key Frame types — the slo-mo "moment of truth" mid-snap where the player
 * picks one of several pre-simulated branches.
 *
 * Architecture: simulatePlay() runs N times with different pinned decisions.
 * The frames are identical up to the Key Frame tick (defenders don't react to
 * QB intent until ball-in-air). At the Key Frame tick, playback pauses, the
 * player taps an option, and playback resumes from the chosen branch's frames.
 */

import type { SimulationResult } from '../engine/PlaySimulator';

/**
 * High-level intents the player can pick from at a Key Frame.
 * Pulled from a master pool based on what the simulated play-state shows.
 */
export type KFIntentKind =
  | 'READ'      // Throw to your assigned read or progression target
  | 'CHECKDOWN' // Safe dump-off to the underneath option
  | 'BOMB'      // Force it deep, boom-or-bust
  | 'BAIL';     // Throw-away to the sideline

/** Risk classification used for color coding the tap target. */
export type KFRisk = 'SAFE' | 'STANDARD' | 'RISKY';

/**
 * One option presented at the Key Frame.
 * `targetSlot` is the position slot the simulator pinned for this branch
 * (or null for the bail / throw-away branch).
 */
export interface KFOption {
  id: string;
  intent: KFIntentKind;
  label: string;          // Short text shown to player ("Hit X", "Check down", "Bomb!")
  targetSlot: string | null;
  /** Field coordinates (0–100) at the Key Frame tick — used to draw the tap target. */
  fieldX: number;
  fieldY: number;
  /** SAFE / STANDARD / RISKY — drives tap target color. */
  risk: KFRisk;
  /** The fully-simulated branch this option produces if chosen. */
  branch: SimulationResult;
}

/**
 * Result of pre-computing all branches for a play.
 * Consumers play frames up to `keyFrameTickMs`, pause, present `options`,
 * then on tap swap to the chosen option's `branch.frames`.
 */
export interface KeyFramedPlay {
  /** Time (ms since sim start) at which to pause for the Key Frame decision. */
  keyFrameTickMs: number;
  /** Width of the slo-mo decision window in milliseconds (rating-driven). */
  windowMs: number;
  /** The available options at this Key Frame. */
  options: KFOption[];
  /** The default branch (used if the player times out). */
  defaultOptionId: string;
}
