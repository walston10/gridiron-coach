export const GAME_CONSTANTS = {
  FIELD_WIDTH: 100,          // yards
  FIELD_HEIGHT: 53.3,        // yards
  QUARTERS: 4,
  QUARTER_LENGTH_MINUTES: 15,
  PLAY_CLOCK_SECONDS: 40,
  TIMEOUTS_PER_HALF: 3,
  YARDS_FOR_FIRST_DOWN: 10,
};

export const SALARY_CAP = 225_000_000;  // $225M
export const ROSTER_SIZE = 53;
export const PRACTICE_SQUAD_SIZE = 16;
export const DRAFT_ROUNDS = 7;
export const REGULAR_SEASON_WEEKS = 17;

export const POSITION_SALARY_RANGES: Record<string, { min: number, max: number }> = {
  QB: { min: 1_000_000, max: 50_000_000 },
  RB: { min: 750_000, max: 15_000_000 },
  WR: { min: 750_000, max: 30_000_000 },
  TE: { min: 750_000, max: 18_000_000 },
  LT: { min: 800_000, max: 25_000_000 },
  LG: { min: 750_000, max: 15_000_000 },
  C: { min: 750_000, max: 15_000_000 },
  RG: { min: 750_000, max: 15_000_000 },
  RT: { min: 800_000, max: 20_000_000 },
  DE: { min: 800_000, max: 30_000_000 },
  DT: { min: 750_000, max: 25_000_000 },
  OLB: { min: 750_000, max: 22_000_000 },
  MLB: { min: 750_000, max: 20_000_000 },
  CB: { min: 750_000, max: 22_000_000 },
  FS: { min: 750_000, max: 15_000_000 },
  SS: { min: 750_000, max: 15_000_000 },
};