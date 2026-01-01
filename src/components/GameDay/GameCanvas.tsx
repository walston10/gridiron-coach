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
    const ENGINE_HEIGHT = 360; // 120 yards total (including endzones) * 3 units per yard

    // Camera settings - show ~65 yards of field, keeping LOS toward left for forward visibility
    const VISIBLE_YARDS = 65; // How many yards of field to show (about 2/3 of field)
    const LOS_OFFSET = 15; // LOS appears 15 yards from left edge (giving room for backfield)

    // Calculate viewport in engine units (3 units per yard)
    const losEngineY = (game.fieldPosition.yardLine / 100) * ENGINE_HEIGHT;
    const viewportStartY = losEngineY - (LOS_OFFSET * 3.6); // 3.6 units per yard in engine
    const viewportEndY = viewportStartY + (VISIBLE_YARDS * 3.6);

    // Clamp viewport to field bounds with padding for endzones
    const clampedStartY = Math.max(-30, Math.min(viewportStartY, ENGINE_HEIGHT - VISIBLE_YARDS * 3.6 + 30));
    const clampedEndY = clampedStartY + (VISIBLE_YARDS * 3.6);

    const fieldLeft = 40;
    const fieldRight = width - 40;
    const fieldTop = 40;
    const fieldBottom = height - 40;
    const playableWidth = fieldRight - fieldLeft;
    const playableHeight = fieldBottom - fieldTop;

    // Convert engine Y coordinate to canvas X (zoomed)
    const engineYToCanvasX = (engineY: number) => {
      const normalized = (engineY - clampedStartY) / (clampedEndY - clampedStartY);
      return fieldLeft + normalized * playableWidth;
    };

    // Convert engine X coordinate to canvas Y (sideline position)
    const engineXToCanvasY = (engineX: number) => {
      return fieldTop + (engineX / ENGINE_WIDTH) * playableHeight;
    };

    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Calculate which yard lines are visible
    const startYard = Math.floor((clampedStartY / ENGINE_HEIGHT) * 100);
    const endYard = Math.ceil((clampedEndY / ENGINE_HEIGHT) * 100);

    // Draw endzones if visible
    const ownEndzoneY = 0; // 0 yards
    const oppEndzoneY = ENGINE_HEIGHT; // 100 yards

    // Own endzone (left side of screen when near own goal)
    if (clampedStartY < 0) {
      const endzoneEndX = engineYToCanvasX(0);
      ctx.fillStyle = '#5f1e1e';
      ctx.fillRect(fieldLeft, fieldTop, endzoneEndX - fieldLeft, playableHeight);
    }

    // Opponent endzone (right side of screen when in red zone)
    if (clampedEndY > ENGINE_HEIGHT) {
      const endzoneStartX = engineYToCanvasX(ENGINE_HEIGHT);
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(endzoneStartX, fieldTop, fieldRight - endzoneStartX, playableHeight);
    }

    // Draw alternating grass stripes (every 5 yards)
    for (let yard = Math.floor(startYard / 5) * 5; yard <= Math.ceil(endYard / 5) * 5; yard += 5) {
      if (yard < 0 || yard > 100) continue;
      const engineY1 = (yard / 100) * ENGINE_HEIGHT;
      const engineY2 = ((yard + 5) / 100) * ENGINE_HEIGHT;
      const x1 = engineYToCanvasX(engineY1);
      const x2 = engineYToCanvasX(engineY2);
      ctx.fillStyle = (yard / 5) % 2 === 0 ? '#166534' : '#15803d';
      ctx.fillRect(Math.max(fieldLeft, x1), fieldTop, Math.min(fieldRight, x2) - Math.max(fieldLeft, x1), playableHeight);
    }

    // Draw hash marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    const hashTop = fieldTop + playableHeight * 0.35;
    const hashBottom = fieldTop + playableHeight * 0.65;

    for (let yard = Math.max(1, startYard); yard <= Math.min(99, endYard); yard++) {
      const engineY = (yard / 100) * ENGINE_HEIGHT;
      const x = engineYToCanvasX(engineY);
      if (x < fieldLeft || x > fieldRight) continue;

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

    // Draw yard lines (every 10 yards) - thicker
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;

    for (let yard = Math.floor(startYard / 10) * 10; yard <= Math.ceil(endYard / 10) * 10; yard += 10) {
      if (yard < 0 || yard > 100) continue;
      const engineY = (yard / 100) * ENGINE_HEIGHT;
      const x = engineYToCanvasX(engineY);
      if (x < fieldLeft || x > fieldRight) continue;

      ctx.beginPath();
      ctx.moveTo(x, fieldTop);
      ctx.lineTo(x, fieldBottom);
      ctx.stroke();
    }

    // Draw 5-yard lines (thinner)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    for (let yard = Math.floor(startYard / 5) * 5 + 5; yard <= endYard; yard += 10) {
      if (yard < 0 || yard > 100) continue;
      const engineY = (yard / 100) * ENGINE_HEIGHT;
      const x = engineYToCanvasX(engineY);
      if (x < fieldLeft || x > fieldRight) continue;

      ctx.beginPath();
      ctx.moveTo(x, fieldTop);
      ctx.lineTo(x, fieldBottom);
      ctx.stroke();
    }

    // Draw yard numbers with shadow - larger since we're zoomed in
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (let yard = Math.floor(startYard / 10) * 10; yard <= Math.ceil(endYard / 10) * 10; yard += 10) {
      if (yard <= 0 || yard >= 100) continue;
      const engineY = (yard / 100) * ENGINE_HEIGHT;
      const x = engineYToCanvasX(engineY);
      if (x < fieldLeft + 30 || x > fieldRight - 30) continue;

      const num = yard <= 50 ? yard : 100 - yard;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(num.toString(), x + 1, fieldTop - 8 + 1);
      ctx.fillText(num.toString(), x + 1, fieldBottom + 28 + 1);

      // Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(num.toString(), x, fieldTop - 8);
      ctx.fillText(num.toString(), x, fieldBottom + 28);
    }

    // Draw field border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(fieldLeft, fieldTop, playableWidth, playableHeight);

    // Draw line of scrimmage (Blue TV line with glow)
    const losX = engineYToCanvasX(losEngineY);
    if (losX >= fieldLeft && losX <= fieldRight) {
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#1d4ed8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(losX, fieldTop);
      ctx.lineTo(losX, fieldBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw first down line (Yellow TV line with glow)
    const firstDownYard = game.fieldPosition.yardLine + game.fieldPosition.yardsToGo;
    if (firstDownYard <= 100) {
      const fdEngineY = (firstDownYard / 100) * ENGINE_HEIGHT;
      const fdX = engineYToCanvasX(fdEngineY);
      if (fdX >= fieldLeft && fdX <= fieldRight) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(fdX, fieldTop);
        ctx.lineTo(fdX, fieldBottom);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Player size - balanced for 65 yard view
    const playerRadius = 15;
    const innerRadius = 9;

    // Draw players
    game.playerPositions.forEach(player => {
      const canvasX = engineYToCanvasX(player.y);
      const canvasY = engineXToCanvasY(player.x);

      // Skip players off screen
      if (canvasX < fieldLeft - playerRadius || canvasX > fieldRight + playerRadius) return;

      const isOffense = player.role === 'offense';

      // Player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(canvasX + 3, canvasY + 5, playerRadius, playerRadius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Player body (gradient effect using two circles)
      const primaryColor = isOffense ? OFFENSE_PRIMARY : DEFENSE_PRIMARY;
      const secondaryColor = isOffense ? OFFENSE_SECONDARY : DEFENSE_SECONDARY;

      // Outer ring
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, playerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(canvasX - 3, canvasY - 3, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // White border ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, playerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Direction indicator (small arrow/notch pointing toward opponent endzone)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(canvasX + playerRadius, canvasY);
      ctx.lineTo(canvasX + playerRadius - 6, canvasY - 5);
      ctx.lineTo(canvasX + playerRadius - 6, canvasY + 5);
      ctx.closePath();
      ctx.fill();
    });

    // Draw ball carrier highlight (glow effect)
    if (game.ballCarrier) {
      const ballCanvasX = engineYToCanvasX(game.ballCarrier.y);
      const ballCanvasY = engineXToCanvasY(game.ballCarrier.x);

      // Outer glow
      ctx.shadowColor = BALL_CARRIER_GLOW;
      ctx.shadowBlur = 25;
      ctx.fillStyle = BALL_CARRIER_GLOW;
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, playerRadius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner player
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, playerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Ball carrier ring
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ballCanvasX, ballCanvasY, playerRadius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Direction arrow pointing right (toward opponent endzone)
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.moveTo(ballCanvasX + playerRadius + 2, ballCanvasY);
      ctx.lineTo(ballCanvasX + playerRadius - 5, ballCanvasY - 6);
      ctx.lineTo(ballCanvasX + playerRadius - 5, ballCanvasY + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const ballCanvasX = engineYToCanvasX(game.ballInFlight.y);
      const ballCanvasY = engineXToCanvasY(game.ballInFlight.x);

      // Ball shadow (gets smaller as ball rises then falls)
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const shadowSize = 10 + arcHeight * 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX, ballCanvasY + 25, shadowSize, shadowSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball rises in arc during flight
      const ballLift = arcHeight * 50;

      // Football glow
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;

      // Football (brown ellipse) - larger since zoomed
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX, ballCanvasY - ballLift, 15, 9, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Football highlight
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(ballCanvasX - 2, ballCanvasY - ballLift - 2, 8, 4, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Laces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ballCanvasX - 6, ballCanvasY - ballLift);
      ctx.lineTo(ballCanvasX + 6, ballCanvasY - ballLift);
      ctx.stroke();

      // Cross laces
      for (let i = -4; i <= 4; i += 2) {
        ctx.beginPath();
        ctx.moveTo(ballCanvasX + i, ballCanvasY - ballLift - 3);
        ctx.lineTo(ballCanvasX + i, ballCanvasY - ballLift + 3);
        ctx.stroke();
      }
    }

    // Draw vignette effect around edges
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.65
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
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
