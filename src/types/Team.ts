import type { Player } from './Player';

export type TeamInfo = {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  prestige: number;
  isUserTeam: boolean;
};

export type DepthChart = {
  [positionSlot: string]: string[];
};

export type Team = {
  info: TeamInfo;
  roster: Player[];
  depthChart: DepthChart;
  capSpace: number;
  deadCap: number;
  coordinators: {
    oc: Coordinator | null;
    dc: Coordinator | null;
  };
};

export type Coordinator = {
  id: string;
  name: string;
  skill: number;
  schemeBonus: string;
  salary: number;
};