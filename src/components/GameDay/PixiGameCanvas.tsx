import React, { useRef, useEffect, useState } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { LiveGame } from '../../types';

interface PixiGameCanvasProps {
  game: LiveGame;
  width?: number;
  height?: number;
}

// Team colors
const OFFENSE_PRIMARY = 0x1e3a8a;
const OFFENSE_SECONDARY = 0x3b82f6;
const DEFENSE_PRIMARY = 0x991b1b;
const DEFENSE_SECONDARY = 0xef4444;
const BALL_CARRIER_GLOW = 0xfbbf24;

export const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({
  game,
  width = 900,
  height = 600,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const fieldContainerRef = useRef<Container | null>(null);
  const dynamicContainerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);

  const ENGINE_WIDTH = 160;
  const VISIBLE_YARDS = 50;
  const HORIZON_Y = 80;
  const YARDS_TO_UNITS = 3;

  // Coordinate helpers
  const yardLineToEngineY = (yardLine: number) => (yardLine + 10) * 3;
  const engineYToYardLine = (y: number) => Math.floor(y / 3) - 10;

  // Initialize Pixi
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const initPixi = async () => {
      const app = new Application();

      await app.init({
        width,
        height,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // Containers for layering
      const fieldContainer = new Container();
      const dynamicContainer = new Container();

      app.stage.addChild(fieldContainer);
      app.stage.addChild(dynamicContainer);

      fieldContainerRef.current = fieldContainer;
      dynamicContainerRef.current = dynamicContainer;
      setIsReady(true);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      setIsReady(false);
    };
  }, [width, height]);

  // Render game
  useEffect(() => {
    if (!appRef.current || !fieldContainerRef.current || !dynamicContainerRef.current) return;

    const fieldContainer = fieldContainerRef.current;
    const dynamicContainer = dynamicContainerRef.current;

    // Clear containers
    fieldContainer.removeChildren();
    dynamicContainer.removeChildren();

    // Calculate viewport
    const losEngineY = yardLineToEngineY(game.fieldPosition.yardLine);
    let cameraFocusY = losEngineY;

    if (game.state === 'PLAY_RUNNING' || game.state === 'SNAP') {
      if (game.ballInFlight) {
        cameraFocusY = game.ballInFlight.y;
      } else if (game.ballCarrier) {
        cameraFocusY = game.ballCarrier.y;
      }
    }

    const viewportStartY = cameraFocusY - 12 * YARDS_TO_UNITS;
    const minViewport = yardLineToEngineY(-10);
    const maxViewport = yardLineToEngineY(110) - VISIBLE_YARDS * YARDS_TO_UNITS;
    const clampedStartY = Math.max(minViewport, Math.min(viewportStartY, maxViewport));
    const clampedEndY = clampedStartY + VISIBLE_YARDS * YARDS_TO_UNITS;

    // Screen layout
    const fieldMarginX = 50;
    const fieldTop = HORIZON_Y;
    const fieldBottom = height - 40;
    const fieldHeight = fieldBottom - fieldTop;

    // Transform functions
    const getDepth = (engineY: number) => {
      return (engineY - clampedStartY) / (clampedEndY - clampedStartY);
    };

    const toScreen = (engineX: number, engineY: number) => {
      const depth = getDepth(engineY);
      const screenY = fieldBottom - depth * fieldHeight;
      const perspectiveScale = 1 - depth * 0.6;
      const centerX = width / 2;
      const fieldWidthAtDepth = (width - fieldMarginX * 2) * perspectiveScale;
      const normalizedX = (engineX / ENGINE_WIDTH) - 0.5;
      const screenX = centerX + normalizedX * fieldWidthAtDepth;
      return { x: screenX, y: screenY, scale: perspectiveScale };
    };

    // Draw background gradient
    const bgGraphics = new Graphics();
    bgGraphics.rect(0, 0, width, height);
    bgGraphics.fill(0x1a1a2e);
    fieldContainer.addChild(bgGraphics);

    // Draw grass stripes
    const startYard = engineYToYardLine(clampedStartY);
    const endYard = engineYToYardLine(clampedEndY);

    for (let yard = Math.floor(startYard / 5) * 5; yard <= Math.ceil(endYard / 5) * 5; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY1 = yardLineToEngineY(yard);
      const engineY2 = yardLineToEngineY(yard + 5);

      const topLeft = toScreen(0, engineY2);
      const topRight = toScreen(ENGINE_WIDTH, engineY2);
      const bottomLeft = toScreen(0, engineY1);
      const bottomRight = toScreen(ENGINE_WIDTH, engineY1);

      const grass = new Graphics();
      grass.moveTo(bottomLeft.x, bottomLeft.y);
      grass.lineTo(bottomRight.x, bottomRight.y);
      grass.lineTo(topRight.x, topRight.y);
      grass.lineTo(topLeft.x, topLeft.y);
      grass.closePath();
      grass.fill((yard / 5) % 2 === 0 ? 0x166534 : 0x15803d);
      fieldContainer.addChild(grass);
    }

    // Draw endzones
    const ownGoalLineY = yardLineToEngineY(0);
    const ownEndzoneBackY = yardLineToEngineY(-10);
    if (clampedStartY < ownGoalLineY) {
      const endzoneStart = Math.max(ownEndzoneBackY, clampedStartY);
      const topLeft = toScreen(0, ownGoalLineY);
      const topRight = toScreen(ENGINE_WIDTH, ownGoalLineY);
      const bottomLeft = toScreen(0, endzoneStart);
      const bottomRight = toScreen(ENGINE_WIDTH, endzoneStart);

      const ownEndzone = new Graphics();
      ownEndzone.moveTo(bottomLeft.x, bottomLeft.y);
      ownEndzone.lineTo(bottomRight.x, bottomRight.y);
      ownEndzone.lineTo(topRight.x, topRight.y);
      ownEndzone.lineTo(topLeft.x, topLeft.y);
      ownEndzone.closePath();
      ownEndzone.fill(0x5f1e1e);
      fieldContainer.addChild(ownEndzone);
    }

    const oppGoalLineY = yardLineToEngineY(100);
    const oppEndzoneBackY = yardLineToEngineY(110);
    if (clampedEndY > oppGoalLineY) {
      const endzoneEnd = Math.min(oppEndzoneBackY, clampedEndY);
      const topLeft = toScreen(0, endzoneEnd);
      const topRight = toScreen(ENGINE_WIDTH, endzoneEnd);
      const bottomLeft = toScreen(0, oppGoalLineY);
      const bottomRight = toScreen(ENGINE_WIDTH, oppGoalLineY);

      const oppEndzone = new Graphics();
      oppEndzone.moveTo(bottomLeft.x, bottomLeft.y);
      oppEndzone.lineTo(bottomRight.x, bottomRight.y);
      oppEndzone.lineTo(topRight.x, topRight.y);
      oppEndzone.lineTo(topLeft.x, topLeft.y);
      oppEndzone.closePath();
      oppEndzone.fill(0x1e3a5f);
      fieldContainer.addChild(oppEndzone);
    }

    // Draw yard lines
    const lines = new Graphics();
    for (let yard = Math.floor(startYard / 5) * 5; yard <= endYard; yard += 5) {
      if (yard < 0 || yard > 100) continue;

      const engineY = yardLineToEngineY(yard);
      const left = toScreen(0, engineY);
      const right = toScreen(ENGINE_WIDTH, engineY);

      const isMajor = yard % 10 === 0;
      lines.moveTo(left.x, left.y);
      lines.lineTo(right.x, right.y);
      lines.stroke({
        width: isMajor ? 3 * left.scale : 1,
        color: 0xffffff,
        alpha: isMajor ? 0.8 : 0.3,
      });
    }

    // Draw sidelines
    const nearLeft = toScreen(0, clampedStartY);
    const nearRight = toScreen(ENGINE_WIDTH, clampedStartY);
    const farLeft = toScreen(0, clampedEndY);
    const farRight = toScreen(ENGINE_WIDTH, clampedEndY);

    lines.moveTo(nearLeft.x, nearLeft.y);
    lines.lineTo(farLeft.x, farLeft.y);
    lines.stroke({ width: 3, color: 0xffffff, alpha: 0.9 });

    lines.moveTo(nearRight.x, nearRight.y);
    lines.lineTo(farRight.x, farRight.y);
    lines.stroke({ width: 3, color: 0xffffff, alpha: 0.9 });

    fieldContainer.addChild(lines);

    // Draw yard numbers
    const textStyle = new TextStyle({
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    for (let yard = Math.floor(startYard / 10) * 10; yard <= endYard; yard += 10) {
      if (yard <= 0 || yard >= 100) continue;

      const engineY = yardLineToEngineY(yard);
      const pos = toScreen(ENGINE_WIDTH / 2, engineY);
      const num = yard <= 50 ? yard : 100 - yard;

      textStyle.fontSize = Math.max(12, Math.floor(24 * pos.scale));
      const text = new Text({ text: num.toString(), style: textStyle });
      text.anchor.set(0.5);
      text.position.set(pos.x, pos.y);
      text.alpha = 0.7;
      fieldContainer.addChild(text);
    }

    // Draw line of scrimmage
    const losLeft = toScreen(0, losEngineY);
    const losRight = toScreen(ENGINE_WIDTH, losEngineY);

    const losLine = new Graphics();
    losLine.moveTo(losLeft.x, losLeft.y);
    losLine.lineTo(losRight.x, losRight.y);
    losLine.stroke({ width: 4 * losLeft.scale, color: 0x3b82f6, alpha: 0.9 });
    dynamicContainer.addChild(losLine);

    // Draw first down line
    const firstDownYard = game.fieldPosition.yardLine + game.fieldPosition.yardsToGo;
    if (firstDownYard <= 100) {
      const fdEngineY = yardLineToEngineY(firstDownYard);
      const fdLeft = toScreen(0, fdEngineY);
      const fdRight = toScreen(ENGINE_WIDTH, fdEngineY);

      const fdLine = new Graphics();
      fdLine.moveTo(fdLeft.x, fdLeft.y);
      fdLine.lineTo(fdRight.x, fdRight.y);
      fdLine.stroke({ width: 4 * fdLeft.scale, color: 0xfbbf24, alpha: 0.9 });
      dynamicContainer.addChild(fdLine);
    }

    // Sort players by depth (far first)
    const sortedPlayers = [...game.playerPositions].sort((a, b) => b.y - a.y);

    // Draw players
    sortedPlayers.forEach(player => {
      const pos = toScreen(player.x, player.y);
      if (pos.y < fieldTop - 20 || pos.y > fieldBottom + 20) return;

      const isOffense = player.role === 'offense';
      const baseRadius = 14;
      const radius = baseRadius * pos.scale;

      const playerGraphics = new Graphics();

      // Shadow
      playerGraphics.ellipse(pos.x + 2, pos.y + radius * 0.3, radius * 0.8, radius * 0.3);
      playerGraphics.fill({ color: 0x000000, alpha: 0.4 });

      // Body
      playerGraphics.circle(pos.x, pos.y, radius);
      playerGraphics.fill(isOffense ? OFFENSE_PRIMARY : DEFENSE_PRIMARY);

      // Highlight
      playerGraphics.circle(pos.x - radius * 0.2, pos.y - radius * 0.2, radius * 0.6);
      playerGraphics.fill(isOffense ? OFFENSE_SECONDARY : DEFENSE_SECONDARY);

      // Border
      playerGraphics.circle(pos.x, pos.y, radius);
      playerGraphics.stroke({ width: Math.max(1, 2 * pos.scale), color: 0xffffff, alpha: 0.9 });

      dynamicContainer.addChild(playerGraphics);
    });

    // Draw ball carrier
    if (game.ballCarrier) {
      const pos = toScreen(game.ballCarrier.x, game.ballCarrier.y);
      const baseRadius = 14;
      const radius = baseRadius * pos.scale;

      const carrierGraphics = new Graphics();

      // Glow
      carrierGraphics.circle(pos.x, pos.y, radius + 6 * pos.scale);
      carrierGraphics.fill({ color: BALL_CARRIER_GLOW, alpha: 0.6 });

      carrierGraphics.circle(pos.x, pos.y, radius + 3 * pos.scale);
      carrierGraphics.fill({ color: BALL_CARRIER_GLOW, alpha: 0.4 });

      // Player
      carrierGraphics.circle(pos.x, pos.y, radius);
      carrierGraphics.fill(0xfef08a);

      carrierGraphics.circle(pos.x, pos.y, radius);
      carrierGraphics.stroke({ width: Math.max(2, 3 * pos.scale), color: 0xffffff });

      dynamicContainer.addChild(carrierGraphics);
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const pos = toScreen(game.ballInFlight.x, game.ballInFlight.y);
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const liftAmount = arcHeight * 60 * pos.scale;

      const ballGraphics = new Graphics();

      // Shadow
      const shadowSize = (8 + arcHeight * 4) * pos.scale;
      ballGraphics.ellipse(pos.x, pos.y, shadowSize, shadowSize * 0.4);
      ballGraphics.fill({ color: 0x000000, alpha: 0.4 });

      // Football
      const ballWidth = 12 * pos.scale;
      const ballHeight = 7 * pos.scale;
      ballGraphics.ellipse(pos.x, pos.y - liftAmount, ballWidth, ballHeight);
      ballGraphics.fill(0x92400e);

      // Highlight
      ballGraphics.ellipse(pos.x - 2, pos.y - liftAmount - 2, ballWidth * 0.5, ballHeight * 0.5);
      ballGraphics.fill(0xb45309);

      // Laces
      ballGraphics.moveTo(pos.x - 4 * pos.scale, pos.y - liftAmount);
      ballGraphics.lineTo(pos.x + 4 * pos.scale, pos.y - liftAmount);
      ballGraphics.stroke({ width: Math.max(1, 2 * pos.scale), color: 0xffffff });

      dynamicContainer.addChild(ballGraphics);
    }

    // Draw handoff effect
    if (game.handoffEffect) {
      const pos = toScreen(game.handoffEffect.x, game.handoffEffect.y);
      const progress = game.handoffEffect.progress;

      const maxRadius = 60 * pos.scale;
      const ringRadius = maxRadius * progress;
      const opacity = 1 - progress;

      const effectGraphics = new Graphics();
      effectGraphics.circle(pos.x, pos.y, ringRadius);
      effectGraphics.stroke({
        width: Math.max(3, 6 * pos.scale * (1 - progress)),
        color: 0xffd700,
        alpha: opacity,
      });

      if (progress < 0.3) {
        const innerOpacity = 1 - (progress / 0.3);
        effectGraphics.circle(pos.x, pos.y, 20 * pos.scale * (1 - progress / 0.3));
        effectGraphics.fill({ color: 0xffffcc, alpha: innerOpacity * 0.6 });
      }

      dynamicContainer.addChild(effectGraphics);
    }

    // Vignette overlay
    const vignette = new Graphics();
    vignette.rect(0, 0, width, height);
    vignette.fill({ color: 0x000000, alpha: 0 });

    // Draw result text
    if (game.state === 'PLAY_DEAD' && game.playResult) {
      const result = game.playResult;
      let text = '';
      let color = 0xffffff;

      if (result.penalty) {
        text = `FLAG: ${result.penalty.description.toUpperCase()}`;
        color = 0xfbbf24;
      } else if (result.touchdown) {
        text = 'TOUCHDOWN!';
        color = 0xfbbf24;
      } else if (result.sack) {
        text = `SACK! ${Math.abs(result.yardsGained)} YARD LOSS`;
        color = 0xef4444;
      } else if (result.turnover) {
        text = 'TURNOVER!';
        color = 0xef4444;
      } else if (result.yardsGained > 0) {
        text = `GAIN OF ${result.yardsGained} YARDS`;
        color = 0x22c55e;
      } else if (result.yardsGained < 0) {
        text = `LOSS OF ${Math.abs(result.yardsGained)} YARDS`;
        color = 0xef4444;
      } else {
        text = 'NO GAIN';
        color = 0x94a3b8;
      }

      const resultStyle = new TextStyle({
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 42,
        fontWeight: 'bold',
        fill: color,
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
          color: color,
          blur: 20,
          alpha: 0.8,
        },
      });

      const resultText = new Text({ text, style: resultStyle });
      resultText.anchor.set(0.5);
      resultText.position.set(width / 2, height / 2);
      dynamicContainer.addChild(resultText);
    }

  }, [game, width, height, isReady]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div ref={containerRef} style={{ width, height }} />
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
    </div>
  );
};

export default PixiGameCanvas;
