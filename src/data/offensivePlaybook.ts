import type { OffensivePlay } from '../types/GameSim';

export const OFFENSIVE_PLAYBOOK: OffensivePlay[] = [
  {
    id: 'hb_dive',
    name: 'HB Dive',
    formation: 'I_FORM',
    type: 'RUN',
    routes: {
      WR1: 'BLOCK', WR2: 'BLOCK', TE: 'BLOCK', FB: 'BLOCK', RB: 'BLOCK'
    },
    runGap: 'CENTER',
    description: 'Inside run between the guards'
  },
  {
    id: 'hb_sweep',
    name: 'HB Sweep',
    formation: 'I_FORM',
    type: 'RUN',
    routes: {
      WR1: 'BLOCK', WR2: 'BLOCK', TE: 'BLOCK', FB: 'BLOCK', RB: 'BLOCK'
    },
    runGap: 'RIGHT_END',
    description: 'Outside run with pulling guard'
  },
  {
    id: 'pa_boot',
    name: 'PA Boot',
    formation: 'I_FORM',
    type: 'PLAY_ACTION',
    routes: {
      WR1: 'STREAK', WR2: 'DRAG', TE: 'FLAT', FB: 'BLOCK', RB: 'FLAT'
    },
    rollout: 'RIGHT',
    description: 'Fake handoff, rollout right with TE flat route'
  },
  {
    id: 'slants',
    name: 'Slants',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'SLANT', WR2: 'SLANT', SLOT1: 'SLANT', TE: 'DRAG', RB: 'BLOCK'
    },
    description: 'Quick slant routes, beat man coverage'
  },
  {
    id: 'four_verts',
    name: 'Four Verticals',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', SLOT1: 'STREAK', TE: 'STREAK', RB: 'BLOCK'
    },
    description: 'Four receivers going deep, stress Cover 2/3'
  },
  {
    id: 'mesh',
    name: 'Mesh',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'CORNER', WR2: 'CORNER', SLOT1: 'DRAG', TE: 'DRAG', RB: 'FLAT'
    },
    description: 'Crossing routes create picks vs man coverage'
  },
  {
    id: 'hb_screen',
    name: 'HB Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', SLOT1: 'BLOCK', TE: 'BLOCK', RB: 'FLAT'
    },
    description: 'Let rushers through, dump to RB with blockers'
  },
  {
    id: 'out_routes',
    name: 'Out Routes',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'OUT', WR2: 'OUT', SLOT1: 'IN', TE: 'CURL', RB: 'BLOCK'
    },
    description: 'Timing routes to the sideline'
  },
  {
    id: 'post_corner',
    name: 'Post Corner',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'POST', WR2: 'CORNER', SLOT1: 'DRAG', TE: 'CURL', RB: 'BLOCK'
    },
    description: 'High-low read on the safety'
  },
  {
    id: 'draw',
    name: 'Draw',
    formation: 'SHOTGUN',
    type: 'RUN',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', SLOT1: 'STREAK', TE: 'BLOCK', RB: 'BLOCK'
    },
    runGap: 'CENTER',
    description: 'Delayed handoff, sell pass then run'
  }
];
