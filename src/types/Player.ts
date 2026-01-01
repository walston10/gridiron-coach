export type Position = 
  | 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'LT' | 'LG' | 'C' | 'RG' | 'RT'  // Offense
  | 'DE' | 'DT' | 'NT' | 'OLB' | 'MLB' | 'CB' | 'FS' | 'SS'  // Defense
  | 'K' | 'P';  // Special teams

export type PlayerStats = {
  speed: number;          // 1-99
  acceleration: number;
  strength: number;
  agility: number;
  awareness: number;
  catching: number;
  carrying: number;
  throwPower: number;
  throwAccuracy: number;
  routeRunning: number;
  passBlock: number;
  runBlock: number;
  tackle: number;
  coverage: number;
  passRush: number;
  elusiveness: number;
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  age: number;
  experience: number;      // years in league
  stats: PlayerStats;
  overall: number;         // calculated from stats
  potential: number;       // development ceiling
  contract: Contract | null;
  injuryStatus: InjuryStatus | null;
  teamId: string | null;
};

export type Contract = {
  years: number;
  yearlysalary: number;
  guaranteedMoney: number;
  signingBonus: number;
};

export type InjuryStatus = {
  type: string;
  weeksRemaining: number;
};