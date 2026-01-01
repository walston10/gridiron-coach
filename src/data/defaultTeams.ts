import type { TeamInfo, CPUTeamPersonality, GMArchetype } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate a team with personality
const createTeam = (
  name: string,
  city: string,
  abbr: string,
  primary: string,
  secondary: string,
  prestige: number,
  archetype: GMArchetype,
  isUserTeam: boolean = false
): { info: TeamInfo; personality: CPUTeamPersonality } => {
  const id = uuidv4();
  return {
    info: {
      id,
      name,
      city,
      abbreviation: abbr,
      primaryColor: primary,
      secondaryColor: secondary,
      prestige,
      isUserTeam,
    },
    personality: {
      teamId: id,
      gmArchetype: archetype,
      scoutingAccuracy: 70 + Math.floor(Math.random() * 20),
      reachTolerance: Math.floor(Math.random() * 10),
      freeAgencySpeed: ['FAST', 'MEDIUM', 'SLOW'][Math.floor(Math.random() * 3)] as 'FAST' | 'MEDIUM' | 'SLOW',
      spendingTendency: ['AGGRESSIVE', 'MODERATE', 'CONSERVATIVE'][Math.floor(Math.random() * 3)] as 'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE',
    },
  };
};

// 8 TEAMS - 2 Divisions
export const DEFAULT_TEAMS = [
  // === EASTERN CONFERENCE ===
  createTeam('Empire', 'New York', 'NYC', '#003366', '#FF6600', 85, 'WIN_NOW'),
  createTeam('Nor\'easters', 'Boston', 'BOS', '#1C2841', '#C41E3A', 75, 'ANALYTICS'),
  createTeam('Sharks', 'Miami', 'MIA', '#008B8B', '#FF4500', 65, 'BOOM_BUST'),
  createTeam('Moles', 'Dustborough', 'DST', '#5C4033', '#8B8589', 35, 'REBUILDER', true), // USER TEAM

  // === WESTERN CONFERENCE ===
  createTeam('Outlaws', 'Dallas', 'DAL', '#00338D', '#8B9095', 80, 'WIN_NOW'),
  createTeam('Quake', 'Los Angeles', 'LA', '#002147', '#FFC72C', 70, 'ANALYTICS'),
  createTeam('Summit', 'Denver', 'DEN', '#002244', '#FF6600', 60, 'REBUILDER'),
  createTeam('Stockmen', 'Kansas City', 'KC', '#9B111E', '#F2C75C', 75, 'OLD_SCHOOL'),
];

// Division structure
export const DIVISIONS = {
  east: {
    name: 'Eastern Conference',
    teams: ['NYC', 'BOS', 'MIA', 'DST'],
  },
  west: {
    name: 'Western Conference',
    teams: ['DAL', 'LA', 'DEN', 'KC'],
  },
};

// Team descriptions:
// New York Empire (85) - Perennial contenders, big market, always in win-now mode
// Boston Nor'easters (75) - Analytics-driven, smart front office
// Miami Sharks (65) - Boom or bust, flashy but inconsistent
// Dustborough Moles (35) - YOUR TEAM! Lovable losers, digging out of the basement
// Dallas Outlaws (80) - Wild West swagger, championship expectations
// Los Angeles Quake (70) - Hollywood team, data-driven approach
// Denver Summit (60) - Rebuilding, young talent
// Kansas City Stockmen (75) - Old school, ground-and-pound football
