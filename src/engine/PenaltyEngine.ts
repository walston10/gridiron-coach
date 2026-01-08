// Penalty system for football simulation

export type PenaltyType =
  | 'HOLDING_OFFENSE'
  | 'HOLDING_DEFENSE'
  | 'FALSE_START'
  | 'OFFSIDES'
  | 'ENCROACHMENT'
  | 'PASS_INTERFERENCE_OFFENSE'
  | 'PASS_INTERFERENCE_DEFENSE'
  | 'ILLEGAL_CONTACT'
  | 'ROUGHING_THE_PASSER'
  | 'UNNECESSARY_ROUGHNESS'
  | 'FACEMASK'
  | 'DELAY_OF_GAME'
  | 'ILLEGAL_FORMATION'
  | 'ILLEGAL_MOTION'
  | 'INTENTIONAL_GROUNDING'
  | 'INELIGIBLE_RECEIVER';

export interface Penalty {
  type: PenaltyType;
  team: 'offense' | 'defense';
  yards: number;
  automatic_first_down: boolean;
  loss_of_down: boolean;
  spot_foul: boolean;           // Penalty enforced from spot of foul
  description: string;
}

export interface PenaltyResult {
  penalty: Penalty;
  accepted: boolean;
  newYardLine: number;
  newDown: 1 | 2 | 3 | 4;
  newYardsToGo: number;
  declined: boolean;
}

// Penalty definitions
const PENALTY_DEFS: Record<PenaltyType, Omit<Penalty, 'type'>> = {
  HOLDING_OFFENSE: {
    team: 'offense',
    yards: 10,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'Offensive Holding',
  },
  HOLDING_DEFENSE: {
    team: 'defense',
    yards: 5,
    automatic_first_down: true,
    loss_of_down: false,
    spot_foul: false,
    description: 'Defensive Holding',
  },
  FALSE_START: {
    team: 'offense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'False Start',
  },
  OFFSIDES: {
    team: 'defense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'Offsides',
  },
  ENCROACHMENT: {
    team: 'defense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'Encroachment',
  },
  PASS_INTERFERENCE_OFFENSE: {
    team: 'offense',
    yards: 10,
    automatic_first_down: false,
    loss_of_down: true,
    spot_foul: false,
    description: 'Offensive Pass Interference',
  },
  PASS_INTERFERENCE_DEFENSE: {
    team: 'defense',
    yards: 0,  // Spot foul
    automatic_first_down: true,
    loss_of_down: false,
    spot_foul: true,
    description: 'Defensive Pass Interference',
  },
  ILLEGAL_CONTACT: {
    team: 'defense',
    yards: 5,
    automatic_first_down: true,
    loss_of_down: false,
    spot_foul: false,
    description: 'Illegal Contact',
  },
  ROUGHING_THE_PASSER: {
    team: 'defense',
    yards: 15,
    automatic_first_down: true,
    loss_of_down: false,
    spot_foul: false,
    description: 'Roughing the Passer',
  },
  UNNECESSARY_ROUGHNESS: {
    team: 'defense',
    yards: 15,
    automatic_first_down: true,
    loss_of_down: false,
    spot_foul: false,
    description: 'Unnecessary Roughness',
  },
  FACEMASK: {
    team: 'defense',
    yards: 15,
    automatic_first_down: true,
    loss_of_down: false,
    spot_foul: false,
    description: 'Facemask',
  },
  DELAY_OF_GAME: {
    team: 'offense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'Delay of Game',
  },
  ILLEGAL_FORMATION: {
    team: 'offense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'Illegal Formation',
  },
  ILLEGAL_MOTION: {
    team: 'offense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: false,
    spot_foul: false,
    description: 'Illegal Motion',
  },
  INTENTIONAL_GROUNDING: {
    team: 'offense',
    yards: 10,
    automatic_first_down: false,
    loss_of_down: true,
    spot_foul: true,
    description: 'Intentional Grounding',
  },
  INELIGIBLE_RECEIVER: {
    team: 'offense',
    yards: 5,
    automatic_first_down: false,
    loss_of_down: true,
    spot_foul: false,
    description: 'Ineligible Receiver Downfield',
  },
};

// Probability weights for different penalty types
interface PenaltyOdds {
  type: PenaltyType;
  baseChance: number;  // Per-play chance (0-1)
  situational: {
    passingPlay?: number;   // Multiplier for pass plays
    runningPlay?: number;   // Multiplier for run plays
    longYardage?: number;   // Multiplier for 3rd & long
    redZone?: number;       // Multiplier in red zone
  };
}

const PENALTY_ODDS: PenaltyOdds[] = [
  // Offensive penalties
  { type: 'HOLDING_OFFENSE', baseChance: 0.04, situational: { passingPlay: 1.3, runningPlay: 0.8, longYardage: 1.2 } },
  { type: 'FALSE_START', baseChance: 0.015, situational: { longYardage: 1.5 } },
  { type: 'PASS_INTERFERENCE_OFFENSE', baseChance: 0.005, situational: { passingPlay: 2.0 } },
  { type: 'ILLEGAL_FORMATION', baseChance: 0.005, situational: {} },
  { type: 'INTENTIONAL_GROUNDING', baseChance: 0.008, situational: { passingPlay: 2.0, longYardage: 1.5 } },

  // Defensive penalties
  { type: 'HOLDING_DEFENSE', baseChance: 0.02, situational: { passingPlay: 1.5, longYardage: 1.3 } },
  { type: 'OFFSIDES', baseChance: 0.02, situational: { longYardage: 0.7 } },
  { type: 'PASS_INTERFERENCE_DEFENSE', baseChance: 0.025, situational: { passingPlay: 2.0, longYardage: 1.5 } },
  { type: 'ILLEGAL_CONTACT', baseChance: 0.01, situational: { passingPlay: 2.0 } },
  { type: 'ROUGHING_THE_PASSER', baseChance: 0.008, situational: { passingPlay: 2.0 } },
  { type: 'FACEMASK', baseChance: 0.01, situational: { runningPlay: 1.5 } },
  { type: 'UNNECESSARY_ROUGHNESS', baseChance: 0.005, situational: {} },
];

export interface PlayContext {
  playType: 'PASS' | 'RUN' | 'SCREEN' | 'PLAY_ACTION';
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  yardLine: number;
  passInAir: boolean;
  qbSacked: boolean;
  qbScrambling: boolean;
  passLocation?: { x: number; y: number };
}

export class PenaltyEngine {
  private penaltyFrequency: number = 1.0;  // Multiplier for penalty rates

  constructor(frequency: number = 1.0) {
    this.penaltyFrequency = frequency;
  }

  // Check for pre-snap penalties (false start, delay of game, offsides, encroachment)
  checkPreSnapPenalty(): Penalty | null {
    const preSnapPenalties: PenaltyType[] = ['FALSE_START', 'OFFSIDES', 'ENCROACHMENT', 'DELAY_OF_GAME'];

    for (const type of preSnapPenalties) {
      const odds = PENALTY_ODDS.find(p => p.type === type);
      if (odds && Math.random() < odds.baseChance * this.penaltyFrequency) {
        return this.createPenalty(type);
      }
    }
    return null;
  }

  // Check for penalties during the play
  checkPlayPenalty(context: PlayContext): Penalty | null {
    const isPassPlay = context.playType === 'PASS' || context.playType === 'PLAY_ACTION' || context.playType === 'SCREEN';
    const isLongYardage = context.yardsToGo >= 7;
    const isRedZone = context.yardLine >= 80;

    for (const odds of PENALTY_ODDS) {
      // Skip pre-snap penalties
      if (['FALSE_START', 'OFFSIDES', 'ENCROACHMENT', 'DELAY_OF_GAME'].includes(odds.type)) {
        continue;
      }

      let chance = odds.baseChance * this.penaltyFrequency;

      // Apply situational modifiers
      if (isPassPlay && odds.situational.passingPlay) {
        chance *= odds.situational.passingPlay;
      }
      if (!isPassPlay && odds.situational.runningPlay) {
        chance *= odds.situational.runningPlay;
      }
      if (isLongYardage && odds.situational.longYardage) {
        chance *= odds.situational.longYardage;
      }
      if (isRedZone && odds.situational.redZone) {
        chance *= odds.situational.redZone;
      }

      // Pass-specific penalties only when ball is in air
      if (['PASS_INTERFERENCE_OFFENSE', 'PASS_INTERFERENCE_DEFENSE', 'ILLEGAL_CONTACT'].includes(odds.type)) {
        if (!context.passInAir) continue;
      }

      // Roughing the passer only when QB was hit
      if (odds.type === 'ROUGHING_THE_PASSER') {
        if (!context.qbSacked) continue;
      }

      // Intentional grounding specific conditions
      if (odds.type === 'INTENTIONAL_GROUNDING') {
        if (!context.qbScrambling) continue;
      }

      if (Math.random() < chance) {
        return this.createPenalty(odds.type);
      }
    }

    return null;
  }

  createPenalty(type: PenaltyType): Penalty {
    const def = PENALTY_DEFS[type];
    return {
      type,
      ...def,
    };
  }

  // Calculate the result of accepting a penalty
  calculatePenaltyResult(
    penalty: Penalty,
    currentYardLine: number,
    currentDown: 1 | 2 | 3 | 4,
    currentYardsToGo: number,
    _playYardsGained: number,
    spotOfFoul?: number
  ): PenaltyResult {
    let newYardLine = currentYardLine;
    let newDown = currentDown;
    let newYardsToGo = currentYardsToGo;

    if (penalty.team === 'offense') {
      // Penalty against offense - move ball back
      if (penalty.spot_foul && spotOfFoul !== undefined) {
        newYardLine = spotOfFoul - penalty.yards;
      } else {
        newYardLine = currentYardLine - penalty.yards;
      }

      // Can't go past own goal line (safety situation)
      if (newYardLine <= 0) {
        // Half the distance to the goal
        newYardLine = Math.max(1, Math.floor(currentYardLine / 2));
      }

      // Loss of down if applicable
      if (penalty.loss_of_down) {
        newDown = Math.min(currentDown + 1, 4) as 1 | 2 | 3 | 4;
      }

      // Yards to go increases
      newYardsToGo = currentYardsToGo + (currentYardLine - newYardLine);

    } else {
      // Penalty against defense - move ball forward
      if (penalty.spot_foul && spotOfFoul !== undefined) {
        newYardLine = spotOfFoul + penalty.yards;
      } else {
        newYardLine = currentYardLine + penalty.yards;
      }

      // Can't go past goal line
      if (newYardLine >= 100) {
        // Half the distance to the goal
        newYardLine = currentYardLine + Math.floor((100 - currentYardLine) / 2);
      }

      // Automatic first down
      if (penalty.automatic_first_down) {
        newDown = 1;
        newYardsToGo = Math.min(10, 100 - newYardLine);
      } else {
        // Reduce yards to go
        newYardsToGo = currentYardsToGo - (newYardLine - currentYardLine);
        if (newYardsToGo <= 0) {
          newDown = 1;
          newYardsToGo = Math.min(10, 100 - newYardLine);
        }
      }
    }

    return {
      penalty,
      accepted: true,
      newYardLine,
      newDown,
      newYardsToGo,
      declined: false,
    };
  }

  // Should the CPU decline this penalty?
  shouldDeclinePenalty(
    penalty: Penalty,
    playYardsGained: number,
    _currentYardLine: number,
    _currentDown: 1 | 2 | 3 | 4,
    currentYardsToGo: number,
    _isUserOffense: boolean
  ): boolean {
    // If play gained more yards than penalty would give, decline
    if (penalty.team === 'offense') {
      // Defense declining an offensive penalty
      // Decline if the offense lost yards or turnover anyway
      if (playYardsGained < 0) return true;
      // Accept if it's a significant penalty (10+ yards)
      if (penalty.yards >= 10) return false;
    } else {
      // Offense declining a defensive penalty
      // Decline if we got a first down or big gain
      const playGotFirstDown = playYardsGained >= currentYardsToGo;

      if (playGotFirstDown && playYardsGained > penalty.yards) {
        return true;
      }
    }

    return false;
  }

  setFrequency(frequency: number): void {
    this.penaltyFrequency = Math.max(0, Math.min(2, frequency));
  }
}

export const penaltyEngine = new PenaltyEngine();
