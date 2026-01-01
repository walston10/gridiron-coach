import type { FormationType, FieldSide, PersonnelPackage } from '../types';

export type PositionTemplate = {
  slot: string;
  label: string;
  x: number;
  y: number;
  defaultRole: 'ROUTE' | 'BLOCK' | 'QB' | 'RB';
  isOnLine: boolean;
  fieldSide: FieldSide;
  canRunRoutes: boolean;
};

export type FormationTemplate = {
  type: FormationType;
  name: string;
  personnel: PersonnelPackage;
  positions: PositionTemplate[];
};

// COORDINATE SYSTEM:
// X: 0 = left sideline, 50 = center of field, 100 = right sideline
// Y: 0 = top (defense side), 50 = LOS, 100 = bottom (offense backfield)
// Players on offense are at y >= 50 (on or behind LOS)

// STANDARD OL POSITIONS (tight splits ~4 units apart)
const OL_Y = 50; // On the line
const OL_POSITIONS = {
  LT: { x: 41, y: OL_Y },
  LG: { x: 45, y: OL_Y },
  C:  { x: 50, y: OL_Y },
  RG: { x: 55, y: OL_Y },
  RT: { x: 59, y: OL_Y },
};

// Helper to create OL
const createOL = (): PositionTemplate[] => [
  { slot: 'LT', label: 'LT', ...OL_POSITIONS.LT, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: false },
  { slot: 'LG', label: 'LG', ...OL_POSITIONS.LG, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: false },
  { slot: 'C', label: 'C', ...OL_POSITIONS.C, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'CENTER', canRunRoutes: false },
  { slot: 'RG', label: 'RG', ...OL_POSITIONS.RG, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: false },
  { slot: 'RT', label: 'RT', ...OL_POSITIONS.RT, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: false },
];

export const FORMATIONS: FormationTemplate[] = [
  // ==================== 11 PERSONNEL (1 RB, 1 TE, 3 WR) ====================
  {
    type: 'SHOTGUN',
    name: 'Shotgun',
    personnel: '11',
    positions: [
      ...createOL(),
      // X - Split End (left, ON the line)
      { slot: 'X', label: 'X', x: 10, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      // H - Slot Left (OFF the line)
      { slot: 'H', label: 'H', x: 28, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'LEFT', canRunRoutes: true },
      // Y - Tight End (right, ON the line, clearly outside RT)
      { slot: 'Y', label: 'Y', x: 66, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      // Z - Flanker (right, OFF the line)
      { slot: 'Z', label: 'Z', x: 88, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
      // QB - Shotgun depth
      { slot: 'QB', label: 'QB', x: 50, y: 60, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      // RB - Next to QB
      { slot: 'RB', label: 'RB', x: 56, y: 62, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
    ],
  },
  {
    type: 'SINGLEBACK',
    name: 'Singleback',
    personnel: '11',
    positions: [
      ...createOL(),
      { slot: 'X', label: 'X', x: 10, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'H', label: 'H', x: 28, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'Y', label: 'Y', x: 66, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'Z', label: 'Z', x: 88, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
      // QB - Under center
      { slot: 'QB', label: 'QB', x: 50, y: 54, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      // RB - Deep behind QB
      { slot: 'RB', label: 'RB', x: 50, y: 65, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
    ],
  },
  {
    type: 'SPREAD',
    name: 'Spread',
    personnel: '11',
    positions: [
      ...createOL(),
      // 4 WR spread out, TE inline
      { slot: 'X', label: 'X', x: 5, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'H', label: 'H', x: 25, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'Y', label: 'Y', x: 66, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'Z', label: 'Z', x: 95, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'QB', label: 'QB', x: 50, y: 60, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      { slot: 'RB', label: 'RB', x: 50, y: 66, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
    ],
  },
  {
    type: 'PISTOL',
    name: 'Pistol',
    personnel: '11',
    positions: [
      ...createOL(),
      { slot: 'X', label: 'X', x: 10, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'H', label: 'H', x: 28, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'Y', label: 'Y', x: 66, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'Z', label: 'Z', x: 88, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
      // QB - Pistol depth (shorter than shotgun)
      { slot: 'QB', label: 'QB', x: 50, y: 57, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      // RB - Directly behind QB
      { slot: 'RB', label: 'RB', x: 50, y: 66, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
    ],
  },
  {
    type: 'EMPTY',
    name: 'Empty (5 Wide)',
    personnel: '10',
    positions: [
      ...createOL(),
      // 5 receivers, no RB
      { slot: 'X', label: 'X', x: 5, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'H', label: 'H', x: 22, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'Y', label: 'Y', x: 50, y: 55, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
      { slot: 'F', label: 'F', x: 78, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'Z', label: 'Z', x: 95, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'QB', label: 'QB', x: 50, y: 62, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
    ],
  },

  // ==================== 21 PERSONNEL (2 RB, 1 TE, 2 WR) ====================
  {
    type: 'I_FORM',
    name: 'I-Formation',
    personnel: '21',
    positions: [
      ...createOL(),
      { slot: 'X', label: 'X', x: 10, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      { slot: 'Y', label: 'Y', x: 66, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'Z', label: 'Z', x: 90, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
      // QB - Under center
      { slot: 'QB', label: 'QB', x: 50, y: 54, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      // FB - In front of RB
      { slot: 'FB', label: 'FB', x: 50, y: 62, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
      // RB - Deep in I
      { slot: 'RB', label: 'RB', x: 50, y: 70, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
    ],
  },

  // ==================== 12 PERSONNEL (1 RB, 2 TE, 2 WR) ====================
  {
    type: 'JUMBO',
    name: '12 Personnel',
    personnel: '12',
    positions: [
      ...createOL(),
      { slot: 'X', label: 'X', x: 8, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      // Y - TE left side
      { slot: 'Y', label: 'Y', x: 34, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      // U - TE right side
      { slot: 'U', label: 'U', x: 66, y: 50, defaultRole: 'ROUTE', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'Z', label: 'Z', x: 92, y: 53, defaultRole: 'ROUTE', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'QB', label: 'QB', x: 50, y: 54, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      { slot: 'RB', label: 'RB', x: 50, y: 65, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
    ],
  },

  // ==================== GOAL LINE (2 RB, 3 TE, 0 WR) ====================
  {
    type: 'GOAL_LINE',
    name: 'Goal Line',
    personnel: '23',
    positions: [
      ...createOL(),
      // Y - TE left
      { slot: 'Y', label: 'Y', x: 34, y: 50, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'LEFT', canRunRoutes: true },
      // U - TE right
      { slot: 'U', label: 'U', x: 66, y: 50, defaultRole: 'BLOCK', isOnLine: true, fieldSide: 'RIGHT', canRunRoutes: true },
      { slot: 'QB', label: 'QB', x: 50, y: 54, defaultRole: 'QB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: false },
      // FB - Lead blocker
      { slot: 'FB', label: 'FB', x: 50, y: 60, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
      // RB - Ball carrier
      { slot: 'RB', label: 'RB', x: 50, y: 68, defaultRole: 'RB', isOnLine: false, fieldSide: 'CENTER', canRunRoutes: true },
      // Extra blocker (wing)
      { slot: 'W', label: 'W', x: 72, y: 53, defaultRole: 'BLOCK', isOnLine: false, fieldSide: 'RIGHT', canRunRoutes: true },
    ],
  },
];

// Validation
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const validateFormation = (positions: PositionTemplate[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Total players
  if (positions.length !== 11) {
    errors.push(`Must have exactly 11 players (currently ${positions.length})`);
  }

  // Calculate who is ACTUALLY on the line based on Y position (within 3 units of y=50)
  const LOS_Y = 50;
  const LOS_TOLERANCE = 3;

  const actuallyOnLine = positions.filter(p => Math.abs(p.y - LOS_Y) <= LOS_TOLERANCE);
  const inBackfield = positions.filter(p => p.y > LOS_Y + LOS_TOLERANCE);

  // Must have exactly 7 on the line
  if (actuallyOnLine.length !== 7) {
    errors.push(`Must have exactly 7 players on the line (currently ${actuallyOnLine.length})`);
  }

  // Must have exactly 4 in backfield
  if (inBackfield.length !== 4) {
    errors.push(`Must have exactly 4 players in backfield (currently ${inBackfield.length})`);
  }

  // Check no one is past the line of scrimmage (y < 47)
  const pastLOS = positions.filter(p => p.y < LOS_Y - LOS_TOLERANCE);
  if (pastLOS.length > 0) {
    errors.push(`${pastLOS.map(p => p.label).join(', ')} past line of scrimmage`);
  }

  // Check ends are eligible (the leftmost and rightmost players ON the line)
  if (actuallyOnLine.length >= 2) {
    const onLineSorted = [...actuallyOnLine].sort((a, b) => a.x - b.x);
    const leftEnd = onLineSorted[0];
    const rightEnd = onLineSorted[onLineSorted.length - 1];

    if (!leftEnd.canRunRoutes) {
      errors.push(`Left end of line (${leftEnd.label}) must be eligible receiver`);
    }
    if (!rightEnd.canRunRoutes) {
      errors.push(`Right end of line (${rightEnd.label}) must be eligible receiver`);
    }

    // Check interior 5 are ineligible
    const interior = onLineSorted.slice(1, -1);
    const eligibleInterior = interior.filter(p => p.canRunRoutes);
    if (eligibleInterior.length > 0 && interior.length === 5) {
      // This is actually allowed but they can't receive passes (covered)
      warnings.push(`${eligibleInterior.map(p => p.label).join(', ')} covered by players on ends`);
    }
  }

  // OL spacing (find the 5 ineligible players)
  const olPositions = positions.filter(p => !p.canRunRoutes && p.slot !== 'QB');
  if (olPositions.length === 5) {
    const olSorted = [...olPositions].sort((a, b) => a.x - b.x);
    for (let i = 1; i < olSorted.length; i++) {
      const gap = olSorted[i].x - olSorted[i-1].x;
      if (gap > 12) {
        errors.push(`OL spacing too wide between ${olSorted[i-1].label} and ${olSorted[i].label}`);
      }
    }

    // OL must be on the line
    const olOffLine = olPositions.filter(p => Math.abs(p.y - LOS_Y) > LOS_TOLERANCE);
    if (olOffLine.length > 0) {
      errors.push(`Linemen must be on line of scrimmage: ${olOffLine.map(p => p.label).join(', ')}`);
    }
  }

  // QB depth - can't be more than 25 yards back
  const qb = positions.find(p => p.slot === 'QB');
  if (qb) {
    if (qb.y > 75) {
      errors.push('QB too far from line of scrimmage (max ~8 yards)');
    }
    if (qb.y <= LOS_Y) {
      errors.push('QB must be behind line of scrimmage');
    }
  }

  // Players in bounds
  positions.forEach(p => {
    if (p.x < 0 || p.x > 100) {
      errors.push(`${p.label} is out of bounds`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
