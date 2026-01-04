/**
 * Starter Events
 *
 * 10 initial events covering different days and scenarios.
 * Each event has 3-4 choices with varying risk/reward profiles.
 */

import type { GameEvent } from '../types/Events';

export const STARTER_EVENTS: GameEvent[] = [
  // ==========================================================================
  // MONDAY - Film Review (COMMON)
  // ==========================================================================
  {
    id: 'monday_film_review',
    title: 'Film Room Frustration',
    day: 'MONDAY',
    rarity: 'COMMON',
    character: 'PLAYER',
    description:
      "During film review, your star receiver is visibly frustrated. He's not getting enough targets, and he's making sure everyone knows it. The tension is palpable.",
    cooldown: 3,
    choices: [
      {
        id: 'address_publicly',
        text: 'Address it in front of the team',
        flavorText:
          'You call him out for being selfish. The room goes quiet. He respects the directness... or harbors a grudge.',
        consequences: {
          culture: -5,
          playerTrust: -10,
          risk: 5,
        },
        delayed: {
          type: 'TRADE_DEMAND',
          chance: 0.2,
          minWeeks: 2,
          maxWeeks: 4,
        },
        tags: ['RISKY'],
      },
      {
        id: 'talk_privately',
        text: 'Pull him aside after',
        flavorText:
          "You have a calm, one-on-one conversation. He appreciates being heard, even if you can't promise more targets.",
        consequences: {
          culture: 5,
          playerTrust: 5,
        },
        tags: ['SAFE', 'MORAL'],
      },
      {
        id: 'promise_targets',
        text: 'Promise him more looks this week',
        flavorText:
          "You tell him he'll be the focal point. Now you just have to hope the game plan supports that.",
        consequences: {
          culture: -3,
          playerTrust: 8,
          risk: 10,
        },
        tags: ['RISKY'],
      },
      {
        id: 'ignore_it',
        text: 'Ignore the outburst',
        flavorText:
          'You move on with the film session. The tension lingers, but you keep control of the room.',
        consequences: {
          culture: -2,
          playerTrust: -5,
        },
      },
    ],
  },

  // ==========================================================================
  // MONDAY - Injury Report (COMMON)
  // ==========================================================================
  {
    id: 'monday_injury_reveal',
    title: 'The MRI Results',
    day: 'MONDAY',
    rarity: 'COMMON',
    character: 'DOCTOR',
    targetPosition: 'RB',
    description:
      "{{playerName}}'s MRI shows a Grade 2 hamstring strain. The doctor says 2-3 weeks minimum, but {{playerFirstName}} wants to play through it. Sunday's game is crucial.",
    cooldown: 4,
    choices: [
      {
        id: 'full_rest',
        text: 'Shut {{playerFirstName}} down for 3 weeks',
        flavorText:
          "The right call for {{playerFirstName}}'s long-term health. He's frustrated but the medical staff approves.",
        consequences: {
          culture: 10,
          playerTrust: -5,
          ownerPatience: -3,
          effect: {
            type: 'INJURY',
            duration: { type: 'weeks', remaining: 3 },
            description: 'Hamstring strain (resting)',
            target: 'CONTEXT',
            severity: 'MODERATE',
            canPlayThrough: false,
          },
        },
        tags: ['SAFE', 'MORAL'],
      },
      {
        id: 'let_him_decide',
        text: 'Let {{playerFirstName}} decide',
        flavorText:
          "You leave it to {{playerFirstName}}. He chooses to play, of course. Now it's on him if it gets worse.",
        consequences: {
          culture: -5,
          playerTrust: 5,
          risk: 15,
          effect: {
            type: 'INJURY',
            duration: { type: 'weeks', remaining: 2 },
            description: 'Hamstring strain (playing through)',
            target: 'CONTEXT',
            severity: 'MODERATE',
            canPlayThrough: true,
            statModifiers: {
              speed: -12,
              acceleration: -15,
              agility: -10,
              elusiveness: -8,
            },
          },
        },
        delayed: {
          type: 'LAWSUIT',
          chance: 0.15,
          minWeeks: 4,
          maxWeeks: 8,
        },
        tags: ['RISKY'],
      },
      {
        id: 'painkiller_protocol',
        text: 'Get him a "special" injection protocol',
        flavorText:
          'Your team doc has a guy. The player will be ready Sunday, but this definitely bends the rules.',
        cost: 50000,
        consequences: {
          culture: -10,
          reputation: -15,
          risk: 20,
          heat: 5,
          effect: {
            type: 'DEBUFF',
            duration: { type: 'games', remaining: 1 },
            description: 'Painkiller protocol',
            target: 'CONTEXT',
            statModifiers: {
              speed: -5,
              awareness: -8,
              composure: -5,
            },
          },
        },
        successRate: 0.85,
        shadyActionType: 'FAKE_INJURY',
        failureConsequences: {
          description: 'The injection causes a bad reaction. Player is out longer and word gets around.',
          culture: -15,
          heat: 15,
          ownerPatience: -10,
          effect: {
            type: 'INJURY',
            duration: { type: 'weeks', remaining: 5 },
            description: 'Adverse reaction to treatment',
            target: 'CONTEXT',
            severity: 'SEVERE',
            canPlayThrough: false,
          },
        },
        tags: ['SHADY', 'EXPENSIVE'],
      },
    ],
  },

  // ==========================================================================
  // TUESDAY - PED Offer (UNCOMMON)
  // ==========================================================================
  {
    id: 'tuesday_ped_offer',
    title: 'The Supplement Guy',
    day: 'TUESDAY',
    rarity: 'UNCOMMON',
    character: 'SHADY_FIGURE',
    description:
      'A "sports nutrition consultant" approaches you after practice. He has a program that can add 10 lbs of muscle to any player in 6 weeks. Totally undetectable, he claims.',
    cooldown: 6,
    prerequisites: {
      maxHeat: 60,
    },
    choices: [
      {
        id: 'report_him',
        text: 'Report him to league security',
        flavorText:
          "You do the right thing. The league thanks you quietly. Your reputation with the 'business' community takes a hit.",
        consequences: {
          reputation: 15,
          image: 10,
          heat: -5,
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'politely_decline',
        text: 'Politely decline and move on',
        flavorText:
          "You tell him you're not interested. He leaves his card 'just in case.'",
        consequences: {
          reputation: 5,
        },
        tags: ['SAFE'],
      },
      {
        id: 'get_details',
        text: '"Tell me more..."',
        flavorText:
          'You hear him out. The program is expensive but effective. Players would sign NDAs.',
        cost: 200000,
        consequences: {
          reputation: -20,
          culture: -10,
          risk: 25,
          heat: 10,
          effect: {
            type: 'BOOST',
            duration: { type: 'weeks', remaining: 6 },
            description: 'PED program',
            target: 'RANDOM_STARTER',
            statModifiers: {
              strength: 12,
              speed: 8,
              acceleration: 6,
              stamina: 10,
              toughness: 5,
            },
          },
        },
        successRate: 0.75,
        shadyActionType: 'PED_PROGRAM',
        delayed: {
          type: 'INVESTIGATION',
          chance: 0.3,
          minWeeks: 3,
          maxWeeks: 8,
        },
        failureConsequences: {
          description: 'A player fails a random test. The league is asking questions.',
          heat: 25,
          reputation: -25,
          image: -20,
          ownerPatience: -15,
          effect: {
            type: 'SUSPENSION',
            duration: { type: 'games', remaining: 4 },
            description: 'Failed PED test - league suspension',
            target: 'RANDOM_STARTER',
          },
        },
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
  },

  // ==========================================================================
  // WEDNESDAY - Agent Extension Demand (COMMON)
  // ==========================================================================
  {
    id: 'wednesday_agent_call',
    title: 'The Agent Ambush',
    day: 'WEDNESDAY',
    rarity: 'COMMON',
    character: 'AGENT',
    description:
      "Your Pro Bowl linebacker's agent is on the line. His client wants a new deal NOW, or he's going to 'explore his options.' The contract doesn't expire for two years.",
    cooldown: 4,
    choices: [
      {
        id: 'hard_line',
        text: 'Tell him the contract stands',
        flavorText:
          "You hold firm. A deal is a deal. The agent mutters something about 'holdouts' before hanging up.",
        consequences: {
          reputation: 5,
          playerTrust: -10,
        },
        delayed: {
          type: 'HOLDOUT',
          chance: 0.4,
          minWeeks: 1,
          maxWeeks: 3,
        },
        tags: ['RISKY'],
      },
      {
        id: 'promise_offseason',
        text: 'Promise to address it in the offseason',
        flavorText:
          "You buy time. The agent seems satisfied for now. Your linebacker's mood improves.",
        consequences: {
          playerTrust: 5,
          risk: 5,
        },
        tags: ['SAFE'],
      },
      {
        id: 'throw_money',
        text: 'Give him a signing bonus to shut him up',
        flavorText:
          "You throw money at the problem. It works. For now. But other agents are watching.",
        cost: 500000,
        consequences: {
          playerTrust: 10,
          reputation: -5,
          culture: -5,
        },
        delayed: {
          type: 'HOLDOUT',
          chance: 0.25,
          minWeeks: 2,
          maxWeeks: 5,
        },
        tags: ['EXPENSIVE'],
      },
      {
        id: 'trade_threat',
        text: '"Tell him he can be traded tomorrow"',
        flavorText:
          "You play hardball. The agent backs down, but you can tell the relationship is damaged.",
        consequences: {
          reputation: 5,
          playerTrust: -15,
          culture: -5,
          image: 5,
        },
        tags: ['RISKY'],
      },
    ],
  },

  // ==========================================================================
  // WEDNESDAY - Trade Offer (UNCOMMON)
  // ==========================================================================
  {
    id: 'wednesday_trade_call',
    title: 'Mystery Trade Call',
    day: 'WEDNESDAY',
    rarity: 'UNCOMMON',
    character: 'AGENT',
    description:
      "A rival GM calls with a cryptic offer. He'll give you his first-round pick next year for 'someone on your roster.' He won't say who until you agree in principle.",
    cooldown: 5,
    choices: [
      {
        id: 'hang_up',
        text: 'Hang up immediately',
        flavorText:
          "This sounds shady. You don't play games like this.",
        consequences: {
          reputation: 3,
        },
        tags: ['SAFE'],
      },
      {
        id: 'get_specifics',
        text: 'Demand specifics first',
        flavorText:
          "You push for details. He reluctantly reveals he wants your backup QB. It's... actually a good deal.",
        consequences: {
          reputation: 5,
          slushFund: 100000,
        },
        tags: ['SAFE'],
      },
      {
        id: 'agree_blind',
        text: 'Shake on it blind',
        flavorText:
          "You agree without knowing. It's your starting cornerback. Risky, but that first-rounder could be gold.",
        consequences: {
          reputation: -10,
          risk: 20,
          playerTrust: -15,
        },
        tags: ['RISKY'],
      },
    ],
  },

  // ==========================================================================
  // THURSDAY - Player Conflict (COMMON)
  // ==========================================================================
  {
    id: 'thursday_locker_fight',
    title: 'Locker Room Brawl',
    day: 'THURSDAY',
    rarity: 'COMMON',
    character: 'PLAYER',
    description:
      "Two of your starters are throwing hands in the locker room. One accused the other of sleeping with his girlfriend. Equipment is scattered everywhere. The team is watching.",
    cooldown: 3,
    choices: [
      {
        id: 'suspend_both',
        text: 'Suspend both for the game',
        flavorText:
          "You show zero tolerance. Neither plays Sunday. The locker room respects the decision... mostly.",
        consequences: {
          culture: 10,
          playerTrust: -5,
          ownerPatience: -5,
        },
        tags: ['MORAL'],
      },
      {
        id: 'fine_only',
        text: 'Heavy fines, no suspension',
        flavorText:
          "You hit their wallets but keep them available. A practical compromise.",
        consequences: {
          culture: 0,
          playerTrust: 0,
          slushFund: 25000,
        },
        tags: ['SAFE'],
      },
      {
        id: 'blame_aggressor',
        text: 'Suspend only the one who started it',
        flavorText:
          "You investigate and punish fairly. One player is grateful, one is furious.",
        consequences: {
          culture: 5,
          playerTrust: 0,
          risk: 5,
        },
        delayed: {
          type: 'TRADE_DEMAND',
          chance: 0.15,
          minWeeks: 1,
          maxWeeks: 4,
        },
        tags: ['RISKY'],
      },
      {
        id: 'let_them_settle',
        text: 'Let them work it out',
        flavorText:
          "Boys will be boys. You close the door and let them handle it. The media would have a field day if they knew.",
        consequences: {
          culture: -10,
          risk: 15,
          image: -5,
        },
        tags: ['RISKY'],
      },
    ],
  },

  // ==========================================================================
  // FRIDAY - Press Conference Trap (COMMON)
  // ==========================================================================
  {
    id: 'friday_press_trap',
    title: 'The Loaded Question',
    day: 'FRIDAY',
    rarity: 'COMMON',
    character: 'REPORTER',
    description:
      "At your Friday presser, a reporter asks: 'There are rumors your team is using banned substances. Care to comment?' The room goes silent. Cameras are rolling.",
    cooldown: 4,
    choices: [
      {
        id: 'deny_firmly',
        text: '"Absolutely false. Next question."',
        flavorText:
          "You shut it down cleanly. The story might die, or it might grow legs from your denial.",
        consequences: {
          image: 5,
          risk: 5,
        },
        tags: ['SAFE'],
      },
      {
        id: 'joke_deflect',
        text: 'Deflect with humor',
        flavorText:
          '"The only banned substance here is my coffee addiction." The room laughs. Crisis averted.',
        consequences: {
          image: 10,
          reputation: -3,
        },
        tags: ['SAFE'],
      },
      {
        id: 'attack_reporter',
        text: 'Attack the reporter\'s credibility',
        flavorText:
          "You go on the offensive. 'Who's your source? Print that rumor and we'll sue.' Aggressive, but effective.",
        consequences: {
          image: -10,
          risk: 10,
          reputation: 5,
        },
        delayed: {
          type: 'LEAK',
          chance: 0.2,
          minWeeks: 1,
          maxWeeks: 3,
        },
        tags: ['RISKY'],
      },
      {
        id: 'walk_out',
        text: 'End the press conference',
        flavorText:
          "You thank everyone and leave. Social media explodes with speculation about what you're hiding.",
        consequences: {
          image: -20,
          heat: 5,
        },
        tags: ['RISKY'],
      },
    ],
  },

  // ==========================================================================
  // FRIDAY - Reporter Digging (UNCOMMON)
  // ==========================================================================
  {
    id: 'friday_reporter_sniffing',
    title: 'The Investigative Piece',
    day: 'FRIDAY',
    rarity: 'UNCOMMON',
    character: 'REPORTER',
    description:
      "A well-known investigative journalist is working on a piece about 'corruption in college football recruiting.' She wants an interview. Your past isn't exactly clean.",
    cooldown: 5,
    prerequisites: {
      minHeat: 10,
    },
    choices: [
      {
        id: 'cooperate_fully',
        text: 'Agree to the interview',
        flavorText:
          "You decide transparency is the best policy. She might find nothing, or she might find everything.",
        consequences: {
          reputation: 10,
          image: 5,
          heat: -5,
        },
        successRate: 0.6,
        failureConsequences: {
          description: 'The interview goes poorly. She found some old skeletons.',
          heat: 20,
          reputation: -15,
          image: -15,
        },
        tags: ['RISKY'],
      },
      {
        id: 'decline_politely',
        text: 'Politely decline',
        flavorText:
          "You have nothing to hide, you just don't have time. Standard operating procedure.",
        consequences: {
          reputation: 0,
          image: -5,
        },
        tags: ['SAFE'],
      },
      {
        id: 'kill_story',
        text: 'Call in a favor to kill the story',
        flavorText:
          "You know someone at her network. A few phone calls and suddenly she's reassigned.",
        cost: 150000,
        consequences: {
          reputation: -15,
          heat: 10,
          image: 5,
        },
        successRate: 0.8,
        shadyActionType: 'KILL_STORY',
        failureConsequences: {
          description: 'She finds out you tried to kill her story. Now it\'s personal.',
          heat: 30,
          reputation: -20,
          image: -25,
        },
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
  },

  // ==========================================================================
  // SATURDAY - Spread Information (RARE)
  // ==========================================================================
  {
    id: 'saturday_spread_info',
    title: 'The Vegas Connection',
    day: 'SATURDAY',
    rarity: 'RARE',
    character: 'SHADY_FIGURE',
    description:
      "A 'sports consultant' approaches you with an interesting proposition. For a fee, he can make sure certain information about your opponent's injuries reaches... interested parties. Vegas parties.",
    cooldown: 8,
    prerequisites: {
      maxHeat: 50,
      minSlushFund: 100000,
    },
    choices: [
      {
        id: 'report_fbi',
        text: 'Report this to the FBI',
        flavorText:
          "You're not getting involved with gambling. You make the call. The feds are appreciative.",
        consequences: {
          reputation: 20,
          heat: -15,
          image: 10,
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'walk_away',
        text: 'Walk away silently',
        flavorText:
          "You don't want trouble. You pretend you didn't hear anything.",
        consequences: {
          reputation: -5,
        },
        tags: ['SAFE'],
      },
      {
        id: 'take_the_deal',
        text: 'Take the money',
        flavorText:
          "You give him the injury report. He pays in cash. Nobody needs to know.",
        cost: -250000,  // Negative cost = income
        consequences: {
          reputation: -25,
          risk: 30,
          heat: 20,
          slushFund: 250000,
        },
        successRate: 0.7,
        shadyActionType: 'POINT_SHAVING',
        delayed: {
          type: 'INVESTIGATION',
          chance: 0.5,
          minWeeks: 2,
          maxWeeks: 6,
        },
        failureConsequences: {
          description: 'The consultant was an undercover agent. You\'re in serious trouble.',
          heat: 50,
          reputation: -40,
          ownerPatience: -30,
        },
        tags: ['SHADY', 'RISKY'],
      },
    ],
  },

  // ==========================================================================
  // SATURDAY - Ref Opportunity (RARE)
  // ==========================================================================
  {
    id: 'saturday_ref_bribe',
    title: 'The Friendly Referee',
    day: 'SATURDAY',
    rarity: 'RARE',
    character: 'SHADY_FIGURE',
    description:
      "Through a trusted intermediary, you learn that tomorrow's head referee is... flexible. For the right price, certain calls might go your way.",
    cooldown: 10,
    prerequisites: {
      maxHeat: 40,
      minSlushFund: 300000,
    },
    choices: [
      {
        id: 'refuse_report',
        text: 'Report it to the league',
        flavorText:
          "You notify the league office immediately. The referee is removed from the game. Your conscience is clean.",
        consequences: {
          reputation: 25,
          heat: -10,
          image: 15,
          culture: 10,
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'refuse_quietly',
        text: 'Decline and say nothing',
        flavorText:
          "You want no part of this, but you're not a snitch either.",
        consequences: {
          reputation: 5,
        },
        tags: ['SAFE'],
      },
      {
        id: 'accept_bribe',
        text: 'Pay for the advantage',
        flavorText:
          "This could be the difference in a close game. You make the payment through channels.",
        cost: 300000,
        consequences: {
          reputation: -30,
          risk: 35,
          heat: 25,
        },
        successRate: 0.65,
        shadyActionType: 'BRIBE_REF',
        delayed: {
          type: 'INVESTIGATION',
          chance: 0.6,
          minWeeks: 2,
          maxWeeks: 8,
        },
        failureConsequences: {
          description: 'The referee gets cold feet and confesses. Your name comes up.',
          heat: 60,
          reputation: -50,
          image: -40,
          ownerPatience: -40,
        },
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
  },

  // ==========================================================================
  // TUESDAY - Player Scandal (GUARANTEED for testing)
  // ==========================================================================
  {
    id: 'velveeta_incident',
    title: "{playerName}'s Personal Chef Files Police Report",
    day: 'TUESDAY',
    rarity: 'GUARANTEED',
    character: 'PLAYER',
    targetPosition: 'WR1',
    prerequisites: {
      maxWeek: 1,  // Only fires in week 1 - before first game
    },
    description:
      "TMZ has obtained Ring camera footage showing your star receiver in a physical altercation with his personal chef. Sources say the dispute began when she used American cheese instead of Velveeta on his grilled cheese. Her lawyer is already talking to ESPN.",
    texCall:
      "*laughing* Boy lost his damn mind over some Velveeta? Hell, I get it - you don't mess with a man's cheese. But her lawyer's making noise. Handle it.",
    imageUrl: '/images/events/velveeta_incident.png',
    cooldown: 0, // One-time event
    choices: [
      {
        id: 'pay_off_nda',
        text: 'Pay her off - NDA, make it go away',
        flavorText:
          "Tex's people draw up the paperwork. She signs, the footage disappears, and your receiver sends you a fruit basket.",
        cost: 350000,
        consequences: {
          heat: 5,
          playerTrust: 5,
        },
        tags: ['EXPENSIVE', 'SHADY'],
      },
      {
        id: 'suspend_apologize',
        text: 'Suspend him 2 games + public apology',
        flavorText:
          "He's furious, but the league office sends you a thank-you note. The story dies after one news cycle.",
        consequences: {
          playerTrust: -15,
          image: 15,
        },
        playerEffect: {
          type: 'SUSPEND',
          duration: 2,
          position: 'WR1',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'fine_game_check',
        text: 'Fine him a game check',
        flavorText:
          "You take $180K from his paycheck. He's not happy, and the chef's lawyer is still circling.",
        consequences: {
          slushFund: 180000,
          playerTrust: -10,
          risk: 5,
        },
        delayed: {
          type: 'LAWSUIT',
          chance: 0.3,
          minWeeks: 2,
          maxWeeks: 5,
        },
        tags: ['RISKY'],
      },
      {
        id: 'deny_discredit',
        text: 'Deny everything, discredit her',
        flavorText:
          "You go on the offensive. Your PR team questions her credibility. Your receiver loves that you had his back.",
        consequences: {
          playerTrust: 10,
          risk: 20,
        },
        successRate: 0.6,
        failureConsequences: {
          description: 'More footage drops. The internet has a field day. Sponsors start calling.',
          image: -25,
          heat: 15,
          ownerPatience: -20,
        },
        tags: ['RISKY'],
      },
    ],
  },
];

// ==========================================================================
// DELAYED EVENT GENERATORS
// ==========================================================================

/**
 * Generate a follow-up event when a delayed consequence triggers
 */
export function getDelayedEventContent(
  type: string,
  sourceEventId: string
): GameEvent {
  switch (type) {
    case 'MORE_ACCUSERS':
      return {
        id: `delayed_more_accusers_${Date.now()}`,
        title: 'More Accusers Come Forward',
        day: 'WEDNESDAY',
        rarity: 'RARE',
        character: 'REPORTER',
        description:
          "Your earlier payoff didn't stay quiet. Two more accusers have come forward. The price just doubled.",
        cooldown: 0,
        choices: [
          {
            id: 'pay_double',
            text: 'Pay them all off',
            flavorText: 'You throw money at the problem again. When does it end?',
            cost: 400000,
            consequences: {
              reputation: -20,
              heat: 15,
              image: -10,
            },
            delayed: {
              type: 'MORE_ACCUSERS',
              chance: 0.4,
              minWeeks: 2,
              maxWeeks: 5,
            },
            shadyActionType: 'PAYOFF_ACCUSER',
            tags: ['SHADY', 'EXPENSIVE'],
          },
          {
            id: 'face_music',
            text: 'Face the allegations publicly',
            flavorText: 'You come clean and face the consequences. At least it ends here.',
            consequences: {
              reputation: -30,
              heat: 20,
              image: -30,
              ownerPatience: -20,
            },
            tags: ['RISKY'],
          },
        ],
      };

    case 'INVESTIGATION':
      return {
        id: `delayed_investigation_${Date.now()}`,
        title: 'League Investigation Launched',
        day: 'MONDAY',
        rarity: 'RARE',
        character: 'LEAGUE_REP',
        description:
          "The league has opened a formal investigation into your program. Investigators will be on campus next week. Your past choices are catching up.",
        cooldown: 0,
        choices: [
          {
            id: 'cooperate',
            text: 'Cooperate fully',
            flavorText: 'You open your books and hope for the best.',
            consequences: {
              reputation: 10,
              heat: 5,
            },
            tags: ['SAFE'],
          },
          {
            id: 'lawyer_up',
            text: 'Lawyer up and stonewall',
            flavorText: "You're not making this easy for them.",
            cost: 100000,
            consequences: {
              reputation: -10,
              heat: 15,
            },
            tags: ['EXPENSIVE'],
          },
        ],
      };

    case 'HOLDOUT':
      return {
        id: `delayed_holdout_${Date.now()}`,
        title: 'Player Holdout',
        day: 'TUESDAY',
        rarity: 'UNCOMMON',
        character: 'PLAYER',
        description:
          "Your linebacker has made good on his threat. He's not showing up to practice until he gets a new deal.",
        cooldown: 0,
        choices: [
          {
            id: 'fine_daily',
            text: 'Fine him for every day missed',
            flavorText: "You play hardball. It's costing him $50K per day.",
            consequences: {
              culture: -10,
              playerTrust: -15,
            },
            tags: ['RISKY'],
          },
          {
            id: 'negotiate',
            text: 'Open negotiations',
            flavorText: 'You give in and start talking money.',
            cost: 300000,
            consequences: {
              playerTrust: 10,
              reputation: -5,
            },
            tags: ['EXPENSIVE'],
          },
          {
            id: 'trade_him',
            text: 'Put him on the trade block',
            flavorText: "You don't negotiate with hostage takers.",
            consequences: {
              culture: 5,
              playerTrust: -20,
              reputation: 10,
            },
            tags: ['RISKY'],
          },
        ],
      };

    case 'TRADE_DEMAND':
      return {
        id: `delayed_trade_demand_${Date.now()}`,
        title: 'Trade Me',
        day: 'WEDNESDAY',
        rarity: 'UNCOMMON',
        character: 'PLAYER',
        description:
          "Your receiver has had enough. He's publicly demanded a trade. It's all over social media.",
        cooldown: 0,
        choices: [
          {
            id: 'grant_wish',
            text: 'Trade him within the week',
            flavorText: 'You move on. Sometimes relationships can\'t be saved.',
            consequences: {
              culture: 0,
              playerTrust: 5,
            },
            tags: ['SAFE'],
          },
          {
            id: 'refuse',
            text: 'Refuse to trade him',
            flavorText: "He's under contract. He plays or he doesn't get paid.",
            consequences: {
              culture: -5,
              playerTrust: -10,
              image: -10,
            },
            tags: ['RISKY'],
          },
        ],
      };

    case 'LAWSUIT':
      return {
        id: `delayed_lawsuit_${Date.now()}`,
        title: 'Legal Trouble',
        day: 'WEDNESDAY',
        rarity: 'RARE',
        character: 'AGENT',
        description:
          "You're being sued. A former player claims you pressured him to play through an injury, causing permanent damage.",
        cooldown: 0,
        choices: [
          {
            id: 'settle',
            text: 'Settle out of court',
            flavorText: 'You write a check and include an NDA. The story dies.',
            cost: 500000,
            consequences: {
              reputation: -10,
              heat: 5,
            },
            shadyActionType: 'PAYOFF_ACCUSER',
            tags: ['EXPENSIVE'],
          },
          {
            id: 'fight',
            text: 'Fight it in court',
            flavorText: 'You believe you\'re in the right. Let a jury decide.',
            cost: 200000,
            consequences: {
              reputation: 5,
              image: -15,
              risk: 20,
            },
            successRate: 0.5,
            failureConsequences: {
              description: 'The jury finds against you. Damages are massive.',
              reputation: -25,
              image: -30,
              slushFund: -1000000,
              ownerPatience: -25,
            },
            tags: ['EXPENSIVE', 'RISKY'],
          },
        ],
      };

    case 'LEAK':
      return {
        id: `delayed_leak_${Date.now()}`,
        title: 'Anonymous Source',
        day: 'FRIDAY',
        rarity: 'UNCOMMON',
        character: 'REPORTER',
        description:
          "A story just broke citing an 'anonymous source close to the program.' Someone is talking about things you'd rather keep quiet.",
        cooldown: 0,
        choices: [
          {
            id: 'deny_all',
            text: 'Issue a strong denial',
            flavorText: 'You call the story "completely fabricated." Time will tell if that holds.',
            consequences: {
              image: -10,
              heat: 10,
            },
            tags: ['RISKY'],
          },
          {
            id: 'no_comment',
            text: 'No comment',
            flavorText: 'You let the news cycle move on without adding fuel.',
            consequences: {
              image: -5,
              heat: 5,
            },
            tags: ['SAFE'],
          },
          {
            id: 'find_leak',
            text: 'Hunt for the mole',
            flavorText: 'You hire a PI to find out who\'s talking.',
            cost: 75000,
            consequences: {
              culture: -15,
              playerTrust: -10,
            },
            tags: ['EXPENSIVE', 'RISKY'],
          },
        ],
      };

    default:
      return {
        id: `delayed_generic_${Date.now()}`,
        title: 'Consequences',
        day: 'MONDAY',
        rarity: 'COMMON',
        character: 'OWNER',
        description: 'Your past choices have caught up with you.',
        cooldown: 0,
        choices: [
          {
            id: 'accept',
            text: 'Accept the consequences',
            consequences: {
              ownerPatience: -10,
            },
          },
        ],
      };
  }
}

export default STARTER_EVENTS;
