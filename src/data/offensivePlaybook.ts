import type { OffensivePlay } from '../types/GameSim';

/**
 * OFFENSIVE PLAYBOOK
 *
 * Routes are now keyed by ROSTER POSITION (QB, RB, WR1, WR2, FLEX)
 * The formation determines what field role each position plays:
 *
 * I_FORM:     FB_TE = FB (fullback)
 * SHOTGUN:    FB_TE = TE (tight end)
 * SINGLEBACK: FB_TE = TE (tight end)
 * PISTOL:     FB_TE = SLOT (slot receiver)
 * SPREAD:     FB_TE = SLOT (slot receiver)
 * GOAL_LINE:  FB_TE = FB, WR2 = TE
 */

export const OFFENSIVE_PLAYBOOK: OffensivePlay[] = [
  // =============================================================================
  // I-FORMATION PLAYS (FB_TE = FB)
  // =============================================================================
  {
    id: 'hb_dive',
    name: 'HB Dive',
    formation: 'I_FORM',
    type: 'RUN',
    routes: {
      WR1: 'BLOCK', WR2: 'BLOCK', FB_TE: 'BLOCK', RB: 'BLOCK'
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
      WR1: 'BLOCK', WR2: 'BLOCK', FB_TE: 'BLOCK', RB: 'BLOCK'
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
      WR1: 'STREAK', WR2: 'DRAG', FB_TE: 'FLAT', RB: 'FLAT'
    },
    rollout: 'RIGHT',
    description: 'Fake handoff, rollout right with FLEX flat route'
  },
  {
    id: 'pa_deep_post',
    name: 'PA Deep Post',
    formation: 'I_FORM',
    type: 'PLAY_ACTION',
    routes: {
      WR1: 'POST', WR2: 'CORNER', FB_TE: 'DRAG', RB: 'DELAY'
    },
    description: 'Fake handoff, safety bites, hit the deep post'
  },

  // =============================================================================
  // SINGLEBACK PLAYS (FB_TE = TE)
  // =============================================================================
  {
    id: 'pa_wheel',
    name: 'PA Wheel',
    formation: 'SINGLEBACK',
    type: 'PLAY_ACTION',
    routes: {
      WR1: 'STREAK', WR2: 'SLANT', FB_TE: 'WHEEL', RB: 'WHEEL'
    },
    description: 'Fake handoff with wheel routes for big play potential'
  },

  // =============================================================================
  // SHOTGUN PLAYS (FB_TE = TE)
  // =============================================================================
  {
    id: 'slants',
    name: 'Slants',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'SLANT', WR2: 'SLANT', FB_TE: 'DRAG', RB: 'BLOCK'
    },
    description: 'Quick slant routes, beat man coverage'
  },
  {
    id: 'four_verts',
    name: 'Four Verticals',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FB_TE: 'STREAK', RB: 'BLOCK'
    },
    description: 'Three receivers going deep, stress Cover 2/3'
  },
  {
    id: 'mesh',
    name: 'Mesh',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'CORNER', WR2: 'CORNER', FB_TE: 'DRAG', RB: 'FLAT'
    },
    description: 'Crossing routes create picks vs man coverage'
  },
  {
    id: 'hb_screen',
    name: 'HB Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FB_TE: 'RELEASE_BLOCK', RB: 'SCREEN'
    },
    description: 'Let rushers through, dump to RB with blockers'
  },
  {
    id: 'swing_screen',
    name: 'Swing Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'STREAK', WR2: 'BLOCK', FB_TE: 'RELEASE_BLOCK', RB: 'SWING'
    },
    description: 'Quick swing to RB, WR sets up block'
  },
  {
    id: 'wr_screen',
    name: 'WR Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'SCREEN', WR2: 'STREAK', FB_TE: 'BLOCK', RB: 'DELAY'
    },
    description: 'Quick screen to outside receiver'
  },
  {
    id: 'out_routes',
    name: 'Out Routes',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'OUT', WR2: 'OUT', FB_TE: 'CURL', RB: 'BLOCK'
    },
    description: 'Timing routes to the sideline'
  },
  {
    id: 'post_corner',
    name: 'Post Corner',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'POST', WR2: 'CORNER', FB_TE: 'CURL', RB: 'BLOCK'
    },
    description: 'High-low read on the safety'
  },
  {
    id: 'draw',
    name: 'Draw',
    formation: 'SHOTGUN',
    type: 'RUN',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FB_TE: 'BLOCK', RB: 'BLOCK'
    },
    runGap: 'CENTER',
    description: 'Delayed handoff, sell pass then run'
  },

  // =============================================================================
  // SPREAD PLAYS (FB_TE = SLOT)
  // =============================================================================
  {
    id: 'spread_mesh',
    name: 'Spread Mesh',
    formation: 'SPREAD',
    type: 'PASS',
    routes: {
      WR1: 'CORNER', WR2: 'POST', FB_TE: 'DRAG', RB: 'FLAT'
    },
    description: '4-wide mesh with crossing slot receiver'
  },
  {
    id: 'spread_verts',
    name: 'Spread Verticals',
    formation: 'SPREAD',
    type: 'PASS',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FB_TE: 'STREAK', RB: 'SWING'
    },
    description: 'All receivers go deep, RB as checkdown'
  },

  // =============================================================================
  // PISTOL PLAYS (FB_TE = SLOT)
  // =============================================================================
  {
    id: 'pistol_power',
    name: 'Pistol Power',
    formation: 'PISTOL',
    type: 'RUN',
    routes: {
      WR1: 'BLOCK', WR2: 'BLOCK', FB_TE: 'BLOCK', RB: 'BLOCK'
    },
    runGap: 'RIGHT_GUARD',
    description: 'Power run from pistol formation'
  },
  {
    id: 'pistol_read',
    name: 'Read Option',
    formation: 'PISTOL',
    type: 'RUN',
    routes: {
      WR1: 'STREAK', WR2: 'BLOCK', FB_TE: 'SLANT', RB: 'BLOCK'
    },
    runGap: 'LEFT_TACKLE',
    description: 'Zone read, QB keeps or hands off based on end'
  }
];
