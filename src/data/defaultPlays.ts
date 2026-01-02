import type { Play, PlayerAssignment, RouteType, OLBlockingAssignment, RunBlockingScheme } from '../types';
import { FORMATIONS } from './formations';

// Map run blocking scheme to OL blocking assignments
const getOLBlockingForScheme = (
  scheme: RunBlockingScheme | undefined,
  slot: string
): OLBlockingAssignment => {
  if (!scheme) return 'PASS_PRO';

  switch (scheme) {
    case 'INSIDE_ZONE':
      // Zone blocking - all linemen step playside
      return 'ZONE_RIGHT';
    case 'OUTSIDE_ZONE':
      // Outside zone - all step to playside, stretch play
      return 'ZONE_RIGHT';
    case 'POWER':
      // Power - backside guard pulls, others man block
      if (slot === 'LG') return 'PULL_RIGHT';
      return 'MAN';
    case 'COUNTER':
      // Counter - guard and tackle pull opposite direction
      if (slot === 'RG') return 'PULL_LEFT';
      if (slot === 'RT') return 'PULL_LEFT';
      return 'MAN';
    case 'TRAP':
      // Trap - guard pulls across to trap defensive tackle
      if (slot === 'RG') return 'TRAP';
      return 'MAN';
    case 'DUO':
      // Duo - double team at point of attack
      if (slot === 'LG' || slot === 'C') return 'DOUBLE_TEAM';
      return 'MAN';
    default:
      return 'PASS_PRO';
  }
};

// Helper to create assignments from a formation with routes
const createAssignments = (
  formationType: string,
  routes: Record<string, RouteType | 'BLOCK'>,
  runBlockingScheme?: RunBlockingScheme
): PlayerAssignment[] => {
  const formation = FORMATIONS.find(f => f.type === formationType);
  if (!formation) return [];

  return formation.positions.map(pos => {
    const route = routes[pos.slot];
    const isBlocking = route === 'BLOCK' || !pos.canRunRoutes;

    return {
      playerId: '', // Will be filled when play runs
      positionSlot: pos.slot,
      label: pos.label,
      startX: pos.x,
      startY: pos.y,
      isOnLine: pos.isOnLine,
      fieldSide: pos.fieldSide,
      canRunRoutes: pos.canRunRoutes,
      route: isBlocking ? undefined : (route as RouteType),
      olBlocking: !pos.canRunRoutes ? getOLBlockingForScheme(runBlockingScheme, pos.slot) : undefined,
    };
  });
};

export const DEFAULT_PLAYS: Play[] = [
  // ==================== RUN PLAYS ====================
  {
    id: 'default-hb-dive',
    name: 'HB Dive',
    formation: 'I_FORM',
    personnel: '21',
    playType: 'RUN',
    qbRun: 'HANDOFF',
    runBlockingScheme: 'INSIDE_ZONE',
    assignments: createAssignments('I_FORM', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'BLOCK', Y: 'BLOCK', Z: 'BLOCK', QB: 'BLOCK', FB: 'BLOCK', RB: 'BLOCK'
    }, 'INSIDE_ZONE').map(a => a.positionSlot === 'RB'
      ? { ...a, isBallCarrier: true, isHandoffTarget: true, runAssignment: 'DIVE' as const }
      : a)
     .map(a => a.positionSlot === 'FB' ? { ...a, isLeadBlocker: true } : a),
    tags: [],
    concept: 'Inside Run',
    notes: 'Basic inside run between the guards',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
  {
    id: 'default-hb-sweep',
    name: 'HB Sweep',
    formation: 'I_FORM',
    personnel: '21',
    playType: 'RUN',
    qbRun: 'HANDOFF',
    runBlockingScheme: 'OUTSIDE_ZONE',
    assignments: createAssignments('I_FORM', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'BLOCK', Y: 'BLOCK', Z: 'BLOCK', QB: 'BLOCK', FB: 'BLOCK', RB: 'BLOCK'
    }, 'OUTSIDE_ZONE').map(a => a.positionSlot === 'RB'
      ? { ...a, isBallCarrier: true, isHandoffTarget: true, runAssignment: 'SWEEP' as const }
      : a)
     .map(a => a.positionSlot === 'FB' ? { ...a, isLeadBlocker: true } : a),
    tags: [],
    concept: 'Outside Run',
    notes: 'Outside zone blocking to the perimeter',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
  {
    id: 'default-power',
    name: 'Power Run',
    formation: 'I_FORM',
    personnel: '21',
    playType: 'RUN',
    qbRun: 'HANDOFF',
    runBlockingScheme: 'POWER',
    assignments: createAssignments('I_FORM', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'BLOCK', Y: 'BLOCK', Z: 'BLOCK', QB: 'BLOCK', FB: 'BLOCK', RB: 'BLOCK'
    }, 'POWER').map(a => a.positionSlot === 'RB'
      ? { ...a, isBallCarrier: true, isHandoffTarget: true, runAssignment: 'POWER' as const }
      : a)
     .map(a => a.positionSlot === 'FB' ? { ...a, isLeadBlocker: true } : a),
    tags: [],
    concept: 'Power',
    notes: 'Pulling guard leads through the hole',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
  {
    id: 'default-draw',
    name: 'Draw Play',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'RUN',
    qbRun: 'HANDOFF',
    runBlockingScheme: 'INSIDE_ZONE',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'GO', H: 'GO', Y: 'BLOCK', Z: 'GO', QB: 'BLOCK', RB: 'BLOCK'
    }).map(a => a.positionSlot === 'RB'
      ? { ...a, isBallCarrier: true, isHandoffTarget: true, runAssignment: 'DRAW' as const }
      : a),
    tags: [],
    concept: 'Draw',
    notes: 'Sell pass, delayed handoff',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },

  // ==================== QUICK PASS PLAYS ====================
  {
    id: 'default-slants',
    name: 'Slants',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '3_STEP',
    protectionScheme: 'HALF_SLIDE_LEFT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'SLANT', H: 'SLANT', Y: 'DRAG', Z: 'SLANT', QB: 'BLOCK', RB: 'BLOCK'
    }),
    tags: ['QUICK_PASS'],
    concept: 'Slants',
    notes: 'Quick slant routes, great vs man coverage',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
  {
    id: 'default-quick-out',
    name: 'Quick Out',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '3_STEP',
    protectionScheme: 'HALF_SLIDE_LEFT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'OUT', H: 'FLAT', Y: 'CURL', Z: 'OUT', QB: 'BLOCK', RB: 'BLOCK'
    }),
    tags: ['QUICK_PASS'],
    concept: 'Quick Out',
    notes: 'Timing routes to the sideline',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },

  // ==================== MEDIUM PASS PLAYS ====================
  {
    id: 'default-mesh',
    name: 'Mesh Concept',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '5_STEP',
    protectionScheme: 'HALF_SLIDE_LEFT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'CORNER', H: 'DRAG', Y: 'DRAG', Z: 'CORNER', QB: 'BLOCK', RB: 'FLAT'
    }),
    tags: [],
    concept: 'Mesh',
    notes: 'Crossing routes create picks vs man coverage',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
  {
    id: 'default-curl-flat',
    name: 'Curl Flat',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '5_STEP',
    protectionScheme: 'HALF_SLIDE_LEFT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'CURL', H: 'FLAT', Y: 'DRAG', Z: 'CURL', QB: 'BLOCK', RB: 'FLAT'
    }),
    tags: [],
    concept: 'Curl Flat',
    notes: 'High-low read on the flat defender',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },

  // ==================== DEEP PASS PLAYS ====================
  {
    id: 'default-four-verts',
    name: 'Four Verticals',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '7_STEP',
    protectionScheme: 'MAX_PROTECT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'GO', H: 'GO', Y: 'GO', Z: 'GO', QB: 'BLOCK', RB: 'BLOCK'
    }),
    tags: ['DEEP_SHOT'],
    concept: 'Four Verts',
    notes: 'Four receivers going deep, stress Cover 2/3',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
  {
    id: 'default-post-corner',
    name: 'Post Corner',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '7_STEP',
    protectionScheme: 'MAX_PROTECT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'POST', H: 'DRAG', Y: 'CURL', Z: 'CORNER', QB: 'BLOCK', RB: 'BLOCK'
    }),
    tags: ['DEEP_SHOT'],
    concept: 'Post Corner',
    notes: 'High-low read on the safety',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },

  // ==================== SCREEN PLAYS ====================
  {
    id: 'default-hb-screen',
    name: 'HB Screen',
    formation: 'SHOTGUN',
    personnel: '11',
    playType: 'PASS',
    passAction: '3_STEP',
    protectionScheme: 'HALF_SLIDE_LEFT',
    assignments: createAssignments('SHOTGUN', {
      LT: 'BLOCK', LG: 'BLOCK', C: 'BLOCK', RG: 'BLOCK', RT: 'BLOCK',
      X: 'GO', H: 'BLOCK', Y: 'BLOCK', Z: 'GO', QB: 'BLOCK', RB: 'SCREEN'
    }),
    tags: ['SCREEN'],
    concept: 'Screen',
    notes: 'Let rushers through, dump to RB with blockers',
    createdAt: Date.now(),
    timesUsed: 0,
    successRate: 0,
  },
];
