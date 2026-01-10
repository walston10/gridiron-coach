/**
 * ILLEGAL MOTION - Roster Buffs
 *
 * Your roster provides general buffs that modify all plays.
 * Better players = better buffs across the board.
 */

import type { Roster } from '../types/player.types';
import type { UniversalPlay } from '../data/universalPlaybook';

// =============================================================================
// ROSTER BUFFS - Calculated from your team
// =============================================================================

export interface RosterBuffs {
  // Offensive buffs (0-100 scale, 50 = neutral)
  arm: number;           // QB arm strength
  accuracy: number;      // QB accuracy
  speed: number;         // Skill position speed (WR/RB)
  power: number;         // RB power
  agility: number;       // Skill agility
  catching: number;      // WR/TE hands
  blocking: number;      // OL protection

  // Overall modifiers
  passingBonus: number;  // Overall passing game modifier
  rushingBonus: number;  // Overall rushing game modifier
  bigPlayBonus: number;  // Big play chance modifier
  protectionBonus: number; // Lower turnover risk

  // Display info
  teamStrengths: string[];
  teamWeaknesses: string[];
}

export interface ModifiedPlay {
  id: string;
  name: string;
  description: string;
  playType: string;
  category: string;
  formation: string;
  // Momentum cost (0-3)
  momentumCost: 0 | 1 | 2 | 3;
  // Modified stats (after buffs)
  successChance: number;
  yards: number;
  bigPlayChance: number;
  turnoverRisk: number;
  // Display
  buffIndicator: 'boosted' | 'neutral' | 'weak';
  buffReason?: string;
}

// =============================================================================
// CALCULATE ROSTER BUFFS
// =============================================================================

export function calculateRosterBuffs(roster: Roster): RosterBuffs {
  const { offense } = roster;

  // Calculate stat-based buffs
  const qb = offense.QB;
  const rb = offense.RB;
  const wr1 = offense.WR1;
  const wr2 = offense.WR2;
  const te = offense.TE;
  const ol = offense.OL;

  // QB buffs
  const arm = qb.ratings.throwing;
  const accuracy = Math.round((qb.ratings.throwing + qb.ratings.awareness) / 2);

  // Skill position buffs (average of relevant players)
  const speed = Math.round((wr1.ratings.speed + wr2.ratings.speed + rb.ratings.speed) / 3);
  const power = rb.ratings.strength;
  const agility = Math.round((wr1.ratings.agility + rb.ratings.agility) / 2);
  const catching = Math.round((wr1.ratings.catching + wr2.ratings.catching + te.ratings.catching) / 3);
  const blocking = ol.passBlockRating;

  // Calculate overall modifiers
  const passingBonus = calculateModifier(arm, accuracy, blocking);
  const rushingBonus = calculateModifier(power, blocking, agility);
  const bigPlayBonus = calculateModifier(speed, agility);
  const protectionBonus = calculateModifier(blocking, qb.ratings.awareness);

  // Identify strengths and weaknesses
  const teamStrengths: string[] = [];
  const teamWeaknesses: string[] = [];

  if (arm >= 85) teamStrengths.push('Strong Arm QB');
  if (speed >= 88) teamStrengths.push('Speed Kills');
  if (power >= 85) teamStrengths.push('Power Running');
  if (blocking >= 82) teamStrengths.push('Elite O-Line');
  if (catching >= 85) teamStrengths.push('Sure Hands');

  if (arm < 70) teamWeaknesses.push('Weak Arm');
  if (speed < 75) teamWeaknesses.push('Lack of Speed');
  if (blocking < 70) teamWeaknesses.push('Porous O-Line');
  if (catching < 70) teamWeaknesses.push('Drops');

  return {
    arm,
    accuracy,
    speed,
    power,
    agility,
    catching,
    blocking,
    passingBonus,
    rushingBonus,
    bigPlayBonus,
    protectionBonus,
    teamStrengths,
    teamWeaknesses,
  };
}

function calculateModifier(...ratings: number[]): number {
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  // Convert 50-95 rating scale to -15 to +15 modifier
  return Math.round((avg - 72.5) * 0.6);
}

// =============================================================================
// APPLY BUFFS TO PLAYS
// =============================================================================

export function applyRosterBuffs(
  play: UniversalPlay,
  buffs: RosterBuffs
): ModifiedPlay {
  // Get the primary stat buff (returns -15 to +15 based on rating)
  const primaryBuff = getStatBuff(play.primaryStat, buffs);
  const secondaryBuff = play.secondaryStat ? getStatBuff(play.secondaryStat, buffs) * 0.5 : 0;

  // Calculate total modifier: ADD to base, don't multiply
  // primaryBuff of +10 means +5% success, -10 means -5% success
  const successModifier = Math.round((primaryBuff + secondaryBuff) * 0.5);

  // Apply buffs - ADDITIVE, not multiplicative
  let successChance = play.baseSuccessChance + successModifier;
  let yards = Math.round(play.baseYards * (1 + successModifier * 0.02)); // Small yards adjustment
  let bigPlayChance = Math.round(play.baseBigPlayChance + buffs.bigPlayBonus * 0.3);
  let turnoverRisk = Math.round(play.baseTurnoverRisk - buffs.protectionBonus * 0.2);

  // Apply category-specific buffs (smaller additive bonuses)
  if (play.category === 'RUN') {
    successChance += Math.round(buffs.rushingBonus * 0.5);
    yards += Math.round(buffs.rushingBonus * 0.1);
  } else if (['SHORT', 'MEDIUM', 'DEEP'].includes(play.category)) {
    successChance += Math.round(buffs.passingBonus * 0.5);
  }

  // Clamp values to reasonable ranges
  successChance = Math.max(15, Math.min(85, successChance));
  yards = Math.max(1, yards);
  bigPlayChance = Math.max(0, Math.min(40, bigPlayChance));
  turnoverRisk = Math.max(2, Math.min(25, turnoverRisk));

  // Determine buff indicator
  let buffIndicator: 'boosted' | 'neutral' | 'weak' = 'neutral';
  let buffReason: string | undefined;

  if (successModifier >= 3) {
    buffIndicator = 'boosted';
    buffReason = getBoostedReason(play.primaryStat);
  } else if (successModifier <= -3) {
    buffIndicator = 'weak';
    buffReason = getWeakReason(play.primaryStat);
  }

  return {
    id: play.id,
    name: play.name,
    description: play.description,
    playType: play.playType,
    category: play.category,
    formation: play.formation,
    momentumCost: play.momentumCost,
    successChance,
    yards,
    bigPlayChance,
    turnoverRisk,
    buffIndicator,
    buffReason,
  };
}

function getStatBuff(
  stat: 'ARM' | 'ACCURACY' | 'SPEED' | 'POWER' | 'AGILITY' | 'CATCHING' | 'BLOCKING',
  buffs: RosterBuffs
): number {
  const statMap = {
    ARM: buffs.arm,
    ACCURACY: buffs.accuracy,
    SPEED: buffs.speed,
    POWER: buffs.power,
    AGILITY: buffs.agility,
    CATCHING: buffs.catching,
    BLOCKING: buffs.blocking,
  };

  // Convert rating to modifier (50 = -10, 75 = +5, 95 = +15)
  const rating = statMap[stat];
  return (rating - 65) * 0.5;
}

function getBoostedReason(
  stat: 'ARM' | 'ACCURACY' | 'SPEED' | 'POWER' | 'AGILITY' | 'CATCHING' | 'BLOCKING'
): string {
  const reasons = {
    ARM: 'Strong arm QB',
    ACCURACY: 'Accurate QB',
    SPEED: 'Fast receivers',
    POWER: 'Power back',
    AGILITY: 'Elusive players',
    CATCHING: 'Sure hands',
    BLOCKING: 'Great O-line',
  };
  return reasons[stat];
}

function getWeakReason(
  stat: 'ARM' | 'ACCURACY' | 'SPEED' | 'POWER' | 'AGILITY' | 'CATCHING' | 'BLOCKING'
): string {
  const reasons = {
    ARM: 'Weak arm QB',
    ACCURACY: 'Inaccurate QB',
    SPEED: 'Slow receivers',
    POWER: 'Weak running game',
    AGILITY: 'Not elusive',
    CATCHING: 'Drops issues',
    BLOCKING: 'Poor O-line',
  };
  return reasons[stat];
}

// =============================================================================
// GET ALL MODIFIED PLAYS
// =============================================================================

export function getAllModifiedPlays(
  plays: UniversalPlay[],
  buffs: RosterBuffs
): ModifiedPlay[] {
  return plays.map(play => applyRosterBuffs(play, buffs));
}
