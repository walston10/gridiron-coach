/**
 * Static Teams Data
 *
 * 7 AI teams with handcrafted rosters and identities.
 * Each team has a distinct playstyle and strengths.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StaticTeamInfo, TeamIdentity } from '../types/league.types';
import type { Roster, Player, OLineUnit, DLineUnit, FlexType } from '../types/player.types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createPlayer(
  firstName: string,
  lastName: string,
  position: string,
  ratings: {
    speed: number;
    strength: number;
    agility: number;
    throwing?: number;
    catching?: number;
    carrying?: number;
    blocking?: number;
    coverage?: number;
    tackling?: number;
    awareness: number;
  },
  overall: number
): Player {
  return {
    id: uuidv4(),
    firstName,
    lastName,
    position: position as any,
    age: 24 + Math.floor(Math.random() * 8),
    experience: Math.floor(Math.random() * 10),
    ratings: {
      speed: ratings.speed,
      strength: ratings.strength,
      agility: ratings.agility,
      stamina: 70 + Math.floor(Math.random() * 15),
      awareness: ratings.awareness,
      discipline: 65 + Math.floor(Math.random() * 20),
      clutch: 60 + Math.floor(Math.random() * 25),
      throwing: ratings.throwing ?? 40,
      catching: ratings.catching ?? 40,
      carrying: ratings.carrying ?? 40,
      blocking: ratings.blocking ?? 40,
      passRush: 40,
      coverage: ratings.coverage ?? 40,
      tackling: ratings.tackling ?? 40,
      kickPower: 50,
      kickAccuracy: 50,
      clutchKicking: 50,
      coverageUnit: 50,
      ego: 40 + Math.floor(Math.random() * 40),
      loyalty: 50 + Math.floor(Math.random() * 30),
      vice: 20 + Math.floor(Math.random() * 40),
    },
    overall,
    potential: overall + Math.floor(Math.random() * 10),
    status: { condition: 'HEALTHY', cardQualityModifier: 0 },
    contract: null,
    cardsGenerated: [],
    cardContribution: 1,
    personality: { primary: 'QUIET_PROFESSIONAL' },
    scandalHistory: [],
    trustInGM: 70,
  };
}

function createOLine(name: string, passBlock: number, runBlock: number, overall: number): OLineUnit {
  return {
    id: uuidv4(),
    name,
    overall,
    passBlockRating: passBlock,
    runBlockRating: runBlock,
    personality: 'Blue collar',
    captain: {
      firstName: 'Mike',
      lastName: 'Johnson',
      ego: 35,
      vice: 25,
    },
  };
}

function createDLine(name: string, passRush: number, runStop: number, overall: number): DLineUnit {
  return {
    id: uuidv4(),
    name,
    overall,
    passRushRating: passRush,
    runStopRating: runStop,
    personality: 'Relentless',
    captain: {
      firstName: 'Marcus',
      lastName: 'Williams',
      ego: 50,
      vice: 30,
    },
  };
}

function createKicker(firstName: string, lastName: string, power: number, accuracy: number, clutch: number): Player {
  return {
    id: uuidv4(),
    firstName,
    lastName,
    position: 'ST',
    age: 28 + Math.floor(Math.random() * 8),
    experience: Math.floor(Math.random() * 12),
    ratings: {
      speed: 55,
      strength: 55,
      agility: 60,
      stamina: 80,
      awareness: 75,
      discipline: 85,
      clutch: clutch,
      throwing: 40,
      catching: 40,
      carrying: 40,
      blocking: 40,
      passRush: 40,
      coverage: 40,
      tackling: 40,
      kickPower: power,
      kickAccuracy: accuracy,
      clutchKicking: clutch,
      coverageUnit: 70,
      ego: 30,
      loyalty: 70,
      vice: 20,
    },
    overall: Math.round((power + accuracy + clutch) / 3),
    potential: 80,
    status: { condition: 'HEALTHY', cardQualityModifier: 0 },
    contract: null,
    cardsGenerated: [],
    cardContribution: 1,
    personality: { primary: 'QUIET_PROFESSIONAL' },
    scandalHistory: [],
    trustInGM: 75,
  };
}

// =============================================================================
// TEAM 1: NEW YORK EMPIRE (Powerhouse - Overall 88)
// =============================================================================

const NY_EMPIRE_INFO: StaticTeamInfo = {
  id: 'ny-empire',
  name: 'Empire',
  city: 'New York',
  abbreviation: 'NYE',
  primaryColor: '#003366',
  secondaryColor: '#FF6600',
  identity: {
    offenseStyle: 'BALANCED',
    defenseStyle: 'AGGRESSIVE',
    overall: 88,
    description: 'Elite talent at every position. Championship expectations.',
  },
};

const NY_EMPIRE_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Marcus', 'Sterling', 'QB', { speed: 78, strength: 72, agility: 82, throwing: 94, awareness: 92 }, 91),
    RB: createPlayer('DeShawn', 'Carter', 'RB', { speed: 93, strength: 85, agility: 90, carrying: 88, catching: 75, awareness: 80 }, 88),
    WR1: createPlayer('Terrell', 'Washington', 'WR', { speed: 95, strength: 70, agility: 92, catching: 91, awareness: 85 }, 90),
    WR2: createPlayer('Chris', 'Patterson', 'WR', { speed: 90, strength: 68, agility: 88, catching: 86, awareness: 82 }, 85),
    TE: createPlayer('Jason', 'Mitchell', 'TE', { speed: 78, strength: 82, agility: 75, catching: 84, blocking: 80, awareness: 78 }, 82),
    OL: createOLine('The Wall', 88, 85, 86),
  },
  defense: {
    DL: createDLine('Empire Front', 90, 85, 87),
    LB: createPlayer('Marcus', 'Thompson', 'LB', { speed: 85, strength: 88, agility: 82, coverage: 78, tackling: 92, awareness: 88 }, 88),
    CB1: createPlayer('Darius', 'Jackson', 'CB', { speed: 94, strength: 70, agility: 90, coverage: 92, tackling: 72, awareness: 86 }, 89),
    CB2: createPlayer('Tre', 'Williams', 'CB', { speed: 91, strength: 68, agility: 88, coverage: 85, tackling: 70, awareness: 82 }, 84),
    S: createPlayer('Jamal', 'Brown', 'S', { speed: 88, strength: 78, agility: 85, coverage: 86, tackling: 85, awareness: 90 }, 87),
  },
  specialTeams: {
    KP: createKicker('Adam', 'Reynolds', 88, 90, 85),
  },
  flex: {
    type: 'WR3' as FlexType,
    player: createPlayer('Devon', 'Harris', 'WR', { speed: 88, strength: 65, agility: 85, catching: 82, awareness: 78 }, 80),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// TEAM 2: DALLAS OUTLAWS (Air Raid - Overall 84)
// =============================================================================

const DAL_OUTLAWS_INFO: StaticTeamInfo = {
  id: 'dal-outlaws',
  name: 'Outlaws',
  city: 'Dallas',
  abbreviation: 'DAL',
  primaryColor: '#00338D',
  secondaryColor: '#8B9095',
  identity: {
    offenseStyle: 'PASS_HEAVY',
    defenseStyle: 'BALANCED',
    overall: 84,
    description: 'Elite passing attack. Can score from anywhere on the field.',
  },
};

const DAL_OUTLAWS_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Tyler', 'Prescott', 'QB', { speed: 82, strength: 75, agility: 85, throwing: 92, awareness: 88 }, 90),
    RB: createPlayer('Jamal', 'Edwards', 'RB', { speed: 86, strength: 78, agility: 84, carrying: 80, catching: 82, awareness: 75 }, 78),
    WR1: createPlayer('DeAndre', 'Cooper', 'WR', { speed: 94, strength: 72, agility: 95, catching: 93, awareness: 88 }, 92),
    WR2: createPlayer('Michael', 'Galloway', 'WR', { speed: 92, strength: 70, agility: 90, catching: 88, awareness: 84 }, 87),
    TE: createPlayer('Blake', 'Jarrett', 'TE', { speed: 82, strength: 78, agility: 80, catching: 85, blocking: 72, awareness: 80 }, 80),
    OL: createOLine('Star Line', 85, 75, 80),
  },
  defense: {
    DL: createDLine('Dallas Rush', 82, 78, 80),
    LB: createPlayer('Leighton', 'Vance', 'LB', { speed: 84, strength: 85, agility: 80, coverage: 75, tackling: 85, awareness: 82 }, 82),
    CB1: createPlayer('Trevon', 'Diggs', 'CB', { speed: 92, strength: 68, agility: 88, coverage: 88, tackling: 68, awareness: 80 }, 84),
    CB2: createPlayer('Jourdan', 'Lewis', 'CB', { speed: 88, strength: 70, agility: 85, coverage: 80, tackling: 72, awareness: 78 }, 79),
    S: createPlayer('Jayron', 'Kearse', 'S', { speed: 85, strength: 80, agility: 82, coverage: 78, tackling: 82, awareness: 84 }, 82),
  },
  specialTeams: {
    KP: createKicker('Brandon', 'Aubrey', 92, 88, 82),
  },
  flex: {
    type: 'WR3' as FlexType,
    player: createPlayer('Jalen', 'Tolbert', 'WR', { speed: 90, strength: 68, agility: 86, catching: 80, awareness: 75 }, 78),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// TEAM 3: KANSAS CITY STOCKMEN (Ground & Pound - Overall 82)
// =============================================================================

const KC_STOCKMEN_INFO: StaticTeamInfo = {
  id: 'kc-stockmen',
  name: 'Stockmen',
  city: 'Kansas City',
  abbreviation: 'KC',
  primaryColor: '#9B111E',
  secondaryColor: '#F2C75C',
  identity: {
    offenseStyle: 'RUN_HEAVY',
    defenseStyle: 'CONSERVATIVE',
    overall: 82,
    description: 'Smashmouth football. Control the clock and wear you down.',
  },
};

const KC_STOCKMEN_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Jake', 'Morrison', 'QB', { speed: 70, strength: 78, agility: 72, throwing: 78, awareness: 82 }, 78),
    RB: createPlayer('Derrick', 'King', 'RB', { speed: 88, strength: 92, agility: 85, carrying: 94, catching: 68, awareness: 82 }, 90),
    WR1: createPlayer('Allen', 'Robinson', 'WR', { speed: 86, strength: 78, agility: 82, catching: 82, awareness: 80 }, 81),
    WR2: createPlayer('Curtis', 'Samuel', 'WR', { speed: 90, strength: 70, agility: 88, catching: 78, awareness: 76 }, 78),
    TE: createPlayer('David', 'Njoku', 'TE', { speed: 80, strength: 85, agility: 78, catching: 80, blocking: 85, awareness: 78 }, 82),
    OL: createOLine('The Herd', 78, 92, 85),
  },
  defense: {
    DL: createDLine('Stockyard Front', 75, 88, 82),
    LB: createPlayer('Roquan', 'Smith', 'LB', { speed: 86, strength: 82, agility: 84, coverage: 80, tackling: 90, awareness: 88 }, 86),
    CB1: createPlayer('Jaylon', 'Johnson', 'CB', { speed: 90, strength: 72, agility: 86, coverage: 82, tackling: 75, awareness: 80 }, 82),
    CB2: createPlayer('Kyler', 'Gordon', 'CB', { speed: 88, strength: 70, agility: 84, coverage: 78, tackling: 72, awareness: 76 }, 78),
    S: createPlayer('Eddie', 'Jackson', 'S', { speed: 88, strength: 75, agility: 82, coverage: 85, tackling: 80, awareness: 86 }, 84),
  },
  specialTeams: {
    KP: createKicker('Cairo', 'Santos', 82, 88, 85),
  },
  flex: {
    type: 'RB2' as FlexType,
    player: createPlayer('Khalil', 'Herbert', 'RB', { speed: 90, strength: 82, agility: 86, carrying: 85, catching: 65, awareness: 75 }, 82),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// TEAM 4: BOSTON NOR'EASTERS (Defensive - Overall 80)
// =============================================================================

const BOS_NOREASTERS_INFO: StaticTeamInfo = {
  id: 'bos-noreasters',
  name: "Nor'easters",
  city: 'Boston',
  abbreviation: 'BOS',
  primaryColor: '#1C2841',
  secondaryColor: '#C41E3A',
  identity: {
    offenseStyle: 'BALANCED',
    defenseStyle: 'AGGRESSIVE',
    overall: 80,
    description: 'Suffocating defense. Will make you earn every yard.',
  },
};

const BOS_NOREASTERS_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Mac', 'Jones', 'QB', { speed: 68, strength: 72, agility: 70, throwing: 82, awareness: 85 }, 80),
    RB: createPlayer('Rhamondre', 'Stevenson', 'RB', { speed: 84, strength: 88, agility: 82, carrying: 85, catching: 75, awareness: 78 }, 82),
    WR1: createPlayer('Kendrick', 'Bourne', 'WR', { speed: 88, strength: 72, agility: 84, catching: 82, awareness: 78 }, 80),
    WR2: createPlayer('JuJu', 'Smith', 'WR', { speed: 85, strength: 75, agility: 80, catching: 80, awareness: 80 }, 78),
    TE: createPlayer('Hunter', 'Henry', 'TE', { speed: 78, strength: 80, agility: 76, catching: 85, blocking: 78, awareness: 82 }, 80),
    OL: createOLine('Patriots Wall', 80, 82, 81),
  },
  defense: {
    DL: createDLine('Storm Front', 88, 86, 87),
    LB: createPlayer('Matt', 'Judon', 'LB', { speed: 82, strength: 88, agility: 80, coverage: 72, tackling: 90, awareness: 85 }, 86),
    CB1: createPlayer('Christian', 'Gonzalez', 'CB', { speed: 94, strength: 70, agility: 90, coverage: 88, tackling: 70, awareness: 82 }, 86),
    CB2: createPlayer('Jonathan', 'Jones', 'CB', { speed: 90, strength: 68, agility: 86, coverage: 82, tackling: 72, awareness: 80 }, 81),
    S: createPlayer('Kyle', 'Dugger', 'S', { speed: 88, strength: 82, agility: 84, coverage: 80, tackling: 88, awareness: 85 }, 85),
  },
  specialTeams: {
    KP: createKicker('Chad', 'Ryland', 85, 82, 78),
  },
  flex: {
    type: 'TE2' as FlexType,
    player: createPlayer('Mike', 'Gesicki', 'TE', { speed: 82, strength: 78, agility: 80, catching: 82, blocking: 70, awareness: 78 }, 78),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// TEAM 5: LA QUAKE (Explosive - Overall 76)
// =============================================================================

const LA_QUAKE_INFO: StaticTeamInfo = {
  id: 'la-quake',
  name: 'Quake',
  city: 'Los Angeles',
  abbreviation: 'LA',
  primaryColor: '#002147',
  secondaryColor: '#FFC72C',
  identity: {
    offenseStyle: 'EXPLOSIVE',
    defenseStyle: 'BLITZ_HEAVY',
    overall: 76,
    description: 'Boom or bust. Big plays or big mistakes.',
  },
};

const LA_QUAKE_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Matthew', 'Stafford', 'QB', { speed: 65, strength: 78, agility: 68, throwing: 88, awareness: 85 }, 84),
    RB: createPlayer('Kyren', 'Williams', 'RB', { speed: 88, strength: 75, agility: 88, carrying: 80, catching: 78, awareness: 75 }, 78),
    WR1: createPlayer('Puka', 'Nacua', 'WR', { speed: 90, strength: 72, agility: 90, catching: 90, awareness: 82 }, 86),
    WR2: createPlayer('Cooper', 'Kupp', 'WR', { speed: 85, strength: 75, agility: 88, catching: 92, awareness: 90 }, 88),
    TE: createPlayer('Tyler', 'Higbee', 'TE', { speed: 75, strength: 80, agility: 72, catching: 78, blocking: 75, awareness: 78 }, 76),
    OL: createOLine('Hollywood Line', 78, 72, 75),
  },
  defense: {
    DL: createDLine('Quake Rush', 80, 70, 75),
    LB: createPlayer('Ernest', 'Jones', 'LB', { speed: 82, strength: 80, agility: 78, coverage: 75, tackling: 82, awareness: 80 }, 79),
    CB1: createPlayer('Darious', 'Williams', 'CB', { speed: 88, strength: 68, agility: 84, coverage: 78, tackling: 65, awareness: 76 }, 76),
    CB2: createPlayer('Cobie', 'Durant', 'CB', { speed: 90, strength: 65, agility: 86, coverage: 75, tackling: 62, awareness: 72 }, 73),
    S: createPlayer('Quentin', 'Lake', 'S', { speed: 85, strength: 75, agility: 80, coverage: 72, tackling: 78, awareness: 75 }, 76),
  },
  specialTeams: {
    KP: createKicker('Lucas', 'Havrisik', 78, 75, 70),
  },
  flex: {
    type: 'WR3' as FlexType,
    player: createPlayer('Tutu', 'Atwell', 'WR', { speed: 96, strength: 58, agility: 92, catching: 72, awareness: 70 }, 74),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// TEAM 6: DENVER SUMMIT (Balanced - Overall 72)
// =============================================================================

const DEN_SUMMIT_INFO: StaticTeamInfo = {
  id: 'den-summit',
  name: 'Summit',
  city: 'Denver',
  abbreviation: 'DEN',
  primaryColor: '#002244',
  secondaryColor: '#FF6600',
  identity: {
    offenseStyle: 'BALANCED',
    defenseStyle: 'BALANCED',
    overall: 72,
    description: 'Young team building for the future. No weaknesses, no stars.',
  },
};

const DEN_SUMMIT_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Bo', 'Nix', 'QB', { speed: 78, strength: 70, agility: 80, throwing: 78, awareness: 75 }, 76),
    RB: createPlayer('Javonte', 'Williams', 'RB', { speed: 86, strength: 82, agility: 84, carrying: 82, catching: 72, awareness: 75 }, 80),
    WR1: createPlayer('Courtland', 'Sutton', 'WR', { speed: 86, strength: 80, agility: 82, catching: 85, awareness: 80 }, 82),
    WR2: createPlayer('Marvin', 'Mims', 'WR', { speed: 94, strength: 62, agility: 88, catching: 75, awareness: 72 }, 76),
    TE: createPlayer('Adam', 'Trautman', 'TE', { speed: 75, strength: 78, agility: 72, catching: 75, blocking: 78, awareness: 72 }, 74),
    OL: createOLine('Mile High Wall', 75, 78, 76),
  },
  defense: {
    DL: createDLine('Summit Pass Rush', 78, 76, 77),
    LB: createPlayer('Alex', 'Singleton', 'LB', { speed: 80, strength: 78, agility: 76, coverage: 72, tackling: 82, awareness: 78 }, 78),
    CB1: createPlayer('Pat', 'Surtain', 'CB', { speed: 90, strength: 72, agility: 88, coverage: 88, tackling: 72, awareness: 85 }, 86),
    CB2: createPlayer('Riley', 'Moss', 'CB', { speed: 86, strength: 68, agility: 82, coverage: 75, tackling: 68, awareness: 72 }, 74),
    S: createPlayer('Brandon', 'Jones', 'S', { speed: 86, strength: 78, agility: 80, coverage: 75, tackling: 80, awareness: 78 }, 78),
  },
  specialTeams: {
    KP: createKicker('Will', 'Lutz', 85, 85, 82),
  },
  flex: {
    type: 'RB2' as FlexType,
    player: createPlayer('Samaje', 'Perine', 'RB', { speed: 82, strength: 80, agility: 78, carrying: 78, catching: 75, awareness: 75 }, 76),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// TEAM 7: MIAMI SHARKS (Trick Heavy - Overall 68)
// =============================================================================

const MIA_SHARKS_INFO: StaticTeamInfo = {
  id: 'mia-sharks',
  name: 'Sharks',
  city: 'Miami',
  abbreviation: 'MIA',
  primaryColor: '#008B8B',
  secondaryColor: '#FF4500',
  identity: {
    offenseStyle: 'TRICK_HEAVY',
    defenseStyle: 'BLITZ_HEAVY',
    overall: 68,
    description: 'Unpredictable scheme team. Will catch you off guard or self-destruct.',
  },
};

const MIA_SHARKS_ROSTER: Roster = {
  offense: {
    QB: createPlayer('Tua', 'Tagovailoa', 'QB', { speed: 72, strength: 68, agility: 78, throwing: 85, awareness: 82 }, 80),
    RB: createPlayer('De\'Von', 'Achane', 'RB', { speed: 96, strength: 68, agility: 94, carrying: 75, catching: 80, awareness: 72 }, 80),
    WR1: createPlayer('Tyreek', 'Hill', 'WR', { speed: 99, strength: 65, agility: 94, catching: 85, awareness: 82 }, 88),
    WR2: createPlayer('Jaylen', 'Waddle', 'WR', { speed: 96, strength: 68, agility: 92, catching: 82, awareness: 78 }, 84),
    TE: createPlayer('Durham', 'Smythe', 'TE', { speed: 72, strength: 78, agility: 68, catching: 70, blocking: 75, awareness: 70 }, 70),
    OL: createOLine('Fins Line', 68, 65, 66),
  },
  defense: {
    DL: createDLine('Shark Attack', 72, 65, 68),
    LB: createPlayer('Jerome', 'Baker', 'LB', { speed: 84, strength: 75, agility: 80, coverage: 75, tackling: 78, awareness: 76 }, 77),
    CB1: createPlayer('Jalen', 'Ramsey', 'CB', { speed: 88, strength: 78, agility: 85, coverage: 85, tackling: 78, awareness: 85 }, 84),
    CB2: createPlayer('Kader', 'Kohou', 'CB', { speed: 88, strength: 68, agility: 84, coverage: 72, tackling: 65, awareness: 70 }, 72),
    S: createPlayer('Jevon', 'Holland', 'S', { speed: 88, strength: 75, agility: 82, coverage: 78, tackling: 75, awareness: 80 }, 79),
  },
  specialTeams: {
    KP: createKicker('Jason', 'Sanders', 80, 82, 78),
  },
  flex: {
    type: 'WR3' as FlexType,
    player: createPlayer('Braxton', 'Berrios', 'WR', { speed: 88, strength: 65, agility: 86, catching: 75, awareness: 72 }, 74),
  },
  returner: { kickReturner: '', puntReturner: '' },
};

// =============================================================================
// EXPORTS
// =============================================================================

export interface StaticTeam {
  info: StaticTeamInfo;
  roster: Roster;
}

export const STATIC_TEAMS: StaticTeam[] = [
  { info: NY_EMPIRE_INFO, roster: NY_EMPIRE_ROSTER },
  { info: DAL_OUTLAWS_INFO, roster: DAL_OUTLAWS_ROSTER },
  { info: KC_STOCKMEN_INFO, roster: KC_STOCKMEN_ROSTER },
  { info: BOS_NOREASTERS_INFO, roster: BOS_NOREASTERS_ROSTER },
  { info: LA_QUAKE_INFO, roster: LA_QUAKE_ROSTER },
  { info: DEN_SUMMIT_INFO, roster: DEN_SUMMIT_ROSTER },
  { info: MIA_SHARKS_INFO, roster: MIA_SHARKS_ROSTER },
];

/**
 * Get a static team by ID
 */
export function getStaticTeam(teamId: string): StaticTeam | null {
  return STATIC_TEAMS.find(t => t.info.id === teamId) || null;
}

/**
 * Get all static team IDs
 */
export function getStaticTeamIds(): string[] {
  return STATIC_TEAMS.map(t => t.info.id);
}

/**
 * Get team identity by ID (for simulation)
 */
export function getTeamIdentity(teamId: string): TeamIdentity | null {
  const team = getStaticTeam(teamId);
  return team ? team.info.identity : null;
}
