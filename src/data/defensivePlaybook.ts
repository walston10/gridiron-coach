import type { DefensivePlay } from '../types/GameSim';

/**
 * DEFENSIVE PLAYBOOK
 *
 * Blitzers are now specified by ROSTER POSITION:
 * - LB1 = Middle linebacker (MLB role)
 * - LB2 = Outside linebacker (LOLB/ROLB role)
 * - CB1 = Left cornerback
 * - CB2 = Right cornerback
 * - S = Safety (FS or SS depending on formation)
 *
 * The formation determines what field role each position plays.
 */

export const DEFENSIVE_PLAYBOOK: DefensivePlay[] = [
  // =============================================================================
  // 4-3 BASE PLAYS
  // =============================================================================
  {
    id: 'cover_2',
    name: 'Cover 2',
    formation: '4_3',
    coverage: 'COVER_2',
    blitz: 'NONE',
    description: 'Two deep safeties, corners play flats. Weak vs deep middle.'
  },
  {
    id: 'cover_3',
    name: 'Cover 3',
    formation: '4_3',
    coverage: 'COVER_3',
    blitz: 'NONE',
    description: 'Three deep zones, four underneath. Solid all-around.'
  },
  {
    id: 'man_free',
    name: 'Man Free',
    formation: '4_3',
    coverage: 'MAN_FREE',
    blitz: 'NONE',
    description: 'Man coverage with single high safety help.'
  },
  {
    id: 'cover_2_man',
    name: 'Cover 2 Man',
    formation: '4_3',
    coverage: 'COVER_2_MAN',
    blitz: 'NONE',
    description: 'Man coverage with two deep safeties. Good vs crossing routes.'
  },
  {
    id: 'mlb_blitz',
    name: 'MLB Blitz',
    formation: '4_3',
    coverage: 'COVER_1',
    blitz: 'MLB',
    blitzers: ['LB1'],  // LB1 is the middle linebacker
    description: 'Mike linebacker blitz up the A gap.'
  },
  {
    id: 'cover_1_robber',
    name: 'Cover 1 Robber',
    formation: '4_3',
    coverage: 'COVER_1',
    blitz: 'NONE',
    description: 'Man coverage with safety lurking middle. Great vs slants.'
  },
  {
    id: 'tampa_2',
    name: 'Tampa 2',
    formation: '4_3',
    coverage: 'TAMPA_2',
    blitz: 'NONE',
    description: 'Cover 2 with MLB dropping deep middle. Covers the hole.'
  },
  {
    id: 'olb_blitz',
    name: 'OLB Blitz',
    formation: '4_3',
    coverage: 'COVER_1',
    blitz: 'OLB',
    blitzers: ['LB2'],  // LB2 is the outside linebacker
    description: 'Outside linebacker edge rush.'
  },

  // =============================================================================
  // 3-4 PLAYS
  // =============================================================================
  {
    id: 'zone_blitz',
    name: 'Zone Blitz',
    formation: '3_4',
    coverage: 'COVER_3',
    blitz: 'ZONE',
    blitzers: ['LB2'],  // OLB blitzes, DE drops into coverage
    description: 'OLB blitz with DE dropping into coverage. Deceptive.'
  },
  {
    id: '3_4_cover_2',
    name: '3-4 Cover 2',
    formation: '3_4',
    coverage: 'COVER_2',
    blitz: 'NONE',
    description: 'Base 3-4 with two deep safeties.'
  },
  {
    id: 'double_a_gap',
    name: 'Double A Gap',
    formation: '3_4',
    coverage: 'COVER_0',
    blitz: 'MLB',
    blitzers: ['LB1', 'LB2'],  // Both linebackers blitz
    description: 'Both inside linebackers blitz. High risk, high reward.'
  },

  // =============================================================================
  // NICKEL PLAYS (5 DBs)
  // =============================================================================
  {
    id: 'cover_4',
    name: 'Cover 4',
    formation: 'NICKEL',
    coverage: 'COVER_4',
    blitz: 'NONE',
    description: 'Quarters coverage. Great vs verticals, weak vs run.'
  },
  {
    id: 'nickel_cb_blitz',
    name: 'CB Blitz',
    formation: 'NICKEL',
    coverage: 'COVER_1',
    blitz: 'CB',
    blitzers: ['CB1'],  // Left corner blitzes
    description: 'Corner blitz from the slot. Risky but disruptive.'
  },
  {
    id: 'nickel_cover_3',
    name: 'Nickel Cover 3',
    formation: 'NICKEL',
    coverage: 'COVER_3',
    blitz: 'NONE',
    description: 'Extra DB with three deep zones.'
  },
  {
    id: 'safety_blitz',
    name: 'Safety Blitz',
    formation: 'NICKEL',
    coverage: 'COVER_1',
    blitz: 'SAFETY',
    blitzers: ['S'],  // Safety comes on delayed blitz
    description: 'Safety creeps up and blitzes. Creates confusion.'
  },

  // =============================================================================
  // DIME PLAYS (6 DBs)
  // =============================================================================
  {
    id: 'dime_cover_4',
    name: 'Dime Cover 4',
    formation: 'DIME',
    coverage: 'COVER_4',
    blitz: 'NONE',
    description: 'Maximum pass coverage with 6 defensive backs.'
  },
  {
    id: 'dime_man',
    name: 'Dime Man',
    formation: 'DIME',
    coverage: 'MAN_FREE',
    blitz: 'NONE',
    description: 'Man coverage in dime package. Good vs 4+ WR sets.'
  },

  // =============================================================================
  // GOAL LINE PLAYS
  // =============================================================================
  {
    id: 'goal_line_stuff',
    name: 'Goal Line Stuff',
    formation: 'GOAL_LINE_D',
    coverage: 'COVER_0',
    blitz: 'MLB',
    blitzers: ['LB1', 'LB2'],
    description: 'All-out run stop. Everyone attacks the line.'
  }
];
