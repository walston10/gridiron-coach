import type { Play, PlayerAssignment, PlayerStats } from '../types';

export type SimulationResult = {
  success: boolean;
  yardsGained: number;
  turnover: boolean;
  turnoverType?: 'INTERCEPTION' | 'FUMBLE';
  touchdown: boolean;
  events: SimulationEvent[];
};

export type SimulationEvent = {
  time: number;  // ms from snap
  type: 'SNAP' | 'HANDOFF' | 'THROW' | 'CATCH' | 'DROP' | 'SACK' | 'TACKLE' | 'TOUCHDOWN' | 'BLOCK_SHED';
  playerId?: string;
  x: number;
  y: number;
  description: string;
};

export type MatchupResult = {
  winner: 'OFFENSE' | 'DEFENSE';
  margin: number;  // how decisive
  timeMs: number;  // how long matchup lasted
};

export const rollMatchup = (
  offenseStat: number,
  defenseStat: number,
  variance: number = 15
): MatchupResult => {
  const offenseRoll = offenseStat + (Math.random() - 0.5) * variance * 2;
  const defenseRoll = defenseStat + (Math.random() - 0.5) * variance * 2;
  
  const diff = offenseRoll - defenseRoll;
  
  return {
    winner: diff > 0 ? 'OFFENSE' : 'DEFENSE',
    margin: Math.abs(diff),
    timeMs: 1500 + Math.random() * 2000 - (Math.abs(diff) * 20),  // closer matchup = longer
  };
};

export const calculateSeparation = (
  routeRunning: number,
  speed: number,
  coverageStat: number,
  defenderSpeed: number
): number => {
  const receiverScore = (routeRunning * 0.6 + speed * 0.4) + (Math.random() - 0.5) * 20;
  const defenderScore = (coverageStat * 0.5 + defenderSpeed * 0.5) + (Math.random() - 0.5) * 20;
  return receiverScore - defenderScore;  // positive = open
};

export const calculateThrowAccuracy = (
  qbAccuracy: number,
  pressure: number,  // 0-100
  distance: number   // yards
): number => {
  const basePct = qbAccuracy / 100;
  const pressurePenalty = pressure * 0.003;  // each pressure point reduces by 0.3%
  const distancePenalty = distance * 0.005;  // each yard reduces by 0.5%
  
  return Math.max(0.1, basePct - pressurePenalty - distancePenalty);
};

export const simulatePlay = (
  play: Play,
  offenseStats: Record<string, PlayerStats>,
  defenseStats: Record<string, PlayerStats>
): SimulationResult => {
  const events: SimulationEvent[] = [];
  
  events.push({
    time: 0,
    type: 'SNAP',
    x: 50,
    y: 0,
    description: 'Ball snapped',
  });

  // Simplified simulation - expand this significantly
  if (play.playType === 'PASS') {
    return simulatePassPlay(play, offenseStats, defenseStats, events);
  } else {
    return simulateRunPlay(play, offenseStats, defenseStats, events);
  }
};

const simulatePassPlay = (
  play: Play,
  offenseStats: Record<string, PlayerStats>,
  defenseStats: Record<string, PlayerStats>,
  events: SimulationEvent[]
): SimulationResult => {
  // Calculate pocket time
  const avgPassBlock = Object.values(offenseStats)
    .filter((_, i) => i < 5)  // linemen
    .reduce((sum, s) => sum + s.passBlock, 0) / 5;
  
  const avgPassRush = Object.values(defenseStats)
    .filter((_, i) => i < 4)  // d-line
    .reduce((sum, s) => sum + s.passRush, 0) / 4;

  const pocketTime = rollMatchup(avgPassBlock, avgPassRush);
  
  if (pocketTime.winner === 'DEFENSE' && pocketTime.timeMs < 2000) {
    events.push({
      time: pocketTime.timeMs,
      type: 'SACK',
      x: 50,
      y: 5,
      description: 'Quarterback sacked!',
    });
    
    return {
      success: false,
      yardsGained: -7,
      turnover: false,
      touchdown: false,
      events,
    };
  }

  // Simplified: pick a random receiver and see if they're open
  const receiverAssignments = play.assignments.filter(a => a.route && a.route !== 'BLOCK');
  if (receiverAssignments.length === 0) {
    return { success: false, yardsGained: 0, turnover: false, touchdown: false, events };
  }
  
  const targetAssignment = receiverAssignments[Math.floor(Math.random() * receiverAssignments.length)];
  const yardsGained = 5 + Math.floor(Math.random() * 15);
  
  events.push({
    time: 2500,
    type: 'THROW',
    x: 50,
    y: yardsGained,
    description: 'Pass thrown',
  });

  const caught = Math.random() > 0.3;  // 70% catch rate (placeholder)
  
  if (caught) {
    events.push({
      time: 3000,
      type: 'CATCH',
      x: 50,
      y: yardsGained,
      description: 'Pass complete!',
    });
    
    return {
      success: true,
      yardsGained,
      turnover: false,
      touchdown: yardsGained > 20 && Math.random() > 0.7,
      events,
    };
  } else {
    events.push({
      time: 3000,
      type: 'DROP',
      x: 50,
      y: yardsGained,
      description: 'Pass incomplete',
    });
    
    return {
      success: false,
      yardsGained: 0,
      turnover: Math.random() > 0.95,  // 5% INT on incompletion
      turnoverType: 'INTERCEPTION',
      touchdown: false,
      events,
    };
  }
};

const simulateRunPlay = (
  play: Play,
  offenseStats: Record<string, PlayerStats>,
  defenseStats: Record<string, PlayerStats>,
  events: SimulationEvent[]
): SimulationResult => {
  const avgRunBlock = Object.values(offenseStats)
    .filter((_, i) => i < 5)
    .reduce((sum, s) => sum + s.runBlock, 0) / 5;

  const avgTackle = Object.values(defenseStats)
    .reduce((sum, s) => sum + s.tackle, 0) / Object.values(defenseStats).length;

  const blockingResult = rollMatchup(avgRunBlock, avgTackle);

  // Find ball carrier assignment and get their stats
  const ballCarrierAssignment = play.assignments.find(a => a.isBallCarrier);
  const ballCarrierStats = ballCarrierAssignment
    ? offenseStats[ballCarrierAssignment.playerId]
    : Object.values(offenseStats)[5]; // Fallback to first non-lineman

  // Elusiveness helps break tackles and gain extra yards
  const elusivenessBonus = ballCarrierStats?.elusiveness
    ? (ballCarrierStats.elusiveness - 70) / 50 // -0.6 to +0.58 based on rating
    : 0;

  const baseYards = blockingResult.winner === 'OFFENSE'
    ? 3 + Math.floor(blockingResult.margin / 5) + Math.round(elusivenessBonus * 2)
    : -1 + Math.floor(Math.random() * 3);

  events.push({
    time: 500,
    type: 'HANDOFF',
    x: 50,
    y: 5,
    description: 'Handoff to running back',
  });

  events.push({
    time: 2000 + Math.random() * 2000,
    type: 'TACKLE',
    x: 50,
    y: baseYards,
    description: `Tackled after ${baseYards} yards`,
  });

  // Fumble chance based on carrying rating
  // Base 2% fumble, but modified by carrying rating
  // High carrying (90+) = ~0.8% fumble, Low carrying (50) = ~3.5% fumble
  const carryingRating = ballCarrierStats?.carrying ?? 70;
  const fumbleThreshold = 0.96 + (carryingRating - 70) * 0.001; // 0.94-0.98 range
  const isFumble = Math.random() > fumbleThreshold;

  return {
    success: baseYards > 0,
    yardsGained: baseYards,
    turnover: isFumble,
    turnoverType: 'FUMBLE',
    touchdown: baseYards > 15 && Math.random() > 0.8,
    events,
  };
};