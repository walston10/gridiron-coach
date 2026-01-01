import type { PersonnelPackage } from '../types';

export type PersonnelInfo = {
  code: PersonnelPackage;
  name: string;
  description: string;
  rb: number;
  te: number;
  wr: number;
};

export const PERSONNEL_PACKAGES: PersonnelInfo[] = [
  { code: '10', name: '10 Personnel', description: '1 RB, 0 TE, 4 WR', rb: 1, te: 0, wr: 4 },
  { code: '11', name: '11 Personnel', description: '1 RB, 1 TE, 3 WR', rb: 1, te: 1, wr: 3 },
  { code: '12', name: '12 Personnel', description: '1 RB, 2 TE, 2 WR', rb: 1, te: 2, wr: 2 },
  { code: '13', name: '13 Personnel', description: '1 RB, 3 TE, 1 WR', rb: 1, te: 3, wr: 1 },
  { code: '20', name: '20 Personnel', description: '2 RB, 0 TE, 3 WR', rb: 2, te: 0, wr: 3 },
  { code: '21', name: '21 Personnel', description: '2 RB, 1 TE, 2 WR', rb: 2, te: 1, wr: 2 },
  { code: '22', name: '22 Personnel', description: '2 RB, 2 TE, 1 WR', rb: 2, te: 2, wr: 1 },
  { code: '23', name: '23 Personnel', description: '2 RB, 3 TE, 0 WR', rb: 2, te: 3, wr: 0 },
];

export const getPersonnelInfo = (code: PersonnelPackage): PersonnelInfo | undefined => {
  return PERSONNEL_PACKAGES.find(p => p.code === code);
};

export const getPersonnelByRBCount = (rbCount: number): PersonnelInfo[] => {
  return PERSONNEL_PACKAGES.filter(p => p.rb === rbCount);
};

export const getPersonnelByTECount = (teCount: number): PersonnelInfo[] => {
  return PERSONNEL_PACKAGES.filter(p => p.te === teCount);
};
