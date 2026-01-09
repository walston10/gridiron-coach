/**
 * ILLEGAL MOTION - Offseason Engine
 *
 * Core functions for offseason progression:
 * - Player development/regression
 * - Free agent pool generation
 * - Draft class generation
 * - AI team offseason simulation
 */

import type {
  SeasonSummary,
  OwnerEvaluation,
  RetirementDecision,
  ExpiringContract,
  DevelopmentChange,
  OffseasonFreeAgent,
  DraftClass,
  DraftProspect,
  DraftPick,
  CampReport,
  TrainingCampPlayer,
} from '../types/offseason.types';
import type { Player, Position, PlayerRatings, PlayerPersonality } from '../types/player.types';
import type { TeamStanding, SeasonRecords } from '../types/season.types';

// =============================================================================
// NAME POOLS
// =============================================================================

const FIRST_NAMES = [
  'Marcus', 'Jamal', 'Tyrell', 'DeShawn', 'Malik', 'Terrance', 'Andre', 'Darius',
  'Brandon', 'Tyler', 'Jordan', 'Chris', 'Mike', 'Antonio', 'Devin', 'Rashad',
  'Trevor', 'Josh', 'Jake', 'Kyle', 'Brock', 'Colt', 'Brady', 'Drew', 'Lamar',
  'Patrick', 'Justin', 'Jalen', 'Trey', 'Zach', 'Joe', 'Daniel', 'Derek', 'Ryan',
];

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Davis', 'Jackson', 'Thomas', 'Harris', 'Robinson',
  'Lewis', 'Walker', 'Young', 'King', 'Wright', 'Hill', 'Green', 'Adams', 'Nelson',
  'Mitchell', 'Turner', 'Carter', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards',
  'Collins', 'Stewart', 'Morris', 'Murphy', 'Rogers', 'Peterson', 'Cooper', 'Reed',
];

const COLLEGES = [
  'Alabama', 'Ohio State', 'Georgia', 'Clemson', 'LSU', 'Oklahoma', 'Michigan',
  'Notre Dame', 'Texas', 'USC', 'Penn State', 'Florida', 'Oregon', 'Auburn',
  'Wisconsin', 'Miami', 'Florida State', 'Tennessee', 'Texas A&M', 'UCLA',
];

const RED_FLAGS = [
  'Character concerns', 'Injury history', 'Work ethic questions', 'Off-field issues',
  'Attitude problems', 'Gambling debts', 'Failed drug test', 'Academic issues',
];

const GREEN_FLAGS = [
  'Team captain', 'High motor', 'Film junkie', 'Natural leader', 'Coachable',
  'First in last out', 'Community volunteer', 'Great interviews',
];

// =============================================================================
// SEASON END
// =============================================================================

/**
 * Generate season summary from records and standings
 */
export function generateSeasonSummary(
  year: number,
  userTeamId: string,
  standings: TeamStanding[],
  records: SeasonRecords,
  _players: Player[]
): SeasonSummary {
  const userStanding = standings.find(s => s.teamId === userTeamId);

  // Generate awards (mock data)
  const mvpId = standings[0]?.teamId || userTeamId;
  const awards = [
    {
      id: 'mvp',
      name: 'Most Valuable Player',
      description: 'League MVP',
      winnerId: mvpId,
      winnerName: 'Top Performer',
      stat: '4,500 yards',
      isUserTeam: mvpId === userTeamId,
    },
  ];

  return {
    year,
    record: {
      wins: userStanding?.wins || 0,
      losses: userStanding?.losses || 0,
    },
    playoffResult: records.userPlayoffResult || 'MISSED_PLAYOFFS',
    awards,
    topPerformers: {
      passing: { playerId: '', name: 'QB Leader', yards: 4000 },
      rushing: { playerId: '', name: 'RB Leader', yards: 1200 },
      receiving: { playerId: '', name: 'WR Leader', yards: 1100 },
      sacks: { playerId: '', name: 'DE Leader', count: 12 },
    },
    notableEvents: records.scandalCount > 0
      ? [`${records.scandalCount} scandal(s) this season`]
      : [],
    ownerSatisfaction: 50 + (userStanding?.wins || 0) * 5 - records.scandalCount * 10,
    jobSecure: (userStanding?.wins || 0) >= 4,
  };
}

/**
 * Generate owner evaluation based on season performance
 */
export function generateOwnerEvaluation(
  summary: SeasonSummary,
  _previousDemands: string[],
  ownerPersonality: 'PATIENT' | 'DEMANDING' | 'HANDS_OFF' | 'MEDDLING' = 'DEMANDING'
): OwnerEvaluation {
  const { record, playoffResult, ownerSatisfaction } = summary;
  const winPct = record.wins / (record.wins + record.losses);

  let satisfaction = ownerSatisfaction;
  let message = '';
  const demands: string[] = [];
  let budgetChange = 0;
  let trustChange = 0;
  let isFired = false;
  let firingReason: string | undefined;

  // Evaluate performance
  if (playoffResult === 'CHAMPION') {
    satisfaction = 100;
    message = "Championship! You've exceeded all expectations.";
    budgetChange = 2_000_000;
    trustChange = 30;
  } else if (playoffResult === 'CHAMPIONSHIP_LOSS') {
    satisfaction = 85;
    message = "So close! Next year we finish the job.";
    demands.push('Win the championship');
    budgetChange = 1_000_000;
    trustChange = 15;
  } else if (winPct >= 0.625) {
    satisfaction = 75;
    message = "Solid season. But I expect more next year.";
    demands.push('Make the playoffs');
    trustChange = 5;
  } else if (winPct >= 0.5) {
    satisfaction = 55;
    message = "Mediocrity isn't acceptable. Step it up.";
    demands.push('Winning record required');
    trustChange = -5;
  } else if (winPct >= 0.375) {
    satisfaction = 35;
    message = "This is unacceptable. Major changes needed.";
    demands.push('Show immediate improvement');
    budgetChange = -500_000;
    trustChange = -15;
  } else {
    satisfaction = 15;
    message = "Embarrassing. Your job is on the line.";
    demands.push('Win or you\'re fired');
    budgetChange = -1_000_000;
    trustChange = -25;

    // Fire if really bad
    if (ownerPersonality === 'DEMANDING' && winPct < 0.25) {
      isFired = true;
      firingReason = 'Worst record in franchise history';
    }
  }

  // Check if previous demands were met
  // (simplified - would need actual demand tracking)

  return {
    satisfaction,
    message,
    demands,
    budgetChange,
    trustChange,
    isFired,
    firingReason,
  };
}

// =============================================================================
// PLAYER CHANGES
// =============================================================================

/**
 * Check all players for retirement
 */
export function checkRetirements(players: Player[]): RetirementDecision[] {
  const retirements: RetirementDecision[] = [];

  for (const player of players) {
    const chance = getRetirementChanceInternal(player.age, player.overall);

    if (Math.random() < chance) {
      let reason: RetirementDecision['reason'] = 'AGE';
      if (player.status.condition === 'INJURED') reason = 'INJURY';
      if (player.scandalHistory.length > 2) reason = 'SCANDAL';

      const announcements = [
        `After ${player.experience} seasons, I'm hanging up my cleats.`,
        `It's time to spend more time with my family.`,
        `My body is telling me it's time to stop.`,
        `I want to go out on my own terms.`,
      ];

      retirements.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        overall: player.overall,
        yearsPlayed: player.experience,
        reason,
        announcement: announcements[Math.floor(Math.random() * announcements.length)],
      });
    }
  }

  return retirements;
}

function getRetirementChanceInternal(age: number, _overall: number): number {
  if (age < 30) return 0;
  if (age < 32) return 0.05;
  if (age < 34) return 0.15;
  if (age < 36) return 0.30;
  if (age < 38) return 0.50;
  if (age < 40) return 0.70;
  return 0.90;
}

/**
 * Get expiring contracts from roster
 */
export function getExpiringContracts(players: Player[]): ExpiringContract[] {
  return players
    .filter(p => p.contract && p.contract.yearsRemaining <= 1)
    .map(p => ({
      playerId: p.id,
      playerName: `${p.firstName} ${p.lastName}`,
      position: p.position,
      age: p.age,
      overall: p.overall,
      previousSalary: p.contract?.salaryPerYear || 0,
      marketValue: estimateMarketValueInternal(p.position, p.overall, p.age),
      willingness: 50 + (p.trustInGM - 50) + (p.personality.primary === 'LOYAL_SOLDIER' ? 20 : 0),
      otherInterest: Math.floor(Math.random() * 5),
    }));
}

function estimateMarketValueInternal(position: Position, overall: number, age: number): number {
  let baseValue = (overall / 99) * 20_000_000;

  const positionMultipliers: Record<Position, number> = {
    QB: 2.5, WR: 1.4, CB: 1.3, RB: 1.0, TE: 1.1,
    S: 1.0, LB: 1.0, OL: 0.8, DL: 0.9, ST: 0.3,
  };

  baseValue *= positionMultipliers[position] || 1.0;

  if (age < 26) baseValue *= 1.2;
  else if (age > 30) baseValue *= 0.7;
  else if (age > 32) baseValue *= 0.5;

  return Math.round(baseValue);
}

/**
 * Apply development/regression to all players
 */
export function applyDevelopment(players: Player[]): DevelopmentChange[] {
  const changes: DevelopmentChange[] = [];

  for (const player of players) {
    const type = getDevelopmentTypeInternal(player.age, player.overall, player.potential);

    if (type === 'STABLE') continue;

    const amount = getDevelopmentAmountInternal(type, player.age);

    const ratingChanges: Partial<PlayerRatings> = {};

    // Apply primary stat changes based on position
    const primaryStats = getPrimaryStats(player.position);
    for (const stat of primaryStats) {
      ratingChanges[stat as keyof PlayerRatings] = Math.round(amount * (0.5 + Math.random() * 0.5));
    }

    let reason = '';
    switch (type) {
      case 'BREAKOUT':
        reason = 'Breakout year - put it all together';
        break;
      case 'GROWTH':
        reason = 'Continued development';
        break;
      case 'REGRESSION':
        reason = 'Minor decline';
        break;
      case 'DECLINE':
        reason = player.age > 33 ? 'Age-related decline' : 'Significant regression';
        break;
    }

    changes.push({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      type,
      overallChange: amount,
      ratingChanges,
      reason,
    });
  }

  return changes;
}

function getDevelopmentTypeInternal(
  age: number,
  overall: number,
  potential: number
): 'GROWTH' | 'REGRESSION' | 'BREAKOUT' | 'DECLINE' | 'STABLE' {
  const room = potential - overall;

  if (age < 26 && room > 5) {
    return Math.random() > 0.3 ? 'GROWTH' : 'STABLE';
  }

  if (age >= 24 && age <= 27 && room > 10 && Math.random() > 0.8) {
    return 'BREAKOUT';
  }

  if (age >= 26 && age <= 30) {
    return Math.random() > 0.85 ? 'REGRESSION' : 'STABLE';
  }

  if (age > 30) {
    const declineChance = (age - 30) * 0.15;
    return Math.random() < declineChance ? 'DECLINE' : 'REGRESSION';
  }

  return 'STABLE';
}

function getDevelopmentAmountInternal(
  type: 'GROWTH' | 'REGRESSION' | 'BREAKOUT' | 'DECLINE' | 'STABLE',
  age: number
): number {
  switch (type) {
    case 'BREAKOUT': return 5 + Math.floor(Math.random() * 5);
    case 'GROWTH': return 1 + Math.floor(Math.random() * 3);
    case 'STABLE': return 0;
    case 'REGRESSION': return -(1 + Math.floor(Math.random() * 2));
    case 'DECLINE': return -(3 + Math.floor(Math.random() * 4) + Math.max(0, age - 32));
    default: return 0;
  }
}

function getPrimaryStats(position: Position): string[] {
  switch (position) {
    case 'QB': return ['throwing', 'awareness', 'clutch'];
    case 'RB': return ['speed', 'carrying', 'agility'];
    case 'WR': return ['speed', 'catching', 'agility'];
    case 'TE': return ['catching', 'blocking', 'strength'];
    case 'OL': return ['blocking', 'strength', 'awareness'];
    case 'DL': return ['passRush', 'tackling', 'strength'];
    case 'LB': return ['tackling', 'coverage', 'speed'];
    case 'CB': return ['coverage', 'speed', 'agility'];
    case 'S': return ['coverage', 'tackling', 'awareness'];
    case 'ST': return ['kickPower', 'kickAccuracy', 'clutchKicking'];
    default: return ['awareness'];
  }
}

// =============================================================================
// FREE AGENCY
// =============================================================================

/**
 * Generate free agent pool for the offseason
 */
export function generateFreeAgentPool(existingFreeAgents: Player[] = []): OffseasonFreeAgent[] {
  const pool: OffseasonFreeAgent[] = [];

  // Convert existing players to FA format
  for (const player of existingFreeAgents) {
    const tier = getTierFromOverall(player.overall);
    const wave = getWaveFromTier(tier);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contract: _, ...playerWithoutContract } = player;
    pool.push({
      player: playerWithoutContract,
      askingPrice: estimateMarketValueInternal(player.position, player.overall, player.age),
      yearsWanted: player.age > 30 ? 2 : 3,
      interest: 50,
      otherOffers: Math.floor(Math.random() * 4),
      tier,
      wave,
      daysOnMarket: 0,
      competingOffers: Math.floor(Math.random() * 4),
      isExPlayer: true,
    });
  }

  // Generate new free agents per position
  const positions: Position[] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'DL', 'LB', 'LB', 'CB', 'CB', 'S'];

  for (const position of positions) {
    // Generate 3-5 players per position
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const overall = 60 + Math.floor(Math.random() * 30); // 60-89
      const age = 24 + Math.floor(Math.random() * 10);     // 24-33

      const player = generateFreeAgentPlayer(position, overall, age);
      const tier = getTierFromOverall(overall);
      const wave = getWaveFromTier(tier);

      pool.push({
        player,
        askingPrice: estimateMarketValueInternal(position, overall, age),
        yearsWanted: age > 30 ? 2 : 3,
        interest: 30 + Math.floor(Math.random() * 40),
        otherOffers: Math.floor(Math.random() * 4),
        tier,
        wave,
        daysOnMarket: 0,
        competingOffers: tier === 'ELITE' ? 4 : tier === 'STARTER' ? 2 : 1,
        isExPlayer: false,
      });
    }
  }

  return pool.sort((a, b) => b.player.overall - a.player.overall);
}

function getTierFromOverall(overall: number): OffseasonFreeAgent['tier'] {
  if (overall >= 85) return 'ELITE';
  if (overall >= 78) return 'STARTER';
  if (overall >= 70) return 'SOLID';
  if (overall >= 62) return 'DEPTH';
  return 'CAMP_BODY';
}

function getWaveFromTier(tier: OffseasonFreeAgent['tier']): 1 | 2 | 3 {
  if (tier === 'ELITE') return 1;
  if (tier === 'STARTER' || tier === 'SOLID') return 2;
  return 3;
}

function generateFreeAgentPlayer(position: Position, overall: number, age: number): Omit<Player, 'contract'> & { contract: null } {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

  const ratings = generatePositionRatings(position, overall);

  const personalities: PlayerPersonality['primary'][] = [
    'TEAM_FIRST', 'DIVA', 'QUIET_PROFESSIONAL', 'MEDIA_DARLING',
    'TROUBLEMAKER', 'LEADER', 'PARTY_ANIMAL', 'MERCENARY',
  ];

  return {
    id: `fa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    firstName,
    lastName,
    position,
    age,
    experience: age - 22,
    ratings,
    overall,
    potential: overall + Math.floor(Math.random() * 5),
    status: {
      condition: 'HEALTHY',
      cardQualityModifier: 0,
    },
    contract: null,
    cardsGenerated: [],
    cardContribution: 3,
    personality: {
      primary: personalities[Math.floor(Math.random() * personalities.length)],
    },
    scandalHistory: [],
    trustInGM: 50,
  };
}

function generatePositionRatings(position: Position, overall: number): PlayerRatings {
  const variance = () => Math.floor(Math.random() * 10) - 5;
  const base = overall;

  const ratings: PlayerRatings = {
    speed: 50 + variance(),
    strength: 50 + variance(),
    agility: 50 + variance(),
    stamina: 50 + variance(),
    awareness: base - 5 + variance(),
    discipline: 50 + variance(),
    clutch: 50 + variance(),
    throwing: 40,
    catching: 40,
    carrying: 40,
    blocking: 40,
    passRush: 40,
    coverage: 40,
    tackling: 40,
    kickPower: 40,
    kickAccuracy: 40,
    clutchKicking: 40,
    coverageUnit: 40,
    ego: 30 + Math.floor(Math.random() * 40),
    loyalty: 30 + Math.floor(Math.random() * 40),
    vice: 20 + Math.floor(Math.random() * 40),
  };

  // Position-specific boosts
  switch (position) {
    case 'QB':
      ratings.throwing = base + variance();
      ratings.awareness = base + variance();
      break;
    case 'RB':
      ratings.speed = base + variance();
      ratings.carrying = base + variance();
      ratings.agility = base - 5 + variance();
      break;
    case 'WR':
      ratings.speed = base + variance();
      ratings.catching = base + variance();
      ratings.agility = base - 5 + variance();
      break;
    case 'TE':
      ratings.catching = base - 5 + variance();
      ratings.blocking = base - 10 + variance();
      ratings.strength = base - 5 + variance();
      break;
    case 'OL':
      ratings.blocking = base + variance();
      ratings.strength = base + variance();
      break;
    case 'DL':
      ratings.passRush = base + variance();
      ratings.tackling = base - 5 + variance();
      ratings.strength = base + variance();
      break;
    case 'LB':
      ratings.tackling = base + variance();
      ratings.coverage = base - 10 + variance();
      ratings.speed = base - 5 + variance();
      break;
    case 'CB':
      ratings.coverage = base + variance();
      ratings.speed = base + variance();
      ratings.agility = base - 5 + variance();
      break;
    case 'S':
      ratings.coverage = base - 5 + variance();
      ratings.tackling = base - 5 + variance();
      ratings.awareness = base + variance();
      break;
    case 'ST':
      ratings.kickPower = base + variance();
      ratings.kickAccuracy = base + variance();
      ratings.clutchKicking = base - 10 + variance();
      break;
  }

  // Clamp all values
  for (const key of Object.keys(ratings) as (keyof PlayerRatings)[]) {
    ratings[key] = Math.max(1, Math.min(99, ratings[key]));
  }

  return ratings;
}

// =============================================================================
// DRAFT
// =============================================================================

/**
 * Generate draft class with prospects
 */
export function generateDraftClass(year: number): DraftClass {
  const prospects: DraftProspect[] = [];

  // Generate prospects per position
  const positionCounts: Record<Position, number> = {
    QB: 5, RB: 6, WR: 10, TE: 4, OL: 8,
    DL: 8, LB: 6, CB: 8, S: 5, ST: 2,
  };

  for (const [position, count] of Object.entries(positionCounts)) {
    for (let i = 0; i < count; i++) {
      const prospect = generateDraftProspect(position as Position, i);
      prospects.push(prospect);
    }
  }

  // Sort by projected round, then by true overall (hidden)
  prospects.sort((a, b) => {
    if (a.projectedRound !== b.projectedRound) {
      return a.projectedRound - b.projectedRound;
    }
    return b.trueOverall - a.trueOverall;
  });

  return {
    year,
    prospects,
    scoutedPlayers: [],
  };
}

function generateDraftProspect(position: Position, _index: number): DraftProspect {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const college = COLLEGES[Math.floor(Math.random() * COLLEGES.length)];

  // True ratings (hidden until drafted)
  const trueOverall = 55 + Math.floor(Math.random() * 40); // 55-94
  const truePotential = trueOverall + 3 + Math.floor(Math.random() * 12); // +3 to +15

  // Scouting grade can be off by up to 10 points
  const scoutingError = Math.floor(Math.random() * 20) - 10;
  const scoutingGrade = Math.max(50, Math.min(99, trueOverall + scoutingError));

  // Projected round based on scouting grade
  let projectedRound: number;
  if (scoutingGrade >= 85) projectedRound = 1;
  else if (scoutingGrade >= 78) projectedRound = 2;
  else if (scoutingGrade >= 70) projectedRound = 3;
  else if (scoutingGrade >= 62) projectedRound = 4;
  else projectedRound = 5;

  // Partial ratings (revealed by scouting)
  const ratings: Partial<PlayerRatings> = {};
  const primaryStats = getPrimaryStats(position);
  const fullRatings = generatePositionRatings(position, trueOverall);

  // Initially show 1-2 ratings
  for (let i = 0; i < 2; i++) {
    const stat = primaryStats[i];
    if (stat) {
      ratings[stat as keyof PlayerRatings] = fullRatings[stat as keyof PlayerRatings];
    }
  }

  // Red/green flags
  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (Math.random() > 0.7) {
    redFlags.push(RED_FLAGS[Math.floor(Math.random() * RED_FLAGS.length)]);
  }
  if (Math.random() > 0.6) {
    greenFlags.push(GREEN_FLAGS[Math.floor(Math.random() * GREEN_FLAGS.length)]);
  }

  // Scouting cost based on projected round
  const scoutingCost = projectedRound === 1 ? 100000 : projectedRound <= 3 ? 50000 : 25000;

  return {
    id: `prospect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    firstName,
    lastName,
    position,
    college,
    projectedRound,
    scoutingGrade,
    trueOverall,
    truePotential,
    ratings,
    redFlags,
    greenFlags,
    isScounted: false,
    scoutingCost,
    playerComparison: Math.random() > 0.5
      ? `Reminds scouts of a young ${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`
      : undefined,
  };
}

/**
 * Generate draft order based on standings
 */
export function generateDraftOrder(
  standings: TeamStanding[],
  userTeamId: string,
  rounds: number = 5
): DraftPick[] {
  const picks: DraftPick[] = [];

  // Reverse standings for draft order (worst team picks first)
  const draftOrder = [...standings].sort((a, b) => {
    if (a.winPercentage !== b.winPercentage) {
      return a.winPercentage - b.winPercentage;
    }
    return a.pointDifferential - b.pointDifferential;
  });

  let pickNumber = 1;

  for (let round = 1; round <= rounds; round++) {
    for (const standing of draftOrder) {
      picks.push({
        round,
        pick: draftOrder.indexOf(standing) + 1,
        overall: pickNumber++,
        teamId: standing.teamId === userTeamId ? 'USER' : standing.teamId,
        originalTeamId: standing.teamId,
        isTradeable: true,
      });
    }
  }

  return picks;
}

// =============================================================================
// AI OFFSEASON SIMULATION
// =============================================================================

/**
 * Simulate AI team offseason moves
 */
export function simulateAIOffseason(
  teamId: string,
  freeAgentPool: OffseasonFreeAgent[],
  draftProspects: DraftProspect[],
  draftPicks: DraftPick[]
): {
  signings: OffseasonFreeAgent[];
  draftSelections: DraftProspect[];
  remainingPool: OffseasonFreeAgent[];
  remainingProspects: DraftProspect[];
} {
  const signings: OffseasonFreeAgent[] = [];
  const draftSelections: DraftProspect[] = [];
  let remainingPool = [...freeAgentPool];
  let remainingProspects = [...draftProspects];

  // AI signs 2-4 free agents
  const faCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < faCount && remainingPool.length > 0; i++) {
    // Pick from top 10 available
    const topAvailable = remainingPool.slice(0, 10);
    const selectedIndex = Math.floor(Math.random() * topAvailable.length);
    const selected = topAvailable[selectedIndex];

    signings.push(selected);
    remainingPool = remainingPool.filter(fa => fa.player.id !== selected.player.id);
  }

  // AI makes draft picks
  const teamPicks = draftPicks.filter(p => p.teamId === teamId && !p.selectedPlayerId);
  for (const _pick of teamPicks) {
    if (remainingProspects.length === 0) break;

    // Pick best available within reasonable range
    const bestAvailable = remainingProspects.slice(0, 5);
    const selected = bestAvailable[Math.floor(Math.random() * Math.min(3, bestAvailable.length))];

    draftSelections.push(selected);
    remainingProspects = remainingProspects.filter(p => p.id !== selected.id);
  }

  return {
    signings,
    draftSelections,
    remainingPool,
    remainingProspects,
  };
}

// =============================================================================
// TRAINING CAMP
// =============================================================================

/**
 * Generate training camp report
 */
export function generateCampReport(roster: Player[]): CampReport {
  const players: TrainingCampPlayer[] = roster.map(player => {
    const isRookie = player.experience === 0;
    const isBubble = player.overall < 65;

    // Random camp performance
    const grades: TrainingCampPlayer['campGrade'][] = ['A', 'B', 'C', 'D', 'F'];
    const gradeWeights = isRookie
      ? [0.1, 0.2, 0.4, 0.2, 0.1]
      : [0.15, 0.35, 0.35, 0.1, 0.05];

    let gradeIndex = 0;
    let random = Math.random();
    for (let i = 0; i < gradeWeights.length; i++) {
      random -= gradeWeights[i];
      if (random <= 0) {
        gradeIndex = i;
        break;
      }
    }

    const campGrade = grades[gradeIndex];

    // Development from camp
    let development = 0;
    if (campGrade === 'A') development = 2;
    else if (campGrade === 'B') development = 1;
    else if (campGrade === 'D') development = -1;
    else if (campGrade === 'F') development = -2;

    // Injuries
    const injuries = Math.random() < 0.05;

    const notes = campGrade === 'A' ? 'Outstanding camp performance'
      : campGrade === 'B' ? 'Solid showing'
      : campGrade === 'C' ? 'Met expectations'
      : campGrade === 'D' ? 'Struggled at times'
      : 'Poor camp - roster bubble';

    return {
      player,
      isRookie,
      isBubble,
      campGrade,
      development,
      injuries,
      notes,
    };
  });

  const standouts = players.filter(p => p.campGrade === 'A');
  const disappointments = players.filter(p => p.campGrade === 'D' || p.campGrade === 'F');
  const injuries = players.filter(p => p.injuries);

  const teamChemistry = 50 +
    standouts.length * 3 -
    disappointments.length * 2 -
    injuries.length * 5;

  return {
    standouts,
    disappointments,
    injuries,
    rosterDecisions: [],
    teamChemistry: Math.max(0, Math.min(100, teamChemistry)),
    readyForSeason: injuries.length < 3 && teamChemistry > 40,
  };
}
