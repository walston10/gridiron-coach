import type { Contract, Player } from '../types';
import { POSITION_SALARY_RANGES } from '../data/constants';

export const generateContract = (player: Player, isRookie: boolean = false): Contract => {
  const range = POSITION_SALARY_RANGES[player.position] || { min: 750_000, max: 10_000_000 };
  
  const overallFactor = (player.overall - 50) / 49;
  const baseSalary = range.min + (range.max - range.min) * overallFactor;
  
  const years = isRookie ? 4 : Math.ceil(Math.random() * 4) + 1;
  const yearlySalary = Math.round(baseSalary * (isRookie ? 0.6 : 1));
  
  return {
    years,
    yearlysalary: yearlySalary,
    guaranteedMoney: Math.round(yearlySalary * years * (isRookie ? 1 : 0.5)),
    signingBonus: isRookie ? 0 : Math.round(yearlySalary * 0.2),
  };
};

export const calculateCapHit = (contract: Contract): number => {
  return contract.yearlysalary + Math.round(contract.signingBonus / contract.years);
};

export const calculateDeadCap = (contract: Contract, yearsRemaining: number): number => {
  const bonusPerYear = contract.signingBonus / contract.years;
  return Math.round(bonusPerYear * yearsRemaining) + contract.guaranteedMoney;
};