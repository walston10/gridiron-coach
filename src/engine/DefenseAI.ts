import type { Vector2, FieldPlayer, CoverageType, DefensivePlay, Position } from '../types/GameSim';

/**
 * Defense AI phases:
 * PRE_SNAP - Aligned in formation
 * READ - Reading the play (first 0.3 seconds)
 * EXECUTE - Running coverage/rush assignment
 * REACT_BALL - Ball is thrown, break on it
 * PURSUIT - Chasing ball carrier
 * SCRAMBLE_CONTAIN - QB left pocket, contain the edges
 */
export type DefensePhase = 'PRE_SNAP' | 'READ' | 'EXECUTE' | 'REACT_BALL' | 'PURSUIT' | 'SCRAMBLE_CONTAIN';

export interface DefenderState {
  phase: DefensePhase;
  assignment: DefenderAssignment;
  zoneBounds?: ZoneBounds;
  manTarget?: string; // Player ID for man coverage
  rushLane?: Vector2; // Direction for pass rushers
  lastKnownBallLocation: Vector2;
}

export interface DefenderAssignment {
  type: 'ZONE' | 'MAN' | 'RUSH' | 'SPY' | 'BLITZ';
  zone?: ZoneType;
  rushType?: 'INSIDE' | 'OUTSIDE' | 'BULL' | 'CONTAIN';
}

export type ZoneType =
  | 'FLAT_LEFT' | 'FLAT_RIGHT'           // Underneath sideline
  | 'CURL_LEFT' | 'CURL_RIGHT'           // Underneath middle-outside
  | 'HOOK_LEFT' | 'HOOK_RIGHT'           // Underneath middle
  | 'DEEP_THIRD_LEFT' | 'DEEP_THIRD_MID' | 'DEEP_THIRD_RIGHT'  // Cover 3 deep
  | 'DEEP_HALF_LEFT' | 'DEEP_HALF_RIGHT' // Cover 2 deep
  | 'DEEP_QUARTER_1' | 'DEEP_QUARTER_2' | 'DEEP_QUARTER_3' | 'DEEP_QUARTER_4'; // Cover 4

export interface ZoneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  anchorPoint: Vector2; // Where to settle in zone
}

// Zone definitions based on field position (160 wide, relative to LOS)
const ZONE_DEFINITIONS: Record<ZoneType, (los: number) => ZoneBounds> = {
  FLAT_LEFT: (los) => ({
    minX: 0, maxX: 40, minY: los, maxY: los + 30,
    anchorPoint: { x: 25, y: los + 15 },
  }),
  FLAT_RIGHT: (los) => ({
    minX: 120, maxX: 160, minY: los, maxY: los + 30,
    anchorPoint: { x: 135, y: los + 15 },
  }),
  CURL_LEFT: (los) => ({
    minX: 30, maxX: 65, minY: los + 15, maxY: los + 45,
    anchorPoint: { x: 50, y: los + 30 },
  }),
  CURL_RIGHT: (los) => ({
    minX: 95, maxX: 130, minY: los + 15, maxY: los + 45,
    anchorPoint: { x: 110, y: los + 30 },
  }),
  HOOK_LEFT: (los) => ({
    minX: 50, maxX: 80, minY: los + 10, maxY: los + 35,
    anchorPoint: { x: 65, y: los + 22 },
  }),
  HOOK_RIGHT: (los) => ({
    minX: 80, maxX: 110, minY: los + 10, maxY: los + 35,
    anchorPoint: { x: 95, y: los + 22 },
  }),
  DEEP_THIRD_LEFT: (los) => ({
    minX: 0, maxX: 55, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 30, y: los + 60 },
  }),
  DEEP_THIRD_MID: (los) => ({
    minX: 50, maxX: 110, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 80, y: los + 65 },
  }),
  DEEP_THIRD_RIGHT: (los) => ({
    minX: 105, maxX: 160, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 130, y: los + 60 },
  }),
  DEEP_HALF_LEFT: (los) => ({
    minX: 0, maxX: 80, minY: los + 50, maxY: los + 120,
    anchorPoint: { x: 45, y: los + 65 },
  }),
  DEEP_HALF_RIGHT: (los) => ({
    minX: 80, maxX: 160, minY: los + 50, maxY: los + 120,
    anchorPoint: { x: 115, y: los + 65 },
  }),
  DEEP_QUARTER_1: (los) => ({
    minX: 0, maxX: 40, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 25, y: los + 55 },
  }),
  DEEP_QUARTER_2: (los) => ({
    minX: 40, maxX: 80, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 60, y: los + 60 },
  }),
  DEEP_QUARTER_3: (los) => ({
    minX: 80, maxX: 120, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 100, y: los + 60 },
  }),
  DEEP_QUARTER_4: (los) => ({
    minX: 120, maxX: 160, minY: los + 45, maxY: los + 120,
    anchorPoint: { x: 135, y: los + 55 },
  }),
};

// Coverage assignments by scheme
export interface CoverageScheme {
  cb1: DefenderAssignment;
  cb2: DefenderAssignment;
  ncb?: DefenderAssignment; // Nickel CB
  fs: DefenderAssignment;
  ss: DefenderAssignment;
  mlb?: DefenderAssignment;
  olb1?: DefenderAssignment;
  olb2?: DefenderAssignment;
  ilb1?: DefenderAssignment;
  ilb2?: DefenderAssignment;
}

export { ZONE_DEFINITIONS };

export const COVERAGE_SCHEMES: Record<CoverageType, CoverageScheme> = {
  COVER_0: {
    cb1: { type: 'MAN' },
    cb2: { type: 'MAN' },
    fs: { type: 'MAN' },
    ss: { type: 'MAN' },
    mlb: { type: 'MAN' },
    olb1: { type: 'BLITZ' },
    olb2: { type: 'BLITZ' },
  },
  COVER_1: {
    cb1: { type: 'MAN' },
    cb2: { type: 'MAN' },
    fs: { type: 'ZONE', zone: 'DEEP_THIRD_MID' },
    ss: { type: 'MAN' },
    mlb: { type: 'ZONE', zone: 'HOOK_LEFT' },
    olb1: { type: 'ZONE', zone: 'FLAT_LEFT' },
    olb2: { type: 'ZONE', zone: 'FLAT_RIGHT' },
  },
  COVER_2: {
    cb1: { type: 'ZONE', zone: 'FLAT_LEFT' },
    cb2: { type: 'ZONE', zone: 'FLAT_RIGHT' },
    fs: { type: 'ZONE', zone: 'DEEP_HALF_LEFT' },
    ss: { type: 'ZONE', zone: 'DEEP_HALF_RIGHT' },
    mlb: { type: 'ZONE', zone: 'HOOK_LEFT' },
    olb1: { type: 'ZONE', zone: 'CURL_LEFT' },
    olb2: { type: 'ZONE', zone: 'CURL_RIGHT' },
  },
  COVER_3: {
    cb1: { type: 'ZONE', zone: 'DEEP_THIRD_LEFT' },
    cb2: { type: 'ZONE', zone: 'DEEP_THIRD_RIGHT' },
    fs: { type: 'ZONE', zone: 'DEEP_THIRD_MID' },
    ss: { type: 'ZONE', zone: 'CURL_RIGHT' },
    mlb: { type: 'ZONE', zone: 'HOOK_LEFT' },
    olb1: { type: 'ZONE', zone: 'FLAT_LEFT' },
    olb2: { type: 'ZONE', zone: 'CURL_LEFT' },
  },
  COVER_4: {
    cb1: { type: 'ZONE', zone: 'DEEP_QUARTER_1' },
    cb2: { type: 'ZONE', zone: 'DEEP_QUARTER_4' },
    fs: { type: 'ZONE', zone: 'DEEP_QUARTER_2' },
    ss: { type: 'ZONE', zone: 'DEEP_QUARTER_3' },
    mlb: { type: 'ZONE', zone: 'HOOK_LEFT' },
    olb1: { type: 'ZONE', zone: 'CURL_LEFT' },
    olb2: { type: 'ZONE', zone: 'CURL_RIGHT' },
  },
  COVER_2_MAN: {
    cb1: { type: 'MAN' },
    cb2: { type: 'MAN' },
    fs: { type: 'ZONE', zone: 'DEEP_HALF_LEFT' },
    ss: { type: 'ZONE', zone: 'DEEP_HALF_RIGHT' },
    mlb: { type: 'MAN' },
    olb1: { type: 'MAN' },
    olb2: { type: 'MAN' },
  },
  TAMPA_2: {
    cb1: { type: 'ZONE', zone: 'FLAT_LEFT' },
    cb2: { type: 'ZONE', zone: 'FLAT_RIGHT' },
    fs: { type: 'ZONE', zone: 'DEEP_HALF_LEFT' },
    ss: { type: 'ZONE', zone: 'DEEP_HALF_RIGHT' },
    mlb: { type: 'ZONE', zone: 'DEEP_THIRD_MID' }, // MLB drops deep in Tampa 2
    olb1: { type: 'ZONE', zone: 'CURL_LEFT' },
    olb2: { type: 'ZONE', zone: 'CURL_RIGHT' },
  },
  MAN_FREE: {
    cb1: { type: 'MAN' },
    cb2: { type: 'MAN' },
    fs: { type: 'ZONE', zone: 'DEEP_THIRD_MID' }, // Free safety
    ss: { type: 'MAN' },
    mlb: { type: 'MAN' },
    olb1: { type: 'ZONE', zone: 'FLAT_LEFT' },
    olb2: { type: 'ZONE', zone: 'FLAT_RIGHT' },
  },
};

export class DefenseAI {
  private defenderStates: Map<string, DefenderState> = new Map();
  private lineOfScrimmage: number = 0;
  private globalPhase: DefensePhase = 'PRE_SNAP';
  private snapTime: number = 0;
  private qbLocation: Vector2 = { x: 80, y: 0 };
  private qbInPocket: boolean = true;
  private ballInAir: boolean = false;
  private ballLocation: Vector2 = { x: 80, y: 0 };
  private ballCarrierId: string | null = null;

  reset(): void {
    this.defenderStates.clear();
    this.globalPhase = 'PRE_SNAP';
    this.ballInAir = false;
    this.qbInPocket = true;
    this.ballCarrierId = null;
  }

  initializeDefense(
    defenders: FieldPlayer[],
    play: DefensivePlay,
    los: number,
    offensivePlayers: FieldPlayer[]
  ): void {
    this.lineOfScrimmage = los;
    const scheme = COVERAGE_SCHEMES[play.coverage];

    // Categorize receivers for smart matching
    const wideReceivers = offensivePlayers.filter(p => p.position === 'WR');
    const tightEnds = offensivePlayers.filter(p => p.position === 'TE');
    const runningBacks = offensivePlayers.filter(p => p.position === 'RB' || p.position === 'FB');

    // Sort WRs by horizontal position (leftmost first)
    wideReceivers.sort((a, b) => a.location.x - b.location.x);

    // Track which receivers have been assigned
    const assignedReceivers = new Set<string>();

    defenders.forEach(defender => {
      const positionKey = this.getPositionKey(defender);
      const assignment = scheme[positionKey as keyof CoverageScheme];

      // D-line always rushes
      if (['DE', 'DT', 'NT'].includes(defender.position)) {
        this.defenderStates.set(defender.id, {
          phase: 'PRE_SNAP',
          assignment: { type: 'RUSH', rushType: defender.location.x < 80 ? 'OUTSIDE' : 'INSIDE' },
          lastKnownBallLocation: { x: 80, y: los },
        });
        return;
      }

      if (!assignment) {
        // Default zone for unknown positions
        this.defenderStates.set(defender.id, {
          phase: 'PRE_SNAP',
          assignment: { type: 'ZONE', zone: 'HOOK_LEFT' },
          zoneBounds: ZONE_DEFINITIONS['HOOK_LEFT'](los),
          lastKnownBallLocation: { x: 80, y: los },
        });
        return;
      }

      const state: DefenderState = {
        phase: 'PRE_SNAP',
        assignment: { ...assignment },
        lastKnownBallLocation: { x: 80, y: los },
      };

      // Set up zone bounds
      if (assignment.type === 'ZONE' && assignment.zone) {
        state.zoneBounds = ZONE_DEFINITIONS[assignment.zone](los);
      }

      // Smart man coverage assignment based on defender position
      if (assignment.type === 'MAN') {
        let target: FieldPlayer | undefined;

        if (defender.position === 'CB') {
          // CBs cover WRs - match by side of field
          const isLeftCB = defender.location.x < 80;
          target = wideReceivers.find(wr => {
            if (assignedReceivers.has(wr.id)) return false;
            const isLeftWR = wr.location.x < 80;
            return isLeftCB === isLeftWR;
          });
          // Fallback to any unassigned WR
          if (!target) {
            target = wideReceivers.find(wr => !assignedReceivers.has(wr.id));
          }
        } else if (defender.position === 'SS') {
          // Strong safety covers TE
          target = tightEnds.find(te => !assignedReceivers.has(te.id));
          if (!target) {
            target = wideReceivers.find(wr => !assignedReceivers.has(wr.id));
          }
        } else if (['MLB', 'ILB', 'OLB'].includes(defender.position)) {
          // Linebackers cover RB/FB first, then TE
          target = runningBacks.find(rb => !assignedReceivers.has(rb.id));
          if (!target) {
            target = tightEnds.find(te => !assignedReceivers.has(te.id));
          }
        } else {
          // FS or other - cover nearest unassigned
          const allReceivers = [...wideReceivers, ...tightEnds, ...runningBacks]
            .filter(r => !assignedReceivers.has(r.id));
          if (allReceivers.length > 0) {
            target = this.findNearest(defender.location, allReceivers) || undefined;
          }
        }

        if (target) {
          state.manTarget = target.id;
          assignedReceivers.add(target.id);
        }
      }

      this.defenderStates.set(defender.id, state);
    });
  }

  private getPositionKey(defender: FieldPlayer): string {
    // Map defender IDs to scheme keys
    const mapping: Record<string, string> = {
      cb1: 'cb1', cb2: 'cb2', ncb: 'ncb',
      fs: 'fs', ss: 'ss',
      mlb: 'mlb', mlb1: 'mlb', mlb2: 'mlb',
      olb1: 'olb1', olb2: 'olb2',
      ilb1: 'ilb1', ilb2: 'ilb2',
    };
    return mapping[defender.id] || defender.position.toLowerCase();
  }

  onSnap(currentTime: number): void {
    this.snapTime = currentTime;
    this.globalPhase = 'READ';
  }

  updateGameState(
    qbLocation: Vector2,
    pocketCenter: Vector2,
    ballInAir: boolean,
    ballLocation: Vector2,
    ballCarrierId: string | null,
    currentTime: number
  ): void {
    this.qbLocation = qbLocation;
    this.ballInAir = ballInAir;
    this.ballLocation = ballLocation;
    this.ballCarrierId = ballCarrierId;

    // Check if QB left pocket
    const distFromPocket = Math.sqrt(
      (qbLocation.x - pocketCenter.x) ** 2 + (qbLocation.y - pocketCenter.y) ** 2
    );
    this.qbInPocket = distFromPocket < 15;

    // Update global phase
    const timeSinceSnap = currentTime - this.snapTime;

    if (timeSinceSnap < 0.3) {
      this.globalPhase = 'READ';
    } else if (ballInAir) {
      this.globalPhase = 'REACT_BALL';
    } else if (ballCarrierId && ballCarrierId.toLowerCase() !== 'qb') {
      // Ball carrier is not QB (run play or completed pass)
      // Only go full pursuit if carrier is past/near LOS, otherwise maintain coverage
      const carrierPastLOS = this.ballLocation.y >= this.lineOfScrimmage - 5;
      if (carrierPastLOS) {
        this.globalPhase = 'PURSUIT';
      } else {
        // Carrier still in backfield - D-line pursues, secondary maintains coverage
        this.globalPhase = 'EXECUTE';
      }
    } else if (!this.qbInPocket) {
      this.globalPhase = 'SCRAMBLE_CONTAIN';
    } else {
      this.globalPhase = 'EXECUTE';
    }
  }

  getMovementVector(
    defender: FieldPlayer,
    offensivePlayers: FieldPlayer[],
    currentTime: number
  ): Vector2 {
    const state = this.defenderStates.get(defender.id);
    if (!state) {
      // Default: chase ball
      return this.pursuitMovement(defender);
    }

    // D-line and linebackers pursue the ball carrier more aggressively
    const isDLineman = ['DE', 'DT', 'NT'].includes(defender.position);
    const isLinebacker = ['MLB', 'ILB', 'OLB'].includes(defender.position);
    const isSecondary = ['CB', 'FS', 'SS'].includes(defender.position);

    // If ball carrier is not QB and D-line, always pursue
    if (this.ballCarrierId && this.ballCarrierId.toLowerCase() !== 'qb') {
      if (isDLineman) {
        state.phase = 'PURSUIT';
        return this.pursuitMovement(defender);
      }
      // Linebackers pursue if carrier is within 30 units
      if (isLinebacker) {
        const distToBall = this.distance(defender.location, this.ballLocation);
        if (distToBall < 40) {
          state.phase = 'PURSUIT';
          return this.pursuitMovement(defender);
        }
      }
    }

    // Update individual defender phase based on global phase
    state.phase = this.globalPhase;

    switch (this.globalPhase) {
      case 'READ':
        // Brief pause to read the play
        return { x: 0, y: 0 };

      case 'EXECUTE':
        return this.executeAssignment(defender, state, offensivePlayers);

      case 'REACT_BALL':
        return this.reactToBall(defender, state);

      case 'PURSUIT':
        return this.pursuitMovement(defender);

      case 'SCRAMBLE_CONTAIN':
        return this.scrambleContain(defender, state);

      default:
        return { x: 0, y: 0 };
    }
  }

  private executeAssignment(
    defender: FieldPlayer,
    state: DefenderState,
    offensivePlayers: FieldPlayer[]
  ): Vector2 {
    switch (state.assignment.type) {
      case 'ZONE':
        return this.zoneMovement(defender, state, offensivePlayers);

      case 'MAN':
        return this.manMovement(defender, state, offensivePlayers);

      case 'RUSH':
        return this.rushMovement(defender, state);

      case 'SPY':
        return this.spyMovement(defender);

      case 'BLITZ':
        return this.blitzMovement(defender);

      default:
        return { x: 0, y: 0 };
    }
  }

  private zoneMovement(
    defender: FieldPlayer,
    state: DefenderState,
    offensivePlayers: FieldPlayer[]
  ): Vector2 {
    if (!state.zoneBounds) return { x: 0, y: 0 };

    const zone = state.zoneBounds;

    // Find receivers in or near this zone
    const receiversInZone = offensivePlayers.filter(p => {
      if (!['WR', 'TE', 'RB'].includes(p.position)) return false;
      // Check if receiver is in or approaching zone
      return p.location.x >= zone.minX - 10 && p.location.x <= zone.maxX + 10 &&
             p.location.y >= zone.minY - 10 && p.location.y <= zone.maxY + 30;
    });

    if (receiversInZone.length > 0) {
      // Move toward nearest receiver in zone
      const nearest = this.findNearest(defender.location, receiversInZone);
      if (nearest) {
        const dir = this.normalize({
          x: nearest.location.x - defender.location.x,
          y: nearest.location.y - defender.location.y,
        });
        // Don't completely abandon zone - blend toward receiver
        const toAnchor = this.normalize({
          x: zone.anchorPoint.x - defender.location.x,
          y: zone.anchorPoint.y - defender.location.y,
        });
        return {
          x: dir.x * 0.7 + toAnchor.x * 0.3,
          y: dir.y * 0.7 + toAnchor.y * 0.3,
        };
      }
    }

    // No receivers in zone - move toward anchor point
    const toAnchor = {
      x: zone.anchorPoint.x - defender.location.x,
      y: zone.anchorPoint.y - defender.location.y,
    };
    const distToAnchor = Math.sqrt(toAnchor.x ** 2 + toAnchor.y ** 2);

    // Once near anchor, HOLD POSITION - don't drift toward QB
    if (distToAnchor < 8) {
      // At anchor - stay in zone, only minor lateral adjustments to watch QB
      // DO NOT move toward QB, just shift slightly within zone
      const qbSide = this.qbLocation.x < defender.location.x ? -1 : 1;
      return {
        x: qbSide * 0.05, // Tiny lateral shift to face QB
        y: 0, // Hold depth
      };
    }

    // Move toward anchor point
    return this.normalize(toAnchor);
  }

  private manMovement(
    defender: FieldPlayer,
    state: DefenderState,
    offensivePlayers: FieldPlayer[]
  ): Vector2 {
    if (!state.manTarget) {
      // No assignment, help in coverage
      return this.zoneMovement(defender, {
        ...state,
        zoneBounds: ZONE_DEFINITIONS['HOOK_LEFT'](this.lineOfScrimmage),
      }, offensivePlayers);
    }

    // Find target - try exact match first, then case-insensitive
    let target = offensivePlayers.find(p => p.id === state.manTarget);
    if (!target) {
      target = offensivePlayers.find(p => p.id.toLowerCase() === state.manTarget?.toLowerCase());
    }
    if (!target) return { x: 0, y: 0 };

    // Get defender's coverage ability
    const coverageRating = defender.coverage ?? 70;
    const speedRating = defender.speed ?? 70;
    const agilityRating = defender.agility ?? 70;
    // Coverage combines technique, speed to stay with receiver, and agility for breaks
    const coverageSkill = (coverageRating * 0.5 + speedRating * 0.3 + agilityRating * 0.2) / 100;

    // Get receiver's route running ability (harder to cover good route runners)
    const receiverRouteRunning = target.routeRunning ?? 70;
    const receiverSpeed = target.speed ?? 70;
    const receiverAgility = target.agility ?? 70;
    const receiverSkill = (receiverRouteRunning * 0.5 + receiverSpeed * 0.3 + receiverAgility * 0.2) / 100;

    // Coverage matchup - positive means defender has advantage
    const matchupAdvantage = coverageSkill - receiverSkill;

    // Man coverage - STICK to the receiver like glue
    const toTarget = {
      x: target.location.x - defender.location.x,
      y: target.location.y - defender.location.y,
    };
    const distToTarget = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2);
    const dir = this.normalize(toTarget);

    // Position: stay slightly behind and inside the receiver
    // Better coverage = tighter positioning allowed
    const idealOffset = 5 - matchupAdvantage * 3; // 3.5-6.5 units based on matchup

    // Speed multiplier based on coverage skill
    const baseSpeedMult = 0.85 + coverageSkill * 0.3; // 0.92-1.15 based on coverage

    if (distToTarget > 20) {
      // Way too far - sprint to catch up
      const catchUpSpeed = 1.2 + coverageSkill * 0.3; // 1.27-1.5 based on skill
      return { x: dir.x * catchUpSpeed, y: dir.y * catchUpSpeed };
    } else if (distToTarget > 10) {
      // Too far - run hard to close gap
      return { x: dir.x * baseSpeedMult * 1.2, y: dir.y * baseSpeedMult * 1.2 };
    } else if (distToTarget > idealOffset) {
      // Closing distance - maintain pursuit
      return { x: dir.x * baseSpeedMult, y: dir.y * baseSpeedMult };
    } else {
      // In good position - mirror receiver's movement, stay tight
      // Better coverage = tighter mirroring
      const mirrorTightness = 0.8 + coverageSkill * 0.2; // 0.86-1.0 based on skill

      // Add slight inside leverage (toward center of field)
      const insideBias = defender.location.x < 80 ? 0.1 : -0.1;
      return {
        x: dir.x * mirrorTightness + insideBias,
        y: dir.y * mirrorTightness,
      };
    }
  }

  private rushMovement(defender: FieldPlayer, state: DefenderState): Vector2 {
    // Rush toward QB
    const toQB = this.normalize({
      x: this.qbLocation.x - defender.location.x,
      y: this.qbLocation.y - defender.location.y,
    });

    // Get pass rush ability - affects rush speed and lane discipline
    const passRushRating = defender.passRush ?? 70;
    const speedRating = defender.speed ?? 70;
    const strengthRating = defender.strength ?? 70;
    const rushSkill = (passRushRating * 0.5 + speedRating * 0.3 + strengthRating * 0.2) / 100;

    // Rush speed multiplier based on skill
    const rushSpeedMult = 0.85 + rushSkill * 0.3; // 0.92-1.15 based on skill

    // Add rush lane variation - better rushers take better angles
    const laneOffset = state.assignment.rushType === 'OUTSIDE' ? 0.3 : -0.1;

    return {
      x: (toQB.x + (defender.location.x < 80 ? -laneOffset : laneOffset)) * rushSpeedMult,
      y: toQB.y * rushSpeedMult,
    };
  }

  private spyMovement(defender: FieldPlayer): Vector2 {
    // Spy the QB - stay between QB and line of scrimmage
    const idealX = this.qbLocation.x;
    const idealY = (this.qbLocation.y + this.lineOfScrimmage) / 2;

    // Awareness affects how well they track QB movement
    const awarenessRating = defender.awareness ?? 70;
    const speedMult = 0.9 + (awarenessRating / 100) * 0.2; // 0.97-1.1 based on awareness

    const dir = this.normalize({
      x: idealX - defender.location.x,
      y: idealY - defender.location.y,
    });

    return { x: dir.x * speedMult, y: dir.y * speedMult };
  }

  private blitzMovement(defender: FieldPlayer): Vector2 {
    // All-out rush to QB
    const toQB = this.normalize({
      x: this.qbLocation.x - defender.location.x,
      y: this.qbLocation.y - defender.location.y,
    });

    // Blitz effectiveness based on speed and pass rush
    const passRushRating = defender.passRush ?? 70;
    const speedRating = defender.speed ?? 70;
    const blitzSkill = (passRushRating * 0.4 + speedRating * 0.6) / 100; // Speed more important for blitz

    // Blitz speed multiplier - blitzers move fast!
    const blitzSpeedMult = 1.1 + blitzSkill * 0.4; // 1.17-1.5 based on skill

    return { x: toQB.x * blitzSpeedMult, y: toQB.y * blitzSpeedMult };
  }

  private reactToBall(defender: FieldPlayer, state: DefenderState): Vector2 {
    // Ball is in the air - break toward it based on position and distance
    const distToBall = this.distance(defender.location, this.ballLocation);
    const toBall = this.normalize({
      x: this.ballLocation.x - defender.location.x,
      y: this.ballLocation.y - defender.location.y,
    });

    // Only nearby defenders should break hard on the ball
    // Far defenders should maintain positioning and close gradually
    const isDB = ['CB', 'FS', 'SS'].includes(defender.position);

    if (distToBall < 40) {
      // Close enough to make a play - sprint to ball
      const reactionSpeed = isDB ? 1.3 : 1.0;
      return { x: toBall.x * reactionSpeed, y: toBall.y * reactionSpeed };
    } else if (distToBall < 80) {
      // Medium range - move toward ball but don't abandon all coverage
      const reactionSpeed = isDB ? 0.8 : 0.5;
      return { x: toBall.x * reactionSpeed, y: toBall.y * reactionSpeed };
    } else {
      // Far from ball - maintain zone responsibility, drift slowly
      // Deep safeties shouldn't abandon their deep coverage entirely
      if (state.zoneBounds) {
        const toAnchor = this.normalize({
          x: state.zoneBounds.anchorPoint.x - defender.location.x,
          y: state.zoneBounds.anchorPoint.y - defender.location.y,
        });
        // Blend: 30% toward ball, 70% toward zone (stay in coverage)
        return {
          x: toBall.x * 0.3 + toAnchor.x * 0.7,
          y: toBall.y * 0.3 + toAnchor.y * 0.7,
        };
      }
      // No zone - slow approach
      return { x: toBall.x * 0.4, y: toBall.y * 0.4 };
    }
  }

  private pursuitMovement(defender: FieldPlayer): Vector2 {
    // Chase the ball carrier
    const toBall = this.normalize({
      x: this.ballLocation.x - defender.location.x,
      y: this.ballLocation.y - defender.location.y,
    });

    // Take proper pursuit angles - don't just run straight
    const pursuiteAngle = defender.location.y < this.ballLocation.y ? 0.2 : -0.1;

    return {
      x: toBall.x,
      y: toBall.y + pursuiteAngle,
    };
  }

  private scrambleContain(defender: FieldPlayer, state: DefenderState): Vector2 {
    // QB is scrambling - contain the edges, D-line pursue
    if (['DE', 'DT', 'NT'].includes(defender.position)) {
      // D-line chases
      return this.pursuitMovement(defender);
    }

    if (['CB'].includes(defender.position)) {
      // Corners contain the edges
      const edgeX = defender.location.x < 80 ? 30 : 130;
      const containPoint = { x: edgeX, y: this.qbLocation.y + 5 };

      return this.normalize({
        x: containPoint.x - defender.location.x,
        y: containPoint.y - defender.location.y,
      });
    }

    // Everyone else - controlled pursuit but watch for receivers
    const toQB = this.normalize({
      x: this.qbLocation.x - defender.location.x,
      y: this.qbLocation.y - defender.location.y,
    });

    return { x: toQB.x * 0.7, y: toQB.y * 0.7 };
  }

  private findNearest(location: Vector2, players: FieldPlayer[]): FieldPlayer | null {
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

  private distance(a: Vector2, b: Vector2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private normalize(v: Vector2): Vector2 {
    const len = Math.sqrt(v.x ** 2 + v.y ** 2);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  }

  getDefenderState(defenderId: string): DefenderState | undefined {
    return this.defenderStates.get(defenderId);
  }
}
