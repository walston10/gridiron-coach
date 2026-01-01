import type { Player } from './Player';

export type FreeAgent = {
  player: Player;
  askingPrice: number;
  minYears: number;
  preferredTeams: string[];
  interestedTeams: string[];
  offers: ContractOffer[];
};

export type ContractOffer = {
  teamId: string;
  years: number;
  yearlySalary: number;
  guaranteedMoney: number;
  signingBonus: number;
  rolePromise: 'STARTER' | 'ROTATIONAL' | 'BACKUP' | 'DEPTH';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
};

export type FreeAgencyPeriod = {
  wave: 1 | 2 | 3;
  availablePlayers: FreeAgent[];
  dayNumber: number;
  isComplete: boolean;
};