import React, { useCallback } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import type { LiveGame } from '../../types';

interface GameCanvasProps {
  game: LiveGame;
  width?: number;
  height?: number;
}

// Team colors for visual distinction
const OFFENSE_PRIMARY = '#1e3a8a'; // Navy blue
const OFFENSE_SECONDARY = '#3b82f6'; // Light blue
const DEFENSE_PRIMARY = '#991b1b'; // Dark red
const DEFENSE_SECONDARY = '#ef4444'; // Light red
const BALL_CARRIER_GLOW = '#fbbf24'; // Yellow/gold

export const GameCanvas: React.FC<GameCanvasProps> = ({
  game,
  width = 900,
  height = 500,
}) => {
  const draw = useCallback((ctx: CanvasRenderingContext2D, _frameCount: number) => {
    const ENGINE_WIDTH = 160;
    const ENGINE_HEIGHT = 360;
    const fieldLeft = 50;
    const fieldRight = width - 50;
    const fieldTop = 50;
    const fieldBottom = height - 50;
    const playableWidth = fieldRight - fieldLeft;
    const playableHeight = fieldBottom - fieldTop;

    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw endzone areas
    const endzoneWidth = playableWidth * (10 / 100); // 10 yards

    // Left endzone (opponent's)
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(fieldLeft - endzoneWidth, fieldTop, endzoneWidth, playableHeight);

    // Right endzone (own)
    ctx.fillStyle = '#5f1e1e';
    ctx.fillRect(fieldRight, fieldTop, endzoneWidth, playableHeight);

    // Draw alternating grass stripes (every 5 yards)
    for (let i = 0; i <= 20; i++) {
      const x1 = fieldLeft + (i * 5 / 100) * playableWidth;
      const x2 = fieldLeft + ((i + 1) * 5 / 100) * playableWidth;
      ctx.fillStyle = i % 2 === 0 ? '#166534' : '#15803d';
      ctx.fillRect(x1, fieldTop, x2 - x1, playableHeight);
    }

    // Draw hash marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    const hashTop = fieldTop + playableHeight * 0.35;
    const hashBottom = fieldTop + playableHeight * 0.65;

    for (let i = 1; i < 100; i++) {
      const x = fieldLeft + (i / 100) * playableWidth;
      // Top hash
      ctx.beginPath();
      ctx.moveTo(x, hashTop - 5);
      ctx.lineTo(x, hashTop + 5);
      ctx.stroke();
      // Bottom hash
      ctx.beginPath();
      ctx.moveTo(x, hashBottom - 5);
      ctx.lineTo(x, hashBottom + 5);
      ctx.stroke();
    }

    // Draw yard lines (every 10 yards)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 100; i += 10) {
      const x = (i / 100) * playableWidth + fieldLeft;
      ctx.beginPath();
      ctx.moveTo(x, fieldTop);
      ctx.lineTo(x, fieldBottom);
      ctx.stroke();
    }

    // Draw 5-yard lines (thinner)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;

    for (let i = 5; i <= 95; i += 10) {
      const x = (i / 100) * playableWidth + fieldLeft;
      ctx.beginPath();
      ctx.moveTo(x, fieldTop);
      ctx.lineTo(x, fieldBottom);
      ctx.stroke();
    }

    // Draw yard numbers with shadow
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (let i = 10; i <= 90; i += 10) {
      const x = (i / 100) * playableWidth + fieldLeft;
      const num = i <= 50 ? i : 100 - i;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(num.toString(), x + 1, fieldTop - 12 + 1);
      ctx.fillText(num.toString(), x + 1, fieldBottom + 22 + 1);

      // Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(num.toString(), x, fieldTop - 12);
      ctx.fillText(num.toString(), x, fieldBottom + 22);
    }

    // Draw field border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(fieldLeft, fieldTop, playableWidth, playableHeight);

    // Draw line of scrimmage (Blue/Black TV line)
    const losX = (game.fieldPosition.yardLine / 100) * playableWidth + fieldLeft;
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#1d4ed8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(losX, fieldTop);
    ctx.lineTo(losX, fieldBottom);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw first down line (Yellow TV line with glow)
    const firstDownYard = game.fieldPosition.yardLine + game.fieldPosition.yardsToGo;
    if (firstDownYard <= 100) {
      const fdX = (firstDownYard / 100) * playableWidth + fieldLeft;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(fdX, fieldTop);
      ctx.lineTo(fdX, fieldBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw players
    game.playerPositions.forEach(player => {
      const canvasX = fieldLeft + (player.y / ENGINE_HEIGHT) * playableWidth;
      const canvasY = fieldTop + (player.x / ENGINE_WIDTH) * playableHeight;
      const isOffense = player.role === 'offense';

      // Player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(canvasX + 2, canvasY + 4, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Player body (gradient effect using two circles)
      const primaryColor = isOffense ? OFFENSE_PRIMARY : DEFENSE_PRIMARY;
      const secondaryColor = isOffense ? OFFENSE_SECONDARY : DEFENSE_SECONDARY;

      // Outer ring
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(canvasX - 2, canvasY - 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // White border ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Direction indicator (small arrow/notch at top)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(canvasX, canvasY - 14);
      ctx.lineTo(canvasX - 4, canvasY - 10);
      ctx.lineTo(canvasX + 4, canvasY - 10);
      ctx.closePath();
      ctx.fill();
    });

    // Draw ball carrier highlight (glow effect)
    if (game.ballCarrier) {
      const ballCanvasX = fieldLeft + (game.ballCarrier.y / ENGINE_HEIGHT) * playableWidth;
      const ballCanvasY = fieldTop + (game.ballCarrier.x / ENGINE_WIDTH) * playableHeight;

      // Outer glow
      ctx.shadowColor = BALL_CARRIER_GLOW;
      ctx.shadowBlur = 20;
      ctx.fillStyle = BALL_CARRIER_GLOW;
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner player
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Ball carrier ring
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Direction arrow
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.moveTo(ballCanvasX, ballCanvasY - 16);
      ctx.lineTo(ballCanvasX - 5, ballCanvasY - 10);
      ctx.lineTo(ballCanvasX + 5, ballCanvasY - 10);
      ctx.closePath();
      ctx.fill();
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const ballCanvasX = fieldLeft + (game.ballInFlight.y / ENGINE_HEIGHT) * playableWidth;
      const ballCanvasY = fieldTop + (game.ballInFlight.x / ENGINE_WIDTH) * playableHeight;

      // Ball shadow (gets smaller as ball rises then falls)
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const shadowSize = 8 + arcHeight * 6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX, ballCanvasY + 20, shadowSize, shadowSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball rises in arc during flight
      const ballLift = arcHeight * 40;

      // Football glow
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;

      // Football (brown ellipse)
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX, ballCanvasY - ballLift, 12, 7, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Football highlight
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX - 2, ballCanvasY - ballLift - 2, 6, 3, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Laces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ballCanvasX - 5, ballCanvasY - ballLift);
      ctx.lineTo(ballCanvasX + 5, ballCanvasY - ballLift);
      ctx.stroke();

      // Cross laces
      for (let i = -3; i <= 3; i += 2) {
        ctx.beginPath();
        ctx.moveTo(ballCanvasX + i, ballCanvasY - ballLift - 2);
        ctx.lineTo(ballCanvasX + i, ballCanvasY - ballLift + 2);
        ctx.stroke();
      }
    }

    // Draw vignette effect around edges
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

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
      {/* Overlay scanlines effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
    </div>
  );
};
