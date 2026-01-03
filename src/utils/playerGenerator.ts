import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerStats, Position } from '../types';
import { getRandomName } from '../data/names';

const POSITION_STAT_WEIGHTS: Record<Position, Partial<Record<keyof PlayerStats, number>>> = {
  // Offense
  QB: { throwPower: 2, throwAccuracy: 2, awareness: 1.5, composure: 1.5, discipline: 1 },
  RB: { speed: 2, elusiveness: 2, carrying: 1.5, acceleration: 1.5, toughness: 1, stamina: 1 },
  WR: { speed: 2, catching: 2, routeRunning: 1.5, acceleration: 1, discipline: 1 },
  TE: { catching: 1.5, routeRunning: 1, passBlock: 1, runBlock: 1, strength: 1, toughness: 1 },
  FB: { runBlock: 2, strength: 1.5, carrying: 1, toughness: 1.5, motor: 1 },
  LT: { passBlock: 2, runBlock: 1.5, strength: 1.5, awareness: 1, discipline: 1 },
  LG: { passBlock: 1.5, runBlock: 2, strength: 1.5, motor: 1 },
  C: { passBlock: 1.5, runBlock: 1.5, awareness: 1.5, strength: 1, discipline: 1 },
  RG: { passBlock: 1.5, runBlock: 2, strength: 1.5, motor: 1 },
  RT: { passBlock: 1.8, runBlock: 1.5, strength: 1.5, awareness: 1 },
  // Defense
  DE: { passRush: 2, tackle: 1.5, speed: 1, strength: 1, motor: 1.5, stamina: 1 },
  DT: { passRush: 1.5, tackle: 1.5, strength: 2, toughness: 1 },
  NT: { strength: 2, tackle: 1.5, toughness: 1.5 },
  OLB: { passRush: 1.5, tackle: 1.5, coverage: 1, speed: 1, motor: 1 },
  MLB: { tackle: 2, awareness: 1.5, coverage: 1, discipline: 1, composure: 1 },
  ILB: { tackle: 2, awareness: 1.5, coverage: 1, discipline: 1 },
  CB: { coverage: 2, speed: 1.5, agility: 1.5, composure: 1, discipline: 1 },
  FS: { coverage: 2, speed: 1, tackle: 1, awareness: 1.5, composure: 1 },
  SS: { coverage: 1.5, tackle: 1.5, strength: 1, toughness: 1 },
  // Special teams
  K: { throwAccuracy: 2, composure: 2 },  // using throwAccuracy as kick accuracy
  P: { throwPower: 2, composure: 1 },     // using throwPower as kick power
};

const randomStat = (base: number, variance: number = 15): number => {
  return Math.min(99, Math.max(40, base + Math.floor((Math.random() - 0.5) * variance * 2)));
};

export const generatePlayer = (
  position: Position,
  targetOverall: number = 70,
  age?: number
): Player => {
  const { firstName, lastName } = getRandomName();
  const weights = POSITION_STAT_WEIGHTS[position] || {};
  
  const stats: PlayerStats = {
    // Physical
    speed: randomStat(targetOverall),
    acceleration: randomStat(targetOverall),
    strength: randomStat(targetOverall),
    agility: randomStat(targetOverall),
    stamina: randomStat(targetOverall + 5),      // Most players have decent stamina
    toughness: randomStat(targetOverall),

    // Mental
    awareness: randomStat(targetOverall - 5),
    discipline: randomStat(targetOverall),        // Average discipline
    composure: randomStat(targetOverall - 5),     // Pressure handling varies

    // Intangibles (more variance - these drive drama)
    motor: randomStat(targetOverall, 20),         // High variance - some guys coast
    ego: randomStat(50, 25),                      // Wide range, not tied to skill

    // Skills
    catching: randomStat(targetOverall - 10),
    carrying: randomStat(targetOverall - 10),
    throwPower: randomStat(targetOverall - 15),
    throwAccuracy: randomStat(targetOverall - 15),
    routeRunning: randomStat(targetOverall - 10),
    passBlock: randomStat(targetOverall - 10),
    runBlock: randomStat(targetOverall - 10),
    tackle: randomStat(targetOverall - 10),
    coverage: randomStat(targetOverall - 10),
    passRush: randomStat(targetOverall - 10),
    elusiveness: randomStat(targetOverall - 5),
  };

  // Boost position-relevant stats
  Object.entries(weights).forEach(([stat, weight]) => {
    const key = stat as keyof PlayerStats;
    stats[key] = Math.min(99, Math.floor(stats[key] * weight));
  });

  const overall = calculateOverall(stats, position);
  
  return {
    id: uuidv4(),
    firstName,
    lastName,
    position,
    age: age ?? 22 + Math.floor(Math.random() * 10),
    experience: 0,
    stats,
    overall,
    potential: Math.min(99, overall + Math.floor(Math.random() * 15)),
    contract: null,
    injuryStatus: null,
    teamId: null,
  };
};

export const calculateOverall = (stats: PlayerStats, position: Position): number => {
  const weights = POSITION_STAT_WEIGHTS[position] || {};
  let totalWeight = 0;
  let weightedSum = 0;

  Object.entries(weights).forEach(([stat, weight]) => {
    const key = stat as keyof PlayerStats;
    weightedSum += stats[key] * weight;
    totalWeight += weight;
  });

  // Add base stats with low weight (excluding intangibles like ego/motor)
  const baseStats: (keyof PlayerStats)[] = ['speed', 'strength', 'agility', 'awareness', 'stamina', 'toughness'];
  baseStats.forEach(stat => {
    if (!weights[stat]) {
      weightedSum += stats[stat] * 0.3;
      totalWeight += 0.3;
    }
  });

  return Math.round(weightedSum / totalWeight);
};

export const generateRoster = (teamId: string, quality: 'BAD' | 'AVERAGE' | 'GOOD'): Player[] => {
  const baseOverall = quality === 'BAD' ? 62 : quality === 'AVERAGE' ? 72 : 82;
  const variance = 8;
  
  const rosterNeeds: { position: Position, count: number }[] = [
    { position: 'QB', count: 3 },
    { position: 'RB', count: 4 },
    { position: 'WR', count: 6 },
    { position: 'TE', count: 3 },
    { position: 'LT', count: 2 },
    { position: 'LG', count: 2 },
    { position: 'C', count: 2 },
    { position: 'RG', count: 2 },
    { position: 'RT', count: 2 },
    { position: 'DE', count: 4 },
    { position: 'DT', count: 4 },
    { position: 'OLB', count: 4 },
    { position: 'MLB', count: 3 },
    { position: 'CB', count: 5 },
    { position: 'FS', count: 2 },
    { position: 'SS', count: 2 },
    { position: 'K', count: 1 },
    { position: 'P', count: 1 },
  ];

  const roster: Player[] = [];
  
  rosterNeeds.forEach(({ position, count }) => {
    for (let i = 0; i < count; i++) {
      const depthPenalty = i * 5;  // backups are worse
      const targetOvr = baseOverall + Math.floor((Math.random() - 0.5) * variance * 2) - depthPenalty;
      const player = generatePlayer(position, targetOvr);
      player.teamId = teamId;
      roster.push(player);
    }
  });

  return roster;
};