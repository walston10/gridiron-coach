import type { RouteType, FieldSide } from '../types';

export type RoutePoint = { x: number; y: number };

export type RouteTemplate = {
  type: RouteType;
  name: string;
  description: string;
  basePoints: RoutePoint[];
  requiresMirror: boolean;
};

// Routes are relative to player position
// Negative Y = upfield (toward defense/endzone)
// Positive X = right, Negative X = left

export const ROUTES: RouteTemplate[] = [
  {
    type: 'GO',
    name: 'Go / Fly',
    description: 'Straight vertical route',
    basePoints: [{ x: 0, y: -5 }, { x: 0, y: -15 }, { x: 0, y: -30 }],
    requiresMirror: false,
  },
  {
    type: 'SLANT',
    name: 'Slant',
    description: 'Quick inside diagonal',
    basePoints: [{ x: 0, y: -3 }, { x: 8, y: -10 }],
    requiresMirror: true,
  },
  {
    type: 'IN',
    name: 'In / Dig',
    description: 'Vertical then break inside',
    basePoints: [{ x: 0, y: -10 }, { x: 15, y: -10 }],
    requiresMirror: true,
  },
  {
    type: 'OUT',
    name: 'Out',
    description: 'Vertical then break to sideline',
    basePoints: [{ x: 0, y: -10 }, { x: -12, y: -10 }],
    requiresMirror: true,
  },
  {
    type: 'CURL',
    name: 'Curl / Hitch',
    description: 'Vertical then turn back to QB',
    basePoints: [{ x: 0, y: -10 }, { x: 0, y: -8 }],
    requiresMirror: false,
  },
  {
    type: 'COMEBACK',
    name: 'Comeback',
    description: 'Deep vertical then come back to sideline',
    basePoints: [{ x: 0, y: -15 }, { x: -5, y: -12 }],
    requiresMirror: true,
  },
  {
    type: 'POST',
    name: 'Post',
    description: 'Vertical then angle to goalpost',
    basePoints: [{ x: 0, y: -12 }, { x: 10, y: -25 }],
    requiresMirror: true,
  },
  {
    type: 'CORNER',
    name: 'Corner / Flag',
    description: 'Vertical then break to pylon',
    basePoints: [{ x: 0, y: -12 }, { x: -12, y: -25 }],
    requiresMirror: true,
  },
  {
    type: 'DRAG',
    name: 'Drag',
    description: 'Shallow cross all the way across',
    basePoints: [{ x: 0, y: -2 }, { x: 25, y: -2 }],
    requiresMirror: true,
  },
  {
    type: 'FLAT',
    name: 'Flat',
    description: 'Quick route to the flat',
    basePoints: [{ x: -10, y: -2 }],
    requiresMirror: true,
  },
  {
    type: 'WHEEL',
    name: 'Wheel',
    description: 'Arc to flat then up sideline',
    basePoints: [{ x: -5, y: 0 }, { x: -12, y: -5 }, { x: -12, y: -25 }],
    requiresMirror: true,
  },
  {
    type: 'SCREEN',
    name: 'Screen',
    description: 'Let defenders through, catch behind line',
    basePoints: [{ x: -8, y: 3 }],
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
