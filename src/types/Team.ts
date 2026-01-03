import type { Player, TeamRoster, LineUnitEntity } from './Player';

export type TeamInfo = {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  prestige: number;           // 1-5 stars
  isUserTeam: boolean;
};

export type Team = {
  info: TeamInfo;
  roster: Player[];           // Full roster (franchise mode - all positions)
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
  skill: number;              // 1-99
  schemeBonus: string;        // e.g., "Run Heavy", "West Coast"
  salary: number;
};

// =============================================================================
// LEGACY SUPPORT (for migration)
// =============================================================================

// Old-style depth chart (deprecated, will be removed)
export type DepthChart = {
  [positionSlot: string]: string[];
};

// Legacy team structure (for migration purposes)
export type LegacyTeam = {
  info: TeamInfo;
  roster: Player[];           // Flat array (old style)
  depthChart: DepthChart;
  capSpace: number;
  deadCap: number;
  coordinators: {
    oc: Coordinator | null;
    dc: Coordinator | null;
  };
};
