import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { GameState, FieldPlayer, Vector2 } from '../../types/GameSim';

interface PixiGameCanvasProps {
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
  grass: 0x2d5a27,
  grassLight: 0x326b2c,
  grassDark: 0x245020,
  endzone: 0x1a3d16,
  endzoneAccent: 0x142d10,
  lines: 0xffffff,
  hashMarks: 0xcccccc,
  offense: 0x3b82f6,
  offenseLight: 0x60a5fa,
  offenseDark: 0x1e40af,
  defense: 0xef4444,
  defenseLight: 0xf87171,
  defenseDark: 0x991b1b,
  ball: 0x8b4513,
  ballLaces: 0xffffff,
  ballCarrierGlow: 0xfbbf24,
  passArc: 0xfbbf24,
  lineOfScrimmage: 0x3b82f6,
  firstDownLine: 0xfbbf24,
  shadow: 0x000000,
};

export const PixiGameCanvas = forwardRef<HTMLDivElement, PixiGameCanvasProps>(({
  gameState,
  onFieldClick,
  width = 400,
  height = 720,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const fieldContainerRef = useRef<Container | null>(null);
  const playersContainerRef = useRef<Container | null>(null);
  const effectsContainerRef = useRef<Container | null>(null);
  const uiContainerRef = useRef<Container | null>(null);

  // Expose the container ref
  useImperativeHandle(ref, () => containerRef.current!);

  // Scale factors
  const scaleX = width / FIELD_WIDTH;
  const scaleY = height / FIELD_HEIGHT;

  // Initialize Pixi Application
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const initPixi = async () => {
      const app = new Application();

      await app.init({
        width,
        height,
        backgroundColor: COLORS.grass,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // Create containers for layering
      const fieldContainer = new Container();
      const playersContainer = new Container();
      const effectsContainer = new Container();
      const uiContainer = new Container();

      app.stage.addChild(fieldContainer);
      app.stage.addChild(effectsContainer);
      app.stage.addChild(playersContainer);
      app.stage.addChild(uiContainer);

      fieldContainerRef.current = fieldContainer;
      playersContainerRef.current = playersContainer;
      effectsContainerRef.current = effectsContainer;
      uiContainerRef.current = uiContainer;

      // Draw static field
      drawField(fieldContainer);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [width, height]);

  // Draw the football field
  const drawField = useCallback((container: Container) => {
    const field = new Graphics();

    // Grass stripes
    for (let y = 0; y < FIELD_HEIGHT; y += 15) {
      const stripeColor = Math.floor(y / 15) % 2 === 0 ? COLORS.grass : COLORS.grassLight;
      field.rect(0, y * scaleY, width, 15 * scaleY);
      field.fill(stripeColor);
    }

    // Endzones with gradient effect
    field.rect(0, 0, width, 30 * scaleY);
    field.fill(COLORS.endzone);
    field.rect(0, 330 * scaleY, width, 30 * scaleY);
    field.fill(COLORS.endzone);

    // Endzone accent stripes
    for (let i = 0; i < 5; i++) {
      field.rect(0, (5 + i * 5) * scaleY, width, 2 * scaleY);
      field.fill({ color: COLORS.endzoneAccent, alpha: 0.3 });
      field.rect(0, (335 + i * 5) * scaleY, width, 2 * scaleY);
      field.fill({ color: COLORS.endzoneAccent, alpha: 0.3 });
    }

    container.addChild(field);

    // Yard lines
    const lines = new Graphics();
    for (let yard = 0; yard <= 100; yard += 5) {
      const y = (yard + 10) * 3 * scaleY;
      lines.moveTo(0, y);
      lines.lineTo(width, y);
      lines.stroke({ width: 2, color: COLORS.lines, alpha: 0.9 });
    }

    // Hash marks
    for (let yard = 1; yard < 100; yard++) {
      if (yard % 5 === 0) continue;
      const y = (yard + 10) * 3 * scaleY;

      // Left hash
      lines.moveTo(55 * scaleX, y);
      lines.lineTo(60 * scaleX, y);
      lines.stroke({ width: 1, color: COLORS.hashMarks, alpha: 0.6 });

      // Right hash
      lines.moveTo(100 * scaleX, y);
      lines.lineTo(105 * scaleX, y);
      lines.stroke({ width: 1, color: COLORS.hashMarks, alpha: 0.6 });
    }

    // Sidelines
    lines.rect(0, 30 * scaleY, width, 300 * scaleY);
    lines.stroke({ width: 3, color: COLORS.lines });

    container.addChild(lines);

    // Yard numbers
    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14 * scaleY,
      fontWeight: 'bold',
      fill: COLORS.lines,
    });

    for (let yard = 10; yard <= 90; yard += 10) {
      const y = (yard + 10) * 3 * scaleY;
      const displayYard = yard <= 50 ? yard : 100 - yard;

      // Left number
      const leftText = new Text({ text: displayYard.toString(), style: textStyle });
      leftText.anchor.set(0.5);
      leftText.position.set(15 * scaleX, y);
      leftText.alpha = 0.8;
      container.addChild(leftText);

      // Right number
      const rightText = new Text({ text: displayYard.toString(), style: textStyle });
      rightText.anchor.set(0.5);
      rightText.position.set((FIELD_WIDTH - 15) * scaleX, y);
      rightText.alpha = 0.8;
      container.addChild(rightText);
    }

    // Endzone text
    const endzoneStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24 * scaleY,
      fontWeight: 'bold',
      fill: COLORS.lines,
    });

    const topEndzone = new Text({ text: 'ENDZONE', style: endzoneStyle });
    topEndzone.anchor.set(0.5);
    topEndzone.position.set(width / 2, 15 * scaleY);
    topEndzone.rotation = Math.PI;
    topEndzone.alpha = 0.15;
    container.addChild(topEndzone);

    const bottomEndzone = new Text({ text: 'ENDZONE', style: endzoneStyle });
    bottomEndzone.anchor.set(0.5);
    bottomEndzone.position.set(width / 2, 345 * scaleY);
    bottomEndzone.alpha = 0.15;
    container.addChild(bottomEndzone);
  }, [width, scaleX, scaleY]);

  // Draw a player with helmet shape
  const drawPlayer = useCallback((
    container: Container,
    player: FieldPlayer,
    isOffense: boolean,
    isBallCarrier: boolean
  ) => {
    const x = player.location.x * scaleX;
    const y = player.location.y * scaleY;
    const radius = 5 * scaleX;

    const playerGraphics = new Graphics();

    // Shadow
    playerGraphics.ellipse(x + 2, y + 3, radius * 0.9, radius * 0.5);
    playerGraphics.fill({ color: COLORS.shadow, alpha: 0.3 });

    // Ball carrier glow
    if (isBallCarrier) {
      playerGraphics.circle(x, y, radius + 6);
      playerGraphics.fill({ color: COLORS.ballCarrierGlow, alpha: 0.6 });
      playerGraphics.circle(x, y, radius + 3);
      playerGraphics.fill({ color: COLORS.ballCarrierGlow, alpha: 0.4 });
    }

    // Player body (helmet shape - rounded top, flat bottom)
    const mainColor = isOffense ? COLORS.offense : COLORS.defense;
    const lightColor = isOffense ? COLORS.offenseLight : COLORS.defenseLight;
    const darkColor = isOffense ? COLORS.offenseDark : COLORS.defenseDark;

    // Helmet body
    playerGraphics.circle(x, y, radius);
    playerGraphics.fill(mainColor);

    // Helmet shine (top highlight)
    playerGraphics.arc(x, y, radius * 0.8, -Math.PI * 0.8, -Math.PI * 0.2);
    playerGraphics.lineTo(x, y - radius * 0.3);
    playerGraphics.closePath();
    playerGraphics.fill({ color: lightColor, alpha: 0.4 });

    // Facemask area (front)
    const facemaskY = y + radius * 0.3;
    playerGraphics.ellipse(x, facemaskY, radius * 0.5, radius * 0.3);
    playerGraphics.fill({ color: 0x333333, alpha: 0.6 });

    // Outline
    playerGraphics.circle(x, y, radius);
    playerGraphics.stroke({ width: 2, color: darkColor });

    container.addChild(playerGraphics);

    // Position label
    const labelStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 4 * scaleX,
      fontWeight: 'bold',
      fill: 0xffffff,
    });

    const posLabel = getPositionLabel(player.rosterPosition);
    const label = new Text({ text: posLabel, style: labelStyle });
    label.anchor.set(0.5);
    label.position.set(x, y - 1);
    container.addChild(label);
  }, [scaleX, scaleY]);

  // Draw football
  const drawBall = useCallback((
    container: Container,
    location: Vector2,
    inFlight: boolean = false
  ) => {
    const x = location.x * scaleX;
    const y = location.y * scaleY;
    const ballGraphics = new Graphics();

    // Shadow
    if (inFlight) {
      ballGraphics.ellipse(x + 3, y + 8, 3 * scaleX, 2 * scaleY);
      ballGraphics.fill({ color: COLORS.shadow, alpha: 0.3 });
    }

    const ballY = inFlight ? y - 8 * scaleY : y - 4 * scaleY;

    // Football shape
    ballGraphics.ellipse(x, ballY, 2.5 * scaleX, 4 * scaleY);
    ballGraphics.fill(COLORS.ball);
    ballGraphics.stroke({ width: 1, color: 0x5c3317 });

    // Laces
    ballGraphics.moveTo(x, ballY - 3 * scaleY);
    ballGraphics.lineTo(x, ballY + 1 * scaleY);
    ballGraphics.stroke({ width: 1.5, color: COLORS.ballLaces });

    // Cross laces
    for (let i = -2; i <= 1; i++) {
      ballGraphics.moveTo(x - 1.5 * scaleX, ballY + i * scaleY);
      ballGraphics.lineTo(x + 1.5 * scaleX, ballY + i * scaleY);
      ballGraphics.stroke({ width: 0.5, color: COLORS.ballLaces });
    }

    container.addChild(ballGraphics);
  }, [scaleX, scaleY]);

  // Draw line of scrimmage
  const drawLineOfScrimmage = useCallback((
    container: Container,
    yardLine: number
  ) => {
    const y = (yardLine + 10) * 3 * scaleY;
    const line = new Graphics();

    line.moveTo(0, y);
    line.lineTo(width, y);
    line.stroke({ width: 3, color: COLORS.lineOfScrimmage, alpha: 0.8 });

    container.addChild(line);
  }, [width, scaleY]);

  // Draw first down line
  const drawFirstDownLine = useCallback((
    container: Container,
    yardLine: number,
    yardsToGo: number
  ) => {
    const firstDownYard = yardLine + yardsToGo;
    if (firstDownYard > 100) return;

    const y = (firstDownYard + 10) * 3 * scaleY;
    const line = new Graphics();

    line.moveTo(0, y);
    line.lineTo(width, y);
    line.stroke({ width: 3, color: COLORS.firstDownLine, alpha: 0.8 });

    container.addChild(line);
  }, [width, scaleY]);

  // Draw pass arc
  const drawPassArc = useCallback((
    container: Container,
    start: Vector2,
    end: Vector2,
    progress: number
  ) => {
    const arc = new Graphics();

    const startX = start.x * scaleX;
    const startY = start.y * scaleY;
    const endX = end.x * scaleX;
    const endY = end.y * scaleY;

    // Dashed line to target
    const segments = 10;
    for (let i = 0; i < segments; i++) {
      if (i % 2 === 0) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        arc.moveTo(startX + (endX - startX) * t1, startY + (endY - startY) * t1);
        arc.lineTo(startX + (endX - startX) * t2, startY + (endY - startY) * t2);
      }
    }
    arc.stroke({ width: 2, color: COLORS.passArc, alpha: 0.6 });

    // Target reticle
    const targetRadius = 10 * scaleX;
    arc.circle(endX, endY, targetRadius);
    arc.stroke({ width: 2, color: COLORS.passArc });

    arc.moveTo(endX - targetRadius * 0.5, endY);
    arc.lineTo(endX + targetRadius * 0.5, endY);
    arc.moveTo(endX, endY - targetRadius * 0.5);
    arc.lineTo(endX, endY + targetRadius * 0.5);
    arc.stroke({ width: 2, color: COLORS.passArc });

    container.addChild(arc);
  }, [scaleX, scaleY]);

  // Update game graphics
  useEffect(() => {
    if (!appRef.current || !playersContainerRef.current || !effectsContainerRef.current || !uiContainerRef.current) return;

    const playersContainer = playersContainerRef.current;
    const effectsContainer = effectsContainerRef.current;
    const uiContainer = uiContainerRef.current;

    // Clear dynamic containers
    playersContainer.removeChildren();
    effectsContainer.removeChildren();
    uiContainer.removeChildren();

    if (!gameState) return;

    // Draw line of scrimmage and first down line
    drawLineOfScrimmage(uiContainer, gameState.field.yardLine);
    drawFirstDownLine(uiContainer, gameState.field.yardLine, gameState.field.yardsToGo);

    // Draw pass arc if ball in air
    if (gameState.passFlight) {
      drawPassArc(
        effectsContainer,
        gameState.passFlight.startLocation,
        gameState.passFlight.landingSpot,
        gameState.passFlight.elapsedTime / gameState.passFlight.airTime
      );
    }

    // Draw offensive players
    gameState.offensivePlayers.forEach(player => {
      const isBallCarrier = gameState.ballCarrier === player.id;
      drawPlayer(playersContainer, player, true, isBallCarrier);
    });

    // Draw defensive players
    gameState.defensivePlayers.forEach(player => {
      drawPlayer(playersContainer, player, false, false);
    });

    // Draw ball
    if (gameState.ballLocation) {
      const inFlight = !!gameState.passFlight;
      drawBall(effectsContainer, gameState.ballLocation, inFlight);
    }
  }, [gameState, drawPlayer, drawBall, drawLineOfScrimmage, drawFirstDownLine, drawPassArc]);

  // Handle clicks
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onFieldClick || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const fieldX = (e.clientX - rect.left) / scaleX;
    const fieldY = (e.clientY - rect.top) / scaleY;

    onFieldClick({ x: fieldX, y: fieldY });
  }, [onFieldClick, scaleX, scaleY]);

  const showThrowCursor = gameState?.ballCarrier?.toLowerCase() === 'qb' && gameState?.phase === 'SNAP';

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        width,
        height,
        border: '2px solid #374151',
        borderRadius: '4px',
        cursor: showThrowCursor ? 'crosshair' : 'default',
        overflow: 'hidden',
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

PixiGameCanvas.displayName = 'PixiGameCanvas';

export default PixiGameCanvas;
