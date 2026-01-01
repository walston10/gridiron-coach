import type { DefensivePlay } from '../types/GameSim';

export const DEFENSIVE_PLAYBOOK: DefensivePlay[] = [
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
    blitzers: ['MLB'],
    description: 'Mike linebacker blitz up the A gap.'
  },
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
    blitzers: ['CB'],
    description: 'Corner blitz from the slot. Risky but disruptive.'
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
    id: 'zone_blitz',
    name: 'Zone Blitz',
    formation: '3_4',
    coverage: 'COVER_3',
    blitz: 'ZONE',
    blitzers: ['OLB'],
    description: 'OLB blitz with DE dropping into coverage. Deceptive.'
  }
];
