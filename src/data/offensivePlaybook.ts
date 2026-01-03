import type { OffensivePlay } from '../types/GameSim';

/**
 * OFFENSIVE PLAYBOOK
 *
 * Routes are now keyed by ROSTER POSITION (QB, RB, WR1, WR2, FLEX)
 * The formation determines what field role each position plays:
 *
 * I_FORM:     FLEX = FB (fullback)
 * SHOTGUN:    FLEX = TE (tight end)
 * SINGLEBACK: FLEX = TE (tight end)
 * PISTOL:     FLEX = SLOT (slot receiver)
 * SPREAD:     FLEX = SLOT (slot receiver)
 * GOAL_LINE:  FLEX = FB, WR2 = TE
 */

export const OFFENSIVE_PLAYBOOK: OffensivePlay[] = [
  // =============================================================================
  // I-FORMATION PLAYS (FLEX = FB)
  // =============================================================================
  {
    id: 'hb_dive',
    name: 'HB Dive',
    formation: 'I_FORM',
    type: 'RUN',
    routes: {
      WR1: 'BLOCK', WR2: 'BLOCK', FLEX: 'BLOCK', RB: 'BLOCK'
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
      WR1: 'BLOCK', WR2: 'BLOCK', FLEX: 'BLOCK', RB: 'BLOCK'
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
      WR1: 'STREAK', WR2: 'DRAG', FLEX: 'FLAT', RB: 'FLAT'
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
      WR1: 'POST', WR2: 'CORNER', FLEX: 'DRAG', RB: 'DELAY'
    },
    description: 'Fake handoff, safety bites, hit the deep post'
  },

  // =============================================================================
  // SINGLEBACK PLAYS (FLEX = TE)
  // =============================================================================
  {
    id: 'pa_wheel',
    name: 'PA Wheel',
    formation: 'SINGLEBACK',
    type: 'PLAY_ACTION',
    routes: {
      WR1: 'STREAK', WR2: 'SLANT', FLEX: 'WHEEL', RB: 'WHEEL'
    },
    description: 'Fake handoff with wheel routes for big play potential'
  },

  // =============================================================================
  // SHOTGUN PLAYS (FLEX = TE)
  // =============================================================================
  {
    id: 'slants',
    name: 'Slants',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'SLANT', WR2: 'SLANT', FLEX: 'DRAG', RB: 'BLOCK'
    },
    description: 'Quick slant routes, beat man coverage'
  },
  {
    id: 'four_verts',
    name: 'Four Verticals',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FLEX: 'STREAK', RB: 'BLOCK'
    },
    description: 'Three receivers going deep, stress Cover 2/3'
  },
  {
    id: 'mesh',
    name: 'Mesh',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'CORNER', WR2: 'CORNER', FLEX: 'DRAG', RB: 'FLAT'
    },
    description: 'Crossing routes create picks vs man coverage'
  },
  {
    id: 'hb_screen',
    name: 'HB Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FLEX: 'RELEASE_BLOCK', RB: 'SCREEN'
    },
    description: 'Let rushers through, dump to RB with blockers'
  },
  {
    id: 'swing_screen',
    name: 'Swing Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'STREAK', WR2: 'BLOCK', FLEX: 'RELEASE_BLOCK', RB: 'SWING'
    },
    description: 'Quick swing to RB, WR sets up block'
  },
  {
    id: 'wr_screen',
    name: 'WR Screen',
    formation: 'SHOTGUN',
    type: 'SCREEN',
    routes: {
      WR1: 'SCREEN', WR2: 'STREAK', FLEX: 'BLOCK', RB: 'DELAY'
    },
    description: 'Quick screen to outside receiver'
  },
  {
    id: 'out_routes',
    name: 'Out Routes',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'OUT', WR2: 'OUT', FLEX: 'CURL', RB: 'BLOCK'
    },
    description: 'Timing routes to the sideline'
  },
  {
    id: 'post_corner',
    name: 'Post Corner',
    formation: 'SHOTGUN',
    type: 'PASS',
    routes: {
      WR1: 'POST', WR2: 'CORNER', FLEX: 'CURL', RB: 'BLOCK'
    },
    description: 'High-low read on the safety'
  },
  {
    id: 'draw',
    name: 'Draw',
    formation: 'SHOTGUN',
    type: 'RUN',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FLEX: 'BLOCK', RB: 'BLOCK'
    },
    runGap: 'CENTER',
    description: 'Delayed handoff, sell pass then run'
  },

  // =============================================================================
  // SPREAD PLAYS (FLEX = SLOT)
  // =============================================================================
  {
    id: 'spread_mesh',
    name: 'Spread Mesh',
    formation: 'SPREAD',
    type: 'PASS',
    routes: {
      WR1: 'CORNER', WR2: 'POST', FLEX: 'DRAG', RB: 'FLAT'
    },
    description: '4-wide mesh with crossing slot receiver'
  },
  {
    id: 'spread_verts',
    name: 'Spread Verticals',
    formation: 'SPREAD',
    type: 'PASS',
    routes: {
      WR1: 'STREAK', WR2: 'STREAK', FLEX: 'STREAK', RB: 'SWING'
    },
    description: 'All receivers go deep, RB as checkdown'
  },

  // =============================================================================
  // PISTOL PLAYS (FLEX = SLOT)
  // =============================================================================
  {
    id: 'pistol_power',
    name: 'Pistol Power',
    formation: 'PISTOL',
    type: 'RUN',
    routes: {
      WR1: 'BLOCK', WR2: 'BLOCK', FLEX: 'BLOCK', RB: 'BLOCK'
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
      WR1: 'STREAK', WR2: 'BLOCK', FLEX: 'SLANT', RB: 'BLOCK'
    },
    runGap: 'LEFT_TACKLE',
    description: 'Zone read, QB keeps or hands off based on end'
  }
];
