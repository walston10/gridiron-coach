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
  // Get the primary stat buff
  const primaryBuff = getStatBuff(play.primaryStat, buffs);
  const secondaryBuff = play.secondaryStat ? getStatBuff(play.secondaryStat, buffs) * 0.5 : 0;

  // Calculate total buff (scale by 0.1 to get percentage modifier)
  const totalBuff = (primaryBuff + secondaryBuff) * 0.15;

  // Apply buffs
  let successChance = Math.round(play.baseSuccessChance * (1 + totalBuff));
  let yards = Math.round(play.baseYards * (1 + totalBuff * 0.5));
  let bigPlayChance = Math.round(play.baseBigPlayChance * (1 + buffs.bigPlayBonus * 0.02));
  let turnoverRisk = Math.round(play.baseTurnoverRisk * (1 - buffs.protectionBonus * 0.02));

  // Apply category-specific buffs
  if (play.category === 'RUN') {
    successChance += buffs.rushingBonus;
    yards = Math.round(yards * (1 + buffs.rushingBonus * 0.03));
  } else if (['SHORT', 'MEDIUM', 'DEEP'].includes(play.category)) {
    successChance += buffs.passingBonus;
  }

  // Clamp values
  successChance = Math.max(15, Math.min(95, successChance));
  yards = Math.max(1, yards);
  bigPlayChance = Math.max(0, Math.min(60, bigPlayChance));
  turnoverRisk = Math.max(1, Math.min(30, turnoverRisk));

  // Determine buff indicator
  let buffIndicator: 'boosted' | 'neutral' | 'weak' = 'neutral';
  let buffReason: string | undefined;

  if (totalBuff >= 0.1) {
    buffIndicator = 'boosted';
    buffReason = getBoostedReason(play.primaryStat);
  } else if (totalBuff <= -0.1) {
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
