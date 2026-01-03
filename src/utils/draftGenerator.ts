import type { DraftProspect, Position, PlayerStats } from '../types';
import { generatePlayer } from './playerGenerator';

// Position-relevant stats for scouting - reveal these first
// Note: Intangibles (motor, ego) are harder to scout - revealed later or through combine/interviews
const POSITION_RELEVANT_STATS: Record<string, (keyof PlayerStats)[]> = {
  QB: ['throwPower', 'throwAccuracy', 'awareness', 'composure', 'speed', 'agility', 'discipline'],
  RB: ['speed', 'acceleration', 'carrying', 'elusiveness', 'agility', 'stamina', 'toughness', 'catching'],
  WR: ['speed', 'acceleration', 'catching', 'routeRunning', 'agility', 'discipline', 'elusiveness'],
  TE: ['catching', 'routeRunning', 'runBlock', 'passBlock', 'strength', 'toughness', 'speed'],
  LT: ['passBlock', 'runBlock', 'strength', 'awareness', 'agility', 'discipline'],
  LG: ['passBlock', 'runBlock', 'strength', 'awareness', 'motor', 'agility'],
  C: ['passBlock', 'runBlock', 'strength', 'awareness', 'discipline', 'agility'],
  RG: ['passBlock', 'runBlock', 'strength', 'awareness', 'motor', 'agility'],
  RT: ['passBlock', 'runBlock', 'strength', 'awareness', 'agility', 'discipline'],
  DE: ['passRush', 'tackle', 'strength', 'speed', 'motor', 'stamina', 'agility'],
  DT: ['passRush', 'tackle', 'strength', 'toughness', 'awareness', 'agility'],
  OLB: ['tackle', 'passRush', 'coverage', 'speed', 'motor', 'agility', 'awareness'],
  MLB: ['tackle', 'coverage', 'awareness', 'discipline', 'composure', 'speed', 'strength'],
  CB: ['coverage', 'speed', 'agility', 'composure', 'discipline', 'awareness', 'tackle'],
  FS: ['coverage', 'speed', 'awareness', 'composure', 'tackle', 'agility'],
  SS: ['coverage', 'tackle', 'speed', 'toughness', 'awareness', 'strength', 'agility'],
};

export const generateDraftClass = (size: number = 250): DraftProspect[] => {
  const prospects: DraftProspect[] = [];
  
  // Distribution of prospects by projected round
  const roundDistribution = [
    { round: 1, count: 32, overallRange: [75, 90] },
    { round: 2, count: 32, overallRange: [70, 82] },
    { round: 3, count: 32, overallRange: [65, 78] },
    { round: 4, count: 32, overallRange: [60, 74] },
    { round: 5, count: 32, overallRange: [55, 70] },
    { round: 6, count: 32, overallRange: [50, 66] },
    { round: 7, count: 32, overallRange: [45, 62] },
    { round: 8, count: 26, overallRange: [40, 58] },  // UDFAs
  ];

  const positions: Position[] = [
    'QB', 'RB', 'WR', 'WR', 'WR', 'TE', 
    'LT', 'LG', 'C', 'RG', 'RT',
    'DE', 'DE', 'DT', 'OLB', 'OLB', 'MLB',
    'CB', 'CB', 'FS', 'SS'
  ];

  roundDistribution.forEach(({ round, count, overallRange }) => {
    for (let i = 0; i < count; i++) {
      const position = positions[Math.floor(Math.random() * positions.length)];
      const targetOverall = overallRange[0] + Math.floor(Math.random() * (overallRange[1] - overallRange[0]));
      const age = 21 + Math.floor(Math.random() * 3);
      
      const player = generatePlayer(position, targetOverall, age);
      player.experience = 0;
      
      prospects.push({
        player,
        scoutedStats: {},  // revealed through scouting
        combineResults: null,
        projectedRound: round,
        isFullyScouted: false,
        userInterest: 'NONE',
      });
    }
  });

  return prospects;
};

export const scoutProspect = (prospect: DraftProspect, pointsSpent: number): DraftProspect => {
  const statsToReveal = Math.min(Math.floor(pointsSpent / 10), 16);
  const allStats = Object.keys(prospect.player.stats) as (keyof typeof prospect.player.stats)[];

  // Get position-relevant stats for this player's position
  const relevantStats = POSITION_RELEVANT_STATS[prospect.player.position] || allStats;

  const revealed = { ...prospect.scoutedStats };

  for (let i = 0; i < statsToReveal; i++) {
    const unrevealed = allStats.filter(s => !(s in revealed));
    if (unrevealed.length === 0) break;

    // Prioritize position-relevant stats first
    const unrevealedRelevant = relevantStats.filter(s => !(s in revealed));
    let stat: keyof typeof prospect.player.stats;

    if (unrevealedRelevant.length > 0) {
      // Pick from relevant stats first (in priority order)
      stat = unrevealedRelevant[0];
    } else {
      // All relevant stats revealed, pick randomly from remaining
      stat = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    }

    // Add some noise to scouted values
    const noise = Math.floor((Math.random() - 0.5) * 10);
    revealed[stat] = Math.min(99, Math.max(40, prospect.player.stats[stat] + noise));
  }

  // 22 total stats now (added stamina, toughness, discipline, composure, motor, ego)
  return {
    ...prospect,
    scoutedStats: revealed,
    isFullyScouted: Object.keys(revealed).length >= 22,
  };
};

// Export for use in ProspectCard to filter displayed stats
export { POSITION_RELEVANT_STATS };