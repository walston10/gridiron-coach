import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { GameState, FieldPlayer, Vector2 } from '../../types/GameSim';

interface GameCanvasProps {
  gameState: GameState | null;
  onFieldClick?: (location: Vector2) => void;
  width?: number;
  height?: number;
}

// Field dimensions (matching GameEngine)
export const FIELD_WIDTH = 160;
export const FIELD_HEIGHT = 360;

// Colors
const COLORS = {
  grass: '#2d5a27',
  grassStripe: '#326b2c',
  endzone: '#1a3d16',
  endzoneText: '#ffffff22',
  lines: '#ffffff',
  hashMarks: '#ffffff88',
  offense: '#3b82f6', // Blue
  offenseOutline: '#1e40af',
  defense: '#ef4444', // Red
  defenseOutline: '#991b1b',
  ball: '#8b4513',
  ballCarrierGlow: '#fbbf24',
  passArc: '#fbbf2480',
  landingSpot: '#fbbf24',
  text: '#ffffff',
};

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(({
  gameState,
  onFieldClick,
  width = 400,
  height = 720,
}, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = internalRef;

  // Expose the canvas ref to parent
  useImperativeHandle(ref, () => internalRef.current!, []);

  // Scale factors
  const scaleX = width / FIELD_WIDTH;
  const scaleY = height / FIELD_HEIGHT;

  // Convert field coords to canvas coords
  const toCanvasX = useCallback((x: number) => x * scaleX, [scaleX]);
  const toCanvasY = useCallback((y: number) => y * scaleY, [scaleY]);

  // Convert canvas coords to field coords
  const toFieldX = useCallback((x: number) => x / scaleX, [scaleX]);
  const toFieldY = useCallback((y: number) => y / scaleY, [scaleY]);

  // Draw the field
  const drawField = useCallback((ctx: CanvasRenderingContext2D) => {
    // Grass background with stripes
    for (let y = 0; y < FIELD_HEIGHT; y += 15) {
      ctx.fillStyle = Math.floor(y / 15) % 2 === 0 ? COLORS.grass : COLORS.grassStripe;
      ctx.fillRect(0, toCanvasY(y), width, toCanvasY(15));
    }

    // Endzones
    ctx.fillStyle = COLORS.endzone;
    ctx.fillRect(0, 0, width, toCanvasY(30)); // Top endzone (0-10 yards)
    ctx.fillRect(0, toCanvasY(330), width, toCanvasY(30)); // Bottom endzone (100-110 yards)

    // Endzone text
    ctx.save();
    ctx.fillStyle = COLORS.endzoneText;
    ctx.font = `bold ${toCanvasY(20)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top endzone text (rotated)
    ctx.save();
    ctx.translate(width / 2, toCanvasY(15));
    ctx.rotate(Math.PI);
    ctx.fillText('ENDZONE', 0, 0);
    ctx.restore();

    // Bottom endzone text
    ctx.fillText('ENDZONE', width / 2, toCanvasY(345));
    ctx.restore();

    // Yard lines
    ctx.strokeStyle = COLORS.lines;
    ctx.lineWidth = 2;

    for (let yard = 0; yard <= 100; yard += 5) {
      const y = toCanvasY((yard + 10) * 3); // +10 for endzone offset, *3 for scale

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Yard numbers (every 10 yards, not at goal lines)
      if (yard % 10 === 0 && yard > 0 && yard < 100) {
        ctx.fillStyle = COLORS.lines;
        ctx.font = `bold ${toCanvasY(12)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const displayYard = yard <= 50 ? yard : 100 - yard;

        // Left side number
        ctx.save();
        ctx.translate(toCanvasX(15), y);
        ctx.fillText(displayYard.toString(), 0, 0);
        ctx.restore();

        // Right side number
        ctx.save();
        ctx.translate(toCanvasX(FIELD_WIDTH - 15), y);
        ctx.fillText(displayYard.toString(), 0, 0);
        ctx.restore();
      }
    }

    // Hash marks
    ctx.strokeStyle = COLORS.hashMarks;
    ctx.lineWidth = 1;

    for (let yard = 1; yard < 100; yard++) {
      if (yard % 5 === 0) continue; // Skip where yard lines are

      const y = toCanvasY((yard + 10) * 3);

      // Left hash
      ctx.beginPath();
      ctx.moveTo(toCanvasX(55), y);
      ctx.lineTo(toCanvasX(60), y);
      ctx.stroke();

      // Right hash
      ctx.beginPath();
      ctx.moveTo(toCanvasX(100), y);
      ctx.lineTo(toCanvasX(105), y);
      ctx.stroke();
    }

    // Sidelines
    ctx.strokeStyle = COLORS.lines;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, toCanvasY(30), width, toCanvasY(300));
  }, [width, toCanvasX, toCanvasY]);

  // Draw a player
  const drawPlayer = useCallback((
    ctx: CanvasRenderingContext2D,
    player: FieldPlayer,
    isOffense: boolean,
    isBallCarrier: boolean
  ) => {
    const x = toCanvasX(player.location.x);
    const y = toCanvasY(player.location.y);
    const radius = toCanvasX(5);

    // Ball carrier glow
    if (isBallCarrier) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ballCarrierGlow;
      ctx.fill();
    }

    // Player circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isOffense ? COLORS.offense : COLORS.defense;
    ctx.fill();
    ctx.strokeStyle = isOffense ? COLORS.offenseOutline : COLORS.defenseOutline;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Position label
    ctx.fillStyle = COLORS.text;
    ctx.font = `bold ${toCanvasX(4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Abbreviate position for display
    const posLabel = getPositionLabel(player.rosterPosition);
    ctx.fillText(posLabel, x, y);
  }, [toCanvasX, toCanvasY]);

  // Draw pass flight arc
  const drawPassFlight = useCallback((
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    progress: number
  ) => {
    // Draw arc from start to landing spot
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(toCanvasX(startX), toCanvasY(startY));
    ctx.lineTo(toCanvasX(endX), toCanvasY(endY));
    ctx.strokeStyle = COLORS.passArc;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw landing spot target
    const targetX = toCanvasX(endX);
    const targetY = toCanvasY(endY);
    const targetRadius = toCanvasX(8);

    // Outer ring
    ctx.beginPath();
    ctx.arc(targetX, targetY, targetRadius, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.landingSpot;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner crosshair
    ctx.beginPath();
    ctx.moveTo(targetX - targetRadius / 2, targetY);
    ctx.lineTo(targetX + targetRadius / 2, targetY);
    ctx.moveTo(targetX, targetY - targetRadius / 2);
    ctx.lineTo(targetX, targetY + targetRadius / 2);
    ctx.stroke();
  }, [toCanvasX, toCanvasY]);

  // Draw the ball
  const drawBall = useCallback((
    ctx: CanvasRenderingContext2D,
    location: Vector2,
    inFlight: boolean = false
  ) => {
    const x = toCanvasX(location.x);
    const y = toCanvasY(location.y);

    // Shadow for ball in flight
    if (inFlight) {
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 5, toCanvasX(2.5), toCanvasY(1.5), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
    }

    // Football shape (ellipse)
    ctx.beginPath();
    ctx.ellipse(x, y - (inFlight ? toCanvasY(6) : toCanvasY(3)), toCanvasX(2), toCanvasY(3), 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Laces
    ctx.beginPath();
    ctx.moveTo(x, y - (inFlight ? toCanvasY(8) : toCanvasY(5)));
    ctx.lineTo(x, y - (inFlight ? toCanvasY(4) : toCanvasY(1)));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [toCanvasX, toCanvasY]);

  // Draw line of scrimmage
  const drawLineOfScrimmage = useCallback((
    ctx: CanvasRenderingContext2D,
    yardLine: number
  ) => {
    const y = toCanvasY((yardLine + 10) * 3);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [width, toCanvasY]);

  // Draw first down line
  const drawFirstDownLine = useCallback((
    ctx: CanvasRenderingContext2D,
    yardLine: number,
    yardsToGo: number
  ) => {
    const firstDownYard = yardLine + yardsToGo;
    if (firstDownYard > 100) return; // Already in endzone

    const y = toCanvasY((firstDownYard + 10) * 3);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [width, toCanvasY]);

  // Main render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw field
    drawField(ctx);

    if (!gameState) return;

    // Draw line of scrimmage and first down line
    drawLineOfScrimmage(ctx, gameState.field.yardLine);
    drawFirstDownLine(ctx, gameState.field.yardLine, gameState.field.yardsToGo);

    // Draw pass flight arc if ball is in air
    if (gameState.passFlight) {
      const { startLocation, landingSpot, elapsedTime, airTime } = gameState.passFlight;
      drawPassFlight(ctx, startLocation.x, startLocation.y, landingSpot.x, landingSpot.y, elapsedTime / airTime);
    }

    // Draw offensive players
    gameState.offensivePlayers.forEach(player => {
      const isBallCarrier = gameState.ballCarrier === player.id;
      drawPlayer(ctx, player, true, isBallCarrier);
    });

    // Draw defensive players
    gameState.defensivePlayers.forEach(player => {
      drawPlayer(ctx, player, false, false);
    });

    // Draw ball
    if (gameState.ballLocation) {
      const inFlight = !!gameState.passFlight;
      drawBall(ctx, gameState.ballLocation, inFlight);
    }
  }, [gameState, width, height, drawField, drawPlayer, drawBall, drawLineOfScrimmage, drawFirstDownLine, drawPassFlight]);

  // Handle clicks - now for throwing to spot
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onFieldClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const fieldX = toFieldX(e.clientX - rect.left);
    const fieldY = toFieldY(e.clientY - rect.top);

    onFieldClick({ x: fieldX, y: fieldY });
  }, [onFieldClick, toFieldX, toFieldY]);

  // Show crosshair cursor when QB has ball
  const showThrowCursor = gameState?.ballCarrier === 'qb' && gameState?.phase === 'SNAP';

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{
        border: '2px solid #374151',
        borderRadius: '4px',
        cursor: showThrowCursor ? 'crosshair' : 'default',
      }}
    />
  );
});

// Helper to get short position label
function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    QB: 'QB',
    RB: 'RB',
    FB: 'FB',
    WR: 'WR',
    TE: 'TE',
    LT: 'LT',
    LG: 'LG',
    C: 'C',
    RG: 'RG',
    RT: 'RT',
    DE: 'DE',
    DT: 'DT',
    NT: 'NT',
    OLB: 'OL',
    MLB: 'ML',
    ILB: 'IL',
    CB: 'CB',
    FS: 'FS',
    SS: 'SS',
  };
  return labels[position] || position.substring(0, 2);
}

export default GameCanvas;
