import { v4 as uuidv4 } from 'uuid';
import type { DraftProspect, Position, Player } from '../types';
import { generatePlayer } from './playerGenerator';

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
  
  const revealed = { ...prospect.scoutedStats };
  
  for (let i = 0; i < statsToReveal; i++) {
    const unrevealed = allStats.filter(s => !(s in revealed));
    if (unrevealed.length === 0) break;
    
    const stat = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    // Add some noise to scouted values
    const noise = Math.floor((Math.random() - 0.5) * 10);
    revealed[stat] = Math.min(99, Math.max(40, prospect.player.stats[stat] + noise));
  }

  return {
    ...prospect,
    scoutedStats: revealed,
    isFullyScouted: Object.keys(revealed).length >= 16,
  };
};