/**
 * ILLEGAL MOTION - Event Templates
 *
 * ~40 event templates across categories for the weekly management layer.
 * GTA-style satirical tone with corruption, scandals, and drama.
 */

import type {
  GameEvent,
  EventCategory,
  EventRarity,
  EventTag,
} from '../types/event.types';

// =============================================================================
// PLAYER INCIDENT EVENTS
// =============================================================================

export const PLAYER_INCIDENT_EVENTS: GameEvent[] = [
  // --- DUI ---
  {
    id: 'player_dui',
    category: 'SCANDAL',
    character: 'PLAYER',
    title: 'DUI Arrest',
    headline: '{playerName} ARRESTED FOR DUI',
    description:
      'Your {position} was pulled over at 3 AM doing 95 in a school zone. BAC was twice the legal limit. TMZ already has the dashcam footage.',
    flavorText: 'At least he had the courtesy to wear team gear in the mugshot.',
    choices: [
      {
        id: 'cover_up_dui',
        text: 'Make it disappear',
        description: 'Call in favors with the local PD. The arrest record gets "lost."',
        buttonText: 'Cover Up',
        slushFundCost: 150000,
        successRate: 75,
        consequences: {
          heat: 15,
          reputation: -10,
          resultText: 'The arresting officer suddenly retired to Florida. No charges filed.',
        },
        failureConsequences: {
          heat: 35,
          reputation: -25,
          mediaPerception: -20,
          resultText: 'A rookie cop made a backup copy. The cover-up is now the story.',
        },
        requiresSlushFund: 150000,
        tags: ['SHADY', 'EXPENSIVE'],
      },
      {
        id: 'suspend_dui',
        text: 'Suspend him immediately',
        description: 'Two-game suspension, mandatory counseling, public apology.',
        buttonText: 'Suspend',
        consequences: {
          reputation: 10,
          mediaPerception: 15,
          playerMorale: -10,
          suspensionWeeks: 2,
          resultText: 'The league applauds your swift action. Your player is furious.',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'spin_dui',
        text: 'Spin it as a "health issue"',
        description: 'Announce he\'s entering a wellness program. Deflect the DUI angle.',
        buttonText: 'Spin It',
        moneyCost: 50000,
        consequences: {
          mediaPerception: 5,
          reputation: -5,
          resultText: 'The press conference worked. ESPN is calling him "brave."',
        },
        tags: ['RISKY'],
      },
    ],
    prerequisites: {
      requiresPosition: 'QB',
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 6,
    tags: ['LEGAL', 'MEDIA_CIRCUS'],
    urgency: 'HIGH',
  },

  // --- Social Media Disaster ---
  {
    id: 'social_media_disaster',
    category: 'SCANDAL',
    character: 'PLAYER',
    title: 'Viral Tweet Storm',
    headline: '{playerName} TWITTER RANT GOES VIRAL',
    description:
      'Your {position} went on a 3 AM Twitter rant. He insulted fans, called out teammates by name, and posted something politically incendiary. It\'s trending #1.',
    flavorText: 'He typed all that with his thumbs. Impressive, really.',
    choices: [
      {
        id: 'delete_apologize',
        text: 'Delete tweets, issue apology',
        description: 'Standard crisis management. Quick and boring.',
        buttonText: 'Damage Control',
        consequences: {
          mediaPerception: -10,
          fanApproval: -5,
          resultText: 'The apology was called "insincere" but the news cycle moved on.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'double_down',
        text: 'Let him double down',
        description: 'Some say all press is good press. Find out.',
        buttonText: 'Let It Ride',
        consequences: {
          mediaPerception: -25,
          fanApproval: -15,
          ownerPatience: -10,
          resultText: 'Cable news won\'t stop talking about you. Sponsors are calling.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'claim_hacked',
        text: '"His account was hacked"',
        description: 'The classic excuse. Nobody believes it, but it provides cover.',
        buttonText: 'Blame Hackers',
        slushFundCost: 25000,
        consequences: {
          mediaPerception: -5,
          heat: 5,
          resultText: 'Your "cyber security team" issued a statement. Twitter ratio\'d you.',
        },
        tags: ['SHADY'],
      },
    ],
    prerequisites: {
      requiresHighEgo: true,
    },
    rarity: 'COMMON',
    cooldownWeeks: 4,
    tags: ['MEDIA_CIRCUS', 'MORALE'],
    urgency: 'MEDIUM',
  },

  // --- Locker Room Fight ---
  {
    id: 'locker_room_brawl',
    category: 'PLAYER_ISSUE',
    character: 'PLAYER',
    title: 'Locker Room Brawl',
    headline: 'PLAYERS COME TO BLOWS IN LOCKER ROOM',
    description:
      'Two starters are throwing hands in the locker room. Equipment scattered, blood on the floor. The whole team watched it happen.',
    flavorText: 'The rookie filming it for TikTok didn\'t help.',
    choices: [
      {
        id: 'suspend_both',
        text: 'Suspend both players',
        description: 'Zero tolerance. Neither plays this week.',
        buttonText: 'Suspend Both',
        consequences: {
          reputation: 10,
          playerMorale: -15,
          ownerPatience: -5,
          resultText: 'The locker room respects the call. Your depth chart doesn\'t.',
        },
        tags: ['MORAL'],
      },
      {
        id: 'fine_only',
        text: 'Heavy fines, no suspension',
        description: 'Hit their wallets but keep them available for Sunday.',
        buttonText: 'Fine Them',
        consequences: {
          slushFund: 50000,
          playerMorale: -5,
          resultText: 'Money talks. Both will play, but tensions remain.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'let_settle',
        text: 'Let them settle it',
        description: 'Close the door. Old school approach.',
        buttonText: 'Boys Will Be Boys',
        consequences: {
          reputation: -10,
          playerMorale: 5,
          heat: 5,
          resultText: 'They worked it out. Or one of them is too scared to talk.',
        },
        tags: ['RISKY'],
      },
    ],
    rarity: 'COMMON',
    cooldownWeeks: 3,
    tags: ['MORALE', 'MEDIA_CIRCUS'],
    urgency: 'MEDIUM',
  },

  // --- Contract Holdout ---
  {
    id: 'star_holdout',
    category: 'PLAYER_ISSUE',
    character: 'AGENT',
    title: 'Contract Holdout',
    headline: '{playerName} REFUSES TO REPORT',
    description:
      'Your star {position}\'s agent just called. His client wants a new deal NOW or he\'s sitting out. "He has two years left but the market has changed."',
    flavorText: 'Agents: the only profession where lying is called "negotiating."',
    choices: [
      {
        id: 'hold_firm',
        text: 'A deal is a deal',
        description: 'He signed a contract. Honor it or get fined.',
        buttonText: 'Stand Firm',
        consequences: {
          reputation: 10,
          playerMorale: -20,
          resultText: 'He\'s fined $50K per day missed. The standoff begins.',
        },
        delayedConsequences: {
          type: 'REVENGE',
          triggerWeek: 3,
          chance: 40,
          consequences: {
            playerMorale: -15,
            resultText: 'The holdout continues. Team chemistry is suffering.',
          },
          description: 'This could get ugly...',
        },
        tags: ['RISKY'],
      },
      {
        id: 'restructure',
        text: 'Restructure his deal',
        description: 'Give him more guaranteed money. Set a precedent.',
        buttonText: 'Pay Up',
        moneyCost: 500000,
        consequences: {
          playerMorale: 15,
          reputation: -10,
          resultText: 'He\'s happy. Every other agent in the league just took notes.',
        },
        tags: ['EXPENSIVE'],
      },
      {
        id: 'trade_him',
        text: 'Put him on the block',
        description: 'You don\'t negotiate with hostage-takers.',
        buttonText: 'Trade Him',
        consequences: {
          playerMorale: -10,
          reputation: 15,
          slushFund: 200000,
          resultText: 'Three teams called within the hour. Message sent.',
        },
        tags: ['RISKY'],
      },
    ],
    prerequisites: {
      minWeek: 3,
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 8,
    tags: ['MONEY', 'MORALE'],
    urgency: 'HIGH',
  },

  // --- PED Suspicion ---
  {
    id: 'ped_suspicion',
    category: 'SCANDAL',
    character: 'DOCTOR',
    title: 'PED Red Flags',
    headline: 'LEAGUE DEMANDS ADDITIONAL TESTING FOR {playerName}',
    description:
      'The league\'s substance abuse program flagged your {position}\'s recent test. Not a failure, but "irregularities" that require follow-up testing.',
    flavorText: 'His trainer says it\'s just creatine. His trainer also drives a Lambo.',
    choices: [
      {
        id: 'cooperate_ped',
        text: 'Full cooperation',
        description: 'Nothing to hide. Let them test whatever they want.',
        buttonText: 'Cooperate',
        successRate: 70,
        consequences: {
          reputation: 10,
          resultText: 'The additional tests came back clean. Crisis averted.',
        },
        failureConsequences: {
          heat: 30,
          reputation: -20,
          suspensionWeeks: 2,
          resultText: 'The expanded test found something. Two-game suspension incoming.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'lawyer_ped',
        text: 'Lawyer up immediately',
        description: 'Challenge the testing protocol. Buy time.',
        buttonText: 'Call Lawyers',
        moneyCost: 100000,
        consequences: {
          heat: 10,
          mediaPerception: -10,
          resultText: 'Legal challenge filed. The league is annoyed but following procedure.',
        },
        tags: ['EXPENSIVE'],
      },
      {
        id: 'masking_agent',
        text: 'Get him a "cleanse"',
        description: 'Your guy knows a guy. Flush the system before the retest.',
        buttonText: 'Clean Him Up',
        slushFundCost: 75000,
        successRate: 60,
        consequences: {
          heat: 15,
          resultText: 'The retest came back clean. Nobody suspects a thing.',
        },
        failureConsequences: {
          heat: 50,
          reputation: -30,
          ownerPatience: -20,
          suspensionWeeks: 2,
          resultText: 'They found the masking agent. Two-game suspension and league scrutiny.',
        },
        requiresSlushFund: 75000,
        tags: ['SHADY', 'RISKY'],
      },
    ],
    prerequisites: {
      maxHeat: 60,
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 10,
    tags: ['LEGAL', 'PLAYER_HEALTH'],
    urgency: 'HIGH',
  },

  // --- Domestic Incident ---
  {
    id: 'domestic_incident',
    category: 'SCANDAL',
    character: 'LAWYER',
    title: 'Domestic Disturbance',
    headline: 'POLICE CALLED TO {playerName}\'S HOME',
    description:
      'Police responded to a domestic disturbance call at your {position}\'s residence last night. No arrests, but there\'s a report.',
    flavorText: 'The neighbor\'s Ring doorbell caught everything.',
    choices: [
      {
        id: 'immediate_action',
        text: 'Bench him pending investigation',
        description: 'Take the high road. Let the facts come out.',
        buttonText: 'Bench Him',
        consequences: {
          reputation: 15,
          mediaPerception: 10,
          playerMorale: -10,
          resultText: 'Media praises the swift response. Your player claims innocence.',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'wait_and_see',
        text: 'Wait for more information',
        description: 'Innocent until proven guilty, right?',
        buttonText: 'Wait',
        consequences: {
          reputation: -5,
          mediaPerception: -15,
          resultText: 'Critics say you\'re protecting a star. More details leak daily.',
        },
        delayedConsequences: {
          type: 'EXPOSE',
          triggerWeek: 2,
          chance: 50,
          consequences: {
            reputation: -20,
            mediaPerception: -25,
            resultText: 'Video surfaced. Should have acted sooner.',
          },
          description: 'More evidence could emerge...',
        },
        tags: ['RISKY'],
      },
      {
        id: 'silence_partner',
        text: 'Make it go away',
        description: 'Settlement, NDA, the whole package.',
        buttonText: 'Pay Off',
        slushFundCost: 300000,
        successRate: 65,
        consequences: {
          heat: 20,
          resultText: 'Papers signed. Story killed. For now.',
        },
        failureConsequences: {
          heat: 45,
          reputation: -35,
          mediaPerception: -30,
          resultText: 'She went public anyway. The cover-up is now the bigger story.',
        },
        requiresSlushFund: 300000,
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
    rarity: 'RARE',
    cooldownWeeks: 12,
    tags: ['LEGAL', 'MEDIA_CIRCUS', 'CAREER_DEFINING'],
    urgency: 'CRITICAL',
  },
];

// =============================================================================
// CORRUPTION OPPORTUNITY EVENTS
// =============================================================================

export const CORRUPTION_EVENTS: GameEvent[] = [
  // --- Ref Bribe ---
  {
    id: 'ref_bribe_offer',
    category: 'CORRUPTION',
    character: 'FIXER',
    title: 'The Friendly Ref',
    headline: 'A BUSINESS PROPOSITION',
    description:
      'A "mutual friend" approaches you at a charity gala. Sunday\'s head ref is apparently... flexible. Key calls could go your way.',
    flavorText: '"He prefers cash. Old bills. Nothing larger than a fifty."',
    choices: [
      {
        id: 'report_ref',
        text: 'Report to the league',
        description: 'Do the right thing. The ref gets removed.',
        buttonText: 'Report It',
        consequences: {
          reputation: 20,
          heat: -10,
          mediaPerception: 10,
          resultText: 'The league quietly thanks you. The ref is "reassigned."',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'decline_quietly',
        text: 'Decline and walk away',
        description: 'Not interested, not snitching.',
        buttonText: 'Walk Away',
        consequences: {
          reputation: 5,
          resultText: 'You forget the conversation ever happened.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'take_ref_deal',
        text: 'Make the payment',
        description: 'A few key calls could be the difference.',
        buttonText: 'Pay the Ref',
        slushFundCost: 250000,
        successRate: 65,
        consequences: {
          heat: 25,
          reputation: -15,
          resultText: 'Three crucial penalties go your way. Coincidence, obviously.',
        },
        failureConsequences: {
          heat: 60,
          reputation: -40,
          ownerPatience: -30,
          resultText: 'The ref got cold feet and confessed. Your name came up.',
        },
        requiresSlushFund: 250000,
        delayedConsequences: {
          type: 'INVESTIGATION',
          triggerWeek: 4,
          chance: 50,
          consequences: {
            heat: 30,
            resultText: 'The FBI is asking questions about game officiating.',
          },
          description: 'The feds track patterns in officiating...',
        },
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
    prerequisites: {
      maxHeat: 50,
      minSlushFund: 250000,
    },
    rarity: 'RARE',
    cooldownWeeks: 12,
    tags: ['SHADY', 'MONEY', 'CAREER_DEFINING'],
    urgency: 'LOW',
  },

  // --- PED Supplier ---
  {
    id: 'ped_supplier',
    category: 'CORRUPTION',
    character: 'FIXER',
    title: 'The Supplement Guy',
    headline: 'PERFORMANCE ENHANCEMENT OPPORTUNITY',
    description:
      'A "sports nutritionist" has a program. Undetectable, he claims. Your guys could add 10 lbs of muscle in 6 weeks.',
    flavorText: '"The Olympics use this testing. We\'re two generations ahead."',
    choices: [
      {
        id: 'report_ped_guy',
        text: 'Report to league security',
        description: 'These people prey on desperate athletes.',
        buttonText: 'Turn Him In',
        consequences: {
          reputation: 15,
          heat: -5,
          resultText: 'League security appreciates the tip. One less dealer.',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'decline_ped',
        text: 'Not interested',
        description: 'Too risky. Move on.',
        buttonText: 'Pass',
        consequences: {
          resultText: 'He leaves his card "just in case."',
        },
        tags: ['SAFE'],
      },
      {
        id: 'sign_up_ped',
        text: 'Sign up the whole D-line',
        description: 'Strength wins championships. Science helps.',
        buttonText: 'Juice Up',
        slushFundCost: 200000,
        successRate: 70,
        consequences: {
          heat: 20,
          reputation: -15,
          playerEffects: [
            {
              playerId: 'INVOLVED',
              effect: { type: 'BOOST', stat: 'strength', amount: 12, weeks: 8 },
            },
          ],
          resultText: 'Your defensive line is suddenly dominating. Coincidence.',
        },
        failureConsequences: {
          heat: 45,
          reputation: -30,
          suspensionWeeks: 2,
          resultText: 'Random drug test. Positive result. League issues two-game suspension.',
        },
        requiresSlushFund: 200000,
        delayedConsequences: {
          type: 'INVESTIGATION',
          triggerWeek: 5,
          chance: 35,
          consequences: {
            heat: 25,
            resultText: 'League noticed the sudden "improvement." Testing intensifies.',
          },
          description: 'Rapid improvement raises eyebrows...',
        },
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
    prerequisites: {
      maxHeat: 55,
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 8,
    tags: ['SHADY', 'PLAYER_HEALTH'],
    urgency: 'LOW',
  },

  // --- Stolen Playbook ---
  {
    id: 'stolen_playbook',
    category: 'CORRUPTION',
    character: 'FIXER',
    title: 'Enemy Intel',
    headline: 'COMPETITIVE ADVANTAGE AVAILABLE',
    description:
      'An "associate" has obtained next week\'s opponent\'s complete playbook. Signals, audibles, everything.',
    flavorText: '"Their video guy has gambling debts. Funny how that works."',
    choices: [
      {
        id: 'refuse_playbook',
        text: 'Not interested',
        description: 'You\'ll beat them the right way.',
        buttonText: 'Decline',
        consequences: {
          reputation: 10,
          resultText: 'You\'ll prepare the old-fashioned way.',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'buy_playbook',
        text: 'Buy the playbook',
        description: 'Information is power. Use it.',
        buttonText: 'Buy Intel',
        slushFundCost: 100000,
        consequences: {
          heat: 15,
          reputation: -10,
          resultText: 'You know every play they\'ll run. Your DC is thrilled.',
        },
        delayedConsequences: {
          type: 'WITNESS',
          triggerWeek: 6,
          chance: 25,
          consequences: {
            heat: 30,
            resultText: 'The video guy got arrested. He\'s talking to cut a deal.',
          },
          description: 'Loose ends have a way of unraveling...',
        },
        requiresSlushFund: 100000,
        tags: ['SHADY', 'RISKY'],
      },
      {
        id: 'report_playbook',
        text: 'Report to the league',
        description: 'This is serious cheating. Shut it down.',
        buttonText: 'Report',
        consequences: {
          reputation: 20,
          mediaPerception: 10,
          heat: -5,
          resultText: 'League investigates. You\'re praised for integrity.',
        },
        tags: ['MORAL', 'SAFE'],
      },
    ],
    prerequisites: {
      maxHeat: 60,
    },
    rarity: 'RARE',
    cooldownWeeks: 10,
    tags: ['SHADY'],
    urgency: 'LOW',
  },

  // --- Agent Kickback ---
  {
    id: 'agent_kickback',
    category: 'CORRUPTION',
    character: 'AGENT',
    title: 'The Side Deal',
    headline: 'MUTUAL BENEFIT ARRANGEMENT',
    description:
      'A prominent agent wants to "take care of you" if his clients get preferential treatment in contract negotiations.',
    flavorText: '"Think of it as a consulting fee. Totally legal. Mostly."',
    choices: [
      {
        id: 'reject_kickback',
        text: 'Absolutely not',
        description: 'This is blatant corruption.',
        buttonText: 'Reject',
        consequences: {
          reputation: 15,
          resultText: 'You tell him where he can shove his "consulting fee."',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'accept_kickback',
        text: 'Take the arrangement',
        description: 'Everyone does it. You\'d be stupid not to.',
        buttonText: 'Accept',
        consequences: {
          slushFund: 150000,
          heat: 15,
          reputation: -10,
          resultText: 'First payment arrives in a shopping bag. Classy.',
        },
        delayedConsequences: {
          type: 'AUDIT',
          triggerWeek: 8,
          chance: 30,
          consequences: {
            heat: 25,
            resultText: 'The NFLPA is auditing agent relationships. Awkward.',
          },
          description: 'Money trails can be traced...',
        },
        tags: ['SHADY'],
      },
    ],
    prerequisites: {
      minHeat: 10,
      maxHeat: 50,
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 12,
    tags: ['SHADY', 'MONEY'],
    urgency: 'LOW',
  },

  // --- Evidence Destruction ---
  {
    id: 'destroy_evidence',
    category: 'CORRUPTION',
    character: 'LAWYER',
    title: 'The Documents',
    headline: 'SENSITIVE MATERIALS',
    description:
      'Your lawyer calls. Some documents from a previous... situation... need to "disappear" before the league audit next month.',
    flavorText: '"Shredding is so 90s. We use thermite now."',
    choices: [
      {
        id: 'keep_documents',
        text: 'Keep everything',
        description: 'Destroying evidence is a crime.',
        buttonText: 'Keep Records',
        consequences: {
          reputation: 5,
          resultText: 'You\'ll face whatever comes with clean hands. Probably.',
        },
        tags: ['MORAL'],
      },
      {
        id: 'destroy_documents',
        text: 'Make them disappear',
        description: 'What documents?',
        buttonText: 'Burn It',
        slushFundCost: 50000,
        successRate: 80,
        consequences: {
          heat: -15,
          reputation: -5,
          resultText: 'The audit finds nothing. Because there\'s nothing to find.',
        },
        failureConsequences: {
          heat: 40,
          reputation: -25,
          resultText: 'The backup server they forgot about. The cover-up is always worse.',
        },
        requiresSlushFund: 50000,
        tags: ['SHADY', 'RISKY'],
      },
    ],
    prerequisites: {
      minHeat: 25,
    },
    rarity: 'RARE',
    cooldownWeeks: 15,
    tags: ['SHADY', 'LEGAL'],
    urgency: 'MEDIUM',
  },
];

// =============================================================================
// OWNER DEMAND EVENTS
// =============================================================================

export const OWNER_DEMAND_EVENTS: GameEvent[] = [
  // --- Win Now Pressure ---
  {
    id: 'owner_win_now',
    category: 'OWNER_DEMAND',
    character: 'OWNER',
    title: 'The Ultimatum',
    headline: 'OWNER DEMANDS RESULTS',
    description:
      'The owner called you into their office. "I didn\'t buy this team to lose. I need playoffs this year or we\'re making changes."',
    flavorText: 'The "changes" clearly include you.',
    choices: [
      {
        id: 'accept_pressure',
        text: 'Understood, boss',
        description: 'You\'ll make it happen. Somehow.',
        buttonText: 'Accept',
        consequences: {
          ownerPatience: 10,
          playerMorale: -5,
          resultText: 'The pressure is on. Everyone feels it.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'push_back',
        text: 'We need more time',
        description: 'Rome wasn\'t built in a day.',
        buttonText: 'Push Back',
        consequences: {
          ownerPatience: -15,
          reputation: 5,
          resultText: 'They didn\'t like hearing that. Your seat just got hotter.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'promise_playoffs',
        text: 'Playoffs guaranteed',
        description: 'Tell them what they want to hear.',
        buttonText: 'Promise',
        consequences: {
          ownerPatience: 20,
          resultText: 'They\'re happy. Now you just have to deliver.',
        },
        delayedConsequences: {
          type: 'REVENGE',
          triggerWeek: 12,
          chance: 100,
          consequences: {
            ownerPatience: -30,
            resultText: 'They remembered your promise. Did you deliver?',
          },
          description: 'Promises have consequences...',
        },
        tags: ['RISKY'],
      },
    ],
    prerequisites: {
      maxOwnerPatience: 60,
      minWeek: 4,
    },
    rarity: 'COMMON',
    cooldownWeeks: 6,
    tags: ['OWNER_INVOLVED', 'CAREER_DEFINING'],
    urgency: 'HIGH',
  },

  // --- Nepotism Hire ---
  {
    id: 'owner_nephew',
    category: 'OWNER_DEMAND',
    character: 'OWNER',
    title: 'The Nephew',
    headline: 'FAMILY BUSINESS',
    description:
      'The owner wants you to hire their nephew as "Director of Player Development." He has zero experience but "really knows football."',
    flavorText: 'His qualifications include owning a fantasy team and watching Hard Knocks.',
    choices: [
      {
        id: 'hire_nephew',
        text: 'Welcome aboard',
        description: 'Pick your battles. This isn\'t one.',
        buttonText: 'Hire Him',
        consequences: {
          ownerPatience: 15,
          playerMorale: -10,
          reputation: -5,
          resultText: 'The nephew starts Monday. Players already hate him.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'refuse_nephew',
        text: 'I can\'t do that',
        description: 'Merit matters. Stand your ground.',
        buttonText: 'Refuse',
        consequences: {
          ownerPatience: -25,
          reputation: 15,
          playerMorale: 5,
          resultText: 'They\'re furious, but the locker room respects you.',
        },
        tags: ['MORAL', 'RISKY'],
      },
      {
        id: 'fake_job',
        text: 'Create a fake position',
        description: '"Special Consultant" with no actual duties.',
        buttonText: 'Compromise',
        moneyCost: 100000,
        consequences: {
          ownerPatience: 10,
          reputation: -5,
          resultText: 'Everyone\'s happy. He has a parking spot and nothing to do.',
        },
        tags: ['EXPENSIVE'],
      },
    ],
    rarity: 'UNCOMMON',
    cooldownWeeks: 20,
    tags: ['OWNER_INVOLVED'],
    urgency: 'MEDIUM',
  },

  // --- Fire the Coordinator ---
  {
    id: 'owner_fire_staff',
    category: 'OWNER_DEMAND',
    character: 'OWNER',
    title: 'Scapegoat Needed',
    headline: 'OWNER WANTS CHANGES',
    description:
      'After the last loss, the owner wants "accountability." Translation: fire your offensive coordinator to take heat off the organization.',
    flavorText: '"The fans need to see action. Fire somebody."',
    choices: [
      {
        id: 'fire_oc',
        text: 'Fire the OC',
        description: 'Sacrifice a pawn to save the king.',
        buttonText: 'Fire Him',
        consequences: {
          ownerPatience: 15,
          playerMorale: -15,
          fanApproval: 10,
          resultText: 'Press conference scheduled. He never saw it coming.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'refuse_fire',
        text: 'Stand by your staff',
        description: 'Loyalty matters. You won\'t throw him under the bus.',
        buttonText: 'Refuse',
        consequences: {
          ownerPatience: -20,
          playerMorale: 10,
          reputation: 10,
          resultText: 'Your coaches know you have their backs. The owner doesn\'t.',
        },
        tags: ['MORAL', 'RISKY'],
      },
      {
        id: 'demote_oc',
        text: 'Demote him instead',
        description: '"Assistant to the Offensive Coordinator."',
        buttonText: 'Demote',
        consequences: {
          ownerPatience: 5,
          playerMorale: -5,
          resultText: 'A middle ground nobody\'s happy with.',
        },
        tags: ['SAFE'],
      },
    ],
    prerequisites: {
      afterLoss: true,
      requiresLossStreak: 2,
    },
    rarity: 'COMMON',
    cooldownWeeks: 8,
    tags: ['OWNER_INVOLVED', 'MORALE'],
    urgency: 'HIGH',
  },

  // --- Tank Request ---
  {
    id: 'owner_tank',
    category: 'OWNER_DEMAND',
    character: 'OWNER',
    title: 'Strategic Losing',
    headline: 'OWNER WANTS TOP DRAFT PICK',
    description:
      'The owner pulls you aside. "The season\'s lost anyway. Let\'s secure that #1 pick. Rest the starters, play the backups."',
    flavorText: '"Think of it as investing in the future."',
    choices: [
      {
        id: 'agree_tank',
        text: 'You\'re right, let\'s tank',
        description: 'Business is business.',
        buttonText: 'Tank',
        consequences: {
          ownerPatience: 20,
          playerMorale: -25,
          reputation: -20,
          fanApproval: -15,
          resultText: 'Starters benched. Media is asking questions. Fans are furious.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'refuse_tank',
        text: 'We play to win',
        description: 'You can\'t ask players to lose on purpose.',
        buttonText: 'Refuse',
        consequences: {
          ownerPatience: -20,
          playerMorale: 15,
          reputation: 15,
          resultText: 'The locker room loves it. The owner is "disappointed."',
        },
        tags: ['MORAL', 'RISKY'],
      },
      {
        id: 'subtle_tank',
        text: 'Be subtle about it',
        description: '"Rest" key players. Conservative playcalling. Nobody can prove anything.',
        buttonText: 'Quietly Tank',
        consequences: {
          ownerPatience: 15,
          playerMorale: -10,
          heat: 10,
          resultText: 'The losses pile up. Sports talk radio has theories.',
        },
        tags: ['SHADY', 'RISKY'],
      },
    ],
    prerequisites: {
      minWeek: 10,
      maxWins: 3,
    },
    rarity: 'RARE',
    cooldownWeeks: 20,
    tags: ['OWNER_INVOLVED', 'SHADY', 'CAREER_DEFINING'],
    urgency: 'MEDIUM',
  },
];

// =============================================================================
// MEDIA/PR EVENTS
// =============================================================================

export const MEDIA_EVENTS: GameEvent[] = [
  // --- Hostile Interview ---
  {
    id: 'hostile_interview',
    category: 'MEDIA',
    character: 'REPORTER',
    title: 'The Ambush Interview',
    headline: 'REPORTER ASKS TOUGH QUESTIONS',
    description:
      'At your weekly presser, a reporter asks: "Sources say there\'s a culture problem in your locker room. Players feel ignored. Comment?"',
    flavorText: 'The cameras zoom in. Everyone\'s waiting.',
    choices: [
      {
        id: 'deny_problem',
        text: '"Completely false"',
        description: 'Shut it down. Next question.',
        buttonText: 'Deny',
        consequences: {
          mediaPerception: -5,
          resultText: 'The denial might work. Or fuel the fire.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'deflect_humor',
        text: 'Deflect with humor',
        description: '"Our only culture problem is nobody brought donuts this morning."',
        buttonText: 'Joke',
        consequences: {
          mediaPerception: 10,
          fanApproval: 5,
          resultText: 'The room laughs. You survived.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'attack_reporter',
        text: 'Attack the reporter',
        description: '"Who\'s your source? Print it. We\'ll sue."',
        buttonText: 'Attack',
        consequences: {
          mediaPerception: -20,
          reputation: 5,
          resultText: 'Aggressive. The reporter backs down, but they won\'t forget.',
        },
        delayedConsequences: {
          type: 'EXPOSE',
          triggerWeek: 3,
          chance: 30,
          consequences: {
            mediaPerception: -25,
            resultText: 'That reporter just published a hit piece.',
          },
          description: 'Reporters hold grudges...',
        },
        tags: ['RISKY'],
      },
      {
        id: 'acknowledge_issue',
        text: 'Acknowledge room for improvement',
        description: 'Honesty might be refreshing.',
        buttonText: 'Be Honest',
        consequences: {
          mediaPerception: 15,
          reputation: 5,
          playerMorale: 5,
          resultText: 'Refreshingly honest. The narrative shifts to "coach gets it."',
        },
        tags: ['MORAL'],
      },
    ],
    rarity: 'COMMON',
    cooldownWeeks: 3,
    tags: ['MEDIA_CIRCUS'],
    urgency: 'MEDIUM',
  },

  // --- Charity Opportunity ---
  {
    id: 'charity_event',
    category: 'MEDIA',
    character: 'REPORTER',
    title: 'Charity Opportunity',
    headline: 'LOCAL CHILDREN\'S HOSPITAL REQUESTS VISIT',
    description:
      'The children\'s hospital wants your team to visit sick kids. Great PR, but it\'s your only day off this week.',
    flavorText: 'Sometimes the right choice is also the smart choice.',
    choices: [
      {
        id: 'attend_charity',
        text: 'We\'ll be there',
        description: 'The team shows up. Do some good.',
        buttonText: 'Attend',
        consequences: {
          mediaPerception: 20,
          fanApproval: 15,
          playerMorale: 10,
          resultText: 'The photos go viral. Everyone feels good.',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'skip_charity',
        text: 'We need the rest',
        description: 'The schedule is brutal. Focus on football.',
        buttonText: 'Decline',
        consequences: {
          mediaPerception: -10,
          fanApproval: -5,
          resultText: 'Bad optics. "Team too busy to visit sick kids."',
        },
        tags: ['RISKY'],
      },
      {
        id: 'send_backups',
        text: 'Send the practice squad',
        description: 'Check the box without exhausting starters.',
        buttonText: 'Send Backups',
        consequences: {
          mediaPerception: 5,
          resultText: 'The kids are happy. Nobody noticed the stars weren\'t there.',
        },
        tags: ['SAFE'],
      },
    ],
    rarity: 'COMMON',
    cooldownWeeks: 5,
    tags: ['MEDIA_CIRCUS'],
    urgency: 'LOW',
  },

  // --- Breaking Scandal ---
  {
    id: 'scandal_breaking',
    category: 'MEDIA',
    character: 'REPORTER',
    title: 'Story Breaking',
    headline: 'INVESTIGATIVE REPORTER WORKING ON PIECE',
    description:
      'A respected journalist is working on a piece about "misconduct in your organization." She wants an interview.',
    flavorText: 'She\'s won Pulitzers. This isn\'t good.',
    choices: [
      {
        id: 'do_interview',
        text: 'Agree to interview',
        description: 'Transparency might help. Or give her ammo.',
        buttonText: 'Interview',
        successRate: 50,
        consequences: {
          mediaPerception: 10,
          heat: -5,
          resultText: 'You came across well. The piece is balanced.',
        },
        failureConsequences: {
          mediaPerception: -20,
          heat: 15,
          resultText: 'Every answer was twisted. You look guilty.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'decline_interview',
        text: 'Decline politely',
        description: '"We have no comment at this time."',
        buttonText: 'Decline',
        consequences: {
          mediaPerception: -10,
          resultText: 'The piece runs anyway. "Organization refused to comment."',
        },
        tags: ['SAFE'],
      },
      {
        id: 'kill_story',
        text: 'Call in favors to kill it',
        description: 'You know people at her network.',
        buttonText: 'Kill Story',
        slushFundCost: 200000,
        successRate: 70,
        consequences: {
          heat: 10,
          resultText: 'She\'s been "reassigned to other projects."',
        },
        failureConsequences: {
          heat: 35,
          mediaPerception: -30,
          resultText: 'She found out you tried to kill it. Now it\'s personal.',
        },
        requiresSlushFund: 200000,
        tags: ['SHADY', 'EXPENSIVE', 'RISKY'],
      },
    ],
    prerequisites: {
      minHeat: 15,
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 8,
    tags: ['MEDIA_CIRCUS', 'CAREER_DEFINING'],
    urgency: 'HIGH',
  },

  // --- Podcast Invite ---
  {
    id: 'podcast_invite',
    category: 'MEDIA',
    character: 'REPORTER',
    title: 'The Hot Seat Podcast',
    headline: 'POPULAR PODCAST REQUESTS INTERVIEW',
    description:
      'The biggest sports podcast wants you on. Huge exposure, but they\'re known for gotcha questions.',
    flavorText: '"Our last guest cried. Great content."',
    choices: [
      {
        id: 'accept_podcast',
        text: 'Book me',
        description: 'High risk, high reward. Show some personality.',
        buttonText: 'Accept',
        successRate: 60,
        consequences: {
          mediaPerception: 25,
          fanApproval: 15,
          resultText: 'You went viral for the right reasons. New fans.',
        },
        failureConsequences: {
          mediaPerception: -15,
          fanApproval: -10,
          resultText: 'That clip is being memed to death.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'decline_podcast',
        text: 'Not my style',
        description: 'Stick to traditional media.',
        buttonText: 'Decline',
        consequences: {
          resultText: 'They make fun of you for declining. Briefly.',
        },
        tags: ['SAFE'],
      },
    ],
    rarity: 'UNCOMMON',
    cooldownWeeks: 10,
    tags: ['MEDIA_CIRCUS'],
    urgency: 'LOW',
  },
];

// =============================================================================
// LEAGUE ACTION EVENTS
// =============================================================================

export const LEAGUE_EVENTS: GameEvent[] = [
  // --- Random Drug Test ---
  {
    id: 'random_drug_test',
    category: 'LEAGUE_ACTION',
    character: 'LEAGUE_OFFICIAL',
    title: 'Surprise Inspection',
    headline: 'LEAGUE ANNOUNCES RANDOM TESTING',
    description:
      'League officials are here for "routine random testing." They seem very interested in your training facility.',
    flavorText: '"Random." Sure.',
    choices: [
      {
        id: 'full_cooperation',
        text: 'Full cooperation',
        description: 'Nothing to hide. Let them look.',
        buttonText: 'Cooperate',
        successRate: 85,
        consequences: {
          reputation: 10,
          resultText: 'All clear. They found nothing.',
        },
        failureConsequences: {
          heat: 25,
          suspensionWeeks: 2,
          resultText: 'One positive test. League is investigating further.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'delay_testing',
        text: 'Stall for time',
        description: '"Our facilities are being cleaned. Can you come back tomorrow?"',
        buttonText: 'Stall',
        consequences: {
          heat: 15,
          reputation: -10,
          resultText: 'They\'re suspicious but agreed to return.',
        },
        tags: ['SHADY', 'RISKY'],
      },
    ],
    rarity: 'UNCOMMON',
    cooldownWeeks: 8,
    tags: ['LEGAL'],
    urgency: 'HIGH',
  },

  // --- Salary Cap Audit ---
  {
    id: 'cap_audit',
    category: 'LEAGUE_ACTION',
    character: 'LEAGUE_OFFICIAL',
    title: 'Cap Compliance Review',
    headline: 'LEAGUE AUDITING SALARY CAP',
    description:
      'The league wants to review your salary cap compliance. There may be some... creative accounting... in your books.',
    flavorText: 'Accountants: the real power in professional sports.',
    choices: [
      {
        id: 'clean_books',
        text: 'Our books are clean',
        description: 'Let them audit. Nothing to worry about.',
        buttonText: 'Open Books',
        successRate: 75,
        consequences: {
          reputation: 5,
          resultText: 'Audit complete. No violations found.',
        },
        failureConsequences: {
          heat: 20,
          fineAmount: 500000,
          resultText: 'Minor violations found. Fine incoming.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'creative_accounting',
        text: 'Adjust the books first',
        description: 'Some line items need to be... reclassified.',
        buttonText: 'Cook Books',
        slushFundCost: 100000,
        successRate: 65,
        consequences: {
          heat: 10,
          resultText: 'The audit found nothing unusual.',
        },
        failureConsequences: {
          heat: 40,
          fineAmount: 2000000,
          resultText: 'They found the discrepancies. Massive fine incoming.',
        },
        requiresSlushFund: 100000,
        tags: ['SHADY', 'RISKY'],
      },
    ],
    prerequisites: {
      minHeat: 10,
    },
    rarity: 'RARE',
    cooldownWeeks: 15,
    tags: ['MONEY', 'LEGAL'],
    urgency: 'HIGH',
  },

  // --- Investigation Update ---
  {
    id: 'investigation_update',
    category: 'LEAGUE_ACTION',
    character: 'DETECTIVE',
    title: 'Investigation Progress',
    headline: 'INVESTIGATORS REQUEST MEETING',
    description:
      'The federal investigators want to meet. They say it\'s "routine," but their tone suggests otherwise.',
    flavorText: 'When the FBI calls, you don\'t ignore it.',
    choices: [
      {
        id: 'meet_alone',
        text: 'Meet them alone',
        description: 'Show good faith. Innocent people have nothing to hide.',
        buttonText: 'Meet Alone',
        successRate: 40,
        consequences: {
          heat: -10,
          reputation: 10,
          resultText: 'The meeting went well. They seemed satisfied.',
        },
        failureConsequences: {
          heat: 25,
          resultText: 'You said too much. They\'re coming back with more questions.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'bring_lawyer',
        text: 'Bring your lawyer',
        description: 'Standard procedure. Answer nothing directly.',
        buttonText: 'Lawyer Up',
        moneyCost: 50000,
        consequences: {
          heat: 5,
          resultText: 'Your lawyer did the talking. Nothing revealed.',
        },
        tags: ['SAFE', 'EXPENSIVE'],
      },
      {
        id: 'refuse_meeting',
        text: 'Decline the meeting',
        description: '"Contact our legal team."',
        buttonText: 'Refuse',
        consequences: {
          heat: 20,
          reputation: -10,
          resultText: 'They\'ll be back. With subpoenas.',
        },
        tags: ['RISKY'],
      },
    ],
    prerequisites: {
      minHeat: 40,
    },
    rarity: 'RARE',
    cooldownWeeks: 10,
    tags: ['LEGAL', 'CAREER_DEFINING'],
    urgency: 'CRITICAL',
  },
];

// =============================================================================
// OPPORTUNITY EVENTS
// =============================================================================

export const OPPORTUNITY_EVENTS: GameEvent[] = [
  // --- Endorsement Deal ---
  {
    id: 'endorsement_deal',
    category: 'OPPORTUNITY',
    character: 'AGENT',
    title: 'Big Endorsement',
    headline: 'MAJOR BRAND WANTS YOUR STAR',
    description:
      'A major sports brand wants your {position} for a national campaign. Big money, but lots of media obligations.',
    flavorText: '"The commercial involves him catching footballs while jetskiing. Very classy."',
    choices: [
      {
        id: 'approve_deal',
        text: 'Approve the deal',
        description: 'Happy player, good PR. What\'s not to like?',
        buttonText: 'Approve',
        consequences: {
          playerMorale: 15,
          mediaPerception: 10,
          fanApproval: 10,
          resultText: 'The commercial is everywhere. Your player is thrilled.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'block_deal',
        text: 'Block it - too distracting',
        description: 'Focus on football, not commercials.',
        buttonText: 'Block',
        consequences: {
          playerMorale: -20,
          reputation: 5,
          resultText: 'He\'s furious. But he\'s focused.',
        },
        tags: ['RISKY'],
      },
      {
        id: 'negotiate_cut',
        text: 'Negotiate a team cut',
        description: '"The organization should benefit too."',
        buttonText: 'Take Cut',
        consequences: {
          slushFund: 100000,
          playerMorale: -5,
          resultText: 'You got a piece. He\'s slightly annoyed but deals with it.',
        },
        tags: ['MONEY'],
      },
    ],
    prerequisites: {
      minWins: 4,
    },
    rarity: 'UNCOMMON',
    cooldownWeeks: 10,
    tags: ['MONEY', 'MORALE'],
    urgency: 'LOW',
  },

  // --- Trade Opportunity ---
  {
    id: 'trade_opportunity',
    category: 'OPPORTUNITY',
    character: 'AGENT',
    title: 'Trade Offer',
    headline: 'RIVAL GM ON LINE ONE',
    description:
      'A contending team wants your veteran {position}. They\'re offering a first-round pick and a solid backup.',
    flavorText: '"He says you owe him from that thing in Cleveland."',
    choices: [
      {
        id: 'accept_trade',
        text: 'Make the trade',
        description: 'Build for the future. A first-rounder has value.',
        buttonText: 'Trade',
        consequences: {
          reputation: 5,
          playerMorale: -10,
          slushFund: 50000,
          resultText: 'Trade processed. Your locker room is mixed on the move.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'reject_trade',
        text: 'We\'re not sellers',
        description: 'Keep the team together. Win now.',
        buttonText: 'Reject',
        consequences: {
          playerMorale: 10,
          resultText: 'The team appreciates your loyalty.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'demand_more',
        text: 'Ask for more',
        description: '"Add a second-rounder and we\'ll talk."',
        buttonText: 'Counter',
        successRate: 50,
        consequences: {
          slushFund: 75000,
          reputation: 5,
          resultText: 'They bit. Better deal secured.',
        },
        failureConsequences: {
          resultText: 'They walked. No trade.',
        },
        tags: ['RISKY'],
      },
    ],
    rarity: 'UNCOMMON',
    cooldownWeeks: 6,
    tags: ['MONEY'],
    urgency: 'MEDIUM',
  },

  // --- Anonymous Donation ---
  {
    id: 'anonymous_donation',
    category: 'OPPORTUNITY',
    character: 'ANONYMOUS',
    title: 'Mystery Benefactor',
    headline: 'ANONYMOUS DONATION OFFERED',
    description:
      'An anonymous donor wants to contribute to your "special projects fund." No strings attached. Supposedly.',
    flavorText: '"They prefer to remain anonymous. Very anonymous."',
    choices: [
      {
        id: 'accept_donation',
        text: 'Accept graciously',
        description: 'Money is money. Don\'t ask questions.',
        buttonText: 'Accept',
        consequences: {
          slushFund: 300000,
          heat: 10,
          resultText: 'The money arrives in a duffel bag. Classy.',
        },
        delayedConsequences: {
          type: 'AUDIT',
          triggerWeek: 6,
          chance: 25,
          consequences: {
            heat: 20,
            resultText: 'The IRS has questions about your finances.',
          },
          description: 'Large cash donations raise questions...',
        },
        tags: ['MONEY', 'SHADY'],
      },
      {
        id: 'decline_donation',
        text: 'Thanks but no thanks',
        description: 'Anonymous money is always complicated.',
        buttonText: 'Decline',
        consequences: {
          reputation: 10,
          resultText: 'The mystery donor finds someone else.',
        },
        tags: ['MORAL', 'SAFE'],
      },
      {
        id: 'investigate_donor',
        text: 'Find out who they are first',
        description: 'Knowledge is power.',
        buttonText: 'Investigate',
        moneyCost: 25000,
        consequences: {
          resultText: 'It\'s a rival owner trying to set you up. Good instincts.',
        },
        tags: ['SAFE'],
      },
    ],
    prerequisites: {
      minHeat: 15,
    },
    rarity: 'RARE',
    cooldownWeeks: 15,
    tags: ['MONEY', 'SHADY'],
    urgency: 'LOW',
  },
];

// =============================================================================
// RANDOM/CHAOS EVENTS
// =============================================================================

export const RANDOM_EVENTS: GameEvent[] = [
  // --- Viral Moment ---
  {
    id: 'viral_moment',
    category: 'RANDOM',
    character: 'REPORTER',
    title: 'Unexpected Virality',
    headline: 'TEAM MOMENT GOES VIRAL',
    description:
      'A clip of your {position} doing something wholesome in practice is all over social media. Everyone loves it.',
    flavorText: 'He was just helping a ball boy. Now he has 2 million new followers.',
    choices: [
      {
        id: 'lean_into_viral',
        text: 'Lean into it',
        description: 'Schedule interviews, embrace the moment.',
        buttonText: 'Promote It',
        consequences: {
          mediaPerception: 20,
          fanApproval: 15,
          playerMorale: 5,
          resultText: 'The good vibes are everywhere. Marketing is thrilled.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'downplay_viral',
        text: 'Keep focus on football',
        description: 'Nice moment, but we have games to win.',
        buttonText: 'Move On',
        consequences: {
          reputation: 5,
          resultText: 'The story fades. Back to business.',
        },
        tags: ['SAFE'],
      },
    ],
    rarity: 'COMMON',
    cooldownWeeks: 8,
    tags: ['MEDIA_CIRCUS'],
    urgency: 'LOW',
  },

  // --- Weather Disaster ---
  {
    id: 'weather_disaster',
    category: 'RANDOM',
    character: 'ANONYMOUS',
    title: 'Facility Damage',
    headline: 'STORM DAMAGES PRACTICE FACILITY',
    description:
      'A freak storm hit your practice facility. Significant damage to the weight room and film areas.',
    flavorText: 'Insurance will cover most of it. Most.',
    choices: [
      {
        id: 'proper_repairs',
        text: 'Proper repairs',
        description: 'Do it right. Will take two weeks.',
        buttonText: 'Fix Right',
        moneyCost: 200000,
        consequences: {
          playerMorale: -5,
          resultText: 'Repairs underway. Practice moves to local high school.',
        },
        tags: ['EXPENSIVE', 'SAFE'],
      },
      {
        id: 'quick_fix',
        text: 'Quick patch job',
        description: 'Get back in there fast. Cut corners.',
        buttonText: 'Quick Fix',
        moneyCost: 50000,
        consequences: {
          playerMorale: -10,
          resultText: 'Back in business. Equipment is sketchy but functional.',
        },
        delayedConsequences: {
          type: 'LAWSUIT',
          triggerWeek: 4,
          chance: 20,
          consequences: {
            heat: 15,
            fineAmount: 300000,
            resultText: 'Player injured on faulty equipment. Lawsuit filed.',
          },
          description: 'Cutting corners has consequences...',
        },
        tags: ['RISKY'],
      },
    ],
    rarity: 'RARE',
    cooldownWeeks: 20,
    tags: ['MONEY'],
    urgency: 'HIGH',
  },

  // --- Celebrity Fan ---
  {
    id: 'celebrity_fan',
    category: 'RANDOM',
    character: 'ANONYMOUS',
    title: 'Famous Fan',
    headline: 'A-LIST CELEBRITY WANTS SIDELINE ACCESS',
    description:
      'A major celebrity wants to attend practice and stand on the sideline during the game. Great PR, potential distraction.',
    flavorText: '"They\'re definitely not here to recruit your QB for their movie."',
    choices: [
      {
        id: 'welcome_celebrity',
        text: 'Roll out the red carpet',
        description: 'The exposure could be worth it.',
        buttonText: 'Welcome',
        consequences: {
          mediaPerception: 15,
          fanApproval: 10,
          playerMorale: -5,
          resultText: 'The celebrity visit dominated coverage. Players were distracted.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'limit_access',
        text: 'Limited access only',
        description: 'Brief visit, no practice disruption.',
        buttonText: 'Limit',
        consequences: {
          mediaPerception: 10,
          resultText: 'Quick photo op. Everyone happy.',
        },
        tags: ['SAFE'],
      },
      {
        id: 'deny_celebrity',
        text: 'No distractions',
        description: 'This isn\'t Hollywood.',
        buttonText: 'Deny',
        consequences: {
          mediaPerception: -10,
          playerMorale: 5,
          resultText: 'Team focused. Celebrity tweets about being snubbed.',
        },
        tags: ['RISKY'],
      },
    ],
    rarity: 'UNCOMMON',
    cooldownWeeks: 12,
    tags: ['MEDIA_CIRCUS'],
    urgency: 'LOW',
  },
];

// =============================================================================
// ALL EVENTS COMBINED
// =============================================================================

export const ALL_EVENT_TEMPLATES: GameEvent[] = [
  ...PLAYER_INCIDENT_EVENTS,
  ...CORRUPTION_EVENTS,
  ...OWNER_DEMAND_EVENTS,
  ...MEDIA_EVENTS,
  ...LEAGUE_EVENTS,
  ...OPPORTUNITY_EVENTS,
  ...RANDOM_EVENTS,
];

// =============================================================================
// EVENT LOOKUP HELPERS
// =============================================================================

export function getEventById(id: string): GameEvent | undefined {
  return ALL_EVENT_TEMPLATES.find(e => e.id === id);
}

export function getEventsByCategory(category: EventCategory): GameEvent[] {
  return ALL_EVENT_TEMPLATES.filter(e => e.category === category);
}

export function getEventsByRarity(rarity: EventRarity): GameEvent[] {
  return ALL_EVENT_TEMPLATES.filter(e => e.rarity === rarity);
}

export function getEventsByTag(tag: EventTag): GameEvent[] {
  return ALL_EVENT_TEMPLATES.filter(e => e.tags.includes(tag));
}

export default ALL_EVENT_TEMPLATES;
