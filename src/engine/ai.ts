import type { CPUTeamPersonality, DraftProspect, FreeAgent, ContractOffer } from '../types';

export const evaluateProspect = (
  prospect: DraftProspect,
  personality: CPUTeamPersonality
): number => {
  const trueOverall = prospect.player.overall;
  
  // Apply scouting inaccuracy
  const noise = (100 - personality.scoutingAccuracy) * (Math.random() - 0.5) * 0.3;
  let perceivedOverall = trueOverall + noise;
  
  // Apply archetype biases
  switch (personality.gmArchetype) {
    case 'ANALYTICS':
      // Overvalue speed and measurables
      perceivedOverall += (prospect.player.stats.speed - 70) * 0.2;
      break;
    case 'OLD_SCHOOL':
      // Prefer experience and "intangibles" (awareness)
      perceivedOverall += (prospect.player.stats.awareness - 70) * 0.15;
      break;
    case 'BOOM_BUST':
      // Love high potential, ignore floor
      perceivedOverall += (prospect.player.potential - trueOverall) * 0.3;
      break;
  }
  
  // Random "fell in love" / "missed on" factor
  if (Math.random() > 0.9) {
    perceivedOverall += (Math.random() > 0.5 ? 1 : -1) * 10;
  }
  
  return Math.round(perceivedOverall);
};

export const shouldCPUDraft = (
  prospect: DraftProspect,
  currentPick: number,
  teamNeeds: string[],
  personality: CPUTeamPersonality
): boolean => {
  const perceived = evaluateProspect(prospect, personality);
  const projectedPick = prospect.projectedRound * 32;
  const reachAmount = projectedPick - currentPick;
  
  // Won't reach too far
  if (reachAmount > personality.reachTolerance * 5) {
    return false;
  }
  
  // More likely to pick if fills need
  const fillsNeed = teamNeeds.includes(prospect.player.position);
  const needBonus = fillsNeed ? 10 : 0;
  
  return (perceived + needBonus) > (70 - currentPick / 7);  // lower bar as draft goes on
};

export const generateFreeAgentOffer = (
  player: FreeAgent,
  personality: CPUTeamPersonality,
  capSpace: number,
  needsPosition: boolean
): ContractOffer | null => {
  const baseValue = player.askingPrice;
  
  // Won't offer if can't afford
  if (capSpace < baseValue * 0.8) {
    return null;
  }
  
  let offerMultiplier = 1;
  
  switch (personality.gmArchetype) {
    case 'WIN_NOW':
      offerMultiplier = 1.15;  // overpays
      break;
    case 'REBUILDER':
      offerMultiplier = 0.85;  // lowballs
      break;
    case 'ANALYTICS':
      // Won't overpay older players
      if (player.player.age > 28) {
        offerMultiplier = 0.8;
      }
      break;
  }
  
  if (needsPosition) {
    offerMultiplier += 0.1;
  }
  
  // Speed of offer
  if (personality.freeAgencySpeed === 'SLOW' && Math.random() > 0.5) {
    return null;  // wait and see
  }
  
  const yearlySalary = Math.round(baseValue * offerMultiplier);
  const years = player.player.age > 30 ? 2 : Math.ceil(Math.random() * 3) + 1;
  
  return {
    teamId: personality.teamId,
    years,
    yearlySalary,
    guaranteedMoney: Math.round(yearlySalary * years * 0.4),
    signingBonus: Math.round(yearlySalary * 0.15),
    rolePromise: needsPosition ? 'STARTER' : 'ROTATIONAL',
    status: 'PENDING',
  };
};

export const evaluateFreeAgentOffers = (
  player: FreeAgent,
  teamPrestige: Record<string, number>
): string | null => {
  const validOffers = player.offers.filter(o => o.status === 'PENDING');
  if (validOffers.length === 0) return null;
  
  let bestScore = -Infinity;
  let bestTeamId: string | null = null;
  
  validOffers.forEach(offer => {
    const moneyScore = offer.yearlySalary / player.askingPrice * 40;
    const prestigeScore = (teamPrestige[offer.teamId] || 50) * 0.4;
    const roleScore = offer.rolePromise === 'STARTER' ? 15 : 
                      offer.rolePromise === 'ROTATIONAL' ? 10 : 5;
    const yearsScore = offer.years * 3;
    
    // Age affects priorities
    const ageFactor = player.player.age > 30 ? 0.7 : 1;  // older = chase money less
    
    const totalScore = (moneyScore * ageFactor) + prestigeScore + roleScore + yearsScore;
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTeamId = offer.teamId;
    }
  });
  
  // Might not sign if best offer is too low
  if (bestScore < 50) {
    return Math.random() > 0.7 ? bestTeamId : null;
  }
  
  return bestTeamId;
};