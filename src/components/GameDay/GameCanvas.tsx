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

    // Draw handoff effect (expanding ring flash)
    if (game.handoffEffect) {
      const pos = toScreen(game.handoffEffect.x, game.handoffEffect.y);
      const progress = game.handoffEffect.progress;

      // Expanding ring that fades out
      const maxRadius = 60 * pos.scale;
      const ringRadius = maxRadius * progress;
      const opacity = 1 - progress;

      ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`; // Gold color
      ctx.lineWidth = Math.max(3, 6 * pos.scale * (1 - progress));
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20 * (1 - progress);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner flash
      if (progress < 0.3) {
        const innerOpacity = 1 - (progress / 0.3);
        ctx.fillStyle = `rgba(255, 255, 200, ${innerOpacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20 * pos.scale * (1 - progress / 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
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
