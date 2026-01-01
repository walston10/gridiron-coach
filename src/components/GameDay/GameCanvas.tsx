import React, { useCallback } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import type { LiveGame } from '../../types';

interface GameCanvasProps {
  game: LiveGame;
  width?: number;
  height?: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  game,
  width = 900,
  height = 500,
}) => {
  const draw = useCallback((ctx: CanvasRenderingContext2D, frameCount: number) => {
    // Clear and draw field
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, width, height);

    // Draw yard lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 100; i += 10) {
      const x = (i / 100) * (width - 100) + 50;
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, height - 50);
      ctx.stroke();

      // Yard numbers
      if (i > 0 && i < 100) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        const num = i <= 50 ? i : 100 - i;
        ctx.fillText(num.toString(), x, 40);
        ctx.fillText(num.toString(), x, height - 25);
      }
    }

    // Draw line of scrimmage
    const losX = (game.fieldPosition.yardLine / 100) * (width - 100) + 50;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(losX, 50);
    ctx.lineTo(losX, height - 50);
    ctx.stroke();

    // Draw first down line
    const firstDownYard = game.fieldPosition.yardLine + game.fieldPosition.yardsToGo;
    if (firstDownYard <= 100) {
      const fdX = (firstDownYard / 100) * (width - 100) + 50;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fdX, 50);
      ctx.lineTo(fdX, height - 50);
      ctx.stroke();
    }

    // Draw players
    // Engine coords: X=0-160 (sideline to sideline), Y=0-360 (endzone to endzone)
    // Canvas: X=0 to width (left endzone to right endzone), Y=0 to height (top sideline to bottom sideline)
    const ENGINE_WIDTH = 160;
    const ENGINE_HEIGHT = 360;
    const fieldLeft = 50;
    const fieldRight = width - 50;
    const fieldTop = 50;
    const fieldBottom = height - 50;
    const playableWidth = fieldRight - fieldLeft;
    const playableHeight = fieldBottom - fieldTop;

    game.playerPositions.forEach(player => {
      // Engine Y (0-360) maps to canvas X (field position)
      // Engine Y 0 = own endzone, 360 = opponent endzone
      const canvasX = fieldLeft + (player.y / ENGINE_HEIGHT) * playableWidth;

      // Engine X (0-160) maps to canvas Y (sideline position)
      const canvasY = fieldTop + (player.x / ENGINE_WIDTH) * playableHeight;

      ctx.fillStyle = player.role === 'offense' ? '#ffffff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw ball carrier highlight
    if (game.ballCarrier) {
      const ballCanvasX = fieldLeft + (game.ballCarrier.y / ENGINE_HEIGHT) * playableWidth;
      const ballCanvasY = fieldTop + (game.ballCarrier.x / ENGINE_WIDTH) * playableHeight;

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const ballCanvasX = fieldLeft + (game.ballInFlight.y / ENGINE_HEIGHT) * playableWidth;
      const ballCanvasY = fieldTop + (game.ballInFlight.x / ENGINE_WIDTH) * playableHeight;

      // Draw ball shadow (gets smaller as ball rises then falls)
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const shadowSize = 6 + arcHeight * 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX, ballCanvasY + 15, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw the football (brown ellipse) - rises in arc during flight
      const ballLift = arcHeight * 30; // Ball rises up to 30px at apex
      ctx.fillStyle = '#8B4513'; // Brown
      ctx.beginPath();
      ctx.ellipse(ballCanvasX, ballCanvasY - ballLift, 10, 6, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw laces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ballCanvasX - 4, ballCanvasY - ballLift);
      ctx.lineTo(ballCanvasX + 4, ballCanvasY - ballLift);
      ctx.stroke();
    }
  }, [game, width, height]);

  const { canvasRef } = useCanvas(draw, width, height);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-600 rounded"
    />
  );
};