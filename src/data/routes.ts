import type { RouteType, FieldSide } from '../types';

export type RoutePoint = { x: number; y: number };

export type RouteTemplate = {
  type: RouteType;
  name: string;
  description: string;
  basePoints: RoutePoint[];
  requiresMirror: boolean;
};

// Route visual templates for play diagrams
// Coordinates are relative to player position
// Negative Y = upfield (toward defense/endzone)
// Positive X = right, Negative X = left
// Scale: roughly 1 unit = 1 yard for visualization

export const ROUTES: RouteTemplate[] = [
  {
    type: 'GO',
    name: 'Go / Fly',
    description: 'Straight vertical route',
    basePoints: [{ x: 0, y: -8 }, { x: 0, y: -20 }, { x: 0, y: -35 }],
    requiresMirror: false,
  },
  {
    type: 'SLANT',
    name: 'Slant',
    description: 'Quick 3-step inside diagonal',
    basePoints: [{ x: 0, y: -3 }, { x: 10, y: -12 }],
    requiresMirror: true,
  },
  {
    type: 'IN',
    name: 'In / Dig',
    description: '12 yard vertical then 90 degree break inside',
    basePoints: [{ x: 0, y: -12 }, { x: 18, y: -12 }],
    requiresMirror: true,
  },
  {
    type: 'OUT',
    name: 'Out',
    description: '10-12 yard vertical then 90 degree break to sideline',
    basePoints: [{ x: 0, y: -11 }, { x: -14, y: -11 }],
    requiresMirror: true,
  },
  {
    type: 'CURL',
    name: 'Curl / Hitch',
    description: '10-12 yard vertical then turn back to QB',
    basePoints: [{ x: 0, y: -11 }, { x: 0, y: -9 }],
    requiresMirror: false,
  },
  {
    type: 'COMEBACK',
    name: 'Comeback',
    description: '15-18 yard vertical then come back toward sideline',
    basePoints: [{ x: 0, y: -16 }, { x: -6, y: -13 }],
    requiresMirror: true,
  },
  {
    type: 'POST',
    name: 'Post',
    description: '12-15 yard vertical then 45 degree break to goalpost',
    basePoints: [{ x: 0, y: -14 }, { x: 12, y: -28 }],
    requiresMirror: true,
  },
  {
    type: 'CORNER',
    name: 'Corner / Flag',
    description: '12-15 yard vertical then 45 degree break to pylon',
    basePoints: [{ x: 0, y: -14 }, { x: -14, y: -28 }],
    requiresMirror: true,
  },
  {
    type: 'DRAG',
    name: 'Drag',
    description: '2-3 yard depth then shallow cross (mesh route)',
    basePoints: [{ x: 0, y: -3 }, { x: 28, y: -3 }],
    requiresMirror: true,
  },
  {
    type: 'FLAT',
    name: 'Flat',
    description: 'Quick route to the flat (checkdown)',
    basePoints: [{ x: -8, y: -2 }, { x: -14, y: -1 }],
    requiresMirror: true,
  },
  {
    type: 'WHEEL',
    name: 'Wheel',
    description: 'Arc to flat then wheel up the sideline',
    basePoints: [{ x: -5, y: -1 }, { x: -14, y: -6 }, { x: -14, y: -25 }],
    requiresMirror: true,
  },
  {
    type: 'SCREEN',
    name: 'Screen',
    description: 'Let defenders through, catch behind line',
    basePoints: [{ x: -10, y: 2 }],
    requiresMirror: true,
  },
];

/**
 * Get route points adjusted for the player's field position
 */
export function getRoutePoints(
  routeType: RouteType,
  fieldSide: FieldSide,
  startX: number,
  startY: number
): RoutePoint[] {
  const template = ROUTES.find(r => r.type === routeType);
  if (!template) return [];

  return template.basePoints.map(point => {
    let adjustedX = point.x;

    // Mirror X for right-side players
    if (template.requiresMirror && fieldSide === 'RIGHT') {
      adjustedX = -point.x;
    }

    return {
      x: startX + adjustedX,
      y: startY + point.y,
    };
  });
}

/**
 * Get human-readable route direction description
 */
export function getRouteDescription(routeType: RouteType, fieldSide: FieldSide): string {
  const template = ROUTES.find(r => r.type === routeType);
  if (!template) return '';

  if (!template.requiresMirror) return template.description;

  switch (routeType) {
    case 'IN':
      return fieldSide === 'LEFT' ? 'Break right (inside)' : 'Break left (inside)';
    case 'OUT':
      return fieldSide === 'LEFT' ? 'Break left (sideline)' : 'Break right (sideline)';
    case 'SLANT':
      return fieldSide === 'LEFT' ? 'Angle right (inside)' : 'Angle left (inside)';
    case 'POST':
      return fieldSide === 'LEFT' ? 'Angle right to post' : 'Angle left to post';
    case 'CORNER':
      return fieldSide === 'LEFT' ? 'Angle left to pylon' : 'Angle right to pylon';
    case 'FLAT':
      return fieldSide === 'LEFT' ? 'Quick left to flat' : 'Quick right to flat';
    case 'DRAG':
      return fieldSide === 'LEFT' ? 'Drag right across' : 'Drag left across';
    default:
      return template.description;
  }
}
