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
  height = 600,
}) => {
  const draw = useCallback((ctx: CanvasRenderingContext2D, _frameCount: number) => {
    const ENGINE_WIDTH = 160;  // Sideline to sideline
    const ENGINE_HEIGHT = 360; // End to end (120 yards * 3)

    // Isometric camera settings
    // Camera is behind the offense, looking downfield
    // Y-axis (field length) goes "into" the screen (top = far downfield)
    // X-axis (sideline) stays horizontal

    const VISIBLE_YARDS = 50; // How much field depth to show
    const DEPTH_SCALE = 0.55; // How much to compress the Y axis (depth)
    const HORIZON_Y = 80; // Where the "horizon" is on screen (top area)

    // Calculate viewport based on LOS
    const losEngineY = (game.fieldPosition.yardLine / 100) * ENGINE_HEIGHT;
    const viewportStartY = losEngineY - 15 * 3.6; // 15 yards behind LOS
    const viewportEndY = viewportStartY + VISIBLE_YARDS * 3.6;

    // Clamp to field bounds
    const clampedStartY = Math.max(-30, Math.min(viewportStartY, ENGINE_HEIGHT - VISIBLE_YARDS * 3.6 + 30));
    const clampedEndY = clampedStartY + VISIBLE_YARDS * 3.6;

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

      // Perspective: things get narrower as they go into distance
      const perspectiveScale = 1 - depth * 0.6; // Near = 1.0, far = 0.4

      // X position: center at width/2, spread based on perspective
      const centerX = width / 2;
      const fieldWidthAtDepth = (width - fieldMarginX * 2) * perspectiveScale;
      const normalizedX = (engineX / ENGINE_WIDTH) - 0.5; // -0.5 to 0.5
      const screenX = centerX + normalizedX * fieldWidthAtDepth;

      return { x: screenX, y: screenY, scale: perspectiveScale };
    };

    // Draw the field with perspective
    // Draw grass stripes (every 5 yards)
    const startYard = Math.floor((clampedStartY / ENGINE_HEIGHT) * 100);
    const endYard = Math.ceil((clampedEndY / ENGINE_HEIGHT) * 100);

    for (let yard = Math.floor(startYard / 5) * 5; yard <= Math.ceil(endYard / 5) * 5; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY1 = (yard / 100) * ENGINE_HEIGHT;
      const engineY2 = ((yard + 5) / 100) * ENGINE_HEIGHT;

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
    if (clampedStartY < 0) {
      // Own endzone (near camera)
      const topLeft = toScreen(0, 0);
      const topRight = toScreen(ENGINE_WIDTH, 0);
      const bottomLeft = toScreen(0, clampedStartY);
      const bottomRight = toScreen(ENGINE_WIDTH, clampedStartY);

      ctx.fillStyle = '#5f1e1e';
      ctx.beginPath();
      ctx.moveTo(bottomLeft.x, bottomLeft.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(topLeft.x, topLeft.y);
      ctx.closePath();
      ctx.fill();
    }

    if (clampedEndY > ENGINE_HEIGHT) {
      // Opponent endzone (far from camera)
      const topLeft = toScreen(0, clampedEndY);
      const topRight = toScreen(ENGINE_WIDTH, clampedEndY);
      const bottomLeft = toScreen(0, ENGINE_HEIGHT);
      const bottomRight = toScreen(ENGINE_WIDTH, ENGINE_HEIGHT);

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

      const engineY = (yard / 100) * ENGINE_HEIGHT;
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

      const engineY = (yard / 100) * ENGINE_HEIGHT;
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
      const fdEngineY = (firstDownYard / 100) * ENGINE_HEIGHT;
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

    // Sort players by depth (far players drawn first)
    const sortedPlayers = [...game.playerPositions].sort((a, b) => b.y - a.y);

    // Draw players
    sortedPlayers.forEach(player => {
      const pos = toScreen(player.x, player.y);

      // Skip if off screen
      if (pos.y < fieldTop - 20 || pos.y > fieldBottom + 20) return;

      const isOffense = player.role === 'offense';
      const baseRadius = 14;
      const radius = baseRadius * pos.scale;

      // Player shadow (on ground)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(pos.x + 2, pos.y + radius * 0.3, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Player body
      const primaryColor = isOffense ? OFFENSE_PRIMARY : DEFENSE_PRIMARY;
      const secondaryColor = isOffense ? OFFENSE_SECONDARY : DEFENSE_SECONDARY;

      // Outer circle
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight (3D effect)
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(pos.x - radius * 0.2, pos.y - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(1, 2 * pos.scale);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw ball carrier on top with highlight
    if (game.ballCarrier) {
      const pos = toScreen(game.ballCarrier.x, game.ballCarrier.y);
      const baseRadius = 14;
      const radius = baseRadius * pos.scale;

      // Glow effect
      ctx.shadowColor = BALL_CARRIER_GLOW;
      ctx.shadowBlur = 20 * pos.scale;
      ctx.fillStyle = BALL_CARRIER_GLOW;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 4 * pos.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Player
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, 3 * pos.scale);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const pos = toScreen(game.ballInFlight.x, game.ballInFlight.y);
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const liftAmount = arcHeight * 60 * pos.scale;

      // Shadow on ground
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      const shadowSize = (8 + arcHeight * 4) * pos.scale;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, shadowSize, shadowSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Football
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#92400e';
      const ballWidth = 12 * pos.scale;
      const ballHeight = 7 * pos.scale;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - liftAmount, ballWidth, ballHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(pos.x - 2, pos.y - liftAmount - 2, ballWidth * 0.5, ballHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Laces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 2 * pos.scale);
      ctx.beginPath();
      ctx.moveTo(pos.x - 4 * pos.scale, pos.y - liftAmount);
      ctx.lineTo(pos.x + 4 * pos.scale, pos.y - liftAmount);
      ctx.stroke();
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
