import type { ConceptTemplate } from '../types';

export const PASS_CONCEPTS: ConceptTemplate[] = [
  {
    id: 'four-verts',
    name: '4 Verticals',
    description: 'All receivers run go routes, stretch the field vertically',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'GO' },
      { positionSlot: 'H', route: 'GO' },
      { positionSlot: 'Y', route: 'GO' },
      { positionSlot: 'Z', route: 'GO' },
    ],
    tags: ['DEEP_SHOT'],
  },
  {
    id: 'mesh',
    name: 'Mesh',
    description: 'Two receivers cross underneath, creating picks',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'CORNER' },
      { positionSlot: 'H', route: 'DRAG' },
      { positionSlot: 'Y', route: 'FLAT' },
      { positionSlot: 'Z', route: 'DRAG' },
    ],
    tags: ['QUICK_PASS'],
  },
  {
    id: 'smash',
    name: 'Smash',
    description: 'Corner route with hitch underneath - high/low read',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'CURL' },
      { positionSlot: 'H', route: 'CORNER' },
      { positionSlot: 'Y', route: 'FLAT' },
      { positionSlot: 'Z', route: 'GO' },
    ],
    tags: ['RED_ZONE'],
  },
  {
    id: 'slant-flat',
    name: 'Slant/Flat',
    description: 'Quick slant with flat route - beat man coverage',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'SLANT' },
      { positionSlot: 'H', route: 'FLAT' },
      { positionSlot: 'Y', route: 'CURL' },
      { positionSlot: 'Z', route: 'GO' },
    ],
    tags: ['QUICK_PASS', '3RD_SHORT'],
  },
  {
    id: 'levels',
    name: 'Levels',
    description: 'Three receivers at different depths on same side',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'GO' },
      { positionSlot: 'H', route: 'IN' },
      { positionSlot: 'Y', route: 'DRAG' },
      { positionSlot: 'Z', route: 'CURL' },
    ],
    tags: ['3RD_LONG'],
  },
  {
    id: 'flood',
    name: 'Flood',
    description: 'Three receivers flood one side - high/mid/low',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'CURL' },
      { positionSlot: 'H', route: 'GO' },
      { positionSlot: 'Y', route: 'CORNER' },
      { positionSlot: 'Z', route: 'FLAT' },
    ],
    tags: [],
  },
  {
    id: 'curl-flat',
    name: 'Curl/Flat',
    description: 'Outside curl with flat - read the OLB',
    playType: 'PASS',
    defaultFormation: 'SINGLEBACK',
    assignments: [
      { positionSlot: 'X', route: 'CURL' },
      { positionSlot: 'H', route: 'FLAT' },
      { positionSlot: 'Y', route: 'DRAG' },
      { positionSlot: 'Z', route: 'POST' },
    ],
    tags: [],
  },
  {
    id: 'post-wheel',
    name: 'Post/Wheel',
    description: 'Clear out with post, RB runs wheel',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'POST' },
      { positionSlot: 'H', route: 'GO' },
      { positionSlot: 'Y', route: 'FLAT' },
      { positionSlot: 'Z', route: 'CURL' },
      { positionSlot: 'RB', route: 'WHEEL' },
    ],
    tags: [],
  },
  {
    id: 'pa-boot',
    name: 'Play Action Boot',
    description: 'Fake run, QB rolls out',
    playType: 'PASS',
    defaultFormation: 'SINGLEBACK',
    assignments: [
      { positionSlot: 'X', route: 'GO' },
      { positionSlot: 'H', route: 'DRAG' },
      { positionSlot: 'Y', route: 'CORNER' },
      { positionSlot: 'Z', route: 'COMEBACK' },
    ],
    tags: ['PLAY_ACTION'],
  },
  {
    id: 'screen',
    name: 'RB Screen',
    description: 'Let rushers through, throw to RB',
    playType: 'PASS',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'X', route: 'GO' },
      { positionSlot: 'H', route: 'GO' },
      { positionSlot: 'Y', receiverBlock: 'STALK_BLOCK' },
      { positionSlot: 'Z', route: 'GO' },
      { positionSlot: 'RB', route: 'SCREEN' },
    ],
    tags: ['SCREEN'],
  },
];

export const RUN_CONCEPTS: ConceptTemplate[] = [
  {
    id: 'inside-zone',
    name: 'Inside Zone',
    description: 'Zone blocking, RB reads the hole',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'INSIDE_ZONE', isBallCarrier: true },
      { positionSlot: 'X', receiverBlock: 'STALK_BLOCK' },
      { positionSlot: 'Z', receiverBlock: 'STALK_BLOCK' },
    ],
    tags: ['RUN_HEAVY'],
  },
  {
    id: 'outside-zone',
    name: 'Outside Zone',
    description: 'Stretch play, RB aims for the edge',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'OUTSIDE_ZONE', isBallCarrier: true },
      { positionSlot: 'X', receiverBlock: 'STALK_BLOCK' },
      { positionSlot: 'Z', receiverBlock: 'STALK_BLOCK' },
    ],
    tags: ['RUN_HEAVY'],
  },
  {
    id: 'power',
    name: 'Power',
    description: 'Guard pulls, FB leads through B gap',
    playType: 'RUN',
    defaultFormation: 'I_FORM',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'POWER', runGap: 'B_RIGHT', isBallCarrier: true },
      { positionSlot: 'FB', isLeadBlocker: true },
    ],
    tags: ['RUN_HEAVY', 'GOAL_LINE'],
  },
  {
    id: 'counter',
    name: 'Counter',
    description: 'Fake one way, cut back the other',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'COUNTER', isBallCarrier: true },
      { positionSlot: 'X', receiverBlock: 'STALK_BLOCK' },
      { positionSlot: 'Z', receiverBlock: 'STALK_BLOCK' },
    ],
    tags: ['RUN_HEAVY'],
  },
  {
    id: 'dive',
    name: 'Dive',
    description: 'Quick handoff, straight ahead through A gap',
    playType: 'RUN',
    defaultFormation: 'I_FORM',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'DIVE', runGap: 'A_RIGHT', isBallCarrier: true },
      { positionSlot: 'FB', isLeadBlocker: true },
    ],
    tags: ['GOAL_LINE', '3RD_SHORT'],
  },
  {
    id: 'sweep',
    name: 'Sweep',
    description: 'Outside run, get to the edge',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'SWEEP', isBallCarrier: true },
      { positionSlot: 'X', receiverBlock: 'CRACK_BLOCK' },
      { positionSlot: 'Z', receiverBlock: 'STALK_BLOCK' },
    ],
    tags: ['RUN_HEAVY'],
  },
  {
    id: 'toss',
    name: 'Toss',
    description: 'Quick pitch to RB going wide',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'TOSS', isBallCarrier: true },
      { positionSlot: 'X', receiverBlock: 'STALK_BLOCK' },
      { positionSlot: 'Z', receiverBlock: 'STALK_BLOCK' },
    ],
    tags: [],
  },
  {
    id: 'draw',
    name: 'Draw',
    description: 'Fake pass, delayed handoff',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'DRAW', isBallCarrier: true },
      { positionSlot: 'X', route: 'GO' },
      { positionSlot: 'Z', route: 'GO' },
    ],
    tags: ['3RD_LONG'],
  },
  {
    id: 'qb-sneak',
    name: 'QB Sneak',
    description: 'QB dives straight ahead',
    playType: 'RUN',
    defaultFormation: 'SINGLEBACK',
    assignments: [
      { positionSlot: 'QB', isBallCarrier: true },
    ],
    tags: ['GOAL_LINE', '3RD_SHORT'],
  },
  {
    id: 'read-option',
    name: 'Read Option',
    description: 'QB reads DE, gives or keeps',
    playType: 'RUN',
    defaultFormation: 'SHOTGUN',
    assignments: [
      { positionSlot: 'RB', runAssignment: 'INSIDE_ZONE', isBallCarrier: true },
      { positionSlot: 'X', receiverBlock: 'STALK_BLOCK' },
      { positionSlot: 'Z', receiverBlock: 'STALK_BLOCK' },
    ],
    tags: [],
  },
];

export const ALL_CONCEPTS = [...PASS_CONCEPTS, ...RUN_CONCEPTS];

export const getConceptById = (id: string): ConceptTemplate | undefined => {
  return ALL_CONCEPTS.find(c => c.id === id);
};

export const getConceptsByTag = (tag: string): ConceptTemplate[] => {
  return ALL_CONCEPTS.filter(c => c.tags.includes(tag as any));
};
