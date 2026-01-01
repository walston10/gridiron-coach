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
}
