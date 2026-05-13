/**
 * Personality moments — between-drive character interruptions.
 *
 * Each moment is a small narrative beat: a player or staffer demands
 * something, the coach picks a response, the response has a defined
 * mechanical effect on the next drive. Effects are small enough that
 * any single choice is a flavor moment more than a strategic mandate;
 * across a game the choices add up.
 *
 * Tone: irreverent, slightly shady, low-stakes drama.
 */

/**
 * What an option does mechanically when chosen.
 * NONE = pure flavor, no game-state change.
 */
export type MomentEffect =
  | { kind: 'NONE' }
  /** Add yards (positive or negative) to where the player's NEXT drive starts. */
  | { kind: 'FIELD_POSITION'; yards: number }
  /** Apply a QB accuracy delta for the duration of the player's NEXT drive only. */
  | { kind: 'QB_DRIVE'; bonus: number }
  /** Apply a QB accuracy delta for the rest of the game (accumulates). */
  | { kind: 'QB_GAME'; bonus: number }
  /** Gain or lose timeouts (clamped to 0..3). */
  | { kind: 'TIMEOUT'; delta: number };

export interface MomentOption {
  /** Short button label. */
  label: string;
  /** One-line description of what choosing this does. */
  flavor: string;
  effect: MomentEffect;
}

export interface PersonalityMoment {
  id: string;
  /** Who's talking / what's happening. One line. */
  prompt: string;
  /** 2–3 options for the coach to pick from. */
  options: MomentOption[];
}

export const PERSONALITY_MOMENTS: PersonalityMoment[] = [
  {
    id: 'diva-wr',
    prompt: 'WR1 storms over: "I am WIDE OPEN every play, coach. Get me the ROCK."',
    options: [
      {
        label: 'Promise him touches',
        flavor: '+8 QB accuracy next drive (he\'s locked in)',
        effect: { kind: 'QB_DRIVE', bonus: 8 },
      },
      {
        label: 'Tell him to wait',
        flavor: 'No effect. He\'ll sulk.',
        effect: { kind: 'NONE' },
      },
    ],
  },
  {
    id: 'doped-rb',
    prompt: 'Trainer pulls you aside: "RB tweaked his hammy. Should he play?"',
    options: [
      {
        label: 'Dope him up',
        flavor: 'Gain 1 timeout (he plays through it, sells the foul)',
        effect: { kind: 'TIMEOUT', delta: 1 },
      },
      {
        label: 'Rest him',
        flavor: '-3 yd next drive (backup is rusty)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
    ],
  },
  {
    id: 'star-tantrum',
    prompt: 'Star WR is on the sideline yelling at the QB. Camera\'s on him.',
    options: [
      {
        label: 'Yell back, dominate',
        flavor: 'No effect, but the boys saw it',
        effect: { kind: 'NONE' },
      },
      {
        label: 'Calm him down',
        flavor: '-3 yd next drive (the conversation took a while)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
      {
        label: 'Bench him',
        flavor: '-5 QB accuracy next drive (offense is off)',
        effect: { kind: 'QB_DRIVE', bonus: -5 },
      },
    ],
  },
  {
    id: 'bookie',
    prompt: 'Your "associate" calls. "Spread is 6.5. Win by exactly 7, or else."',
    options: [
      {
        label: 'Acknowledge',
        flavor: 'Gain 1 timeout (refs got a friendly word)',
        effect: { kind: 'TIMEOUT', delta: 1 },
      },
      {
        label: 'Hang up',
        flavor: 'No effect. You\'ll hear from him later.',
        effect: { kind: 'NONE' },
      },
    ],
  },
  {
    id: 'reporter',
    prompt: 'A beat reporter wants a quote about that "controversial" no-call.',
    options: [
      {
        label: 'Spin it',
        flavor: '+5 yd next drive (PR favor)',
        effect: { kind: 'FIELD_POSITION', yards: 5 },
      },
      {
        label: 'Tell the truth',
        flavor: '-1 timeout (league fines you)',
        effect: { kind: 'TIMEOUT', delta: -1 },
      },
    ],
  },
  {
    id: 'backup-qb',
    prompt: 'Backup QB whispers: "I see the safety. Let me run a series."',
    options: [
      {
        label: 'Hear him out',
        flavor: '+5 QB accuracy next drive (fresh read)',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
      {
        label: 'Stay the course',
        flavor: 'No effect. Loyalty matters.',
        effect: { kind: 'NONE' },
      },
    ],
  },
  {
    id: 'owner-call',
    prompt: 'Owner texts: "Win this and your contract\'s extended. Lose and we talk."',
    options: [
      {
        label: 'Reassure him',
        flavor: 'No effect. You\'re a politician.',
        effect: { kind: 'NONE' },
      },
      {
        label: 'Ignore the text',
        flavor: '+5 QB accuracy rest of game (you play loose)',
        effect: { kind: 'QB_GAME', bonus: 5 },
      },
    ],
  },
  {
    id: 'trainer-warning',
    prompt: 'Trainer: "Star WR\'s hamstring is barking. He says he\'s good."',
    options: [
      {
        label: 'Tape him up',
        flavor: '+8 QB accuracy next drive, then -5 the drive after',
        effect: { kind: 'QB_DRIVE', bonus: 8 },
      },
      {
        label: 'Sit him',
        flavor: '-3 yd next drive (depth issue)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
    ],
  },
  {
    id: 'tv-cameras',
    prompt: 'TV cameras zoomed in on your sideline. Heat\'s rising on the broadcast.',
    options: [
      {
        label: 'Pretend to pray',
        flavor: 'Gain 1 timeout (sympathetic spin)',
        effect: { kind: 'TIMEOUT', delta: 1 },
      },
      {
        label: 'Argue with the ref',
        flavor: '-5 yd next drive (T pending)',
        effect: { kind: 'FIELD_POSITION', yards: -5 },
      },
      {
        label: 'Stone-faced',
        flavor: 'No effect. Vibes intact.',
        effect: { kind: 'NONE' },
      },
    ],
  },
  {
    id: 'lockerroom-rant',
    prompt: 'Star LB is in the locker room yelling about your "soft" playcalling.',
    options: [
      {
        label: 'Match his energy',
        flavor: '+5 QB accuracy next drive (everyone\'s fired up)',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
      {
        label: 'Bench him',
        flavor: 'No effect now. Won\'t forget it.',
        effect: { kind: 'NONE' },
      },
    ],
  },
];

/**
 * Probability a personality moment fires after a player drive ends.
 * Roughly 1 in 4 drives, so 1–3 moments per game.
 */
export const MOMENT_TRIGGER_CHANCE = 0.25;

/**
 * Draw a random personality moment. Returns null if the trigger roll fails.
 */
export function rollPersonalityMoment(): PersonalityMoment | null {
  if (Math.random() > MOMENT_TRIGGER_CHANCE) return null;
  return PERSONALITY_MOMENTS[Math.floor(Math.random() * PERSONALITY_MOMENTS.length)];
}

/** Short label describing the kind of effect for UI summary. */
export function effectSummary(effect: MomentEffect): string {
  switch (effect.kind) {
    case 'NONE':           return 'No effect';
    case 'FIELD_POSITION': return `${effect.yards > 0 ? '+' : ''}${effect.yards} yd next drive`;
    case 'QB_DRIVE':       return `${effect.bonus > 0 ? '+' : ''}${effect.bonus} QB accuracy next drive`;
    case 'QB_GAME':        return `${effect.bonus > 0 ? '+' : ''}${effect.bonus} QB accuracy rest of game`;
    case 'TIMEOUT':        return `${effect.delta > 0 ? '+' : ''}${effect.delta} timeout`;
  }
}
