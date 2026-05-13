/**
 * Key Frame engine — branched pre-computation for the mid-play decision moment.
 *
 * Given a pass play and a defense, this runs simulatePlay() multiple times
 * with different pinned receivers (and a bail/throw-away branch), then
 * builds a KeyFramedPlay describing the available options and where to
 * draw their diegetic tap targets at the Key Frame tick.
 *
 * The simulator is deterministic up to ball-in-air, so the frames before the
 * Key Frame tick are effectively identical across branches — the UI plays
 * branch[0] up to the tick, pauses, and on tap swaps to the chosen branch.
 */

import type { Play, PlayerAssignment } from '../types/Play';
import type { DefensiveCard } from '../types/card.types';
import type { AnimationFrame } from '../types/PlayAnimation';
import {
  simulatePlay,
  type OffenseRatings,
  type DefenseRatings,
  type SimulationResult,
} from './PlaySimulator';
import type { KFIntentKind, KFOption, KFRisk, KeyFramedPlay } from '../types/keyFrame.types';

/**
 * Eligible receivers in priority order: WR1 (X), WR2 (Z), TE/Y, slot/H, RB.
 * The first three become READ / STANDARD / BOMB-risk options.
 * The RB (if present and running a route) becomes the CHECKDOWN.
 */
function selectKFReceivers(play: Play): {
  primary: PlayerAssignment | null;
  secondary: PlayerAssignment | null;
  bomb: PlayerAssignment | null;
  checkdown: PlayerAssignment | null;
} {
  const receivers = play.assignments.filter(
    a => a.route && a.route !== 'BLOCK' && a.canRunRoutes && a.positionSlot !== 'QB'
  );

  const findBySlot = (slots: string[]) =>
    receivers.find(r => slots.includes(r.positionSlot)) ?? null;

  // Try common slot names. Falls through to position order if the play doesn't have them.
  const wr1 = findBySlot(['X', 'WR1']);
  const wr2 = findBySlot(['Z', 'WR2']);
  const te = findBySlot(['Y', 'TE']);
  const slot = findBySlot(['H', 'SLOT']);
  const rb = findBySlot(['RB', 'FB']);

  // Primary read = play's first receiver if labeled, else WR1.
  const primary = wr1 ?? receivers[0] ?? null;

  // Secondary = whichever non-primary route runner makes sense as a working option.
  const secondary = (te ?? slot ?? wr2)
    && (te ?? slot ?? wr2) !== primary
    ? (te ?? slot ?? wr2)
    : (receivers.find(r => r !== primary) ?? null);

  // Bomb candidate = deepest route, or WR2 if no obvious deep guy.
  // We approximate "deep" by GO/POST/CORNER routes; otherwise pick the unused WR.
  const deepRoutes = receivers.filter(r =>
    r.route === 'GO' || r.route === 'POST' || r.route === 'CORNER' || r.route === 'COMEBACK'
  );
  const bomb = deepRoutes.find(r => r !== primary && r !== secondary)
    ?? deepRoutes[0]
    ?? wr2
    ?? null;

  return {
    primary,
    secondary: secondary && secondary !== primary ? secondary : null,
    bomb: bomb && bomb !== primary && bomb !== secondary ? bomb : null,
    checkdown: rb && rb !== primary && rb !== secondary && rb !== bomb ? rb : null,
  };
}

/**
 * Find the frame index where the QB is ready to throw — the natural Key Frame moment.
 * For a pass play, this is roughly 0.5s after the snap (or whenever pressure forces
 * the issue earlier). We scan the canonical branch's frames and pick the first
 * frame in DEVELOPING phase past the throw-ready threshold.
 */
function findKeyFrameTick(
  frames: AnimationFrame[],
  preSnapDurationMs: number,
  awarenessRating: number
): number {
  // Higher awareness QBs see the read sooner — they hit the KF a touch earlier
  // and get a wider window. Default rating 70 → +0ms; rating 90 → -100ms.
  // Base target pushed to preSnap + 900ms so routes have time to develop and
  // the player can actually see the play unfold before the freeze fires.
  const awarenessOffset = (70 - awarenessRating) * 5;
  const target = preSnapDurationMs + 900 + awarenessOffset;

  for (const f of frames) {
    if (f.phase === 'DEVELOPING' && f.timeMs >= target) {
      return f.timeMs;
    }
  }
  // Fallback: middle of the play.
  const last = frames[frames.length - 1]?.timeMs ?? 1500;
  return Math.min(target, last);
}

/**
 * Window size for the slo-mo tap window, scaled by QB awareness.
 * 70 awareness → 500ms. 90 awareness → 700ms. 50 awareness → 300ms.
 */
function windowMsForAwareness(awareness: number): number {
  // Bumped baseline up — the previous 500ms felt like panic-tap territory.
  // 70 awareness → 800ms, 90 → 1000ms, 50 → 600ms.
  const base = 800;
  const bonus = (awareness - 70) * 10;
  return Math.max(500, Math.min(1200, base + bonus));
}

/**
 * Read coverage at the KF moment to classify risk for a given target.
 * Returns the closest defender's distance (in field units) from that receiver.
 */
function defenderDistanceAt(frame: AnimationFrame, targetSlot: string): number {
  const player = frame.players.find(p => p.positionSlot === targetSlot);
  if (!player) return 100;
  let min = Infinity;
  for (const p of frame.players) {
    if (p.role !== 'DEFENDER') continue;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Risk classification for a target based on how covered it is at the KF tick.
 * Field units: ~2 units = 1 yard. <3 units = tight, 3–6 = contested, >6 = open.
 */
function classifyRisk(distance: number, intent: KFIntentKind): KFRisk {
  if (intent === 'BAIL') return 'SAFE';      // Bail is always safe (0 yards, no INT)
  if (intent === 'CHECKDOWN') return 'SAFE'; // Checkdown is structurally safer
  if (distance > 6) return 'SAFE';
  if (distance > 3) return 'STANDARD';
  return 'RISKY';
}

/**
 * Locate a player at a given timeMs in a frame buffer.
 */
function playerPositionAt(
  frames: AnimationFrame[],
  timeMs: number,
  slot: string
): { x: number; y: number } | null {
  // Find the frame at-or-before the given time.
  let chosen: AnimationFrame | null = null;
  for (const f of frames) {
    if (f.timeMs <= timeMs) chosen = f;
    else break;
  }
  if (!chosen) return null;
  const p = chosen.players.find(pl => pl.positionSlot === slot);
  return p ? { x: p.x, y: p.y } : null;
}

/**
 * Build a KeyFramedPlay for a pass play: pre-simulate up to four branches
 * (primary, bomb, checkdown, bail), pick the KF tick, and assemble options
 * with diegetic positions.
 */
export function buildKeyFramedPassPlay(
  play: Play,
  defenseCard: DefensiveCard,
  offenseRatings: OffenseRatings = {},
  defenseRatings: DefenseRatings = {}
): KeyFramedPlay {
  const receivers = selectKFReceivers(play);
  const awareness = offenseRatings.qbAccuracy ?? 70;

  // ---- Run branches ----
  // Pre-snap is configurable; we use the default 800ms here (matches simulator default).
  const preSnapDurationMs = 800;

  type PreOption = {
    id: string;
    intent: KFIntentKind;
    label: string;
    targetSlot: string | null;
    branch: SimulationResult;
  };

  const branches: PreOption[] = [];

  // Primary read
  if (receivers.primary) {
    branches.push({
      id: 'primary',
      intent: 'READ',
      label: receivers.primary.label || receivers.primary.positionSlot,
      targetSlot: receivers.primary.positionSlot,
      branch: simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {
        pinnedTargetReceiver: receivers.primary.positionSlot,
      }),
    });
  }

  // Bomb / deep shot
  if (receivers.bomb) {
    branches.push({
      id: 'bomb',
      intent: 'BOMB',
      label: 'Bomb!',
      targetSlot: receivers.bomb.positionSlot,
      branch: simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {
        pinnedTargetReceiver: receivers.bomb.positionSlot,
      }),
    });
  } else if (receivers.secondary) {
    // No deep guy — promote secondary to a working alternate
    branches.push({
      id: 'secondary',
      intent: 'READ',
      label: receivers.secondary.label || receivers.secondary.positionSlot,
      targetSlot: receivers.secondary.positionSlot,
      branch: simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {
        pinnedTargetReceiver: receivers.secondary.positionSlot,
      }),
    });
  }

  // Checkdown (RB if available)
  if (receivers.checkdown) {
    branches.push({
      id: 'checkdown',
      intent: 'CHECKDOWN',
      label: 'Check down',
      targetSlot: receivers.checkdown.positionSlot,
      branch: simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {
        pinnedTargetReceiver: receivers.checkdown.positionSlot,
      }),
    });
  }

  // Bail / throw-away (always available)
  branches.push({
    id: 'bail',
    intent: 'BAIL',
    label: 'Throw away',
    targetSlot: null,
    branch: simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {
      pinnedThrowAway: true,
    }),
  });

  // ---- Determine KF tick ----
  // Use the primary branch as the canonical timeline for finding the tick.
  const canonical = branches[0]?.branch ?? branches[branches.length - 1].branch;
  const keyFrameTickMs = findKeyFrameTick(canonical.frames, preSnapDurationMs, awareness);

  // ---- Resolve diegetic positions and risk for each option ----
  const options: KFOption[] = branches.map(b => {
    let pos: { x: number; y: number } | null = null;
    let distance = 100;

    if (b.targetSlot) {
      // Use the option's own branch frames to find where the target is at the KF tick.
      pos = playerPositionAt(b.branch.frames, keyFrameTickMs, b.targetSlot);

      // Use the canonical branch's frame for risk classification (defenders are
      // identical across branches at this tick, so it doesn't matter which we use).
      const kfFrame = canonical.frames.find(f => f.timeMs >= keyFrameTickMs)
        ?? canonical.frames[canonical.frames.length - 1];
      if (kfFrame) {
        distance = defenderDistanceAt(kfFrame, b.targetSlot);
      }
    } else {
      // Bail target — stable position near the QB's preferred sideline.
      const qbPos = playerPositionAt(canonical.frames, keyFrameTickMs, 'QB');
      if (qbPos) {
        pos = { x: qbPos.x < 50 ? 8 : 92, y: qbPos.y - 2 };
      }
    }

    return {
      id: b.id,
      intent: b.intent,
      label: b.label,
      targetSlot: b.targetSlot,
      fieldX: pos?.x ?? 50,
      fieldY: pos?.y ?? 50,
      risk: classifyRisk(distance, b.intent),
      branch: b.branch,
    };
  });

  // Default (timeout) option = primary read if available, else first option.
  const defaultOptionId = options.find(o => o.id === 'primary')?.id
    ?? options[0]?.id
    ?? 'bail';

  return {
    keyFrameTickMs,
    windowMs: windowMsForAwareness(awareness),
    options,
    defaultOptionId,
  };
}

// =============================================================================
// RUN PLAY KEY FRAME
// =============================================================================

/**
 * Find the ball carrier on a run play — the RB (or whoever has runAssignment
 * / isBallCarrier flagged).
 */
function findRunBallCarrier(play: Play): PlayerAssignment | null {
  return (
    play.assignments.find(a => a.isBallCarrier && a.runAssignment) ??
    play.assignments.find(a => a.runAssignment) ??
    play.assignments.find(a => a.positionSlot === 'RB') ??
    null
  );
}

/**
 * Build a 3-waypoint run path for a given lane variant. All variants share an
 * identical first waypoint (RB approaching LOS) so frames are byte-identical
 * across branches pre-Key-Frame and the buffer swap is seamless.
 *
 * Field convention: y > 50 is offensive backfield, y < 50 is past LOS into
 * defensive territory. Run paths move from high-y to low-y (downfield).
 */
function makeRunPath(
  startX: number,
  startY: number,
  dir: -1 | 1,
  variant: 'ASSIGNED' | 'BOUNCE' | 'CUTBACK'
): { x: number; y: number; delay: number }[] {
  // Shared approach — RB has the ball, near LOS, hasn't committed to a gap yet.
  const shared = { x: startX, y: startY - 5, delay: 250 };

  switch (variant) {
    case 'ASSIGNED':
      return [
        shared,
        { x: startX, y: startY - 15, delay: 400 },
        { x: startX, y: startY - 30, delay: 600 },
      ];
    case 'BOUNCE':
      return [
        shared,
        { x: clampX(startX + 18 * dir), y: startY - 12, delay: 450 },
        { x: clampX(startX + 25 * dir), y: startY - 28, delay: 700 },
      ];
    case 'CUTBACK':
      return [
        shared,
        { x: clampX(startX - 10 * dir), y: startY - 10, delay: 400 },
        { x: clampX(startX - 18 * dir), y: startY - 25, delay: 700 },
      ];
  }
}

/** Keep run-path X coordinates inside the field bounds. */
function clampX(x: number): number {
  return Math.max(8, Math.min(92, x));
}

/**
 * Build a KeyFramedPlay for a run play: pre-simulate three lane variants
 * (assigned, bounce, cutback) with a shared pre-LOS approach so the swap is
 * seamless. KF tick fires when the RB reaches the LOS approach waypoint.
 * Tap targets sit at each lane's commit point just past the LOS.
 */
export function buildKeyFramedRunPlay(
  play: Play,
  defenseCard: DefensiveCard,
  offenseRatings: OffenseRatings = {},
  defenseRatings: DefenseRatings = {}
): KeyFramedPlay {
  const carrier = findRunBallCarrier(play);
  // Run-side awareness — proxied off qbAccuracy until we wire RB/coach IQ.
  const awareness = offenseRatings.qbAccuracy ?? 70;
  const preSnapDurationMs = 800;

  // Defensive fallback — no ball carrier (shouldn't happen for real run plays).
  if (!carrier) {
    const lone = simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {});
    const fallback: KFOption = {
      id: 'assigned',
      intent: 'READ',
      label: 'Run',
      targetSlot: null,
      fieldX: 50,
      fieldY: 50,
      risk: 'STANDARD',
      branch: lone,
    };
    return {
      keyFrameTickMs: preSnapDurationMs + 750,
      windowMs: windowMsForAwareness(awareness),
      options: [fallback],
      defaultOptionId: 'assigned',
    };
  }

  const startX = carrier.startX;
  const startY = carrier.startY;
  const dir: -1 | 1 = carrier.runGap?.includes('LEFT') ? -1 : 1;

  // Three lane variants — risk classification is hardcoded for now; once we
  // can see the slice we'll switch to defender-distance-based classification
  // like the pass version does.
  const variants: Array<{
    id: string;
    intent: KFIntentKind;
    label: string;
    risk: KFRisk;
    variant: 'ASSIGNED' | 'BOUNCE' | 'CUTBACK';
  }> = [
    { id: 'assigned', intent: 'READ',      label: 'Hit it',   risk: 'STANDARD', variant: 'ASSIGNED' },
    { id: 'bounce',   intent: 'BOMB',      label: 'Bounce!',  risk: 'RISKY',    variant: 'BOUNCE' },
    { id: 'cutback',  intent: 'CHECKDOWN', label: 'Cut back', risk: 'SAFE',     variant: 'CUTBACK' },
  ];

  // ---- Run each branch with its lane-specific path ----
  const branches = variants.map(v => ({
    ...v,
    path: makeRunPath(startX, startY, dir, v.variant),
    branch: simulatePlay(play, defenseCard, offenseRatings, defenseRatings, {
      pinnedRunPath: makeRunPath(startX, startY, dir, v.variant),
    }),
  }));

  // Key Frame tick — when the RB reaches the shared approach waypoint.
  // generateOffensePath schedules the first run-path waypoint at
  // snapTime + 300 + delay = (preSnap + 200) + 300 + 250 = preSnap + 750.
  const keyFrameTickMs = preSnapDurationMs + 750;

  // ---- Build options with diegetic positions ----
  // Tap target sits at each lane's commit point (the 2nd waypoint), so the
  // player taps the gap they want the RB to commit to.
  const options: KFOption[] = branches.map(b => {
    const commit = b.path[1];
    return {
      id: b.id,
      intent: b.intent,
      label: b.label,
      targetSlot: null,
      fieldX: commit.x,
      fieldY: commit.y,
      risk: b.risk,
      branch: b.branch,
    };
  });

  return {
    keyFrameTickMs,
    windowMs: windowMsForAwareness(awareness),
    options,
    defaultOptionId: 'assigned',
  };
}

// =============================================================================
// DISPATCH
// =============================================================================

/**
 * Build a Key Frame play for any supported play type. Returns null for
 * play types that don't have a Key Frame mechanic yet (special teams, etc).
 */
export function buildKeyFramedPlay(
  play: Play,
  defenseCard: DefensiveCard,
  offenseRatings: OffenseRatings = {},
  defenseRatings: DefenseRatings = {}
): KeyFramedPlay | null {
  if (play.playType === 'PASS') {
    return buildKeyFramedPassPlay(play, defenseCard, offenseRatings, defenseRatings);
  }
  if (play.playType === 'RUN') {
    return buildKeyFramedRunPlay(play, defenseCard, offenseRatings, defenseRatings);
  }
  return null;
}
