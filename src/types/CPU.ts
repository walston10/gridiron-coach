export type GMArchetype = 
  | 'ANALYTICS'
  | 'OLD_SCHOOL'
  | 'BOOM_BUST'
  | 'WIN_NOW'
  | 'REBUILDER'
  | 'HOMER';

export type CPUTeamPersonality = {
  teamId: string;
  gmArchetype: GMArchetype;
  scoutingAccuracy: number;
  reachTolerance: number;
  freeAgencySpeed: 'FAST' | 'MEDIUM' | 'SLOW';
  spendingTendency: 'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE';
};