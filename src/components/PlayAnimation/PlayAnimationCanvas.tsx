import React, { useCallback, useEffect, useRef } from 'react';
import type { AnimationFrame, AnimatedPlayerState } from '../../types/PlayAnimation';

interface PlayAnimationCanvasProps {
  frame: AnimationFrame | null;
  width?: number;
  height?: number;
  showRouteTrails?: boolean;
  showLabels?: boolean;
  showYardLines?: boolean;
}

// Player colors based on role
const PLAYER_COLORS = {
  QB: { fill: '#dc2626', stroke: '#7f1d1d', text: '#ffffff' },      // Red
  OL: { fill: '#4b5563', stroke: '#1f2937', text: '#ffffff' },      // Gray
  RECEIVER: { fill: '#3b82f6', stroke: '#1e40af', text: '#ffffff' }, // Blue
  RB: { fill: '#22c55e', stroke: '#166534', text: '#ffffff' },       // Green
  BLOCKER: { fill: '#8b5cf6', stroke: '#5b21b6', text: '#ffffff' },  // Purple
};

// Ball carrier highlight
const BALL_CARRIER_COLOR = { fill: '#fbbf24', stroke: '#b45309', text: '#000000' }; // Gold

export const PlayAnimationCanvas: React.FC<PlayAnimationCanvasProps> = ({
  frame,
  width = 700,
  height = 450,
  showRouteTrails = true,
  showLabels = true,
  showYardLines = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert field coordinates (0-100) to canvas pixels
  const toCanvasX = useCallback((x: number) => (x / 100) * width, [width]);
  const toCanvasY = useCallback((y: number) => (y / 100) * height, [height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas - field green
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, width, height);

    // Draw yard lines
    if (showYardLines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (i / 10) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Hash marks
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.moveTo(width * 0.4, 0);
      ctx.lineTo(width * 0.4, height);
      ctx.moveTo(width * 0.6, 0);
      ctx.lineTo(width * 0.6, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Line of scrimmage
    const losY = height * 0.5;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, losY);
    ctx.lineTo(width, losY);
    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LINE OF SCRIMMAGE', 10, losY - 8);

    if (!frame) {
      // No frame - show placeholder text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Select a play and press Play', width / 2, height / 2 + 50);
      return;
    }

    // Draw route trails first (behind players)
    if (showRouteTrails) {
      for (const player of frame.players) {
        if (player.pathHistory.length > 1) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // Gold trail
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(toCanvasX(player.pathHistory[0].x), toCanvasY(player.pathHistory[0].y));
          for (const point of player.pathHistory) {
            ctx.lineTo(toCanvasX(point.x), toCanvasY(point.y));
          }
          ctx.stroke();
        }
      }
    }

    // Draw ball if in air
    if (frame.ball.isInAir && frame.ball.isVisible) {
      drawBall(ctx, toCanvasX(frame.ball.x), toCanvasY(frame.ball.y), true);
    }

    // Draw players
    for (const player of frame.players) {
      drawPlayer(ctx, player, toCanvasX, toCanvasY, showLabels);
    }

    // Draw ball on carrier
    if (!frame.ball.isInAir && frame.ball.carrier) {
      const carrier = frame.players.find(p => p.positionSlot === frame.ball.carrier);
      if (carrier) {
        drawBall(ctx, toCanvasX(carrier.x) + 12, toCanvasY(carrier.y) - 5, false);
      }
    }

    // Draw phase/event indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(width - 150, 10, 140, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(frame.phase.replace('_', ' '), width - 20, 30);

    // Draw event if present
    if (frame.event) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.fillRect(width / 2 - 100, height - 50, 200, 30);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(frame.event.description, width / 2, height - 30);
    }

    // Time display
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 80, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${(frame.timeMs / 1000).toFixed(1)}s`, 20, 27);

  }, [frame, width, height, showRouteTrails, showLabels, showYardLines, toCanvasX, toCanvasY]);

  // Redraw on frame change
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-600 rounded-lg shadow-lg"
    />
  );
};

/**
 * Draw a single player as a circle
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: AnimatedPlayerState,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  showLabels: boolean
): void {
  const x = toCanvasX(player.x);
  const y = toCanvasY(player.y);

  // Size varies by role
  let radius = 14;
  if (player.role === 'OL') radius = 16;
  if (player.role === 'QB') radius = 15;

  // Get colors
  const colors = player.hasBall
    ? BALL_CARRIER_COLOR
    : PLAYER_COLORS[player.role];

  // Draw shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw player circle
  if (player.role === 'OL') {
    // OL as rounded squares
    const size = radius * 1.6;
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    roundRect(ctx, x - size / 2, y - size / 2, size, size, 4);
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, x - size / 2, y - size / 2, size, size, 4);
    ctx.stroke();
  } else {
    // Everyone else as circles
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Ball carrier glow effect
  if (player.hasBall) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Tackle indicator
  if (player.isTackled) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    const crossSize = radius + 5;
    ctx.beginPath();
    ctx.moveTo(x - crossSize, y - crossSize);
    ctx.lineTo(x + crossSize, y + crossSize);
    ctx.moveTo(x + crossSize, y - crossSize);
    ctx.lineTo(x - crossSize, y + crossSize);
    ctx.stroke();
  }

  // Label
  if (showLabels) {
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.label, x, y);
  }
}

/**
 * Draw the football
 */
function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  inAir: boolean
): void {
  const ballWidth = inAir ? 14 : 10;
  const ballHeight = inAir ? 8 : 6;

  // Shadow when in air
  if (inAir) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 20, ballWidth * 0.8, ballHeight * 0.5, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ball
  ctx.fillStyle = '#8B4513'; // Brown
  ctx.beginPath();
  ctx.ellipse(x, y, ballWidth, ballHeight, inAir ? Math.PI / 6 : 0, 0, Math.PI * 2);
  ctx.fill();

  // Laces
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.lineTo(x + 3, y);
  ctx.stroke();
  // Lace lines
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 1.5, y - 2);
    ctx.lineTo(x + i * 1.5, y + 2);
    ctx.stroke();
  }
}

/**
 * Helper to draw rounded rectangles
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

export default PlayAnimationCanvas;
