import type { FieldPosition, GameClock } from '../types/GameSim';
import { KickingEngine } from './KickingEngine';
import type { KickResult } from './KickingEngine';

export type GamePhase =
  | 'COIN_TOSS'
  | 'KICKOFF'
  | 'PLAY'           // Normal offensive/defensive play
  | 'PAT_DECISION'   // Choose PAT or 2pt
  | 'PAT'
  | 'FIELD_GOAL'
  | 'PUNT'
  | 'HALFTIME'
  | 'GAME_OVER';

export interface GameManagerState {
  gamePhase: GamePhase;
  homeScore: number;
  awayScore: number;
  possession: 'home' | 'away';
  receivingTeam: 'home' | 'away';  // Who receives to start
  quarter: 1 | 2 | 3 | 4;
  clock: GameClock;
  field: FieldPosition;
  lastKickResult?: KickResult;
  isOvertime: boolean;
  homeTimeouts: number;
  awayTimeouts: number;
}

export class GameManager {
  private state: GameManagerState;
  private kickingEngine: KickingEngine;
  private onStateChange: (state: GameManagerState) => void;

  constructor(onStateChange: (state: GameManagerState) => void) {
    this.onStateChange = onStateChange;
    this.kickingEngine = new KickingEngine(true);
    this.state = this.createInitialState();
  }

  private createInitialState(): GameManagerState {
    return {
      gamePhase: 'COIN_TOSS',
      homeScore: 0,
      awayScore: 0,
      possession: 'home',
      receivingTeam: 'away', // Will be set by coin toss
      quarter: 1,
      clock: {
        quarter: 1,
        minutes: 15,
        seconds: 0,
        playClock: 40,
        isRunning: false,
      },
      field: {
        yardLine: 25,
        down: 1,
        yardsToGo: 10,
        possession: 'home',
      },
      isOvertime: false,
      homeTimeouts: 3,
      awayTimeouts: 3,
    };
  }

  // COIN TOSS
  coinToss(homeReceives: boolean): void {
    this.state.receivingTeam = homeReceives ? 'home' : 'away';
    this.state.possession = homeReceives ? 'away' : 'home'; // Kicking team has ball first technically
    this.state.gamePhase = 'KICKOFF';
    this.emitState();
  }

  // KICKOFF
  executeKickoff(): KickResult {
    const kickingTeam = this.state.possession;
    const result = this.kickingEngine.resolveKickoff(kickingTeam);

    this.state.lastKickResult = result;
    this.state.possession = result.possession;
    this.state.field = {
      yardLine: result.newYardLine,
      down: 1,
      yardsToGo: 10,
      possession: result.possession,
    };
    this.state.gamePhase = 'PLAY';
    this.emitState();

    return result;
  }

  // After a play ends - called from GameEngine
  onPlayEnd(yardsGained: number, touchdown: boolean, turnover: boolean, safety: boolean = false): void {
    if (safety) {
      // Safety: 2 points to defense, free kick from 20
      const scoringTeam = this.state.possession === 'home' ? 'away' : 'home';
      if (scoringTeam === 'home') {
        this.state.homeScore += 2;
      } else {
        this.state.awayScore += 2;
      }
      // Free kick from 20
      this.state.field.yardLine = 20;
      this.state.gamePhase = 'KICKOFF';
      this.emitState();
      return;
    }

    if (touchdown) {
      // Add 6, go to PAT decision
      if (this.state.possession === 'home') {
        this.state.homeScore += 6;
      } else {
        this.state.awayScore += 6;
      }
      this.state.gamePhase = 'PAT_DECISION';
      this.emitState();
      return;
    }

    if (turnover) {
      this.switchPossession();
      this.state.field.down = 1;
      this.state.field.yardsToGo = 10;
      this.state.gamePhase = 'PLAY';
      this.emitState();
      return;
    }

    // Normal play advancement
    this.state.field.yardLine += yardsGained;

    if (yardsGained >= this.state.field.yardsToGo) {
      // First down
      this.state.field.down = 1;
      this.state.field.yardsToGo = Math.min(10, 100 - this.state.field.yardLine);
    } else {
      this.state.field.down = Math.min(this.state.field.down + 1, 4) as 1 | 2 | 3 | 4;
      this.state.field.yardsToGo -= yardsGained;
    }

    // Turnover on downs
    if (this.state.field.down > 4) {
      this.switchPossession();
      this.state.field.down = 1;
      this.state.field.yardsToGo = 10;
    }

    this.state.gamePhase = 'PLAY';
    this.checkQuarterEnd();
    this.emitState();
  }

  // PAT / 2-Point
  choosePAT(): void {
    this.state.gamePhase = 'PAT';
    this.emitState();
  }

  chooseTwoPoint(): void {
    // Set up for 2pt play from the 2 yard line
    this.state.field = {
      yardLine: 98,
      down: 1,
      yardsToGo: 2,
      possession: this.state.possession,
    };
    this.state.gamePhase = 'PLAY';
    this.emitState();
  }

  executePAT(): KickResult {
    const result = this.kickingEngine.resolvePAT(this.state.possession);

    if (result.success) {
      if (this.state.possession === 'home') {
        this.state.homeScore += 1;
      } else {
        this.state.awayScore += 1;
      }
    }

    this.state.lastKickResult = result;
    this.setupKickoff();
    return result;
  }

  // FIELD GOAL
  attemptFieldGoal(): KickResult {
    const result = this.kickingEngine.resolveFieldGoal(
      this.state.possession,
      this.state.field.yardLine
    );

    this.state.lastKickResult = result;

    if (result.success) {
      if (this.state.possession === 'home') {
        this.state.homeScore += 3;
      } else {
        this.state.awayScore += 3;
      }
      this.setupKickoff();
    } else {
      // Miss - turnover at spot
      this.state.possession = result.possession;
      this.state.field = {
        yardLine: result.newYardLine,
        down: 1,
        yardsToGo: 10,
        possession: result.possession,
      };
      this.state.gamePhase = 'PLAY';
    }

    this.emitState();
    return result;
  }

  // PUNT
  executePunt(): KickResult {
    const result = this.kickingEngine.resolvePunt(
      this.state.possession,
      this.state.field.yardLine
    );

    this.state.lastKickResult = result;
    this.state.possession = result.possession;
    this.state.field = {
      yardLine: result.newYardLine,
      down: 1,
      yardsToGo: 10,
      possession: result.possession,
    };
    this.state.gamePhase = 'PLAY';
    this.emitState();

    return result;
  }

  // Request special teams play (from play selection UI)
  selectSpecialTeams(type: 'PUNT' | 'FIELD_GOAL'): void {
    this.state.gamePhase = type;
    this.emitState();
  }

  // Go back to play selection
  cancelSpecialTeams(): void {
    this.state.gamePhase = 'PLAY';
    this.emitState();
  }

  // QUARTER MANAGEMENT
  private checkQuarterEnd(): void {
    if (this.state.clock.minutes <= 0 && this.state.clock.seconds <= 0) {
      this.advanceQuarter();
    }
  }

  private advanceQuarter(): void {
    if (this.state.quarter === 2) {
      this.state.gamePhase = 'HALFTIME';
      this.state.quarter = 3;
      this.resetClock();
      // Flip possession for 2nd half kickoff
      this.state.possession = this.state.receivingTeam;
    } else if (this.state.quarter === 4) {
      if (this.state.homeScore === this.state.awayScore) {
        // Overtime (simplified)
        this.state.isOvertime = true;
        this.state.quarter = 4; // Keep at 4 for OT
        this.resetClock();
        this.state.gamePhase = 'COIN_TOSS';
      } else {
        this.state.gamePhase = 'GAME_OVER';
      }
    } else {
      this.state.quarter = Math.min(this.state.quarter + 1, 4) as 1 | 2 | 3 | 4;
      this.state.clock.quarter = this.state.quarter;
      this.resetClock();
    }
    this.emitState();
  }

  endHalftime(): void {
    this.state.gamePhase = 'KICKOFF';
    // Team that kicked off first half now receives
    this.state.possession = this.state.receivingTeam === 'home' ? 'away' : 'home';
    this.resetTimeouts();
    this.emitState();
  }

  private resetClock(): void {
    this.state.clock = {
      quarter: this.state.quarter,
      minutes: this.state.isOvertime ? 10 : 15,
      seconds: 0,
      playClock: 40,
      isRunning: false,
    };
  }

  private resetTimeouts(): void {
    this.state.homeTimeouts = 3;
    this.state.awayTimeouts = 3;
  }

  private setupKickoff(): void {
    // After score, scoring team kicks off
    this.state.field = {
      yardLine: 35,
      down: 1,
      yardsToGo: 10,
      possession: this.state.possession,
    };
    this.state.gamePhase = 'KICKOFF';
  }

  private switchPossession(): void {
    this.state.possession = this.state.possession === 'home' ? 'away' : 'home';
    this.state.field.yardLine = 100 - this.state.field.yardLine;
    this.state.field.possession = this.state.possession;
  }

  // UTILITIES
  isInFieldGoalRange(): boolean {
    return this.kickingEngine.isInFieldGoalRange(this.state.field.yardLine);
  }

  shouldCPUPunt(): boolean {
    return this.kickingEngine.shouldPunt(
      this.state.field.down,
      this.state.field.yardsToGo,
      this.state.field.yardLine
    );
  }

  getState(): GameManagerState {
    return { ...this.state };
  }

  updateClock(clock: GameClock): void {
    this.state.clock = clock;
    this.checkQuarterEnd();
  }

  private emitState(): void {
    this.onStateChange({ ...this.state });
  }

  // TIMEOUT MANAGEMENT
  callTimeout(team: 'home' | 'away'): boolean {
    // Check if team has timeouts remaining
    if (team === 'home' && this.state.homeTimeouts > 0) {
      this.state.homeTimeouts--;
      this.state.clock.isRunning = false;
      this.emitState();
      return true;
    } else if (team === 'away' && this.state.awayTimeouts > 0) {
      this.state.awayTimeouts--;
      this.state.clock.isRunning = false;
      this.emitState();
      return true;
    }
    return false;
  }

  getTimeouts(team: 'home' | 'away'): number {
    return team === 'home' ? this.state.homeTimeouts : this.state.awayTimeouts;
  }

  canCallTimeout(team: 'home' | 'away'): boolean {
    const hasTimeouts = team === 'home' ? this.state.homeTimeouts > 0 : this.state.awayTimeouts > 0;
    // Can only call timeouts during PLAY phase (between plays)
    return hasTimeouts && this.state.gamePhase === 'PLAY';
  }

  // For testing / debug
  setState(partial: Partial<GameManagerState>): void {
    this.state = { ...this.state, ...partial };
    this.emitState();
  }
}
