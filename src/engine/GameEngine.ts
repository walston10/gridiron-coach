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

  // Timing
  private currentTime: number = 0;
  private pocketCenter: Vector2 = { x: FIELD_WIDTH / 2, y: 0 };
  private currentPlay: OffensivePlay | null = null;
  private currentDefense: DefensivePlay | null = null;

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

  // Clock accumulator for smooth timing
  private clockAccumulator: number = 0;

  constructor(onStateChange: (state: GameState) => void) {
    this.onStateChange = onStateChange;
    this.state = this.createInitialState();
    this.routeRunner = new RouteRunner();
    this.defenseAI = new DefenseAI();
    this.kickingEngine = new KickingEngine(true); // Auto-resolve returns
  }

  private createInitialState(): GameState {
    return {
      phase: 'PRE_SNAP',
      clock: { quarter: 1, minutes: 15, seconds: 0, playClock: 40, isRunning: false },
      field: { yardLine: 25, down: 1, yardsToGo: 10, possession: 'home' },
      score: { home: 0, away: 0 },
      offensivePlayers: [],
      defensivePlayers: [],
      ballLocation: { x: FIELD_WIDTH / 2, y: 0 },
    };
  }

  // PLAY SETUP - Supports both OffensivePlay and UI Play types
  setOffensivePlay(play: OffensivePlay | Play): void {
    if ('assignments' in play) {
      // UI Play format - convert to engine format
      const converted = this.convertPlayToOffensive(play);
      this.state.selectedPlay = converted;
      this.currentPlay = converted;
      this.state.offensivePlayers = this.createOffensiveFormationFromPlay(play);
    } else {
      // Engine OffensivePlay format
      this.state.selectedPlay = play;
      this.currentPlay = play;
      this.state.offensivePlayers = this.createOffensiveFormation(play);
    }
    this.emitState();
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
    this.state.defensivePlayers = this.createDefensiveFormation(play);
    this.emitState();
  }

  private createOffensiveFormation(play: OffensivePlay): FieldPlayer[] {
    const los = this.yardLineToY(this.state.field.yardLine);
    const center = FIELD_WIDTH / 2;

    // Basic formation - positions will vary by formation type
    const players: FieldPlayer[] = [
      this.createPlayer('qb', 'QB', { x: center, y: los - 15 }, play.routes['QB']),
      this.createPlayer('rb', 'RB', { x: center, y: los - 30 }, play.routes['RB']),
      this.createPlayer('wr1', 'WR', { x: center - 60, y: los }, play.routes['WR1']),
      this.createPlayer('wr2', 'WR', { x: center + 60, y: los }, play.routes['WR2']),
      this.createPlayer('te', 'TE', { x: center + 25, y: los }, play.routes['TE']),
      this.createPlayer('lt', 'LT', { x: center - 20, y: los }),
      this.createPlayer('lg', 'LG', { x: center - 10, y: los }),
      this.createPlayer('c', 'C', { x: center, y: los }),
      this.createPlayer('rg', 'RG', { x: center + 10, y: los }),
      this.createPlayer('rt', 'RT', { x: center + 20, y: los }),
    ];

    if (play.formation === 'SHOTGUN') {
      players[0].location.y = los - 30; // QB deeper
      players.push(this.createPlayer('slot1', 'WR', { x: center - 35, y: los }, play.routes['SLOT1']));
    } else if (play.formation === 'I_FORM') {
      players.push(this.createPlayer('fb', 'FB', { x: center, y: los - 20 }, play.routes['FB']));
    }

    return players;
  }

  private createDefensiveFormation(play: DefensivePlay): FieldPlayer[] {
    const los = this.yardLineToY(this.state.field.yardLine);
    const center = FIELD_WIDTH / 2;

    const players: FieldPlayer[] = [];

    if (play.formation === '4_3') {
      // D-Line
      players.push(this.createPlayer('de1', 'DE', { x: center - 25, y: los + 5 }));
      players.push(this.createPlayer('dt1', 'DT', { x: center - 8, y: los + 5 }));
      players.push(this.createPlayer('dt2', 'DT', { x: center + 8, y: los + 5 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 25, y: los + 5 }));
      // Linebackers
      players.push(this.createPlayer('olb1', 'OLB', { x: center - 30, y: los + 15 }));
      players.push(this.createPlayer('mlb', 'MLB', { x: center, y: los + 15 }));
      players.push(this.createPlayer('olb2', 'OLB', { x: center + 30, y: los + 15 }));
      // Secondary
      players.push(this.createPlayer('cb1', 'CB', { x: center - 55, y: los + 10 }));
      players.push(this.createPlayer('cb2', 'CB', { x: center + 55, y: los + 10 }));
      players.push(this.createPlayer('fs', 'FS', { x: center - 15, y: los + 45 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 15, y: los + 35 }));
    } else if (play.formation === 'NICKEL') {
      // 4-2-5 nickel
      players.push(this.createPlayer('de1', 'DE', { x: center - 25, y: los + 5 }));
      players.push(this.createPlayer('dt1', 'DT', { x: center - 8, y: los + 5 }));
      players.push(this.createPlayer('dt2', 'DT', { x: center + 8, y: los + 5 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 25, y: los + 5 }));
      players.push(this.createPlayer('mlb1', 'MLB', { x: center - 12, y: los + 15 }));
      players.push(this.createPlayer('mlb2', 'MLB', { x: center + 12, y: los + 15 }));
      players.push(this.createPlayer('cb1', 'CB', { x: center - 55, y: los + 10 }));
      players.push(this.createPlayer('cb2', 'CB', { x: center + 55, y: los + 10 }));
      players.push(this.createPlayer('ncb', 'CB', { x: center - 35, y: los + 12 }));
      players.push(this.createPlayer('fs', 'FS', { x: center, y: los + 45 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 20, y: los + 35 }));
    } else if (play.formation === '3_4') {
      players.push(this.createPlayer('de1', 'DE', { x: center - 20, y: los + 5 }));
      players.push(this.createPlayer('nt', 'NT', { x: center, y: los + 5 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 20, y: los + 5 }));
      players.push(this.createPlayer('olb1', 'OLB', { x: center - 35, y: los + 12 }));
      players.push(this.createPlayer('ilb1', 'ILB', { x: center - 10, y: los + 15 }));
      players.push(this.createPlayer('ilb2', 'ILB', { x: center + 10, y: los + 15 }));
      players.push(this.createPlayer('olb2', 'OLB', { x: center + 35, y: los + 12 }));
      players.push(this.createPlayer('cb1', 'CB', { x: center - 55, y: los + 10 }));
      players.push(this.createPlayer('cb2', 'CB', { x: center + 55, y: los + 10 }));
      players.push(this.createPlayer('fs', 'FS', { x: center, y: los + 45 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 15, y: los + 35 }));
    } else {
      // Default 4-3
      players.push(this.createPlayer('de1', 'DE', { x: center - 25, y: los + 5 }));
      players.push(this.createPlayer('dt1', 'DT', { x: center - 8, y: los + 5 }));
      players.push(this.createPlayer('dt2', 'DT', { x: center + 8, y: los + 5 }));
      players.push(this.createPlayer('de2', 'DE', { x: center + 25, y: los + 5 }));
      players.push(this.createPlayer('olb1', 'OLB', { x: center - 30, y: los + 15 }));
      players.push(this.createPlayer('mlb', 'MLB', { x: center, y: los + 15 }));
      players.push(this.createPlayer('olb2', 'OLB', { x: center + 30, y: los + 15 }));
      players.push(this.createPlayer('cb1', 'CB', { x: center - 55, y: los + 10 }));
      players.push(this.createPlayer('cb2', 'CB', { x: center + 55, y: los + 10 }));
      players.push(this.createPlayer('fs', 'FS', { x: center - 15, y: los + 45 }));
      players.push(this.createPlayer('ss', 'SS', { x: center + 15, y: los + 35 }));
    }

    return players;
  }

  private createPlayer(id: string, position: Position, location: Vector2, route?: RouteType): FieldPlayer {
    const base: FieldPlayer = {
      id,
      position,
      location,
      velocity: { x: 0, y: 0 },
      speed: 70 + Math.random() * 20,
      acceleration: 70 + Math.random() * 20,
      route,
    };

    // Position-specific stats
    if (position === 'QB') {
      base.accuracy = 65 + Math.random() * 25;
      base.armStrength = 65 + Math.random() * 25;
    }
    if (['WR', 'TE', 'RB'].includes(position)) {
      base.catch = 60 + Math.random() * 30;
    }
    if (['CB', 'FS', 'SS'].includes(position)) {
      base.catch = 40 + Math.random() * 35;
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

    // Find QB for ball position and pocket center (don't assume player[0])
    // Support both lowercase 'qb' (default formation) and uppercase 'QB' (Play Designer)
    const qb = this.state.offensivePlayers.find(p => p.id.toLowerCase() === 'qb' || p.position === 'QB');
    this.state.ballCarrier = qb?.id || 'qb'; // Use actual QB id, not hardcoded
    this.state.ballLocation = qb ? { ...qb.location } : { ...this.state.offensivePlayers[0].location };

    // Store pocket center for scramble detection
    if (qb) {
      this.pocketCenter = { ...qb.location };
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

  private tick(): void {
    if (this.state.phase === 'WHISTLE') {
      this.stopTick();
      return;
    }

    this.currentTime += 1 / TICK_RATE;
    this.updateClock();

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

    // Update offensive players using RouteRunner
    this.state.offensivePlayers.forEach(player => {
      // Skip QB and ball carrier
      if (this.isQB(player.id) || player.id === this.state.ballCarrier) return;

      // O-Line actively blocks nearest pass rusher
      if (['LT', 'LG', 'C', 'RG', 'RT'].includes(player.position)) {
        const nearestRusher = this.findNearestPlayer(player.location, passRushers);
        if (nearestRusher) {
          const dist = this.distance(player.location, nearestRusher.location);
          if (dist > 5) {
            // Move toward rusher to engage
            const dir = this.normalize({
              x: nearestRusher.location.x - player.location.x,
              y: nearestRusher.location.y - player.location.y,
            });
            player.location.x += dir.x * 0.8;
            player.location.y += dir.y * 0.8;
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
        player.location.x += movement.x * (player.speed / 100);
        player.location.y += movement.y * (player.speed / 100);

        // Keep in bounds
        player.location.x = Math.max(5, Math.min(FIELD_WIDTH - 5, player.location.x));
      }
    });

    // Update defensive players
    this.state.defensivePlayers.forEach(defender => {
      const isPassRusher = ['DE', 'DT', 'NT'].includes(defender.position);
      const isCoverage = ['CB', 'FS', 'SS', 'OLB', 'MLB', 'ILB'].includes(defender.position);

      if (isQBHoldingBall && isPassRusher && qb) {
        // Pass rush with blocking
        this.moveDefenderWithBlocking(defender, qb.location, oLinemen);
      } else if (isQBHoldingBall && isCoverage) {
        // Use DefenseAI for coverage - increased speed multiplier
        const movement = this.defenseAI.getMovementVector(
          defender,
          this.state.offensivePlayers,
          this.currentTime
        );
        defender.velocity = movement;
        const speedMult = (defender.speed / 80) * 1.5; // Faster movement
        defender.location.x += movement.x * speedMult;
        defender.location.y += movement.y * speedMult;
      } else if (this.state.ballCarrier && this.state.ballCarrier !== 'qb') {
        // Ball is out - everyone pursues
        const carrier = this.getPlayer(this.state.ballCarrier);
        if (carrier) {
          const dir = this.normalize({
            x: carrier.location.x - defender.location.x,
            y: carrier.location.y - defender.location.y,
          });
          defender.location.x += dir.x * (defender.speed / 80) * 2;
          defender.location.y += dir.y * (defender.speed / 80) * 2;
        }
      }

      // Keep in bounds
      defender.location.x = Math.max(5, Math.min(FIELD_WIDTH - 5, defender.location.x));
    });

    // Update ball carrier physics (User Control)
    if (this.state.ballCarrier) {
      const carrier = this.getPlayer(this.state.ballCarrier);
      if (carrier) {
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

        // Keep in bounds
        carrier.location.x = Math.max(5, Math.min(FIELD_WIDTH - 5, carrier.location.x));
        carrier.location.y = Math.max(5, Math.min(FIELD_HEIGHT - 5, carrier.location.y));

        // Sync ball location
        this.state.ballLocation = { ...carrier.location };
      }
    }
  }

  private updateNormalMovement(carrier: FieldPlayer): void {
    // Physics constants derived from player stats - tuned for responsiveness
    const baseMaxSpeed = 4.0; // Increased base speed
    const maxSpeed = (carrier.speed / 100) * baseMaxSpeed;
    const baseAccel = 0.45; // Much higher acceleration for snappy feel
    const accel = (carrier.acceleration / 100) * baseAccel;

    // Apply input to velocity with acceleration curve
    if (this.playerInput.x !== 0 || this.playerInput.y !== 0) {
      // Calculate desired velocity direction
      const inputMag = Math.sqrt(this.playerInput.x ** 2 + this.playerInput.y ** 2);
      const normInputX = this.playerInput.x / inputMag;
      const normInputY = this.playerInput.y / inputMag;

      // Apply acceleration with slight curve for responsiveness
      const currentSpeed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);
      const speedRatio = currentSpeed / maxSpeed;

      // Faster acceleration at low speeds, slower near max speed
      const accelMult = 1.0 + (1.0 - speedRatio) * 0.5;

      carrier.velocity.x += normInputX * accel * accelMult * inputMag;
      carrier.velocity.y += normInputY * accel * accelMult * inputMag;

      // Allow quick direction changes - reduce velocity in opposite direction faster
      if (Math.sign(carrier.velocity.x) !== Math.sign(normInputX) && normInputX !== 0) {
        carrier.velocity.x *= 0.85;
      }
      if (Math.sign(carrier.velocity.y) !== Math.sign(normInputY) && normInputY !== 0) {
        carrier.velocity.y *= 0.85;
      }
    } else {
      // Friction with progressive deceleration - faster stop when slow
      const currentSpeed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);
      const frictionFactor = currentSpeed > 1 ? 0.92 : 0.8;
      carrier.velocity.x *= frictionFactor;
      carrier.velocity.y *= frictionFactor;

      // Stop completely when very slow
      if (Math.abs(carrier.velocity.x) < 0.1) carrier.velocity.x = 0;
      if (Math.abs(carrier.velocity.y) < 0.1) carrier.velocity.y = 0;
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

    let speedMult = defender.speed / 100;

    // If blocker is engaged, slow down rusher
    if (nearestBlocker && minDist < 15) {
      const blockStrength = 0.6 - (defender.speed - 70) / 100;
      speedMult *= Math.max(0.2, blockStrength);

      // Blocker gets pushed back slightly
      nearestBlocker.location.x += dir.x * 0.3;
      nearestBlocker.location.y += dir.y * 0.3;
    }

    defender.location.x += dir.x * speedMult * 1.5;
    defender.location.y += dir.y * speedMult * 1.5;
  }

  private checkCollisions(): void {
    const carrier = this.getPlayer(this.state.ballCarrier || '');
    if (!carrier) return;

    const isQBCarrier = this.isQB(this.state.ballCarrier);
    const los = this.yardLineToY(this.state.field.yardLine);

    // Calculate carrier speed for tackle difficulty
    const carrierSpeed = Math.sqrt(carrier.velocity.x ** 2 + carrier.velocity.y ** 2);

    // Check for tackles/sacks with improved collision detection
    for (const defender of this.state.defensivePlayers) {
      const dist = this.distance(carrier.location, defender.location);

      // Increased collision threshold from 8 to 15 for more reliable contact
      if (dist < 15) {
        // Calculate skill-based tackle probability
        const tackleChance = this.calculateTackleChance(carrier, defender, carrierSpeed, dist);

        if (Math.random() < tackleChance) {
          if (isQBCarrier && carrier.location.y <= los) {
            // Sack! QB tackled at or behind LOS
            this.resolveSack(defender.id);
          } else {
            this.endPlay(false, false, defender.id);
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
    // At distance 15: low chance, at distance 5: high chance
    const proximityFactor = 1 - (distance / 15);
    const baseChance = 0.3 + proximityFactor * 0.5; // 30-80% base range

    // Defender tackling ability (use speed as proxy for now, ideally would have tackle rating)
    const defenderSkill = defender.speed / 100; // 0.7-0.9 typically

    // Carrier evasion ability (speed + acceleration as proxy for elusiveness)
    const carrierEvasion = (carrier.speed + carrier.acceleration) / 200;

    // Speed penalty - harder to tackle a fast-moving carrier
    const speedPenalty = Math.min(carrierSpeed / 8, 0.3); // Up to 30% penalty for max speed

    // Evasion move bonus - much harder to tackle during juke/spin/dive
    let evasionBonus = 0;
    if (this.evasionState.active) {
      switch (this.evasionState.type) {
        case 'JUKE':
          evasionBonus = 0.4; // 40% reduction in tackle chance
          break;
        case 'SPIN':
          evasionBonus = 0.5; // 50% reduction - spins are very effective
          break;
        case 'DIVE':
          evasionBonus = 0.2; // 20% reduction - dives are more about distance
          break;
      }
    }

    // Calculate final tackle probability
    let tackleChance = baseChance * (1 + (defenderSkill - carrierEvasion) * 0.5);
    tackleChance -= speedPenalty;
    tackleChance -= evasionBonus;

    // Clamp between 10% and 95%
    return Math.max(0.1, Math.min(0.95, tackleChance));
  }

  private resolveSack(defenderId: string): void {
    this.stopTick();
    this.state.phase = 'WHISTLE';

    const startYardLine = this.state.field.yardLine;
    const carrier = this.getQB();
    const endYardLine = carrier ? this.yToYardLine(carrier.location.y) : startYardLine;
    const yardsLost = startYardLine - endYardLine;

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

    this.playerInput = direction;
    this.lastInputTime = this.currentTime;
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
    const maxOffset = this.getAccuracyRadius(accuracy);
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

    this.state.ballCarrier = undefined;
    this.state.phase = 'ACTIVE';
    this.emitState();
  }

  private getAccuracyRadius(accuracy: number): number {
    return 45 - (accuracy * 0.42);
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

    // Interpolate ball position
    const t = Math.min(pass.elapsedTime / pass.airTime, 1);
    this.state.ballLocation = {
      x: pass.startLocation.x + (pass.landingSpot.x - pass.startLocation.x) * t,
      y: pass.startLocation.y + (pass.landingSpot.y - pass.startLocation.y) * t,
    };

    // Move receivers and defenders toward landing spot
    this.adjustPlayersToPass(pass.landingSpot);

    // Ball has landed
    if (pass.elapsedTime >= pass.airTime) {
      this.resolvePassLanding();
    }
  }

  private adjustPlayersToPass(landingSpot: Vector2): void {
    // Receivers adjust to ball
    this.state.offensivePlayers.forEach(player => {
      if (['WR', 'TE', 'RB'].includes(player.position) && player.route !== 'BLOCK') {
        const dir = this.normalize({
          x: landingSpot.x - player.location.x,
          y: landingSpot.y - player.location.y,
        });
        const catchAbility = player.catch || 70;
        const adjustSpeed = (player.speed / 100) * (catchAbility / 80);
        player.location.x += dir.x * adjustSpeed * 2;
        player.location.y += dir.y * adjustSpeed * 2;
      }
    });

    // Defenders react to ball in air (DefenseAI handles this via REACT_BALL phase)
    this.state.defensivePlayers.forEach(defender => {
      const movement = this.defenseAI.getMovementVector(
        defender,
        this.state.offensivePlayers,
        this.currentTime
      );
      defender.location.x += movement.x * (defender.speed / 100) * 1.2;
      defender.location.y += movement.y * (defender.speed / 100) * 1.2;
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

    // Convert normalized route velocity to physics velocity to preserve momentum
    const speedPerTick = (receiver.speed / 100) * 3.5;
    receiver.velocity.x *= speedPerTick;
    receiver.velocity.y *= speedPerTick;
  }

  private resolveContestedCatch(
    receiver: FieldPlayer,
    defender: FieldPlayer | undefined,
    receiverDist: number,
    defenderDist: number
  ): void {
    const receiverCatch = receiver.catch || 70;
    const defenderCatch = defender?.catch || 50;

    const separationBonus = Math.max(0, (defenderDist - receiverDist) / 30);
    const catchChance = 0.20 + separationBonus + (receiverCatch - 70) / 200;
    const intBaseChance = 0.10 - separationBonus / 2;

    const roll = Math.random();

    if (roll < catchChance) {
      this.completeCatch(receiver);
    } else if (roll > (1 - intBaseChance * (defenderCatch / 100))) {
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
    const defenderCatch = defender.catch || 50;
    const intChance = 0.15 * (defenderCatch / 100);

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
    safety?: boolean
  ): void {
    this.stopTick();
    this.state.phase = 'WHISTLE';

    const startYardLine = this.state.field.yardLine;
    const carrier = this.getPlayer(this.state.ballCarrier || '');
    const endYardLine = carrier ? this.yToYardLine(carrier.location.y) : startYardLine;
    const yardsGained = endYardLine - startYardLine;

    this.state.lastResult = {
      yardsGained: safety ? -startYardLine : yardsGained,
      turnover: turnover || false,
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
    this.emitState();
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
    this.state.phase = 'PRE_SNAP';
    this.state.clock.playClock = 40;
    this.state.ballCarrier = undefined;
    this.state.passFlight = undefined;
    this.state.offensivePlayers = [];
    this.state.defensivePlayers = [];
    this.state.selectedPlay = undefined;
    this.currentPlay = null;
    this.currentDefense = null;
    this.routeRunner.reset();
    this.defenseAI.reset();
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
    this.onStateChange({ ...this.state });
  }

  getState(): GameState {
    return { ...this.state };
  }

  destroy(): void {
    this.stopTick();
    this.routeRunner.reset();
    this.defenseAI.reset();
  }
}
