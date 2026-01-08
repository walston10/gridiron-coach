import type { FieldPosition, OffensivePlay, DefensivePlay } from '../types/GameSim';
import { OFFENSIVE_PLAYBOOK } from '../data/offensivePlaybook';
import { DEFENSIVE_PLAYBOOK } from '../data/defensivePlaybook';

export interface CPUPersonality {
  aggressiveness: number;  // 0-1: tendency to go for it on 4th, blitz, deep passes
  runPassRatio: number;    // 0-1: 0 = all run, 1 = all pass
  blitzRate: number;       // 0-1: how often to call blitzes
}

export const CPU_PERSONALITIES = {
  conservative: { aggressiveness: 0.2, runPassRatio: 0.4, blitzRate: 0.15 },
  balanced: { aggressiveness: 0.5, runPassRatio: 0.55, blitzRate: 0.25 },
  aggressive: { aggressiveness: 0.8, runPassRatio: 0.7, blitzRate: 0.4 },
};

interface SituationAnalysis {
  shortYardage: boolean;
  longYardage: boolean;
  redZone: boolean;
  goalLine: boolean;
  earlyDown: boolean;
  passingDown: boolean;
  desperate: boolean;
  trailing: boolean;
  winning: boolean;
  blowout: boolean;
  twoMinute: boolean;
  field: FieldPosition;
}

export class CPUPlayCaller {
  private personality: CPUPersonality;
  private lastPlays: string[] = []; // Track last 3 plays to avoid repetition

  constructor(personality: CPUPersonality = CPU_PERSONALITIES.balanced) {
    this.personality = personality;
  }

  callOffensivePlay(field: FieldPosition, scoreDiff: number, timeLeft: number): OffensivePlay {
    const situation = this.analyzeSituation(field, scoreDiff, timeLeft);
    const candidates = this.filterOffensivePlays(situation);
    const play = this.weightedSelect(candidates, situation);

    this.trackPlay(play.id);
    return play;
  }

  callDefensivePlay(field: FieldPosition, scoreDiff: number, timeLeft: number): DefensivePlay {
    const situation = this.analyzeSituation(field, scoreDiff, timeLeft);
    const candidates = this.filterDefensivePlays(situation);
    return this.weightedSelectDefense(candidates, situation);
  }

  private analyzeSituation(field: FieldPosition, scoreDiff: number, timeLeft: number): SituationAnalysis {
    return {
      shortYardage: field.yardsToGo <= 3,
      longYardage: field.yardsToGo >= 8,
      redZone: field.yardLine >= 80,
      goalLine: field.yardLine >= 95,
      earlyDown: field.down <= 2,
      passingDown: field.down >= 3 && field.yardsToGo >= 5,
      desperate: field.down === 4,
      trailing: scoreDiff < 0,
      winning: scoreDiff > 0,
      blowout: Math.abs(scoreDiff) >= 17,
      twoMinute: timeLeft <= 120,
      field,
    };
  }

  private filterOffensivePlays(situation: SituationAnalysis): OffensivePlay[] {
    let plays = [...OFFENSIVE_PLAYBOOK];

    // Remove recently called plays
    plays = plays.filter(p => !this.lastPlays.includes(p.id));

    // Situational filtering
    if (situation.shortYardage) {
      // Favor runs and play action
      plays = plays.filter(p => p.type === 'RUN' || p.type === 'PLAY_ACTION' || Math.random() < 0.3);
    }

    if (situation.longYardage || situation.passingDown) {
      // Favor passes
      plays = plays.filter(p => p.type !== 'RUN' || p.id === 'draw' || Math.random() < 0.2);
    }

    if (situation.goalLine) {
      // Favor goal line plays
      plays = plays.filter(p =>
        p.type === 'RUN' ||
        p.id === 'slants' ||
        p.id === 'pa_boot' ||
        Math.random() < 0.3
      );
    }

    if (situation.twoMinute && situation.trailing) {
      // No huddle, pass heavy
      plays = plays.filter(p => p.type === 'PASS' || p.type === 'SCREEN');
    }

    // Ensure we have at least some plays
    if (plays.length === 0) {
      plays = [...OFFENSIVE_PLAYBOOK];
    }

    return plays;
  }

  private filterDefensivePlays(situation: SituationAnalysis): DefensivePlay[] {
    let plays = [...DEFENSIVE_PLAYBOOK];

    if (situation.passingDown) {
      // More coverage, potential blitz
      plays = plays.filter(p =>
        p.formation === 'NICKEL' ||
        p.blitz !== 'NONE' ||
        Math.random() < 0.4
      );
    }

    if (situation.shortYardage) {
      // Stack the box, less nickel
      plays = plays.filter(p => p.formation !== 'NICKEL' || Math.random() < 0.3);
    }

    if (situation.goalLine) {
      // Goal line defense
      plays = plays.filter(p =>
        p.coverage === 'MAN_FREE' ||
        p.coverage === 'COVER_1' ||
        Math.random() < 0.3
      );
    }

    if (situation.twoMinute) {
      // Prevent deep balls
      plays = plays.filter(p =>
        p.coverage === 'COVER_2' ||
        p.coverage === 'COVER_4' ||
        p.coverage === 'TAMPA_2' ||
        Math.random() < 0.3
      );
    }

    if (plays.length === 0) {
      plays = [...DEFENSIVE_PLAYBOOK];
    }

    return plays;
  }

  private weightedSelect(plays: OffensivePlay[], situation: SituationAnalysis): OffensivePlay {
    const weights = plays.map(play => {
      let weight = 1;

      // Apply personality
      if (play.type === 'RUN') {
        weight *= (1 - this.personality.runPassRatio) * 2;
      } else {
        weight *= this.personality.runPassRatio * 2;
      }

      // Situational boosts
      if (situation.earlyDown && play.type === 'RUN') weight *= 1.3;
      if (situation.passingDown && play.type === 'PASS') weight *= 1.5;
      if (situation.redZone && play.type === 'PLAY_ACTION') weight *= 1.4;
      if (situation.desperate && this.personality.aggressiveness > 0.5) {
        if (play.id === 'four_verts') weight *= 2;
      }

      // Add some randomness
      weight *= 0.8 + Math.random() * 0.4;

      return weight;
    });

    return this.selectByWeight(plays, weights);
  }

  private weightedSelectDefense(plays: DefensivePlay[], situation: SituationAnalysis): DefensivePlay {
    const weights = plays.map(play => {
      let weight = 1;

      // Blitz tendency
      if (play.blitz !== 'NONE') {
        weight *= this.personality.blitzRate * 3;
      }

      // Situational
      if (situation.passingDown && play.formation === 'NICKEL') weight *= 1.5;
      if (situation.shortYardage && play.blitz !== 'NONE') weight *= 1.3;

      // Randomness
      weight *= 0.8 + Math.random() * 0.4;

      return weight;
    });

    return this.selectByWeight(plays, weights);
  }

  private selectByWeight<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }

    return items[items.length - 1];
  }

  private trackPlay(playId: string): void {
    this.lastPlays.push(playId);
    if (this.lastPlays.length > 3) {
      this.lastPlays.shift();
    }
  }

  setPersonality(personality: CPUPersonality): void {
    this.personality = personality;
  }

  /**
   * Decide what to do on 4th down
   * Returns: 'GO_FOR_IT' | 'PUNT' | 'FIELD_GOAL'
   */
  decideFourthDown(
    field: FieldPosition,
    scoreDiff: number,
    timeLeft: number,
    isInFGRange: boolean
  ): 'GO_FOR_IT' | 'PUNT' | 'FIELD_GOAL' {
    const situation = this.analyzeSituation(field, scoreDiff, timeLeft);

    // Base go-for-it probability based on yards to go and field position
    let goForItProb = this.calculateGoForItProbability(field, situation);

    // Apply personality modifier (aggressive coaches go for it more)
    goForItProb *= 0.5 + this.personality.aggressiveness;

    // Situational overrides

    // Always go for it on 4th & inches from anywhere
    if (field.yardsToGo <= 1) {
      goForItProb += 0.4;
    }

    // Deep in opponent territory, no FG range - go for it or turn over anyway
    if (field.yardLine >= 60 && !isInFGRange) {
      goForItProb += 0.3;
    }

    // Trailing late in game - must be aggressive
    if (situation.trailing && timeLeft <= 300) {  // Last 5 minutes
      goForItProb += 0.3;
    }
    if (situation.trailing && timeLeft <= 120) {  // Last 2 minutes
      goForItProb += 0.4;
    }

    // Goal line (inside 5) - high value, go for it
    if (situation.goalLine) {
      goForItProb += 0.25;
    }

    // Blowout situations - winning big, don't risk it
    if (situation.blowout && situation.winning) {
      goForItProb -= 0.4;
    }

    // Blowout situations - losing big, be aggressive
    if (situation.blowout && situation.trailing) {
      goForItProb += 0.3;
    }

    // Early in game with long yardage in own territory - play it safe
    if (field.yardLine <= 40 && field.yardsToGo >= 5 && timeLeft > 600) {
      goForItProb -= 0.3;
    }

    // Field goal decisions
    if (isInFGRange) {
      // Close game, FG matters
      if (Math.abs(scoreDiff) <= 3) {
        // Trailing by 3 or less, FG ties/takes lead
        if (scoreDiff >= -3 && scoreDiff <= 0) {
          return 'FIELD_GOAL';
        }
        // Leading by 1-3, FG extends lead safely
        if (scoreDiff >= 1 && scoreDiff <= 3 && field.yardsToGo > 3) {
          return 'FIELD_GOAL';
        }
      }

      // Long field goal attempts are riskier
      const fgDistance = 100 - field.yardLine + 17;
      if (fgDistance <= 35) {
        // Short FG, take it unless super aggressive
        if (goForItProb < 0.7) {
          return 'FIELD_GOAL';
        }
      } else if (fgDistance <= 45) {
        // Medium FG
        if (goForItProb < 0.5) {
          return 'FIELD_GOAL';
        }
      } else {
        // Long FG - consider going for it
        if (goForItProb >= 0.4 && field.yardsToGo <= 4) {
          // Close enough to go for it instead of a risky long FG
          goForItProb += 0.2;
        }
      }
    }

    // Make the decision
    const roll = Math.random();
    if (roll < goForItProb) {
      return 'GO_FOR_IT';
    }

    // If we're deep in opponent territory, FG is better than punt
    if (isInFGRange && field.yardLine >= 50) {
      return 'FIELD_GOAL';
    }

    return 'PUNT';
  }

  private calculateGoForItProbability(field: FieldPosition, _situation: SituationAnalysis): number {
    // Base probability curve based on yards to go
    // 1 yard = ~65%, 2 yards = ~45%, 3 yards = ~35%, etc.
    const yardsToGoFactor = Math.max(0, 0.75 - (field.yardsToGo - 1) * 0.12);

    // Field position factor - more likely to go for it in opponent territory
    let fieldPosFactor = 0;
    if (field.yardLine >= 50) {
      fieldPosFactor = (field.yardLine - 50) / 100;  // 0 at 50, 0.5 at 100
    } else if (field.yardLine <= 30) {
      fieldPosFactor = -0.2;  // Penalty for being in own territory
    }

    return Math.max(0.05, Math.min(0.9, yardsToGoFactor + fieldPosFactor));
  }

  /**
   * Get a descriptive analysis of the 4th down decision (for UI/debug)
   */
  explain4thDownDecision(
    field: FieldPosition,
    scoreDiff: number,
    timeLeft: number,
    isInFGRange: boolean
  ): string {
    const decision = this.decideFourthDown(field, scoreDiff, timeLeft, isInFGRange);
    const situation = this.analyzeSituation(field, scoreDiff, timeLeft);

    let reason = '';
    if (decision === 'GO_FOR_IT') {
      if (field.yardsToGo <= 1) reason = 'Short yardage situation';
      else if (situation.goalLine) reason = 'Goal line - high value';
      else if (situation.trailing && timeLeft <= 120) reason = 'Must score - trailing late';
      else if (field.yardLine >= 60 && !isInFGRange) reason = 'No mans land - go for it';
      else reason = `Aggressive call (${Math.round(this.personality.aggressiveness * 100)}% aggression)`;
    } else if (decision === 'FIELD_GOAL') {
      const dist = 100 - field.yardLine + 17;
      reason = `${dist} yard FG attempt`;
    } else {
      reason = 'Playing it safe';
    }

    return `${decision}: ${reason}`;
  }
}
