import React, { useCallback, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import type { LiveGame } from '../../types';

interface GameCanvasProps {
  game: LiveGame;
  width?: number;
  height?: number;
}

// Team color palettes - ESPN Clean Vector style
const TEAM_PALETTES = {
  home: {
    primary: '#2563eb',      // Royal blue (helmet/body)
    secondary: '#ffffff',    // White (numbers/accents)
    shadow: '#1e40af',       // Darker blue shadow
  },
  away: {
    primary: '#dc2626',      // Red (helmet/body)
    secondary: '#ffffff',    // White (numbers/accents)
    shadow: '#991b1b',       // Darker red shadow
  },
};

// Note: Shadow colors now embedded directly in drawVectorPlayer for cleaner code

// Generate jersey numbers from player position IDs
// Standard NFL-style numbering by position
function getJerseyNumber(playerId: string): number {
  const id = playerId.toUpperCase();

  // Offense
  if (id === 'QB') return 12;
  if (id === 'RB' || id === 'HB') return 28;
  if (id === 'FB') return 44;
  if (id === 'WR1') return 11;
  if (id === 'WR2') return 84;
  if (id === 'WR3') return 17;
  if (id === 'TE') return 87;
  if (id === 'LT') return 76;
  if (id === 'LG') return 64;
  if (id === 'C') return 52;
  if (id === 'RG') return 66;
  if (id === 'RT') return 71;

  // Defense
  if (id === 'DT' || id === 'NT') return 97;
  if (id === 'DE' || id === 'EDGE_L') return 91;
  if (id === 'EDGE_R') return 99;
  if (id === 'MLB' || id === 'ILB') return 54;
  if (id === 'OLB' || id === 'WILL') return 58;
  if (id === 'SAM' || id === 'SLB') return 51;
  if (id === 'CB1' || id === 'LCB') return 24;
  if (id === 'CB2' || id === 'RCB') return 21;
  if (id === 'FS') return 32;
  if (id === 'SS') return 43;
  if (id === 'NB' || id === 'SLOT') return 29;

  // D-Line aggregate unit
  if (id === 'D-LINE' || id === 'D_LINE') return 95;

  // Fallback - hash the ID to get a number
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
  }
  return Math.abs(hash % 89) + 10; // 10-99
}

// Animation state tracking (persists between frames)
interface PlayerAnimState {
  legPhase: number;      // 0 to 2π for leg swing cycle
  bobPhase: number;      // 0 to 2π for body bob
  lastX: number;
  lastY: number;
  isMoving: boolean;
}

// Route trail point
interface TrailPoint {
  x: number;
  y: number;
  age: number;  // frames since created
}

// Draw ESPN-style Clean Vector player - simplified pill shape with prominent number
function drawVectorPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: typeof TEAM_PALETTES.home,
  animState: PlayerAnimState,
  isBallCarrier: boolean = false,
  jerseyNumber?: number
) {
  // Larger base size for visibility
  const baseSize = 18 * scale;

  // Subtle bob when moving
  const bobOffset = animState.isMoving ? Math.sin(animState.bobPhase) * 1.5 * scale : 0;

  ctx.save();
  ctx.translate(x, y - bobOffset);

  // Ball carrier glow - golden highlight ring
  if (isBallCarrier) {
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 20 * scale;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, baseSize * 0.9, baseSize * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Ground shadow - oval underneath player
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(3 * scale, baseSize * 0.35, baseSize * 0.7, baseSize * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main body - vertical pill/capsule shape
  const pillWidth = baseSize * 0.8;
  const pillHeight = baseSize * 1.4;
  const pillRadius = pillWidth / 2;
  const pillTop = -pillHeight / 2;

  // Body shadow (offset slightly for 3D effect)
  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.moveTo(-pillRadius + 2, pillTop + pillRadius);
  ctx.lineTo(-pillRadius + 2, pillTop + pillHeight - pillRadius);
  ctx.arc(2, pillTop + pillHeight - pillRadius, pillRadius, Math.PI, 0, true);
  ctx.lineTo(pillRadius + 2, pillTop + pillRadius);
  ctx.arc(2, pillTop + pillRadius, pillRadius, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();

  // Main body pill
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.moveTo(-pillRadius, pillTop + pillRadius);
  ctx.lineTo(-pillRadius, pillTop + pillHeight - pillRadius);
  ctx.arc(0, pillTop + pillHeight - pillRadius, pillRadius, Math.PI, 0, true);
  ctx.lineTo(pillRadius, pillTop + pillRadius);
  ctx.arc(0, pillTop + pillRadius, pillRadius, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();

  // Subtle highlight on top-left of pill
  const highlightGradient = ctx.createRadialGradient(
    -pillRadius * 0.3, pillTop + pillRadius * 0.5, 0,
    -pillRadius * 0.3, pillTop + pillRadius * 0.5, pillRadius * 1.5
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(0, pillTop + pillRadius, pillRadius, 0, Math.PI * 2);
  ctx.fill();

  // Jersey number - large and prominent, centered on body
  if (jerseyNumber !== undefined) {
    const fontSize = Math.max(11, Math.floor(14 * scale));
    ctx.font = `bold ${fontSize}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Number shadow for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(jerseyNumber.toString(), 1, 1);

    // White number
    ctx.fillStyle = palette.secondary;
    ctx.fillText(jerseyNumber.toString(), 0, 0);
  }

  // Thin outline for definition
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-pillRadius, pillTop + pillRadius);
  ctx.lineTo(-pillRadius, pillTop + pillHeight - pillRadius);
  ctx.arc(0, pillTop + pillHeight - pillRadius, pillRadius, Math.PI, 0, true);
  ctx.lineTo(pillRadius, pillTop + pillRadius);
  ctx.arc(0, pillTop + pillRadius, pillRadius, 0, Math.PI, true);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

// Draw route trail with gradient fade
function drawRouteTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[],
  toScreen: (x: number, y: number) => { x: number; y: number; scale: number },
  color: string
) {
  if (trail.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1];
    const curr = trail[i];
    const prevPos = toScreen(prev.x, prev.y);
    const currPos = toScreen(curr.x, curr.y);

    // Fade based on age
    const maxAge = 60;
    const alpha = Math.max(0, 1 - curr.age / maxAge);

    ctx.strokeStyle = color.replace(')', `, ${alpha * 0.6})`).replace('rgb', 'rgba');
    ctx.lineWidth = Math.max(1, 3 * currPos.scale * alpha);

    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(currPos.x, currPos.y);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw pressure indicator ring around QB
function drawPressureIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  pressure: number // 0 to 1
) {
  if (pressure <= 0) return;

  const radius = 20 * scale;
  const ringWidth = 4 * scale;

  // Interpolate color from green to red
  const r = Math.floor(pressure * 239);
  const g = Math.floor((1 - pressure) * 68);
  const color = `rgb(${r}, ${g}, 68)`;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ringWidth;
  ctx.globalAlpha = 0.5 + pressure * 0.3;

  // Pulsing ring
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow
  const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius);
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(${r}, ${g}, 68, ${pressure * 0.3})`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  game,
  width = 900,
  height = 600,
}) => {
  // Persistent animation state for each player
  const animStatesRef = useRef<Map<string, PlayerAnimState>>(new Map());
  // Route trails for receivers
  const routeTrailsRef = useRef<Map<string, TrailPoint[]>>(new Map());

  const draw = useCallback((ctx: CanvasRenderingContext2D, _frameCount: number) => {
    const ENGINE_WIDTH = 160;  // Sideline to sideline

    // Coordinate conversion helpers - matches GameEngine exactly
    // Engine uses: Y = (yardLine + 10) * 3 (10-yard endzone offset)
    const yardLineToEngineY = (yardLine: number) => (yardLine + 10) * 3;
    const engineYToYardLine = (y: number) => Math.floor(y / 3) - 10;

    // Isometric camera settings
    // Camera is behind the offense, looking downfield
    // Y-axis (field length) goes "into" the screen (top = far downfield)
    // X-axis (sideline) stays horizontal

    const VISIBLE_YARDS = 50; // How much field depth to show
    const HORIZON_Y = 80; // Where the "horizon" is on screen (top area)
    const YARDS_TO_UNITS = 3; // 3 engine units per yard (matches engine)

    // Calculate viewport - follow ball carrier during active play
    const losEngineY = yardLineToEngineY(game.fieldPosition.yardLine);

    // Determine camera focus point
    let cameraFocusY = losEngineY;

    // During active play, follow the ball carrier or ball in flight
    if (game.state === 'PLAY_RUNNING' || game.state === 'SNAP') {
      if (game.ballInFlight) {
        // Follow ball in air
        cameraFocusY = game.ballInFlight.y;
      } else if (game.ballCarrier) {
        // Follow ball carrier - keep them in lower third of screen
        cameraFocusY = game.ballCarrier.y;
      }
    }

    // Position camera so focus point is in lower portion of visible area
    // This keeps more of the downfield visible
    const viewportStartY = cameraFocusY - 12 * YARDS_TO_UNITS; // 12 yards behind focus

    // Clamp to field bounds (include end zones)
    // Own endzone: yardLine -10 to 0, engineY 0 to 30
    // Opponent endzone: yardLine 100 to 110, engineY 330 to 360
    const minViewport = yardLineToEngineY(-10); // Y = 0 (own endzone back)
    const maxViewport = yardLineToEngineY(100 + 10) - VISIBLE_YARDS * YARDS_TO_UNITS; // Show opponent end zone
    const clampedStartY = Math.max(minViewport, Math.min(viewportStartY, maxViewport));
    const clampedEndY = clampedStartY + VISIBLE_YARDS * YARDS_TO_UNITS;

    // Screen layout
    const fieldMarginX = 50;
    const fieldTop = HORIZON_Y;
    const fieldBottom = height - 40;
    const fieldHeight = fieldBottom - fieldTop;

    // Clear canvas with sky/stadium background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#1a1a2e'); // Dark blue at top
    bgGradient.addColorStop(0.3, '#16213e');
    bgGradient.addColorStop(1, '#0f0f1a'); // Darker at bottom
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Transform functions for isometric view
    // Engine Y (0-360) -> depth (0 = near/bottom, 1 = far/top)
    const getDepth = (engineY: number) => {
      return (engineY - clampedStartY) / (clampedEndY - clampedStartY);
    };

    // Convert engine coordinates to screen coordinates
    const toScreen = (engineX: number, engineY: number): { x: number; y: number; scale: number } => {
      const depth = getDepth(engineY);

      // Y position: near (depth=0) at bottom, far (depth=1) at top
      const screenY = fieldBottom - depth * fieldHeight;

      // Perspective: less aggressive for more top-down "helicopter" view
      // ESPN-style: far objects are still ~70% size (was 40%)
      const perspectiveScale = 1 - depth * 0.35; // Near = 1.0, far = 0.65

      // X position: center at width/2, spread based on perspective
      const centerX = width / 2;
      const fieldWidthAtDepth = (width - fieldMarginX * 2) * perspectiveScale;
      const normalizedX = (engineX / ENGINE_WIDTH) - 0.5; // -0.5 to 0.5
      const screenX = centerX + normalizedX * fieldWidthAtDepth;

      return { x: screenX, y: screenY, scale: perspectiveScale };
    };

    // Draw the field with perspective
    // Draw grass stripes (every 5 yards)
    const startYard = engineYToYardLine(clampedStartY);
    const endYard = engineYToYardLine(clampedEndY);

    for (let yard = Math.floor(startYard / 5) * 5; yard <= Math.ceil(endYard / 5) * 5; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY1 = yardLineToEngineY(yard);
      const engineY2 = yardLineToEngineY(yard + 5);

      // Get corners of this stripe in screen space
      const topLeft = toScreen(0, engineY2);
      const topRight = toScreen(ENGINE_WIDTH, engineY2);
      const bottomLeft = toScreen(0, engineY1);
      const bottomRight = toScreen(ENGINE_WIDTH, engineY1);

      // Draw trapezoid for grass stripe
      ctx.fillStyle = (yard / 5) % 2 === 0 ? '#166534' : '#15803d';
      ctx.beginPath();
      ctx.moveTo(bottomLeft.x, bottomLeft.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(topLeft.x, topLeft.y);
      ctx.closePath();
      ctx.fill();
    }

    // Draw endzones if visible
    // Own end zone: yardLine -10 to 0, engineY 0 to 30
    const ownGoalLineY = yardLineToEngineY(0); // Y = 30
    const ownEndzoneBackY = yardLineToEngineY(-10); // Y = 0
    if (clampedStartY < ownGoalLineY) {
      // Own endzone (near camera, behind our goal line)
      const endzoneStart = Math.max(ownEndzoneBackY, clampedStartY);
      const topLeft = toScreen(0, ownGoalLineY);
      const topRight = toScreen(ENGINE_WIDTH, ownGoalLineY);
      const bottomLeft = toScreen(0, endzoneStart);
      const bottomRight = toScreen(ENGINE_WIDTH, endzoneStart);

      ctx.fillStyle = '#5f1e1e'; // Red end zone
      ctx.beginPath();
      ctx.moveTo(bottomLeft.x, bottomLeft.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(topLeft.x, topLeft.y);
      ctx.closePath();
      ctx.fill();
    }

    // Opponent end zone: yardLine 100 to 110, engineY 330 to 360
    const oppGoalLineY = yardLineToEngineY(100); // Y = 330
    const oppEndzoneBackY = yardLineToEngineY(110); // Y = 360
    if (clampedEndY > oppGoalLineY) {
      // Opponent endzone (far from camera, beyond 100 yard line)
      const endzoneEnd = Math.min(oppEndzoneBackY, clampedEndY);
      const topLeft = toScreen(0, endzoneEnd);
      const topRight = toScreen(ENGINE_WIDTH, endzoneEnd);
      const bottomLeft = toScreen(0, oppGoalLineY);
      const bottomRight = toScreen(ENGINE_WIDTH, oppGoalLineY);

      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(bottomLeft.x, bottomLeft.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(topLeft.x, topLeft.y);
      ctx.closePath();
      ctx.fill();
    }

    // Draw yard lines
    for (let yard = Math.floor(startYard / 5) * 5; yard <= endYard; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY = yardLineToEngineY(yard);
      const left = toScreen(0, engineY);
      const right = toScreen(ENGINE_WIDTH, engineY);

      const isMajor = yard % 10 === 0;
      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = isMajor ? 3 * left.scale : 1;

      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    // Draw sidelines
    const nearLeft = toScreen(0, clampedStartY);
    const nearRight = toScreen(ENGINE_WIDTH, clampedStartY);
    const farLeft = toScreen(0, clampedEndY);
    const farRight = toScreen(ENGINE_WIDTH, clampedEndY);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;

    // Left sideline
    ctx.beginPath();
    ctx.moveTo(nearLeft.x, nearLeft.y);
    ctx.lineTo(farLeft.x, farLeft.y);
    ctx.stroke();

    // Right sideline
    ctx.beginPath();
    ctx.moveTo(nearRight.x, nearRight.y);
    ctx.lineTo(farRight.x, farRight.y);
    ctx.stroke();

    // Draw yard numbers
    ctx.textAlign = 'center';
    for (let yard = Math.floor(startYard / 10) * 10; yard <= endYard; yard += 10) {
      if (yard <= 0 || yard >= 100) continue;

      const engineY = yardLineToEngineY(yard);
      const pos = toScreen(ENGINE_WIDTH / 2, engineY);
      const num = yard <= 50 ? yard : 100 - yard;

      const fontSize = Math.max(12, Math.floor(24 * pos.scale));
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillText(num.toString(), pos.x + 1, pos.y + 1);

      // Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(num.toString(), pos.x, pos.y);
    }

    // Draw line of scrimmage (blue line)
    const losLeft = toScreen(0, losEngineY);
    const losRight = toScreen(ENGINE_WIDTH, losEngineY);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4 * losLeft.scale;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(losLeft.x, losLeft.y);
    ctx.lineTo(losRight.x, losRight.y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw first down line (yellow line)
    const firstDownYard = game.fieldPosition.yardLine + game.fieldPosition.yardsToGo;
    if (firstDownYard <= 100) {
      const fdEngineY = yardLineToEngineY(firstDownYard);
      const fdLeft = toScreen(0, fdEngineY);
      const fdRight = toScreen(ENGINE_WIDTH, fdEngineY);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4 * fdLeft.scale;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(fdLeft.x, fdLeft.y);
      ctx.lineTo(fdRight.x, fdRight.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw coverage overlay when Tab is held (pre-snap coverage read)
    if (game.showCoverageOverlay && game.coverageOverlay) {
      const { zones, manCoverage } = game.coverageOverlay;

      // Draw zone areas
      zones.forEach(zone => {
        const { bounds } = zone;
        const topLeft = toScreen(bounds.minX, bounds.maxY);
        const topRight = toScreen(bounds.maxX, bounds.maxY);
        const bottomLeft = toScreen(bounds.minX, bounds.minY);
        const bottomRight = toScreen(bounds.maxX, bounds.minY);

        // Semi-transparent zone fill
        let zoneColor = 'rgba(255, 165, 0, 0.25)'; // Orange for underneath
        if (zone.zone.includes('DEEP')) {
          zoneColor = 'rgba(0, 191, 255, 0.25)'; // Cyan for deep
        } else if (zone.zone.includes('FLAT')) {
          zoneColor = 'rgba(50, 205, 50, 0.25)'; // Green for flats
        }

        ctx.fillStyle = zoneColor;
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, bottomLeft.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topLeft.x, topLeft.y);
        ctx.closePath();
        ctx.fill();

        // Zone border
        ctx.strokeStyle = zoneColor.replace('0.25', '0.6');
        ctx.lineWidth = 2;
        ctx.stroke();

        // Zone label
        const anchor = toScreen(bounds.anchorPoint.x, bounds.anchorPoint.y);
        const shortLabel = zone.zone.replace('DEEP_', 'D-').replace('_LEFT', ' L').replace('_RIGHT', ' R').replace('_MID', ' M');
        ctx.font = `bold ${Math.max(10, 12 * anchor.scale)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(shortLabel, anchor.x, anchor.y);
      });

      // Draw man coverage lines
      manCoverage.forEach(man => {
        const defender = game.playerPositions.find(p => p.id === man.defenderId);
        const target = game.playerPositions.find(p => p.id === man.targetId);

        if (defender && target) {
          const defPos = toScreen(defender.x, defender.y);
          const tarPos = toScreen(target.x, target.y);

          // Draw line from defender to their man
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(defPos.x, defPos.y);
          ctx.lineTo(tarPos.x, tarPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Determine team assignments based on possession
    const offenseTeam = game.possession || 'home';
    const defenseTeam = offenseTeam === 'home' ? 'away' : 'home';

    // Sort players by depth (far players drawn first)
    const sortedPlayers = [...game.playerPositions].sort((a, b) => b.y - a.y);

    // Animation speed constants
    const RUN_CYCLE_SPEED = 0.4;  // radians per frame
    const BOB_CYCLE_SPEED = 0.3;

    // Update animation states and draw route trails for receivers
    const animStates = animStatesRef.current;
    const routeTrails = routeTrailsRef.current;

    // Draw route trails first (behind players)
    if (game.state === 'PLAY_RUNNING' || game.state === 'SNAP') {
      routeTrails.forEach((trail, playerId) => {
        // Age all points and remove old ones
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].age++;
          if (trail[i].age > 60) {
            trail.splice(i, 1);
          }
        }

        // Find the player to get their current position
        const player = game.playerPositions.find(p => p.id === playerId);
        if (player && player.role === 'offense') {
          // Add new trail point
          if (trail.length === 0 ||
              Math.abs(trail[trail.length - 1].x - player.x) > 1 ||
              Math.abs(trail[trail.length - 1].y - player.y) > 1) {
            trail.push({ x: player.x, y: player.y, age: 0 });
          }

          // Draw the trail
          drawRouteTrail(ctx, trail, toScreen, 'rgb(59, 130, 246)');
        }
      });
    } else {
      // Clear trails when play is not running
      routeTrails.clear();
    }

    // Draw players with vector graphics
    sortedPlayers.forEach(player => {
      const pos = toScreen(player.x, player.y);

      // Skip if off screen
      if (pos.y < fieldTop - 20 || pos.y > fieldBottom + 20) return;

      // Skip ball carrier (drawn on top separately)
      if (game.ballCarrier && player.id === game.ballCarrier.playerId) return;

      const isOffense = player.role === 'offense';
      const palette = TEAM_PALETTES[isOffense ? offenseTeam : defenseTeam];

      // Get or create animation state
      let animState = animStates.get(player.id);
      if (!animState) {
        animState = {
          legPhase: Math.random() * Math.PI * 2,
          bobPhase: Math.random() * Math.PI * 2,
          lastX: player.x,
          lastY: player.y,
          isMoving: false,
        };
        animStates.set(player.id, animState);
      }

      // Check if player is moving
      const dx = player.x - animState.lastX;
      const dy = player.y - animState.lastY;
      const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      animState.isMoving = moved;
      animState.lastX = player.x;
      animState.lastY = player.y;

      // Update animation phases when moving
      if (moved) {
        animState.legPhase += RUN_CYCLE_SPEED;
        animState.bobPhase += BOB_CYCLE_SPEED;
      }

      // Initialize route trail for receivers
      if (isOffense && !routeTrails.has(player.id)) {
        routeTrails.set(player.id, []);
      }

      // Draw the vector player with jersey number
      drawVectorPlayer(
        ctx,
        pos.x,
        pos.y,
        pos.scale,
        palette,
        animState,
        false,
        getJerseyNumber(player.id)
      );
    });

    // Draw ball carrier on top with highlight
    if (game.ballCarrier) {
      const pos = toScreen(game.ballCarrier.x, game.ballCarrier.y);
      const palette = TEAM_PALETTES[offenseTeam];

      // Get animation state
      let animState = animStates.get(game.ballCarrier.playerId);
      if (!animState) {
        animState = {
          legPhase: 0,
          bobPhase: 0,
          lastX: game.ballCarrier.x,
          lastY: game.ballCarrier.y,
          isMoving: false,
        };
        animStates.set(game.ballCarrier.playerId, animState);
      }

      // Ball carrier is always moving during play
      if (game.state === 'PLAY_RUNNING' || game.state === 'SNAP') {
        animState.isMoving = true;
        animState.legPhase += RUN_CYCLE_SPEED * 1.2; // Faster run
        animState.bobPhase += BOB_CYCLE_SPEED * 1.2;
      }

      // Draw with ball carrier highlight and jersey number
      drawVectorPlayer(
        ctx,
        pos.x,
        pos.y,
        pos.scale,
        palette,
        animState,
        true, // Ball carrier glow
        getJerseyNumber(game.ballCarrier.playerId)
      );
    }

    // Draw ball in flight with spiral effect
    if (game.ballInFlight) {
      const pos = toScreen(game.ballInFlight.x, game.ballInFlight.y);
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const liftAmount = arcHeight * 60 * pos.scale;

      // Ball spin rotation (based on progress)
      const spinAngle = game.ballInFlight.progress * Math.PI * 8; // 4 full rotations

      // Shadow on ground (shrinks as ball rises)
      const shadowOpacity = 0.3 + (1 - arcHeight) * 0.2;
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
      const shadowSize = (6 + arcHeight * 6) * pos.scale;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, shadowSize, shadowSize * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(pos.x, pos.y - liftAmount);
      ctx.rotate(spinAngle * 0.1); // Slight rotation for spiral effect

      const ballWidth = 14 * pos.scale;
      const ballHeight = 8 * pos.scale;

      // Glow effect
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12 * pos.scale;

      // Main football body with gradient
      const ballGradient = ctx.createRadialGradient(
        -ballWidth * 0.2, -ballHeight * 0.2, 0,
        0, 0, ballWidth
      );
      ballGradient.addColorStop(0, '#b45309');
      ballGradient.addColorStop(0.5, '#92400e');
      ballGradient.addColorStop(1, '#78350f');
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, ballWidth, ballHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Laces (white stitching)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, 2 * pos.scale);
      ctx.lineCap = 'round';

      // Center lace line
      ctx.beginPath();
      ctx.moveTo(-ballWidth * 0.35, 0);
      ctx.lineTo(ballWidth * 0.35, 0);
      ctx.stroke();

      // Cross laces
      const laceCount = 4;
      const laceSpacing = (ballWidth * 0.6) / laceCount;
      for (let i = 0; i < laceCount; i++) {
        const laceX = -ballWidth * 0.25 + i * laceSpacing;
        ctx.beginPath();
        ctx.moveTo(laceX, -ballHeight * 0.25);
        ctx.lineTo(laceX, ballHeight * 0.25);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Draw handoff effect (expanding ring flash with particle burst)
    if (game.handoffEffect) {
      const pos = toScreen(game.handoffEffect.x, game.handoffEffect.y);
      const progress = game.handoffEffect.progress;

      // Expanding ring that fades out
      const maxRadius = 60 * pos.scale;
      const opacity = 1 - progress;

      // Multiple rings for more impact
      for (let i = 0; i < 2; i++) {
        const ringProgress = Math.max(0, progress - i * 0.15);
        const ringOp = Math.max(0, opacity - i * 0.3);
        const radius = maxRadius * ringProgress;

        ctx.strokeStyle = `rgba(255, 215, 0, ${ringOp})`;
        ctx.lineWidth = Math.max(2, (5 - i * 2) * pos.scale * (1 - ringProgress));
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner flash with gradient
      if (progress < 0.3) {
        const innerOpacity = 1 - (progress / 0.3);
        const flashGradient = ctx.createRadialGradient(
          pos.x, pos.y, 0,
          pos.x, pos.y, 25 * pos.scale * (1 - progress / 0.3)
        );
        flashGradient.addColorStop(0, `rgba(255, 255, 255, ${innerOpacity * 0.8})`);
        flashGradient.addColorStop(0.5, `rgba(255, 220, 100, ${innerOpacity * 0.5})`);
        flashGradient.addColorStop(1, `rgba(255, 200, 50, 0)`);
        ctx.fillStyle = flashGradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25 * pos.scale * (1 - progress / 0.3), 0, Math.PI * 2);
        ctx.fill();
      }

      // Dust particles (small dots moving outward)
      if (progress < 0.7) {
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + progress * 2;
          const dist = progress * 40 * pos.scale;
          const particleX = pos.x + Math.cos(angle) * dist;
          const particleY = pos.y + Math.sin(angle) * dist * 0.5; // Flatten for perspective
          const particleSize = (1 - progress) * 3 * pos.scale;

          ctx.fillStyle = `rgba(200, 180, 150, ${(1 - progress / 0.7) * 0.6})`;
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw pressure indicator for QB when defenders are close
    // Find the QB as the backmost offensive player (before snap or during passing)
    if ((game.state === 'SNAP' || game.state === 'PLAY_RUNNING') && !game.ballCarrier) {
      const offensivePlayers = game.playerPositions.filter(p => p.role === 'offense');
      // QB is typically the backmost offensive player
      const qb = offensivePlayers.reduce((back, p) => {
        if (!back || p.y < back.y) return p;
        return back;
      }, null as typeof offensivePlayers[0] | null);

      if (qb) {
        // Calculate pressure based on nearby defenders
        const defenders = game.playerPositions.filter(p => p.role === 'defense');
        let pressure = 0;
        defenders.forEach(d => {
          const dist = Math.sqrt((d.x - qb.x) ** 2 + (d.y - qb.y) ** 2);
          if (dist < 30) {
            pressure += (30 - dist) / 30;
          }
        });
        pressure = Math.min(1, pressure / 2); // Normalize

        if (pressure > 0.1) {
          const qbPos = toScreen(qb.x, qb.y);
          drawPressureIndicator(ctx, qbPos.x, qbPos.y, qbPos.scale, pressure);
        }
      }
    }

    // Vignette effect
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.4,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw play result text when play is dead
    if (game.state === 'PLAY_DEAD' && game.playResult) {
      const result = game.playResult;
      let text = '';
      let subText = '';
      let color = '#ffffff';
      let glowColor = '#3b82f6';

      // Check for penalty first
      if (result.penalty) {
        const p = result.penalty;
        text = `FLAG: ${p.description.toUpperCase()}`;
        subText = `${p.yards} YARD PENALTY - ${p.team === 'offense' ? 'OFFENSE' : 'DEFENSE'}`;
        color = '#fbbf24'; // Yellow for flags
        glowColor = '#fbbf24';
      } else if (result.touchdown) {
        text = 'TOUCHDOWN!';
        color = '#fbbf24';
        glowColor = '#fbbf24';
      } else if (result.sack) {
        text = `SACK! ${Math.abs(result.yardsGained)} YARD LOSS`;
        color = '#ef4444';
        glowColor = '#ef4444';
      } else if (result.turnover) {
        text = 'TURNOVER!';
        color = '#ef4444';
        glowColor = '#ef4444';
      } else if (result.yardsGained > 0) {
        text = `GAIN OF ${result.yardsGained} YARD${result.yardsGained !== 1 ? 'S' : ''}`;
        color = '#22c55e';
        glowColor = '#22c55e';
      } else if (result.yardsGained < 0) {
        text = `LOSS OF ${Math.abs(result.yardsGained)} YARD${Math.abs(result.yardsGained) !== 1 ? 'S' : ''}`;
        color = '#ef4444';
        glowColor = '#ef4444';
      } else {
        text = 'NO GAIN';
        color = '#94a3b8';
        glowColor = '#94a3b8';
      }

      // Draw text with glow effect
      ctx.font = 'bold 42px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow/shadow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = color;
      ctx.fillText(text, width / 2, height / 2 - 20);

      // Outline for readability
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(text, width / 2, height / 2 - 20);

      // Fill again on top
      ctx.fillStyle = color;
      ctx.fillText(text, width / 2, height / 2 - 20);

      // Draw subtext for penalties
      if (subText) {
        ctx.font = 'bold 24px Inter, system-ui, sans-serif';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.fillText(subText, width / 2, height / 2 + 25);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(subText, width / 2, height / 2 + 25);
        ctx.fillStyle = color;
        ctx.fillText(subText, width / 2, height / 2 + 25);
      }
    }

  }, [game, width, height]);

  const { canvasRef } = useCanvas(draw, width, height);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />
      {/* Subtle CRT scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
    </div>
  );
};
