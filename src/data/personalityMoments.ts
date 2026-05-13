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
 *
 * Triggers gate which moments are eligible to fire. A moment with
 * `triggers: ['always']` can fire any time. Context-tagged moments
 * (e.g. `['turnover']`) only fire when the situation matches — making
 * the texture feel reactive instead of random.
 */

/**
 * Trigger conditions a moment can require to be eligible.
 * 'always' = no constraint, fires anywhere.
 */
export type MomentTrigger =
  | 'always'
  | 'turnover'         // INT or FUMBLE on the just-finished drive
  | 'after_td'         // Just-finished drive ended in a touchdown
  | 'after_punt'       // Just-finished drive ended in a punt
  | 'after_fg'         // Field goal attempt (made or missed)
  | 'after_failed_4th' // Turnover on downs
  | 'trailing'         // You're behind on the scoreboard
  | 'winning_big'      // You're up by 14+
  | 'late_game';       // Q4 with under 5:00 remaining

/** Snapshot of the situation used to filter the moment pool. */
export interface MomentContext {
  driveEnd:
    | 'TOUCHDOWN'
    | 'FIELD_GOAL'
    | 'PUNT'
    | 'TURNOVER'
    | 'TURNOVER_ON_DOWNS'
    | 'SAFETY'
    | null;
  /** Player score minus opponent score. Negative = trailing. */
  scoreDiff: number;
  /** Quarter (1-4). */
  quarter: number;
  /** Seconds remaining in the current quarter. */
  secondsRemaining: number;
}

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
  /**
   * Conditions under which this moment is eligible to fire. A moment is
   * eligible if at least one of its triggers matches the current context
   * (or if the list contains 'always').
   */
  triggers: MomentTrigger[];
}

export const PERSONALITY_MOMENTS: PersonalityMoment[] = [
  // ---------- Generic moments — fire any time ----------
  {
    id: 'diva-wr',
    triggers: ['always'],
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
    triggers: ['always'],
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
    id: 'bookie',
    triggers: ['always'],
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
    triggers: ['always'],
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
    triggers: ['always'],
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
    id: 'trainer-warning',
    triggers: ['always'],
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
    triggers: ['always'],
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
    triggers: ['always'],
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

  // ---------- Turnover follow-ups ----------
  {
    id: 'qb-sulks-after-int',
    triggers: ['turnover'],
    prompt: 'Your QB is at his locker after that pick. Won\'t make eye contact.',
    options: [
      {
        label: 'Encourage him',
        flavor: '+5 QB accuracy next drive (back to confidence)',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
      {
        label: 'Let him stew',
        flavor: 'No effect. Lessons get learned the hard way.',
        effect: { kind: 'NONE' },
      },
    ],
  },
  {
    id: 'star-tantrum',
    triggers: ['turnover', 'after_failed_4th'],
    prompt: 'Star WR is yelling at the QB on the sideline. Camera\'s on him.',
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
    id: 'rb-fumble-sit',
    triggers: ['turnover'],
    prompt: 'RB threw the ball at the bench. Trainer says he\'s done.',
    options: [
      {
        label: 'Sit him',
        flavor: '-3 yd next drive (depth issue)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
      {
        label: 'Force him back in',
        flavor: '+3 yd next drive (he\'s gotta atone)',
        effect: { kind: 'FIELD_POSITION', yards: 3 },
      },
    ],
  },

  // ---------- TD follow-ups ----------
  {
    id: 'td-celebration',
    triggers: ['after_td'],
    prompt: 'Locker room is electric. WR1 wants to dance for the cameras.',
    options: [
      {
        label: 'Let him cook',
        flavor: 'No effect, all in good fun',
        effect: { kind: 'NONE' },
      },
      {
        label: 'Tell him to act like he\'s been there',
        flavor: '+5 QB accuracy rest of game (focus)',
        effect: { kind: 'QB_GAME', bonus: 5 },
      },
    ],
  },
  {
    id: 'td-coordinator-deep',
    triggers: ['after_td'],
    prompt: 'Coordinator: "We\'re hot — call deep next drive."',
    options: [
      {
        label: 'Let it rip',
        flavor: '+5 QB accuracy next drive (rhythm)',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
      {
        label: 'Stay vanilla',
        flavor: '-3 yd next drive (predictable)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
    ],
  },

  // ---------- Trailing ----------
  {
    id: 'owner-call',
    triggers: ['trailing', 'late_game'],
    prompt: 'Owner texts: "Win this and your contract\'s extended. Lose and we talk."',
    options: [
      {
        label: 'Reassure him',
        flavor: 'No effect. You\'re a politician.',
        effect: { kind: 'NONE' },
      },
      {
        label: 'Block the number',
        flavor: '+5 QB accuracy rest of game (you play loose)',
        effect: { kind: 'QB_GAME', bonus: 5 },
      },
    ],
  },
  {
    id: 'trailing-veteran',
    triggers: ['trailing'],
    prompt: 'Veteran captain pulls the offense aside. Whatever he said, the unit looks ready.',
    options: [
      {
        label: 'Trust him',
        flavor: '+5 QB accuracy next drive',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
      {
        label: 'Step in, take over',
        flavor: 'No effect. He\'s annoyed but composed.',
        effect: { kind: 'NONE' },
      },
    ],
  },

  // ---------- Winning big ----------
  {
    id: 'winning-coast',
    triggers: ['winning_big'],
    prompt: 'You\'re up two scores. Coordinator wants to keep throwing.',
    options: [
      {
        label: 'Run the clock',
        flavor: 'No effect. Game-management mode.',
        effect: { kind: 'NONE' },
      },
      {
        label: 'Bury them',
        flavor: '+5 QB accuracy next drive (offense in rhythm)',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
    ],
  },

  // ---------- Punt follow-up ----------
  {
    id: 'punter-complaint',
    triggers: ['after_punt'],
    prompt: 'Punter complains about the snap. He\'s right but it doesn\'t help.',
    options: [
      {
        label: 'Yell at the C',
        flavor: '-3 yd next drive (chemistry off)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
      {
        label: 'Pat him on the shoulder',
        flavor: 'No effect. Class move.',
        effect: { kind: 'NONE' },
      },
    ],
  },

  // ---------- Failed 4th ----------
  {
    id: 'defense-needs-rest',
    triggers: ['after_failed_4th'],
    prompt: 'Defense looks gassed. Captain wants you to commit a TO this drive.',
    options: [
      {
        label: 'Promise it',
        flavor: '-1 timeout (you\'ll burn one)',
        effect: { kind: 'TIMEOUT', delta: -1 },
      },
      {
        label: 'Tell them to suck it up',
        flavor: '+5 QB accuracy next drive (everyone fired up)',
        effect: { kind: 'QB_DRIVE', bonus: 5 },
      },
    ],
  },

  // ---------- Late game ----------
  {
    id: 'late-game-prayer',
    triggers: ['late_game'],
    prompt: 'Cameras on the chaplain praying with the offense. Heart-warming. Distracting.',
    options: [
      {
        label: 'Join in',
        flavor: '+5 yd next drive (good vibes)',
        effect: { kind: 'FIELD_POSITION', yards: 5 },
      },
      {
        label: 'Pull them off',
        flavor: '-3 yd next drive (locker-room friction)',
        effect: { kind: 'FIELD_POSITION', yards: -3 },
      },
    ],
  },
];

/**
 * Probability a personality moment fires after a player drive ends.
 * Roughly 1 in 4 drives, so 1–3 moments per game.
 */
export const MOMENT_TRIGGER_CHANCE = 0.30;

/** Map a drive-end reason + score state into the active triggers for filtering. */
function activeTriggers(ctx: MomentContext): MomentTrigger[] {
  const out: MomentTrigger[] = ['always'];
  switch (ctx.driveEnd) {
    case 'TOUCHDOWN':         out.push('after_td'); break;
    case 'FIELD_GOAL':        out.push('after_fg'); break;
    case 'PUNT':              out.push('after_punt'); break;
    case 'TURNOVER':          out.push('turnover'); break;
    case 'TURNOVER_ON_DOWNS': out.push('after_failed_4th'); break;
  }
  if (ctx.scoreDiff < 0) out.push('trailing');
  if (ctx.scoreDiff >= 14) out.push('winning_big');
  if (ctx.quarter === 4 && ctx.secondsRemaining <= 300) out.push('late_game');
  return out;
}

/**
 * Draw a personality moment given the current situation. Filters the pool
 * to moments whose triggers overlap with the active context, then weights
 * context-specific moments 2x over generic 'always' moments so the texture
 * leans into the situation.
 *
 * Returns null if the trigger roll fails or no eligible moments exist.
 */
export function rollPersonalityMoment(ctx: MomentContext): PersonalityMoment | null {
  if (Math.random() > MOMENT_TRIGGER_CHANCE) return null;
  const active = new Set(activeTriggers(ctx));
  const eligible = PERSONALITY_MOMENTS.filter(m => m.triggers.some(t => active.has(t)));
  if (eligible.length === 0) return null;

  // Weighted pick: context-specific moments (anything other than ['always']) get 2x weight.
  const weighted: PersonalityMoment[] = [];
  for (const m of eligible) {
    const isGeneric = m.triggers.length === 1 && m.triggers[0] === 'always';
    weighted.push(m);
    if (!isGeneric) weighted.push(m);  // Add a second copy to double the odds.
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
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
