import type { DefensivePlay } from '../types/GameSim';

/**
 * DEFENSIVE PLAYBOOK
 *
 * Organized by:
 * 1. COVERAGE SHELLS - Base zone/man coverages
 * 2. BLITZES - Pressure packages
 * 3. SITUATIONAL - Goal line, prevent, late game
 *
 * Blitzers are specified by ROSTER POSITION:
 * - LB1 = Middle linebacker (MLB role)
 * - LB2 = Outside linebacker (LOLB/ROLB role)
 * - CB1 = Left cornerback
 * - CB2 = Right cornerback
 * - S = Safety (FS or SS depending on formation)
 */

export const DEFENSIVE_PLAYBOOK: DefensivePlay[] = [
  // =============================================================================
  // COVERAGE SHELLS - Base coverages without extra pressure
  // =============================================================================

  // Cover 0 - Pure man, no deep safety, all-out pressure
  {
    id: 'cover_0',
    name: 'Cover 0',
    formation: '4_3',
    coverage: 'COVER_0',
    blitz: 'NONE',
    description: 'Pure man, no deep safety. High risk, high reward.'
  },

  // Cover 1 - Man coverage, 1 deep safety
  {
    id: 'cover_1',
    name: 'Cover 1',
    formation: '4_3',
    coverage: 'COVER_1',
    blitz: 'NONE',
    description: 'Man coverage with single high safety help.'
  },

  // Cover 2 - 2 deep safeties, 5 underneath zones
  {
    id: 'cover_2',
    name: 'Cover 2',
    formation: '4_3',
    coverage: 'COVER_2',
    blitz: 'NONE',
    description: 'Two deep safeties, corners play flats. Weak vs deep middle.'
  },

  // Cover 3 - 3 deep zones, 4 underneath
  {
    id: 'cover_3',
    name: 'Cover 3',
    formation: '4_3',
    coverage: 'COVER_3',
    blitz: 'NONE',
    description: 'Three deep zones, four underneath. Solid all-around.'
  },

  // Cover 4 - 4 deep quarters, prevent style
  {
    id: 'cover_4',
    name: 'Cover 4',
    formation: 'NICKEL',
    coverage: 'COVER_4',
    blitz: 'NONE',
    description: 'Quarters coverage. Great vs verticals, weak vs run.'
  },

  // Man (no blitz) - Man across, rushers contain
  {
    id: 'man_free',
    name: 'Man Free',
    formation: '4_3',
    coverage: 'MAN_FREE',
    blitz: 'NONE',
    description: 'Man coverage with free safety. Rushers contain.'
  },

  // Tampa 2 - Cover 2 with MLB dropping deep
  {
    id: 'tampa_2',
    name: 'Tampa 2',
    formation: '4_3',
    coverage: 'TAMPA_2',
    blitz: 'NONE',
    description: 'Cover 2 with MLB dropping deep middle. Covers the hole.'
  },

  // Cover 2 Man - Man under, 2 deep safeties
  {
    id: 'cover_2_man',
    name: 'Cover 2 Man',
    formation: '4_3',
    coverage: 'COVER_2_MAN',
    blitz: 'NONE',
    description: 'Man coverage with two deep safeties. Good vs crossing routes.'
  },

  // =============================================================================
  // BLITZES - Pressure packages
  // =============================================================================

  // Safety Blitz - Strong safety comes, Cover 1 behind it
  {
    id: 'safety_blitz',
    name: 'Safety Blitz',
    formation: 'NICKEL',
    coverage: 'COVER_1',
    blitz: 'SAFETY',
    blitzers: ['SECONDARY'],
    description: 'Strong safety blitzes, Cover 1 behind. Creates confusion.'
  },

  // Corner Blitz - CB off the edge, risky
  {
    id: 'corner_blitz',
    name: 'Corner Blitz',
    formation: 'NICKEL',
    coverage: 'COVER_1',
    blitz: 'CB',
    blitzers: ['SECONDARY'],
    description: 'Corner blitz off the edge. Risky but disruptive.'
  },

  // LB Blitz - Mike or Will shoots a gap
  {
    id: 'mlb_blitz',
    name: 'Mike Blitz',
    formation: '4_3',
    coverage: 'COVER_1',
    blitz: 'MLB',
    blitzers: ['LINEBACKERS'],
    description: 'Mike linebacker shoots the A gap.'
  },

  {
    id: 'will_blitz',
    name: 'Will Blitz',
    formation: '4_3',
    coverage: 'COVER_1',
    blitz: 'OLB',
    blitzers: ['LINEBACKERS'],
    description: 'Outside linebacker edge rush.'
  },

  // All-Out Blitz - Cover 0, max pressure, high risk/reward
  {
    id: 'all_out_blitz',
    name: 'All-Out Blitz',
    formation: '4_3',
    coverage: 'COVER_0',
    blitz: 'MLB',
    blitzers: ['LINEBACKERS', 'SECONDARY'],
    description: 'Everyone comes. Pure man, no help. Boom or bust.'
  },

  // Zone Blitz - Drop a DL into coverage, LB blitzes
  {
    id: 'zone_blitz',
    name: 'Zone Blitz',
    formation: '3_4',
    coverage: 'COVER_3',
    blitz: 'ZONE',
    blitzers: ['LINEBACKERS'],
    description: 'OLB blitz, DE drops into coverage. Deceptive look.'
  },

  // Fire Zone - Popular zone blitz concept
  {
    id: 'fire_zone',
    name: 'Fire Zone',
    formation: '3_4',
    coverage: 'COVER_3',
    blitz: 'ZONE',
    blitzers: ['LINEBACKERS', 'SECONDARY'],
    description: 'ILB and safety blitz, 3 deep zones behind.'
  },

  // Double A Gap - Both ILBs attack the A gaps
  {
    id: 'double_a_gap',
    name: 'Double A Gap',
    formation: '3_4',
    coverage: 'COVER_0',
    blitz: 'MLB',
    blitzers: ['LINEBACKERS'],
    description: 'Both linebackers through the A gaps. Chaos.'
  },

  // =============================================================================
  // SITUATIONAL - Goal line, prevent, late game
  // =============================================================================

  // Goal Line - Tight, man, stuff the run
  {
    id: 'goal_line',
    name: 'Goal Line',
    formation: 'GOAL_LINE_D',
    coverage: 'COVER_0',
    blitz: 'MLB',
    blitzers: ['LINEBACKERS'],
    description: 'Heavy front, man coverage. Stuff the run.'
  },

  // Prevent - Deep zones, give up short stuff
  {
    id: 'prevent',
    name: 'Prevent',
    formation: 'DIME',
    coverage: 'COVER_4',
    blitz: 'NONE',
    description: 'Deep zones, bend but don\'t break. Gives up underneath.'
  },

  // Two-Man - 2 deep safeties, man under (late game)
  {
    id: 'two_man',
    name: 'Two-Man Under',
    formation: 'NICKEL',
    coverage: 'COVER_2_MAN',
    blitz: 'NONE',
    description: 'Man coverage, 2 deep safeties. Late game lock-down.'
  },

  // =============================================================================
  // PACKAGE VARIATIONS
  // =============================================================================

  // 3-4 Base
  {
    id: '3_4_cover_2',
    name: '3-4 Cover 2',
    formation: '3_4',
    coverage: 'COVER_2',
    blitz: 'NONE',
    description: 'Base 3-4 with two deep safeties.'
  },

  {
    id: '3_4_cover_3',
    name: '3-4 Cover 3',
    formation: '3_4',
    coverage: 'COVER_3',
    blitz: 'NONE',
    description: 'Base 3-4 with three deep zones.'
  },

  // Nickel variations
  {
    id: 'nickel_cover_3',
    name: 'Nickel Cover 3',
    formation: 'NICKEL',
    coverage: 'COVER_3',
    blitz: 'NONE',
    description: 'Extra DB with three deep zones.'
  },

  {
    id: 'nickel_man',
    name: 'Nickel Man',
    formation: 'NICKEL',
    coverage: 'MAN_FREE',
    blitz: 'NONE',
    description: 'Nickel package with man coverage. Matches up vs 3 WR sets.'
  },

  // Dime variations
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
];

// Helper to get plays by category
export const getDefensivePlaysByCategory = () => ({
  coverageShells: DEFENSIVE_PLAYBOOK.filter(p =>
    ['cover_0', 'cover_1', 'cover_2', 'cover_3', 'cover_4', 'man_free', 'tampa_2', 'cover_2_man'].includes(p.id)
  ),
  blitzes: DEFENSIVE_PLAYBOOK.filter(p =>
    ['safety_blitz', 'corner_blitz', 'mlb_blitz', 'will_blitz', 'all_out_blitz', 'zone_blitz', 'fire_zone', 'double_a_gap'].includes(p.id)
  ),
  situational: DEFENSIVE_PLAYBOOK.filter(p =>
    ['goal_line', 'prevent', 'two_man'].includes(p.id)
  ),
  packages: DEFENSIVE_PLAYBOOK.filter(p =>
    ['3_4_cover_2', '3_4_cover_3', 'nickel_cover_3', 'nickel_man', 'dime_cover_4', 'dime_man'].includes(p.id)
  ),
});
