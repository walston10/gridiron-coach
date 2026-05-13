/**
 * AI defense caller — situation-aware weighted selection of a defensive card.
 *
 * Given the current drive situation and a pool of available defenses, returns
 * one card chosen by weighted random sampling. Weights reflect rough football
 * heuristics (blitz on 3rd & short, prevent on 3rd & long, stack box on goal
 * line, etc) and bias toward plausible calls without being deterministic.
 *
 * Pure function — same situation can produce different picks on repeat calls.
 */

import type { DefensiveCard, DefensivePlayType } from '../types/card.types';

export interface DefenseSituation {
  /** Current down (1–4). */
  down: number;
  /** Yards to go for a first down. */
  yardsToGo: number;
  /** Ball position, 0–100 from offense's own goal (red zone ≥ 80). */
  ballOn: number;
  /** Offense score minus a hypothetical opponent score. Positive = offense leads. */
  scoreDiff: number;
}

/**
 * Per-playType weight given the situation. Higher = more likely. Hard floor at 5
 * keeps a little chaos in every call.
 */
function weightFor(playType: DefensivePlayType, sit: DefenseSituation): number {
  let w = 50;

  const isLong   = sit.yardsToGo >= 7;
  const isShort  = sit.yardsToGo <= 3;
  const isMid    = !isLong && !isShort;
  const isThird  = sit.down === 3;
  const isFourth = sit.down === 4;
  const isLatePass = (isThird || isFourth) && isLong;        // obvious passing down
  const isLateShort = (isThird || isFourth) && isShort;      // line-it-up moment
  const isRedZone   = sit.ballOn >= 80;
  const isGoalLine  = sit.ballOn >= 95;
  const isBackedUp  = sit.ballOn <= 20;

  switch (playType) {
    case 'BLITZ':
      if (isLateShort) w += 35;
      else if (isLatePass) w += 15;
      else if (sit.down === 1) w -= 25;
      if (isRedZone) w += 15;
      if (isBackedUp) w += 10;
      break;

    case 'ZONE_BLITZ':
      if (isLatePass) w += 30;
      else if (isMid) w += 5;
      break;

    case 'STACK_THE_BOX':
    case 'GOAL_LINE_STAND':
      if (isShort) w += 25;
      if (isGoalLine) w += 50;
      if (isLong) w -= 30;
      break;

    case 'PRESS_COVERAGE':
      if (isLatePass) w += 20;
      if (isRedZone) w += 20;
      if (isShort && !isGoalLine) w -= 10;
      break;

    case 'MAN_COVERAGE':
      if (isLatePass) w += 15;
      if (sit.down === 1) w -= 5;
      break;

    case 'ZONE_COVERAGE':
      if (sit.down <= 2) w += 15;
      if (isMid) w += 10;
      break;

    case 'DEEP_ZONE':
    case 'PREVENT':
      if (isLatePass) w += 25;
      else w -= 35;
      if (isGoalLine || isShort) w -= 50;
      break;

    case 'CONTAIN':
      if (isLong && sit.down <= 2) w += 5;
      break;

    case 'SPY':
      if (isLatePass) w += 10;
      break;

    case 'GUESS_PLAY':
      // Risky — only viable on big downs with little to lose.
      if (isLatePass || isLateShort) w += 10;
      else w -= 20;
      break;
  }

  return Math.max(5, w);
}

/**
 * Pick a defense from the pool, weighted by the situation. Falls back to the
 * first card if the pool is empty (shouldn't happen with sample data).
 */
export function chooseDefense(
  pool: DefensiveCard[],
  sit: DefenseSituation
): DefensiveCard {
  if (pool.length === 0) {
    throw new Error('chooseDefense: empty pool');
  }
  if (pool.length === 1) return pool[0];

  const weights = pool.map(c => weightFor(c.playType, sit));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
