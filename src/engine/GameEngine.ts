import type {
  GameState,
  FieldPlayer,
  OffensivePlay,
  DefensivePlay,
  Vector2,
  Position,
  RouteType,
  PassFlight,
} from '../types/GameSim';
import { RouteRunner } from './RouteRunner';
import { DefenseAI } from './DefenseAI';
import { KickingEngine } from './KickingEngine';
import type { KickResult, KickingRatings } from './KickingEngine';
import { PenaltyEngine } from './PenaltyEngine';
import type { Penalty, PlayContext } from './PenaltyEngine';
import { FatigueEngine } from './FatigueEngine';
import type { Play } from '../types';

const FIELD_WIDTH = 160;   // 53.3 yards * 3
const FIELD_HEIGHT = 360;  // 120 yards * 3 (including endzones)
const TICK_RATE = 60;      // Updates per second

export class GameEngine {
  private state: GameState;
  private tickInterval: number | null = null;
  private onStateChange: (state: GameState) => void;

  // AI and special teams systems
  private routeRunner: RouteRunner;
  private defenseAI: DefenseAI;
  private kickingEngine: KickingEngine;
  private penaltyEngine: PenaltyEngine;
  private fatigueEngine: FatigueEngine;

  // Penalty tracking
  private pendingPenalty: Penalty | null = null;
  private qbWasSacked: boolean = false;
  private qbWasScrambling: boolean = false;
  private passWasThrown: boolean = false;

  // Timing
  private currentTime: number = 0;
  private pocketCenter: Vector2 = { x: FIELD_WIDTH / 2, y: 0 };
  private currentPlay: OffensivePlay | null = null;
  private currentDefense: DefensivePlay | null = null;
  private originalPlay: Play | null = null; // Store original Play for ball carrier info

  // Kicking state
  private pendingKickoff: boolean = false;
  private pendingPAT: boolean = false;
  private lastKickResult: KickResult | null = null;

  // Player control state
  private playerInput: Vector2 = { x: 0, y: 0 };
  private lastInputTime: number = 0;

  // Evasion state
  private evasionState: {
    active: boolean;
    type: 'JUKE' | 'SPIN' | 'DIVE' | null;
    startTime: number;
    duration: number;
    direction: Vector2;
    cooldownEnd: number;
  } = {
    active: false,
    type: null,
    startTime: 0,
    duration: 0,
    direction: { x: 0, y: 0 },
    cooldownEnd: 0,
  };

  // CPU control state (for when user is on defense)
  private cpuControlEnabled: boolean = false;

  // Clock accumulator for smooth timing
  private clockAccumulator: number = 0;

  constructor(onStateChange: (state: GameState) => void) {
    this.onStateChange = onStateChange;
    this.state = this.createInitialState();
    this.routeRunner = new RouteRunner();
    this.defenseAI = new DefenseAI();
    this.kickingEngine = new KickingEngine(true); // Auto-resolve returns
    this.penaltyEngine = new PenaltyEngine(1.0);  // Normal penalty frequency
    this.fatigueEngine = new FatigueEngine(true); // Enable fatigue system
  }

  private createInitialState(): GameState {
    const state: GameState = {
      phase: 'HUDDLE',
      clock: { quarter: 1, minutes: 15, seconds: 0, playClock: 40, isRunning: false },
      field: { yardLine: 25, down: 1, yardsToGo: 10, possession: 'home' },
      score: { home: 0, away: 0 },
      offensivePlayers: [],
      defensivePlayers: [],
      ballLocation: { x: FIELD_WIDTH / 2, y: 0 },
    };
    // Create huddle formations
    state.offensivePlayers = this.createOffensiveHuddle(state.field.yardLine);
    state.defensivePlayers = this.createDefensiveHuddle(state.field.yardLine);
    return state;
  }

  // Create offensive players in huddle formation
  private createOffensiveHuddle(yardLine: number): FieldPlayer[] {
    const los = this.yardLineToY(yardLine);
    const center = FIELD_WIDTH / 2;
    const huddleY = los - 30; // 10 yards behind LOS
    const huddleSpacing = 8;

    // Create players clustered in a huddle circle
    return [
      this.createPlayer('qb', 'QB', { x: center, y: huddleY - 15 }), // QB in front of huddle
      this.createPlayer('rb', 'RB', { x: center - huddleSpacing, y: huddleY }),
      this.createPlayer('wr1', 'WR', { x: center - huddleSpacing * 2, y: huddleY + huddleSpacing }),
      this.createPlayer('wr2', 'WR', { x: center + huddleSpacing * 2, y: huddleY + huddleSpacing }),
      this.createPlayer('te', 'TE', { x: center + huddleSpacing, y: huddleY }),
      this.createPlayer('lt', 'LT', { x: center - huddleSpacing * 2, y: huddleY - huddleSpacing }),
      this.createPlayer('lg', 'LG', { x: center - huddleSpacing, y: huddleY - huddleSpacing }),
      this.createPlayer('c', 'C', { x: center, y: huddleY }),
      this.createPlayer('rg', 'RG', { x: center + huddleSpacing, y: huddleY - huddleSpacing }),
      this.createPlayer('rt', 'RT', { x: center + huddleSpacing * 2, y: huddleY - huddleSpacing }),
    ];
  }

  // Create defensive players waiting in their area
  private createDefensiveHuddle(yardLine: number): FieldPlayer[] {
    const los = this.yardLineToY(yardLine);
    const center = FIELD_WIDTH / 2;
    const waitY = los + 45; // 15 yards past LOS

    // Defense waits in a loose cluster
    return [
      this.createPlayer('de1', 'DE', { x: center - 40, y: waitY - 10 }),
      this.createPlayer('dt1', 'DT', { x: center - 15, y: waitY - 5 }),
      this.createPlayer('dt2', 'DT', { x: center + 15, y: waitY - 5 }),
      this.createPlayer('de2', 'DE', { x: center + 40, y: waitY - 10 }),
      this.createPlayer('olb1', 'OLB', { x: center - 45, y: waitY + 10 }),
      this.createPlayer('mlb', 'MLB', { x: center, y: waitY + 5 }),
      this.createPlayer('olb2', 'OLB', { x: center + 45, y: waitY + 10 }),
      this.createPlayer('cb1', 'CB', { x: 25, y: waitY + 15 }),
      this.createPlayer('cb2', 'CB', { x: 135, y: waitY + 15 }),
      this.createPlayer('fs', 'FS', { x: center - 20, y: waitY + 30 }),
      this.createPlayer('ss', 'SS', { x: center + 20, y: waitY + 25 }),
    ];
  }

  // PLAY SETUP - Supports both OffensivePlay and UI Play types
  setOffensivePlay(play: OffensivePlay | Play): void {
    // Store current huddle positions (array to handle multiple players of same position)
    const huddlePositions: Array<{ position: Position; location: { x: number; y: number }; used: boolean }> = [];
    this.state.offensivePlayers.forEach(p => {
      huddlePositions.push({ position: p.position, location: { ...p.location }, used: false });
    });

    if ('assignments' in play) {
      // UI Play format - convert to engine format
      const converted = this.convertPlayToOffensive(play);
      this.state.selectedPlay = converted;
      this.currentPlay = converted;
      this.originalPlay = play; // Store original for ball carrier info

      // Create formation players and set their targets
      this.state.offensivePlayers = this.createOffensiveFormationFromPlay(play);
    } else {
      // Engine OffensivePlay format
      this.state.selectedPlay = play;
      this.currentPlay = play;
      this.originalPlay = null;

      // Create formation players and set their targets
      this.state.offensivePlayers = this.createOffensiveFormation(play);
    }

    // Move formation players back to huddle positions, set formation as target
    const los = this.yardLineToY(this.state.field.yardLine);
    this.state.offensivePlayers.forEach(player => {
      // Save the formation position as target
      player.formationTarget = { ...player.location };

      // Find an unused huddle position for this position type
      const huddleEntry = huddlePositions.find(h => h.position === player.position && !h.used);
      if (huddleEntry) {
        huddleEntry.used = true;
        player.location = { ...huddleEntry.location };
      } else {
        // Try to find any unused huddle position
        const anyEntry = huddlePositions.find(h => !h.used);
        if (anyEntry) {
          anyEntry.used = true;
          player.location = { ...anyEntry.location };
        } else {
          // Default huddle position for extra players
          player.location = { x: FIELD_WIDTH / 2 + (Math.random() - 0.5) * 20, y: los - 30 };
        }
      }
    });

    // Set defensive formation targets too
    this.setAutoCPUDefense();

    // Start breaking huddle animation
    this.state.phase = 'BREAKING_HUDDLE';
    this.startHuddleBreakAnimation();
    this.emitState();
  }

  // Set formation targets for huddle break animation
  private setFormationTargets(currentPlayers: FieldPlayer[], formationPlayers: FieldPlayer[]): void {
    // Track which formation players have been assigned
    const assignedFormation = new Set<string>();

    // Match players by position type
    currentPlayers.forEach(player => {
      // First try exact ID match (case-insensitive)
      let formationPlayer = formationPlayers.find(fp =>
        !assignedFormation.has(fp.id) &&
        fp.id.toLowerCase() === player.id.toLowerCase()
      );

      // Then try matching by position
      if (!formationPlayer) {
        formationPlayer = formationPlayers.find(fp =>
          !assignedFormation.has(fp.id) &&
          fp.position === player.position
        );
      }

      if (formationPlayer) {
        assignedFormation.add(formationPlayer.id);
        player.formationTarget = { ...formationPlayer.location };
        player.route = formationPlayer.route;
        // Update player ID to match formation for consistency
        player.id = formationPlayer.id;
      }
    });
  }

  // Animation interval for huddle break
  private huddleBreakInterval: number | null = null;

  private startHuddleBreakAnimation(): void {
    if (this.huddleBreakInterval) {
      clearInterval(this.huddleBreakInterval);
    }

    this.huddleBreakInterval = window.setInterval(() => {
      this.updateHuddleBreakAnimation();
    }, 1000 / TICK_RATE);
  }

  private updateHuddleBreakAnimation(): void {
    const MOVE_SPEED = 2.5; // Units per tick
    let allArrived = true;

    // Move offensive players toward formation
    this.state.offensivePlayers.forEach(player => {
      if (!player.formationTarget) return;

      const dx = player.formationTarget.x - player.location.x;
      const dy = player.formationTarget.y - player.location.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        allArrived = false;
        const moveX = (dx / dist) * MOVE_SPEED;
        const moveY = (dy / dist) * MOVE_SPEED;
        player.location.x += moveX;
        player.location.y += moveY;
      } else {
        // Snap to target
        player.location.x = player.formationTarget.x;
        player.location.y = player.formationTarget.y;
      }
    });

    // Move defensive players toward formation
    this.state.defensivePlayers.forEach(player => {
      if (!player.formationTarget) return;

      const dx = player.formationTarget.x - player.location.x;
      const dy = player.formationTarget.y - player.location.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        allArrived = false;
        const moveX = (dx / dist) * MOVE_SPEED;
        const moveY = (dy / dist) * MOVE_SPEED;
        player.location.x += moveX;
        player.location.y += moveY;
      } else {
        // Snap to target
        player.location.x = player.formationTarget.x;
        player.location.y = player.formationTarget.y;
      }
    });

    this.emitState();

    // Check if all players have arrived
    if (allArrived) {
      if (this.huddleBreakInterval) {
        clearInterval(this.huddleBreakInterval);
        this.huddleBreakInterval = null;
      }
      this.state.phase = 'PRE_SNAP';
      this.emitState();
    }
  }

  // Convert Play Designer route types to engine RouteType
  private convertRoute(playRoute: string | undefined): RouteType | undefined {
    if (!playRoute) return undefined;
    // Map Play.ts routes to GameSim.ts routes
    const routeMap: Record<string, RouteType> = {
      'GO': 'STREAK',       // GO and STREAK are the same
      'STREAK': 'STREAK',
      'SLANT': 'SLANT',
      'OUT': 'OUT',
      'IN': 'IN',
      'CURL': 'CURL',
      'COMEBACK': 'COMEBACK',
      'POST': 'POST',
      'CORNER': 'CORNER',
      'DRAG': 'DRAG',
      'FLAT': 'FLAT',
      'WHEEL': 'WHEEL',
      'BLOCK': 'BLOCK',
      'SCREEN': 'FLAT',     // Treat screen as flat route
      'CUSTOM': 'DRAG',     // Treat custom as drag (simple across field)
    };
    return routeMap[playRoute] || undefined;
  }

  private convertPlayToOffensive(play: Play): OffensivePlay {
    const routes: Record<string, RouteType> = {};
    play.assignments.forEach(a => {
      const convertedRoute = this.convertRoute(a.route);
      if (convertedRoute) {
        routes[a.positionSlot] = convertedRoute;
      }
    });

    return {
      id: play.id,
      name: play.name,
      formation: play.formation as any,
      type: play.playType === 'RUN' ? 'RUN' : 'PASS',
      routes,
      description: play.notes || '',
    };
  }

  private createOffensiveFormationFromPlay(play: Play): FieldPlayer[] {
    const los = this.yardLineToY(this.state.field.yardLine);

    return play.assignments.map(assignment => {
      // Convert formation coordinates (0-100) to field coordinates
      const fieldX = (assignment.startX / 100) * FIELD_WIDTH;
      const fieldY = los - ((assignment.startY - 50) * 0.6);

      return this.createPlayer(
        assignment.positionSlot,
        this.getPositionFromSlot(assignment.positionSlot),
        { x: fieldX, y: fieldY },
        this.convertRoute(assignment.route)
      );
    });
  }

  private getPositionFromSlot(slot: string): Position {
    const mapping: Record<string, Position> = {
      'QB': 'QB', 'RB': 'RB', 'FB': 'FB',
      'X': 'WR', 'Z': 'WR', 'H': 'WR', 'F': 'WR',
      'Y': 'TE', 'U': 'TE',
      'LT': 'LT', 'LG': 'LG', 'C': 'C', 'RG': 'RG', 'RT': 'RT',
    };
    return mapping[slot] || 'WR';
  }

  // Auto-generate CPU defense
  setAutoCPUDefense(): void {
    const defaultDefense: DefensivePlay = {
      id: 'cpu-defense',
      name: 'Cover 3',
      formation: '4_3',
      coverage: 'COVER_3',
      blitz: 'NONE',
      description: 'Base Cover 3 zone',
    };
    this.setDefensivePlay(defaultDefense);
  }

  setDefensivePlay(play: DefensivePlay): void {
    this.currentDefense = play;

    // Store current huddle positions (array to handle multiple players of same position)
    const huddlePositions: Array<{ position: Position; location: { x: number; y: number }; used: boolean }> = [];
    this.state.defensivePlayers.forEach(p => {
      huddlePositions.push({ position: p.position, location: { ...p.location }, used: false });
    });

    // Create formation players
    this.state.defensivePlayers = this.createDefensiveFormation(play);

    // Move formation players back to huddle positions, set formation as target
    const los = this.yardLineToY(this.state.field.yardLine);
    this.state.defensivePlayers.forEach(player => {
      // Save the formation position as target
      player.formationTarget = { ...player.location };

      // Find an unused huddle position for this position type
      const huddleEntry = huddlePositions.find(h => h.position === player.position && !h.used);
      if (huddleEntry) {
        huddleEntry.used = true;
        player.location = { ...huddleEntry.location };
      } else {
        // Try to find any unused huddle position
        const anyEntry = huddlePositions.find(h => !h.used);
        if (anyEntry) {
          anyEntry.used = true;
          player.location = { ...anyEntry.location };
        } else {
          // Default huddle position for extra players
          player.location = { x: FIELD_WIDTH / 2 + (Math.random() - 0.5) * 30, y: los + 45 };
        }
      }
    });
  }

  private createOffensiveFormation(play: OffensivePlay): FieldPlayer[] {
    const los = this.yardLineToY(this.state.field.yardLine);
    const center = FIELD_WIDTH / 2;

    // Spacing: 3 units = 1 yard
    // Under center: QB 1 yard back, RB 7 yards back
    // Shotgun: QB 5 yards back, RB beside or slightly behind QB
    const players: FieldPlayer[] = [
      this.createPlayer('qb', 'QB', { x: center, y: los - 3 }, play.routes['QB']), // 1 yard back under center
      this.createPlayer('rb', 'RB', { x: center, y: los - 21 }, play.routes['RB']), // 7 yards back
      this.createPlayer('wr1', 'WR', { x: 15, y: los + 3 }, play.routes['WR1']), // Far left sideline
      this.createPlayer('wr2', 'WR', { x: 145, y: los + 3 }, play.routes['WR2']), // Far right sideline
      this.createPlayer('te', 'TE', { x: center + 36, y: los + 3 }, play.routes['TE']), // Outside RT
      this.createPlayer('lt', 'LT', { x: center - 24, y: los + 3 }),
      this.createPlayer('lg', 'LG', { x: center - 12, y: los + 3 }),
      this.createPlayer('c', 'C', { x: center, y: los + 3 }),
      this.createPlayer('rg', 'RG', { x: center + 12, y: los + 3 }),
      this.createPlayer('rt', 'RT', { x: center + 24, y: los + 3 }),
    ];

    if (play.formation === 'SHOTGUN') {
      players[0].location.y = los - 15; // QB 5 yards back in shotgun
      players[1].location = { x: center + 15, y: los - 15 }; // RB beside QB, offset to right
      players.push(this.createPlayer('slot1', 'WR', { x: center - 48, y: los + 3 }, play.routes['SLOT1']));
    } else if (play.formation === 'I_FORM') {
      players[1].location.y = los - 15; // RB 5 yards back
      players.push(this.createPlayer('fb', 'FB', { x: center, y: los - 9 }, play.routes['FB'])); // FB 3 yards back
    }

    return players;
  }

  private createDefensiveFormation(play: DefensivePlay): FieldPlayer[] {
    const los = this.yardLineToY(this.state.field.yardLine);
    const center = FIELD_WIDTH / 2;

    const players: FieldPlayer[] = [];

    // Defense lines up PAST the LOS (higher Y values)
    // D-Line: 2 yards off ball = +6 units
    // LBs: 5 yards off = +15 units
    // Secondary: 8-15 yards off = +24-45 units

    if (play.formation === '4_3') {
      // D-Line - 2 yards off LOS
      players.push(this.createPlayer('de1', 'DE', { x: center - 36, y: los + 9 }));
      players.push(this.createPlayer('dt1', 'DT', { x: center - 12, y: los + 6 }));
      players.push(this.createPlayer('dt2', 'DT', { x: center + 12, y: los + 6 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 36, y: los + 9 }));
      // Linebackers - 5 yards off
      players.push(this.createPlayer('olb1', 'OLB', { x: center - 42, y: los + 18 }));
      players.push(this.createPlayer('mlb', 'MLB', { x: center, y: los + 18 }));
      players.push(this.createPlayer('olb2', 'OLB', { x: center + 42, y: los + 18 }));
      // Secondary - CBs press, Safeties deep
      players.push(this.createPlayer('cb1', 'CB', { x: 18, y: los + 12 })); // Press left WR
      players.push(this.createPlayer('cb2', 'CB', { x: 142, y: los + 12 })); // Press right WR
      players.push(this.createPlayer('fs', 'FS', { x: center - 24, y: los + 54 })); // 18 yards deep
      players.push(this.createPlayer('ss', 'SS', { x: center + 24, y: los + 42 })); // 14 yards deep
    } else if (play.formation === 'NICKEL') {
      // 4-2-5 nickel
      players.push(this.createPlayer('de1', 'DE', { x: center - 36, y: los + 9 }));
      players.push(this.createPlayer('dt1', 'DT', { x: center - 12, y: los + 6 }));
      players.push(this.createPlayer('dt2', 'DT', { x: center + 12, y: los + 6 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 36, y: los + 9 }));
      players.push(this.createPlayer('mlb1', 'MLB', { x: center - 18, y: los + 18 }));
      players.push(this.createPlayer('mlb2', 'MLB', { x: center + 18, y: los + 18 }));
      players.push(this.createPlayer('cb1', 'CB', { x: 18, y: los + 12 }));
      players.push(this.createPlayer('cb2', 'CB', { x: 142, y: los + 12 }));
      players.push(this.createPlayer('ncb', 'CB', { x: center - 48, y: los + 15 })); // Slot corner
      players.push(this.createPlayer('fs', 'FS', { x: center, y: los + 54 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 30, y: los + 42 }));
    } else if (play.formation === '3_4') {
      players.push(this.createPlayer('de1', 'DE', { x: center - 30, y: los + 9 }));
      players.push(this.createPlayer('nt', 'NT', { x: center, y: los + 6 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 30, y: los + 9 }));
      players.push(this.createPlayer('olb1', 'OLB', { x: center - 48, y: los + 15 }));
      players.push(this.createPlayer('ilb1', 'ILB', { x: center - 15, y: los + 18 }));
      players.push(this.createPlayer('ilb2', 'ILB', { x: center + 15, y: los + 18 }));
      players.push(this.createPlayer('olb2', 'OLB', { x: center + 48, y: los + 15 }));
      players.push(this.createPlayer('cb1', 'CB', { x: 18, y: los + 12 }));
      players.push(this.createPlayer('cb2', 'CB', { x: 142, y: los + 12 }));
      players.push(this.createPlayer('fs', 'FS', { x: center, y: los + 54 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 24, y: los + 42 }));
    } else {
      // Default 4-3
      players.push(this.createPlayer('de1', 'DE', { x: center - 36, y: los + 9 }));
      players.push(this.createPlayer('dt1', 'DT', { x: center - 12, y: los + 6 }));
      players.push(this.createPlayer('dt2', 'DT', { x: center + 12, y: los + 6 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 36, y: los + 9 }));
      players.push(this.createPlayer('olb1', 'OLB', { x: center - 42, y: los + 18 }));
      players.push(this.createPlayer('mlb', 'MLB', { x: center, y: los + 18 }));
      players.push(this.createPlayer('olb2', 'OLB', { x: center + 42, y: los + 18 }));
      players.push(this.createPlayer('cb1', 'CB', { x: 18, y: los + 12 }));
      players.push(this.createPlayer('cb2', 'CB', { x: 142, y: los + 12 }));
      players.push(this.createPlayer('fs', 'FS', { x: center - 24, y: los + 54 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 24, y: los + 42 }));
    }

    return players;
  }

  private createPlayer(id: string, position: Position, location: Vector2, route?: RouteType): FieldPlayer {
    // Generate base stats with some variance
    const randomStat = (base: number, variance: number = 20) => base + Math.random() * variance;

    const base: FieldPlayer = {
      id,
      position,
      location,
      velocity: { x: 0, y: 0 },
      speed: randomStat(70),
      acceleration: randomStat(70),
      route,
      // Universal physical attributes
      strength: randomStat(70),
      agility: randomStat(70),
      awareness: randomStat(65, 25),
    };

    // Position-specific stats
    if (position === 'QB') {
      base.accuracy = randomStat(65, 25);
      base.armStrength = randomStat(65, 25);
      base.carrying = randomStat(50, 30); // QBs have lower carrying by default
      base.elusiveness = randomStat(55, 30);
    }

    // Skill positions - receivers
    if (['WR', 'TE'].includes(position)) {
      base.catch = randomStat(60, 30);
      base.routeRunning = randomStat(65, 25);
      base.elusiveness = randomStat(60, 30);
      base.carrying = randomStat(55, 25);
    }

    // Running backs
    if (['RB', 'FB'].includes(position)) {
      base.catch = randomStat(55, 30);
      base.carrying = randomStat(70, 25);
      base.elusiveness = randomStat(65, 30);
      base.routeRunning = randomStat(50, 30);
      base.runBlock = position === 'FB' ? randomStat(65, 25) : randomStat(45, 30);
    }

    // Offensive line
    if (['LT', 'LG', 'C', 'RG', 'RT'].includes(position)) {
      base.passBlock = randomStat(70, 25);
      base.runBlock = randomStat(70, 25);
      base.strength = randomStat(80, 15); // OL are stronger
    }

    // Defensive line
    if (['DE', 'DT', 'NT'].includes(position)) {
      base.passRush = randomStat(70, 25);
      base.tackle = randomStat(70, 25);
      base.strength = randomStat(80, 15); // DL are stronger
    }

    // Linebackers
    if (['OLB', 'MLB', 'ILB'].includes(position)) {
      base.passRush = randomStat(60, 30);
      base.tackle = randomStat(75, 20);
      base.coverage = randomStat(55, 30);
    }

    // Secondary (DBs)
    if (['CB', 'FS', 'SS'].includes(position)) {
      base.catch = randomStat(40, 35);
      base.coverage = randomStat(70, 25);
      base.tackle = randomStat(55, 30);
      base.speed = randomStat(75, 20); // DBs are faster
    }

    return base;
  }

  // SNAP AND PLAY EXECUTION
  snap(): void {
    if (this.state.phase !== 'PRE_SNAP') return;

    this.state.phase = 'SNAP';
    this.state.clock.isRunning = true;
    this.currentTime = 0;
    this.clockAccumulator = 0;
    this.pendingHandoff = null;

    // Find QB for ball position and pocket center (don't assume player[0])
    // Support both lowercase 'qb' (default formation) and uppercase 'QB' (Play Designer)
    const qb = this.state.offensivePlayers.find(p => p.id.toLowerCase() === 'qb' || p.position === 'QB');
    this.state.ballCarrier = qb?.id || 'qb'; // Use actual QB id, not hardcoded
    this.state.ballLocation = qb ? { ...qb.location } : { ...this.state.offensivePlayers[0].location };

    // Store pocket center for scramble detection
    if (qb) {
      this.pocketCenter = { ...qb.location };
    }

    // Check for run play with designated ball carrier (for handoff)
    const isRunPlay = this.currentPlay?.type === 'RUN' || this.originalPlay?.playType === 'RUN';
    if (isRunPlay && this.originalPlay) {
      const ballCarrierAssignment = this.originalPlay.assignments.find(a => a.isBallCarrier);
      if (ballCarrierAssignment && ballCarrierAssignment.positionSlot.toLowerCase() !== 'qb') {
        // Schedule handoff to RB after brief delay (0.25 seconds for handoff timing)
        this.pendingHandoff = {
          targetId: ballCarrierAssignment.positionSlot,
          handoffTime: 0.25,
        };
      }
    }

    // Initialize route runner for all receivers
    this.routeRunner.reset();
    this.state.offensivePlayers.forEach(player => {
      if (player.route && player.route !== 'BLOCK') {
        this.routeRunner.initializeRoute(player, this.currentTime);
      }
    });

    // Initialize defense AI with proper coverage scheme
    this.defenseAI.reset();
    if (this.currentDefense) {
      const los = this.yardLineToY(this.state.field.yardLine);
      this.defenseAI.initializeDefense(
        this.state.defensivePlayers,
        this.currentDefense,
        los,
        this.state.offensivePlayers
      );
      this.defenseAI.onSnap(this.currentTime);
    }

    this.tickInterval = window.setInterval(() => this.tick(), 1000 / TICK_RATE);
    this.emitState();
  }

  // Pending handoff for run plays
  private pendingHandoff: { targetId: string; handoffTime: number } | null = null;

  private tick(): void {
    if (this.state.phase === 'WHISTLE') {
      this.stopTick();
      return;
    }

    this.currentTime += 1 / TICK_RATE;
    this.updateClock();

    // Process pending handoff for run plays
    if (this.pendingHandoff && this.currentTime >= this.pendingHandoff.handoffTime) {
      this.executeHandoff(this.pendingHandoff.targetId);
      this.pendingHandoff = null;
    }

    // Update QB status for both AI systems
    const qb = this.getQB();
    if (qb) {
      this.routeRunner.updateQBStatus(qb.location, this.pocketCenter, this.currentTime);
      this.defenseAI.updateGameState(
        qb.location,
        this.pocketCenter,
        !!this.state.passFlight,
        this.state.ballLocation,
        this.state.ballCarrier || null,
        this.currentTime
      );
    }

    // Handle ball in flight
    if (this.state.passFlight) {
      this.updatePassFlight();
    } else {
      this.updatePlayerPositions();
      this.checkCollisions();
    }

    this.emitState();
  }

  private executeHandoff(targetSlot: string): void {
    // Find the target player by slot (case-insensitive)
    const target = this.state.offensivePlayers.find(
      p => p.id.toLowerCase() === targetSlot.toLowerCase() || p.position === targetSlot
    );
    if (target) {
      this.state.ballCarrier = target.id;
      this.state.ballLocation = { ...target.location };
      // Trigger handoff visual effect at the RB's position
      this.state.handoffEffect = {
        x: target.location.x,
        y: target.location.y,
        startTime: this.currentTime,
      };

      // Give RB initial momentum based on run play type
      const runScheme = this.originalPlay?.runBlockingScheme;
      const playName = this.originalPlay?.name?.toLowerCase() || '';
      const center = FIELD_WIDTH / 2;

      // Determine initial direction based on play
      let initialDir: Vector2 = { x: 0, y: -1 }; // Default: straight upfield

      if (runScheme === 'OUTSIDE_ZONE' || playName.includes('sweep') || playName.includes('toss')) {
        // Outside runs - run toward the sideline first, then upfield
        // Choose the side with more space or where the play is designed to go
        const distFromLeft = target.location.x;
        const distFromRight = FIELD_WIDTH - target.location.x;

        if (distFromRight > distFromLeft) {
          // More space on right, go right
          initialDir = { x: 0.8, y: -0.6 };
        } else {
          // More space on left, go left
          initialDir = { x: -0.8, y: -0.6 };
        }
      } else if (playName.includes('counter') || playName.includes('trap')) {
        // Counter/trap - fake one way, go the other
        initialDir = target.location.x > center
          ? { x: -0.5, y: -0.9 }  // Go left
          : { x: 0.5, y: -0.9 };  // Go right
      } else if (playName.includes('draw')) {
        // Draw - delayed handoff, go straight up the middle
        initialDir = { x: 0, y: -1 };
      } else {
        // Inside runs (dive, zone, etc.) - straight up with slight variation
        const gapOffset = (Math.random() - 0.5) * 0.3;
        initialDir = { x: gapOffset, y: -1 };
      }

      // Normalize and set initial velocity
      const mag = Math.sqrt(initialDir.x ** 2 + initialDir.y ** 2);
      const speedRating = target.speed || 75;
      const initialSpeed = (speedRating / 100) * 0.5; // Half speed to start

      target.velocity = {
        x: (initialDir.x / mag) * initialSpeed,
        y: (initialDir.y / mag) * initialSpeed,
      };

      // Set player input to continue in this direction momentarily
      this.playerInput = { x: initialDir.x / mag, y: initialDir.y / mag };
      this.lastInputTime = this.currentTime;
    }
  }

  private updateClock(): void {
    // Decrement game clock (simplified - 1 real second = ~3 game seconds)
    // Use an accumulator to avoid floating point issues
    this.clockAccumulator += 3 / TICK_RATE;

    // Only decrement when we've accumulated a full second
    if (this.clockAccumulator >= 1) {
      const secondsToSubtract = Math.floor(this.clockAccumulator);
      this.clockAccumulator -= secondsToSubtract;
      this.state.clock.seconds -= secondsToSubtract;

      while (this.state.clock.seconds < 0) {
        this.state.clock.seconds += 60;
        this.state.clock.minutes--;
      }
    }
  }

  private updatePlayerPositions(): void {
    const qb = this.getQB();
    const isQBHoldingBall = this.isQB(this.state.ballCarrier);

    // Get pass rushers for O-Line to block
    const passRushers = this.state.defensivePlayers.filter(p =>
      ['DE', 'DT', 'NT'].includes(p.position)
    );

    // Get O-Line for blocking
    const oLinemen = this.state.offensivePlayers.filter(p =>
      ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.position)
    );

    // Determine if this is a run play (ball carrier is not QB)
    const isRunPlay = this.state.ballCarrier && !this.isQB(this.state.ballCarrier);
    const ballCarrier = isRunPlay ? this.getPlayer(this.state.ballCarrier!) : null;

    // Update offensive players using RouteRunner
    this.state.offensivePlayers.forEach(player => {
      // Skip QB and ball carrier
      if (this.isQB(player.id) || player.id === this.state.ballCarrier) return;

      // O-Line blocking behavior
      if (['LT', 'LG', 'C', 'RG', 'RT'].includes(player.position)) {
        if (isRunPlay && ballCarrier) {
          // RUN BLOCKING: Scheme-specific blocking behavior
          const runScheme = this.originalPlay?.runBlockingScheme || 'INSIDE_ZONE';
          const playSide = ballCarrier.velocity.x > 0.1 ? 'RIGHT' : ballCarrier.velocity.x < -0.1 ? 'LEFT' : 'CENTER';

          // Get blocker's run blocking effectiveness (0.6-1.1 range for ratings 40-99)
          const runBlockRating = player.runBlock ?? 70;
          const strengthRating = player.strength ?? 70;
          const blockEffectiveness = 0.6 + ((runBlockRating * 0.7 + strengthRating * 0.3) / 100) * 0.5;

          // Find nearest defender to block
          const nearbyDefenders = this.state.defensivePlayers.filter(d => {
            const distToCarrier = this.distance(d.location, ballCarrier.location);
            return distToCarrier < 50;
          });

          const targetDefender = this.findNearestPlayer(player.location, nearbyDefenders.length > 0 ? nearbyDefenders : passRushers);

          if (targetDefender) {
            const dist = this.distance(player.location, targetDefender.location);

            // Defender's resistance - strong/high-tackle defenders are harder to block
            const defStrength = targetDefender.strength ?? 70;
            const defTackle = targetDefender.tackle ?? 70;
            const defResistance = (defStrength * 0.6 + defTackle * 0.4) / 100;

            // Push effectiveness = blocker skill vs defender resistance
            const pushPower = Math.max(0.05, (blockEffectiveness - defResistance * 0.5) * 0.4);

            if (runScheme === 'OUTSIDE_ZONE') {
              // OUTSIDE ZONE: Reach blocks - move laterally first, then engage
              const reachDir = playSide === 'RIGHT' ? 1 : playSide === 'LEFT' ? -1 : 0;

              if (dist > 8) {
                // Reach toward play side while moving to defender
                const dir = this.normalize({
                  x: (targetDefender.location.x - player.location.x) + reachDir * 5,
                  y: targetDefender.location.y - player.location.y,
                });
                const moveSpeed = 0.35 + blockEffectiveness * 0.15; // 0.44-0.52 based on rating
                player.location.x += dir.x * moveSpeed;
                player.location.y += dir.y * moveSpeed;
              } else {
                // Engaged - seal defender to backside
                const sealDir = { x: reachDir * 0.7, y: 0.7 };
                player.location.x = targetDefender.location.x - sealDir.x * 5;
                player.location.y = targetDefender.location.y - sealDir.y * 3;
                // Push defender to backside - scaled by blocking skill
                targetDefender.location.x -= reachDir * pushPower;
                targetDefender.location.y += pushPower * 0.75;
              }
            } else if (runScheme === 'POWER') {
              // POWER: Pulling guards, down blocks
              const isPullingGuard = (player.position === 'RG' && playSide === 'LEFT')
                || (player.position === 'LG' && playSide === 'RIGHT');

              if (isPullingGuard) {
                // Pull around to lead block - speed based on agility/awareness
                const pullSpeed = 0.5 + blockEffectiveness * 0.15;
                const pullTarget = {
                  x: ballCarrier.location.x + (playSide === 'RIGHT' ? 10 : -10),
                  y: ballCarrier.location.y + 5,
                };
                const pullDir = this.normalize({
                  x: pullTarget.x - player.location.x,
                  y: pullTarget.y - player.location.y,
                });
                player.location.x += pullDir.x * pullSpeed;
                player.location.y += pullDir.y * pullSpeed;
              } else {
                // Down block - drive defender down
                if (dist > 8) {
                  const dir = this.normalize({
                    x: targetDefender.location.x - player.location.x,
                    y: targetDefender.location.y - player.location.y,
                  });
                  const moveSpeed = 0.4 + blockEffectiveness * 0.15;
                  player.location.x += dir.x * moveSpeed;
                  player.location.y += dir.y * moveSpeed;
                } else {
                  // Drive block down
                  const downDir = playSide === 'RIGHT' ? -1 : 1;
                  player.location.x = targetDefender.location.x + downDir * 3;
                  player.location.y = targetDefender.location.y;
                  targetDefender.location.x += downDir * pushPower;
                }
              }
            } else {
              // INSIDE ZONE: Double teams and combos to linebacker
              if (dist > 8) {
                const dir = this.normalize({
                  x: targetDefender.location.x - player.location.x,
                  y: targetDefender.location.y - player.location.y,
                });
                const moveSpeed = 0.4 + blockEffectiveness * 0.15;
                player.location.x += dir.x * moveSpeed;
                player.location.y += dir.y * moveSpeed;
              } else {
                // Drive block - push straight ahead
                const toBallCarrier = this.normalize({
                  x: ballCarrier.location.x - targetDefender.location.x,
                  y: ballCarrier.location.y - targetDefender.location.y,
                });
                const pushDir = { x: -toBallCarrier.x, y: Math.max(0.3, -toBallCarrier.y) };
                player.location.x = targetDefender.location.x + pushDir.x * 5;
                player.location.y = targetDefender.location.y + pushDir.y * 5;
                targetDefender.location.x += pushDir.x * pushPower;
                targetDefender.location.y += pushDir.y * pushPower;
              }
            }
          }
        } else {
          // PASS PROTECTION: Protect the pocket
          const nearestRusher = this.findNearestPlayer(player.location, passRushers);
          if (nearestRusher) {
            const dist = this.distance(player.location, nearestRusher.location);

            // Get blocker's pass blocking effectiveness
            const passBlockRating = player.passBlock ?? 70;
            const strengthRating = player.strength ?? 70;
            const awarenessRating = player.awareness ?? 70;
            // Awareness helps recognize blitzes, strength helps anchor, passBlock is technique
            const blockEffectiveness = (passBlockRating * 0.5 + strengthRating * 0.3 + awarenessRating * 0.2) / 100;

            // Rusher's pass rush ability
            const rusherPassRush = nearestRusher.passRush ?? 70;
            const rusherStrength = nearestRusher.strength ?? 70;
            const rusherSpeed = nearestRusher.speed ?? 70;
            const rushEffectiveness = (rusherPassRush * 0.5 + rusherStrength * 0.25 + rusherSpeed * 0.25) / 100;

            if (dist > 6) {
              // Move toward rusher quickly to engage before they get past
              const dir = this.normalize({
                x: nearestRusher.location.x - player.location.x,
                y: nearestRusher.location.y - player.location.y,
              });
              // O-line moves to intercept - speed based on awareness (recognition)
              const interceptSpeed = 0.3 + (awarenessRating / 100) * 0.2; // 0.44-0.5 based on awareness
              player.location.x += dir.x * interceptSpeed;
              player.location.y += dir.y * interceptSpeed;
            } else {
              // Once engaged, mirror the rusher's position to stay in front
              const toQB = qb ? this.normalize({
                x: qb.location.x - nearestRusher.location.x,
                y: qb.location.y - nearestRusher.location.y,
              }) : { x: 0, y: -1 };

              // Position between rusher and QB - better blockers maintain position better
              // If rusher is winning, they push the blocker back
              const blockWinMargin = blockEffectiveness - rushEffectiveness;
              const anchorDistance = 4 + blockWinMargin * 3; // 3-5 units based on matchup
              player.location.x = nearestRusher.location.x + toQB.x * Math.max(2, anchorDistance);
              player.location.y = nearestRusher.location.y + toQB.y * Math.max(2, anchorDistance);

              // If pass rusher is winning, they can push the blocker back toward QB
              if (blockWinMargin < 0 && qb) {
                const pushback = Math.abs(blockWinMargin) * 0.08;
                nearestRusher.location.x += toQB.x * pushback;
                nearestRusher.location.y += toQB.y * pushback;
              }
            }
          }
        }
        return;
      }

      // Get movement from RouteRunner for receivers
      if (player.route && player.route !== 'BLOCK') {
        const movement = this.routeRunner.getMovementVector(
          player,
          this.currentTime,
          this.state.defensivePlayers
        );
        player.velocity = movement;
        const effectiveSpeed = this.getEffectiveSpeed(player);
        player.location.x += movement.x * (effectiveSpeed / 100);
        player.location.y += movement.y * (effectiveSpeed / 100);

        // Keep in bounds
        player.location.x = Math.max(5, Math.min(FIELD_WIDTH - 5, player.location.x));
      }
    });

    // Update defensive players
    // Speed scale: 0.5 units/tick = 30 units/sec = 10 yards/sec (realistic NFL speed)
    this.state.defensivePlayers.forEach(defender => {
      const isPassRusher = ['DE', 'DT', 'NT'].includes(defender.position);
      const isCoverage = ['CB', 'FS', 'SS', 'OLB', 'MLB', 'ILB'].includes(defender.position);

      if (isQBHoldingBall && isPassRusher && qb) {
        // Pass rush with blocking
        this.moveDefenderWithBlocking(defender, qb.location, oLinemen);
      } else if (isQBHoldingBall && isCoverage) {
        // Use DefenseAI for coverage
        const movement = this.defenseAI.getMovementVector(
          defender,
          this.state.offensivePlayers,
          this.currentTime
        );
        defender.velocity = movement;
        // Realistic speed: ~10 yards/sec max, modified by fatigue
        const effectiveSpeed = this.getEffectiveSpeed(defender);
        const speedMult = (effectiveSpeed / 100) * 0.5;
        defender.location.x += movement.x * speedMult;
        defender.location.y += movement.y * speedMult;
      } else if (this.state.ballCarrier && !this.isQB(this.state.ballCarrier)) {
        // Ball is out - everyone pursues at realistic speed
        const carrier = this.getPlayer(this.state.ballCarrier);
        if (carrier) {
          const dir = this.normalize({
            x: carrier.location.x - defender.location.x,
            y: carrier.location.y - defender.location.y,
          });
          // Pursuit speed - slightly faster than coverage (players sprint harder), modified by fatigue
          const effectiveSpeed = this.getEffectiveSpeed(defender);
          const speedMult = (effectiveSpeed / 100) * 0.6;
          defender.location.x += dir.x * speedMult;
          defender.location.y += dir.y * speedMult;
        }
      }

      // Keep in bounds
      defender.location.x = Math.max(5, Math.min(FIELD_WIDTH - 5, defender.location.x));
    });

    // Update ball carrier physics (User Control or CPU Control)
    if (this.state.ballCarrier) {
      const carrier = this.getPlayer(this.state.ballCarrier);
      if (carrier) {
        if (this.cpuControlEnabled) {
          // CPU controls the ball carrier - simple AI
          this.updateCPUBallCarrier(carrier);
        } else {
          // Reset input if stale (> 0.3s) to prevent stuck controls - increased from 0.15s
          if (this.currentTime - this.lastInputTime > 0.3) {
            this.playerInput = { x: 0, y: 0 };
          }

          // Handle active evasion moves
          if (this.evasionState.active) {
            this.updateEvasionMove(carrier);
          } else {
            // Normal movement physics with improved feel
            this.updateNormalMovement(carrier);
          }
        }

        // Keep in bounds
        carrier.location.x = Math.max(5, Math.min(FIELD_WIDTH - 5, carrier.location.x));
        carrier.location.y = Math.max(5, Math.min(FIELD_HEIGHT - 5, carrier.location.y));

        // Sync ball location
        this.state.ballLocation = { ...carrier.location };
      }
    }
  }

  // CPU AI for controlling the ball carrier when user is on defense
  private updateCPUBallCarrier(carrier: FieldPlayer): void {
    const isQB = this.isQB(carrier.id);

    if (isQB && this.state.phase === 'SNAP') {
      // QB behavior: look for open receiver or scramble
      const receivers = this.state.offensivePlayers.filter(p =>
        ['WR', 'TE', 'RB'].includes(p.position) && p.id !== carrier.id
      );

      // Check if any receiver is open (no defender within 15 units)
      const openReceiver = receivers.find(r => {
        const nearestDefender = this.getNearestDefender(r.location);
        return nearestDefender && this.distance(r.location, nearestDefender.location) > 15;
      });

      // Check for pressure (defender within 10 units of QB)
      const qbPressure = this.state.defensivePlayers.some(d =>
        this.distance(carrier.location, d.location) < 10
      );

      // After 2 seconds or under pressure with open receiver, throw
      if ((this.currentTime > 2 || qbPressure) && openReceiver) {
        // Add some inaccuracy
        const targetX = openReceiver.location.x + (Math.random() - 0.5) * 10;
        const targetY = openReceiver.location.y + (Math.random() - 0.5) * 10;
        this.throwToSpot({ x: targetX, y: targetY });
        return;
      }

      // After 3 seconds, scramble or throw it away
      if (this.currentTime > 3) {
        if (qbPressure) {
          // Throw it away (out of bounds)
          this.throwToSpot({ x: -10, y: carrier.location.y });
        } else if (openReceiver) {
          // Throw to open receiver
          this.throwToSpot({ x: openReceiver.location.x, y: openReceiver.location.y });
        }
        return;
      }

      // Pocket movement - stay in pocket but avoid pressure
      const nearestRusher = this.state.defensivePlayers.find(d =>
        ['DE', 'DT'].includes(d.position) && this.distance(carrier.location, d.location) < 20
      );

      if (nearestRusher) {
        // Move away from pressure
        const awayDir = this.normalize({
          x: carrier.location.x - nearestRusher.location.x,
          y: Math.min(0, carrier.location.y - nearestRusher.location.y), // Don't go forward
        });
        this.playerInput = awayDir;
        this.lastInputTime = this.currentTime;
        this.updateNormalMovement(carrier);
      }
    } else {
      // Ball carrier (after handoff or catch) - run toward endzone avoiding defenders
      // Find gaps between defenders
      const nearDefenders = this.state.defensivePlayers.filter(d =>
        this.distance(carrier.location, d.location) < 40
      );

      let moveDir: Vector2 = { x: 0, y: 1 }; // Default: run straight upfield

      if (nearDefenders.length > 0) {
        // Find the best lane - where there are fewer defenders
        const leftDensity = nearDefenders.filter(d => d.location.x < carrier.location.x).length;
        const rightDensity = nearDefenders.filter(d => d.location.x > carrier.location.x).length;

        if (leftDensity < rightDensity) {
          moveDir = { x: -0.3, y: 1 }; // Drift left
        } else if (rightDensity < leftDensity) {
          moveDir = { x: 0.3, y: 1 }; // Drift right
        }

        // Check for immediate threats (within 12 units)
        const immediateThreat = nearDefenders.find(d =>
          this.distance(carrier.location, d.location) < 12
        );

        if (immediateThreat) {
          // Try to avoid - cut opposite direction
          const cutDir = immediateThreat.location.x > carrier.location.x ? -1 : 1;
          moveDir = { x: cutDir * 0.8, y: 0.6 };
        }
      }

      // Normalize and apply
      const mag = Math.sqrt(moveDir.x ** 2 + moveDir.y ** 2);
      this.playerInput = { x: moveDir.x / mag, y: moveDir.y / mag };
      this.lastInputTime = this.currentTime;
      this.updateNormalMovement(carrier);
    }
  }

  private updateNormalMovement(carrier: FieldPlayer): void {
    // Physics constants - matched to defender speed scale
    // Defenders move at ~0.5 units/tick, ball carrier should be similar (slightly faster)
    const baseMaxSpeed = 0.7; // ~12 yards/sec max (slightly faster than defenders)
    const maxSpeed = (carrier.speed / 100) * baseMaxSpeed;
    const baseAccel = 0.08; // Reasonable acceleration
    const accel = (carrier.acceleration / 100) * baseAccel;

    // Apply input to velocity with acceleration curve
    if (this.playerInput.x !== 0 || this.playerInput.y !== 0) {
      // Calculate desired velocity direction
      const inputMag = Math.sqrt(this.playerInput.x ** 2 + this.playerInput.y ** 2);
      const normInputX = this.playerInput.x / inputMag;
      const normInputY = this.playerInput.y / inputMag;

      // Apply acceleration
      carrier.velocity.x += normInputX * accel * inputMag;
      carrier.velocity.y += normInputY * accel * inputMag;

      // Allow quick direction changes
      if (Math.sign(carrier.velocity.x) !== Math.sign(normInputX) && normInputX !== 0) {
        carrier.velocity.x *= 0.8;
      }
      if (Math.sign(carrier.velocity.y) !== Math.sign(normInputY) && normInputY !== 0) {
        carrier.velocity.y *= 0.8;
      }
    } else {
      // Friction when no input
      carrier.velocity.x *= 0.9;
      carrier.velocity.y *= 0.9;

      // Stop completely when very slow
      if (Math.abs(carrier.velocity.x) < 0.02) carrier.velocity.x = 0;
      if (Math.abs(carrier.velocity.y) < 0.02) carrier.velocity.y = 0;
    }

    // Cap speed to max rating
    const currentSpeed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);
    if (currentSpeed > maxSpeed) {
      const ratio = maxSpeed / currentSpeed;
      carrier.velocity.x *= ratio;
      carrier.velocity.y *= ratio;
    }

    // Apply velocity to position
    carrier.location.x += carrier.velocity.x;
    carrier.location.y += carrier.velocity.y;
  }

  private updateEvasionMove(carrier: FieldPlayer): void {
    const elapsed = this.currentTime - this.evasionState.startTime;

    if (elapsed >= this.evasionState.duration) {
      // End evasion move
      this.evasionState.active = false;
      this.evasionState.type = null;
      return;
    }

    const progress = elapsed / this.evasionState.duration;
    const evasionSpeed = (carrier.speed / 100) * 5; // Faster during evasion

    switch (this.evasionState.type) {
      case 'JUKE': {
        // Quick lateral cut - fast sideways movement
        const jukePhase = Math.sin(progress * Math.PI);
        carrier.velocity.x = this.evasionState.direction.x * evasionSpeed * jukePhase;
        carrier.velocity.y = this.evasionState.direction.y * evasionSpeed * 0.3;
        break;
      }

      case 'SPIN': {
        // 360 spin move - circular motion with forward momentum
        const spinAngle = progress * Math.PI * 2;
        const spinRadius = 3;
        carrier.velocity.x = Math.cos(spinAngle) * spinRadius + this.evasionState.direction.x * 2;
        carrier.velocity.y = Math.sin(spinAngle) * spinRadius + this.evasionState.direction.y * 2;
        break;
      }

      case 'DIVE': {
        // Forward dive - burst of speed forward
        const diveBoost = (1 - progress) * evasionSpeed * 1.5;
        carrier.velocity.x = this.evasionState.direction.x * diveBoost;
        carrier.velocity.y = this.evasionState.direction.y * diveBoost;
        break;
      }
    }

    // Apply velocity
    carrier.location.x += carrier.velocity.x;
    carrier.location.y += carrier.velocity.y;
  }

  private moveDefenderWithBlocking(defender: FieldPlayer, target: Vector2, blockers: FieldPlayer[]): void {
    // Find nearest blocker
    const nearestBlocker = this.findNearestPlayer(defender.location, blockers);
    const minDist = nearestBlocker ? this.distance(defender.location, nearestBlocker.location) : Infinity;

    const dir = this.normalize({
      x: target.x - defender.location.x,
      y: target.y - defender.location.y,
    });

    // Defender's pass rush ability
    const passRushRating = defender.passRush ?? 70;
    const defStrength = defender.strength ?? 70;
    const defSpeed = defender.speed ?? 70;
    // Pass rush combines technique, power, and speed
    const rushSkill = (passRushRating * 0.5 + defStrength * 0.25 + defSpeed * 0.25) / 100;

    // Base speed scaled by defender's speed rating
    let speedMult = (defSpeed / 100) * 0.5;

    // If blocker is engaged (within 8 units = ~2.7 yards), they're blocking
    if (nearestBlocker && minDist < 8) {
      // Get blocker's pass blocking skill
      const blockerPassBlock = nearestBlocker.passBlock ?? 70;
      const blockerStrength = nearestBlocker.strength ?? 70;
      const blockSkill = (blockerPassBlock * 0.6 + blockerStrength * 0.4) / 100;

      // Win rate determines how stuck the defender is
      const winMargin = rushSkill - blockSkill;

      // Base is 90% reduction when blocked, but elite rushers can shed blocks faster
      const blockReduction = Math.max(0.05, 0.1 + winMargin * 0.3); // 5-25% speed when blocked
      speedMult *= blockReduction;

      // Push battle - winner moves the other player
      const pushDir = this.normalize({
        x: defender.location.x - nearestBlocker.location.x,
        y: defender.location.y - nearestBlocker.location.y,
      });

      if (winMargin > 0) {
        // Rusher winning - push blocker back
        nearestBlocker.location.x -= pushDir.x * winMargin * 0.1;
        nearestBlocker.location.y -= pushDir.y * winMargin * 0.1;
      } else {
        // Blocker winning - rusher gets pushed
        defender.location.x += pushDir.x * Math.abs(winMargin) * 0.05;
        defender.location.y += pushDir.y * Math.abs(winMargin) * 0.05;
      }
    } else if (nearestBlocker && minDist < 15) {
      // Approaching blocker - slow down as they engage
      // Better rushers maintain more speed approaching
      const engageFactor = (minDist - 8) / 7; // 0 at dist 8, 1 at dist 15
      const baseSlowdown = 0.1 + rushSkill * 0.15; // 0.17-0.25 at engagement based on rush skill
      speedMult *= baseSlowdown + engageFactor * (0.5 - baseSlowdown);
    }

    defender.location.x += dir.x * speedMult;
    defender.location.y += dir.y * speedMult;
  }

  private checkCollisions(): void {
    const carrier = this.getPlayer(this.state.ballCarrier || '');
    if (!carrier) return;

    const isQBCarrier = this.isQB(this.state.ballCarrier);
    const los = this.yardLineToY(this.state.field.yardLine);

    // Calculate carrier speed for tackle difficulty
    const carrierSpeed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);

    // Check for tackles/sacks
    // Field scale: 3 units = 1 yard, so 5 units ≈ 1.7 yards (realistic tackle range)
    for (const defender of this.state.defensivePlayers) {
      const dist = this.distance(carrier.location, defender.location);

      // Tackle threshold: 5 units (~1.7 yards) - must be right on the ball carrier
      if (dist < 5) {
        // Calculate skill-based tackle probability
        const tackleChance = this.calculateTackleChance(carrier, defender, carrierSpeed, dist);

        if (Math.random() < tackleChance) {
          if (isQBCarrier && carrier.location.y <= los) {
            // Sack! QB tackled at or behind LOS
            this.resolveSack(defender.id);
          } else {
            // Check for fumble on big hit
            const fumbleChance = this.calculateBigHitFumbleChance(carrier, defender, carrierSpeed);
            const isFumble = Math.random() < fumbleChance;

            if (isFumble) {
              // Fumble! Turnover
              this.endPlay(false, false, defender.id, true, false, 'FUMBLE');
            } else {
              this.endPlay(false, false, defender.id);
            }
          }
          return; // Only one tackle per frame
        }
      }
    }

    // Check for touchdown
    const carrierYardLine = this.yToYardLine(carrier.location.y);
    if (carrierYardLine >= 100) {
      this.endPlay(true, false);
    }

    // Check for safety (tackled in own endzone)
    if (carrierYardLine <= 0) {
      this.resolveSafety();
    }

    // Check for out of bounds
    if (carrier.location.x < 0 || carrier.location.x > FIELD_WIDTH) {
      this.endPlay(false, true);
    }
  }

  private calculateTackleChance(
    carrier: FieldPlayer,
    defender: FieldPlayer,
    carrierSpeed: number,
    distance: number
  ): number {
    // Base tackle chance based on proximity (closer = higher chance)
    // At distance 5: low chance, at distance 1: high chance
    const proximityFactor = 1 - (distance / 5);
    const baseChance = 0.4 + proximityFactor * 0.4; // 40-80% base range when in contact

    // Defender tackling ability - use tackle rating with strength as secondary factor
    // tackle: primary skill, strength: helps finish tackles
    const tackleRating = defender.tackle ?? 70;
    const strengthRating = defender.strength ?? 70;
    const defenderSkill = (tackleRating * 0.7 + strengthRating * 0.3) / 100;

    // Carrier evasion ability - use elusiveness rating with speed/agility as factors
    const elusivenessRating = carrier.elusiveness ?? 70;
    const agilityRating = carrier.agility ?? 70;
    const carrierEvasion = (elusivenessRating * 0.6 + agilityRating * 0.25 + carrier.speed * 0.15) / 100;

    // Speed penalty - harder to tackle a fast-moving carrier
    const speedPenalty = Math.min(carrierSpeed / 8, 0.3); // Up to 30% penalty for max speed

    // Strength differential - strong defenders can muscle through, strong carriers break tackles
    const carrierStrength = carrier.strength ?? 70;
    const strengthDiff = (strengthRating - carrierStrength) / 200; // -0.15 to +0.15 range

    // Evasion move bonus - effectiveness scaled by carrier's elusiveness
    let evasionBonus = 0;
    if (this.evasionState.active) {
      const elusivenessMultiplier = 0.7 + (elusivenessRating / 100) * 0.6; // 0.7-1.3x based on elusiveness
      switch (this.evasionState.type) {
        case 'JUKE':
          evasionBonus = 0.35 * elusivenessMultiplier; // 24-46% reduction based on elusiveness
          break;
        case 'SPIN':
          evasionBonus = 0.45 * elusivenessMultiplier; // 31-59% reduction - spins are very effective
          break;
        case 'DIVE':
          evasionBonus = 0.18 * elusivenessMultiplier; // 13-23% reduction - dives are more about distance
          break;
      }
    }

    // Calculate final tackle probability
    let tackleChance = baseChance * (1 + (defenderSkill - carrierEvasion) * 0.6);
    tackleChance += strengthDiff; // Strength advantage/disadvantage
    tackleChance -= speedPenalty;
    tackleChance -= evasionBonus;

    // Clamp between 5% and 95%
    return Math.max(0.05, Math.min(0.95, tackleChance));
  }

  /**
   * Calculate fumble chance on a big hit
   * Big hits occur when defender has high tackle+strength vs carrier's ball security
   * Fumbles are rare - base ~1.5%, modified by ratings
   */
  private calculateBigHitFumbleChance(
    carrier: FieldPlayer,
    defender: FieldPlayer,
    carrierSpeed: number
  ): number {
    // Hit power: tackle (70%) + strength (30%) - how hard the defender hits
    const tackleRating = defender.tackle ?? 70;
    const defenderStrength = defender.strength ?? 70;
    const hitPower = tackleRating * 0.7 + defenderStrength * 0.3;

    // Ball security: carrying rating is primary, strength helps hold on
    const carryingRating = carrier.carrying ?? 70;
    const carrierStrength = carrier.strength ?? 70;
    const ballSecurity = carryingRating * 0.8 + carrierStrength * 0.2;

    // Speed factor: higher carrier speed = more vulnerable (momentum transfers)
    // Speed is in game units, normalize to 0-1 range (max speed ~6-8)
    const speedVulnerability = Math.min(carrierSpeed / 7, 1) * 0.015; // Up to 1.5% extra

    // Base fumble chance: 1.5%
    // Modified by hit power vs ball security differential
    // Each point of difference = 0.03% change
    const ratingDiff = (hitPower - ballSecurity) / 100;
    const baseFumble = 0.015;

    // Calculate final fumble chance
    // Elite ball carrier (95 carrying) vs average hitter (70): ~0.7% fumble
    // Average carrier (70 carrying) vs elite hitter (95): ~2.3% fumble
    let fumbleChance = baseFumble + ratingDiff * 0.025 + speedVulnerability;

    // Big hit threshold: only trigger fumble check if defender has significant hit power
    // If hit power is below 60, almost no fumble chance
    if (hitPower < 60) {
      fumbleChance *= 0.3; // 70% reduction for weak hitters
    }

    // Elite ball security (90+) provides extra protection
    if (carryingRating >= 90) {
      fumbleChance *= 0.6; // 40% reduction for elite ball carriers
    }

    // Add fatigue-based fumble increase
    // Exhausted players (85+ fatigue) can add up to 3% extra fumble chance
    const fatigueFumbleBonus = this.getFatigueFumbleBonus(carrier.id);
    fumbleChance += fatigueFumbleBonus;

    // Clamp between 0.2% and 6% (higher cap with fatigue)
    // Even the worst case should be rare, even the best should have some chance
    return Math.max(0.002, Math.min(0.06, fumbleChance));
  }

  private resolveSack(defenderId: string): void {
    this.stopTick();
    this.state.phase = 'WHISTLE';

    // Track for penalty detection
    this.qbWasSacked = true;

    const startYardLine = this.state.field.yardLine;
    const carrier = this.getQB();
    const endYardLine = carrier ? this.yToYardLine(carrier.location.y) : startYardLine;
    const yardsLost = startYardLine - endYardLine;

    // Check for roughing the passer penalty
    const playContext: PlayContext = {
      playType: 'PASS',
      down: this.state.field.down,
      yardsToGo: this.state.field.yardsToGo,
      yardLine: this.state.field.yardLine,
      passInAir: this.passWasThrown,
      qbSacked: true,
      qbScrambling: false,
    };

    const penalty = this.penaltyEngine.checkPlayPenalty(playContext);
    if (penalty && penalty.type === 'ROUGHING_THE_PASSER') {
      const penaltyCalc = this.penaltyEngine.calculatePenaltyResult(
        penalty,
        startYardLine,
        this.state.field.down,
        this.state.field.yardsToGo,
        -yardsLost
      );

      this.state.lastResult = {
        yardsGained: -yardsLost,
        turnover: false,
        touchdown: false,
        outOfBounds: false,
        incomplete: false,
        sack: true,
        tackledBy: defenderId,
        penalty: {
          type: penalty.type,
          team: penalty.team,
          yards: penalty.yards,
          description: penalty.description,
          accepted: true,
          automaticFirstDown: penalty.automatic_first_down,
        },
      };

      // Apply penalty
      this.state.field.yardLine = penaltyCalc.newYardLine;
      this.state.field.down = penaltyCalc.newDown;
      this.state.field.yardsToGo = penaltyCalc.newYardsToGo;

      this.resetPenaltyTracking();
      this.emitState();
      return;
    }

    this.state.lastResult = {
      yardsGained: -yardsLost,
      turnover: false,
      touchdown: false,
      outOfBounds: false,
      incomplete: false,
      sack: true,
      tackledBy: defenderId,
    };

    this.advanceFieldPosition(-yardsLost, false, false);
    this.resetPenaltyTracking();
    this.emitState();
  }

  private resolveSafety(): void {
    this.stopTick();
    this.state.phase = 'WHISTLE';

    this.state.lastResult = {
      yardsGained: -(this.state.field.yardLine),
      turnover: false,
      touchdown: false,
      outOfBounds: false,
      incomplete: false,
      sack: this.isQB(this.state.ballCarrier),
      safety: true,
    };

    // Award 2 points to defense
    const opponent = this.state.field.possession === 'home' ? 'away' : 'home';
    this.state.score[opponent] += 2;

    this.state.clock.isRunning = false;
    this.emitState();
  }

  // PLAYER CONTROLS
  moveBallCarrier(direction: Vector2): void {
    if (this.state.phase !== 'SNAP' && this.state.phase !== 'ACTIVE') return;
    if (this.cpuControlEnabled) return; // Ignore player input when CPU is controlling

    this.playerInput = direction;
    this.lastInputTime = this.currentTime;
  }

  // Enable/disable CPU control of ball carrier (for defense mode)
  enableCPUControl(enabled: boolean): void {
    this.cpuControlEnabled = enabled;
  }

  // EVASION MOVES
  juke(): void {
    if (!this.canPerformEvasion()) return;

    const carrier = this.getPlayer(this.state.ballCarrier || '');
    if (!carrier) return;

    // Juke laterally based on current movement direction
    const lateralDir = carrier.velocity.x >= 0 ? 1 : -1;
    // Alternate juke direction if already moving that way
    const jukeDir = Math.abs(carrier.velocity.x) > Math.abs(carrier.velocity.y)
      ? { x: 0, y: lateralDir }  // Juke perpendicular to movement
      : { x: lateralDir, y: 0 };

    this.startEvasion('JUKE', jukeDir, 0.2); // 200ms juke
  }

  spin(): void {
    if (!this.canPerformEvasion()) return;

    const carrier = this.getPlayer(this.state.ballCarrier || '');
    if (!carrier) return;

    // Spin in direction of current velocity
    const speed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);
    const spinDir = speed > 0.5
      ? { x: carrier.velocity.x / speed, y: carrier.velocity.y / speed }
      : { x: 0, y: -1 }; // Default to upfield

    this.startEvasion('SPIN', spinDir, 0.35); // 350ms spin
  }

  dive(): void {
    if (!this.canPerformEvasion()) return;

    const carrier = this.getPlayer(this.state.ballCarrier || '');
    if (!carrier) return;

    // Dive in direction of current velocity or input
    let diveDir: Vector2;
    if (this.playerInput.x !== 0 || this.playerInput.y !== 0) {
      const inputMag = Math.sqrt(this.playerInput.x ** 2 + this.playerInput.y ** 2);
      diveDir = { x: this.playerInput.x / inputMag, y: this.playerInput.y / inputMag };
    } else {
      const speed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);
      diveDir = speed > 0.5
        ? { x: carrier.velocity.x / speed, y: carrier.velocity.y / speed }
        : { x: 0, y: -1 }; // Default to upfield
    }

    this.startEvasion('DIVE', diveDir, 0.25); // 250ms dive
  }

  private canPerformEvasion(): boolean {
    if (this.state.phase !== 'SNAP' && this.state.phase !== 'ACTIVE') return false;
    if (!this.state.ballCarrier) return false;
    if (this.evasionState.active) return false;
    if (this.currentTime < this.evasionState.cooldownEnd) return false;
    return true;
  }

  private startEvasion(type: 'JUKE' | 'SPIN' | 'DIVE', direction: Vector2, duration: number): void {
    this.evasionState = {
      active: true,
      type,
      startTime: this.currentTime,
      duration,
      direction,
      cooldownEnd: this.currentTime + duration + 0.3, // 300ms cooldown after move
    };
  }

  throwToSpot(clickLocation: Vector2): void {
    if (this.state.phase !== 'SNAP') return;

    const qb = this.getQB();
    if (!qb) return;

    // Check for throwaway (out of bounds)
    if (clickLocation.x < 0 || clickLocation.x > FIELD_WIDTH) {
      this.state.lastResult = {
        yardsGained: 0,
        turnover: false,
        touchdown: false,
        outOfBounds: true,
        incomplete: true,
        sack: false,
      };
      this.state.phase = 'WHISTLE';
      this.stopTick();
      this.emitState();
      return;
    }

    // Calculate landing spot with accuracy offset
    const accuracy = qb.accuracy || 70;
    let maxOffset = this.getAccuracyRadius(accuracy);

    // Scramble accuracy penalty - throwing on the run is harder
    const isScrambling = !this.isQBInPocket(qb);
    if (isScrambling) {
      // Penalty based on QB speed (faster = harder to throw accurately)
      const velocity = Math.sqrt(qb.velocity.x ** 2 + qb.velocity.y ** 2);
      const movementPenalty = velocity * 3; // Up to ~10 yards extra inaccuracy at full sprint

      // Awareness helps mitigate scramble penalty
      const awarenessRating = qb.awareness ?? 70;
      const penaltyReduction = (awarenessRating - 50) / 100; // 0-0.5 reduction based on awareness
      maxOffset += movementPenalty * (1 - penaltyReduction);
    }

    const angle = Math.random() * Math.PI * 2;
    const offsetDist = Math.random() * maxOffset;

    const landingSpot: Vector2 = {
      x: clickLocation.x + Math.cos(angle) * offsetDist,
      y: clickLocation.y + Math.sin(angle) * offsetDist,
    };

    // Calculate air time based on distance and arm strength
    const distance = this.distance(qb.location, landingSpot);
    const armStrength = qb.armStrength || 70;
    const baseAirTime = this.calculateAirTime(distance, armStrength);

    // Find intended target (nearest receiver to click)
    const intendedTarget = this.getNearestReceiver(clickLocation);

    this.state.passFlight = {
      startLocation: { ...qb.location },
      landingSpot,
      airTime: baseAirTime,
      elapsedTime: 0,
      intendedTarget: intendedTarget?.id,
    };

    // Track for penalty detection
    this.passWasThrown = true;
    this.qbWasScrambling = isScrambling;

    this.state.ballCarrier = undefined;
    this.state.phase = 'ACTIVE';
    this.emitState();
  }

  private getAccuracyRadius(accuracy: number): number {
    return 45 - (accuracy * 0.42);
  }

  private isQBInPocket(qb: FieldPlayer): boolean {
    // Check if QB is within pocket area (near original snap position)
    const distFromPocket = this.distance(qb.location, this.pocketCenter);
    return distFromPocket < 20; // Within ~7 yards of pocket center
  }

  private calculateAirTime(distance: number, armStrength: number): number {
    const baseTime = 0.3 + (distance / 100);
    const armFactor = 1.3 - (armStrength / 150);
    return Math.max(0.3, baseTime * armFactor);
  }

  private getNearestReceiver(location: Vector2): FieldPlayer | undefined {
    const receivers = this.state.offensivePlayers.filter(p =>
      ['WR', 'TE', 'RB'].includes(p.position)
    );

    let nearest: FieldPlayer | undefined;
    let minDist = Infinity;

    receivers.forEach(r => {
      const dist = this.distance(location, r.location);
      if (dist < minDist) {
        minDist = dist;
        nearest = r;
      }
    });

    return nearest;
  }

  private updatePassFlight(): void {
    if (!this.state.passFlight) return;

    const pass = this.state.passFlight;
    pass.elapsedTime += 1 / TICK_RATE;

    // Interpolate ball position with parabolic arc
    const t = Math.min(pass.elapsedTime / pass.airTime, 1);

    // Base linear interpolation for X/Y (field position)
    const baseX = pass.startLocation.x + (pass.landingSpot.x - pass.startLocation.x) * t;
    const baseY = pass.startLocation.y + (pass.landingSpot.y - pass.startLocation.y) * t;

    // Calculate ball arc height (parabola: peaks at t=0.5)
    // Height based on distance - longer throws have higher arcs
    const distance = this.distance(pass.startLocation, pass.landingSpot);
    const maxHeight = Math.min(distance * 0.15, 30); // Max ~10 yards height
    const arcHeight = 4 * maxHeight * t * (1 - t); // Parabola formula

    this.state.ballLocation = {
      x: baseX,
      y: baseY - arcHeight, // Subtract because negative Y is upfield/up
    };

    // Store arc height for visualization (if needed)
    (pass as PassFlight & { arcHeight?: number }).arcHeight = arcHeight;

    // Move receivers and defenders toward landing spot
    this.adjustPlayersToPass(pass.landingSpot);

    // Ball has landed
    if (pass.elapsedTime >= pass.airTime) {
      this.resolvePassLanding();
    }
  }

  private adjustPlayersToPass(landingSpot: Vector2): void {
    const intendedTarget = this.state.passFlight?.intendedTarget;

    // Only the intended target adjusts to the ball - others continue routes
    this.state.offensivePlayers.forEach(player => {
      if (!['WR', 'TE', 'RB'].includes(player.position) || player.route === 'BLOCK') {
        return;
      }

      const distToBall = this.distance(player.location, landingSpot);
      const isTarget = player.id === intendedTarget;
      const isNearBall = distToBall < 30; // Within ~10 yards

      if (isTarget || isNearBall) {
        // Target or nearby receiver adjusts to ball
        const dir = this.normalize({
          x: landingSpot.x - player.location.x,
          y: landingSpot.y - player.location.y,
        });
        const catchAbility = player.catch || 70;
        const effectiveSpeed = this.getEffectiveSpeed(player);
        const adjustSpeed = (effectiveSpeed / 100) * (catchAbility / 100);
        // Target moves faster toward ball, nearby receivers slower
        const speedMult = isTarget ? 1.5 : 0.6;
        player.location.x += dir.x * adjustSpeed * speedMult;
        player.location.y += dir.y * adjustSpeed * speedMult;
      } else {
        // Other receivers continue their routes normally
        const movement = this.routeRunner.getMovementVector(
          player,
          this.currentTime,
          this.state.defensivePlayers
        );
        const effectiveSpeed = this.getEffectiveSpeed(player);
        player.location.x += movement.x * (effectiveSpeed / 100) * 0.5;
        player.location.y += movement.y * (effectiveSpeed / 100) * 0.5;
      }
    });

    // Defenders react to ball in air (DefenseAI handles this via REACT_BALL phase)
    this.state.defensivePlayers.forEach(defender => {
      const movement = this.defenseAI.getMovementVector(
        defender,
        this.state.offensivePlayers,
        this.currentTime
      );
      const effectiveSpeed = this.getEffectiveSpeed(defender);
      defender.location.x += movement.x * (effectiveSpeed / 100) * 0.8;
      defender.location.y += movement.y * (effectiveSpeed / 100) * 0.8;
    });
  }

  private resolvePassLanding(): void {
    const pass = this.state.passFlight!;
    const landingSpot = pass.landingSpot;

    // Find nearest receiver and defender to landing spot
    const nearestReceiver = this.getNearestReceiver(landingSpot);
    const nearestDefender = this.getNearestDefender(landingSpot);

    const receiverDist = nearestReceiver ? this.distance(landingSpot, nearestReceiver.location) : Infinity;
    const defenderDist = nearestDefender ? this.distance(landingSpot, nearestDefender.location) : Infinity;

    const catchRadius = 15;

    // Nobody close enough - incompletion
    if (receiverDist > catchRadius && defenderDist > catchRadius) {
      this.state.lastResult = {
        yardsGained: 0,
        turnover: false,
        touchdown: false,
        outOfBounds: false,
        incomplete: true,
        sack: false,
      };
      this.state.phase = 'WHISTLE';
      this.state.passFlight = undefined;
      this.stopTick();
      this.emitState();
      return;
    }

    // Receiver has clear catch
    if (receiverDist <= catchRadius && defenderDist > catchRadius + 10) {
      const catchRating = nearestReceiver!.catch || 70;
      const dropChance = 0.25 - (catchRating / 500);

      if (Math.random() < dropChance) {
        this.state.lastResult = {
          yardsGained: 0,
          turnover: false,
          touchdown: false,
          outOfBounds: false,
          incomplete: true,
          sack: false,
        };
        this.state.phase = 'WHISTLE';
        this.state.passFlight = undefined;
        this.stopTick();
        this.emitState();
        return;
      }

      this.completeCatch(nearestReceiver!);
      return;
    }

    // Contested catch
    if (receiverDist <= catchRadius) {
      this.resolveContestedCatch(nearestReceiver!, nearestDefender, receiverDist, defenderDist);
    } else {
      this.resolveDefenderOnly(nearestDefender!);
    }
  }

  private completeCatch(receiver: FieldPlayer): void {
    this.state.ballCarrier = receiver.id;
    this.state.ballLocation = { ...receiver.location };
    this.state.passFlight = undefined;

    // YAC (Yards After Catch) - preserve momentum based on receiver's route direction
    // Better receivers (speed, agility) maintain more momentum through the catch
    const speedRating = receiver.speed ?? 70;
    const agilityRating = receiver.agility ?? 70;
    const yacAbility = (speedRating * 0.6 + agilityRating * 0.4) / 100;

    // Base speed from route direction, scaled by YAC ability
    const baseSpeed = 0.3 + yacAbility * 0.25; // 0.44-0.55 base momentum

    // Preserve route direction as initial velocity, modified by fatigue
    const routeVelocity = this.normalize(receiver.velocity);
    const effectiveSpeed = this.getEffectiveSpeed(receiver);
    receiver.velocity = {
      x: routeVelocity.x * baseSpeed * (effectiveSpeed / 70),
      y: routeVelocity.y * baseSpeed * (effectiveSpeed / 70),
    };

    // If receiver was moving upfield, boost that direction (natural catch and run)
    if (receiver.velocity.y > 0) {
      receiver.velocity.y *= 1.2; // Boost upfield momentum
    }
  }

  private resolveContestedCatch(
    receiver: FieldPlayer,
    defender: FieldPlayer | undefined,
    receiverDist: number,
    defenderDist: number
  ): void {
    // Receiver catching ability
    const receiverCatch = receiver.catch ?? 70;
    const receiverStrength = receiver.strength ?? 70;

    // Defender abilities - coverage is key for contested catches
    const defenderCatch = defender?.catch ?? 50;
    const defenderCoverage = defender?.coverage ?? 60;
    const defenderStrength = defender?.strength ?? 70;

    // Separation bonus (physical distance advantage)
    const separationBonus = Math.max(0, (defenderDist - receiverDist) / 25);

    // Strength battle for 50/50 balls - stronger player has advantage
    const strengthDiff = (receiverStrength - defenderStrength) / 200; // -0.15 to +0.15

    // Receiver catch rating bonus
    const catchBonus = (receiverCatch - 70) / 150; // -0.13 to +0.19

    // Base catch chance with all factors
    let catchChance = 0.25 + separationBonus + catchBonus + strengthDiff;

    // INT chance - coverage rating is the primary factor for defenders
    // Elite coverage (90+) can create more INTs, poor coverage (50) struggles
    const coverageSkill = defenderCoverage / 100;
    const intBaseChance = 0.08 + coverageSkill * 0.08; // 0.12-0.16 range for good coverage

    // Reduce INT chance based on separation
    const intChance = Math.max(0.02, intBaseChance - separationBonus * 0.5);

    // Defender catch ability affects whether they can actually haul it in
    const intSuccessRate = (defenderCatch + defenderCoverage) / 200; // 0.5-0.95

    const roll = Math.random();

    if (roll < catchChance) {
      this.completeCatch(receiver);
    } else if (roll > (1 - intChance * intSuccessRate)) {
      this.state.lastResult = {
        yardsGained: 0,
        turnover: true,
        turnoverType: 'INTERCEPTION',
        touchdown: false,
        outOfBounds: false,
        incomplete: false,
        sack: false,
      };
      this.state.phase = 'WHISTLE';
      this.state.passFlight = undefined;
      this.stopTick();
      this.emitState();
    } else {
      this.state.lastResult = {
        yardsGained: 0,
        turnover: false,
        touchdown: false,
        outOfBounds: false,
        incomplete: true,
        sack: false,
      };
      this.state.phase = 'WHISTLE';
      this.state.passFlight = undefined;
      this.stopTick();
      this.emitState();
    }
  }

  private resolveDefenderOnly(defender: FieldPlayer): void {
    // Defender is the only one near the ball - can they pick it?
    const defenderCatch = defender.catch ?? 50;
    const defenderCoverage = defender.coverage ?? 60;

    // Coverage rating helps read the ball in the air, catch helps secure it
    // Elite coverage DBs (90+) with good hands (70+) are ball hawks
    const ballHawkSkill = (defenderCoverage * 0.6 + defenderCatch * 0.4) / 100;
    const intChance = 0.10 + ballHawkSkill * 0.12; // 0.16-0.22 for elite DBs

    if (Math.random() < intChance) {
      this.state.lastResult = {
        yardsGained: 0,
        turnover: true,
        turnoverType: 'INTERCEPTION',
        touchdown: false,
        outOfBounds: false,
        incomplete: false,
        sack: false,
      };
    } else {
      this.state.lastResult = {
        yardsGained: 0,
        turnover: false,
        touchdown: false,
        outOfBounds: false,
        incomplete: true,
        sack: false,
      };
    }

    this.state.phase = 'WHISTLE';
    this.state.passFlight = undefined;
    this.stopTick();
    this.emitState();
  }

  handoff(targetId: string): void {
    if (this.state.phase !== 'SNAP') return;

    this.state.ballCarrier = targetId;
    this.state.phase = 'ACTIVE';
    this.emitState();
  }

  // END PLAY
  private endPlay(
    touchdown: boolean,
    outOfBounds: boolean,
    tackledBy?: string,
    turnover?: boolean,
    safety?: boolean,
    turnoverType?: 'FUMBLE' | 'INTERCEPTION'
  ): void {
    this.stopTick();
    this.state.phase = 'WHISTLE';

    const startYardLine = this.state.field.yardLine;
    const carrier = this.getPlayer(this.state.ballCarrier || '');
    const endYardLine = carrier ? this.yToYardLine(carrier.location.y) : startYardLine;
    const yardsGained = endYardLine - startYardLine;

    // Check for penalties during the play (not on touchdowns or turnovers usually)
    let penaltyResult = undefined;
    if (!touchdown && !turnover && !safety) {
      const playContext: PlayContext = {
        playType: this.currentPlay?.type || 'PASS',
        down: this.state.field.down,
        yardsToGo: this.state.field.yardsToGo,
        yardLine: this.state.field.yardLine,
        passInAir: this.passWasThrown,
        qbSacked: this.qbWasSacked,
        qbScrambling: this.qbWasScrambling,
      };

      const penalty = this.penaltyEngine.checkPlayPenalty(playContext);
      if (penalty) {
        const penaltyCalc = this.penaltyEngine.calculatePenaltyResult(
          penalty,
          startYardLine,
          this.state.field.down,
          this.state.field.yardsToGo,
          yardsGained
        );

        penaltyResult = {
          type: penalty.type,
          team: penalty.team,
          yards: penalty.yards,
          description: penalty.description,
          accepted: true,  // Auto-accept for now
          automaticFirstDown: penalty.automatic_first_down,
        };

        // Apply penalty instead of normal advancement
        this.state.field.yardLine = penaltyCalc.newYardLine;
        this.state.field.down = penaltyCalc.newDown;
        this.state.field.yardsToGo = penaltyCalc.newYardsToGo;

        this.state.lastResult = {
          yardsGained,
          turnover: false,
          touchdown: false,
          outOfBounds,
          incomplete: false,
          sack: false,
          tackledBy,
          penalty: penaltyResult,
        };

        // Reset penalty tracking
        this.resetPenaltyTracking();
        this.emitState();
        return;
      }
    }

    this.state.lastResult = {
      yardsGained: safety ? -startYardLine : yardsGained,
      turnover: turnover || false,
      turnoverType,
      touchdown,
      outOfBounds,
      incomplete: false,
      sack: false,
      tackledBy,
    };

    // Update field position for next play
    if (!safety) {
      this.advanceFieldPosition(yardsGained, touchdown, turnover || false);
    }

    // Add fatigue to all players after the play
    this.addPlayFatigue(this.state.ballCarrier, tackledBy);

    // Reset penalty tracking
    this.resetPenaltyTracking();
    this.emitState();
  }

  private resetPenaltyTracking(): void {
    this.pendingPenalty = null;
    this.qbWasSacked = false;
    this.qbWasScrambling = false;
    this.passWasThrown = false;
  }

  private advanceFieldPosition(yards: number, touchdown: boolean, turnover: boolean): void {
    if (touchdown) {
      // Award 6 points for TD (PAT/2pt adds more)
      this.state.score[this.state.field.possession] += 6;
      // Set up for PAT attempt
      this.pendingPAT = true;
      this.state.field.yardLine = 97; // 2 yard line for 2pt, or ~15 for PAT kick
      this.state.field.down = 1;
      this.state.field.yardsToGo = 2;
      // Keep possession for PAT attempt
      return;
    }

    if (turnover) {
      this.state.field.possession = this.state.field.possession === 'home' ? 'away' : 'home';
      this.state.field.yardLine = 100 - this.state.field.yardLine;
      this.state.field.down = 1;
      this.state.field.yardsToGo = 10;
      return;
    }

    this.state.field.yardLine += yards;

    if (yards >= this.state.field.yardsToGo) {
      this.state.field.down = 1;
      this.state.field.yardsToGo = Math.min(10, 100 - this.state.field.yardLine);
    } else {
      this.state.field.down++;
      this.state.field.yardsToGo -= yards;

      if (this.state.field.down > 4) {
        this.state.field.possession = this.state.field.possession === 'home' ? 'away' : 'home';
        this.state.field.yardLine = 100 - this.state.field.yardLine;
        this.state.field.down = 1;
        this.state.field.yardsToGo = 10;
      }
    }
  }

  resetForNextPlay(): void {
    this.state.phase = 'HUDDLE';
    this.state.clock.playClock = 40;
    this.state.ballCarrier = undefined;
    this.state.passFlight = undefined;
    this.state.handoffEffect = undefined;
    this.state.selectedPlay = undefined;
    this.currentPlay = null;
    this.currentDefense = null;
    this.cpuControlEnabled = false; // Reset CPU control
    this.routeRunner.reset();
    this.defenseAI.reset();

    // Apply fatigue recovery between plays (average ~25 seconds between plays)
    const recoveryTime = 25;
    for (const player of this.state.offensivePlayers) {
      this.fatigueEngine.recoverFatigue(player.id, recoveryTime, true);
    }
    for (const player of this.state.defensivePlayers) {
      this.fatigueEngine.recoverFatigue(player.id, recoveryTime, true);
    }

    // Create huddle formations for next play
    this.state.offensivePlayers = this.createOffensiveHuddle(this.state.field.yardLine);
    this.state.defensivePlayers = this.createDefensiveHuddle(this.state.field.yardLine);
    this.emitState();
  }

  // KICKING PLAYS
  kickoff(kicker?: KickingRatings): KickResult {
    const result = this.kickingEngine.resolveKickoff(
      this.state.field.possession,
      kicker
    );

    this.lastKickResult = result;
    this.state.field.possession = result.possession;
    this.state.field.yardLine = result.newYardLine;
    this.state.field.down = 1;
    this.state.field.yardsToGo = 10;
    this.pendingKickoff = false;
    this.state.phase = 'PRE_SNAP';
    this.emitState();

    return result;
  }

  punt(punter?: KickingRatings): KickResult {
    const result = this.kickingEngine.resolvePunt(
      this.state.field.possession,
      this.state.field.yardLine,
      punter
    );

    this.lastKickResult = result;
    this.state.field.possession = result.possession;
    this.state.field.yardLine = result.newYardLine;
    this.state.field.down = 1;
    this.state.field.yardsToGo = 10;
    this.state.phase = 'PRE_SNAP';
    this.emitState();

    return result;
  }

  fieldGoal(kicker?: KickingRatings): KickResult {
    const result = this.kickingEngine.resolveFieldGoal(
      this.state.field.possession,
      this.state.field.yardLine,
      kicker
    );

    this.lastKickResult = result;

    if (result.success) {
      // Award 3 points
      this.state.score[this.state.field.possession] += 3;
      // Set up kickoff
      this.pendingKickoff = true;
      this.state.field.yardLine = 35;
    } else {
      // Turnover at spot of kick
      this.state.field.possession = result.possession;
      this.state.field.yardLine = result.newYardLine;
    }

    this.state.field.down = 1;
    this.state.field.yardsToGo = 10;
    this.state.phase = 'PRE_SNAP';
    this.emitState();

    return result;
  }

  attemptPAT(kicker?: KickingRatings): KickResult {
    const result = this.kickingEngine.resolvePAT(
      this.state.field.possession,
      kicker
    );

    this.lastKickResult = result;

    if (result.success) {
      this.state.score[this.state.field.possession] += 1;
    }

    // Set up kickoff after PAT (regardless of success)
    this.pendingKickoff = true;
    this.pendingPAT = false;
    this.state.field.possession = this.state.field.possession; // Keep possession for kickoff
    this.state.field.yardLine = 35;
    this.state.field.down = 1;
    this.state.field.yardsToGo = 10;
    this.state.phase = 'PRE_SNAP';
    this.emitState();

    return result;
  }

  attemptTwoPoint(): KickResult {
    const result = this.kickingEngine.resolveTwoPoint(this.state.field.possession);

    this.lastKickResult = result;

    if (result.success) {
      this.state.score[this.state.field.possession] += 2;
    }

    // Set up kickoff after 2pt (regardless of success)
    this.pendingKickoff = true;
    this.pendingPAT = false;
    this.state.field.yardLine = 35;
    this.state.field.down = 1;
    this.state.field.yardsToGo = 10;
    this.state.phase = 'PRE_SNAP';
    this.emitState();

    return result;
  }

  // Kicking decision helpers
  isInFieldGoalRange(kicker?: KickingRatings): boolean {
    return this.kickingEngine.isInFieldGoalRange(this.state.field.yardLine, kicker);
  }

  shouldPunt(): boolean {
    return this.kickingEngine.shouldPunt(
      this.state.field.down,
      this.state.field.yardsToGo,
      this.state.field.yardLine
    );
  }

  isPendingKickoff(): boolean {
    return this.pendingKickoff;
  }

  isPendingPAT(): boolean {
    return this.pendingPAT;
  }

  getLastKickResult(): KickResult | null {
    return this.lastKickResult;
  }

  // UTILITIES
  private getPlayer(id: string): FieldPlayer | undefined {
    return [...this.state.offensivePlayers, ...this.state.defensivePlayers]
      .find(p => p.id === id);
  }

  private getQB(): FieldPlayer | undefined {
    return this.state.offensivePlayers.find(p => p.id.toLowerCase() === 'qb' || p.position === 'QB');
  }

  private isQB(playerId: string | undefined): boolean {
    if (!playerId) return false;
    const qb = this.getQB();
    return qb?.id === playerId;
  }

  private getNearestDefender(location: Vector2): FieldPlayer | undefined {
    let nearest: FieldPlayer | undefined;
    let minDist = Infinity;

    this.state.defensivePlayers.forEach(d => {
      const dist = this.distance(location, d.location);
      if (dist < minDist) {
        minDist = dist;
        nearest = d;
      }
    });

    return nearest;
  }

  private distance(a: Vector2, b: Vector2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private findNearestPlayer(location: Vector2, players: FieldPlayer[]): FieldPlayer | null {
    let nearest: FieldPlayer | null = null;
    let minDist = Infinity;

    for (const player of players) {
      const dist = this.distance(location, player.location);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }

    return nearest;
  }

  private normalize(v: Vector2): Vector2 {
    const len = Math.sqrt(v.x ** 2 + v.y ** 2);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  }

  private yardLineToY(yardLine: number): number {
    return (yardLine + 10) * 3;
  }

  private yToYardLine(y: number): number {
    return Math.floor(y / 3) - 10;
  }

  private stopTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private emitState(): void {
    this.onStateChange({ ...this.state, currentTime: this.currentTime });
  }

  getState(): GameState {
    return { ...this.state };
  }

  destroy(): void {
    this.stopTick();
    this.routeRunner.reset();
    this.defenseAI.reset();
  }

  // FATIGUE SYSTEM

  /**
   * Get effective speed with fatigue applied
   */
  private getEffectiveSpeed(player: FieldPlayer): number {
    const modifiers = this.fatigueEngine.getModifiers(player.id);
    return (player.speed ?? 70) * modifiers.speedMultiplier;
  }

  /**
   * Get fatigue-based fumble increase for a player
   */
  private getFatigueFumbleBonus(playerId: string): number {
    const modifiers = this.fatigueEngine.getModifiers(playerId);
    return modifiers.fumbleChanceIncrease;
  }

  /**
   * Add fatigue to all players on the field after a play
   * Ball carrier and players who made tackles get more fatigue
   */
  private addPlayFatigue(ballCarrierId?: string, tackleBy?: string): void {
    // Add fatigue to offensive players
    for (const player of this.state.offensivePlayers) {
      const wasInvolved = player.id === ballCarrierId;
      this.fatigueEngine.addPlayFatigue(player.id, player.position || 'WR', wasInvolved);
    }

    // Add fatigue to defensive players
    for (const player of this.state.defensivePlayers) {
      const wasInvolved = player.id === tackleBy;
      this.fatigueEngine.addPlayFatigue(player.id, player.position || 'LB', wasInvolved);
    }
  }

  /**
   * Initialize fatigue tracking for all players at start of game/half
   */
  initializeFatigue(): void {
    this.fatigueEngine.reset();
    for (const player of this.state.offensivePlayers) {
      this.fatigueEngine.initPlayer(player.id, player.position || 'WR', true);
    }
    for (const player of this.state.defensivePlayers) {
      this.fatigueEngine.initPlayer(player.id, player.position || 'LB', true);
    }
  }

  /**
   * Apply halftime recovery to all players
   */
  halftimeFatigueRecovery(): void {
    this.fatigueEngine.halftimeRecovery();
  }

  /**
   * Get fatigue status for display in UI
   */
  getPlayerFatigueStatus(playerId: string): 'FRESH' | 'GOOD' | 'TIRED' | 'VERY_TIRED' | 'EXHAUSTED' {
    return this.fatigueEngine.getFatigueStatus(playerId);
  }

  /**
   * Get players who need substitution
   */
  getPlayersNeedingRest(): string[] {
    return this.fatigueEngine.getPlayerNeedingRest();
  }
}
