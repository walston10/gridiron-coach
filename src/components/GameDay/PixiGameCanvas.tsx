import React, { useRef, useEffect, useState } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { LiveGame } from '../../types';

interface PixiGameCanvasProps {
  game: LiveGame;
  width?: number;
  height?: number;
}

// Team color palettes (using hex numbers for Pixi) - Retro style
const TEAM_PALETTES = {
  home: {
    helmet: 0x1e3a8a,           // Navy blue
    jersey: 0x2563eb,           // Royal blue
    jerseyStripe: 0xffffff,     // White stripe
    pants: 0xf0f0f0,
    outline: 0x0f172a,          // Dark outline
  },
  away: {
    helmet: 0x991b1b,           // Dark red
    jersey: 0xef4444,           // Red
    jerseyStripe: 0xffffff,     // White stripe
    pants: 0x374151,
    outline: 0x450a0a,          // Dark outline
  },
};

// Draw a retro-style player (blocky uniform, no legs animation)
function drawRetroPlayer(
  graphics: Graphics,
  x: number,
  y: number,
  scale: number,
  palette: typeof TEAM_PALETTES.home,
  isBallCarrier: boolean = false
) {
  const size = 12 * scale;

  // Ball carrier glow effect
  if (isBallCarrier) {
    graphics.circle(x, y, size * 1.8);
    graphics.fill({ color: 0xfbbf24, alpha: 0.4 });
    graphics.circle(x, y, size * 1.4);
    graphics.fill({ color: 0xfbbf24, alpha: 0.3 });
  }

  // Shadow
  graphics.ellipse(x + 2 * scale, y + size * 0.6, size * 0.8, size * 0.3);
  graphics.fill({ color: 0x000000, alpha: 0.35 });

  // Body/Jersey (main rectangle)
  const bodyWidth = size * 1.1;
  const bodyHeight = size * 0.9;
  graphics.roundRect(x - bodyWidth / 2, y - bodyHeight / 2, bodyWidth, bodyHeight, 2 * scale);
  graphics.fill(palette.jersey);
  graphics.stroke({ width: Math.max(1, 1.5 * scale), color: palette.outline });

  // Jersey stripe (horizontal)
  graphics.rect(x - bodyWidth / 2, y - 1 * scale, bodyWidth, 2 * scale);
  graphics.fill(palette.jerseyStripe);

  // Helmet (circle on top)
  const helmetRadius = size * 0.45;
  const helmetY = y - bodyHeight / 2 - helmetRadius * 0.6;
  graphics.circle(x, helmetY, helmetRadius);
  graphics.fill(palette.helmet);
  graphics.stroke({ width: Math.max(1, 1.5 * scale), color: palette.outline });

  // Facemask (small rectangle)
  const faceWidth = size * 0.25;
  const faceHeight = size * 0.2;
  graphics.rect(x + helmetRadius * 0.3, helmetY - faceHeight / 2, faceWidth, faceHeight);
  graphics.fill(0x666666);
}

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
    const container = containerRef.current;
    if (!container) return;

    let app: Application | null = null;
    let cancelled = false;

    const initPixi = async () => {
      try {
        app = new Application();

        await app.init({
          width,
          height,
          background: '#1a1a2e',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          preference: 'webgl',
        });

        if (cancelled || !app.canvas) {
          app?.destroy(true);
          return;
        }

        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(app.canvas);

        appRef.current = app;

        // Containers for layering
        const fieldContainer = new Container();
        const dynamicContainer = new Container();

        app.stage.addChild(fieldContainer);
        app.stage.addChild(dynamicContainer);

        fieldContainerRef.current = fieldContainer;
        dynamicContainerRef.current = dynamicContainer;

        app.render();
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize Pixi:', err);
      }
    };

    initPixi();

    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        fieldContainerRef.current = null;
        dynamicContainerRef.current = null;
      }
      setIsReady(false);
    };
  }, [width, height]);

  // Render game
  useEffect(() => {
    if (!appRef.current || !fieldContainerRef.current || !dynamicContainerRef.current) return;

    const fieldContainer = fieldContainerRef.current;
    const dynamicContainer = dynamicContainerRef.current;
    const animStates = animStatesRef.current;

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

    // Draw background
    const bgGraphics = new Graphics();
    bgGraphics.rect(0, 0, width, height);
    bgGraphics.fill(0x1a1a2e);
    fieldContainer.addChild(bgGraphics);

    // Draw grass stripes (batched into single Graphics)
    const grassGraphics = new Graphics();
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

      grassGraphics.moveTo(bottomLeft.x, bottomLeft.y);
      grassGraphics.lineTo(bottomRight.x, bottomRight.y);
      grassGraphics.lineTo(topRight.x, topRight.y);
      grassGraphics.lineTo(topLeft.x, topLeft.y);
      grassGraphics.closePath();
      grassGraphics.fill((yard / 5) % 2 === 0 ? 0x166534 : 0x15803d);
    }
    fieldContainer.addChild(grassGraphics);

    // Draw endzones (batched)
    const endzoneGraphics = new Graphics();

    const ownGoalLineY = yardLineToEngineY(0);
    const ownEndzoneBackY = yardLineToEngineY(-10);
    if (clampedStartY < ownGoalLineY) {
      const endzoneStart = Math.max(ownEndzoneBackY, clampedStartY);
      const topLeft = toScreen(0, ownGoalLineY);
      const topRight = toScreen(ENGINE_WIDTH, ownGoalLineY);
      const bottomLeft = toScreen(0, endzoneStart);
      const bottomRight = toScreen(ENGINE_WIDTH, endzoneStart);

      endzoneGraphics.moveTo(bottomLeft.x, bottomLeft.y);
      endzoneGraphics.lineTo(bottomRight.x, bottomRight.y);
      endzoneGraphics.lineTo(topRight.x, topRight.y);
      endzoneGraphics.lineTo(topLeft.x, topLeft.y);
      endzoneGraphics.closePath();
      endzoneGraphics.fill(0x5f1e1e);
    }

    const oppGoalLineY = yardLineToEngineY(100);
    const oppEndzoneBackY = yardLineToEngineY(110);
    if (clampedEndY > oppGoalLineY) {
      const endzoneEnd = Math.min(oppEndzoneBackY, clampedEndY);
      const topLeft = toScreen(0, endzoneEnd);
      const topRight = toScreen(ENGINE_WIDTH, endzoneEnd);
      const bottomLeft = toScreen(0, oppGoalLineY);
      const bottomRight = toScreen(ENGINE_WIDTH, oppGoalLineY);

      endzoneGraphics.moveTo(bottomLeft.x, bottomLeft.y);
      endzoneGraphics.lineTo(bottomRight.x, bottomRight.y);
      endzoneGraphics.lineTo(topRight.x, topRight.y);
      endzoneGraphics.lineTo(topLeft.x, topLeft.y);
      endzoneGraphics.closePath();
      endzoneGraphics.fill(0x1e3a5f);
    }
    fieldContainer.addChild(endzoneGraphics);

    // Draw yard lines (all in one Graphics object)
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

    // Determine team assignments
    const offenseTeam = game.possession || 'home';
    const defenseTeam = offenseTeam === 'home' ? 'away' : 'home';

    // Sort players by depth (far first for proper layering)
    const sortedPlayers = [...game.playerPositions].sort((a, b) => b.y - a.y);

    // Create a single Graphics object for all players (more efficient)
    const playerGraphics = new Graphics();

    // Draw players using retro graphics
    sortedPlayers.forEach(player => {
      const pos = toScreen(player.x, player.y);
      if (pos.y < fieldTop - 20 || pos.y > fieldBottom + 20) return;

      // Skip ball carrier (drawn on top separately)
      if (game.ballCarrier && player.id === game.ballCarrier.playerId) return;

      const isOffense = player.role === 'offense';
      const palette = TEAM_PALETTES[isOffense ? offenseTeam : defenseTeam];

      // Draw the player with retro style
      drawRetroPlayer(playerGraphics, pos.x, pos.y, pos.scale, palette, false);
    });

    dynamicContainer.addChild(playerGraphics);

    // Draw ball carrier on top with glow
    if (game.ballCarrier) {
      const pos = toScreen(game.ballCarrier.x, game.ballCarrier.y);
      const palette = TEAM_PALETTES[offenseTeam];

      const ballCarrierGraphics = new Graphics();
      drawRetroPlayer(ballCarrierGraphics, pos.x, pos.y, pos.scale, palette, true);
      dynamicContainer.addChild(ballCarrierGraphics);
    }

    // Draw ball in flight
    if (game.ballInFlight) {
      const pos = toScreen(game.ballInFlight.x, game.ballInFlight.y);
      const arcHeight = Math.sin(game.ballInFlight.progress * Math.PI);
      const liftAmount = arcHeight * 60 * pos.scale;

      const ballGraphics = new Graphics();

      const shadowSize = (8 + arcHeight * 4) * pos.scale;
      ballGraphics.ellipse(pos.x, pos.y, shadowSize, shadowSize * 0.4);
      ballGraphics.fill({ color: 0x000000, alpha: 0.4 });

      const ballWidth = 12 * pos.scale;
      const ballHeight = 7 * pos.scale;
      ballGraphics.ellipse(pos.x, pos.y - liftAmount, ballWidth, ballHeight);
      ballGraphics.fill(0x92400e);

      ballGraphics.ellipse(pos.x - 2, pos.y - liftAmount - 2, ballWidth * 0.5, ballHeight * 0.5);
      ballGraphics.fill(0xb45309);

      ballGraphics.moveTo(pos.x - 4 * pos.scale, pos.y - liftAmount);
      ballGraphics.lineTo(pos.x + 4 * pos.scale, pos.y - liftAmount);
      ballGraphics.stroke({ width: Math.max(1, 2 * pos.scale), color: 0xffffff });

      dynamicContainer.addChild(ballGraphics);
    }

    // Draw handoff effect with multiple rings
    if (game.handoffEffect) {
      const pos = toScreen(game.handoffEffect.x, game.handoffEffect.y);
      const progress = game.handoffEffect.progress;

      const maxRadius = 60 * pos.scale;
      const opacity = 1 - progress;

      const effectGraphics = new Graphics();

      // Multiple rings for more impact
      for (let i = 0; i < 2; i++) {
        const ringProgress = Math.max(0, progress - i * 0.15);
        const ringOp = Math.max(0, opacity - i * 0.3);
        const radius = maxRadius * ringProgress;

        effectGraphics.circle(pos.x, pos.y, radius);
        effectGraphics.stroke({
          width: Math.max(2, (5 - i * 2) * pos.scale * (1 - ringProgress)),
          color: 0xffd700,
          alpha: ringOp,
        });
      }

      if (progress < 0.3) {
        const innerOpacity = 1 - (progress / 0.3);
        effectGraphics.circle(pos.x, pos.y, 20 * pos.scale * (1 - progress / 0.3));
        effectGraphics.fill({ color: 0xffffcc, alpha: innerOpacity * 0.6 });
      }

      dynamicContainer.addChild(effectGraphics);
    }

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

    // Force render
    if (appRef.current) {
      appRef.current.render();
    }

  }, [game, width, height, isReady]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div ref={containerRef} style={{ width, height }} />
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
