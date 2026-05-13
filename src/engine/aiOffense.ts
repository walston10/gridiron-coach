/**
 * AI offense — abstract simulation of an opponent's drive.
 *
 * Generates a sequence of play outcomes (yards + result) without running the
 * full PlaySimulator. Used between player drives so the opponent can score
 * back. The output is a play-by-play list the UI can stream with delays
 * to give the drive some texture.
 *
 * Pure-ish: uses Math.random for variance. Same starting position can
 * produce different drives on repeat calls.
 */

import { applyPlayOutcome, formatBallOn, startDrive, type DriveState } from './driveState';
import type { PlayOutcome } from '../types/PlayAnimation';

/** A single play in the opponent's drive, for UI streaming. */
export interface OpponentPlay {
  /** Down/distance/spot snapshot before the play. */
  prelude: string;
  /** Short text describing what happened. */
  description: string;
  /** Net yards gained (negative for losses). */
  yardsGained: number;
  /** Play result type (mirrors PlayOutcome.result). Drives clock-burn math. */
  result: PlayOutcome['result'];
  /** The drive state AFTER this play, for the UI. */
  stateAfter: DriveState;
}

/** Final result of a simulated opponent drive. */
export interface OpponentDriveResult {
  /** Each play, in order. */
  plays: OpponentPlay[];
  /** Points scored on this drive (0, 3, or 7). */
  pointsScored: number;
  /** Final drive-over reason. */
  endReason: NonNullable<DriveState['driveOverReason']>;
  /** Plain-English summary line. */
  summary: string;
  /**
   * Where the next player drive should start, in player-perspective yardline
   * (own goal = 0, opp goal = 100). Defaults to own 25.
   */
  playerStartsAt: number;
}

/** Difficulty knob — scales opponent's per-play yardage upward. */
export interface OpponentParams {
  difficulty: number;  // 0..1. 0.5 = ~average team. 0.8 = elite.
}

const DEFAULT_PARAMS: OpponentParams = { difficulty: 0.55 };

type PlayKind = 'INSIDE_RUN' | 'OUTSIDE_RUN' | 'SHORT_PASS' | 'MEDIUM_PASS' | 'DEEP_PASS';

/**
 * Pick a play type for the AI offense based on situation.
 * Mirrors what a real OC would do at a glance.
 */
function pickPlayKind(state: DriveState): PlayKind {
  const long = state.yardsToGo >= 8;
  const short = state.yardsToGo <= 3;
  const late = state.down >= 3;

  // Build weighted roll table
  const weights: Record<PlayKind, number> = {
    INSIDE_RUN: 25,
    OUTSIDE_RUN: 20,
    SHORT_PASS: 25,
    MEDIUM_PASS: 20,
    DEEP_PASS: 10,
  };

  if (short) {
    weights.INSIDE_RUN += 25;
    weights.OUTSIDE_RUN += 10;
    weights.SHORT_PASS += 10;
    weights.MEDIUM_PASS -= 10;
    weights.DEEP_PASS -= 5;
  }
  if (long) {
    weights.INSIDE_RUN -= 15;
    weights.OUTSIDE_RUN -= 5;
    weights.MEDIUM_PASS += 15;
    weights.DEEP_PASS += 15;
  }
  if (late) {
    weights.SHORT_PASS += 10;
    weights.MEDIUM_PASS += 10;
  }

  const total = Object.values(weights).reduce((a, b) => a + Math.max(0, b), 0);
  let roll = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) {
    const ww = Math.max(0, w);
    roll -= ww;
    if (roll <= 0) return k as PlayKind;
  }
  return 'SHORT_PASS';
}

/**
 * Sample yards gained for a play kind. Returns a PlayOutcome the drive
 * engine can apply directly. Has a small chance of turnover on passes.
 */
function samplePlayOutcome(kind: PlayKind, params: OpponentParams): PlayOutcome {
  const d = params.difficulty;          // 0..1
  const lift = (d - 0.5) * 6;           // ±3 yards from average

  // Helpers
  const gauss = (mean: number, stddev: number) => {
    // Box-Muller, simplified
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + n * stddev;
  };

  switch (kind) {
    case 'INSIDE_RUN': {
      const yards = Math.round(gauss(3.5 + lift * 0.5, 2.5));
      if (Math.random() < 0.02) return { result: 'FUMBLE', yardsGained: Math.max(-2, yards) };
      return { result: 'RUSH', yardsGained: Math.max(-3, Math.min(25, yards)) };
    }
    case 'OUTSIDE_RUN': {
      const yards = Math.round(gauss(4.5 + lift * 0.5, 4));
      if (Math.random() < 0.02) return { result: 'FUMBLE', yardsGained: Math.max(-3, yards) };
      return { result: 'RUSH', yardsGained: Math.max(-5, Math.min(35, yards)) };
    }
    case 'SHORT_PASS': {
      if (Math.random() < 0.25) return { result: 'INCOMPLETE', yardsGained: 0 };
      if (Math.random() < 0.02) return { result: 'INTERCEPTION', yardsGained: 0 };
      const yards = Math.round(gauss(6 + lift, 3));
      return { result: 'COMPLETE', yardsGained: Math.max(0, Math.min(20, yards)) };
    }
    case 'MEDIUM_PASS': {
      if (Math.random() < 0.40) return { result: 'INCOMPLETE', yardsGained: 0 };
      if (Math.random() < 0.04) return { result: 'INTERCEPTION', yardsGained: 0 };
      // Sack possibility
      if (Math.random() < 0.07) return { result: 'SACK', yardsGained: -Math.round(2 + Math.random() * 5) };
      const yards = Math.round(gauss(11 + lift, 5));
      return { result: 'COMPLETE', yardsGained: Math.max(0, Math.min(35, yards)) };
    }
    case 'DEEP_PASS': {
      if (Math.random() < 0.60) return { result: 'INCOMPLETE', yardsGained: 0 };
      if (Math.random() < 0.06) return { result: 'INTERCEPTION', yardsGained: 0 };
      if (Math.random() < 0.10) return { result: 'SACK', yardsGained: -Math.round(4 + Math.random() * 6) };
      const yards = Math.round(gauss(22 + lift, 8));
      return { result: 'COMPLETE', yardsGained: Math.max(8, Math.min(60, yards)) };
    }
  }
}

/** Map a play kind to a short verb for the play-by-play feed. */
function describeKind(kind: PlayKind, outcome: PlayOutcome): string {
  const yd = outcome.yardsGained;
  const ySfx = yd === 0 ? 'no gain'
    : yd > 0 ? `+${yd}`
    : `${yd}`;

  if (outcome.result === 'INCOMPLETE') return `${kind === 'DEEP_PASS' ? 'Deep ball' : 'Pass'} — incomplete`;
  if (outcome.result === 'INTERCEPTION') return `${kind === 'DEEP_PASS' ? 'Deep pass' : 'Pass'} — INTERCEPTED`;
  if (outcome.result === 'FUMBLE') return `${kind} — FUMBLE LOST`;
  if (outcome.result === 'SACK') return `Sacked ${ySfx}`;
  switch (kind) {
    case 'INSIDE_RUN':   return `Inside run, ${ySfx}`;
    case 'OUTSIDE_RUN':  return `Outside run, ${ySfx}`;
    case 'SHORT_PASS':   return `Short pass, ${ySfx}`;
    case 'MEDIUM_PASS':  return `Pass complete, ${ySfx}`;
    case 'DEEP_PASS':    return `Deep ball, ${ySfx}`;
  }
}

/**
 * Decide whether the opponent goes for it on 4th down (vs. punting/kicking FG).
 * Very crude — go inside opponent's 35 (kick FG), go for it on short yardage
 * in opponent territory, otherwise punt.
 */
function fourthDownChoice(state: DriveState): 'GO' | 'PUNT' | 'FG' {
  // ballOn is from opponent's own goal (0..100), so high = in player's territory.
  const fgDistance = (100 - state.ballOn) + 17;
  if (fgDistance <= 50 && state.yardsToGo >= 2) return 'FG';
  if (state.ballOn >= 60 && state.yardsToGo <= 2) return 'GO';
  if (state.ballOn >= 75 && state.yardsToGo <= 5) return 'GO';
  return 'PUNT';
}

/**
 * Simulate a full opponent drive starting at the given yardline.
 */
export function simulateOpponentDrive(
  startingYardline: number = 25,
  params: OpponentParams = DEFAULT_PARAMS,
  maxPlays: number = 16
): OpponentDriveResult {
  let state: DriveState = startDrive(startingYardline);
  const plays: OpponentPlay[] = [];

  while (!state.driveOver && plays.length < maxPlays) {
    // 4th-down decision before the play.
    if (state.down === 4) {
      const choice = fourthDownChoice(state);
      if (choice === 'FG') {
        const fgDistance = (100 - state.ballOn) + 17;
        const successRate = fgDistance <= 35 ? 0.95
          : fgDistance <= 45 ? 0.78
          : fgDistance <= 55 ? 0.55
          : 0.30;
        const made = Math.random() < successRate;
        const before = `${describeDown(state)}`;
        state = {
          ...state,
          driveOver: true,
          driveOverReason: 'FIELD_GOAL',
          score: made ? state.score + 3 : state.score,
          lastPlaySummary: made
            ? `Field goal good (${fgDistance} yards)`
            : `Field goal NO GOOD (${fgDistance} yards)`,
        };
        plays.push({
          prelude: before,
          description: state.lastPlaySummary!,
          yardsGained: 0,
          result: 'INCOMPLETE',  // FG attempts have no clock-burn impact (drive over)
          stateAfter: state,
        });
        break;
      }
      if (choice === 'PUNT') {
        const before = `${describeDown(state)}`;
        state = {
          ...state,
          driveOver: true,
          driveOverReason: 'PUNT',
          lastPlaySummary: 'Punted',
        };
        plays.push({
          prelude: before,
          description: 'Punt — ball flips to you',
          yardsGained: 0,
          result: 'INCOMPLETE',
          stateAfter: state,
        });
        break;
      }
      // else GO — fall through to a regular snap.
    }

    const kind = pickPlayKind(state);
    const outcome = samplePlayOutcome(kind, params);
    const before = describeDown(state);
    const afterApply = applyPlayOutcome(state, outcome);
    plays.push({
      prelude: before,
      description: describeKind(kind, outcome),
      yardsGained: outcome.yardsGained,
      result: outcome.result,
      stateAfter: afterApply,
    });
    state = afterApply;
  }

  // Determine where the player gets the ball back.
  let playerStartsAt = 25;
  if (state.driveOverReason === 'PUNT') {
    // Crude: opponent punts ~40 yards. Player gets ball at (their 25..40-ish).
    const puntDistance = 35 + Math.round(Math.random() * 15);
    // Opponent's ballOn (from their own goal) + puntDistance = where ball lands.
    // Player perspective is opposite: their own goal is OPPOSITE the opponent's.
    // Land spot in player perspective = 100 - (opponent.ballOn + puntDistance).
    const landAt = Math.max(5, Math.min(95, 100 - (state.ballOn + puntDistance)));
    playerStartsAt = Math.max(5, landAt);
  } else if (state.driveOverReason === 'TURNOVER' || state.driveOverReason === 'TURNOVER_ON_DOWNS') {
    // Player gets ball at the spot.
    playerStartsAt = Math.max(1, 100 - state.ballOn);
  } else {
    // TD/FG → kickoff. Player gets ball at own 25.
    playerStartsAt = 25;
  }

  const summary = buildSummary(state, plays.length);

  return {
    plays,
    pointsScored: state.score,
    endReason: state.driveOverReason ?? 'PUNT',
    summary,
    playerStartsAt,
  };
}

function describeDown(state: DriveState): string {
  const ord = state.down === 1 ? '1st' : state.down === 2 ? '2nd' : state.down === 3 ? '3rd' : '4th';
  return `${ord} & ${state.yardsToGo} at ${formatBallOn(state.ballOn)}`;
}

function buildSummary(state: DriveState, playCount: number): string {
  switch (state.driveOverReason) {
    case 'TOUCHDOWN':         return `TOUCHDOWN — ${playCount} plays, +7`;
    case 'FIELD_GOAL':        return state.lastPlaySummary?.includes('NO GOOD')
      ? `Missed field goal — ${playCount} plays`
      : `Field goal — ${playCount} plays, +3`;
    case 'PUNT':              return `Punt — ${playCount} plays, no score`;
    case 'TURNOVER':          return `Turnover — ${playCount} plays`;
    case 'TURNOVER_ON_DOWNS': return `Turnover on downs — ${playCount} plays`;
    case 'SAFETY':            return `Safety against — ${playCount} plays`;
    default:                  return `${playCount} plays`;
  }
}
